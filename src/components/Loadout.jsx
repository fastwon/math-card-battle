import { useState } from "react";
import { PASSIVES, PASSIVE_SLOTS, PASSIVE_MAX_LV, ITEMS } from "../game/rewards";

// 보유 패시브 3칸 (레벨 점 표시). 누르면 현재 효과 설명
export function PassiveBar({ passives }) {
  const [open, setOpen] = useState(null);
  const owned = Object.keys(passives).filter(k => passives[k] > 0);
  const slots = [...owned, ...Array(Math.max(0, PASSIVE_SLOTS - owned.length)).fill(null)];
  const info = open && passives[open] ? PASSIVES[open] : null;

  return (
    <div style={{ width:"100%", maxWidth:340, marginBottom:8 }}>
      <div style={{ display:"flex", gap:6 }}>
        {slots.map((key, i) => key ? (
          <button key={key} onClick={() => setOpen(open === key ? null : key)} style={{
            flex:1, minWidth:0, padding:"4px 0", borderRadius:10, cursor:"pointer", color:"#fff",
            border:`1px solid ${open === key ? "#c084fc" : "rgba(192,132,252,0.35)"}`, background:"rgba(124,58,237,0.18)",
          }}>
            <span style={{ fontSize:15 }}>{PASSIVES[key].icon}</span>
            <span style={{ fontSize:8, letterSpacing:1, marginLeft:4, color:"#c4b5fd" }}>
              {"●".repeat(passives[key])}<span style={{ opacity:0.3 }}>{"●".repeat(PASSIVE_MAX_LV - passives[key])}</span>
            </span>
          </button>
        ) : (
          <div key={`empty-${i}`} style={{ flex:1, borderRadius:10, border:"1px dashed rgba(255,255,255,0.15)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:10, color:"#6b7280", minHeight:30 }}>빈 칸</div>
        ))}
      </div>
      {info && (
        <div style={{ marginTop:5, fontSize:11, color:"#ddd6fe", textAlign:"center" }}>
          {info.icon} {info.name} Lv{passives[open]} · {info.levels[passives[open] - 1]}
        </div>
      )}
    </div>
  );
}

// 보유 아이템 버튼 (아이콘 옆 개수) + 부활 표시
export function ItemBar({ items, itemMode, onUse, disabled }) {
  const keys = Object.keys(ITEMS).filter(k => items[k] > 0);
  if (!keys.length && !items.revive) return null;
  return (
    <div style={{ display:"flex", gap:6, justifyContent:"center", flexWrap:"wrap", marginBottom:8 }}>
      {keys.map(key => {
        const active = itemMode?.type === key;
        return (
          <button key={key} onClick={() => onUse(key)} disabled={disabled} title={`${ITEMS[key].name}: ${ITEMS[key].desc}`} style={{
            padding:"5px 11px", borderRadius:16, cursor: disabled ? "not-allowed" : "pointer", color:"#fff", fontSize:13, fontWeight:"bold",
            border:`1.5px solid ${active ? "#fbbf24" : "rgba(251,191,36,0.4)"}`,
            background: active ? "rgba(251,191,36,0.3)" : "rgba(251,191,36,0.1)",
            boxShadow: active ? "0 0 10px rgba(251,191,36,0.5)" : "none", opacity: disabled ? 0.5 : 1,
          }}>
            {ITEMS[key].icon} <span style={{ fontSize:12 }}>{items[key]}</span>
          </button>
        );
      })}
      {items.revive > 0 && (
        <span title="부활: 게임오버 시 자동으로 그 라운드 재도전" style={{ padding:"5px 11px", borderRadius:16, fontSize:13, fontWeight:"bold", border:"1.5px solid rgba(244,114,182,0.6)", background:"rgba(244,114,182,0.15)" }}>
          💖 <span style={{ fontSize:12 }}>{items.revive}</span>
        </span>
      )}
    </div>
  );
}

const PEN_VALUES = [1, 2, 3, 4, 5, 6, 7, 8, 9, "+", "-", "×", "÷"];

// 아이템 사용 중 안내 + (마법 펜) 값 선택판
export function ItemPanel({ itemMode, onPenValue, onCancel }) {
  const guide =
    itemMode.type === "pen" ? (itemMode.cardId ? "✏️ 바꿀 값을 고르세요" : "✏️ 바꿀 카드를 고르세요")
    : itemMode.targetId ? "🪞 따라 할 카드를 고르세요" : "🪞 바꿀 카드를 고르세요";

  return (
    <div style={{ width:"100%", maxWidth:340, background:"rgba(251,191,36,0.08)", border:"1px solid rgba(251,191,36,0.4)", borderRadius:12, padding:"8px 10px", marginBottom:8, textAlign:"center" }}>
      <div style={{ fontSize:13, fontWeight:"bold", color:"#fde68a", marginBottom: itemMode.type === "pen" && itemMode.cardId ? 8 : 6 }}>{guide}</div>
      {itemMode.type === "pen" && itemMode.cardId && (
        <div style={{ display:"grid", gridTemplateColumns:"repeat(9, 1fr)", gap:4, marginBottom:8 }}>
          {PEN_VALUES.map(v => {
            const isOp = typeof v !== "number";
            return (
              <button key={v} onClick={() => onPenValue(v)} style={{
                gridColumn: isOp && v === "+" ? "3 / span 1" : undefined,
                height:32, borderRadius:7, border:"1.5px solid rgba(255,255,255,0.35)", cursor:"pointer", color:"#fff", fontWeight:"bold", fontSize:15,
                background: isOp ? "linear-gradient(135deg,#4c1d95,#6d28d9)" : "linear-gradient(135deg,#1e3a8a,#1d4ed8)",
              }}>{v}</button>
            );
          })}
        </div>
      )}
      <button onClick={onCancel} style={{ padding:"4px 16px", borderRadius:14, border:"1px solid rgba(255,255,255,0.25)", background:"rgba(255,255,255,0.07)", color:"#d1d5db", fontSize:12, cursor:"pointer" }}>취소</button>
    </div>
  );
}
