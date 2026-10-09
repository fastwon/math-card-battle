// 게임 규칙: 난이도, 카드 생성, 수식 계산, 적 정보

export const OPS = ["+", "-", "×", "÷"];

export const DIFFICULTIES = {
  easy:   { label: "이지",   emoji: "🌱", color: "#16a34a", threshold: r => r * 2 },
  normal: { label: "노말",   emoji: "⚔️", color: "#d97706", threshold: r => r * 3 },
  hard:   { label: "하드",   emoji: "💀", color: "#dc2626", threshold: r => r * r },
};

function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
let _cardId = 0;
export function makeCard(type, value) {
  return { type, value, id: ++_cardId };
}
// 패시브(mods)에 따른 카드 생성 보정. mods가 비어 있으면 기존과 완전히 같은 방식으로 뽑음
// mods: { bigNum, mulMaster, opSense, luckyStart, timeExt, relax } 각 값은 패시브 레벨(0~5)

// 큰 수의 축복: 레벨별 숫자 가중치 (적히지 않은 숫자는 1)
const BIGNUM_WEIGHTS = [null, { 1:0.5 }, { 1:0 }, { 1:0, 2:0.5 }, { 1:0, 2:0 }, { 1:0, 2:0, 3:0.5 }];
function randNum(bigNumLv) {
  if (!bigNumLv) return randInt(1, 9);
  const w = BIGNUM_WEIGHTS[bigNumLv];
  const weights = [1,2,3,4,5,6,7,8,9].map(n => w[n] ?? 1);
  let r = Math.random() * weights.reduce((a, b) => a + b, 0);
  for (let n = 1; n <= 9; n++) { r -= weights[n-1]; if (r < 0) return n; }
  return 9;
}

export function genCard(hand = [], mods = {}) {
  const opCount = hand.filter(c => c.type === "op").length;
  const opChance = 0.3 + 0.02 * (mods.opSense || 0);           // 연산 감각
  const isOp = opCount >= 4 ? false : Math.random() < opChance;
  if (isOp) {
    const availableOps = OPS.filter(op => hand.filter(c => c.type === "op" && c.value === op).length < 3);
    if (availableOps.length > 0) {
      if (mods.mulMaster && availableOps.includes("×")) {        // 곱셈 숙련
        const others = availableOps.filter(op => op !== "×");
        if (!others.length || Math.random() < 0.25 + 0.05 * mods.mulMaster) return makeCard("op", "×");
        return makeCard("op", others[Math.floor(Math.random() * others.length)]);
      }
      return makeCard("op", availableOps[Math.floor(Math.random() * availableOps.length)]);
    }
  }
  return makeCard("num", randNum(mods.bigNum));
}
export function maxHandSize(round) {
  if (round <= 2) return 7;
  if (round <= 4) return 8;
  if (round <= 6) return 9;
  return 10;
}
// size장 손패 생성 (숫자 2장 이상 + 연산 1장 이상이 되도록 재시도). 리롤 아이템도 사용
export function drawHand(size, mods = {}) {
  let hand = [], attempts = 0;
  while (attempts++ < 200) {
    hand = [];
    for (let i = 0; i < size; i++) hand.push(genCard(hand, mods));
    if (hand.filter(c=>c.type==="num").length >= 2 && hand.filter(c=>c.type==="op").length >= 1) break;
  }
  return hand;
}

// 행운의 시작: 시작 손패의 숫자 n장을 min~9로 바꾸고, mul이면 × 보장 (장수는 그대로)
const LUCKY_START = [null,
  { n:1, min:7 }, { n:2, min:7 }, { n:2, min:7, mul:true }, { n:3, min:7, mul:true }, { n:3, min:8, mul:true }];
function applyLuckyStart(hand, lv) {
  if (!lv) return hand;
  const cfg = LUCKY_START[lv];
  let left = cfg.n;
  hand = hand.map(c => (c.type === "num" && left-- > 0) ? { ...c, value: randInt(cfg.min, 9) } : c);
  if (cfg.mul && !hand.some(c => c.type === "op" && c.value === "×")) {
    const i = hand.findIndex(c => c.type === "op");
    if (i >= 0) hand[i] = { ...hand[i], value: "×" };
  }
  return hand;
}

// 마법 펜: 숫자 카드를 현재보다 큰 숫자(v+1 ~ 9) 중 하나로. 9는 올릴 수 없음
export function canUpgradeNumber(card) {
  return card.type === "num" && card.value < 9;
}
export function upgradeNumber(v) {
  return randInt(v + 1, 9);
}

export function genHand(round, mods = {}) {
  return applyLuckyStart(drawHand(Math.min(5, maxHandSize(round)), mods), mods.luckyStart);
}
export function addCard(h, r, mods = {}) {
  if (h.length >= maxHandSize(r)) return h;
  return [...h, genCard(h, mods)];
}

// i부터 같은 숫자 카드가 n장 연속인지
function sameRun(selected, i, n) {
  const c = selected[i];
  if (i + n > selected.length) return false;
  for (let k = 1; k < n; k++) {
    const d = selected[i+k];
    if (d.type !== "num" || d.value !== c.value) return false;
  }
  return true;
}

// 같은 숫자 연속: 5 이하 4장 → 세제곱 (먼저 확인), 3장 → 제곱
// ※ 세제곱(4장)이 생기면서 짝수 장 올인이 가능해져 점수 상한이 바뀜 → DB score_max_limit도 함께 갱신해야 함
export const CUBE_MAX = 5;
export function parseExpression(selected) {
  if (!selected.length) return null;
  let tokens = [], i = 0;
  while (i < selected.length) {
    const c = selected[i];
    if (c.type==="num" && c.value <= CUBE_MAX && sameRun(selected, i, 4)) {
      tokens.push({ type:"num", value: c.value**3, display:`${c.value}³` });
      i += 4;
    } else if (c.type==="num" && i+2<selected.length &&
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
// 라운드별 최대 턴 수 (초과 시 게임오버). extra = 시간 연장 패시브 레벨
export function turnLimit(round, extra = 0) {
  return 6 + round * 3 + extra;
}
// 라운드 기준 점수 (이하면 게임오버). relaxLv = 여유 패시브 레벨 (레벨당 −5%)
export function thresholdFor(difficulty, round, relaxLv = 0) {
  const t = DIFFICULTIES[difficulty].threshold(round);
  return relaxLv ? Math.round(t * (1 - 0.05 * relaxLv) * 100) / 100 : t;
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
// 20라운드 주기: R1~10 기본, R11~20은 R1~10의 반전판(BGM 역재생 + 적 색 반전), R21부터 반복
export function baseRound(round) {
  return ((round - 1) % 10) + 1;
}
export function isMirrorRound(round) {
  return (round - 1) % 20 >= 10;
}

export function getEnemy(round) {
  return ENEMIES[(round - 1) % ENEMIES.length];
}
