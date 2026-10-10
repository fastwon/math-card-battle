// 라운드 클리어 보상: 패시브(레벨업) + 소모품 아이템 + 히든 합성(부활)
// 모든 보상은 카드 "장수"와 데미지 "배율"을 늘리지 않음 → DB 점수 상한(score_max_limit) 그대로 유지

export const PASSIVE_SLOTS = 3;
export const PASSIVE_MAX_LV = 5;

// levels[i] = Lv(i+1)의 효과 설명. 실제 수치는 rules.js (genCard, genHand, turnLimit, thresholdFor)
export const PASSIVES = {
  bigNum:     { icon:"🔢", name:"큰 수의 축복", levels:["1이 나올 확률 절반", "1이 안 나옴", "1 없음 + 2가 나올 확률 절반", "1·2가 안 나옴", "1·2 없음 + 3이 나올 확률 절반"] },
  mulMaster:  { icon:"✖️", name:"곱셈 숙련",   levels:[30, 35, 40, 45, 50].map(p => `연산 카드가 ×일 확률 ${p}%`) },
  opSense:    { icon:"🎯", name:"연산 감각",   levels:[32, 34, 36, 38, 40].map(p => `연산 카드가 나올 확률 ${p}%`) },
  luckyStart: { icon:"🍀", name:"행운의 시작", levels:["시작 숫자 1장을 7~9로", "시작 숫자 2장을 7~9로", "시작 숫자 2장 7~9 + × 보장", "시작 숫자 3장 7~9 + × 보장", "시작 숫자 3장 8~9 + × 보장"] },
  timeExt:    { icon:"⏳", name:"시간 연장",   levels:[1, 2, 3, 4, 5].map(n => `턴 제한 +${n}`) },
  relax:      { icon:"🧭", name:"여유",       levels:[5, 10, 15, 20, 25].map(n => `기준 점수 −${n}%`) },
};

// 조합: 두 패시브가 모두 Lv5면 보상에 등장. 고르면 재료 두 칸이 빠지고 조합이 패시브 칸 1칸을 차지(순 1칸 확보)
// 효과 = 재료 두 패시브의 Lv5 효과 + 새 능력. 칸이 3칸이라 조합은 최대 2개까지 공존
// 새 능력은 점수 상한을 바꿈 (10 카드, ² 카드, 손패 +1) → DB score_max_limit을 R12/R23/R34 구간으로 갱신해 둠
export const COMBOS = {
  goldenHand: { icon:"👑", name:"황금 손",         parts:["bigNum", "luckyStart"], desc:"숫자 카드 풀에 10 추가" },
  opMaster:   { icon:"⚡", name:"연산 지배자",     parts:["mulMaster", "opSense"], desc:"연산 카드 풀에 ² 카드 추가 (바로 앞 낱장 숫자를 제곱, 예: 9 ² = 81)" },
  hourglass:  { icon:"⌛", name:"영원의 모래시계", parts:["timeExt", "relax"],     desc:"손패 최대 +1장" },
};
const COMBO_FLAGS = { goldenHand: { ten: true }, opMaster: { square: true }, hourglass: { handPlus: 1 } };

// 실제 적용할 효과 = 보유 패시브 + 조합(재료 두 패시브의 Lv5 효과 + 새 능력)
export function modsFrom(passives, combos = {}) {
  const m = { ...passives };
  for (const key of Object.keys(combos)) {
    if (!combos[key]) continue;
    for (const part of COMBOS[key].parts) m[part] = PASSIVE_MAX_LV;
    Object.assign(m, COMBO_FLAGS[key]);
  }
  return m;
}

export const ITEMS = {
  reroll: { icon:"🔄", name:"리롤",    gain:2, desc:"손패 전체를 다시 뽑기" },
  pen:    { icon:"✏️", name:"마법 펜", gain:1, desc:"숫자 카드 1장을 더 큰 숫자로 (무작위)" },
  clone:  { icon:"🪞", name:"복제",    gain:1, desc:"카드 1장을 다른 카드와 똑같이" },
};
export const ITEM_MAX = 9;
export const REVIVE_MAX = 1;
export const SHIELD_MAX = 1;
export const EMPTY_ITEMS = { reroll:0, pen:0, clone:0, revive:0, shield:0 };

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// 선택지 3개: 조합이 가능하면 반드시 포함, 패시브를 얻거나 키울 수 있으면 최소 1개는 패시브
export function rollRewardOptions(passives, items, combos = {}) {
  const owned = [...Object.keys(passives).filter(k => passives[k] > 0), ...Object.keys(combos).filter(k => combos[k])]; // 조합도 칸 차지
  const merged = new Set(Object.keys(combos).filter(k => combos[k]).flatMap(k => COMBOS[k].parts)); // 이미 조합으로 합쳐진 패시브는 다시 안 나옴
  const comboOpts = Object.keys(COMBOS)
    .filter(key => !combos[key] && COMBOS[key].parts.every(p => passives[p] === PASSIVE_MAX_LV))
    .map(key => ({ kind:"combo", key }));
  const passiveOpts = [];
  for (const key of Object.keys(PASSIVES)) {
    if (merged.has(key)) continue;
    const lv = passives[key] || 0;
    if (lv > 0 && lv < PASSIVE_MAX_LV) passiveOpts.push({ kind:"passive", key, from:lv, to:lv+1 });
    if (lv === 0 && owned.length < PASSIVE_SLOTS) passiveOpts.push({ kind:"passive", key, from:0, to:1 });
  }
  const itemOpts = Object.keys(ITEMS)
    .filter(key => items[key] < ITEM_MAX)
    .map(key => ({ kind:"item", key, gain: Math.min(ITEMS[key].gain, ITEM_MAX - items[key]) }));

  const picks = [...comboOpts].slice(0, 3);
  const pool = shuffle([...passiveOpts, ...itemOpts]);
  if (passiveOpts.length) {
    const first = pool.find(o => o.kind === "passive");
    picks.push(first);
    pool.splice(pool.indexOf(first), 1);
  }
  while (picks.length < 3 && pool.length) picks.push(pool.shift());
  return [...picks.filter(o => o.kind === "combo"), ...shuffle(picks.filter(o => o.kind !== "combo"))]; // 조합은 맨 위
}

// 보상 적용. 아이템을 받은 순간 리롤·펜·복제를 모두 가지고 있으면 1개씩 써서 부활 합성 (최대 1개)
export function applyReward(opt, passives, items, combos = {}) {
  if (opt.kind === "combo") {
    const rest = { ...passives };
    for (const part of COMBOS[opt.key].parts) delete rest[part]; // 재료 두 칸 → 조합 1칸
    return { passives: rest, items, combos: { ...combos, [opt.key]: true }, synthesized: false };
  }
  if (opt.kind === "passive") {
    return { passives: { ...passives, [opt.key]: opt.to }, items, combos, synthesized: false };
  }
  const next = { ...items, [opt.key]: Math.min(ITEM_MAX, items[opt.key] + opt.gain) };
  if (next.revive < REVIVE_MAX && next.reroll >= 1 && next.pen >= 1 && next.clone >= 1) {
    return {
      passives, combos,
      items: { ...next, reroll: next.reroll - 1, pen: next.pen - 1, clone: next.clone - 1, revive: next.revive + 1 },
      synthesized: true,
    };
  }
  return { passives, items: next, combos, synthesized: false };
}
