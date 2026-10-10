import { useState, useEffect, useRef } from "react";
import { play } from "./sfx";
import { playBgm } from "./bgm";
import { DIFFICULTIES, makeCard, maxHandSize, genHand, addCard, drawHand, parseExpression, enemyMaxHpFor, turnLimit, thresholdFor, canUpgradeNumber, upgradeNumber, baseRound, isMirrorRound,
  enemyAttacks, isBossRound, attackInterval, BOSS_SEAL_COUNT, BOSS_RAGE_SEAL_COUNT, SEAL_TURNS, getEnemy,
  breakCount, enemyHeals, HEAL_RATIO } from "./game/rules";
import { rollRewardOptions, applyReward, modsFrom, COMBOS, EMPTY_ITEMS, SHIELD_MAX } from "./game/rewards";
import { fetchRankings, fetchPreRank, insertRanking, roundScore } from "./game/ranking";
import { shareOrCopy } from "./utils/share";
import { resetZoom } from "./utils/viewport";
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
  const [combos, setCombos] = useState({}); // 조합 { goldenHand: true, ... } — 두 패시브의 Lv5 효과 + 새 능력
  const mods = modsFrom(passives, combos); // 실제 적용 효과 (패시브 + 조합)
  const [items, setItems] = useState(EMPTY_ITEMS);
  const [rewardOptions, setRewardOptions] = useState([]);
  const [rewardPicks, setRewardPicks] = useState({ left: 1, total: 1 }); // 마왕 라운드 클리어는 2번 선택
  const pendingBanners = useRef([]); // 결과창에 가려지지 않게, 다음 라운드 시작 때 띄울 배너
  const [itemMode, setItemMode] = useState(null); // { type:"pen", cardId? } | { type:"clone", targetId? }

  // 적의 공격 (R6~): 공격까지 남은 턴, 마왕 분노 여부, 공격 연출용 id
  const [atkTimer, setAtkTimer] = useState(attackInterval(1));
  const [enraged, setEnraged] = useState(false);
  const [enemyAtkId, setEnemyAtkId] = useState(0);
  const [atkBlocked, setAtkBlocked] = useState(false); // 방패로 막은 공격이면 내 캐릭터가 움찔하지 않음
  const [healId, setHealId] = useState(0); // 적 회복 연출

  // 히든 (라운드당 1회): 숫자 수집가 = 한 라운드에 1~9를 모두 공격에 사용, 사칙연산 마스터 = 손패에 + − × ÷ 동시 보유
  const [digitsUsed, setDigitsUsed] = useState([]);
  const [digitsHiddenDone, setDigitsHiddenDone] = useState(false);
  const [opsHiddenDone, setOpsHiddenDone] = useState(false);

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

  // 히든 '사칙연산 마스터': 손패에 + − × ÷가 모두 있으면 🛡️ 방패 (라운드당 1회, 최대 1개)
  useEffect(() => {
    if (screen !== "game" || phase !== "play" || opsHiddenDone) return;
    const ops = new Set(hand.filter(c => c.type === "op" && !c.breaking).map(c => c.value));
    if (!["+", "-", "×", "÷"].every(op => ops.has(op))) return;
    setOpsHiddenDone(true);
    const gained = items.shield < SHIELD_MAX;
    if (gained) setItems(i => ({ ...i, shield: i.shield + 1 }));
    play("synth");
    setKillBanner({ text: "🛡️ 사칙연산 마스터!", sub: gained ? "+ − × ÷ 모두 보유 → 다음 적 공격 1회 방어" : "+ − × ÷ 모두 보유 (방패는 이미 가지고 있음)", color: "#38bdf8", long: true });
    fxTimeout(() => setKillBanner(null), 2100);
    setLog(prev => [gained ? "🛡️ 사칙연산 마스터! 방패 획득" : "🛡️ 사칙연산 마스터! (방패 이미 보유)", ...prev.slice(0,4)]);
  }, [hand, phase, screen, opsHiddenDone]);

  // 화면이 바뀔 때 모바일 확대(핀치 줌) 상태를 원래대로
  useEffect(() => { resetZoom(); }, [screen]);

  // 배경음악: 메인·랭킹 = 로비, 기준 라운드 1~5 = 전투, 6~10 = 보스 (기준 라운드마다 템포 상승), 게임오버 시 정지
  // 20라운드 주기: R11~20은 R1~10 곡을 역재생, R21~ 반복 (baseRound / isMirrorRound)
  useEffect(() => {
    const base = baseRound(round), rev = isMirrorRound(round);
    if (screen !== "game") playBgm("lobby");
    else if (phase === "gameover") playBgm(null);
    else if (base <= 5) playBgm("battle", 132 + (base - 1) * 3, rev);
    else playBgm("boss", 150 + (base - 6) * 2 + (enraged ? 16 : 0), rev); // 적의 공격이 시작되는 6라운드부터 보스 테마
  }, [screen, phase, round, enraged]);

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
    resetZoom(); // 재도전처럼 같은 게임 화면에서 다시 시작할 때도 확대 해제
    clearFx();
    play("click");
    setDifficulty(diff);
    setRound(1); setEnemyMaxHp(enemyMaxHpFor(1)); setEnemyHp(enemyMaxHpFor(1));
    setHand(genHand(1)); setSelected([]); setTurn(1); setLog([]);
    setPassives({}); setCombos({}); setItems(EMPTY_ITEMS); setRewardOptions([]); setItemMode(null);
    setRewardPicks({ left: 1, total: 1 }); pendingBanners.current = [];
    setAtkTimer(attackInterval(1)); setEnraged(false);
    setDigitsUsed([]); setDigitsHiddenDone(false); setOpsHiddenDone(false);
    setMaxDmg(0); setTotalDmgDealt(0); setScore(null);
    setTotalScore(0); setRoundScores([]); setFinalRank(null); setPhase("play");
    setNickname(""); setNicknameSubmitted(false); setRegistrationSkipped(false);
    setSubmitting(false); setPreRank(null); setShareMsg(null);
    setScreen("game");
  }

  function toggleCard(card) {
    if (phase !== "play") return;
    if (card.locked || card.breaking) return;
    if (itemMode) { handleItemCardTap(card); return; }
    const isSel = selected.some(c=>c.id===card.id);
    play(isSel ? "deselect" : "select");
    setSelected(prev => isSel ? prev.filter(c=>c.id!==card.id) : [...prev, card]);
  }

  // reason: "turnLimit"(턴 초과) | "quit"(도중 포기)
  function triggerGameOver(newTS, currentDiff, currentRound, currentTurn, currentMaxDmg, currentThresh, reason) {
    setScore({ base: 0, perfect: false, finalScore: 0, turnCount: currentTurn, maxD: currentMaxDmg, thresh: currentThresh, newTS, turnLimitExceeded: reason === "turnLimit", quit: reason === "quit", limit: turnLimit(currentRound, mods.timeExt) });
    setTotalScore(newTS);
    setPhase("gameover");
    loadPreRank(newTS, currentDiff, currentRound);
  }

  function endTurn(skip = false) {
    let newHand = hand;
    let rageNow = false;
    let hpNow = enemyHp; // 이번 턴 공격 후 적 HP (적 회복 계산용)
    if (!skip) {
      if (!exprValue || exprValue <= 0) return;
      const dmg = exprValue;
      let newHp = Math.max(0, enemyHp - dmg);
      const newMax = Math.max(maxDmg, dmg);
      setMaxDmg(newMax);
      const newTotal = totalDmgDealt + dmg;
      setTotalDmgDealt(newTotal);
      playHitFx(dmg);
      setLog(prev=>[`⚔️ 턴${turn}: ${exprDisplay} = ${dmg}!`, ...prev.slice(0,4)]);

      // 히든 '숫자 수집가': 이번 라운드 공격에 1~9를 모두 쓰면 남은 HP의 30% 추가 피해
      // (공격이 아니라서 최고 데미지·점수에는 안 들어감, 추가 피해로는 처치하지 않음)
      const usedNow = [...new Set([...digitsUsed, ...selected.filter(c => c.type === "num").map(c => c.value)])];
      setDigitsUsed(usedNow);
      if (newHp > 0 && !digitsHiddenDone && usedNow.length === 9) {
        const bonus = Math.min(newHp - 1, Math.floor(newHp * 0.3));
        setDigitsHiddenDone(true);
        if (bonus > 0) {
          newHp -= bonus;
          fxTimeout(() => setDmgPops(prev => [...prev, { id: Date.now() + Math.random(), dmg: bonus, ratio: 0.3, bonus: true }]), 350);
        }
        play("synth");
        setKillBanner({ text: "🔢 숫자 수집가!", sub: `1~9 모두 사용 → 추가 피해 ${bonus}`, color: "#c084fc", long: true });
        fxTimeout(() => setKillBanner(null), 2100);
        setLog(prev => [`🔢 숫자 수집가! 추가 피해 ${bonus}`, ...prev.slice(0,4)]);
      }
      setEnemyHp(newHp);
      hpNow = newHp;

      if (newHp <= 0) {
        // 퍼펙트 = 마지막 공격이 남은 HP와 정확히 같음 (추가 피해가 없으면 '총 데미지 = 최대 HP'와 동일)
        const perfect = dmg === enemyHp;
        const allIn = selected.length === hand.filter(c => !c.locked).length;
        const multiplier = (perfect ? 2 : 1) * (allIn ? 2 : 1);
        const base = roundScore(newMax / turn);
        const fs = roundScore(base * multiplier);
        const thresh = thresholdFor(difficulty, round, mods.relax);
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
        if (!isGO) {
          setRewardOptions(rollRewardOptions(passives, items, combos));
          const total = isBossRound(round) ? 2 : 1; // 마왕 처치 보너스: 보상 2번
          setRewardPicks({ left: total, total });
        }
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
      if (isBossRound(round) && !enraged && newHp <= enemyMaxHp / 2) rageNow = true;
    } else {
      play("skip");
      setLog(prev=>[`💤 턴${turn}: 턴 넘김`, ...prev.slice(0,4)]);
    }
    setSelected([]);

    // 봉인은 SEAL_TURNS턴 동안만: 턴이 지날 때마다 1씩 줄고 0이 되면 해제
    const unsealed = [];
    newHand = newHand.map(c => {
      if (!c.locked) return c;
      const left = (c.lockLeft ?? SEAL_TURNS) - 1;
      if (left > 0) return { ...c, lockLeft: left };
      unsealed.push(c.value);
      return { ...c, locked: false, lockLeft: undefined };
    });
    if (unsealed.length) setLog(prev => [`🔓 봉인 해제: 카드 ${unsealed.join(", ")}`, ...prev.slice(0,4)]);

    const nextTurn = turn + 1;
    if (nextTurn > turnLimit(round, mods.timeExt)) {
      if (items.revive > 0) { revive(`턴 초과 (${turnLimit(round, mods.timeExt)}턴)`); return; }
      const thresh = thresholdFor(difficulty, round, mods.relax);
      play("gameOver");
      triggerGameOver(totalScore, difficulty, round, turn, maxDmg, thresh, "turnLimit");
      return;
    }
    // 마왕 분노: 봉인 장수 증가 (공격 주기는 그대로)
    if (rageNow) {
      setEnraged(true);
      play("rage");
      setKillBanner({ text: "😡 마왕 분노!", sub: `봉인 ${BOSS_SEAL_COUNT}장 → ${BOSS_RAGE_SEAL_COUNT}장 (파괴 1장은 그대로)`, color: "#ef4444", long: true });
      fxTimeout(() => setKillBanner(null), 2100);
    }
    const isRaging = enraged || rageNow;

    // 적의 공격 (R6~): 남은 턴이 0이 되면 1장 파괴. 마왕은 파괴 + 봉인(평소 1장, 분노 2장)
    let attack = null; // { victim, index, sealed: [] }
    if (enemyAttacks(round)) {
      let timer = atkTimer - 1;
      if (timer <= 0) {
        timer = attackInterval(round);
        attack = { victims: [], sealed: [], blocked: items.shield > 0, heal: 0 };
        if (attack.blocked) {
          setItems(i => ({ ...i, shield: i.shield - 1 }));
        } else if (newHand.length) {
          // 무작위로 n장 파괴 (R26부터 2장). 원래 위치를 기억해 깨지는 연출에 사용
          const pool = newHand.map((_, k) => k);
          const picked = [];
          for (let k = Math.min(breakCount(round), newHand.length); k > 0; k--) picked.push(pool.splice(Math.floor(Math.random() * pool.length), 1)[0]);
          picked.sort((x, y) => x - y);
          attack.victims = picked.map(i => ({ card: newHand[i], index: i }));
          newHand = newHand.filter((_, k) => !picked.includes(k));
        }
        // R36부터: 공격할 때마다 최대 HP의 5% 회복 (방패는 카드 공격만 막음)
        if (enemyHeals(round)) attack.heal = Math.min(enemyMaxHp - hpNow, Math.ceil(enemyMaxHp * HEAL_RATIO));
        if (isBossRound(round) && !attack.blocked) {
          const n = Math.min(isRaging ? BOSS_RAGE_SEAL_COUNT : BOSS_SEAL_COUNT, newHand.length);
          const pool = newHand.map((_, k) => k);
          const picked = new Set();
          while (picked.size < n) picked.add(pool.splice(Math.floor(Math.random() * pool.length), 1)[0]);
          newHand = newHand.map((c, k) => picked.has(k) ? { ...c, locked: true, lockLeft: SEAL_TURNS } : c);
          attack.sealed = newHand.filter((_, k) => picked.has(k));
        }
      }
      setAtkTimer(timer);
    }

    // 6번째 턴: 연산카드 4장 미만이고 ×가 없으면 × 지급
    let drawn;
    if (nextTurn === 6 && newHand.filter(c => c.type === "op").length < 4 && !newHand.some(c => c.type === "op" && c.value === "×")) {
      drawn = newHand.length < maxHandSize(round, mods) ? [...newHand, makeCard("op", "×")] : newHand;
    } else {
      drawn = addCard(newHand, round, mods);
    }
    if (newHand.length < maxHandSize(round, mods)) fxTimeout(() => play("draw"), attack ? 700 : skip ? 0 : 250);
    setTurn(nextTurn);

    if (!attack) { setHand(drawn); return; }

    // 공격 연출: 적 돌진 → 카드 파괴(깨지는 카드는 잠깐 남겨 두었다가 제거) + 봉인. 연출 동안 입력 잠금
    const enemyName = getEnemy(round).name;
    setEnemyAtkId(n => n + 1);
    setAtkBlocked(attack.blocked);
    setPhase("enemy");
    fxTimeout(() => play("enemyAttack"), 250); // CSS 연출(0.25초 뒤 돌진)과 맞춤
    if (attack.victims.length) {
      const shown = [...drawn];
      for (const v of attack.victims) shown.splice(v.index, 0, { ...v.card, breaking: true }); // 원래 자리에 깨지는 카드
      setHand(shown);
      fxTimeout(() => play("cardBreak"), 450);
      fxTimeout(() => setHand(h => h.filter(c => !c.breaking)), 950);
    } else setHand(drawn);
    if (attack.sealed.length) fxTimeout(() => play("seal"), 650);
    if (attack.heal > 0) {
      const heal = attack.heal;
      fxTimeout(() => {
        setEnemyHp(h => Math.min(enemyMaxHp, h + heal));
        setHealId(n => n + 1);
        const popId = Date.now() + Math.random();
        setDmgPops(prev => [...prev, { id: popId, dmg: heal, ratio: 0, heal: true }]);
        fxTimeout(() => setDmgPops(prev => prev.filter(p => p.id !== popId)), 1000);
        play("heal");
      }, 550);
      fxTimeout(() => setLog(prev => [`💚 ${enemyName} 체력 회복 +${heal}`, ...prev.slice(0,4)]), 550);
    }
    const parts = [];
    if (attack.victims.length) parts.push(`카드 ${attack.victims.map(v => v.card.value).join(", ")} 파괴`);
    if (attack.sealed.length) parts.push(`${attack.sealed.map(c => c.value).join(", ")} 봉인`);
    const icon = isBossRound(round) ? "👿" : "👹";
    if (attack.blocked) {
      fxTimeout(() => play("seal"), 450);
      setLog(prev => [`🛡️ 방패로 ${enemyName}의 공격을 막았다!`, ...prev.slice(0,4)]);
    } else setLog(prev => [`${icon} ${enemyName}의 공격! ${parts.length ? parts.join(" · ") : "(부술 카드가 없다)"}`, ...prev.slice(0,4)]);
    fxTimeout(() => setPhase(p => p === "enemy" ? "play" : p), 950);
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
    triggerGameOver(totalScore, difficulty, round, turn, maxDmg, thresholdFor(difficulty, round, mods.relax), "quit");
  }

  // r 라운드를 처음 상태로 (다음 라운드 진입, 부활 재도전 공용). pv = 적용할 패시브
  function restartRound(r, pv) {
    const mhp = enemyMaxHpFor(r, difficulty);
    setEnemyMaxHp(mhp); setEnemyHp(mhp);
    setHand(genHand(r, pv)); setSelected([]); setTurn(1); setLog([]);
    setMaxDmg(0); setTotalDmgDealt(0); setScore(null); setItemMode(null); setPhase("play");
    setAtkTimer(attackInterval(r)); setEnraged(false);
    setDigitsUsed([]); setDigitsHiddenDone(false); setOpsHiddenDone(false);
  }

  // 마왕 라운드 시작 연출 (delay: 다른 배너가 먼저 뜨면 그 뒤에)
  function bossIntro(r, delay = 0) {
    if (!isBossRound(r)) return;
    fxTimeout(() => {
      play("bossAppear");
      setKillBanner({ text: "👿 마왕 강림", sub: `${attackInterval(r)}턴마다 카드 파괴 + 봉인`, color: "#a855f7", long: true });
      fxTimeout(() => setKillBanner(null), 2100);
    }, delay);
  }

  function nextRound(pv = mods) {
    clearFx();
    play("click");
    setRound(round + 1);
    restartRound(round + 1, pv);
  }
  // nextRound 뒤에 부르는 곳(보상 선택)에서 마왕 연출을 띄움

  // 보상 선택 → 적용 후 바로 다음 라운드. 아이템 3종이 모이면 부활 자동 합성
  function pickReward(opt) {
    const res = applyReward(opt, passives, items, combos);
    setPassives(res.passives);
    setCombos(res.combos);
    setItems(res.items);
    play("levelUp");
    if (opt.kind === "combo") {
      const c = COMBOS[opt.key];
      pendingBanners.current.push({ text: `✨ 조합 완성!`, sub: `${c.icon} ${c.name} — ${c.desc}`, color: "#fbbf24", long: true });
    }
    if (res.synthesized) pendingBanners.current.push({ text: "✨ 히든 합성!", sub: "🔄 ✏️ 🪞 → 💖 부활 획득", color: "#f472b6", long: true });

    // 남은 선택이 있으면(마왕 처치 보너스) 바뀐 상태로 선택지를 새로 뽑아 한 번 더
    if (rewardPicks.left > 1) {
      setRewardPicks(p => ({ ...p, left: p.left - 1 }));
      setRewardOptions(rollRewardOptions(res.passives, res.items, res.combos));
      return;
    }
    setRewardOptions([]);
    nextRound(modsFrom(res.passives, res.combos));
    showPendingThenBoss(round + 1);
  }

  // 모아 둔 배너(합성·조합)를 차례로 띄운 뒤 마왕 등장 연출
  function showPendingThenBoss(nextR) {
    const queue = pendingBanners.current;
    pendingBanners.current = [];
    queue.forEach((banner, i) => fxTimeout(() => {
      play("synth");
      setKillBanner(banner);
      fxTimeout(() => setKillBanner(null), 2100);
    }, 300 + i * 2200));
    bossIntro(nextR, 300 + queue.length * 2200);
  }

  // 부활: 부활 1개를 쓰고 같은 라운드를 처음부터 (실패한 시도의 점수는 버림)
  function revive(reason) {
    clearFx();
    setItems(i => ({ ...i, revive: i.revive - 1 }));
    restartRound(round, mods);
    play("revive");
    setKillBanner({ text: "💖 부활!", sub: `${reason} — R${round} 재도전`, color: "#f472b6", long: true });
    fxTimeout(() => setKillBanner(null), 2100);
    bossIntro(round, 2200);
  }

  // ── 아이템 사용 ──
  function useItem(key) {
    if (phase !== "play" || items[key] <= 0) return;
    if (itemMode?.type === key) { setItemMode(null); return; } // 같은 버튼을 다시 누르면 취소
    setSelected([]);
    if (key === "reroll") {
      setItemMode(null);
      const hadLock = hand.some(c => c.locked);
      setHand(drawHand(hand.length, mods)); // 새로 뽑은 카드에는 봉인이 없음 → 봉인 초기화
      setItems(i => ({ ...i, reroll: i.reroll - 1 }));
      if (hadLock) setLog(prev => ["🔄 리롤: 봉인이 풀렸다", ...prev.slice(0,4)]);
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
      fx={{ hitId, dmgPops, screenShake, flashId, killBanner, healId }}
      limit={turnLimit(round, mods.timeExt)} handMax={maxHandSize(round, mods)}
      thresh={thresholdFor(difficulty, round, mods.relax)}
      enemyAtk={{ active: enemyAttacks(round), timer: atkTimer, boss: isBossRound(round), enraged, id: enemyAtkId, attacking: phase === "enemy", blocked: atkBlocked }}
      passives={passives} combos={combos} items={items} itemMode={itemMode}
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
          onNextRound={()=>{ nextRound(); showPendingThenBoss(round + 1); }}
          rewardOptions={rewardOptions} rewardPicks={rewardPicks} passives={passives} items={items} onPickReward={pickReward}
          nextThresh={thresholdFor(difficulty, round + 1, mods.relax)}
          onRetry={()=>startGame(difficulty)}
          onGoMain={goMain}
        />
      )}
    </GameScreen>
  );
}
