import DiffTabs from "../components/DiffTabs";
import RankRow from "../components/RankRow";
import { SEASONS, CURRENT_SEASON } from "../game/ranking";

function SeasonTabs({ active, onChange }) {
  return (
    <div style={{ display:"flex", gap:6, marginBottom:10, overflowX:"auto" }}>
      {SEASONS.map(s => {
        const on = s === active, live = s === CURRENT_SEASON;
        return (
          <button key={s} onClick={() => onChange(s)} style={{
            flexShrink:0, padding:"6px 12px", borderRadius:999, cursor:"pointer", fontSize:12, fontWeight:"bold",
            border: on ? "1px solid #c084fc" : "1px solid rgba(255,255,255,0.15)",
            background: on ? "rgba(192,132,252,0.25)" : "rgba(255,255,255,0.05)",
            color: on ? "#fff" : "#9ca3af",
          }}>
            시즌 {s} <span style={{ fontSize:10, fontWeight:"normal", color: live ? "#4ade80" : "#9ca3af" }}>{live ? "● 진행 중" : "종료"}</span>
          </button>
        );
      })}
    </div>
  );
}

export default function RankingScreen({ tab, onTab, season, onSeason, query, onSearch, rankings, loading, error, onBack }) {
  return (
    <div style={{ minHeight:"100vh", background:"linear-gradient(135deg,#0f0c29,#302b63,#24243e)", display:"flex", flexDirection:"column", alignItems:"center", padding:"24px 16px", fontFamily:"'Segoe UI',sans-serif", color:"#fff" }}>
      <div style={{ width:"100%", maxWidth:400 }}>
        <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:20 }}>
          <button onClick={onBack} style={{ background:"rgba(255,255,255,0.08)", border:"1px solid rgba(255,255,255,0.15)", borderRadius:10, color:"#fff", padding:"6px 14px", cursor:"pointer", fontSize:13 }}>← 뒤로</button>
          <div style={{ fontSize:18, fontWeight:"bold", color:"#c084fc" }}>🏅 전체 랭킹</div>
        </div>

        <SeasonTabs active={season} onChange={onSeason} />
        {season !== CURRENT_SEASON && (
          <div style={{ fontSize:12, color:"#fbbf24", marginBottom:10, padding:"8px 12px", background:"rgba(251,191,36,0.08)", borderRadius:10, border:"1px solid rgba(251,191,36,0.25)" }}>
            🏁 시즌 {season} 최종 순위 (종료된 시즌)
          </div>
        )}

        <DiffTabs active={tab} onChange={onTab} />

        <input
          value={query}
          onChange={e => onSearch(e.target.value)}
          placeholder="닉네임 검색..."
          style={{ width:"100%", padding:"10px 14px", borderRadius:12, border:"1px solid rgba(255,255,255,0.2)", background:"rgba(255,255,255,0.08)", color:"#fff", fontSize:14, outline:"none", marginBottom:12, boxSizing:"border-box" }}
        />

        {error
          ? <div style={{ color:"#f87171", fontSize:13, marginBottom:10, padding:"10px 14px", background:"rgba(239,68,68,0.1)", borderRadius:10, border:"1px solid rgba(239,68,68,0.3)" }}>{error}</div>
          : <div style={{ fontSize:12, color:"#6b7280", marginBottom:10 }}>{loading ? "검색 중..." : `${rankings.length}명 표시 중 (최대 100명)`}</div>
        }

        <div style={{ display:"flex", flexDirection:"column", gap:4 }}>
          {rankings.map((entry, i) => (
            <RankRow key={entry.id} rank={i+1} entry={entry} />
          ))}
          {rankings.length === 0 && !loading && !error && (
            <div style={{ color:"#6b7280", textAlign:"center", padding:"40px 0" }}>검색 결과가 없습니다</div>
          )}
        </div>
      </div>
    </div>
  );
}
