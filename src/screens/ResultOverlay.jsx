import { DIFFICULTIES, enemyMaxHpFor, turnLimit } from "../game/rules";
import { PASSIVES, ITEMS, COMBOS } from "../game/rewards";

// 보상 선택지 카드 1장
function RewardCard({ opt, passives, items, onPick }) {
  if (opt.kind === "combo") {
    const c = COMBOS[opt.key];
    return (
      <button onClick={() => onPick(opt)} style={{
        display:"flex", alignItems:"center", gap:10, width:"100%", textAlign:"left", padding:"10px 12px", marginBottom:7,
        borderRadius:12, border:"2px solid #fbbf24", background:"linear-gradient(135deg, rgba(251,191,36,0.22), rgba(168,85,247,0.22))",
        color:"#fff", cursor:"pointer", boxShadow:"0 0 14px rgba(251,191,36,0.45)",
      }}>
        <div style={{ fontSize:24, flexShrink:0 }}>{c.icon}</div>
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ fontSize:13, fontWeight:"bold", display:"flex", alignItems:"center", gap:6, flexWrap:"wrap" }}>
            {c.name}
            <span style={{ fontSize:10, color:"#fbbf24", border:"1px solid #fbbf24", borderRadius:8, padding:"0 5px" }}>✨ 조합</span>
          </div>
          <div style={{ fontSize:11, color:"#fde68a", marginTop:2 }}>{c.parts.map(p => PASSIVES[p].icon).join(" + ")} Lv5 → {c.desc}</div>
        </div>
      </button>
    );
  }
  const isPassive = opt.kind === "passive";
  const def = isPassive ? PASSIVES[opt.key] : ITEMS[opt.key];
  const badge = isPassive
    ? (opt.from === 0 ? { text:"NEW!", color:"#4ade80" } : { text:`Lv${opt.from} → Lv${opt.to}`, color:"#c084fc" })
    : { text:`+${opt.gain}개 (보유 ${items[opt.key]})`, color:"#fbbf24" };
  const desc = isPassive ? def.levels[opt.to - 1] : def.desc;
  return (
    <button onClick={() => onPick(opt)} style={{
      display:"flex", alignItems:"center", gap:10, width:"100%", textAlign:"left", padding:"9px 12px", marginBottom:7,
      borderRadius:12, border:`1.5px solid ${badge.color}88`, background:"rgba(0,0,0,0.32)", color:"#fff", cursor:"pointer",
    }}>
      <div style={{ fontSize:24, flexShrink:0 }}>{def.icon}</div>
      <div style={{ flex:1, minWidth:0 }}>
        <div style={{ fontSize:13, fontWeight:"bold", display:"flex", alignItems:"center", gap:6, flexWrap:"wrap" }}>
          {def.name}
          <span style={{ fontSize:10, color:badge.color, border:`1px solid ${badge.color}`, borderRadius:8, padding:"0 5px" }}>{badge.text}</span>
          {!isPassive && <span style={{ fontSize:10, color:"#9ca3af" }}>아이템</span>}
        </div>
        <div style={{ fontSize:11, color:"#d1d5db", marginTop:2 }}>{desc}</div>
      </div>
    </button>
  );
}

// 라운드 클리어(phase="result") / 게임오버(phase="gameover") 창
export default function ResultOverlay({
  phase, round, difficulty, score, totalScore,
  preRank, preRankLoading, finalRank,
  nickname, onNicknameChange, submitting, submitError, nicknameSubmitted, registrationSkipped,
  shareMsg, onSubmit, onSkipRegistration, onShare, onNextRound, onRetry, onGoMain,
  rewardOptions, rewardPicks = { left: 1, total: 1 }, passives, items, onPickReward, nextThresh,
}) {
  const registrationDecided = nicknameSubmitted || registrationSkipped;
  const total = score?.newTS ?? totalScore;

  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.82)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:100, padding:16, overflowY:"auto" }}>
      <div className="overlay-pop" style={{ background: phase==="gameover"?"linear-gradient(135deg,#3b0000,#7f1d1d)":"linear-gradient(135deg,#1e1b4b,#312e81)", borderRadius:20, padding:"26px 30px", textAlign:"center", border:`2px solid ${phase==="gameover"?"#ef4444":"#7c3aed"}`, maxWidth:320, width:"100%", margin:"auto" }}>

        {/* 헤더 */}
        {phase==="gameover"
          ? <>
              <div style={{ display:"flex", justifyContent:"center", marginBottom:6 }}>
                <img src={`/player/player${Math.min(Math.max(0, round-1), 10)}.png`} alt="player" style={{ height:"min(200px, 28vh)", width:"auto", maxWidth:"100%", objectFit:"contain" }} />
              </div>
              <div style={{ fontSize:19, fontWeight:"bold", marginBottom:4, color:"#f87171" }}>{score?.quit ? "게임 포기" : "게임 오버"}</div>
              <div style={{ fontSize:13, color:"#fca5a5", marginBottom:10 }}>
                {score?.quit ? `R${round}에서 포기 · R${round-1}까지 클리어`
                  : score?.turnLimitExceeded ? `R${round} 턴 초과 (${score?.limit ?? turnLimit(round)}턴)`
                  : `R${round} 라운드 점수가 기준 이하`}
              </div>
              {/* 기준 미달: 점수 계산식 */}
              {!score?.quit && !score?.turnLimitExceeded && (
                <div style={{ background:"rgba(0,0,0,0.35)", borderRadius:10, padding:"8px 14px", fontSize:12, lineHeight:1.9, marginBottom:12, textAlign:"left" }}>
                  <div>💥 최고 데미지 <strong style={{ color:"#fbbf24" }}>{score?.maxD}</strong> ÷ ⏱️ {score?.turnCount}턴 = <strong style={{ color:"#fff" }}>{score?.base}</strong></div>
                  {score?.perfect && <div style={{ color:"#4ade80" }}>✨ 퍼펙트 클리어! × 2</div>}
                  {score?.allIn && <div style={{ color:"#fb923c" }}>🃏 올 인! × 2</div>}
                  <div style={{ borderTop:"1px solid rgba(255,255,255,0.1)", marginTop:4, paddingTop:4 }}>
                    🏆 라운드 점수 <strong style={{ color:"#fca5a5", fontSize:15 }}>{score?.finalScore?.toFixed(2)}</strong> ≤ 🎯 기준 <strong style={{ color:"#fff", fontSize:15 }}>{score?.thresh}</strong>
                  </div>
                </div>
              )}
            </>
          : <>
              <img src={`/player/player${Math.min(round, 10)}.png`} alt="player" style={{ height: rewardOptions.length ? "min(110px, 14vh)" : "min(200px, 28vh)", width:"auto", maxWidth:"100%", objectFit:"contain", marginBottom:4 }} />
              <div style={{ fontSize:19, fontWeight:"bold", marginBottom:4, color:"#c084fc" }}>라운드 {round} 클리어!</div>
            </>
        }

        {/* 점수 요약 (result에만) */}
        {phase==="result" && (
          <div style={{ background:"rgba(0,0,0,0.35)", borderRadius:10, padding:"10px 14px", fontSize:12, lineHeight:2, marginBottom:12, textAlign:"left" }}>
            <div>⏱️ 클리어 턴: <strong style={{ color:"#fff" }}>{score?.turnCount}턴</strong></div>
            <div>💥 최고 데미지: <strong style={{ color:"#fbbf24" }}>{score?.maxD}</strong></div>
            <div style={{ borderTop:"1px solid rgba(255,255,255,0.1)", marginTop:4, paddingTop:4, color:"#9ca3af" }}>📊 점수 계산</div>
            <div>{score?.maxD} ÷ {score?.turnCount} = <strong style={{ color:"#fff" }}>{score?.base}</strong></div>
            {score?.perfect && <div style={{ color:"#4ade80" }}>✨ 퍼펙트 클리어! × 2</div>}
            {score?.allIn && <div style={{ color:"#fb923c" }}>🃏 올 인! × 2</div>}
            {(score?.multiplier ?? 1) >= 4 && <div style={{ color:"#fbbf24", fontWeight:"bold" }}>⚡ 콤보! × 4</div>}
            <div>🏆 라운드 점수: <strong style={{ color: (score?.multiplier??1)>=4?"#fbbf24":score?.allIn?"#fb923c":score?.perfect?"#4ade80":"#c084fc", fontSize:16 }}>{score?.finalScore?.toFixed(2)}</strong></div>
            <div style={{ borderTop:"1px solid rgba(255,255,255,0.1)", marginTop:4, paddingTop:4 }}>
              💰 최종 총점: <strong style={{ color:"#fbbf24", fontSize:16 }}>{score?.newTS?.toFixed(2)}점</strong>
            </div>
          </div>
        )}

        {/* 게임오버: 현재 순위 + 닉네임 등록 */}
        {phase==="gameover" && !registrationDecided && (score?.newTS ?? 0) > 0 && (
          <div style={{ marginBottom:12 }}>
            {/* 현재 순위 */}
            <div style={{ background:"rgba(0,0,0,0.3)", borderRadius:10, padding:"12px", marginBottom:12 }}>
              <div style={{ color:"#9ca3af", fontSize:12, marginBottom:4 }}>총점 {score?.newTS?.toFixed(2)}점의 현재 순위</div>
              {preRankLoading
                ? <div style={{ color:"#6b7280", fontSize:14 }}>순위 확인 중...</div>
                : <div style={{ fontSize:28, fontWeight:"bold", color: preRank<=3?"#fbbf24":preRank<=10?"#c084fc":"#fff" }}>
                    {DIFFICULTIES[difficulty].label} {preRank}위
                  </div>
              }
            </div>

            {/* 닉네임 입력 */}
            <div style={{ color:"#fbbf24", fontSize:13, fontWeight:"bold", marginBottom:8 }}>🏅 랭킹에 이름을 남기세요</div>
            <input
              value={nickname}
              onChange={e => onNicknameChange(e.target.value)}
              onKeyDown={e => e.key==="Enter" && onSubmit(total)}
              placeholder="닉네임 입력 (최대 12자)"
              maxLength={12}
              style={{ width:"100%", padding:"8px 12px", borderRadius:10, border:"1px solid rgba(255,255,255,0.2)", background:"rgba(255,255,255,0.08)", color:"#fff", fontSize:14, outline:"none", marginBottom:8, boxSizing:"border-box" }}
            />
            <div style={{ display:"flex", gap:8 }}>
              <button onClick={() => onSubmit(total)} disabled={!nickname.trim() || submitting} style={{
                flex:1, padding:"10px 0", borderRadius:20, border:"none",
                background: nickname.trim()&&!submitting ? "linear-gradient(135deg,#d97706,#f59e0b)" : "rgba(255,255,255,0.1)",
                color:"#fff", fontSize:13, fontWeight:"bold", cursor: nickname.trim()&&!submitting ? "pointer":"not-allowed",
              }}>
                {submitting ? "등록 중..." : "🏅 등록"}
              </button>
              <button onClick={onSkipRegistration} style={{
                flex:1, padding:"10px 0", borderRadius:20, border:"1px solid rgba(255,255,255,0.2)",
                background:"rgba(255,255,255,0.07)", color:"#9ca3af", fontSize:13, fontWeight:"bold", cursor:"pointer",
              }}>
                등록 안하기
              </button>
            </div>
            {submitError && (
              <div style={{ marginTop:8, color:"#f87171", fontSize:12, padding:"8px", background:"rgba(239,68,68,0.1)", borderRadius:8 }}>{submitError}</div>
            )}
          </div>
        )}

        {/* 게임오버: 등록 완료 후 순위 표시 */}
        {phase==="gameover" && nicknameSubmitted && (
          <div style={{ marginBottom:16 }}>
            {finalRank
              ? <div style={{ padding:"12px", background:"rgba(0,0,0,0.3)", borderRadius:12 }}>
                  <div style={{ color:"#9ca3af", fontSize:12, marginBottom:4 }}>내 최종 순위</div>
                  <div style={{ fontSize:32, fontWeight:"bold", color: finalRank<=3?"#fbbf24":finalRank<=10?"#c084fc":"#fff" }}>{finalRank}위</div>
                  <div style={{ color:"#6b7280", fontSize:12, marginTop:4 }}>{nickname} · {score?.newTS?.toFixed(2)}점</div>
                </div>
              : <div style={{ color:"#9ca3af", fontSize:13 }}>랭킹 등록 완료!</div>
            }
          </div>
        )}

        {/* 등록 안하기 선택 시 */}
        {phase==="gameover" && registrationSkipped && (
          <div style={{ marginBottom:16, color:"#6b7280", fontSize:13 }}>등록하지 않았습니다</div>
        )}

        {/* 다음 라운드 / 메인·재시작 버튼 */}
        {phase==="result" && (
          <>
            <div style={{ fontSize:11, color:"#6b7280", marginBottom:12 }}>
              다음 기준: {nextThresh}점 · 적 HP: {enemyMaxHpFor(round+1, difficulty)}
            </div>
            {rewardOptions.length > 0
              ? <>
                  <div style={{ fontSize:14, fontWeight:"bold", color:"#fbbf24", marginBottom:8 }}>
                    {rewardPicks.total > 1
                      ? `🎁 마왕 처치 보상! 하나 고르세요 (${rewardPicks.total - rewardPicks.left + 1}/${rewardPicks.total})`
                      : "🎁 보상을 하나 고르세요"}
                  </div>
                  {rewardOptions.map(opt => <RewardCard key={opt.kind + opt.key} opt={opt} passives={passives} items={items} onPick={onPickReward} />)}
                </>
              : <button onClick={onNextRound} style={{ padding:"10px 24px", borderRadius:20, border:"none", background:"linear-gradient(135deg,#7c3aed,#a855f7)", color:"#fff", fontSize:14, fontWeight:"bold", cursor:"pointer" }}>다음 라운드 →</button>
            }
          </>
        )}

        {phase==="gameover" && registrationDecided && (score?.newTS ?? 0) > 0 && (
          <div style={{ marginBottom:10 }}>
            <button onClick={onShare} style={{ width:"100%", padding:"11px 0", borderRadius:20, border:"none", background:"linear-gradient(135deg,#7c3aed,#c084fc)", color:"#fff", fontSize:14, fontWeight:"bold", cursor:"pointer", boxShadow:"0 4px 15px rgba(168,85,247,0.45)" }}>📤 친구에게 자랑하기</button>
            {shareMsg && <div className="result-pop" style={{ marginTop:8, fontSize:12, color:"#c4b5fd" }}>{shareMsg}</div>}
          </div>
        )}

        {phase==="gameover" && (registrationDecided || (score?.newTS ?? 0) <= 0) && (
          <div style={{ display:"flex", gap:10, justifyContent:"center" }}>
            <button onClick={onRetry} style={{ padding:"10px 18px", borderRadius:20, border:"none", background:"linear-gradient(135deg,#dc2626,#ef4444)", color:"#fff", fontSize:13, fontWeight:"bold", cursor:"pointer" }}>🔄 재도전</button>
            <button onClick={onGoMain} style={{ padding:"10px 18px", borderRadius:20, border:"2px solid rgba(255,255,255,0.2)", background:"transparent", color:"#fff", fontSize:13, fontWeight:"bold", cursor:"pointer" }}>🏠 메인으로</button>
          </div>
        )}
      </div>
    </div>
  );
}
