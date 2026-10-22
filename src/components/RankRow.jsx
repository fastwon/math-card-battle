import { PASSIVES, COMBOS } from "../game/rewards";

const rankColor = i => i===0?"#fbbf24":i===1?"#d1d5db":i===2?"#cd7f32":"#9ca3af";

const iconBase = { fontSize:11, width:18, height:18, display:"inline-flex", alignItems:"center", justifyContent:"center", borderRadius:6, flexShrink:0 };
const comboStyle = { ...iconBase, background:"linear-gradient(135deg, rgba(251,191,36,0.35), rgba(168,85,247,0.35))", border:"1px solid #fbbf24", boxShadow:"0 0 5px rgba(251,191,36,0.5)" };
const passiveStyle = { ...iconBase, background:"rgba(124,58,237,0.25)", border:"1px solid rgba(192,132,252,0.35)" };

// 최종 조합·패시브 아이콘. 이름(title 등)은 일부러 보여주지 않음
function LoadoutIcons({ loadout }) {
  if (!loadout) return null;
  const keys = loadout.split(",").filter(k => COMBOS[k] || PASSIVES[k]);
  if (!keys.length) return null;
  return (
    <span style={{ display:"inline-flex", gap:2, flexShrink:0 }}>
      {keys.map(k => COMBOS[k]
        ? <span key={k} style={comboStyle}>{COMBOS[k].icon}</span>
        : <span key={k} style={passiveStyle}>{PASSIVES[k].icon}</span>)}
    </span>
  );
}

export default function RankRow({ rank, entry }) {
  return (
    <div style={{ display:"flex", alignItems:"center", gap:8, padding:"6px 8px", borderRadius:8 }}>
      <span style={{ color: rankColor(rank-1), fontWeight:"bold", width:32, fontSize:13, flexShrink:0 }}>{rank}등</span>
      {/* 닉네임이 길면 닉네임만 줄이고 아이콘은 항상 보이게 */}
      <span style={{ flex:1, minWidth:0, display:"flex", alignItems:"center", gap:4 }}>
        <span style={{ color:"#fff", fontWeight:"bold", fontSize:13, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap", minWidth:0 }}>{entry.nickname}</span>
        <LoadoutIcons loadout={entry.loadout} />
      </span>
      <span style={{ color:"#a78bfa", fontSize:12, whiteSpace:"nowrap" }}>R{entry.round}</span>
      <span style={{ color:"#fbbf24", fontWeight:"bold", fontSize:13, whiteSpace:"nowrap" }}>{entry.score}점</span>
    </div>
  );
}
