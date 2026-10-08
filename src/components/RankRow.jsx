const rankColor = i => i===0?"#fbbf24":i===1?"#d1d5db":i===2?"#cd7f32":"#9ca3af";

export default function RankRow({ rank, entry }) {
  return (
    <div style={{ display:"flex", alignItems:"center", gap:8, padding:"6px 8px", borderRadius:8 }}>
      <span style={{ color: rankColor(rank-1), fontWeight:"bold", width:32, fontSize:13 }}>{rank}등</span>
      <span style={{ flex:1, color:"#fff", fontWeight:"bold", fontSize:13, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{entry.nickname}</span>
      <span style={{ color:"#a78bfa", fontSize:12, whiteSpace:"nowrap" }}>R{entry.round}</span>
      <span style={{ color:"#fbbf24", fontWeight:"bold", fontSize:13, whiteSpace:"nowrap" }}>{entry.score}점</span>
    </div>
  );
}
