import React from 'react';
import {C} from '../core/theme';
import {easeOutCubic, seg} from '../core/time';
import type {VizDef, VizProps} from './types';
import {beatPulse, fitBox, Glow, pathOf, SoftRectMask, steps, useUid} from './lib';

const XR = 7.4;
const YR = 2.5;
const ORDERS = [1, 3, 5, 7, 9, 11, 13, 15, 17];

const poly = (x: number, n: number) => {
  let term = x;
  let sum = x;
  for (let k = 3; k <= n; k += 2) {
    term *= (-x * x) / ((k - 1) * k);
    sum += term;
  }
  return sum;
};

const Taylor: React.FC<VizProps> = ({w, h, t, frame}) => {
  const uid = useUid('tay');
  const S = Math.min(w, h) / 900;
  const pulse = beatPulse(frame);
  const box = fitBox(w, h, 1.6, 2.6, 0.05);
  const X = (x: number) => box.x + ((x + XR) / (2 * XR)) * box.w;
  const Y = (y: number) => box.y + box.h / 2 - (Math.max(-8, Math.min(8, y)) / (2 * YR)) * box.h;
  const draw = easeOutCubic(seg(t, 0, 0.1));
  const st = seg(t, 0.1, 0.92);
  const {i: cur, f: lf} = steps(st, ORDERS.length);
  const active = st > 0;

  const curve = (fn: (x: number) => number, x0: number, x1: number, n = 260) => {
    const pts: [number, number][] = [];
    for (let i = 0; i <= n; i++) {
      const x = x0 + ((x1 - x0) * i) / n;
      pts.push([X(x), Y(fn(x))]);
    }
    return pathOf(pts);
  };

  const sinD = curve(Math.sin, -XR, XR);
  const polys: React.ReactNode[] = [];
  if (active) {
    for (let j = Math.max(0, cur - 3); j <= cur; j++) {
      const n = ORDERS[j];
      const isCur = j === cur;
      const ext = isCur ? XR * easeOutCubic(seg(lf, 0, 0.55)) : XR;
      if (ext <= 0.01) continue;
      const age = cur - j;
      polys.push(
        <path
          key={n}
          d={curve((x) => poly(x, n), -ext, ext, 200)}
          fill="none"
          stroke={isCur ? C.orange : C.blue}
          strokeWidth={(isCur ? 5 + 2 * pulse : 2.5) * S}
          strokeLinecap="round"
          opacity={isCur ? 1 : 0.55 - age * 0.13}
        />,
      );
    }
  }
  // 展开中心的点
  const c0 = active ? 1 : draw;

  return (
    <svg width={w} height={h}>
      <defs>
        <Glow id={uid + 'g'} w={w} h={h} r={4.5 * S} strength={2} />
        <clipPath id={uid + 'c'}>
          <rect x={box.x - 10 * S} y={box.y} width={box.w + 20 * S} height={box.h} />
        </clipPath>
        <SoftRectMask id={uid + 'k'} x={box.x - 60 * S} y={box.y} w={box.w + 120 * S} h={box.h} m={70 * S} />
      </defs>
      <g stroke={C.gray} strokeWidth={2 * S} opacity={0.55}>
        <line x1={box.x} y1={Y(0)} x2={box.x + box.w} y2={Y(0)} />
        <line x1={X(0)} y1={box.y} x2={X(0)} y2={box.y + box.h} />
      </g>
      <g stroke={C.gray} strokeWidth={1.2 * S} opacity={0.22} strokeDasharray={`${5 * S} ${7 * S}`}>
        {[-2, -1, 1, 2].map((k) => (
          <line key={k} x1={X(k * Math.PI)} y1={box.y} x2={X(k * Math.PI)} y2={box.y + box.h} />
        ))}
      </g>
      <g clipPath={`url(#${uid}c)`} mask={`url(#${uid}k)`}>
        <path d={sinD} fill="none" stroke={C.sky} strokeWidth={(5 + pulse) * S} strokeLinecap="round" pathLength={1} strokeDasharray={`${draw} 1`} filter={`url(#${uid}g)`} />
        <g filter={`url(#${uid}g)`}>{polys}</g>
      </g>
      <circle cx={X(0)} cy={Y(0)} r={(7 + 4 * pulse) * S} fill={C.orange} opacity={c0} filter={`url(#${uid}g)`} />
    </svg>
  );
};

export const taylor: VizDef = {
  id: 'taylor',
  title: '泰勒展开',
  course: '微积分',
  formula: String.raw`\sin x=\sum_{k\ge0}\frac{(-1)^k x^{2k+1}}{(2k+1)!}`,
  component: Taylor,
};
