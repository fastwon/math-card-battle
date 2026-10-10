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

// 선택지 3개: 패시브를 얻거나 키울 수 있으면 최소 1개는 패시브
export function rollRewardOptions(passives, items) {
  const owned = Object.keys(passives).filter(k => passives[k] > 0);
  const passiveOpts = [];
  for (const key of Object.keys(PASSIVES)) {
    const lv = passives[key] || 0;
    if (lv > 0 && lv < PASSIVE_MAX_LV) passiveOpts.push({ kind:"passive", key, from:lv, to:lv+1 });
    if (lv === 0 && owned.length < PASSIVE_SLOTS) passiveOpts.push({ kind:"passive", key, from:0, to:1 });
  }
  const itemOpts = Object.keys(ITEMS)
    .filter(key => items[key] < ITEM_MAX)
    .map(key => ({ kind:"item", key, gain: Math.min(ITEMS[key].gain, ITEM_MAX - items[key]) }));

  const picks = [];
  const pool = shuffle([...passiveOpts, ...itemOpts]);
  if (passiveOpts.length) {
    const first = pool.find(o => o.kind === "passive");
    picks.push(first);
    pool.splice(pool.indexOf(first), 1);
  }
  while (picks.length < 3 && pool.length) picks.push(pool.shift());
  return shuffle(picks);
}

// 보상 적용. 아이템을 받은 순간 리롤·펜·복제를 모두 가지고 있으면 1개씩 써서 부활 합성 (최대 1개)
export function applyReward(opt, passives, items) {
  if (opt.kind === "passive") {
    return { passives: { ...passives, [opt.key]: opt.to }, items, synthesized: false };
  }
  const next = { ...items, [opt.key]: Math.min(ITEM_MAX, items[opt.key] + opt.gain) };
  if (next.revive < REVIVE_MAX && next.reroll >= 1 && next.pen >= 1 && next.clone >= 1) {
    return {
      passives,
      items: { ...next, reroll: next.reroll - 1, pen: next.pen - 1, clone: next.clone - 1, revive: next.revive + 1 },
      synthesized: true,
    };
  }
  return { passives, items: next, synthesized: false };
}
