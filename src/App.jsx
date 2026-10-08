import { useState, useEffect, useRef } from "react";
import { play } from "./sfx";
import { playBgm } from "./bgm";
import { DIFFICULTIES, makeCard, maxHandSize, genHand, addCard, parseExpression, enemyMaxHpFor, turnLimit } from "./game/rules";
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

  // 배경음악: 메인·랭킹 = 로비, R1~6 = 전투, R7~ = 보스. 라운드마다 템포 상승, 게임오버 시 정지
  useEffect(() => {
    if (screen !== "game") playBgm("lobby");
    else if (phase === "gameover") playBgm(null);
    else if (round <= 6) playBgm("battle", 132 + (round - 1) * 3);
    else playBgm("boss", Math.min(150 + (round - 7) * 2, 166));
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
    setMaxDmg(0); setTotalDmgDealt(0); setScore(null);
    setTotalScore(0); setRoundScores([]); setFinalRank(null); setPhase("play");
    setNickname(""); setNicknameSubmitted(false); setRegistrationSkipped(false);
    setSubmitting(false); setPreRank(null); setShareMsg(null);
    setScreen("game");
  }

  function toggleCard(card) {
    if (phase !== "play") return;
    const isSel = selected.some(c=>c.id===card.id);
    play(isSel ? "deselect" : "select");
    setSelected(prev => isSel ? prev.filter(c=>c.id!==card.id) : [...prev, card]);
  }

  function triggerGameOver(newTS, currentDiff, currentRound, currentTurn, currentMaxDmg, currentThresh, isTurnLimit = false) {
    setScore({ base: 0, perfect: false, finalScore: 0, turnCount: currentTurn, maxD: currentMaxDmg, thresh: currentThresh, newTS, turnLimitExceeded: isTurnLimit });
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
        const thresh = DIFFICULTIES[difficulty].threshold(round);
        const isGO = fs <= thresh;
        const newTS = totalScore + fs;
        const newRS = [...roundScores, { round, score: fs, perfect, allIn }];
        setScore({ base, perfect, allIn, multiplier, finalScore: fs, turnCount: turn, maxD: newMax, thresh, newTS });
        setTotalScore(newTS);
        setRoundScores(newRS);
        setSelected([]);
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
    if (nextTurn > turnLimit(round)) {
      const thresh = DIFFICULTIES[difficulty].threshold(round);
      play("gameOver");
      triggerGameOver(totalScore, difficulty, round, turn, maxDmg, thresh, true);
      return;
    }
    // 6번째 턴: 연산카드 4장 미만이고 ×가 없으면 × 지급
    if (nextTurn === 6 && newHand.filter(c => c.type === "op").length < 4 && !newHand.some(c => c.type === "op" && c.value === "×")) {
      setHand(newHand.length < maxHandSize(round) ? [...newHand, makeCard("op", "×")] : newHand);
    } else {
      setHand(addCard(newHand, round));
    }
    if (newHand.length < maxHandSize(round)) fxTimeout(() => play("draw"), skip ? 0 : 250);
    setTurn(nextTurn);
  }

  function nextRound() {
    clearFx();
    play("click");
    const nr = round+1;
    const mhp = enemyMaxHpFor(nr);
    setRound(nr); setEnemyMaxHp(mhp); setEnemyHp(mhp);
    setHand(genHand(nr)); setSelected([]); setTurn(1); setLog([]);
    setMaxDmg(0); setTotalDmgDealt(0); setScore(null); setPhase("play");
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
      exprDisplay={exprDisplay} exprValue={exprValue}
      onToggleCard={toggleCard}
      onAttack={()=>endTurn(false)}
      onSkip={()=>endTurn(true)}
      onQuit={()=>{ if (window.confirm("게임을 종료하고 메인 메뉴로 돌아가겠습니까?")) goMain(); }}
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
          onNextRound={nextRound}
          onRetry={()=>startGame(difficulty)}
          onGoMain={goMain}
        />
      )}
    </GameScreen>
  );
}
