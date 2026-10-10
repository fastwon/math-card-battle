import { useState } from "react";
import { DIFFICULTIES } from "../game/rules";
import FloatingCards from "../components/FloatingCards";
import HeroDemo from "../components/HeroDemo";
import SoundButtons from "../components/SoundButtons";
import DiffTabs from "../components/DiffTabs";
import RankRow from "../components/RankRow";
import RulesPopup from "../components/RulesPopup";

export default function MainScreen({ top10, top10Tab, onTop10Tab, onStart, onOpenRankings }) {
  const [showRules, setShowRules] = useState(false);

  return (
    <div style={{ position:"relative", minHeight:"100vh", background:"linear-gradient(135deg,#0f0c29,#302b63,#24243e)", fontFamily:"'Segoe UI',sans-serif", color:"#fff", overflowX:"hidden" }}>
      <FloatingCards />
      <div style={{ position:"relative", zIndex:1, display:"flex", flexDirection:"column", alignItems:"center", padding:"16px 16px 28px" }}>

      {/* 상단 바: 규칙 / 음소거 */}
      <div style={{ width:"100%", maxWidth:340, display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:12 }}>
        <button onClick={()=>setShowRules(true)} style={{ height:28, padding:"0 12px", borderRadius:10, border:"1px solid rgba(192,132,252,0.5)", background:"rgba(192,132,252,0.15)", color:"#c084fc", fontSize:12, fontWeight:"bold", cursor:"pointer" }}>📖 게임 규칙</button>
        <SoundButtons />
      </div>

      {/* 타이틀 */}
      <div style={{ display:"flex", alignItems:"center", gap:6, marginBottom:4 }}>
        <span className="bob" style={{ fontSize:"clamp(20px, 6vw, 26px)" }}>✨</span>
        <h1 className="title-shine" style={{
          fontSize:"clamp(28px, 9vw, 38px)", fontWeight:900, letterSpacing:2, whiteSpace:"nowrap",
          background:"linear-gradient(90deg,#c084fc,#f0abfc,#fbbf24,#f0abfc,#c084fc)", backgroundSize:"200% auto",
          WebkitBackgroundClip:"text", backgroundClip:"text", color:"transparent",
          filter:"drop-shadow(0 2px 8px rgba(192,132,252,0.5))",
        }}>수학 카드 배틀</h1>
        <span className="bob" style={{ fontSize:"clamp(20px, 6vw, 26px)", animationDelay:"-1.2s" }}>✨</span>
      </div>
      <div style={{ color:"#d1d5db", fontSize:13, marginBottom:14, textAlign:"center" }}>
        카드로 <strong style={{ color:"#4ade80" }}>수식</strong>을 만들어 몬스터를 쓰러뜨려라!
      </div>

      <HeroDemo />

      {/* 난이도 선택 */}
      <div style={{ color:"#9ca3af", fontSize:12, marginBottom:8 }}>▼ 난이도를 골라 바로 시작 ▼</div>
      <div style={{ display:"flex", gap:8, width:"100%", maxWidth:340 }}>
        {Object.entries(DIFFICULTIES).map(([key, d]) => (
          <button key={key} onClick={()=>onStart(key)} style={{
            flex:1, minWidth:0, padding:"12px 4px", borderRadius:14, border:`2px solid ${d.color}`,
            background:`linear-gradient(180deg, ${d.color}33, rgba(0,0,0,0.35))`, color:"#fff", cursor:"pointer",
            boxShadow:`0 4px 14px ${d.color}44`, transition:"transform 0.15s, background 0.2s",
          }}
          onMouseOver={e=>e.currentTarget.style.background=`${d.color}55`}
          onMouseOut={e=>e.currentTarget.style.background=`linear-gradient(180deg, ${d.color}33, rgba(0,0,0,0.35))`}
          onPointerDown={e=>e.currentTarget.style.transform="scale(0.95)"}
          onPointerUp={e=>e.currentTarget.style.transform="none"}
          onPointerLeave={e=>e.currentTarget.style.transform="none"}
          >
            <div style={{ fontSize:26, marginBottom:2 }}>{d.emoji}</div>
            <div style={{ color:"#fff", fontSize:16, fontWeight:"bold" }}>{d.label}</div>
            <div style={{ fontSize:10, color:"#d1d5db", marginTop:3, whiteSpace:"nowrap" }}>
              {key==="easy" ? "기준 R×2점" : key==="normal" ? "기준 R×4점" : "기준 R²+2R점"}
            </div>
          </button>
        ))}
      </div>

      {/* TOP 10 */}
      <div style={{ marginTop:20, width:"100%", maxWidth:340, background:"rgba(0,0,0,0.3)", borderRadius:14, padding:"14px 16px", border:"1px solid rgba(255,255,255,0.1)" }}>
        <div style={{ color:"#fbbf24", fontWeight:"bold", marginBottom:10, fontSize:14 }}>🏅 TOP 10</div>
        <DiffTabs active={top10Tab} onChange={onTop10Tab} />
        <div style={{ display:"flex", flexDirection:"column", gap:2 }}>
          {top10.length > 0
            ? top10.map((r, i) => <RankRow key={r.id} rank={i+1} entry={r} />)
            : <div style={{ color:"#6b7280", fontSize:12, textAlign:"center", padding:"12px 0" }}>아직 기록이 없습니다</div>
          }
        </div>
        <button onClick={onOpenRankings} style={{
          marginTop:12, width:"100%", padding:"8px 0", borderRadius:10,
          border:"1px solid rgba(192,132,252,0.4)", background:"rgba(192,132,252,0.1)",
          color:"#c084fc", fontSize:13, fontWeight:"bold", cursor:"pointer",
        }}>전체 랭킹 보기 →</button>
      </div>

      </div>

      {showRules && <RulesPopup onClose={()=>setShowRules(false)} />}
    </div>
  );
}
