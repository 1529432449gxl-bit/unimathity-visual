import React, {useId} from 'react';
import {BEAT, clamp} from '../core/time';

/** viz 内部的小工具：唯一 id、光晕滤镜、拍点脉冲、取景框、路径拼接。 */

/** 每个实例唯一、可用于 url(#...) 的 id 前缀（同屏多个 viz 不冲突）。 */
export const useUid = (name: string) => `${name}${useId().replace(/[^a-zA-Z0-9]/g, '')}`;

/**
 * 光晕滤镜：模糊副本叠在原图下面。用 userSpaceOnUse 覆盖整张画布，避免细直线（包围盒高度为 0）被滤镜吃掉。
 * strength>1 时再叠一层更大的模糊。
 */
export const Glow: React.FC<{id: string; w: number; h: number; r: number; strength?: number}> = ({id, w, h, r, strength = 1}) => (
  <filter id={id} filterUnits="userSpaceOnUse" x={-w * 0.25} y={-h * 0.25} width={w * 1.5} height={h * 1.5} colorInterpolationFilters="sRGB">
    <feGaussianBlur in="SourceGraphic" stdDeviation={r} result="b1" />
    <feGaussianBlur in="SourceGraphic" stdDeviation={r * 3} result="b2" />
    <feMerge>
      {strength > 1 ? <feMergeNode in="b2" /> : null}
      <feMergeNode in="b2" />
      <feMergeNode in="b1" />
      {strength > 1.5 ? <feMergeNode in="b1" /> : null}
      <feMergeNode in="SourceGraphic" />
    </feMerge>
  </filter>
);

/** 拍点脉冲：每拍起点为 1，随后指数衰减。 */
export const beatPulse = (frame: number) => Math.exp(-((((frame % BEAT) + BEAT) % BEAT) / BEAT) * 5);

/** 取景：在 w×h 中居中放一个宽高比在 [amin, amax] 之间的框，留 pad（相对短边）。 */
export function fitBox(w: number, h: number, amin: number, amax: number, pad = 0.06) {
  const p = Math.min(w, h) * pad;
  const aw = w - 2 * p;
  const ah = h - 2 * p;
  const a = clamp(aw / ah, amin, amax);
  let bw = aw;
  let bh = aw / a;
  if (bh > ah) {
    bh = ah;
    bw = ah * a;
  }
  return {x: (w - bw) / 2, y: (h - bh) / 2, w: bw, h: bh};
}

/** 等比映射：把世界坐标区域 [x0,x1]×[y0,y1] 居中放进 w×h（y 轴向上）。 */
export function fitWorld(w: number, h: number, x0: number, x1: number, y0: number, y1: number, pad = 0.05) {
  const p = Math.min(w, h) * pad;
  const s = Math.min((w - 2 * p) / (x1 - x0), (h - 2 * p) / (y1 - y0));
  const cx = (x0 + x1) / 2;
  const cy = (y0 + y1) / 2;
  return {s, X: (x: number) => w / 2 + (x - cx) * s, Y: (y: number) => h / 2 - (y - cy) * s};
}

/** 点列 -> path d。 */
export const pathOf = (pts: [number, number][], close = false) => {
  if (pts.length === 0) return '';
  let d = `M${pts[0][0].toFixed(1)},${pts[0][1].toFixed(1)}`;
  for (let i = 1; i < pts.length; i++) d += `L${pts[i][0].toFixed(1)},${pts[i][1].toFixed(1)}`;
  return close ? d + 'Z' : d;
};

/** 两段之间的分段进度：把 t 平均分成 n 档，返回 {i: 当前档, f: 档内进度}。 */
export const steps = (t: number, n: number) => {
  const x = clamp(t) * n;
  const i = Math.min(n - 1, Math.floor(x));
  return {i, f: clamp(x - i)};
};

export const smooth = (x: number) => {
  const v = clamp(x);
  return v * v * (3 - 2 * v);
};
