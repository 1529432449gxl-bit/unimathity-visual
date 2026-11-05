import React from 'react';
import {C} from '../core/theme';
import {clamp, easeOutBack, easeOutCubic, seg} from '../core/time';
import type {VizDef, VizProps} from './types';
import {beatPulse, fitBox, Glow, pathOf, steps, useUid} from './lib';

const X0 = -0.3;
const X1 = 8.3;
const Y0 = -0.45;
const Y1 = 5.4;
const A = 0.6;
const B = 7.6;

const Riemann: React.FC<VizProps> = ({w, h, t, frame}) => {
  const uid = useUid('rie');
  const S = Math.min(w, h) / 900;
  const box = fitBox(w, h, 1.25, 1.85, 0.05);
  const X = (x: number) => box.x + ((x - X0) / (X1 - X0)) * box.w;
  const Y = (y: number) => box.y + box.h - ((y - Y0) / (Y1 - Y0)) * box.h;
  const wob = frame * 0.06;
  const f = (x: number) => 2.3 + 1.3 * Math.sin(0.85 * x - 0.6) + 0.55 * Math.sin(2.05 * x + 0.4) + 0.12 * x + 0.07 * Math.sin(wob + 1.3 * x);
  const pulse = beatPulse(frame);

  // 曲线
  const curvePts: [number, number][] = [];
  for (let i = 0; i <= 220; i++) {
    const x = X0 + 0.05 + ((X1 - X0 - 0.1) * i) / 220;
    curvePts.push([X(x), Y(f(x))]);
  }
  const curveD = pathOf(curvePts);
  const draw = easeOutCubic(seg(t, 0, 0.14));

  // 面积区域
  const areaPts: [number, number][] = [[X(A), Y(0)]];
  for (let i = 0; i <= 120; i++) {
    const x = A + ((B - A) * i) / 120;
    areaPts.push([X(x), Y(f(x))]);
  }
  areaPts.push([X(B), Y(0)]);
  const areaD = pathOf(areaPts, true);

  const tl = seg(t, 0.12, 0.84);
  const {i: lvl, f: lf} = steps(tl, 6);
  const finalA = seg(t, 0.82, 0.96);

  const rects = (n: number, grow: (j: number) => number, opacity: number, key: string) => {
    if (opacity <= 0.005) return null;
    const dx = (B - A) / n;
    const sw = Math.max(0.8, 2.6 - Math.log2(n) * 0.35) * S;
    return (
      <g key={key} opacity={opacity}>
        {Array.from({length: n}, (_, j) => {
          const xl = A + j * dx;
          const hgt = f(xl + dx / 2) * grow(j);
          const y = Y(Math.max(0, hgt));
          return <rect key={j} x={X(xl)} y={Math.min(y, Y(0))} width={X(xl + dx) - X(xl)} height={Math.abs(Y(0) - y)} fill={C.blue} fillOpacity={0.28 + 0.12 * pulse} stroke={C.sky} strokeWidth={sw} strokeOpacity={0.95} />;
        })}
        {n <= 16
          ? Array.from({length: n}, (_, j) => {
              const xm = A + (j + 0.5) * dx;
              const g = grow(j);
              return g > 0.9 ? <circle key={'p' + j} cx={X(xm)} cy={Y(f(xm))} r={(5 - Math.log2(n) * 0.6) * S * (1 + 0.4 * pulse)} fill={C.orange} /> : null;
            })
          : null}
      </g>
    );
  };

  const n = 2 << lvl;
  const cur = rects(
    n,
    (j) => {
      const d = (j / n) * 0.45;
      return tl <= 0 ? 0 : easeOutBack(seg(lf, d, d + 0.45), 2.2);
    },
    tl <= 0 ? 0 : 1 - 0.65 * finalA,
    'c' + n,
  );
  const prev = lvl > 0 ? rects(n / 2, () => 1, (1 - seg(lf, 0, 0.45)) * 0.7, 'p' + n) : null;

  return (
    <svg width={w} height={h} style={{overflow: 'visible'}}>
      <defs>
        <Glow id={uid + 'g'} w={w} h={h} r={4 * S} strength={2} />
        <Glow id={uid + 's'} w={w} h={h} r={2.5 * S} />
        <linearGradient id={uid + 'a'} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={C.orange} stopOpacity={0.85} />
          <stop offset="1" stopColor={C.orange} stopOpacity={0.15} />
        </linearGradient>
      </defs>
      {/* 坐标轴 */}
      <g stroke={C.gray} strokeWidth={2 * S} opacity={0.55 * draw + 0.15}>
        <line x1={X(X0)} y1={Y(0)} x2={X(X1)} y2={Y(0)} />
        <line x1={X(0)} y1={Y(Y0)} x2={X(0)} y2={Y(Y1)} />
      </g>
      <g stroke={C.gray} strokeWidth={1.5 * S} strokeDasharray={`${6 * S} ${6 * S}`} opacity={0.6 * draw}>
        <line x1={X(A)} y1={Y(0)} x2={X(A)} y2={Y(f(A)) - 20 * S} />
        <line x1={X(B)} y1={Y(0)} x2={X(B)} y2={Y(f(B)) - 20 * S} />
      </g>
      {/* 末尾：面积发光 */}
      {finalA > 0 ? <path d={areaD} fill={`url(#${uid}a)`} opacity={finalA * (0.75 + 0.25 * pulse)} filter={`url(#${uid}g)`} /> : null}
      <g filter={`url(#${uid}s)`}>
        {prev}
        {cur}
      </g>
      {/* 曲线 */}
      <path d={curveD} fill="none" stroke={C.sky} strokeWidth={(4.5 + 1.5 * pulse) * S} strokeLinecap="round" pathLength={1} strokeDasharray={`${draw} 1`} filter={`url(#${uid}g)`} />
      {finalA > 0 ? <path d={areaD} fill="none" stroke={C.orange} strokeWidth={3 * S} opacity={clamp(finalA * 1.5) * 0.9} filter={`url(#${uid}s)`} /> : null}
    </svg>
  );
};

export const riemann: VizDef = {
  id: 'riemann',
  title: '定积分的定义',
  course: '微积分',
  formula: String.raw`\int_a^b f(x)\,dx=\lim_{n\to\infty}\sum f(\xi_i)\Delta x_i`,
  component: Riemann,
};
