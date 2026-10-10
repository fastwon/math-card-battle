import { useState } from "react";
import { PASSIVES, PASSIVE_SLOTS, PASSIVE_MAX_LV, ITEMS, COMBOS } from "../game/rewards";

// 보유 패시브 3칸 (레벨 점 표시). 누르면 현재 효과 설명
export function PassiveBar({ passives, combos = {} }) {
  const [open, setOpen] = useState(null);
  const owned = Object.keys(passives).filter(k => passives[k] > 0);
  const ownedCombos = Object.keys(COMBOS).filter(k => combos[k]);
  // 칸 3개: 조합(금색) → 패시브 → 빈 칸
  const slots = [...ownedCombos.map(k => ({ combo: k })), ...owned.map(k => ({ passive: k })),
    ...Array(Math.max(0, PASSIVE_SLOTS - ownedCombos.length - owned.length)).fill(null)];
  const info = open && passives[open] ? PASSIVES[open] : null;
  const comboInfo = open && combos[open] ? COMBOS[open] : null;

  return (
    <div style={{ width:"100%", maxWidth:340, marginBottom:8 }}>
      <div style={{ display:"flex", gap:6 }}>
        {slots.map((slot, i) => slot?.combo ? (
          <button key={slot.combo} onClick={() => setOpen(open === slot.combo ? null : slot.combo)} style={{
            flex:1, minWidth:0, padding:"4px 0", borderRadius:10, cursor:"pointer", color:"#fde68a", fontSize:11, fontWeight:"bold", whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis",
            border:`1px solid ${open === slot.combo ? "#fbbf24" : "rgba(251,191,36,0.6)"}`, background:"linear-gradient(135deg, rgba(251,191,36,0.25), rgba(168,85,247,0.25))",
            boxShadow:"0 0 8px rgba(251,191,36,0.35)",
          }}>
            {COMBOS[slot.combo].icon} {COMBOS[slot.combo].name}
          </button>
        ) : slot?.passive ? (() => { const key = slot.passive; return (
          <button key={key} onClick={() => setOpen(open === key ? null : key)} style={{
            flex:1, minWidth:0, padding:"4px 0", borderRadius:10, cursor:"pointer", color:"#fff",
            border:`1px solid ${open === key ? "#c084fc" : "rgba(192,132,252,0.35)"}`, background:"rgba(124,58,237,0.18)",
          }}>
            <span style={{ fontSize:15 }}>{PASSIVES[key].icon}</span>
            <span style={{ fontSize:8, letterSpacing:1, marginLeft:4, color:"#c4b5fd" }}>
              {"●".repeat(passives[key])}<span style={{ opacity:0.3 }}>{"●".repeat(PASSIVE_MAX_LV - passives[key])}</span>
            </span>
          </button>
        ); })() : (
          <div key={`empty-${i}`} style={{ flex:1, borderRadius:10, border:"1px dashed rgba(255,255,255,0.15)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:10, color:"#6b7280", minHeight:30 }}>빈 칸</div>
        ))}
      </div>
      {info && (
        <div style={{ marginTop:5, fontSize:11, color:"#ddd6fe", textAlign:"center" }}>
          {info.icon} {info.name} Lv{passives[open]} · {info.levels[passives[open] - 1]}
        </div>
      )}
      {comboInfo && (
        <div style={{ marginTop:5, fontSize:11, color:"#fde68a", lineHeight:1.6, background:"rgba(0,0,0,0.35)", border:"1px solid rgba(251,191,36,0.4)", borderRadius:10, padding:"6px 10px" }}>
          <div style={{ fontWeight:"bold" }}>{comboInfo.icon} {comboInfo.name} (조합)</div>
          {comboInfo.parts.map(p => (
            <div key={p} style={{ color:"#ddd6fe" }}>{PASSIVES[p].icon} {PASSIVES[p].name} Lv{PASSIVE_MAX_LV} · {PASSIVES[p].levels[PASSIVE_MAX_LV - 1]}</div>
          ))}
          <div>✨ 새 능력 · {comboInfo.desc}</div>
        </div>
      )}
    </div>
  );
}

// 부활은 직접 쓰는 아이템이 아니라 설명만 보여줌
const REVIVE_INFO = { icon:"💖", name:"부활", desc:"게임오버(기준 미달·턴 초과) 때 자동으로 사용되어 그 라운드를 처음부터 다시 도전합니다. 최대 1개." };
const SHIELD_INFO = { icon:"🛡️", name:"방패", desc:"다음 적 공격(파괴·봉인)을 한 번 자동으로 막아 줍니다. 최대 1개." };
const itemDef = key => key === "revive" ? REVIVE_INFO : key === "shield" ? SHIELD_INFO : ITEMS[key];
const PASSIVE_ONLY = new Set(["revive", "shield"]); // 직접 쓰지 않고 자동으로 발동하는 것

// 보유 아이템 버튼 (아이콘 옆 개수). 누르면 바로 쓰지 않고 설명(ItemInfo)을 엶
export function ItemBar({ items, itemMode, infoKey, onInfo }) {
  const keys = [...Object.keys(ITEMS), "revive", "shield"].filter(k => items[k] > 0);
  if (!keys.length) return null;
  return (
    <div style={{ display:"flex", gap:6, justifyContent:"center", flexWrap:"wrap", marginBottom:8 }}>
      {keys.map(key => {
        const active = itemMode?.type === key || infoKey === key;
        const color = key === "revive" ? "244,114,182" : key === "shield" ? "56,189,248" : "251,191,36";
        return (
          <button key={key} onClick={() => onInfo(infoKey === key ? null : key)} title={itemDef(key).name} style={{
            padding:"5px 11px", borderRadius:16, cursor:"pointer", color:"#fff", fontSize:13, fontWeight:"bold",
            border:`1.5px solid rgba(${color},${active ? 1 : 0.45})`,
            background:`rgba(${color},${active ? 0.3 : 0.1})`,
            boxShadow: active ? `0 0 10px rgba(${color},0.5)` : "none",
          }}>
            {itemDef(key).icon} <span style={{ fontSize:12 }}>{items[key]}</span>
          </button>
        );
      })}
    </div>
  );
}

// 아이템 설명 카드. 부활 외에는 [사용] 버튼
export function ItemInfo({ itemKey, count, canUse, onUse, onClose }) {
  const def = itemDef(itemKey);
  const isRevive = PASSIVE_ONLY.has(itemKey); // 부활·방패: 설명만 (자동 발동)
  const btn = { padding:"5px 18px", borderRadius:14, fontSize:12, fontWeight:"bold", cursor:"pointer" };
  return (
    <div style={{ width:"100%", maxWidth:340, background:"rgba(15,12,41,0.85)", border:`1px solid ${isRevive ? "rgba(244,114,182,0.5)" : "rgba(251,191,36,0.45)"}`, borderRadius:12, padding:"10px 12px", marginBottom:8 }}>
      <div style={{ display:"flex", alignItems:"center", gap:10 }}>
        <div style={{ fontSize:26 }}>{def.icon}</div>
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ fontSize:13, fontWeight:"bold" }}>{def.name} <span style={{ fontSize:11, color:"#9ca3af", fontWeight:"normal" }}>보유 {count}개</span></div>
          <div style={{ fontSize:11, color:"#d1d5db", marginTop:2, lineHeight:1.5 }}>{def.desc}</div>
        </div>
      </div>
      <div style={{ display:"flex", gap:8, justifyContent:"flex-end", marginTop:8 }}>
        {!isRevive && (
          <button onClick={onUse} disabled={!canUse} style={{ ...btn, border:"none", color:"#1f1300", background: canUse ? "linear-gradient(135deg,#f59e0b,#fbbf24)" : "rgba(255,255,255,0.15)", cursor: canUse ? "pointer" : "not-allowed" }}>사용</button>
        )}
        <button onClick={onClose} style={{ ...btn, border:"1px solid rgba(255,255,255,0.25)", background:"rgba(255,255,255,0.07)", color:"#d1d5db" }}>닫기</button>
      </div>
    </div>
  );
}

// 아이템 사용 중 안내 + 취소
export function ItemPanel({ itemMode, onCancel }) {
  const guide =
    itemMode.type === "pen" ? "✏️ 올릴 숫자 카드를 고르세요 (9 제외)"
    : itemMode.targetId ? "🪞 따라 할 카드를 고르세요" : "🪞 바꿀 카드를 고르세요";

  return (
    <div style={{ width:"100%", maxWidth:340, background:"rgba(251,191,36,0.08)", border:"1px solid rgba(251,191,36,0.4)", borderRadius:12, padding:"8px 10px", marginBottom:8, textAlign:"center" }}>
      <div style={{ fontSize:13, fontWeight:"bold", color:"#fde68a", marginBottom:6 }}>{guide}</div>
      <button onClick={onCancel} style={{ padding:"4px 16px", borderRadius:14, border:"1px solid rgba(255,255,255,0.25)", background:"rgba(255,255,255,0.07)", color:"#d1d5db", fontSize:12, cursor:"pointer" }}>취소</button>
    </div>
  );
}
