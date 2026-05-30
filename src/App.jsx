import { useState, useEffect, useRef } from "react";
import { supabase } from "./supabase";

const OPS = ["+", "-", "×", "÷"];

const DIFFICULTIES = {
  easy:   { label: "이지",   emoji: "🌱", color: "#16a34a", threshold: r => r },
  normal: { label: "노말",   emoji: "⚔️", color: "#d97706", threshold: r => r * 2 },
  hard:   { label: "하드",   emoji: "💀", color: "#dc2626", threshold: r => r * r },
};

function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
function makeCard(type, value) {
  return { type, value, id: Date.now() + Math.random() + Math.random() };
}
function genCard(hand = []) {
  const opCount = hand.filter(c => c.type === "op").length;
  const isOp = opCount >= 4 ? false : Math.random() < 0.3;
  if (isOp) return makeCard("op", OPS[Math.floor(Math.random() * OPS.length)]);
  return makeCard("num", randInt(1, 9));
}
function maxHandSize(round) {
  if (round <= 2) return 7;
  if (round <= 4) return 8;
  if (round <= 6) return 9;
  return 10;
}
function genHand(round) {
  const size = Math.min(5, maxHandSize(round));
  let hand = [], attempts = 0;
  while (attempts++ < 200) {
    hand = [];
    for (let i = 0; i < size; i++) hand.push(genCard(hand));
    if (hand.filter(c=>c.type==="num").length >= 2 && hand.filter(c=>c.type==="op").length >= 1) break;
  }
  return hand;
}
function parseExpression(selected) {
  if (!selected.length) return null;
  let tokens = [], i = 0;
  while (i < selected.length) {
    const c = selected[i];
    if (c.type==="num" && i+2<selected.length &&
        selected[i+1].type==="num" && selected[i+2].type==="num" &&
        selected[i+1].value===c.value && selected[i+2].value===c.value) {
      tokens.push({ type:"num", value: c.value**2, display:`${c.value}²` });
      i += 3;
    } else {
      tokens.push({ ...c, display: String(c.value) });
      i++;
    }
  }
  if (tokens[0].type==="op" || tokens[tokens.length-1].type==="op") return null;
  for (let j=0;j<tokens.length-1;j++) if (tokens[j].type===tokens[j+1].type) return null;
  const exprStr = tokens.map(t => t.type==="op" ? (t.value==="×"?"*":t.value==="÷"?"/":t.value) : t.value).join(" ");
  try {
    // eslint-disable-next-line no-eval
    const r = eval(exprStr);
    if (!isFinite(r)||isNaN(r)) return null;
    return { value: Math.floor(r), tokens };
  } catch { return null; }
}

const ENEMY_EMOJIS = ["👹","🐉","👾","🧟","💀","🔥","👿","🦹"];
const ENEMY_NAMES  = ["고블린","드래곤","외계인","좀비","해골왕","화염정령","악마","다크히어로"];

// ── 공통 스타일 ──
const rankColor = i => i===0?"#fbbf24":i===1?"#d1d5db":i===2?"#cd7f32":"#9ca3af";

function RankRow({ rank, entry, highlight }) {
  return (
    <div style={{
      display:"flex", alignItems:"center", gap:8, padding:"6px 8px", borderRadius:8,
      background: highlight ? "rgba(192,132,252,0.15)" : "transparent",
      border: highlight ? "1px solid rgba(192,132,252,0.4)" : "1px solid transparent",
    }}>
      <span style={{ color: rankColor(rank-1), fontWeight:"bold", width:32, fontSize:13 }}>{rank}등</span>
      <span style={{ flex:1, color:"#fff", fontWeight:"bold", fontSize:13, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{entry.nickname}</span>
      <span style={{ color:"#fbbf24", fontWeight:"bold", fontSize:13 }}>{entry.score}점</span>
      <span style={{ color: DIFFICULTIES[entry.difficulty]?.color, fontSize:11, width:32, textAlign:"right" }}>{DIFFICULTIES[entry.difficulty]?.label}</span>
    </div>
  );
}

export default function App() {
  // screen: "select" | "game" | "rankings"
  const [screen, setScreen] = useState("select");
  const [difficulty, setDifficulty] = useState(null);
  const [top10, setTop10] = useState([]);

  // 전체 랭킹 화면
  const [allRankings, setAllRankings] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchLoading, setSearchLoading] = useState(false);
  const [rankingsError, setRankingsError] = useState(null);
  const [submitError, setSubmitError] = useState(null);
  const searchDebounceRef = useRef(null);

  // Game state
  const [round, setRound] = useState(1);
  const [enemyMaxHp, setEnemyMaxHp] = useState(50);
  const [enemyHp, setEnemyHp] = useState(50);
  const [enemyIdx, setEnemyIdx] = useState(0);
  const [hand, setHand] = useState([]);
  const [selected, setSelected] = useState([]);
  const [turn, setTurn] = useState(1);
  const [log, setLog] = useState([]);
  const [phase, setPhase] = useState("play");
  const [lastDmg, setLastDmg] = useState(null);
  const [shake, setShake] = useState(false);
  const [maxDmg, setMaxDmg] = useState(0);
  const [totalDmgDealt, setTotalDmgDealt] = useState(0);
  const [score, setScore] = useState(null);
  const [totalScore, setTotalScore] = useState(0);
  const [roundScores, setRoundScores] = useState([]);
  const [finalRank, setFinalRank] = useState(null);

  // 닉네임
  const [nickname, setNickname] = useState("");
  const [nicknameSubmitted, setNicknameSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => { fetchTop10(); }, []);

  async function fetchTop10() {
    const { data, error } = await supabase
      .from("rankings")
      .select("*")
      .order("score", { ascending: false })
      .limit(10);
    if (error) console.error("TOP10 로드 실패:", error.message);
    if (data) setTop10(data);
  }

  async function openRankings() {
    setScreen("rankings");
    setSearchQuery("");
    setRankingsError(null);
    const { data, error } = await supabase
      .from("rankings")
      .select("*")
      .order("score", { ascending: false })
      .limit(100);
    if (error) setRankingsError("랭킹을 불러오지 못했습니다. 다시 시도해주세요.");
    if (data) setAllRankings(data);
  }

  async function fetchRankingList(query) {
    setSearchLoading(true);
    setRankingsError(null);
    const req = query.trim() === ""
      ? supabase.from("rankings").select("*").order("score", { ascending: false }).limit(100)
      : supabase.from("rankings").select("*").ilike("nickname", `%${query.trim()}%`).order("score", { ascending: false }).limit(100);
    const { data, error } = await req;
    if (error) setRankingsError("검색 중 오류가 발생했습니다. 다시 시도해주세요.");
    if (data) setAllRankings(data);
    setSearchLoading(false);
  }

  function handleSearch(query) {
    setSearchQuery(query);
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    searchDebounceRef.current = setTimeout(() => fetchRankingList(query), 300);
  }

  async function submitScore(currentTotalScore) {
    if (!nickname.trim() || submitting) return;
    setSubmitting(true);
    setSubmitError(null);
    const finalScore = Math.round(currentTotalScore * 100) / 100;
    const { error: insertError } = await supabase.from("rankings").insert([{
      nickname: nickname.trim(),
      score: finalScore,
      difficulty,
      round,
    }]);
    if (insertError) {
      setSubmitError("등록에 실패했습니다. 다시 시도해주세요.");
      setSubmitting(false);
      return;
    }
    const { data, error: fetchError } = await supabase
      .from("rankings")
      .select("*")
      .order("score", { ascending: false })
      .limit(100);
    if (fetchError) {
      setSubmitError("순위를 불러오지 못했습니다.");
      setSubmitting(false);
      return;
    }
    if (data) {
      const myRank = data.findIndex(r =>
        r.nickname === nickname.trim() && r.score === finalScore
      ) + 1;
      setFinalRank(myRank || null);
    }
    await fetchTop10();
    setNicknameSubmitted(true);
    setSubmitting(false);
  }

  const parsed = selected.length > 0 ? parseExpression(selected) : null;
  const exprValue = parsed?.value ?? null;
  const exprDisplay = parsed ? parsed.tokens.map(t=>t.display).join(" ") : selected.map(c=>c.value).join(" ");

  function startGame(diff) {
    setDifficulty(diff);
    setRound(1); setEnemyMaxHp(50); setEnemyHp(50); setEnemyIdx(0);
    setHand(genHand(1)); setSelected([]); setTurn(1); setLog([]);
    setLastDmg(null); setMaxDmg(0); setTotalDmgDealt(0); setScore(null);
    setTotalScore(0); setRoundScores([]); setFinalRank(null); setPhase("play");
    setNickname(""); setNicknameSubmitted(false); setSubmitting(false);
    setScreen("game");
  }

  function toggleCard(card) {
    if (phase !== "play") return;
    setSelected(prev => prev.find(c=>c.id===card.id) ? prev.filter(c=>c.id!==card.id) : [...prev, card]);
  }

  function addCard(h, r) {
    if (h.length >= maxHandSize(r)) return h;
    return [...h, genCard(h)];
  }

  function endTurn(skip = false) {
    let newHand = hand;
    if (!skip) {
      if (!exprValue || exprValue <= 0) return;
      const dmg = exprValue;
      const newHp = Math.max(0, enemyHp - dmg);
      setLastDmg(dmg);
      const newMax = Math.max(maxDmg, dmg);
      setMaxDmg(newMax);
      const newTotal = totalDmgDealt + dmg;
      setTotalDmgDealt(newTotal);
      setShake(true); setTimeout(()=>setShake(false), 500);
      setEnemyHp(newHp);
      setLog(prev=>[`⚔️ 턴${turn}: ${exprDisplay} = ${dmg}!`, ...prev.slice(0,4)]);

      if (newHp <= 0) {
        const perfect = newTotal === enemyMaxHp;
        const base = Math.round((newMax / turn) * 100) / 100;
        const fs = perfect ? Math.round(base*2*100)/100 : base;
        const thresh = DIFFICULTIES[difficulty].threshold(round);
        const isGO = fs <= thresh;
        const newTS = totalScore + fs;
        const newRS = [...roundScores, { round, score: fs, perfect }];
        setScore({ base, perfect, finalScore: fs, turnCount: turn, maxD: newMax, isGameOver: isGO, thresh, newTS });
        setTotalScore(newTS);
        setRoundScores(newRS);
        setPhase(isGO ? "gameover" : "result");
        return;
      }
      const usedIds = new Set(selected.map(c=>c.id));
      newHand = hand.filter(c=>!usedIds.has(c.id));
    } else {
      setLog(prev=>[`💤 턴${turn}: 턴 넘김`, ...prev.slice(0,4)]);
    }
    setSelected([]);
    setHand(addCard(newHand, round));
    setTurn(t=>t+1);
  }

  function nextRound() {
    const nr = round+1;
    const mhp = Math.floor(50*Math.pow(1.5,nr-1));
    setRound(nr); setEnemyMaxHp(mhp); setEnemyHp(mhp);
    setEnemyIdx(Math.floor(Math.random()*ENEMY_EMOJIS.length));
    setHand(genHand(nr)); setSelected([]); setTurn(1); setLog([]);
    setLastDmg(null); setMaxDmg(0); setTotalDmgDealt(0); setScore(null); setPhase("play");
  }

  const hpPct = Math.max(0,(enemyHp/enemyMaxHp)*100);
  const hpColor = hpPct>50?"#4ade80":hpPct>25?"#facc15":"#f87171";
  const maxSize = maxHandSize(round);
  const diff = difficulty ? DIFFICULTIES[difficulty] : null;

  // ── 전체 랭킹 화면 ──
  if (screen === "rankings") {
    return (
      <div style={{ minHeight:"100vh", background:"linear-gradient(135deg,#0f0c29,#302b63,#24243e)", display:"flex", flexDirection:"column", alignItems:"center", padding:"24px 16px", fontFamily:"'Segoe UI',sans-serif", color:"#fff" }}>
        <div style={{ width:"100%", maxWidth:400 }}>
          {/* 헤더 */}
          <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:20 }}>
            <button onClick={()=>setScreen("select")} style={{ background:"rgba(255,255,255,0.08)", border:"1px solid rgba(255,255,255,0.15)", borderRadius:10, color:"#fff", padding:"6px 14px", cursor:"pointer", fontSize:13 }}>← 뒤로</button>
            <div style={{ fontSize:18, fontWeight:"bold", color:"#c084fc" }}>🏅 전체 랭킹</div>
          </div>

          {/* 검색창 */}
          <input
            value={searchQuery}
            onChange={e => handleSearch(e.target.value)}
            placeholder="닉네임 검색..."
            style={{ width:"100%", padding:"10px 14px", borderRadius:12, border:"1px solid rgba(255,255,255,0.2)", background:"rgba(255,255,255,0.08)", color:"#fff", fontSize:14, outline:"none", marginBottom:16, boxSizing:"border-box" }}
          />

          {/* 결과 수 / 에러 */}
          {rankingsError
            ? <div style={{ color:"#f87171", fontSize:13, marginBottom:10, padding:"10px 14px", background:"rgba(239,68,68,0.1)", borderRadius:10, border:"1px solid rgba(239,68,68,0.3)" }}>{rankingsError}</div>
            : <div style={{ fontSize:12, color:"#6b7280", marginBottom:10 }}>{searchLoading ? "검색 중..." : `${allRankings.length}명 표시 중 (최대 100명)`}</div>
          }

          {/* 랭킹 목록 */}
          <div style={{ display:"flex", flexDirection:"column", gap:4 }}>
            {allRankings.map((entry, i) => (
              <RankRow key={entry.id} rank={i+1} entry={entry} highlight={false} />
            ))}
            {allRankings.length === 0 && !searchLoading && !rankingsError && (
              <div style={{ color:"#6b7280", textAlign:"center", padding:"40px 0" }}>검색 결과가 없습니다</div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ── 메인(선택) 화면 ──
  if (screen === "select") {
    return (
      <div style={{ minHeight:"100vh", background:"linear-gradient(135deg,#0f0c29,#302b63,#24243e)", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", padding:"24px", fontFamily:"'Segoe UI',sans-serif", color:"#fff" }}>
        <div style={{ fontSize:26, fontWeight:"bold", marginBottom:6, color:"#c084fc", letterSpacing:2 }}>✨ 수학 카드 배틀 ✨</div>
        <div style={{ color:"#9ca3af", fontSize:14, marginBottom:32 }}>난이도를 선택하세요</div>

        {Object.entries(DIFFICULTIES).map(([key, d]) => (
          <button key={key} onClick={()=>startGame(key)} style={{
            width:260, marginBottom:14, padding:"18px 0", borderRadius:16, border:`2px solid ${d.color}`,
            background:"rgba(0,0,0,0.3)", color:"#fff", fontSize:17, fontWeight:"bold", cursor:"pointer",
            transition:"all 0.2s",
          }}
          onMouseOver={e=>e.currentTarget.style.background=`${d.color}33`}
          onMouseOut={e=>e.currentTarget.style.background="rgba(0,0,0,0.3)"}
          >
            <div style={{ fontSize:28, marginBottom:4 }}>{d.emoji}</div>
            <div style={{ color: d.color }}>{d.label}</div>
            <div style={{ fontSize:12, color:"#9ca3af", marginTop:4 }}>
              {key==="easy" ? "라운드 수 이하 → 게임오버" : key==="normal" ? "라운드×2 이하 → 게임오버" : "라운드² 이하 → 게임오버"}
            </div>
          </button>
        ))}

        {/* TOP 10 */}
        {top10.length > 0 && (
          <div style={{ marginTop:24, width:260, background:"rgba(0,0,0,0.3)", borderRadius:14, padding:"14px 16px", border:"1px solid rgba(255,255,255,0.1)" }}>
            <div style={{ color:"#fbbf24", fontWeight:"bold", marginBottom:10, fontSize:14 }}>🏅 TOP 10</div>
            <div style={{ display:"flex", flexDirection:"column", gap:2 }}>
              {top10.map((r, i) => (
                <RankRow key={r.id} rank={i+1} entry={r} highlight={false} />
              ))}
            </div>
            <button onClick={openRankings} style={{
              marginTop:12, width:"100%", padding:"8px 0", borderRadius:10,
              border:"1px solid rgba(192,132,252,0.4)", background:"rgba(192,132,252,0.1)",
              color:"#c084fc", fontSize:13, fontWeight:"bold", cursor:"pointer",
            }}>
              전체 랭킹 보기 →
            </button>
          </div>
        )}

        {top10.length === 0 && (
          <button onClick={openRankings} style={{
            marginTop:16, padding:"8px 20px", borderRadius:10,
            border:"1px solid rgba(192,132,252,0.4)", background:"rgba(192,132,252,0.1)",
            color:"#c084fc", fontSize:13, fontWeight:"bold", cursor:"pointer",
          }}>
            전체 랭킹 보기 →
          </button>
        )}
      </div>
    );
  }

  // ── 게임 화면 ──
  return (
    <div style={{ minHeight:"100vh", background:"linear-gradient(135deg,#0f0c29,#302b63,#24243e)", display:"flex", flexDirection:"column", alignItems:"center", padding:"16px", fontFamily:"'Segoe UI',sans-serif", color:"#fff" }}>

      <div style={{ width:"100%", maxWidth:380, display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:10 }}>
        <button onClick={() => { if (window.confirm("게임을 종료하고 메인 메뉴로 돌아가겠습니까?")) { fetchTop10(); setScreen("select"); } }} style={{ background:"rgba(255,255,255,0.07)", border:"1px solid rgba(255,255,255,0.15)", borderRadius:10, color:"#9ca3af", padding:"4px 12px", cursor:"pointer", fontSize:12 }}>🏠 메인</button>
        <div style={{ fontSize:18, fontWeight:"bold", color:"#c084fc", letterSpacing:2 }}>✨ 수학 카드 배틀 ✨</div>
        <div style={{ width:60 }} />
      </div>

      {/* Status bar */}
      <div style={{ display:"flex", gap:7, marginBottom:10, flexWrap:"wrap", justifyContent:"center" }}>
        <span style={{ background: diff.color+"44", border:`1px solid ${diff.color}`, borderRadius:20, padding:"3px 10px", fontSize:12 }}>{diff.emoji} {diff.label}</span>
        <span style={{ background:"#7c3aed", borderRadius:20, padding:"3px 10px", fontSize:12 }}>🏆 R{round}</span>
        <span style={{ background:"#1e40af", borderRadius:20, padding:"3px 10px", fontSize:12 }}>⚡ 턴{turn}</span>
        <span style={{ background: hand.length>=maxSize?"#065f46":"#374151", borderRadius:20, padding:"3px 10px", fontSize:12 }}>🃏 {hand.length}/{maxSize}</span>
        <span style={{ background:"#92400e", borderRadius:20, padding:"3px 10px", fontSize:12 }}>💰 {totalScore.toFixed(2)}점</span>
      </div>

      {/* Round score history */}
      {roundScores.length > 0 && (
        <div style={{ width:"100%", maxWidth:340, background:"rgba(0,0,0,0.25)", borderRadius:10, padding:"8px 12px", marginBottom:10, fontSize:12, border:"1px solid rgba(255,255,255,0.07)" }}>
          <div style={{ color:"#a78bfa", fontWeight:"bold", marginBottom:4 }}>📋 라운드 기록</div>
          <div style={{ display:"flex", flexWrap:"wrap", gap:6 }}>
            {roundScores.map((r,i)=>(
              <span key={i} style={{ background:"rgba(255,255,255,0.07)", borderRadius:8, padding:"2px 8px", color: r.perfect?"#4ade80":"#d1d5db" }}>
                R{r.round}: {r.score.toFixed(2)}{r.perfect?"✨":""}
              </span>
            ))}
          </div>
          <div style={{ borderTop:"1px solid rgba(255,255,255,0.1)", marginTop:6, paddingTop:6, color:"#fbbf24", fontWeight:"bold" }}>
            TOTAL: {totalScore.toFixed(2)}점
          </div>
        </div>
      )}

      {/* Enemy */}
      <div style={{ background:"rgba(255,255,255,0.05)", borderRadius:14, padding:"12px 22px", marginBottom:10, textAlign:"center", width:"100%", maxWidth:340, border:"1px solid rgba(255,255,255,0.1)" }}>
        <div style={{ fontSize:46, transition:"transform 0.1s", transform:shake?"translateX(8px)":"none" }}>{ENEMY_EMOJIS[enemyIdx]}</div>
        <div style={{ fontSize:14, fontWeight:"bold", marginBottom:6 }}>{ENEMY_NAMES[enemyIdx]} <span style={{ color:"#a78bfa", fontSize:11 }}>Lv.{round}</span></div>
        <div style={{ background:"rgba(0,0,0,0.3)", borderRadius:10, height:12, overflow:"hidden", marginBottom:4 }}>
          <div style={{ height:"100%", width:`${hpPct}%`, background:hpColor, borderRadius:10, transition:"width 0.4s,background 0.4s" }} />
        </div>
        <div style={{ fontSize:12, color:"#d1d5db" }}>HP: {enemyHp} / {enemyMaxHp}</div>
        {lastDmg && phase==="play" && <div style={{ color:"#f87171", fontSize:12, marginTop:2 }}>-{lastDmg} 💥</div>}
      </div>

      {/* Expression */}
      <div style={{ background:"rgba(0,0,0,0.3)", borderRadius:12, padding:"8px 16px", marginBottom:10, minWidth:200, textAlign:"center", border:"1px solid rgba(255,255,255,0.1)", maxWidth:340 }}>
        {selected.length===0
          ? <span style={{ color:"#6b7280", fontSize:13 }}>카드를 선택하세요</span>
          : <span style={{ fontSize:16, letterSpacing:2 }}>
              {exprDisplay}
              {exprValue!==null ? <span style={{ color:"#4ade80" }}> = {exprValue}</span> : <span style={{ color:"#f87171" }}> ✗</span>}
            </span>
        }
      </div>

      {/* Hand */}
      <div style={{ display:"flex", flexWrap:"wrap", gap:7, justifyContent:"center", marginBottom:10, maxWidth:380 }}>
        {hand.map(card=>{
          const isSel = !!selected.find(c=>c.id===card.id);
          const isOp = card.type==="op";
          return (
            <div key={card.id} onClick={()=>toggleCard(card)} style={{
              width:50, height:70, borderRadius:10, display:"flex", flexDirection:"column",
              alignItems:"center", justifyContent:"center", cursor:"pointer", fontWeight:"bold",
              fontSize: isOp?20:24,
              background: isSel ? (isOp?"linear-gradient(135deg,#7c3aed,#a855f7)":"linear-gradient(135deg,#1d4ed8,#3b82f6)") : (isOp?"linear-gradient(135deg,#4c1d95,#6d28d9)":"linear-gradient(135deg,#1e3a8a,#1d4ed8)"),
              border: isSel?"2px solid #f9fafb":"2px solid rgba(255,255,255,0.2)",
              boxShadow: isSel?"0 0 12px rgba(255,255,255,0.4)":"0 2px 6px rgba(0,0,0,0.4)",
              transform: isSel?"translateY(-8px) scale(1.05)":"none",
              transition:"all 0.2s", userSelect:"none", color:"#fff",
            }}>
              <div>{card.value}</div>
              <div style={{ fontSize:9, marginTop:2, opacity:0.7 }}>{isOp?"연산":"숫자"}</div>
            </div>
          );
        })}
      </div>

      {/* Buttons */}
      {phase==="play" && (
        <div style={{ display:"flex", gap:10, marginBottom:8 }}>
          <button onClick={()=>endTurn(false)} disabled={!exprValue||exprValue<=0} style={{
            padding:"10px 22px", fontSize:14, fontWeight:"bold", borderRadius:30, border:"none",
            cursor:exprValue&&exprValue>0?"pointer":"not-allowed",
            background:exprValue&&exprValue>0?"linear-gradient(135deg,#dc2626,#ef4444)":"rgba(255,255,255,0.1)",
            color:"#fff", boxShadow:exprValue&&exprValue>0?"0 4px 15px rgba(239,68,68,0.5)":"none",
          }}>⚔️ 공격! {exprValue&&exprValue>0?`(${exprValue})`:""}</button>
          <button onClick={()=>endTurn(true)} style={{
            padding:"10px 14px", fontSize:14, fontWeight:"bold", borderRadius:30,
            border:"2px solid rgba(255,255,255,0.2)", cursor:"pointer",
            background:"rgba(255,255,255,0.07)", color:"#9ca3af",
          }}>💤 턴 종료</button>
        </div>
      )}

      <div style={{ fontSize:11, color:"#6b7280", marginBottom:6 }}>💡 같은 숫자 3개 연속 → 제곱 (9 9 9 = 81)</div>

      {/* Log */}
      {log.length>0 && (
        <div style={{ width:"100%", maxWidth:340, background:"rgba(0,0,0,0.3)", borderRadius:10, padding:"8px 12px", fontSize:12, color:"#d1d5db", lineHeight:1.8 }}>
          {log.map((l,i)=><div key={i}>{l}</div>)}
        </div>
      )}

      {/* Result / Gameover overlay */}
      {(phase==="result"||phase==="gameover") && (
        <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.82)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:100, padding:16 }}>
          <div style={{ background: phase==="gameover"?"linear-gradient(135deg,#3b0000,#7f1d1d)":"linear-gradient(135deg,#1e1b4b,#312e81)", borderRadius:20, padding:"26px 30px", textAlign:"center", border:`2px solid ${phase==="gameover"?"#ef4444":"#7c3aed"}`, maxWidth:320, width:"100%" }}>

            {phase==="gameover"
              ? <><div style={{ fontSize:44, marginBottom:4 }}>💀</div><div style={{ fontSize:19, fontWeight:"bold", marginBottom:4, color:"#f87171" }}>게임 오버</div><div style={{ fontSize:13, color:"#fca5a5", marginBottom:10 }}>R{round} 점수 {score?.finalScore.toFixed(2)}점 — 기준 {score?.thresh}점 미달</div></>
              : <><div style={{ fontSize:44, marginBottom:4 }}>🎉</div><div style={{ fontSize:19, fontWeight:"bold", marginBottom:4, color:"#c084fc" }}>라운드 {round} 클리어!</div></>
            }

            {/* 점수 요약 */}
            <div style={{ background:"rgba(0,0,0,0.35)", borderRadius:10, padding:"10px 14px", fontSize:12, lineHeight:2, marginBottom:12, textAlign:"left" }}>
              <div>⏱️ 클리어 턴: <strong style={{ color:"#fff" }}>{score?.turnCount}턴</strong></div>
              <div>💥 최고 데미지: <strong style={{ color:"#fbbf24" }}>{score?.maxD}</strong></div>
              <div style={{ borderTop:"1px solid rgba(255,255,255,0.1)", marginTop:4, paddingTop:4, color:"#9ca3af" }}>📊 점수 계산</div>
              <div>{score?.maxD} ÷ {score?.turnCount} = <strong style={{ color:"#fff" }}>{score?.base}</strong></div>
              {score?.perfect && <div style={{ color:"#4ade80" }}>✨ 퍼펙트 클리어! × 2</div>}
              <div>🏆 라운드 점수: <strong style={{ color:score?.perfect?"#4ade80":"#c084fc", fontSize:16 }}>{score?.finalScore.toFixed(2)}</strong>
                {phase==="gameover"&&<span style={{ color:"#f87171", fontSize:11 }}> (기준 {score?.thresh}점 미달)</span>}
              </div>
              <div style={{ borderTop:"1px solid rgba(255,255,255,0.1)", marginTop:4, paddingTop:4 }}>
                💰 최종 총점: <strong style={{ color:"#fbbf24", fontSize:16 }}>{score?.newTS?.toFixed(2)}점</strong>
              </div>
            </div>

            {/* 게임오버: 닉네임 입력 */}
            {phase==="gameover" && !nicknameSubmitted && (
              <div style={{ marginBottom:12 }}>
                <div style={{ color:"#fbbf24", fontSize:13, fontWeight:"bold", marginBottom:8 }}>🏅 랭킹에 이름을 남기세요</div>
                <input
                  value={nickname}
                  onChange={e => setNickname(e.target.value)}
                  onKeyDown={e => e.key==="Enter" && submitScore(score?.newTS ?? totalScore)}
                  placeholder="닉네임 입력 (최대 12자)"
                  maxLength={12}
                  style={{ width:"100%", padding:"8px 12px", borderRadius:10, border:"1px solid rgba(255,255,255,0.2)", background:"rgba(255,255,255,0.08)", color:"#fff", fontSize:14, outline:"none", marginBottom:8, boxSizing:"border-box" }}
                />
                <button onClick={() => submitScore(score?.newTS ?? totalScore)} disabled={!nickname.trim() || submitting} style={{
                  width:"100%", padding:"10px 0", borderRadius:20, border:"none",
                  background: nickname.trim()&&!submitting ? "linear-gradient(135deg,#d97706,#f59e0b)" : "rgba(255,255,255,0.1)",
                  color:"#fff", fontSize:14, fontWeight:"bold", cursor: nickname.trim()&&!submitting ? "pointer":"not-allowed",
                }}>
                  {submitting ? "등록 중..." : "🏅 랭킹 등록"}
                </button>
                {submitError && (
                  <div style={{ marginTop:8, color:"#f87171", fontSize:12, padding:"8px", background:"rgba(239,68,68,0.1)", borderRadius:8, border:"1px solid rgba(239,68,68,0.3)" }}>{submitError}</div>
                )}
              </div>
            )}

            {/* 게임오버: 등록 완료 → 내 순위만 표시 */}
            {phase==="gameover" && nicknameSubmitted && (
              <div style={{ marginBottom:16 }}>
                {finalRank ? (
                  <div style={{ padding:"16px", background:"rgba(0,0,0,0.3)", borderRadius:12 }}>
                    <div style={{ color:"#9ca3af", fontSize:12, marginBottom:4 }}>내 최종 순위</div>
                    <div style={{ fontSize:36, fontWeight:"bold", color: finalRank<=3?"#fbbf24":finalRank<=10?"#c084fc":"#fff" }}>
                      {finalRank}위
                    </div>
                    <div style={{ color:"#6b7280", fontSize:12, marginTop:4 }}>{nickname} · {(score?.newTS ?? totalScore).toFixed(2)}점</div>
                  </div>
                ) : (
                  <div style={{ color:"#9ca3af", fontSize:13 }}>랭킹 등록 완료!</div>
                )}
              </div>
            )}

            {/* 다음 라운드 버튼 */}
            {phase==="result" && (
              <div style={{ fontSize:11, color:"#6b7280", marginBottom:12 }}>
                다음 기준: {DIFFICULTIES[difficulty].threshold(round+1)}점 · 적 HP: {Math.floor(50*Math.pow(1.5,round))}
              </div>
            )}

            {phase==="result"
              ? <button onClick={nextRound} style={{ padding:"10px 24px", borderRadius:20, border:"none", background:"linear-gradient(135deg,#7c3aed,#a855f7)", color:"#fff", fontSize:14, fontWeight:"bold", cursor:"pointer" }}>다음 라운드 →</button>
              : (nicknameSubmitted || phase!=="gameover") && (
                  <div style={{ display:"flex", gap:10, justifyContent:"center" }}>
                    <button onClick={()=>startGame(difficulty)} style={{ padding:"10px 18px", borderRadius:20, border:"none", background:"linear-gradient(135deg,#dc2626,#ef4444)", color:"#fff", fontSize:13, fontWeight:"bold", cursor:"pointer" }}>🔄 재도전</button>
                    <button onClick={()=>{ fetchTop10(); setScreen("select"); }} style={{ padding:"10px 18px", borderRadius:20, border:"2px solid rgba(255,255,255,0.2)", background:"transparent", color:"#fff", fontSize:13, fontWeight:"bold", cursor:"pointer" }}>🏠 메뉴</button>
                  </div>
                )
            }
          </div>
        </div>
      )}
    </div>
  );
}
