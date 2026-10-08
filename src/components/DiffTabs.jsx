import { DIFFICULTIES } from "../game/rules";

export default function DiffTabs({ active, onChange }) {
  return (
    <div style={{ display:"flex", gap:4, marginBottom:12 }}>
      {Object.entries(DIFFICULTIES).map(([key, d]) => (
        <button key={key} onClick={() => onChange(key)} style={{
          flex:1, padding:"7px 0", borderRadius:8, border:"none",
          background: active===key ? d.color : "rgba(255,255,255,0.07)",
          color: active===key ? "#fff" : "#9ca3af",
          fontWeight:"bold", fontSize:12, cursor:"pointer", transition:"all 0.2s",
        }}>
          {d.emoji} {d.label}
        </button>
      ))}
    </div>
  );
}
