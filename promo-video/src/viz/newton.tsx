import React from 'react';
import {C} from '../core/theme';
import {easeInOutCubic, easeOutBack, easeOutCubic, lerp, seg} from '../core/time';
import type {VizDef, VizProps} from './types';
import {beatPulse, fitBox, Glow, pathOf, SoftRectMask, steps, useUid} from './lib';

const f = (x: number) => x * x * x - x - 1;
const df = (x: number) => 3 * x * x - 1;
const X0 = 3.1;
const STEPS = 6;
const XS: number[] = [X0];
for (let k = 0; k < STEPS; k++) XS.push(XS[k] - f(XS[k]) / df(XS[k]));
const ROOT = 1.324717957;

type View = {cx: number; hw: number; cy: number; hh: number};
const VIEWS: View[] = XS.slice(0, STEPS).map((xk, k) => {
  if (k === 0) return {cx: 1.15, hw: 2.65, cy: 12, hh: 17.5};
  const xn = XS[k + 1];
  const hw = Math.max(0.014, 0.9 * (xk - xn) + 0.004);
  const cx = (xk + xn) / 2;
  const top = Math.max(f(xk), 0.04) * 1.35;
  const bot = -0.4 * Math.max(f(xk), 0.04);
  return {cx, hw, cy: (top + bot) / 2, hh: (top - bot) / 2};
});
const lerpView = (a: View, b: View, s: number): View => ({
  cx: lerp(a.cx, b.cx, s),
  hw: Math.exp(lerp(Math.log(a.hw), Math.log(b.hw), s)),
  cy: lerp(a.cy, b.cy, s),
  hh: Math.exp(lerp(Math.log(a.hh), Math.log(b.hh), s)),
});

const Newton: React.FC<VizProps> = ({w, h, t, frame}) => {
  const uid = useUid('nwt');
  const S = Math.min(w, h) / 900;
  const box = fitBox(w, h, 1.15, 1.8, 0.05);
  const pulse = beatPulse(frame);
  const draw = easeOutCubic(seg(t, 0, 0.1));
  const st = seg(t, 0.1, 0.94);
  const {i: k, f: lf} = steps(st, STEPS);
  const active = st > 0;

  // 镜头：每步后段平滑推近到下一步的取景
  const camS = easeInOutCubic(seg(lf, 0.62, 1));
  const view = k + 1 < STEPS ? lerpView(VIEWS[k], VIEWS[k + 1], active ? camS : 0) : VIEWS[k];
  // 末尾再推近一点并轻微呼吸
  const endZoom = seg(t, 0.94, 1);
  const vv: View = {...view, hw: view.hw * (1 - 0.3 * endZoom) * (1 + 0.01 * Math.sin(frame * 0.08)), hh: view.hh * (1 - 0.3 * endZoom)};
  const vx0 = vv.cx - vv.hw;
  const vx1 = vv.cx + vv.hw;
  const vy0 = vv.cy - vv.hh;
  const vy1 = vv.cy + vv.hh;
  const X = (x: number) => box.x + ((x - vx0) / (vx1 - vx0)) * box.w;
  const Y = (y: number) => box.y + box.h - ((y - vy0) / (vy1 - vy0)) * box.h;
  const cl = (v: number) => Math.max(-1e5, Math.min(1e5, v));

  const curve: [number, number][] = [];
  for (let i = 0; i <= 240; i++) {
    const x = vx0 - vv.hw * 0.05 + ((vx1 - vx0) * 1.1 * i) / 240;
    curve.push([cl(X(x)), cl(Y(f(x)))]);
  }

  const parts: React.ReactNode[] = [];
  const dots: React.ReactNode[] = [];
  for (let j = 0; j <= k; j++) {
    if (!active) break;
    if (j < k - 2) continue;
    const loc = j < k ? 1 : lf;
    const xj = XS[j];
    const fj = f(xj);
    const xn = XS[j + 1];
    const old = j < k;
    const vUp = easeOutCubic(seg(loc, 0, 0.22));
    const tan = easeOutCubic(seg(loc, 0.22, 0.55));
    const pop = seg(loc, 0.55, 0.72);
    // 竖线 x_k -> f(x_k)
    parts.push(
      <line key={'v' + j} x1={X(xj)} y1={Y(0)} x2={X(xj)} y2={cl(Y(fj * vUp))} stroke={C.sky} strokeWidth={2.5 * S} strokeDasharray={`${8 * S} ${7 * S}`} opacity={old ? 0.35 : 0.9} />,
    );
    // 切线：从切点向两侧伸出，落到 x 轴并略超出
    if (tan > 0) {
      const ext = 0.28 * (xj - xn);
      const xa = lerp(xj, xj + ext, tan);
      const xb = lerp(xj, xn - ext, tan);
      const ya = fj + df(xj) * (xa - xj);
      const yb = fj + df(xj) * (xb - xj);
      parts.push(
        <line key={'t' + j} x1={cl(X(xa))} y1={cl(Y(ya))} x2={cl(X(xb))} y2={cl(Y(yb))} stroke={C.orange} strokeWidth={(old ? 2.5 : 4 + 1.5 * pulse) * S} strokeLinecap="round" opacity={old ? 0.35 : 1} />,
      );
    }
    // 切点
    if (vUp > 0.95) dots.push(<circle key={'p' + j} cx={X(xj)} cy={cl(Y(fj))} r={(old ? 5 : 8 + 3 * pulse) * S} fill={C.sky} opacity={old ? 0.5 : 1} />);
    // 新的近似点落在 x 轴
    if (pop > 0) {
      const r = (old ? 6 : 10 + 4 * pulse) * S * easeOutBack(pop, 3);
      dots.push(<circle key={'x' + j} cx={X(xn)} cy={Y(0)} r={Math.max(0, r)} fill={C.orange} />);
    }
  }
  // 起点 x0
  if (active || draw > 0.9) dots.push(<circle key="x0" cx={X(XS[0])} cy={Y(0)} r={(k === 0 ? 10 : 6) * S} fill={C.orange} opacity={k <= 2 ? 1 : 0} />);

  const rootGlow = seg(t, 0.9, 1);

  return (
    <svg width={w} height={h}>
      <defs>
        <Glow id={uid + 'g'} w={w} h={h} r={4.5 * S} strength={2} />
        <Glow id={uid + 's'} w={w} h={h} r={2.5 * S} />
        <clipPath id={uid + 'c'}>
          <rect x={box.x} y={box.y} width={box.w} height={box.h} />
        </clipPath>
        <SoftRectMask id={uid + 'k'} x={box.x} y={box.y} w={box.w} h={box.h} m={50 * S} />
      </defs>
      <g clipPath={`url(#${uid}c)`} mask={`url(#${uid}k)`}>
        <line x1={box.x} y1={Y(0)} x2={box.x + box.w} y2={Y(0)} stroke={C.gray} strokeWidth={2 * S} opacity={0.7} />
        {vx0 < 0 && vx1 > 0 ? <line x1={X(0)} y1={box.y} x2={X(0)} y2={box.y + box.h} stroke={C.gray} strokeWidth={2 * S} opacity={0.5} /> : null}
        <path d={pathOf(curve)} fill="none" stroke={C.sky} strokeWidth={(4.5 + pulse) * S} pathLength={1} strokeDasharray={`${draw} 1`} filter={`url(#${uid}g)`} />
        <g filter={`url(#${uid}g)`}>{parts}</g>
        <g filter={`url(#${uid}s)`}>{dots}</g>
        {rootGlow > 0 ? (
          <circle cx={X(ROOT)} cy={Y(0)} r={(18 + 30 * rootGlow + 6 * pulse) * S} fill="none" stroke={C.orange} strokeWidth={3 * S} opacity={rootGlow * (0.6 + 0.4 * pulse)} filter={`url(#${uid}g)`} />
        ) : null}
      </g>
    </svg>
  );
};

export const newton: VizDef = {
  id: 'newton',
  title: '牛顿迭代',
  course: '数值分析',
  formula: String.raw`x_{k+1}=x_k-\frac{f(x_k)}{f'(x_k)}`,
  component: Newton,
};
