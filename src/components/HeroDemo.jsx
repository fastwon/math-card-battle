import { useState, useEffect } from "react";
import { ENEMIES } from "../game/rules";

// 메인 화면 자동 시연: 카드가 놓이고 → 수식 결과 → 적 피격, 반복
const DEMOS = [
  { cards:["7","×","8"], result:"56" },
  { cards:["9","9","9"], result:"81", note:"같은 숫자 3장 = 제곱!" },
  { cards:["6","+","4","×","9"], result:"42" },
  { cards:["5","5","5","5"], result:"125", note:"5 이하 4장 = 세제곱!" },
];

const DEMO_ENEMY_COUNT = 7; // 후반 보스(R8~)는 메인에서 숨김

export default function HeroDemo() {
  const [tick, setTick] = useState(0);
  const [cycle, setCycle] = useState(0);
  const demo = DEMOS[cycle % DEMOS.length];
  const enemyIdx = cycle % DEMO_ENEMY_COUNT;
  const enemy = ENEMIES[enemyIdx];
  const n = demo.cards.length;
  const showResult = tick > n;
  const hit = tick >= n + 2;

  useEffect(() => {
    const id = setInterval(() => setTick(t => t + 1), 420);
    return () => clearInterval(id);
  }, []);
  useEffect(() => {
    if (tick > n + 5) { setTick(0); setCycle(c => c + 1); }
  }, [tick, n]);

  return (
    <div style={{ position:"relative", width:"100%", maxWidth:340, background:"rgba(0,0,0,0.28)", border:"1px solid rgba(255,255,255,0.1)", borderRadius:16, padding:"10px 12px 12px", marginBottom:16 }}>
      <div style={{ display:"flex", alignItems:"center", gap:10 }}>
        {/* 적 */}
        <div style={{ position:"relative", width:92, flexShrink:0, textAlign:"center" }}>
          <div key={`${cycle}-${hit}`} className={hit ? "enemy-hit" : "bob"} style={{ display:"inline-block" }}>
            <img src={enemy.img} alt={enemy.name} style={{ width:84, height:84, objectFit:"contain", display:"block" }} />
          </div>
          {hit && (
            <div key={`pop-${cycle}`} className="dmg-pop" style={{ position:"absolute", top:16, left:"50%", fontSize:24, fontWeight:900, color:"#fbbf24", textShadow:"0 0 10px rgba(239,68,68,0.9), 0 2px 0 #000", whiteSpace:"nowrap", pointerEvents:"none" }}>
              -{demo.result}
            </div>
          )}
          <div style={{ fontSize:10, color:"#a78bfa" }}>R{enemyIdx + 1} {enemy.name}</div>
        </div>

        {/* 카드 + 결과 */}
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ display:"flex", gap:4, justifyContent:"center", minHeight:50, alignItems:"center" }}>
            {demo.cards.slice(0, Math.min(tick, n)).map((v, i) => {
              const isOp = !/\d/.test(v);
              return (
                <div key={`${cycle}-${i}`} className="card-in" style={{
                  width:32, height:46, borderRadius:7, flexShrink:0,
                  display:"flex", alignItems:"center", justifyContent:"center",
                  fontSize:isOp?16:19, fontWeight:"bold", color:"#fff",
                  background: isOp ? "linear-gradient(135deg,#7c3aed,#a855f7)" : "linear-gradient(135deg,#1d4ed8,#3b82f6)",
                  border:"2px solid rgba(255,255,255,0.7)", boxShadow:"0 2px 6px rgba(0,0,0,0.4)",
                }}>{v}</div>
              );
            })}
          </div>
          <div style={{ height:38, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center" }}>
            {showResult && (
              <>
                <div key={`r-${cycle}`} className="result-pop" style={{ fontSize:20, fontWeight:900, color:"#4ade80" }}>= {demo.result} ⚔️</div>
                {demo.note && <div style={{ fontSize:10, color:"#fbbf24" }}>{demo.note}</div>}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
