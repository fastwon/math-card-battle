import { useState, useEffect, useRef } from "react";
import { play } from "./sfx";
import { playBgm } from "./bgm";
import { DIFFICULTIES, makeCard, maxHandSize, genHand, addCard, drawHand, parseExpression, enemyMaxHpFor, turnLimit, thresholdFor, canUpgradeNumber, upgradeNumber, baseRound, isMirrorRound } from "./game/rules";
import { rollRewardOptions, applyReward, EMPTY_ITEMS } from "./game/rewards";
import { fetchRankings, fetchPreRank, insertRanking, roundScore } from "./game/ranking";
import { shareOrCopy } from "./utils/share";
import MainScreen from "./screens/MainScreen";
import RankingScreen from "./screens/RankingScreen";
import GameScreen from "./screens/GameScreen";
import ResultOverlay from "./screens/ResultOverlay";

export default function App() {
  const [screen, setScreen] = useState("select");
  const [difficulty, setDifficulty] = useState(null);

  // 랭킹
  const [top10, setTop10] = useState([]);
  const [top10Tab, setTop10Tab] = useState("easy");
  const [allRankings, setAllRankings] = useState([]);
  const [rankingsTab, setRankingsTab] = useState("easy");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchLoading, setSearchLoading] = useState(false);
  const [rankingsError, setRankingsError] = useState(null);
  const [submitError, setSubmitError] = useState(null);
  const [preRank, setPreRank] = useState(null);
  const [preRankLoading, setPreRankLoading] = useState(false);
  const searchDebounceRef = useRef(null);

  // 게임 상태
  const [round, setRound] = useState(1);
  const [enemyMaxHp, setEnemyMaxHp] = useState(enemyMaxHpFor(1));
  const [enemyHp, setEnemyHp] = useState(enemyMaxHpFor(1));
  const [hand, setHand] = useState([]);
  const [selected, setSelected] = useState([]);
  const [turn, setTurn] = useState(1);
  const [log, setLog] = useState([]);
  const [phase, setPhase] = useState("play");
  const [maxDmg, setMaxDmg] = useState(0);
  const [totalDmgDealt, setTotalDmgDealt] = useState(0);
  const [score, setScore] = useState(null);
  const [totalScore, setTotalScore] = useState(0);
  const [roundScores, setRoundScores] = useState([]);
  const [finalRank, setFinalRank] = useState(null);
  const [shareMsg, setShareMsg] = useState(null);

  // 보상: 패시브 레벨 { bigNum: 2, ... }, 아이템 개수, 라운드 클리어 시 선택지, 아이템 사용 중 상태
  const [passives, setPassives] = useState({});
  const [items, setItems] = useState(EMPTY_ITEMS);
  const [rewardOptions, setRewardOptions] = useState([]);
  const [itemMode, setItemMode] = useState(null); // { type:"pen", cardId? } | { type:"clone", targetId? }

  // 타격 연출
  const [hitId, setHitId] = useState(0);
  const [dmgPops, setDmgPops] = useState([]);
  const [screenShake, setScreenShake] = useState(false);
  const [flashId, setFlashId] = useState(0);
  const [killBanner, setKillBanner] = useState(null);
  const fxTimers = useRef([]);

  // 닉네임
  const [nickname, setNickname] = useState("");
  const [nicknameSubmitted, setNicknameSubmitted] = useState(false);
  const [registrationSkipped, setRegistrationSkipped] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => { fetchTop10("easy"); }, []);

  // 배경음악: 메인·랭킹 = 로비, 기준 라운드 1~6 = 전투, 7~10 = 보스 (기준 라운드마다 템포 상승), 게임오버 시 정지
  // 20라운드 주기: R11~20은 R1~10 곡을 역재생, R21~ 반복 (baseRound / isMirrorRound)
  useEffect(() => {
    const base = baseRound(round), rev = isMirrorRound(round);
    if (screen !== "game") playBgm("lobby");
    else if (phase === "gameover") playBgm(null);
    else if (base <= 6) playBgm("battle", 132 + (base - 1) * 3, rev);
    else playBgm("boss", 150 + (base - 7) * 2, rev);
  }, [screen, phase, round]);

  // ── 랭킹 ──
  async function fetchTop10(tab) {
    const { data, error } = await fetchRankings(tab, 10);
    if (error) console.error("TOP10 로드 실패:", error.message);
    if (data) setTop10(data);
  }

  function handleTop10Tab(tab) {
    setTop10Tab(tab);
    fetchTop10(tab);
  }

  async function loadPreRank(scoreVal, diff, currentRound) {
    setPreRankLoading(true);
    setPreRank(await fetchPreRank(scoreVal, diff, currentRound));
    setPreRankLoading(false);
  }

  function openRankings() {
    setScreen("rankings");
    setSearchQuery("");
    setRankingsError(null);
    setRankingsTab("easy");
    fetchRankingList("", "easy");
  }

  function handleRankingsTab(tab) {
    setRankingsTab(tab);
    setSearchQuery("");
    fetchRankingList("", tab);
  }

  async function fetchRankingList(query, tab) {
    setSearchLoading(true);
    setRankingsError(null);
    const { data, error } = await fetchRankings(tab, 100, query);
    if (error) setRankingsError("랭킹을 불러오지 못했습니다. 다시 시도해주세요.");
    if (data) setAllRankings(data);
    setSearchLoading(false);
  }

  function handleSearch(query) {
    setSearchQuery(query);
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    searchDebounceRef.current = setTimeout(() => fetchRankingList(query, rankingsTab), 300);
  }

  async function submitScore(currentTotalScore) {
    if (!nickname.trim() || submitting) return;
    setSubmitting(true);
    setSubmitError(null);
    const finalScore = roundScore(currentTotalScore);
    const { error: insertError } = await insertRanking({ nickname: nickname.trim(), score: finalScore, difficulty, round });
    if (insertError) {
      setSubmitError("등록에 실패했습니다. 다시 시도해주세요.");
      setSubmitting(false);
      return;
    }
    const { data, error: fetchError } = await fetchRankings(difficulty, 100);
    if (fetchError) {
      setSubmitError("순위를 불러오지 못했습니다.");
      setSubmitting(false);
      return;
    }
    if (data) {
      const myRank = data.findIndex(r => r.nickname === nickname.trim() && r.score === finalScore && r.round === round) + 1;
      setFinalRank(myRank || null);
    }
    fetchTop10(top10Tab);
    setNicknameSubmitted(true);
    setSubmitting(false);
  }

  // ── 연출 ──
  function fxTimeout(fn, ms) {
    fxTimers.current.push(setTimeout(fn, ms));
  }
  function clearFx() {
    fxTimers.current.forEach(clearTimeout);
    fxTimers.current = [];
    setDmgPops([]); setKillBanner(null); setScreenShake(false); setHitId(0);
  }
  useEffect(() => clearFx, []);

  function playHitFx(dmg) {
    const ratio = dmg / enemyMaxHp;
    const id = Date.now() + Math.random();
    play("hit", ratio);
    setHitId(n => n + 1);
    setDmgPops(prev => [...prev, { id, dmg, ratio }]);
    fxTimeout(() => setDmgPops(prev => prev.filter(p => p.id !== id)), 1000);
    if (ratio >= 0.4) {
      setScreenShake(true);
      setFlashId(n => n + 1);
      fxTimeout(() => setScreenShake(false), 400);
    }
  }

  async function shareResult() {
    const d = DIFFICULTIES[difficulty];
    const total = (score?.newTS ?? totalScore).toFixed(2);
    const rankText = nicknameSubmitted && finalRank ? ` (${d.label} ${finalRank}위!)` : "";
    const body = `🃏 수학 카드 배틀 ${d.emoji} ${d.label}\nR${round}까지 도달! 총점 ${total}점${rankText}\n나를 이길 수 있어?`;
    play("click");
    const res = await shareOrCopy(body);
    if (res === "shared" || res === "aborted") return;
    setShareMsg(res === "copied" ? "📋 복사했어요! 친구에게 붙여넣기 하세요" : "복사에 실패했어요");
    fxTimeout(() => setShareMsg(null), 2500);
  }

  // ── 게임 진행 ──
  const parsed = selected.length > 0 ? parseExpression(selected) : null;
  const exprValue = parsed?.value ?? null;
  const exprDisplay = parsed ? parsed.tokens.map(t=>t.display).join(" ") : selected.map(c=>c.value).join(" ");

  function goMain() {
    clearFx();
    fetchTop10(top10Tab);
    setScreen("select");
  }

  function startGame(diff) {
    clearFx();
    play("click");
    setDifficulty(diff);
    setRound(1); setEnemyMaxHp(enemyMaxHpFor(1)); setEnemyHp(enemyMaxHpFor(1));
    setHand(genHand(1)); setSelected([]); setTurn(1); setLog([]);
    setPassives({}); setItems(EMPTY_ITEMS); setRewardOptions([]); setItemMode(null);
    setMaxDmg(0); setTotalDmgDealt(0); setScore(null);
    setTotalScore(0); setRoundScores([]); setFinalRank(null); setPhase("play");
    setNickname(""); setNicknameSubmitted(false); setRegistrationSkipped(false);
    setSubmitting(false); setPreRank(null); setShareMsg(null);
    setScreen("game");
  }

  function toggleCard(card) {
    if (phase !== "play") return;
    if (itemMode) { handleItemCardTap(card); return; }
    const isSel = selected.some(c=>c.id===card.id);
    play(isSel ? "deselect" : "select");
    setSelected(prev => isSel ? prev.filter(c=>c.id!==card.id) : [...prev, card]);
  }

  // reason: "turnLimit"(턴 초과) | "quit"(도중 포기)
  function triggerGameOver(newTS, currentDiff, currentRound, currentTurn, currentMaxDmg, currentThresh, reason) {
    setScore({ base: 0, perfect: false, finalScore: 0, turnCount: currentTurn, maxD: currentMaxDmg, thresh: currentThresh, newTS, turnLimitExceeded: reason === "turnLimit", quit: reason === "quit", limit: turnLimit(currentRound, passives.timeExt) });
    setTotalScore(newTS);
    setPhase("gameover");
    loadPreRank(newTS, currentDiff, currentRound);
  }

  function endTurn(skip = false) {
    let newHand = hand;
    if (!skip) {
      if (!exprValue || exprValue <= 0) return;
      const dmg = exprValue;
      const newHp = Math.max(0, enemyHp - dmg);
      const newMax = Math.max(maxDmg, dmg);
      setMaxDmg(newMax);
      const newTotal = totalDmgDealt + dmg;
      setTotalDmgDealt(newTotal);
      playHitFx(dmg);
      setEnemyHp(newHp);
      setLog(prev=>[`⚔️ 턴${turn}: ${exprDisplay} = ${dmg}!`, ...prev.slice(0,4)]);

      if (newHp <= 0) {
        const perfect = newTotal === enemyMaxHp;
        const allIn = selected.length === hand.length;
        const multiplier = (perfect ? 2 : 1) * (allIn ? 2 : 1);
        const base = roundScore(newMax / turn);
        const fs = roundScore(base * multiplier);
        const thresh = thresholdFor(difficulty, round, passives.relax);
        const isGO = fs <= thresh;
        setSelected([]);
        setItemMode(null);

        // 기준 미달이지만 부활 보유 → 점수는 버리고 라운드 재도전
        if (isGO && items.revive > 0) {
          setPhase("kill");
          setKillBanner({ text: "💥 K.O.!", color: "#f87171" });
          play("kill");
          fxTimeout(() => revive(`기준 미달 (${fs.toFixed(2)}점 ≤ ${thresh}점)`), 1200);
          return;
        }

        const newTS = totalScore + fs;
        const newRS = [...roundScores, { round, score: fs, perfect, allIn }];
        setScore({ base, perfect, allIn, multiplier, finalScore: fs, turnCount: turn, maxD: newMax, thresh, newTS });
        setTotalScore(newTS);
        setRoundScores(newRS);
        if (!isGO) setRewardOptions(rollRewardOptions(passives, items));
        setPhase("kill");
        setKillBanner(
          perfect && allIn ? { text: "⚡ COMBO ×4!", color: "#fbbf24" }
          : perfect ? { text: "✨ PERFECT!", color: "#4ade80" }
          : allIn ? { text: "🃏 ALL IN!", color: "#fb923c" }
          : { text: "💥 K.O.!", color: "#f87171" }
        );
        if (isGO) loadPreRank(newTS, difficulty, round);
        play("kill");
        if (perfect && allIn) play("combo");
        else if (perfect) play("perfect");
        else if (allIn) play("allIn");
        fxTimeout(() => {
          play(isGO ? "gameOver" : "roundClear");
          setKillBanner(null);
          setPhase(isGO ? "gameover" : "result");
        }, 1200);
        return;
      }
      const usedIds = new Set(selected.map(c=>c.id));
      newHand = hand.filter(c=>!usedIds.has(c.id));
    } else {
      play("skip");
      setLog(prev=>[`💤 턴${turn}: 턴 넘김`, ...prev.slice(0,4)]);
    }
    setSelected([]);

    const nextTurn = turn + 1;
    if (nextTurn > turnLimit(round, passives.timeExt)) {
      if (items.revive > 0) { revive(`턴 초과 (${turnLimit(round, passives.timeExt)}턴)`); return; }
      const thresh = thresholdFor(difficulty, round, passives.relax);
      play("gameOver");
      triggerGameOver(totalScore, difficulty, round, turn, maxDmg, thresh, "turnLimit");
      return;
    }
    // 6번째 턴: 연산카드 4장 미만이고 ×가 없으면 × 지급
    if (nextTurn === 6 && newHand.filter(c => c.type === "op").length < 4 && !newHand.some(c => c.type === "op" && c.value === "×")) {
      setHand(newHand.length < maxHandSize(round) ? [...newHand, makeCard("op", "×")] : newHand);
    } else {
      setHand(addCard(newHand, round, passives));
    }
    if (newHand.length < maxHandSize(round)) fxTimeout(() => play("draw"), skip ? 0 : 250);
    setTurn(nextTurn);
  }

  // 게임 도중 포기: 점수가 있으면 게임오버와 같은 방식으로 랭킹 등록 여부를 물음
  function quitGame() {
    if (phase !== "play") return; // 처치 연출 중에는 무시
    if (totalScore <= 0) {
      if (window.confirm("게임을 종료하고 메인 메뉴로 돌아가겠습니까?")) goMain();
      return;
    }
    if (!window.confirm(`게임을 포기하시겠습니까?\n지금까지의 총점 ${totalScore.toFixed(2)}점으로 랭킹에 등록할 수 있습니다.`)) return;
    clearFx();
    setSelected([]);
    play("gameOver");
    setItemMode(null);
    triggerGameOver(totalScore, difficulty, round, turn, maxDmg, thresholdFor(difficulty, round, passives.relax), "quit");
  }

  // r 라운드를 처음 상태로 (다음 라운드 진입, 부활 재도전 공용). pv = 적용할 패시브
  function restartRound(r, pv) {
    const mhp = enemyMaxHpFor(r);
    setEnemyMaxHp(mhp); setEnemyHp(mhp);
    setHand(genHand(r, pv)); setSelected([]); setTurn(1); setLog([]);
    setMaxDmg(0); setTotalDmgDealt(0); setScore(null); setItemMode(null); setPhase("play");
  }

  function nextRound(pv = passives) {
    clearFx();
    play("click");
    setRound(round + 1);
    restartRound(round + 1, pv);
  }

  // 보상 선택 → 적용 후 바로 다음 라운드. 아이템 3종이 모이면 부활 자동 합성
  function pickReward(opt) {
    const res = applyReward(opt, passives, items);
    setPassives(res.passives);
    setItems(res.items);
    setRewardOptions([]);
    nextRound(res.passives);
    play("levelUp");
    if (res.synthesized) {
      play("synth");
      setKillBanner({ text: "✨ 히든 합성!", sub: "🔄 ✏️ 🪞 → 💖 부활 획득", color: "#f472b6", long: true });
      fxTimeout(() => setKillBanner(null), 2100);
    }
  }

  // 부활: 부활 1개를 쓰고 같은 라운드를 처음부터 (실패한 시도의 점수는 버림)
  function revive(reason) {
    clearFx();
    setItems(i => ({ ...i, revive: i.revive - 1 }));
    restartRound(round, passives);
    play("revive");
    setKillBanner({ text: "💖 부활!", sub: `${reason} — R${round} 재도전`, color: "#f472b6", long: true });
    fxTimeout(() => setKillBanner(null), 2100);
  }

  // ── 아이템 사용 ──
  function useItem(key) {
    if (phase !== "play" || items[key] <= 0) return;
    if (itemMode?.type === key) { setItemMode(null); return; } // 같은 버튼을 다시 누르면 취소
    setSelected([]);
    if (key === "reroll") {
      setItemMode(null);
      setHand(drawHand(hand.length, passives));
      setItems(i => ({ ...i, reroll: i.reroll - 1 }));
      play("item");
      return;
    }
    play("select");
    setItemMode({ type: key });
  }

  function handleItemCardTap(card) {
    // 마법 펜: 숫자 카드(9 제외)를 더 큰 숫자로 무작위 변경. 연산·9는 선택되지 않음
    if (itemMode.type === "pen") {
      if (!canUpgradeNumber(card)) return;
      const newValue = upgradeNumber(card.value);
      setHand(h => h.map(c => c.id === card.id ? { ...c, value: newValue } : c));
      setItems(i => ({ ...i, pen: i.pen - 1 }));
      setLog(prev => [`✏️ 마법 펜: ${card.value} → ${newValue}`, ...prev.slice(0,4)]);
      setItemMode(null);
      play("item");
      return;
    }
    // 복제: 바꿀 카드 → 따라 할 카드 순서로 선택
    if (!itemMode.targetId) {
      play("select");
      setItemMode({ type: "clone", targetId: card.id });
      return;
    }
    if (card.id === itemMode.targetId) return;
    const targetId = itemMode.targetId;
    setHand(h => h.map(c => c.id === targetId ? { ...c, type: card.type, value: card.value } : c));
    setItems(i => ({ ...i, clone: i.clone - 1 }));
    setItemMode(null);
    play("item");
  }

  // ── 화면 ──
  if (screen === "rankings") {
    return (
      <RankingScreen
        tab={rankingsTab} onTab={handleRankingsTab}
        query={searchQuery} onSearch={handleSearch}
        rankings={allRankings} loading={searchLoading} error={rankingsError}
        onBack={()=>setScreen("select")}
      />
    );
  }

  if (screen === "select") {
    return (
      <MainScreen
        top10={top10} top10Tab={top10Tab} onTop10Tab={handleTop10Tab}
        onStart={startGame} onOpenRankings={openRankings}
      />
    );
  }

  return (
    <GameScreen
      difficulty={difficulty} round={round} turn={turn} hand={hand} selected={selected} phase={phase} log={log}
      enemyHp={enemyHp} enemyMaxHp={enemyMaxHp} roundScores={roundScores} totalScore={totalScore}
      fx={{ hitId, dmgPops, screenShake, flashId, killBanner }}
      limit={turnLimit(round, passives.timeExt)}
      passives={passives} items={items} itemMode={itemMode}
      onUseItem={useItem} onCancelItem={()=>setItemMode(null)}
      exprDisplay={exprDisplay} exprValue={exprValue}
      onToggleCard={toggleCard}
      onAttack={()=>endTurn(false)}
      onSkip={()=>endTurn(true)}
      onQuit={quitGame}
    >
      {(phase==="result"||phase==="gameover") && (
        <ResultOverlay
          phase={phase} round={round} difficulty={difficulty} score={score} totalScore={totalScore}
          preRank={preRank} preRankLoading={preRankLoading} finalRank={finalRank}
          nickname={nickname} onNicknameChange={setNickname}
          submitting={submitting} submitError={submitError}
          nicknameSubmitted={nicknameSubmitted} registrationSkipped={registrationSkipped}
          shareMsg={shareMsg}
          onSubmit={submitScore}
          onSkipRegistration={()=>setRegistrationSkipped(true)}
          onShare={shareResult}
          onNextRound={()=>nextRound()}
          rewardOptions={rewardOptions} passives={passives} items={items} onPickReward={pickReward}
          nextThresh={thresholdFor(difficulty, round + 1, passives.relax)}
          onRetry={()=>startGame(difficulty)}
          onGoMain={goMain}
        />
      )}
    </GameScreen>
  );
}
