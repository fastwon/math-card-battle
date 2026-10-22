import { useEffect, useState } from "react";
import { DIFFICULTIES } from "../game/rules";
import { fetchRankings, CURRENT_SEASON } from "../game/ranking";

const SEEN_KEY = "mcb_season_notice";
const PREV_SEASON = CURRENT_SEASON - 1;

// 이번 시즌 안내를 아직 안 봤으면 true (저장소를 못 쓰면 매번 보여줌)
export function shouldShowSeasonNotice() {
  try { return localStorage.getItem(SEEN_KEY) !== String(CURRENT_SEASON); } catch { return true; }
}

export default function SeasonNotice({ onClose, onOpenRankings }) {
  // 지난 시즌 난이도별 1위
  const [champs, setChamps] = useState(null);
  useEffect(() => {
    let alive = true;
    Promise.all(Object.keys(DIFFICULTIES).map(d => fetchRankings(d, 1, "", PREV_SEASON)))
      .then(res => { if (alive) setChamps(res.map(r => r.data?.[0] ?? null)); })
      .catch(() => { if (alive) setChamps([]); });
    return () => { alive = false; };
  }, []);

  function close(next) {
    try { localStorage.setItem(SEEN_KEY, String(CURRENT_SEASON)); } catch { /* 무시 */ }
    onClose();
    if (next) next();
  }

  const hasChamps = champs && champs.some(Boolean);

  return (
    // 바깥을 눌러도 닫히지 않음: 실수로 닫혀 못 읽는 일 방지 (아래 버튼으로만 닫기)
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.8)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:200, padding:16 }}>
      <div className="overlay-pop" style={{ background:"linear-gradient(135deg,#1e1b4b,#312e81)", borderRadius:20, padding:"22px 20px", border:"2px solid rgba(251,191,36,0.5)", boxShadow:"0 0 40px rgba(251,191,36,0.25)", maxWidth:360, width:"100%", maxHeight:"85vh", overflowY:"auto", color:"#fff", textAlign:"center" }}>
        <div style={{ fontSize:36, marginBottom:4 }}>🎉</div>
        <div className="title-shine" style={{
          fontSize:24, fontWeight:900, marginBottom:6,
          background:"linear-gradient(90deg,#fbbf24,#f0abfc,#c084fc,#f0abfc,#fbbf24)", backgroundSize:"200% auto",
          WebkitBackgroundClip:"text", backgroundClip:"text", color:"transparent",
        }}>시즌 {CURRENT_SEASON} 개막!</div>
        <div style={{ color:"#d1d5db", fontSize:13, lineHeight:1.6, marginBottom:14 }}>
          시즌 {PREV_SEASON} 랭킹이 마감되었어요.<br />
          이번 시즌 랭킹은 <strong style={{ color:"#4ade80" }}>처음부터 새로</strong> 시작합니다!
        </div>

        {hasChamps && (
          <div style={{ background:"rgba(0,0,0,0.3)", borderRadius:12, padding:"10px 12px", marginBottom:12, border:"1px solid rgba(251,191,36,0.25)", textAlign:"left" }}>
            <div style={{ color:"#fbbf24", fontWeight:"bold", fontSize:13, marginBottom:6, textAlign:"center" }}>🏆 시즌 {PREV_SEASON} 챔피언</div>
            {Object.entries(DIFFICULTIES).map(([key, d], i) => champs[i] && (
              <div key={key} style={{ display:"flex", alignItems:"center", gap:8, fontSize:13, padding:"3px 0" }}>
                <span style={{ color:d.color, fontWeight:"bold", flexShrink:0, width:58 }}>{d.emoji} {d.label}</span>
                <span style={{ flex:1, minWidth:0, fontWeight:"bold", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{champs[i].nickname}</span>
                <span style={{ color:"#a78bfa", fontSize:12, flexShrink:0 }}>R{champs[i].round}</span>
              </div>
            ))}
          </div>
        )}

        <div style={{ background:"rgba(192,132,252,0.1)", borderRadius:12, padding:"10px 12px", marginBottom:16, border:"1px solid rgba(192,132,252,0.25)", textAlign:"left", fontSize:12, color:"#d1d5db", lineHeight:1.8 }}>
          <div style={{ color:"#c084fc", fontWeight:"bold", fontSize:13, marginBottom:2 }}>✨ 시즌 {CURRENT_SEASON} 새 소식</div>
          <div>• 새 패시브 <strong style={{ color:"#fff" }}>🧱 철벽</strong> · <strong style={{ color:"#fff" }}>🗡️ 반격</strong> 추가</div>
          <div>• 시즌 {PREV_SEASON} 기록은 <strong style={{ color:"#fff" }}>전체 랭킹 → 시즌 {PREV_SEASON}</strong>에서 볼 수 있어요</div>
        </div>

        <div style={{ display:"flex", gap:8 }}>
          <button onClick={() => close(() => onOpenRankings(PREV_SEASON))} style={{ flex:1, padding:"10px 0", borderRadius:12, border:"1px solid rgba(192,132,252,0.5)", background:"rgba(192,132,252,0.12)", color:"#c084fc", fontSize:13, fontWeight:"bold", cursor:"pointer" }}>지난 시즌 랭킹</button>
          <button onClick={() => close()} style={{ flex:1, padding:"10px 0", borderRadius:12, border:"none", background:"linear-gradient(135deg,#7c3aed,#c026d3)", color:"#fff", fontSize:14, fontWeight:"bold", cursor:"pointer" }}>시작하기!</button>
        </div>
      </div>
    </div>
  );
}
