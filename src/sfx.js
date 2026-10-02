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
    master.gain.value = 0.35;
    master.connect(ctx.destination);
  }
  if (ctx.state === "suspended") ctx.resume();
  return ctx;
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

  roundClear: () => arpeggio([523, 659, 784, 1047], { step: 0.1, dur: 0.3, type: "triangle", vol: 0.3 }),
  gameOver:   () => arpeggio([392, 330, 262, 196], { step: 0.22, dur: 0.4, type: "sawtooth", vol: 0.18 }),
};

export function play(name, ...args) {
  if (muted) return;
  try { SOUNDS[name]?.(...args); } catch { /* 오디오 실패는 게임 진행에 영향 없음 */ }
}

export function isMuted() { return muted; }

export function setMuted(v) {
  muted = v;
  try { localStorage.setItem(MUTE_KEY, v ? "1" : "0"); } catch { /* 무시 */ }
}
