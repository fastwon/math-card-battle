// 게임 규칙: 난이도, 카드 생성, 수식 계산, 적 정보

export const OPS = ["+", "-", "×", "÷"];

export const DIFFICULTIES = {
  easy:   { label: "이지",   emoji: "🌱", color: "#16a34a", threshold: r => r },
  normal: { label: "노말",   emoji: "⚔️", color: "#d97706", threshold: r => r * 2 },
  hard:   { label: "하드",   emoji: "💀", color: "#dc2626", threshold: r => r * r },
};

function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
let _cardId = 0;
export function makeCard(type, value) {
  return { type, value, id: ++_cardId };
}
export function genCard(hand = []) {
  const opCount = hand.filter(c => c.type === "op").length;
  const isOp = opCount >= 4 ? false : Math.random() < 0.3;
  if (isOp) {
    const availableOps = OPS.filter(op => hand.filter(c => c.type === "op" && c.value === op).length < 3);
    if (availableOps.length > 0) return makeCard("op", availableOps[Math.floor(Math.random() * availableOps.length)]);
  }
  return makeCard("num", randInt(1, 9));
}
export function maxHandSize(round) {
  if (round <= 2) return 7;
  if (round <= 4) return 8;
  if (round <= 6) return 9;
  return 10;
}
export function genHand(round) {
  const size = Math.min(5, maxHandSize(round));
  let hand = [], attempts = 0;
  while (attempts++ < 200) {
    hand = [];
    for (let i = 0; i < size; i++) hand.push(genCard(hand));
    if (hand.filter(c=>c.type==="num").length >= 2 && hand.filter(c=>c.type==="op").length >= 1) break;
  }
  return hand;
}
export function addCard(h, r) {
  if (h.length >= maxHandSize(r)) return h;
  return [...h, genCard(h)];
}

export function parseExpression(selected) {
  if (!selected.length) return null;
  let tokens = [], i = 0;
  while (i < selected.length) {
    const c = selected[i];
    if (c.type==="num" && i+2<selected.length &&
        selected[i+1].type==="num" && selected[i+2].type==="num" &&
        selected[i+1].value===c.value && selected[i+2].value===c.value) {
      tokens.push({ type:"num", value: c.value**2, display:`${c.value}²` });
      i += 3;
    } else {
      tokens.push({ ...c, display: String(c.value) });
      i++;
    }
  }
  if (tokens[0].type==="op" || tokens[tokens.length-1].type==="op") return null;
  for (let j=0;j<tokens.length-1;j++) if (tokens[j].type===tokens[j+1].type) return null;
  const exprStr = tokens.map(t => t.type==="op" ? (t.value==="×"?"*":t.value==="÷"?"/":t.value) : t.value).join(" ");
  try {
    // eslint-disable-next-line no-eval
    const r = eval(exprStr);
    if (!isFinite(r)||isNaN(r)) return null;
    return { value: Math.floor(r), tokens };
  } catch { return null; }
}

// 라운드별 적 최대 HP
export function enemyMaxHpFor(round) {
  return Math.floor(50 * Math.pow(1.5, round - 1));
}
// 라운드별 최대 턴 수 (초과 시 게임오버)
export function turnLimit(round) {
  return 5 + round * 5;
}

export const ENEMIES = [
  { name: "슬라임",   img: "/enemies/enemy1.png"  },
  { name: "고블린",   img: "/enemies/enemy2.png"  },
  { name: "해적",     img: "/enemies/enemy3.png"  },
  { name: "기사",     img: "/enemies/enemy4.png"  },
  { name: "마법사",   img: "/enemies/enemy5.png"  },
  { name: "드래곤",   img: "/enemies/enemy6.png"  },
  { name: "악마",     img: "/enemies/enemy7.png"  },
  { name: "해골왕",   img: "/enemies/enemy8.png"  },
  { name: "외계인",   img: "/enemies/enemy9.png"  },
  { name: "마왕",     img: "/enemies/enemy10.png" },
];
export function getEnemy(round) {
  return ENEMIES[(round - 1) % ENEMIES.length];
}
