// 메인 배경에 떠오르는 카드 (x: 가로 %, dur: 초, delay: 음수로 시작 위치 분산)
const BG_CARDS = [
  { v:"7", x:6,  dur:16, delay:-2,  size:1.0 },
  { v:"×", x:22, dur:20, delay:-11, size:0.8 },
  { v:"3", x:38, dur:18, delay:-6,  size:0.7 },
  { v:"+", x:55, dur:22, delay:-15, size:0.9 },
  { v:"9", x:72, dur:17, delay:-3,  size:1.1 },
  { v:"÷", x:88, dur:19, delay:-9,  size:0.8 },
  { v:"5", x:14, dur:21, delay:-17, size:0.8 },
  { v:"−", x:46, dur:15, delay:-12, size:1.0 },
  { v:"8", x:64, dur:23, delay:-19, size:0.7 },
  { v:"²", x:80, dur:18, delay:-14, size:0.9 },
];

export default function FloatingCards() {
  return (
    <div aria-hidden style={{ position:"fixed", inset:0, overflow:"hidden", pointerEvents:"none", zIndex:0 }}>
      {BG_CARDS.map((c, i) => {
        const isOp = !/\d/.test(c.v);
        return (
          <div key={i} className="bg-card" style={{
            position:"absolute", top:"105%", left:`${c.x}%`,
            width:44*c.size, height:62*c.size, borderRadius:8,
            display:"flex", alignItems:"center", justifyContent:"center",
            fontSize:24*c.size, fontWeight:"bold", color:"#fff", opacity:0.13,
            background: isOp ? "linear-gradient(135deg,#4c1d95,#a855f7)" : "linear-gradient(135deg,#1e3a8a,#3b82f6)",
            border:"2px solid rgba(255,255,255,0.5)",
            animationDuration:`${c.dur}s`, animationDelay:`${c.delay}s`,
          }}>{c.v}</div>
        );
      })}
    </div>
  );
}
