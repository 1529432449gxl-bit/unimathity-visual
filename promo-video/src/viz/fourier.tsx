import React from 'react';
import {C} from '../core/theme';
import {clamp, easeOutBack, easeOutCubic, seg} from '../core/time';
import type {VizDef, VizProps} from './types';
import {beatPulse, Glow, pathOf, steps, useUid} from './lib';

const COUNTS = [1, 2, 3, 4, 5, 6, 8, 10];
const WAVE_A0 = 1.9; // 波形起点（以振幅 A 为单位）
const WAVE_L = 4.2;
const SPAN_A = [-1.45, WAVE_A0 + WAVE_L + 0.1];
const SPAN_B = 1.45;

const Fourier: React.FC<VizProps> = ({w, h, t, frame}) => {
  const uid = useUid('fou');
  const S = Math.min(w, h) / 900;
  const pulse = beatPulse(frame);
  const landscape = w >= h * 1.05;
  const lenA = SPAN_A[1] - SPAN_A[0];
  // 振幅 A（像素）
  const A = landscape ? Math.min((w * 0.92) / lenA, (h * 0.86) / (2 * SPAN_B)) : Math.min((h * 0.92) / lenA, (w * 0.86) / (2 * SPAN_B));
  const midA = (SPAN_A[0] + SPAN_A[1]) / 2;
  // (a, b)：a 沿时间轴，b 为信号轴
  const P = (a: number, b: number): [number, number] =>
    landscape ? [w / 2 + (a - midA) * A, h / 2 - b * A] : [w / 2 + b * A, h / 2 + (a - midA) * A];

  const st = seg(t, 0.04, 0.9);
  const {i: si, f: lf} = steps(st, COUNTS.length);
  const n = COUNTS[si];
  const prevN = si > 0 ? COUNTS[si - 1] : 0;
  const grow = easeOutBack(seg(lf, 0, 0.45), 2);
  const weights = Array.from({length: n}, (_, j) => (j < prevN ? 1 : Math.max(0, grow)));
  const amp = (j: number) => (4 / (Math.PI * (2 * j + 1))) * weights[j];
  const appear = easeOutCubic(seg(t, 0, 0.06));

  const theta = (2 * Math.PI * frame) / 60 + 0.3;
  // 本轮链
  const circles: React.ReactNode[] = [];
  let a = 0;
  let b = 0;
  for (let j = 0; j < n; j++) {
    const k = 2 * j + 1;
    const r = amp(j);
    const na = a + r * Math.cos(k * theta);
    const nb = b + r * Math.sin(k * theta);
    const [cx, cy] = P(a, b);
    const [ex, ey] = P(na, nb);
    const newest = j >= prevN && si > 0;
    circles.push(
      <g key={j}>
        <circle cx={cx} cy={cy} r={Math.max(0, r * A)} fill="none" stroke={newest ? C.orange : C.sky} strokeOpacity={newest ? 0.9 : 0.4} strokeWidth={(newest ? 2.6 : 1.8) * S} />
        <line x1={cx} y1={cy} x2={ex} y2={ey} stroke={newest ? C.orange : C.sky} strokeWidth={2.6 * S} strokeLinecap="round" />
      </g>,
    );
    a = na;
    b = nb;
  }
  const tip = P(a, b);

  // 波形：u 处对应 θ - ωu 时刻的信号
  const sig = (phi: number) => {
    let y = 0;
    for (let j = 0; j < n; j++) y += amp(j) * Math.sin((2 * j + 1) * phi);
    return y;
  };
  const omega = (2 * Math.PI) / (WAVE_L / 2);
  const wave: [number, number][] = [];
  const target: [number, number][] = [];
  const M = 360;
  for (let i = 0; i <= M; i++) {
    const u = (WAVE_L * i) / M;
    const phi = theta - omega * u;
    wave.push(P(WAVE_A0 + u, sig(phi)));
  }
  // 方波目标（虚线）
  const sq = (phi: number) => (Math.sin(phi) >= 0 ? 1 : -1);
  let prev = sq(theta);
  target.push(P(WAVE_A0, prev));
  for (let i = 1; i <= M; i++) {
    const u = (WAVE_L * i) / M;
    const v = sq(theta - omega * u);
    if (v !== prev) target.push(P(WAVE_A0 + u, prev));
    target.push(P(WAVE_A0 + u, v));
    prev = v;
  }
  const w0 = P(WAVE_A0, sig(theta));
  const axis0 = P(WAVE_A0 - 0.1, 0);
  const axis1 = P(WAVE_A0 + WAVE_L, 0);

  return (
    <svg width={w} height={h}>
      <defs>
        <Glow id={uid + 'g'} w={w} h={h} r={4.5 * S} strength={2} />
        <Glow id={uid + 's'} w={w} h={h} r={2.2 * S} />
      </defs>
      <g opacity={appear}>
        <line x1={axis0[0]} y1={axis0[1]} x2={axis1[0]} y2={axis1[1]} stroke={C.gray} strokeWidth={2 * S} opacity={0.5} />
        <path d={pathOf(target)} fill="none" stroke={C.gray} strokeWidth={2 * S} strokeDasharray={`${7 * S} ${7 * S}`} opacity={0.55} />
        <g filter={`url(#${uid}s)`}>{circles}</g>
        <line x1={tip[0]} y1={tip[1]} x2={w0[0]} y2={w0[1]} stroke={C.sky} strokeWidth={1.8 * S} strokeDasharray={`${5 * S} ${6 * S}`} opacity={0.7} />
        <path d={pathOf(wave)} fill="none" stroke={C.orange} strokeWidth={(4.5 + 1.5 * pulse) * S} strokeLinejoin="round" filter={`url(#${uid}g)`} />
        <circle cx={tip[0]} cy={tip[1]} r={(7 + 3 * pulse) * S} fill={C.ink} filter={`url(#${uid}g)`} />
        <circle cx={w0[0]} cy={w0[1]} r={(7 + 3 * pulse) * S} fill={C.orange} filter={`url(#${uid}g)`} opacity={clamp(appear * 2)} />
      </g>
    </svg>
  );
};

export const fourier: VizDef = {
  id: 'fourier',
  title: '傅里叶级数',
  course: '数学分析',
  formula: String.raw`f(x)=\frac{4}{\pi}\sum_{k\ \mathrm{odd}}\frac{\sin kx}{k}`,
  component: Fourier,
};
