const SECTIONS = [
  { emoji:"⚔️", title:"기본 진행", items:["손패에서 카드를 선택해 수식을 만들고 공격","적의 HP를 0으로 만들면 라운드 클리어","공격 후 사용한 카드는 사라지고 매 턴 카드 1장 추가","카드를 쓰기 싫으면 '턴 종료'로 넘길 수 있음","손패 최대 크기: R1~2=7장 / R3~4=8장 / R5~6=9장 / R7~=10장"] },
  { emoji:"🃏", title:"카드 & 수식 규칙", items:["숫자와 연산자를 번갈아 선택 (숫자→연산→숫자→...)","첫 카드와 마지막 카드는 반드시 숫자","결과가 0 이하면 공격 불가","같은 숫자 3장을 연속 선택하면 제곱으로 변환 (예: 3 3 3 → 3² = 9)","5 이하의 같은 숫자 4장을 연속 선택하면 세제곱으로 변환 (예: 5 5 5 5 → 5³ = 125)"] },
  { emoji:"🏆", title:"점수 계산", items:["라운드 점수 = 최고 데미지 ÷ 클리어 턴","적 HP를 딱 맞게 0으로 → 퍼펙트 클리어! ✨ 점수 ×2","손패의 모든 카드를 사용해서 처치 → 올 인! 🃏 점수 ×2","퍼펙트 클리어 + 올 인 동시 달성 → ⚡ 콤보! 점수 ×4","총점 = 각 라운드 점수의 합"] },
  { emoji:"🎁", title:"보상", items:["라운드를 클리어할 때마다 보상 3개 중 1개를 고름","⭐ 패시브: 최대 3종, 같은 패시브를 다시 고르면 레벨업 (최대 Lv5)","🎒 아이템: 🔄 리롤(손패 다시 뽑기) · ✏️ 마법 펜(숫자 카드 1장을 더 큰 숫자로 무작위 변경) · 🪞 복제(카드 1장을 다른 카드와 똑같이)","아이템은 한 번 쓰면 사라지고, 다시 고르면 개수가 늘어남"] },
  { emoji:"👹", title:"적의 공격", items:["6라운드부터 적이 6턴마다 손패 1장을 무작위로 파괴 (16라운드부터는 5턴마다, 적 HP 아래에 남은 턴 표시)","10라운드마다 등장하는 마왕은 공격할 때 1장 파괴 + 1장 봉인 🔒 (봉인은 다음 공격 때까지 사용 불가)","마왕은 HP가 절반 이하가 되면 분노해 봉인이 2장으로 늘어남","🔄 리롤을 쓰면 봉인이 풀림"] },
  { emoji:"💀", title:"게임오버 조건", items:["라운드 점수가 기준 이하면 게임오버","이지: 기준 = 라운드×3 / 노말: 기준 = 라운드×5 / 하드: 기준 = 라운드²×2","라운드당 최대 턴 수(6 + 라운드×3) 초과 시에도 게임오버","게임 도중 '메인으로'를 눌러 포기해도 지금까지의 점수로 랭킹 등록 가능"] },
];

export default function RulesPopup({ onClose }) {
  return (
    <div onClick={onClose} style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.85)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:200, padding:16 }}>
      <div onClick={e=>e.stopPropagation()} style={{ background:"linear-gradient(135deg,#1e1b4b,#312e81)", borderRadius:20, padding:"24px 28px", border:"2px solid rgba(192,132,252,0.4)", maxWidth:520, width:"100%", maxHeight:"85vh", overflowY:"auto" }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:18 }}>
          <div style={{ fontSize:17, fontWeight:"bold", color:"#c084fc" }}>📖 게임 규칙</div>
          <button onClick={onClose} style={{ background:"rgba(255,255,255,0.08)", border:"1px solid rgba(255,255,255,0.15)", borderRadius:8, color:"#9ca3af", padding:"4px 10px", cursor:"pointer", fontSize:13 }}>✕ 닫기</button>
        </div>
        {SECTIONS.map(section => (
          <div key={section.title} style={{ marginBottom:16 }}>
            <div style={{ color:"#a78bfa", fontWeight:"bold", fontSize:13, marginBottom:6 }}>{section.emoji} {section.title}</div>
            {section.items.map((item, i) => (
              <div key={i} style={{ color:"#d1d5db", fontSize:12, lineHeight:1.8, paddingLeft:8 }}>• {item}</div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
