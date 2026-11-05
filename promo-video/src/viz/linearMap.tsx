import React from 'react';
import {C} from '../core/theme';
import {easeInOutCubic, easeOutCubic, seg} from '../core/time';
import type {VizDef, VizProps} from './types';
import {beatPulse, Glow, useUid} from './lib';

type V = [number, number];

const LinearMap: React.FC<VizProps> = ({w, h, t, frame}) => {
  const uid = useUid('lin');
  const S = Math.min(w, h) / 900;
  const unit = Math.min(w, h) / 8.4; // 世界单位 -> 像素
  const cx = w / 2;
  const cy = h / 2;
  const pulse = beatPulse(frame);
  const s = easeInOutCubic(seg(t, 0.12, 0.62));
  // M = I + s(A - I),  A = [[2,1],[1,2]]
  const a = 1 + s;
  const b = s;
  const M = (v: V): V => [a * v[0] + b * v[1], b * v[0] + a * v[1]];
  const P = (v: V): [number, number] => [cx + v[0] * unit, cy - v[1] * unit];
  const appear = easeOutCubic(seg(t, 0, 0.12));

  const N = 14;
  const L = 40;
  const lines: React.ReactNode[] = [];
  for (let i = -N; i <= N; i++) {
    const [x1, y1] = P(M([i, -L]));
    const [x2, y2] = P(M([i, L]));
    const [x3, y3] = P(M([-L, i]));
    const [x4, y4] = P(M([L, i]));
    const major = i === 0;
    const op = major ? 0.9 : 0.42;
    lines.push(<line key={'v' + i} x1={x1} y1={y1} x2={x2} y2={y2} stroke={major ? C.sky : C.blue} strokeOpacity={op} strokeWidth={(major ? 2.4 : 1.4) * S} />);
    lines.push(<line key={'h' + i} x1={x3} y1={y3} x2={x4} y2={y4} stroke={major ? C.sky : C.blue} strokeOpacity={op} strokeWidth={(major ? 2.4 : 1.4) * S} />);
  }
  // 原始网格（淡灰），变形后作为参照
  const base: React.ReactNode[] = [];
  for (let i = -N; i <= N; i++) {
    base.push(<line key={'bv' + i} x1={cx + i * unit} y1={0} x2={cx + i * unit} y2={h} stroke={C.gray} strokeOpacity={0.16} strokeWidth={1 * S} />);
    base.push(<line key={'bh' + i} x1={0} y1={cy - i * unit} x2={w} y2={cy - i * unit} stroke={C.gray} strokeOpacity={0.16} strokeWidth={1 * S} />);
  }

  const sq = ([[0, 0], [1, 0], [1, 1], [0, 1]] as V[]).map((v) => P(M(v)).join(',')).join(' ');

  const arrow = (from: V, to: V, color: string, width: number, key: string, op = 1) => {
    const [x0, y0] = P(from);
    const [x1, y1] = P(to);
    const ang = Math.atan2(y1 - y0, x1 - x0);
    const hl = 18 * S;
    const len = Math.hypot(x1 - x0, y1 - y0);
    if (len < 1) return null;
    const bx = x1 - Math.cos(ang) * hl * 0.8;
    const by = y1 - Math.sin(ang) * hl * 0.8;
    return (
      <g key={key} opacity={op}>
        <line x1={x0} y1={y0} x2={bx} y2={by} stroke={color} strokeWidth={width} strokeLinecap="round" />
        <polygon points={`${x1},${y1} ${x1 - hl * Math.cos(ang - 0.42)},${y1 - hl * Math.sin(ang - 0.42)} ${x1 - hl * Math.cos(ang + 0.42)},${y1 - hl * Math.sin(ang + 0.42)}`} fill={color} />
      </g>
    );
  };

  // 特征方向：(1,1) λ=3，(1,-1) λ=1
  const eig = (d: V, key: string) => {
    const [x0, y0] = P([-d[0] * 20, -d[1] * 20]);
    const [x1, y1] = P([d[0] * 20, d[1] * 20]);
    return <line key={key} x1={x0} y1={y0} x2={x1} y2={y1} stroke={C.orange} strokeWidth={(2.2 + 1.5 * pulse) * S} strokeOpacity={0.55 + 0.3 * pulse} strokeDasharray={`${14 * S} ${10 * S}`} />;
  };
  const r2 = Math.SQRT1_2;
  const e1: V = [r2, r2];
  const e2: V = [r2, -r2];

  // 一般向量：随帧缓慢转动，像被 A 偏转
  const th = 2.2 + frame * 0.025;
  const g: V = [1.15 * Math.cos(th), 1.15 * Math.sin(th)];
  const g2: V = [1.0, 0.1];
  // 单位圆 -> 椭圆上的一圈点
  const dots: React.ReactNode[] = [];
  const K = 36;
  for (let k = 0; k < K; k++) {
    const an = (k / K) * Math.PI * 2;
    const [x, y] = P(M([1.05 * Math.cos(an), 1.05 * Math.sin(an)]));
    dots.push(<circle key={k} cx={x} cy={y} r={3.2 * S} fill={C.sky} opacity={0.75} />);
  }

  return (
    <svg width={w} height={h}>
      <defs>
        <Glow id={uid + 'g'} w={w} h={h} r={5 * S} strength={2} />
        <Glow id={uid + 's'} w={w} h={h} r={2.5 * S} />
        <radialGradient id={uid + 'm'} cx="50%" cy="50%" r="50%">
          <stop offset="0.55" stopColor="#fff" stopOpacity={1} />
          <stop offset="1" stopColor="#fff" stopOpacity={0} />
        </radialGradient>
        <mask id={uid + 'k'}>
          <rect x={0} y={0} width={w} height={h} fill={`url(#${uid}m)`} />
        </mask>
      </defs>
      <g mask={`url(#${uid}k)`} opacity={appear}>
        {base}
        <g filter={`url(#${uid}s)`}>{lines}</g>
        <polygon points={sq} fill={C.blue} fillOpacity={0.28 + 0.1 * pulse} stroke={C.sky} strokeWidth={3 * S} filter={`url(#${uid}s)`} />
        <g filter={`url(#${uid}g)`}>
          {eig(e1, 'e1')}
          {eig(e2, 'e2')}
        </g>
        <g filter={`url(#${uid}s)`}>{dots}</g>
        <g filter={`url(#${uid}g)`}>
          {arrow([0, 0], [g[0], g[1]], C.gray, 3 * S, 'g0', 0.5 * seg(t, 0.12, 0.3))}
          {arrow([0, 0], M(g), C.sky, 4.5 * S, 'g1')}
          {arrow([0, 0], M(g2), C.sky, 4.5 * S, 'g2', 0.8)}
          {arrow([0, 0], M([e1[0] * 1.05, e1[1] * 1.05]), C.orange, (6 + 2 * pulse) * S, 'v1')}
          {arrow([0, 0], M([e2[0] * 1.05, e2[1] * 1.05]), C.orange, (6 + 2 * pulse) * S, 'v2')}
        </g>
        <circle cx={cx} cy={cy} r={6 * S} fill={C.ink} />
      </g>
    </svg>
  );
};

export const linearMap: VizDef = {
  id: 'linearMap',
  title: '特征值的几何意义',
  course: '线性代数',
  formula: String.raw`A\mathbf{v}=\lambda\mathbf{v}`,
  component: LinearMap,
};
