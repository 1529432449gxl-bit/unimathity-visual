import React, {useMemo} from 'react';
import {random} from 'remotion';
import {C} from '../core/theme';
import {easeOutCubic, seg} from '../core/time';
import type {VizDef, VizProps} from './types';
import {beatPulse, Glow, pathOf, useUid} from './lib';

const MU = 1;
const DT = 0.02;
const T_MAX = 24;
const STEPS = Math.round(T_MAX / DT);
const PERIOD = 6.6633; // μ=1 时极限环周期
const NP = 110;
const TRAIL = 50; // 拖尾步数（1.0 个时间单位）
const CHUNKS = 5;

const field = (x: number, y: number): [number, number] => [y, MU * (1 - x * x) * y - x];

function rk4(x: number, y: number, dt: number): [number, number] {
  const [a1, b1] = field(x, y);
  const [a2, b2] = field(x + (dt / 2) * a1, y + (dt / 2) * b1);
  const [a3, b3] = field(x + (dt / 2) * a2, y + (dt / 2) * b2);
  const [a4, b4] = field(x + dt * a3, y + dt * b3);
  return [x + (dt / 6) * (a1 + 2 * a2 + 2 * a3 + a4), y + (dt / 6) * (b1 + 2 * b2 + 2 * b3 + b4)];
}

const integrate = (x0: number, y0: number, n: number) => {
  const out = new Float32Array((n + 1) * 2);
  let x = x0;
  let y = y0;
  out[0] = x;
  out[1] = y;
  for (let i = 1; i <= n; i++) {
    [x, y] = rk4(x, y, DT);
    out[2 * i] = x;
    out[2 * i + 1] = y;
  }
  return out;
};

const PhaseFlow: React.FC<VizProps> = ({w, h, t, frame}) => {
  const uid = useUid('pha');
  const S = Math.min(w, h) / 900;
  const pulse = beatPulse(frame);
  const scale = Math.min(w, h) / (2 * 3.7);
  const hx = w / 2 / scale;
  const hy = h / 2 / scale;
  const P = (x: number, y: number): [number, number] => [w / 2 + x * scale, h / 2 - y * scale];

  const sims = useMemo(() => {
    const ex = Math.min(hx, 5) * 0.95;
    const ey = Math.min(hy, 5) * 0.95;
    return Array.from({length: NP}, (_, i) => {
      let x0: number;
      let y0: number;
      if (i < 16) {
        // 原点附近：向外螺旋
        const a = random(`pf-a-${i}`) * Math.PI * 2;
        const r = 0.08 + random(`pf-r-${i}`) * 0.5;
        x0 = r * Math.cos(a);
        y0 = r * Math.sin(a);
      } else {
        x0 = (random(`pf-x-${i}`) * 2 - 1) * ex;
        y0 = (random(`pf-y-${i}`) * 2 - 1) * ey;
      }
      return integrate(x0, y0, STEPS);
    });
  }, [hx, hy]);

  const cycle = useMemo(() => {
    const tr = integrate(2, 0, Math.round(40 / DT));
    const start = Math.round(30 / DT);
    const n = Math.round(PERIOD / DT) + 2;
    const pts: [number, number][] = [];
    for (let i = start; i < start + n; i += 2) pts.push([tr[2 * i], tr[2 * i + 1]]);
    return pts;
  }, []);

  let tau = 11 * t + 0.025 * frame;
  const tEnd = T_MAX - 1;
  if (tau > tEnd) tau = tEnd - PERIOD + ((tau - tEnd) % PERIOD);
  const idx = Math.floor(tau / DT);
  const appear = easeOutCubic(seg(t, 0, 0.08));

  // 背景向量场
  const arrows: React.ReactNode[] = [];
  const gs = 0.5;
  for (let gx = -Math.floor(hx / gs) * gs; gx <= hx; gx += gs) {
    for (let gy = -Math.floor(hy / gs) * gs; gy <= hy; gy += gs) {
      const [u, v] = field(gx, gy);
      const m = Math.hypot(u, v) || 1;
      const l = 0.17;
      const [x1, y1] = P(gx - (u / m) * l, gy - (v / m) * l);
      const [x2, y2] = P(gx + (u / m) * l, gy + (v / m) * l);
      arrows.push(<line key={`${gx.toFixed(2)}_${gy.toFixed(2)}`} x1={x1} y1={y1} x2={x2} y2={y2} />);
    }
  }

  const trails: React.ReactNode[] = [];
  const heads: React.ReactNode[] = [];
  const chunk = TRAIL / CHUNKS;
  sims.forEach((tr, i) => {
    for (let c = 0; c < CHUNKS; c++) {
      const a = idx - TRAIL + c * chunk;
      const b = a + chunk;
      if (b <= 0) continue;
      const pts: [number, number][] = [];
      for (let k = Math.max(0, a); k <= b; k++) pts.push(P(tr[2 * k], tr[2 * k + 1]));
      if (pts.length > 1) trails.push(<path key={`${i}-${c}`} d={pathOf(pts)} stroke={c >= CHUNKS - 2 ? C.sky : C.blue} strokeOpacity={((c + 1) / CHUNKS) * 0.85} strokeWidth={((c + 1) / CHUNKS) * 3.2 * S} />);
    }
    const [x, y] = P(tr[2 * idx], tr[2 * idx + 1]);
    heads.push(<circle key={i} cx={x} cy={y} r={3.6 * S} fill={C.ink} />);
  });

  const cyc = seg(t, 0.62, 0.84);

  return (
    <svg width={w} height={h}>
      <defs>
        <Glow id={uid + 'g'} w={w} h={h} r={4.5 * S} strength={2} />
        <Glow id={uid + 's'} w={w} h={h} r={2.2 * S} />
        <radialGradient id={uid + 'm'} cx="50%" cy="50%" r="50%">
          <stop offset="0.6" stopColor="#fff" stopOpacity={1} />
          <stop offset="1" stopColor="#fff" stopOpacity={0} />
        </radialGradient>
        <mask id={uid + 'k'}>
          <rect x={0} y={0} width={w} height={h} fill={`url(#${uid}m)`} />
        </mask>
      </defs>
      <g mask={`url(#${uid}k)`} opacity={appear}>
        <g stroke={C.gray} strokeWidth={1.6 * S} strokeLinecap="round" opacity={0.35}>
          {arrows}
        </g>
        {cyc > 0 ? (
          <path
            d={pathOf(cycle.map(([x, y]) => P(x, y)), true)}
            fill="none"
            stroke={C.orange}
            strokeWidth={(6 + 3 * pulse) * S}
            pathLength={1}
            strokeDasharray={`${easeOutCubic(cyc)} 1`}
            opacity={0.85 + 0.15 * pulse}
            filter={`url(#${uid}g)`}
          />
        ) : null}
        <g fill="none" strokeLinecap="round" filter={`url(#${uid}s)`}>
          {trails}
        </g>
        <g filter={`url(#${uid}s)`}>{heads}</g>
      </g>
    </svg>
  );
};

export const phaseFlow: VizDef = {
  id: 'phaseFlow',
  title: '极限环',
  course: '常微分方程',
  formula: String.raw`\ddot x-\mu(1-x^2)\dot x+x=0`,
  component: PhaseFlow,
};
