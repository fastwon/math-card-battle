import { useState } from "react";
import { DIFFICULTIES, getEnemy, maxHandSize, turnLimit } from "../game/rules";
import SoundButtons from "../components/SoundButtons";

function StatBar({ pct, color }) {
  return (
    <div style={{ background:"rgba(0,0,0,0.3)", borderRadius:10, height:10, overflow:"hidden", marginBottom:3 }}>
      <div style={{ height:"100%", width:`${pct}%`, background:color, borderRadius:10, transition:"width 0.4s,background 0.4s" }} />
    </div>
  );
}

// 전투 화면. 결과/게임오버 창은 children으로 받아 화면 안에 띄움
export default function GameScreen({
  difficulty, round, turn, hand, selected, phase, log,
  enemyHp, enemyMaxHp, roundScores, totalScore,
  fx, exprDisplay, exprValue,
  onToggleCard, onAttack, onSkip, onQuit, children,
}) {
  const [showScoreDetail, setShowScoreDetail] = useState(false);
  const { hitId, dmgPops, screenShake, flashId, killBanner } = fx;

  const diff = DIFFICULTIES[difficulty];
  const enemy = getEnemy(round);
  const hpPct = Math.max(0,(enemyHp/enemyMaxHp)*100);
  const hpColor = hpPct>50?"#4ade80":hpPct>25?"#facc15":"#f87171";
  const maxSize = maxHandSize(round);

  // 내 캐릭터: 클리어한 라운드 수만큼 성장한 이미지, 남은 턴이 체력바 역할
  const playerImg = Math.min(Math.max(0, round - 1), 10);
  const limit = turnLimit(round);
  const turnsLeft = Math.max(0, limit - turn + 1);
  const turnPct = (turnsLeft / limit) * 100;
  const turnColor = turnPct>50?"#60a5fa":turnPct>25?"#facc15":"#f87171";

  return (
    <div className={screenShake ? "screen-shake" : ""} style={{ minHeight:"100vh", background:"linear-gradient(135deg,#0f0c29,#302b63,#24243e)", display:"flex", flexDirection:"column", alignItems:"center", padding:"16px", fontFamily:"'Segoe UI',sans-serif", color:"#fff", overflowX:"hidden" }}>

      {/* 큰 타격 시 화면 번쩍임 */}
      {flashId > 0 && <div key={flashId} className="hit-flash" style={{ position:"fixed", inset:0, background:"#fff", pointerEvents:"none", zIndex:90 }} />}

      {/* 처치 배너 */}
      {killBanner && (
        <div className="kill-banner" style={{ position:"fixed", top:"40%", left:"50%", zIndex:95, pointerEvents:"none", whiteSpace:"nowrap", fontSize:"clamp(36px, 12vw, 64px)", fontWeight:900, color:killBanner.color, letterSpacing:2, textShadow:`0 0 24px ${killBanner.color}, 0 4px 0 rgba(0,0,0,0.6)` }}>
          {killBanner.text}
        </div>
      )}

      <div style={{ width:"100%", maxWidth:380, display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:10 }}>
        <button onClick={onQuit} style={{ background:"rgba(255,255,255,0.07)", border:"1px solid rgba(255,255,255,0.15)", borderRadius:10, color:"#9ca3af", padding:"5px 10px", cursor:"pointer", fontSize:12, whiteSpace:"nowrap", flexShrink:0 }}>🏠 메인</button>
        <div style={{ fontSize:"clamp(14px, 4.4vw, 18px)", fontWeight:"bold", color:"#c084fc", letterSpacing:1, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis", minWidth:0, padding:"0 4px" }}>✨ 수학 카드 배틀 ✨</div>
        <SoundButtons style={{ width:64, flexShrink:0, justifyContent:"flex-end" }} />
      </div>

      {/* Status bar */}
      <div style={{ display:"flex", gap:7, marginBottom:10, flexWrap:"wrap", justifyContent:"center" }}>
        <span style={{ background: diff.color+"44", border:`1px solid ${diff.color}`, borderRadius:20, padding:"3px 10px", fontSize:12 }}>{diff.emoji} {diff.label}</span>
        <span style={{ background:"#7c3aed", borderRadius:20, padding:"3px 10px", fontSize:12 }}>🏆 R{round}</span>
        <span style={{ background: hand.length>=maxSize?"#065f46":"#374151", borderRadius:20, padding:"3px 10px", fontSize:12 }}>🃏 {hand.length}/{maxSize}</span>
      </div>

      {/* 총점 (hover/click 시 라운드별 상세) */}
      {roundScores.length > 0 && (
        <div style={{ position:"relative", marginBottom:10 }}>
          <div
            onClick={() => setShowScoreDetail(v => !v)}
            onMouseEnter={() => setShowScoreDetail(true)}
            onMouseLeave={() => setShowScoreDetail(false)}
            style={{ background:"rgba(0,0,0,0.3)", borderRadius:20, padding:"5px 16px", fontSize:13, color:"#fbbf24", fontWeight:"bold", cursor:"pointer", border:"1px solid rgba(251,191,36,0.3)", userSelect:"none" }}
          >
            💰 TOTAL {totalScore.toFixed(2)}점 ▾
          </div>
          {showScoreDetail && (
            <div style={{ position:"absolute", top:"110%", left:"50%", transform:"translateX(-50%)", background:"rgba(15,12,41,0.97)", border:"1px solid rgba(255,255,255,0.15)", borderRadius:12, padding:"10px 14px", zIndex:50, minWidth:200, boxShadow:"0 8px 24px rgba(0,0,0,0.6)" }}>
              {roundScores.map((r,i) => (
                <div key={i} style={{ display:"flex", justifyContent:"space-between", gap:16, fontSize:12, padding:"3px 0", color: r.perfect&&r.allIn?"#fbbf24":r.perfect?"#4ade80":r.allIn?"#fb923c":"#d1d5db", borderBottom: i<roundScores.length-1?"1px solid rgba(255,255,255,0.06)":"none" }}>
                  <span>R{r.round}{r.perfect?" ✨":""}{r.allIn?" 🃏":""}</span>
                  <span style={{ fontWeight:"bold" }}>{r.score.toFixed(2)}점</span>
                </div>
              ))}
              <div style={{ borderTop:"1px solid rgba(255,255,255,0.2)", marginTop:6, paddingTop:6, display:"flex", justifyContent:"space-between", fontSize:13, color:"#fbbf24", fontWeight:"bold" }}>
                <span>TOTAL</span>
                <span>{totalScore.toFixed(2)}점</span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 대결: 내 캐릭터 VS 적 */}
      <div style={{ display:"flex", alignItems:"flex-end", gap:4, background:"rgba(255,255,255,0.05)", borderRadius:14, padding:"12px 12px 10px", marginBottom:10, width:"100%", maxWidth:340, border:"1px solid rgba(255,255,255,0.1)" }}>
        {/* 내 캐릭터 (클리어한 라운드만큼 성장) + 남은 턴 = 체력바 */}
        <div style={{ flex:1, minWidth:0, textAlign:"center" }}>
          <div style={{ height:110, display:"flex", alignItems:"flex-end", justifyContent:"center" }}>
            <div key={`p-${round}-${hitId}`} className={enemyHp<=0 ? "player-win" : hitId>0 ? "player-lunge" : ""}>
              <div className="bob">
                <img src={`/player/player${playerImg}.png`} alt="나" style={{ height:104, maxWidth:"100%", objectFit:"contain", display:"block" }} />
              </div>
            </div>
          </div>
          <div style={{ fontSize:13, fontWeight:"bold", margin:"4px 0 5px" }}>나 <span style={{ color:"#a78bfa", fontSize:11 }}>Lv.{round}</span></div>
          <StatBar pct={turnPct} color={turnColor} />
          <div style={{ fontSize:11, color: turnsLeft<=3 ? "#f87171" : "#d1d5db", fontWeight: turnsLeft<=3 ? "bold" : "normal" }}>⚡ 남은 턴 {turnsLeft}/{limit}</div>
        </div>

        <div style={{ alignSelf:"center", paddingBottom:40, textAlign:"center", flexShrink:0, width:30 }}>
          <div style={{ fontSize:18 }}>⚔️</div>
          <div style={{ fontSize:11, fontWeight:900, color:"#fbbf24", letterSpacing:1 }}>VS</div>
        </div>

        {/* 적 */}
        <div style={{ flex:1, minWidth:0, textAlign:"center", position:"relative" }}>
          <div style={{ height:110, display:"flex", alignItems:"flex-end", justifyContent:"center" }}>
            <div key={`${round}-${hitId}`} className={enemyHp<=0 ? "enemy-dying" : hitId>0 ? "enemy-hit" : ""}>
              <div className={enemyHp>0 ? "bob" : ""} style={{ animationDelay:"-1.2s" }}>
                <img src={enemy.img} alt={enemy.name} style={{ height:110, maxWidth:"100%", objectFit:"contain", display:"block" }} />
              </div>
            </div>
          </div>
          {dmgPops.map(p => (
            <div key={p.id} className="dmg-pop" style={{
              position:"absolute", top:24, left:"50%", pointerEvents:"none", whiteSpace:"nowrap", zIndex:2,
              fontSize: 24 + Math.min(p.ratio, 1) * 26, fontWeight:900,
              color: p.ratio>=0.5 ? "#fbbf24" : p.ratio>=0.25 ? "#fb923c" : "#fff",
              textShadow:"0 0 10px rgba(239,68,68,0.9), 0 3px 0 #000",
            }}>
              {p.ratio>=0.5 && "💥"}-{p.dmg}
            </div>
          ))}
          <div style={{ fontSize:13, fontWeight:"bold", margin:"4px 0 5px", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{enemy.name} <span style={{ color:"#a78bfa", fontSize:11 }}>Lv.{round}</span></div>
          <StatBar pct={hpPct} color={hpColor} />
          <div style={{ fontSize:11, color:"#d1d5db" }}>HP {enemyHp}/{enemyMaxHp}</div>
        </div>
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
        {hand.map((card, i)=>{
          const isSel = !!selected.find(c=>c.id===card.id);
          const isOp = card.type==="op";
          return (
            <div key={card.id} onClick={()=>onToggleCard(card)} className="card-in" style={{
              animationDelay: turn===1 ? `${i*60}ms` : "0ms",
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
          <button onClick={onAttack} disabled={!exprValue||exprValue<=0} className={exprValue&&exprValue>0 ? "ready-pulse" : ""} style={{
            padding:"10px 22px", fontSize:14, fontWeight:"bold", borderRadius:30, border:"none",
            cursor:exprValue&&exprValue>0?"pointer":"not-allowed",
            background:exprValue&&exprValue>0?"linear-gradient(135deg,#dc2626,#ef4444)":"rgba(255,255,255,0.1)",
            color:"#fff", boxShadow:exprValue&&exprValue>0?"0 4px 15px rgba(239,68,68,0.5)":"none",
          }}>⚔️ 공격! {exprValue&&exprValue>0?`(${exprValue})`:""}</button>
          <button onClick={onSkip} style={{
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

      {children}
    </div>
  );
}
