import React, {useMemo} from 'react';
import {random} from 'remotion';
import {C} from '../core/theme';
import {clamp, easeOutCubic, lerp, seg} from '../core/time';
import type {VizDef, VizProps} from './types';
import {beatPulse, fitWorld, Glow, pathOf, useUid} from './lib';

const ROWS = 10;
const N = 240;
const DY = 0.72;
const RB = 0.11; // 球半径
const PER_ROW = 4; // 每个槽一层并排几颗
const STACK_H = 0.205;
const LIFT = 0.3; // 球心在钉子上方的高度
const BIN_TOP = -ROWS * DY + LIFT;
const FLOOR = BIN_TOP - 3.6;
const HOP = 0.012; // 每跳占用的 t
const FALL = 0.03;

type Ball = {release: number; ks: number[]; bin: number; slot: number};

const Galton: React.FC<VizProps> = ({w, h, t, frame}) => {
  const uid = useUid('gal');
  const S = Math.min(w, h) / 900;
  const pulse = beatPulse(frame);
  const {s, X, Y} = fitWorld(w, h, -5.7, 5.7, FLOOR - 0.2, 1.9, 0.04);

  const balls = useMemo<Ball[]>(() => {
    const counts = new Array(ROWS + 1).fill(0);
    return Array.from({length: N}, (_, i) => {
      const ks = [0];
      for (let r = 0; r < ROWS; r++) ks.push(ks[r] + (random(`galton-${i}-${r}`) < 0.5 ? 0 : 1));
      const bin = ks[ROWS];
      const slot = counts[bin]++;
      return {release: 0.02 + (0.56 * i) / N, ks, bin, slot};
    });
  }, []);

  const pegs: React.ReactNode[] = [];
  for (let r = 0; r < ROWS; r++) {
    for (let j = 0; j <= r; j++) {
      pegs.push(<circle key={`${r}-${j}`} cx={X((j - r / 2) * 1)} cy={Y(-r * DY)} r={(0.075 * s) * (1 + 0.25 * pulse)} fill={C.sky} opacity={0.85} />);
    }
  }
  const pegIn = easeOutCubic(seg(t, 0, 0.06));

  // 每个球的位置
  const pos = (b: Ball): [number, number, boolean] | null => {
    const lt = t - b.release;
    if (lt < 0) return null;
    // 第一段：从漏斗口落到第一颗钉子
    const nh = lt / HOP;
    if (nh < 1) {
      const u = nh;
      return [0, lerp(1.5, LIFT, u * u), false];
    }
    const hop = nh - 1;
    if (hop < ROWS) {
      const r = Math.floor(hop);
      const u = hop - r;
      const xa = (b.ks[r] - r / 2) * 1;
      const xb = (b.ks[r + 1] - (r + 1) / 2) * 1;
      const ya = -r * DY + LIFT;
      const v0 = 0.9;
      const g = v0 + DY;
      return [lerp(xa, xb, u), ya + v0 * u - g * u * u, false];
    }
    const xBin = b.bin - ROWS / 2;
    const col = b.slot % PER_ROW;
    const row = Math.floor(b.slot / PER_ROW);
    const xs = xBin + (col - (PER_ROW - 1) / 2) * (RB * 2.02);
    const ys = FLOOR + RB + row * STACK_H;
    const fl = clamp((lt - (ROWS + 1) * HOP) / FALL);
    const xStart = xBin;
    return [lerp(xStart, xs, easeOutCubic(fl)), lerp(BIN_TOP, ys, fl * fl), fl >= 1];
  };

  const flying: React.ReactNode[] = [];
  const landed: React.ReactNode[] = [];
  balls.forEach((b, i) => {
    const p = pos(b);
    if (!p) return;
    const c = <circle key={i} cx={X(p[0])} cy={Y(p[1])} r={RB * s * (p[2] ? 0.92 : 1)} fill={p[2] ? C.blue : C.ink} />;
    (p[2] ? landed : flying).push(c);
  });

  // 槽壁
  const walls: React.ReactNode[] = [];
  for (let k = 0; k <= ROWS + 1; k++) {
    const x = k - ROWS / 2 - 0.5;
    walls.push(<line key={k} x1={X(x)} y1={Y(BIN_TOP - 0.15)} x2={X(x)} y2={Y(FLOOR)} stroke={C.gray} strokeWidth={2 * S} opacity={0.45} />);
  }

  // 正态曲线（期望堆高）
  const sigma = Math.sqrt(ROWS) / 2;
  const normal: [number, number][] = [];
  for (let i = 0; i <= 160; i++) {
    const x = -5.6 + (11.2 * i) / 160;
    const c = (N * Math.exp(-(x * x) / (2 * sigma * sigma))) / (sigma * Math.sqrt(2 * Math.PI));
    normal.push([X(x), Y(FLOOR + (c / PER_ROW) * STACK_H + RB * 0.5)]);
  }
  const nA = seg(t, 0.7, 0.9);

  return (
    <svg width={w} height={h}>
      <defs>
        <Glow id={uid + 'g'} w={w} h={h} r={4 * S} strength={2} />
        <Glow id={uid + 's'} w={w} h={h} r={2.2 * S} />
      </defs>
      {/* 漏斗 */}
      <g stroke={C.sky} strokeWidth={3 * S} opacity={0.7 * pegIn} strokeLinecap="round" filter={`url(#${uid}s)`}>
        <line x1={X(-1.6)} y1={Y(1.85)} x2={X(-0.32)} y2={Y(1.05)} />
        <line x1={X(1.6)} y1={Y(1.85)} x2={X(0.32)} y2={Y(1.05)} />
      </g>
      <g opacity={pegIn} filter={`url(#${uid}s)`}>
        {pegs}
      </g>
      <g opacity={pegIn}>{walls}</g>
      <line x1={X(-ROWS / 2 - 0.5)} y1={Y(FLOOR)} x2={X(ROWS / 2 + 0.5)} y2={Y(FLOOR)} stroke={C.gray} strokeWidth={2.5 * S} opacity={0.6 * pegIn} />
      <g filter={`url(#${uid}s)`}>{landed}</g>
      <g filter={`url(#${uid}g)`}>{flying}</g>
      {nA > 0 ? (
        <path d={pathOf(normal)} fill="none" stroke={C.orange} strokeWidth={(4.5 + 2 * pulse) * S} strokeLinecap="round" pathLength={1} strokeDasharray={`${easeOutCubic(nA)} 1`} filter={`url(#${uid}g)`} />
      ) : null}
    </svg>
  );
};

export const galton: VizDef = {
  id: 'galton',
  title: '中心极限定理',
  course: '概率统计',
  formula: String.raw`\frac{S_n-n\mu}{\sqrt{n}\sigma}\xrightarrow{d}N(0,1)`,
  component: Galton,
};
