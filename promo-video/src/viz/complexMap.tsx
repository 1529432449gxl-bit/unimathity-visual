import React from 'react';
import {C} from '../core/theme';
import {easeInOutCubic, easeOutCubic, lerp, seg} from '../core/time';
import type {VizDef, VizProps} from './types';
import {beatPulse, Glow, pathOf, useUid} from './lib';

/** w = (e^{sz} - 1)/s，s: 0 -> 1 时从恒等映射连续变成 e^z - 1。 */
const map = (x: number, y: number, s: number): [number, number] => {
  if (s < 1e-5) return [x, y];
  const r = Math.exp(s * x);
  return [(r * Math.cos(s * y) - 1) / s, (r * Math.sin(s * y)) / s];
};

const NV = 11; // 竖线条数 x ∈ [-1,1]
const NH = 17; // 横线条数 y ∈ [-π,π]
const SAMPLES = 90;

const ComplexMap: React.FC<VizProps> = ({w, h, t, frame}) => {
  const uid = useUid('cpx');
  const S = Math.min(w, h) / 900;
  const pulse = beatPulse(frame);
  const s = easeInOutCubic(seg(t, 0.16, 0.86));
  const grow = easeOutCubic(seg(t, 0, 0.16));
  // 取景：像的中心从 0 移到 -1，尺度固定
  const scale = (Math.min(w, h) * 0.9) / (2 * 3.3);
  const ccx = lerp(0, -1, s);
  const P = (p: [number, number]): [number, number] => [w / 2 + (p[0] - ccx) * scale, h / 2 - p[1] * scale];

  const vlines: string[] = [];
  for (let i = 0; i < NV; i++) {
    const x = -1 + (2 * i) / (NV - 1);
    const pts: [number, number][] = [];
    for (let j = 0; j <= SAMPLES; j++) {
      const y = -Math.PI + (2 * Math.PI * j) / SAMPLES;
      pts.push(P(map(x, y, s)));
    }
    vlines.push(pathOf(pts));
  }
  const hlines: string[] = [];
  for (let i = 0; i < NH; i++) {
    const y = -Math.PI + (2 * Math.PI * i) / (NH - 1);
    const pts: [number, number][] = [];
    for (let j = 0; j <= SAMPLES; j++) {
      const x = -1 + (2 * j) / SAMPLES;
      pts.push(P(map(x, y, s)));
    }
    hlines.push(pathOf(pts));
  }

  // 一个沿横线滑动的探针点，展示格点随映射移动
  const px = Math.sin(frame * 0.05) * 0.9;
  const py = Math.PI * 0.25;
  const probe = P(map(px, py, s));
  const sw = 2.6 * S;

  return (
    <svg width={w} height={h}>
      <defs>
        <Glow id={uid + 'g'} w={w} h={h} r={4 * S} strength={2} />
      </defs>
      <g fill="none" strokeLinecap="round" filter={`url(#${uid}g)`}>
        {hlines.map((d, i) => (
          <path key={'h' + i} d={d} pathLength={1} strokeDasharray={`${grow} 1`} stroke={C.orange} strokeWidth={i === (NH - 1) / 2 ? sw * 1.6 : sw} opacity={i === (NH - 1) / 2 ? 1 : 0.8} />
        ))}
        {vlines.map((d, i) => (
          <path key={'v' + i} d={d} pathLength={1} strokeDasharray={`${grow} 1`} stroke={C.sky} strokeWidth={i === (NV - 1) / 2 ? sw * 1.6 : sw} opacity={i === (NV - 1) / 2 ? 1 : 0.85} />
        ))}
        <circle cx={probe[0]} cy={probe[1]} r={(8 + 5 * pulse) * S} fill={C.ink} opacity={grow} />
      </g>
    </svg>
  );
};

export const complexMap: VizDef = {
  id: 'complexMap',
  title: '共形映射',
  course: '复变函数',
  formula: String.raw`w=e^{z}`,
  component: ComplexMap,
};
