// Web Audio API로 효과음을 직접 합성 (음원 파일 없음)

const MUTE_KEY = "mcb_muted";

let ctx = null;
let master = null;
let noiseBuf = null;
let muted = false;
try { muted = localStorage.getItem(MUTE_KEY) === "1"; } catch { /* 저장소 사용 불가 시 기본값 */ }

function ac() {
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = 0.21; // 전체 효과음 볼륨
    master.connect(ctx.destination);
  }
  resumeIfNeeded();
  return ctx;
}

// 꺼져 있으면(suspended, iOS의 interrupted 등) 다시 켬. 백그라운드 상태에선 켜지 않음
function resumeIfNeeded() {
  if (!ctx || ctx.state === "running" || ctx.state === "closed" || document.hidden) return;
  ctx.resume().catch(() => { /* 사용자 조작 전이면 막힘 → 다음 조작 때 다시 시도 */ });
}

// 브라우저는 사용자 조작 안에서만 소리를 켤 수 있음.
// 모바일 터치는 손가락이 '떨어질 때'(touchend·click)만 조작으로 인정되므로 여러 이벤트에서 모두 시도
const UNLOCK_EVENTS = ["pointerdown", "pointerup", "touchstart", "touchend", "mousedown", "click", "keydown"];
function unlock() {
  if (!ctx || ctx.state === "running" || document.hidden) return;
  resumeIfNeeded();
  // iOS는 조작 중에 실제로 소리를 한 번 재생해야 오디오가 풀림 → 1샘플짜리 무음 재생
  try {
    const src = ctx.createBufferSource();
    src.buffer = ctx.createBuffer(1, 1, 22050);
    src.connect(ctx.destination);
    src.start(0);
  } catch { /* 무시 */ }
}
if (typeof document !== "undefined") {
  UNLOCK_EVENTS.forEach(e => document.addEventListener(e, unlock, { capture: true, passive: true }));
  // 다른 탭/앱으로 가면 멈추고, 돌아오면 이어서 재생 (막히면 다음 터치 때 unlock이 켬)
  document.addEventListener("visibilitychange", () => {
    if (!ctx) return;
    if (document.hidden) { if (ctx.state === "running") ctx.suspend().catch(() => {}); }
    else resumeIfNeeded();
  });
  window.addEventListener("pageshow", resumeIfNeeded); // 뒤로가기 캐시에서 복원될 때
  window.addEventListener("focus", resumeIfNeeded);
}

function getNoise(c) {
  if (!noiseBuf) {
    noiseBuf = c.createBuffer(1, c.sampleRate, c.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  }
  return noiseBuf;
}

// 단일 음: 주파수(from→to)를 dur초 동안 미끄러지며 감쇠
function tone({ freq, to = freq, dur = 0.15, type = "sine", vol = 0.5, delay = 0 }) {
  const c = ac(); if (!c) return;
  const t = c.currentTime + delay;
  const osc = c.createOscillator();
  const g = c.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t);
  osc.frequency.exponentialRampToValueAtTime(Math.max(to, 1), t + dur);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol, t + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  osc.connect(g).connect(master);
  osc.start(t);
  osc.stop(t + dur + 0.02);
}

// 노이즈 버스트: 타격음/폭발음
function noise({ dur = 0.2, vol = 0.5, filter = 2000, to = filter, delay = 0 }) {
  const c = ac(); if (!c) return;
  const t = c.currentTime + delay;
  const src = c.createBufferSource();
  src.buffer = getNoise(c);
  const f = c.createBiquadFilter();
  f.type = "lowpass";
  f.frequency.setValueAtTime(filter, t);
  f.frequency.exponentialRampToValueAtTime(Math.max(to, 20), t + dur);
  const g = c.createGain();
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  src.connect(f).connect(g).connect(master);
  src.start(t);
  src.stop(t + dur + 0.02);
}

function arpeggio(notes, { step = 0.08, dur = 0.25, type = "square", vol = 0.25, delay = 0 } = {}) {
  notes.forEach((freq, i) => tone({ freq, dur, type, vol, delay: delay + i * step }));
}

const SOUNDS = {
  select:   () => tone({ freq: 880, to: 1200, dur: 0.06, type: "triangle", vol: 0.3 }),
  deselect: () => tone({ freq: 700, to: 450, dur: 0.06, type: "triangle", vol: 0.25 }),
  draw:     () => noise({ dur: 0.12, vol: 0.15, filter: 6000, to: 1500 }),
  skip:     () => tone({ freq: 300, to: 200, dur: 0.18, type: "sine", vol: 0.3 }),
  click:    () => tone({ freq: 600, dur: 0.05, type: "square", vol: 0.15 }),

  // ratio = 데미지 / 적 최대 HP → 클수록 묵직하게
  hit: (ratio = 0) => {
    const r = Math.min(ratio, 1);
    noise({ dur: 0.12 + r * 0.25, vol: 0.5 + r * 0.4, filter: 3000 + r * 3000, to: 300 });
    tone({ freq: 220 - r * 120, to: 50, dur: 0.15 + r * 0.25, type: "sine", vol: 0.7 });
    if (r >= 0.4) tone({ freq: 90, to: 30, dur: 0.4, type: "triangle", vol: 0.6, delay: 0.03 });
  },

  kill: () => {
    noise({ dur: 0.6, vol: 0.7, filter: 4000, to: 100 });
    tone({ freq: 160, to: 30, dur: 0.6, type: "sawtooth", vol: 0.3 });
    arpeggio([523, 659, 784], { delay: 0.25, step: 0.07, dur: 0.18, vol: 0.2 });
  },
  perfect: () => arpeggio([784, 988, 1175, 1568], { delay: 0.3, step: 0.07, dur: 0.3, type: "triangle", vol: 0.35 }),
  allIn:   () => arpeggio([392, 523, 659, 784], { delay: 0.3, step: 0.06, dur: 0.25, type: "square", vol: 0.2 }),
  combo: () => {
    arpeggio([523, 659, 784, 1047, 1319, 1568], { delay: 0.3, step: 0.06, dur: 0.35, type: "square", vol: 0.2 });
    arpeggio([1047, 1568, 2093], { delay: 0.7, step: 0.0, dur: 0.6, type: "triangle", vol: 0.25 });
  },

  // 보상·아이템
  levelUp: () => arpeggio([523, 784, 1047, 1568], { step: 0.06, dur: 0.2, type: "square", vol: 0.18 }),
  item:    () => arpeggio([1319, 1568, 2093], { step: 0.04, dur: 0.12, type: "triangle", vol: 0.2 }),
  synth: () => {
    noise({ dur: 0.5, vol: 0.15, filter: 8000, to: 2000 });
    arpeggio([659, 831, 988, 1319, 1661, 1976], { step: 0.07, dur: 0.3, type: "triangle", vol: 0.25 });
  },
  revive: () => arpeggio([392, 523, 659, 784, 1047], { step: 0.09, dur: 0.35, type: "triangle", vol: 0.3 }),

  // 적의 공격
  enemyAttack: () => {
    noise({ dur: 0.25, vol: 0.35, filter: 1200, to: 4000 });
    tone({ freq: 120, to: 60, dur: 0.25, type: "sawtooth", vol: 0.3, delay: 0.12 });
  },
  cardBreak: () => {
    noise({ dur: 0.35, vol: 0.45, filter: 9000, to: 2500 });
    arpeggio([1760, 1319, 988], { step: 0.04, dur: 0.12, type: "square", vol: 0.12 });
  },
  seal: () => {
    tone({ freq: 220, to: 110, dur: 0.5, type: "triangle", vol: 0.4 });
    tone({ freq: 330, to: 165, dur: 0.5, type: "sine", vol: 0.2, delay: 0.05 });
  },
  bossAppear: () => {
    tone({ freq: 55, to: 45, dur: 1.4, type: "sawtooth", vol: 0.35 });
    tone({ freq: 82, to: 70, dur: 1.4, type: "triangle", vol: 0.3 });
    noise({ dur: 1.2, vol: 0.2, filter: 400, to: 100 });
  },
  rage: () => {
    tone({ freq: 300, to: 70, dur: 0.7, type: "sawtooth", vol: 0.35 });
    noise({ dur: 0.6, vol: 0.3, filter: 2000, to: 200 });
  },

  heal: () => {
    arpeggio([523, 659, 784, 1047, 1319], { step: 0.06, dur: 0.35, type: "sine", vol: 0.3 });
    noise({ dur: 0.5, vol: 0.08, filter: 9000, to: 4000, delay: 0.1 });
  },

  roundClear: () => arpeggio([523, 659, 784, 1047], { step: 0.1, dur: 0.3, type: "triangle", vol: 0.3 }),
  gameOver:   () => arpeggio([392, 330, 262, 196], { step: 0.22, dur: 0.4, type: "sawtooth", vol: 0.18 }),
};

// BGM(bgm.js)과 같은 AudioContext를 공유
export function getAudioContext() { return ac(); }

export function play(name, ...args) {
  if (muted) return;
  try { SOUNDS[name]?.(...args); } catch { /* 오디오 실패는 게임 진행에 영향 없음 */ }
}

export function isMuted() { return muted; }

export function setMuted(v) {
  muted = v;
  try { localStorage.setItem(MUTE_KEY, v ? "1" : "0"); } catch { /* 무시 */ }
}
