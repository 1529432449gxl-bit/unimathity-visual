import React from 'react';
import {C} from '../core/theme';
import {easeInOutCubic, easeOutCubic, seg} from '../core/time';
import type {VizDef, VizProps} from './types';
import {beatPulse, Glow, useUid} from './lib';

const N = 200;
const K0 = 2;
const K1 = 34;

/** k 随 t 前慢后快地增长，并在每个整数处略作停留（心形线 k=2、肾形线 k=3 都看得清）。 */
const kOf = (t: number) => {
  const u = seg(t, 0.06, 0.94);
  const raw = K0 + (K1 - K0) * Math.pow(u, 2.1);
  const n = Math.floor(raw);
  const fr = raw - n;
  return n + easeInOutCubic(fr) * 0.9 + fr * 0.1;
};

const ModCircle: React.FC<VizProps> = ({w, h, t, frame}) => {
  const uid = useUid('mod');
  const S = Math.min(w, h) / 900;
  const pulse = beatPulse(frame);
  const R = Math.min(w, h) * 0.44;
  const cx = w / 2;
  const cy = h / 2;
  const k = kOf(t);
  const rot = -Math.PI / 2 + frame * 0.003;
  const appear = easeOutCubic(seg(t, 0, 0.08));
  const P = (a: number) => [cx + R * Math.cos(a + rot), cy + R * Math.sin(a + rot)];

  let d = '';
  let d2 = '';
  const nShow = Math.round(N * appear);
  for (let i = 0; i < nShow; i++) {
    const a = (2 * Math.PI * i) / N;
    const [x1, y1] = P(a);
    const [x2, y2] = P(a * k);
    const piece = `M${x1.toFixed(1)},${y1.toFixed(1)}L${x2.toFixed(1)},${y2.toFixed(1)}`;
    if (i % 10 === 0) d2 += piece;
    else d += piece;
  }
  const dots: React.ReactNode[] = [];
  for (let i = 0; i < N; i += 2) {
    const [x, y] = P((2 * Math.PI * i) / N);
    dots.push(<circle key={i} cx={x} cy={y} r={(i % 10 === 0 ? 3.4 : 2.2) * S} fill={i % 10 === 0 ? C.orange : C.sky} />);
  }

  return (
    <svg width={w} height={h}>
      <defs>
        <Glow id={uid + 'g'} w={w} h={h} r={5 * S} strength={2} />
        <Glow id={uid + 's'} w={w} h={h} r={2 * S} />
      </defs>
      <circle cx={cx} cy={cy} r={R} fill="none" stroke={C.sky} strokeWidth={(3 + 1.5 * pulse) * S} opacity={0.7 * appear} filter={`url(#${uid}g)`} />
      <g filter={`url(#${uid}g)`} fill="none" strokeLinecap="round">
        <path d={d} stroke={C.sky} strokeWidth={1.4 * S} strokeOpacity={0.32 + 0.08 * pulse} />
        <path d={d2} stroke={C.orange} strokeWidth={1.6 * S} strokeOpacity={0.4 + 0.25 * pulse} />
      </g>
      <g opacity={appear} filter={`url(#${uid}s)`}>
        {dots}
      </g>
    </svg>
  );
};

export const modCircle: VizDef = {
  id: 'modCircle',
  title: '模乘圆',
  course: '数论',
  formula: String.raw`i\mapsto k\,i \bmod N`,
  component: ModCircle,
};
