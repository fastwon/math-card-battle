// 배경음악: Web Audio로 실시간 연주하는 8비트 루프 (음원 파일 없음)
import { getAudioContext } from "./sfx";

const MUTE_KEY = "mcb_bgm_muted";
const BUS_VOLUME = 0.16;

let muted = false;
try { muted = localStorage.getItem(MUTE_KEY) === "1"; } catch { /* 저장소 사용 불가 시 기본값 */ }

// ── 음 이름 → 주파수 ──
const NOTE = { C:0, "C#":1, D:2, Eb:3, E:4, F:5, "F#":6, G:7, "G#":8, A:9, Bb:10, B:11 };
function freq(n) {
  const m = n.match(/^([A-G][#b]?)(\d)$/);
  return 440 * Math.pow(2, ((+m[2] + 1) * 12 + NOTE[m[1]] - 69) / 12);
}

// ── 곡 데이터: 16분음표 64칸(4마디). 이벤트 = [칸, 음, 길이(칸)] ──
function chordArp(chords, oct, every = 2) {
  const ev = [];
  chords.forEach((ch, bar) => {
    for (let s = 0; s < 16; s += every) ev.push([bar * 16 + s, ch[(s / every) % ch.length] + oct, every]);
  });
  return ev;
}
function bassLine(roots, pattern) {
  const ev = [];
  roots.forEach((r, bar) => pattern.forEach(([s, o, l]) => ev.push([bar * 16 + s, r + o, l])));
  return ev;
}
function drumLine(map) {
  const ev = [];
  for (let bar = 0; bar < 4; bar++)
    for (const [k, steps] of Object.entries(map)) steps.forEach(s => ev.push([bar * 16 + s, k]));
  return ev;
}

const TRACKS = {
  lobby: {
    bpm: 92, drumVol: 0.5,
    lead: { type: "square", vol: 0.07, ev: [
      [0,"E5",4],[4,"G5",4],[8,"C6",6],[14,"B5",2],
      [16,"A5",4],[20,"E5",4],[24,"C5",8],
      [32,"F5",4],[36,"A5",4],[40,"C6",4],[44,"A5",4],
      [48,"G5",6],[54,"F5",2],[56,"D5",4],[60,"B4",4],
    ]},
    arp:  { type: "triangle", vol: 0.09, ev: chordArp([["C","E","G","E"],["A","C","E","C"],["F","A","C","A"],["G","B","D","B"]], 4) },
    bass: { type: "triangle", vol: 0.22, ev: bassLine(["C","A","F","G"], [[0,2,6],[8,2,6]]) },
    drums: drumLine({ kick:[0,8], hat:[4,12] }),
  },
  battle: {
    bpm: 132, drumVol: 0.7,
    lead: { type: "square", vol: 0.07, ev: [
      [0,"A4",2],[2,"C5",2],[4,"E5",2],[6,"A5",4],[10,"G5",2],[12,"E5",4],
      [16,"F5",2],[18,"E5",2],[20,"F5",2],[22,"A5",4],[26,"C6",2],[28,"A5",4],
      [32,"G5",2],[34,"F5",2],[36,"G5",2],[38,"B5",4],[42,"D6",2],[44,"B5",4],
      [48,"G#5",4],[52,"B5",4],[56,"E6",4],[60,"D6",2],[62,"B5",2],
    ]},
    bass: { type: "square", vol: 0.1, ev: bassLine(["A","F","G","E"], [[0,2,2],[2,3,2],[4,2,2],[6,3,2],[8,2,2],[10,3,2],[12,2,2],[14,3,2]]) },
    drums: drumLine({ kick:[0,6,8], snare:[4,12], hat:[0,2,4,6,8,10,12,14] }),
  },
  boss: {
    bpm: 150, drumVol: 0.6,
    lead: { type: "square", vol: 0.07, ev: [
      [0,"D5",3],[3,"F5",3],[6,"A5",2],[8,"G#5",2],[10,"A5",6],
      [16,"Bb5",3],[19,"A5",3],[22,"F5",2],[24,"D5",8],
      [32,"C5",3],[35,"E5",3],[38,"G5",2],[40,"F5",2],[42,"E5",6],
      [48,"C#5",4],[52,"E5",4],[56,"A5",4],[60,"G5",2],[62,"E5",2],
    ]},
    bass: { type: "sawtooth", vol: 0.07, ev: bassLine(["D","Bb","C","A"], Array.from({ length: 16 }, (_, s) => [s, s % 4 === 2 ? 3 : 2, 1])) },
    drums: drumLine({ kick:[0,4,8,10,12], snare:[4,12], hat:Array.from({ length: 16 }, (_, s) => s) }),
  },
};

// 칸별 이벤트 인덱스
for (const tr of Object.values(TRACKS)) {
  tr.steps = Array.from({ length: 64 }, () => []);
  for (const ch of ["lead", "arp", "bass"]) {
    if (!tr[ch]) continue;
    tr[ch].ev.forEach(([s, n, l]) => tr.steps[s].push({ kind: "tone", f: freq(n), l, type: tr[ch].type, vol: tr[ch].vol }));
  }
  tr.drums.forEach(([s, k]) => tr.steps[s].push({ kind: k }));
}

// ── 오디오 ──
let ctx = null, bus = null, noiseBuf = null;
function init() {
  if (ctx) return ctx;
  ctx = getAudioContext();
  if (!ctx) return null;
  bus = ctx.createGain();
  bus.gain.value = BUS_VOLUME;
  bus.connect(ctx.destination);
  noiseBuf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
  const d = noiseBuf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  return ctx;
}

function voice(out, t, f, dur, type, vol) {
  const o = ctx.createOscillator(), g = ctx.createGain();
  o.type = type; o.frequency.value = f;
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol, t + 0.01);
  g.gain.setValueAtTime(vol, t + dur * 0.6);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(out);
  o.start(t); o.stop(t + dur + 0.02);
}
function kick(out, t, vol) {
  const o = ctx.createOscillator(), g = ctx.createGain();
  o.frequency.setValueAtTime(150, t);
  o.frequency.exponentialRampToValueAtTime(40, t + 0.12);
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.15);
  o.connect(g).connect(out); o.start(t); o.stop(t + 0.16);
}
function noise(out, t, dur, vol, hp) {
  const s = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain();
  s.buffer = noiseBuf; f.type = "highpass"; f.frequency.value = hp;
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  s.connect(f).connect(g).connect(out); s.start(t); s.stop(t + dur + 0.02);
}

// ── 시퀀서 ──
let current = null;   // { name, bpm, out(GainNode) }
let wanted = null;    // 음소거 중에도 기억해 두는 "지금 틀어야 할 곡"
let step = 0, nextTime = 0, timer = null;

function scheduleStep(t) {
  const tr = TRACKS[current.name], out = current.out;
  const sixteenth = 60 / current.bpm / 4;
  for (const e of tr.steps[step]) {
    if (e.kind === "tone") voice(out, t, e.f, e.l * sixteenth * 0.95, e.type, e.vol);
    else if (e.kind === "kick") kick(out, t, 0.8 * tr.drumVol);
    else if (e.kind === "snare") { noise(out, t, 0.14, 0.35 * tr.drumVol, 1500); voice(out, t, 180, 0.08, "triangle", 0.2 * tr.drumVol); }
    else if (e.kind === "hat") noise(out, t, 0.04, 0.12 * tr.drumVol, 7000);
  }
}
function tick() {
  if (!current || ctx.state !== "running") return;
  // 탭 전환 등으로 밀렸으면 현재 시각부터 다시 맞춤
  if (nextTime < ctx.currentTime - 0.2) nextTime = ctx.currentTime + 0.05;
  while (nextTime < ctx.currentTime + 0.12) {
    scheduleStep(nextTime);
    nextTime += 60 / current.bpm / 4;
    step = (step + 1) % 64;
  }
}

function fadeOut(cur) {
  const t = ctx.currentTime;
  cur.out.gain.cancelScheduledValues(t);
  cur.out.gain.setValueAtTime(cur.out.gain.value, t);
  cur.out.gain.linearRampToValueAtTime(0, t + 0.4);
  setTimeout(() => cur.out.disconnect(), 600);
}

function start(name, bpm) {
  if (!init()) return;
  if (current?.name === name) { current.bpm = bpm; return; }
  if (current) fadeOut(current);
  const out = ctx.createGain();
  out.gain.value = 1;
  out.connect(bus);
  current = { name, bpm, out };
  step = 0;
  nextTime = ctx.currentTime + 0.1;
  if (!timer) timer = setInterval(tick, 25);
}

function halt() {
  if (current) fadeOut(current);
  current = null;
  clearInterval(timer);
  timer = null;
}

// 곡 재생 (같은 곡이면 템포만 갱신). name=null 이면 정지
export function playBgm(name, bpm) {
  wanted = name ? { name, bpm: bpm ?? TRACKS[name].bpm } : null;
  if (muted || !wanted) { halt(); return; }
  start(wanted.name, wanted.bpm);
}

export function isBgmMuted() { return muted; }

export function setBgmMuted(v) {
  muted = v;
  try { localStorage.setItem(MUTE_KEY, v ? "1" : "0"); } catch { /* 무시 */ }
  if (muted) halt();
  else if (wanted) start(wanted.name, wanted.bpm);
}

// 브라우저는 사용자의 첫 터치/클릭 전에는 소리를 막음 → 터치 때마다 재개 시도
if (typeof document !== "undefined") {
  const unlock = () => { if (ctx && ctx.state === "suspended" && !document.hidden) ctx.resume(); };
  document.addEventListener("pointerdown", unlock);
  document.addEventListener("keydown", unlock);
  // 다른 탭/앱으로 가면 멈추고, 돌아오면 이어서 재생
  document.addEventListener("visibilitychange", () => {
    if (!ctx) return;
    if (document.hidden) ctx.suspend();
    else ctx.resume();
  });
}
