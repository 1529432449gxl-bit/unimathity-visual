/**
 * 全片统一的节拍网格。所有模块的时长都以「小节 / 拍」计，切点落在拍上，画面与音乐自然对齐。
 * 120 BPM、30 fps：1 拍 = 15 帧，1 小节 = 4 拍 = 60 帧 = 2 秒。
 */
export const FPS = 30;
export const BPM = 120;
export const BEAT = (FPS * 60) / BPM; // 15
export const BAR = BEAT * 4; // 60

export const beats = (n: number) => Math.round(n * BEAT);
export const bars = (n: number) => Math.round(n * BAR);

export const clamp = (x: number, a = 0, b = 1) => Math.min(b, Math.max(a, x));
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
/** 把 [a,b] 区间映射到 0..1 并截断。 */
export const seg = (t: number, a: number, b: number) => clamp((t - a) / (b - a));

export const easeOutCubic = (t: number) => 1 - Math.pow(1 - clamp(t), 3);
export const easeInOutCubic = (t: number) => {
  const x = clamp(t);
  return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
};
export const easeOutBack = (t: number, s = 1.70158) => {
  const x = clamp(t) - 1;
  return 1 + (s + 1) * x * x * x + s * x * x;
};
export const easeOutExpo = (t: number) => (t >= 1 ? 1 : 1 - Math.pow(2, -10 * clamp(t)));
