// 纯 Node 合成整片配乐 → public/music.wav（44.1kHz / 16bit / 立体声）。不依赖任何 npm 包。
// 用法：npm run music   （或 node scripts/make-music.mjs [输出路径]）
//
// 120 BPM、A 小调，和弦 Am–F–C–G 每小节一个（1 小节 = 2 秒，与视频的节拍网格一致）。
// 主片节奏变了，只需改下面的 SECTIONS（单位：小节）后重新运行。

import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

/** 段落边界（小节，左闭右开）。与 src/timelines/promo.ts 的 PAIN / INTRO / SHOWCASE / OUTRO 对应。 */
export const SECTIONS = {
  pain: {from: 0, to: 8}, // 低沉 pad + 心跳底鼓 + 滴答；最后两小节上升音 + 军鼓滚奏，最后一拍留空
  intro: {from: 8, to: 18}, // drop：四拍底鼓、拍手、反拍踩镲、侧链贝斯、拨弦琶音
  showcase: {from: 18, to: 28}, // 能量更高：十六分踩镲、高八度主旋律、每小节一声冲击
  outro: {from: 28, to: 30}, // 大冲击 + 混响长尾 + pad，之后自然衰减到静音
};
const TOTAL_SECONDS = 62;

// ───────────────────────── 基础参数 ─────────────────────────
const SR = 44100;
const BPM = 120;
const BEAT = 60 / BPM; // 0.5 s
const BAR = BEAT * 4; // 2 s
const N = Math.round(TOTAL_SECONDS * SR);
const TAU = Math.PI * 2;

// 和弦（MIDI）：Am – F – C – G
const PROG = [
  {name: 'Am', pad: [57, 60, 64], bass: 33, arp: [69, 72, 76, 81]},
  {name: 'F', pad: [53, 57, 60], bass: 29, arp: [65, 69, 72, 77]},
  {name: 'C', pad: [55, 60, 64], bass: 36, arp: [67, 72, 76, 79]},
  {name: 'G', pad: [55, 59, 62], bass: 31, arp: [67, 71, 74, 79]},
];
const chordAt = (bar) => PROG[((bar % 4) + 4) % 4];
const mtof = (m) => 440 * Math.pow(2, (m - 69) / 12);
const barT = (b) => b * BAR;
const inSec = (bar, s) => bar >= s.from && bar < s.to;

// 确定性噪声
let seed = 0x9e3779b9;
const rnd = () => {
  seed |= 0;
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
const noise = () => rnd() * 2 - 1;

// ───────────────────────── 总线 ─────────────────────────
const bus = () => ({L: new Float32Array(N), R: new Float32Array(N)});
const dry = bus(); // 不受侧链影响（鼓）
const duckBus = bus(); // 受侧链压缩（贝斯、pad、琶音）
const revSend = bus(); // 送混响
const dlySend = bus(); // 送延迟

/** 把单声道片段混入总线；pan -1..1，等功率声像。 */
function place(target, start, buf, gain = 1, pan = 0) {
  const i0 = Math.round(start * SR);
  const a = ((pan + 1) * Math.PI) / 4;
  const gl = Math.cos(a) * gain * Math.SQRT2;
  const gr = Math.sin(a) * gain * Math.SQRT2;
  for (let i = 0; i < buf.length; i++) {
    const j = i0 + i;
    if (j < 0) continue;
    if (j >= N) break;
    target.L[j] += buf[i] * gl;
    target.R[j] += buf[i] * gr;
  }
}
/** 同时送入主总线与效果总线。 */
function play(start, buf, {gain = 1, pan = 0, to = dry, rev = 0, dly = 0} = {}) {
  place(to, start, buf, gain, pan);
  if (rev) place(revSend, start, buf, gain * rev, pan);
  if (dly) place(dlySend, start, buf, gain * dly, pan);
}

// ───────────────────────── 滤波器 ─────────────────────────
class Biquad {
  constructor(type, freq, q = 0.707) {
    this.type = type;
    this.x1 = this.x2 = this.y1 = this.y2 = 0;
    this.set(freq, q);
  }
  set(freq, q = this.q) {
    this.q = q;
    const w = (TAU * Math.min(freq, SR * 0.45)) / SR;
    const cs = Math.cos(w);
    const al = Math.sin(w) / (2 * q);
    let b0, b1, b2;
    if (this.type === 'lp') [b0, b1, b2] = [(1 - cs) / 2, 1 - cs, (1 - cs) / 2];
    else if (this.type === 'hp') [b0, b1, b2] = [(1 + cs) / 2, -(1 + cs), (1 + cs) / 2];
    else [b0, b1, b2] = [al, 0, -al]; // bp
    const a0 = 1 + al;
    this.b0 = b0 / a0;
    this.b1 = b1 / a0;
    this.b2 = b2 / a0;
    this.a1 = (-2 * cs) / a0;
    this.a2 = (1 - al) / a0;
  }
  run(x) {
    const y = this.b0 * x + this.b1 * this.x1 + this.b2 * this.x2 - this.a1 * this.y1 - this.a2 * this.y2;
    this.x2 = this.x1;
    this.x1 = x;
    this.y2 = this.y1;
    this.y1 = y;
    return y;
  }
}

// polyBLEP 锯齿，减少混叠
function sawOsc(freq) {
  let ph = rnd();
  const dt = freq / SR;
  return () => {
    ph += dt;
    if (ph >= 1) ph -= 1;
    let v = 2 * ph - 1;
    if (ph < dt) {
      const t = ph / dt;
      v -= t + t - t * t - 1;
    } else if (ph > 1 - dt) {
      const t = (ph - 1) / dt;
      v -= t * t + t + t + 1;
    }
    return v;
  };
}

// ───────────────────────── 音色 ─────────────────────────
const len = (s) => new Float32Array(Math.round(s * SR));

/** 底鼓：正弦下扫 + 一点咔嗒。 */
function kick({f0 = 160, f1 = 46, sweep = 28, decay = 0.32, dur = 0.6, click = 0.25} = {}) {
  const b = len(dur);
  let ph = 0;
  for (let i = 0; i < b.length; i++) {
    const t = i / SR;
    const f = f1 + (f0 - f1) * Math.exp(-t * sweep);
    ph += (TAU * f) / SR;
    const env = Math.min(1, t / 0.002) * Math.exp(-t / decay);
    b[i] = Math.tanh(1.6 * Math.sin(ph) * env) + click * noise() * Math.exp(-t * 400);
  }
  return b;
}

/** 军鼓：190Hz 鼓体 + 高通噪声。 */
function snare(decay = 0.13) {
  const b = len(0.35);
  const hp = new Biquad('hp', 1200);
  let ph = 0;
  for (let i = 0; i < b.length; i++) {
    const t = i / SR;
    ph += (TAU * (180 + 60 * Math.exp(-t * 40))) / SR;
    b[i] = 0.55 * Math.sin(ph) * Math.exp(-t / 0.05) + 0.8 * hp.run(noise()) * Math.exp(-t / decay);
  }
  return b;
}

/** 拍手：带通噪声，三次快速起音。 */
function clap() {
  const b = len(0.4);
  const bp = new Biquad('bp', 1150, 1.2);
  for (let i = 0; i < b.length; i++) {
    const t = i / SR;
    let env = 0;
    for (const o of [0, 0.011, 0.022]) if (t >= o) env = Math.max(env, Math.exp(-(t - o) / (o === 0.022 ? 0.13 : 0.008)));
    b[i] = bp.run(noise()) * env * 2.4;
  }
  return b;
}

/** 闭镲：高通噪声短衰减。 */
function hat(decay = 0.035) {
  const b = len(Math.max(0.12, decay * 4));
  const hp = new Biquad('hp', 7500, 0.9);
  for (let i = 0; i < b.length; i++) {
    const t = i / SR;
    b[i] = hp.run(noise()) * Math.exp(-t / decay);
  }
  return b;
}

/** 钟表滴答：高频短正弦 + 一丝噪声。 */
function tick(freq = 3400) {
  const b = len(0.06);
  const hp = new Biquad('hp', 5000);
  for (let i = 0; i < b.length; i++) {
    const t = i / SR;
    b[i] = (Math.sin(TAU * freq * t) * 0.8 + 0.3 * hp.run(noise())) * Math.exp(-t / 0.009);
  }
  return b;
}

/** 拨弦：加法合成，高次谐波衰减更快。 */
function pluck(freq, dur = 0.5, bright = 1) {
  const b = len(dur);
  const H = 10;
  for (let i = 0; i < b.length; i++) {
    const t = i / SR;
    let v = 0;
    for (let k = 1; k <= H; k++) {
      if (k * freq > 15000) break;
      v += (Math.sin(TAU * k * freq * t) / k) * Math.exp(-t * (4 + (k * 3) / bright));
    }
    b[i] = v * Math.min(1, t / 0.002) * 0.7;
  }
  return b;
}

/** 主旋律：偏方波的明亮音色 + 轻微颤音。 */
function lead(freq, dur = 0.24) {
  const b = len(dur + 0.25);
  for (let i = 0; i < b.length; i++) {
    const t = i / SR;
    const vib = 1 + 0.004 * Math.sin(TAU * 5.5 * t) * Math.min(1, t / 0.15);
    let v = 0;
    for (let k = 1; k <= 9; k += 2) {
      if (k * freq > 15000) break;
      v += (Math.sin(TAU * k * freq * vib * t) / k) * Math.exp(-t * (2 + k * 1.2));
    }
    const env = Math.min(1, t / 0.004) * (t < dur ? 1 : Math.exp(-(t - dur) / 0.06));
    b[i] = v * env * 0.75;
  }
  return b;
}

/** pad：每个音 3 个失谐锯齿，低通。 */
function pad(notes, dur, cutoff, {attack = 0.35, release = 0.6} = {}) {
  const b = len(dur + release);
  const oscs = [];
  for (const m of notes) for (const d of [-0.11, 0, 0.12]) oscs.push(sawOsc(mtof(m) * Math.pow(2, d / 12)));
  const sub = sawOsc(mtof(notes[0] - 12));
  const lp1 = new Biquad('lp', cutoff, 0.8);
  const lp2 = new Biquad('lp', cutoff, 0.6);
  for (let i = 0; i < b.length; i++) {
    const t = i / SR;
    let v = 0;
    for (const o of oscs) v += o();
    v = v / oscs.length + 0.35 * sub();
    const env = Math.min(1, t / attack) * (t < dur ? 1 : Math.exp(-(t - dur) / (release / 3)));
    b[i] = lp2.run(lp1.run(v)) * env;
  }
  return b;
}

/** 锯齿贝斯：锯齿 + 次低音正弦，低通。 */
function bass(midi, dur, cutoff = 520) {
  const b = len(dur + 0.05);
  const f = mtof(midi);
  const o1 = sawOsc(f);
  const o2 = sawOsc(f * 1.006);
  const lp = new Biquad('lp', cutoff, 1.1);
  let ph = 0;
  for (let i = 0; i < b.length; i++) {
    const t = i / SR;
    ph += (TAU * f) / SR;
    const env = Math.min(1, t / 0.005) * (t < dur ? 1 : Math.exp(-(t - dur) / 0.015));
    b[i] = (lp.run(0.5 * (o1() + o2())) * 0.8 + 0.6 * Math.sin(ph)) * env;
  }
  return b;
}

/** 冲击：低频轰击 + 低通噪声。big=true 为收尾的大冲击。 */
function impact(big = false) {
  const dur = big ? 4.5 : 1.6;
  const b = len(dur);
  const lp = new Biquad('lp', big ? 2600 : 3200, 0.7);
  let ph = 0;
  for (let i = 0; i < b.length; i++) {
    const t = i / SR;
    const f = (big ? 26 : 34) + (big ? 90 : 110) * Math.exp(-t * 9);
    ph += (TAU * f) / SR;
    const boom = Math.sin(ph) * Math.exp(-t / (big ? 1.1 : 0.45));
    const hiss = lp.run(noise()) * Math.exp(-t / (big ? 0.9 : 0.25));
    b[i] = Math.tanh(1.4 * boom) * 0.9 + hiss * (big ? 0.7 : 0.5);
  }
  return b;
}

/** 白噪声上升音：带通中心频率指数上扫，音量渐强。 */
function riser(dur, f0 = 300, f1 = 9000) {
  const b = len(dur);
  const bp = new Biquad('bp', f0, 1.4);
  const s = sawOsc(80);
  const lp = new Biquad('lp', 400, 1);
  for (let i = 0; i < b.length; i++) {
    const x = i / b.length;
    if (i % 32 === 0) {
      bp.set(f0 * Math.pow(f1 / f0, x), 1.4);
      lp.set(300 * Math.pow(20, x), 1.5);
    }
    const env = Math.pow(x, 2.2);
    b[i] = (bp.run(noise()) * 1.4 + 0.25 * lp.run(s())) * env;
  }
  return b;
}

// ───────────────────────── 编曲 ─────────────────────────
const {pain, intro, showcase, outro} = SECTIONS;
const kickTimes = [];

// —— 痛点 ——
const gapStart = barT(pain.to) - BEAT; // 第 8 小节前最后一拍静音
for (let bar = pain.from; bar < pain.to; bar++) {
  const t0 = barT(bar);
  const ch = chordAt(bar);
  const k = (bar - pain.from) / Math.max(1, pain.to - pain.from);
  // 低沉 pad，滤波随段落慢慢打开
  const isLast = bar === pain.to - 1;
  play(t0, pad(ch.pad.map((m) => m - 12), isLast ? BAR - BEAT : BAR, 380 + 520 * k, {attack: bar === pain.from ? 1.2 : 0.4, release: isLast ? 0.06 : 0.7}), {to: dry, gain: 0.5, rev: 0.35});
  // 心跳底鼓：第 2 小节起，每小节第 1、3 拍（咚-咚）
  if (bar >= pain.from + 1) {
    for (const b of [0, 2]) {
      const t = t0 + b * BEAT;
      if (t >= gapStart) continue;
      play(t, kick({f0: 95, f1: 40, sweep: 22, decay: 0.22, click: 0.05}), {gain: 0.85, rev: 0.12});
      play(t + 0.19, kick({f0: 80, f1: 38, sweep: 22, decay: 0.16, click: 0.02}), {gain: 0.45, rev: 0.1});
    }
  }
  // 滴答：每拍一次；最后两小节改成八分音符
  const tickStep = bar >= pain.to - 2 ? BEAT / 2 : BEAT;
  for (let t = t0; t < t0 + BAR - 1e-6; t += tickStep) {
    if (t >= gapStart) continue;
    const alt = Math.round((t - t0) / tickStep) % 2;
    play(t, tick(alt ? 2600 : 3500), {gain: 0.22, pan: alt ? 0.35 : -0.35, dly: 0.25});
  }
}
// 最后两小节：白噪声上升 + 加速军鼓滚奏
{
  const r0 = barT(pain.to - 2);
  play(r0, riser(gapStart - r0), {gain: 0.38, rev: 0.25});
  let t = r0;
  while (t < gapStart - 1e-6) {
    const x = (t - r0) / (gapStart - r0);
    play(t, snare(0.08), {gain: 0.18 + 0.5 * x * x, pan: (rnd() - 0.5) * 0.3, rev: 0.12});
    t += x < 0.55 ? BEAT / 2 : x < 0.85 ? BEAT / 4 : BEAT / 8;
  }
}

// —— 介绍 + 展示（drop） ——
function drumsAndBass(bar, hi) {
  const t0 = barT(bar);
  const ch = chordAt(bar);
  // 四拍底鼓
  for (let b = 0; b < 4; b++) {
    const t = t0 + b * BEAT;
    play(t, kick(), {gain: 0.95});
    kickTimes.push(t);
  }
  // 2、4 拍拍手
  for (const b of [1, 3]) play(t0 + b * BEAT, clap(), {gain: 0.42, rev: 0.22});
  // 踩镲：介绍段反拍，展示段十六分
  if (!hi) {
    for (let b = 0; b < 4; b++) play(t0 + b * BEAT + BEAT / 2, hat(0.045), {gain: 0.3, pan: 0.25});
  } else {
    for (let s = 0; s < 16; s++) {
      const acc = s % 4 === 2 ? 1 : s % 2 === 1 ? 0.55 : 0.4;
      play(t0 + (s * BEAT) / 4, hat(s % 4 === 2 ? 0.05 : 0.025), {gain: 0.3 * acc, pan: s % 2 ? 0.3 : -0.15});
    }
  }
  // 侧链锯齿贝斯：八分音符，靠侧链做出抽吸感
  for (let e = 0; e < 8; e++) {
    const m = ch.bass + 12 + (e === 7 ? 12 : 0);
    play(t0 + (e * BEAT) / 2, bass(m, BEAT / 2 - 0.02, hi ? 720 : 560), {to: duckBus, gain: 0.42});
  }
  // pad 垫底（较亮、较轻）
  play(t0, pad(ch.pad, BAR, hi ? 2200 : 1500, {attack: 0.05, release: 0.4}), {to: duckBus, gain: 0.26, rev: 0.25});
  // 拨弦琶音：十六分
  const pat = [0, 1, 2, 1, 3, 2, 1, 2, 0, 1, 2, 3, 2, 1, 2, 1];
  for (let s = 0; s < 16; s++) {
    const m = ch.arp[pat[s]] - 12;
    play(t0 + (s * BEAT) / 4, pluck(mtof(m), 0.4, hi ? 1.3 : 1), {to: duckBus, gain: hi ? 0.14 : 0.2, pan: s % 2 ? 0.4 : -0.4, dly: 0.35, rev: 0.15});
  }
}

for (let bar = intro.from; bar < intro.to; bar++) {
  drumsAndBass(bar, false);
  // 介绍段最后两拍：军鼓过门
  if (bar === intro.to - 1) {
    for (let s = 8; s < 16; s++) play(barT(bar) + (s * BEAT) / 4, snare(0.07), {gain: 0.15 + 0.03 * (s - 8), rev: 0.15});
  }
}
// drop 开场的冲击
play(barT(intro.from), impact(false), {gain: 0.55, rev: 0.5});

// 主旋律（展示段）：高八度琶音式旋律，每小节 8 个八分音符
const MELODY = [
  [3, 2, 1, 2, 0, 1, 2, 1],
  [2, 3, 2, 1, 0, 1, 2, 3],
  [3, 2, 1, 0, 1, 2, 3, 2],
  [1, 2, 3, 2, 1, 0, 1, 2],
];
for (let bar = showcase.from; bar < showcase.to; bar++) {
  const t0 = barT(bar);
  drumsAndBass(bar, true);
  // 每小节开头一声冲击（画面每小节一切）
  play(t0, impact(false), {gain: 0.42, rev: 0.45});
  const ch = chordAt(bar);
  const mel = MELODY[(bar - showcase.from) % MELODY.length];
  for (let e = 0; e < 8; e++) {
    const m = ch.arp[mel[e]] + 12;
    play(t0 + (e * BEAT) / 2, lead(mtof(m), e === 7 ? 0.2 : 0.18), {to: duckBus, gain: 0.16, pan: 0.1, dly: 0.45, rev: 0.25});
  }
}
// 展示段最后两拍：上升音过渡到收尾
{
  const r1 = barT(showcase.to);
  play(r1 - BEAT * 2, riser(BEAT * 2, 600, 10000), {gain: 0.28, rev: 0.2});
}

// —— 收尾 ——
{
  const t0 = barT(outro.from);
  play(t0, impact(true), {gain: 0.85, rev: 0.9});
  play(t0, kick({f0: 140, f1: 34, decay: 0.6, dur: 1.2}), {gain: 0.9});
  const ch = chordAt(outro.from);
  const padLen = barT(outro.to) - t0;
  play(t0, pad(ch.pad, padLen, 1600, {attack: 0.02, release: TOTAL_SECONDS - barT(outro.to) - 0.2}), {gain: 0.42, rev: 0.6});
  play(t0, pad([ch.pad[0] - 12, ch.pad[2] - 12], padLen, 700, {attack: 0.02, release: TOTAL_SECONDS - barT(outro.to) - 0.2}), {gain: 0.3, rev: 0.4});
  // 一个长音主题音，带延迟回声
  play(t0, lead(mtof(ch.arp[3] + 12), 0.9), {gain: 0.16, dly: 0.6, rev: 0.6});
  play(t0 + BEAT * 3, pluck(mtof(ch.arp[2] + 12), 1.4, 1.5), {gain: 0.16, dly: 0.6, rev: 0.6});
}

// ───────────────────────── 侧链 ─────────────────────────
{
  const duck = new Float32Array(N).fill(1);
  for (const tk of kickTimes) {
    const i0 = Math.round(tk * SR);
    const n = Math.round(0.24 * SR);
    for (let i = 0; i < n && i0 + i < N; i++) {
      const x = i / n;
      const g = 0.12 + 0.88 * (x * x * (3 - 2 * x));
      if (g < duck[i0 + i]) duck[i0 + i] = g;
    }
  }
  for (let i = 0; i < N; i++) {
    dry.L[i] += duckBus.L[i] * duck[i];
    dry.R[i] += duckBus.R[i] * duck[i];
  }
}

// ───────────────────────── 延迟（附点八分、乒乓） ─────────────────────────
{
  const d = Math.round(BEAT * 0.75 * SR);
  const fb = 0.38;
  const bL = new Float32Array(d);
  const bR = new Float32Array(d);
  const lpL = new Biquad('lp', 3500);
  const lpR = new Biquad('lp', 3500);
  let p = 0;
  for (let i = 0; i < N; i++) {
    const oL = bL[p];
    const oR = bR[p];
    bL[p] = lpL.run(dlySend.L[i] * 0.5 + dlySend.R[i] * 0.5 + oR * fb);
    bR[p] = lpR.run(oL * fb);
    p = (p + 1) % d;
    dry.L[i] += oL * 0.5;
    dry.R[i] += oR * 0.5;
    revSend.L[i] += (oL + oR) * 0.1;
    revSend.R[i] += (oL + oR) * 0.1;
  }
}

// ───────────────────────── 混响（Freeverb 简化版） ─────────────────────────
{
  const combD = [1116, 1188, 1277, 1356, 1422, 1491, 1557, 1617];
  const apD = [556, 441, 341, 225];
  const mk = (spread) => ({
    combs: combD.map((n) => ({buf: new Float32Array(n + spread), p: 0, f: 0})),
    aps: apD.map((n) => ({buf: new Float32Array(n + spread), p: 0})),
  });
  const chans = [mk(0), mk(23)];
  const room = 0.86;
  const damp = 0.25;
  const pre = new Biquad('hp', 180);
  for (let i = 0; i < N; i++) {
    const x = pre.run((revSend.L[i] + revSend.R[i]) * 0.5) * 0.03;
    for (let c = 0; c < 2; c++) {
      const ch = chans[c];
      let out = 0;
      for (const cb of ch.combs) {
        const y = cb.buf[cb.p];
        cb.f = y * (1 - damp) + cb.f * damp;
        cb.buf[cb.p] = x + cb.f * room;
        cb.p = (cb.p + 1) % cb.buf.length;
        out += y;
      }
      for (const ap of ch.aps) {
        const b = ap.buf[ap.p];
        ap.buf[ap.p] = out + b * 0.5;
        out = b - out;
        ap.p = (ap.p + 1) % ap.buf.length;
      }
      (c === 0 ? dry.L : dry.R)[i] += out;
    }
  }
}

// ───────────────────────── 总线自动化：留空拍、结尾衰减 ─────────────────────────
function applyGates() {
  const g0 = Math.round(gapStart * SR);
  const g1 = Math.round(barT(intro.from) * SR);
  const ramp = Math.round(0.012 * SR);
  for (let i = g0 - ramp; i < g1; i++) {
    const g = i < g0 ? (g0 - i) / ramp : 0;
    dry.L[i] *= g;
    dry.R[i] *= g;
  }
  // 第 30 小节后自然衰减，最后 0.3 秒完全静音
  const f0 = Math.round(barT(outro.to) * SR);
  const f1 = N - Math.round(0.3 * SR);
  for (let i = f0; i < N; i++) {
    const x = Math.min(1, (i - f0) / Math.max(1, f1 - f0));
    const g = i >= f1 ? 0 : Math.pow(1 - x, 2.2);
    dry.L[i] *= g;
    dry.R[i] *= g;
  }
}
applyGates();

// ───────────────────────── 母带：限幅 + 软削波 + 归一化 ─────────────────────────
{
  // 去直流
  let zl = 0;
  let zr = 0;
  let pl = 0;
  let pr = 0;
  for (let i = 0; i < N; i++) {
    const l = dry.L[i];
    const r = dry.R[i];
    zl = l - pl + 0.9995 * zl;
    zr = r - pr + 0.9995 * zr;
    pl = l;
    pr = r;
    dry.L[i] = zl;
    dry.R[i] = zr;
  }
  // 响度：按 0.4 秒块的门限 RMS 把整体定在约 -13.5 dBFS RMS（约 -14 LUFS），再交给限幅器管峰值
  const blk = Math.round(0.4 * SR);
  const rmsList = [];
  for (let i = 0; i + blk <= N; i += blk) {
    let s2 = 0;
    for (let j = i; j < i + blk; j++) s2 += dry.L[j] * dry.L[j] + dry.R[j] * dry.R[j];
    rmsList.push(Math.sqrt(s2 / (2 * blk)));
  }
  const loudest = Math.max(...rmsList);
  const gated = rmsList.filter((r) => r > loudest * 0.1);
  const rmsG = Math.sqrt(gated.reduce((a, r) => a + r * r, 0) / Math.max(1, gated.length));
  const TARGET_RMS = Math.pow(10, -13.5 / 20);
  const pre = TARGET_RMS / Math.max(1e-6, rmsG);
  // 前视限幅：5ms 前视，快起慢放
  const thr = 0.86; // ≈ -1.3 dBFS
  const look = Math.round(0.005 * SR);
  const rel = Math.exp(-1 / (0.12 * SR));
  const need = new Float32Array(N);
  for (let i = 0; i < N; i++) {
    const a = Math.max(Math.abs(dry.L[i]), Math.abs(dry.R[i])) * pre;
    need[i] = a > thr ? thr / a : 1;
  }
  // 窗口最小值（前视）
  const gmin = new Float32Array(N);
  {
    const dq = [];
    let head = 0;
    for (let i = 0; i < N + look; i++) {
      if (i < N) {
        while (dq.length > head && need[dq[dq.length - 1]] >= need[i]) dq.pop();
        dq.push(i);
      }
      const k = i - look;
      if (k >= 0) {
        while (dq[head] < k) head++;
        gmin[k] = need[dq[head]];
      }
    }
  }
  let g = 1;
  let peakOut = 0;
  for (let i = 0; i < N; i++) {
    const target = gmin[i];
    g = target < g ? target : target + (g - target) * rel;
    const l = Math.tanh(dry.L[i] * pre * g * 1.05) / 1.05;
    const r = Math.tanh(dry.R[i] * pre * g * 1.05) / 1.05;
    dry.L[i] = l;
    dry.R[i] = r;
    peakOut = Math.max(peakOut, Math.abs(l), Math.abs(r));
  }
  // 保险：峰值不超过 -1 dBFS
  if (peakOut > 0.89) {
    const norm = 0.89 / peakOut;
    for (let i = 0; i < N; i++) {
      dry.L[i] *= norm;
      dry.R[i] *= norm;
    }
  }
  console.log(`gated RMS ${(20 * Math.log10(rmsG * pre)).toFixed(1)} dBFS, peak ${(20 * Math.log10(Math.min(peakOut, 0.89))).toFixed(1)} dBFS`);
}
applyGates(); // 母带之后再做一次，保证留空拍与结尾是真正的静音

// ───────────────────────── 写 WAV ─────────────────────────
function writeWav(file, L, R) {
  const data = Buffer.alloc(N * 4);
  for (let i = 0; i < N; i++) {
    data.writeInt16LE(Math.max(-32767, Math.min(32767, Math.round(L[i] * 32767))), i * 4);
    data.writeInt16LE(Math.max(-32767, Math.min(32767, Math.round(R[i] * 32767))), i * 4 + 2);
  }
  const h = Buffer.alloc(44);
  h.write('RIFF', 0);
  h.writeUInt32LE(36 + data.length, 4);
  h.write('WAVE', 8);
  h.write('fmt ', 12);
  h.writeUInt32LE(16, 16);
  h.writeUInt16LE(1, 20); // PCM
  h.writeUInt16LE(2, 22); // stereo
  h.writeUInt32LE(SR, 24);
  h.writeUInt32LE(SR * 4, 28);
  h.writeUInt16LE(4, 32);
  h.writeUInt16LE(16, 34);
  h.write('data', 36);
  h.writeUInt32LE(data.length, 40);
  fs.mkdirSync(path.dirname(file), {recursive: true});
  fs.writeFileSync(file, Buffer.concat([h, data]));
}

const here = path.dirname(fileURLToPath(import.meta.url));
const out = process.argv[2] ?? path.join(here, '..', 'public', 'music.wav');
writeWav(out, dry.L, dry.R);
console.log(`music → ${out}  (${TOTAL_SECONDS}s, ${SR}Hz, 16bit stereo, ${BPM} BPM)`);
