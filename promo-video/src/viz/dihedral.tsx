import React from 'react';
import {C} from '../core/theme';
import {BEAT, easeInOutCubic, easeOutBack, easeOutCubic, seg} from '../core/time';
import type {VizDef, VizProps} from './types';
import {beatPulse, Glow, useUid} from './lib';

/** 每拍施加一次 r 或 s；这条序列 16 拍内走遍 D6 的 12 个元素。 */
const OPS = 'rsrrrsrrsrrrrsrs';
const VCOL = [C.orange, C.sky, C.sand, C.blue, C.ink, C.gray];
type El = {k: number; f: number};
const apply = (g: El, op: string): El => (op === 'r' ? {k: (g.k + 1) % 6, f: g.f} : {k: (6 - g.k) % 6, f: 1 - g.f});
/** 元素 g = r^k s^f 作用后，顶点 i 所在的角度（单位：60°）。 */
const vAngle = (g: El, i: number) => (g.f ? -i + g.k : i + g.k);

const Dihedral: React.FC<VizProps> = ({w, h, t, frame}) => {
  const uid = useUid('dih');
  const S = Math.min(w, h) / 900;
  const pulse = beatPulse(frame);
  const landscape = w >= h;
  // 布局：六边形 + 2×6 元素格（横屏竖排两列，竖屏横排两行）
  const R = landscape ? Math.min((w * 0.92) / 3.75, (h * 0.9) / 2.6) : Math.min((w * 0.92) / 2.6, (h * 0.9) / 3.7);
  const cell = 0.42 * R;
  const totalW = landscape ? 2.5 * R + 0.4 * R + 2 * cell : 2.6 * R;
  const totalH = landscape ? 2.6 * R : 2.5 * R + 0.35 * R + 2 * cell;
  const ox = (w - totalW) / 2;
  const oy = (h - totalH) / 2;
  const hc: [number, number] = landscape ? [ox + 1.25 * R, h / 2] : [w / 2, oy + 1.25 * R];
  const cellPos = (e: El): [number, number] =>
    landscape ? [ox + 2.9 * R + (e.f + 0.5) * cell, h / 2 + (e.k - 2.5) * cell] : [w / 2 + (e.k - 2.5) * cell, oy + 2.85 * R + (e.f + 0.5) * cell];

  const b = Math.max(0, Math.floor(frame / BEAT));
  const q = (frame - b * BEAT) / BEAT;
  let g: El = {k: 0, f: 0};
  const visited = new Set<string>(['0,0']);
  for (let i = 0; i < b; i++) {
    g = apply(g, OPS[i % OPS.length]);
    visited.add(`${g.k},${g.f}`);
  }
  const op = OPS[b % OPS.length];
  const next = apply(g, op);
  const rotE = op === 'r' ? easeOutBack(seg(q, 0, 0.55), 1.6) : 0;
  const flipE = op === 's' ? easeInOutCubic(seg(q, 0, 0.6)) : 0;
  const sy = op === 's' ? Math.cos(Math.PI * flipE) : 1;
  const done = op === 'r' ? seg(q, 0, 0.55) >= 1 : flipE >= 1;
  const cur = done ? next : g;
  if (done) visited.add(`${next.k},${next.f}`);

  const appear = easeOutCubic(seg(t, 0, 0.08));
  const Rv = R * (0.92 + 0.08 * appear);
  const pts = Array.from({length: 6}, (_, i) => {
    const an = ((vAngle(g, i) + rotE) * Math.PI) / 3;
    const x = Math.cos(an);
    const y = Math.sin(an) * sy;
    return [hc[0] + x * Rv, hc[1] - y * Rv] as [number, number];
  });
  const orient = (g.f ? -1 : 1) * (sy >= 0 ? 1 : -1);
  const finale = seg(t, 0.9, 1);

  // 旋转弧形箭头 / 翻转对称轴
  let opMark: React.ReactNode = null;
  const markA = Math.sin(Math.PI * Math.min(1, q * 1.4));
  if (op === 'r') {
    const ra = 1.17 * R;
    const a0 = Math.PI / 6 + 0.12;
    const a1 = a0 + (Math.PI / 3) * Math.max(0.05, easeOutCubic(seg(q, 0, 0.55))) + 0.25;
    const p0 = [hc[0] + ra * Math.cos(a0), hc[1] - ra * Math.sin(a0)];
    const p1 = [hc[0] + ra * Math.cos(a1), hc[1] - ra * Math.sin(a1)];
    const tg = [-Math.sin(a1), -Math.cos(a1)]; // 屏幕坐标下的切向
    const hl = 0.09 * R;
    const nx = [Math.cos(a1), -Math.sin(a1)];
    opMark = (
      <g opacity={markA} stroke={C.orange} fill="none" strokeWidth={5 * S} strokeLinecap="round">
        <path d={`M${p0[0]},${p0[1]} A${ra},${ra} 0 0 0 ${p1[0]},${p1[1]}`} />
        <polygon
          points={`${p1[0] + tg[0] * hl},${p1[1] + tg[1] * hl} ${p1[0] + nx[0] * hl * 0.6},${p1[1] + nx[1] * hl * 0.6} ${p1[0] - nx[0] * hl * 0.6},${p1[1] - nx[1] * hl * 0.6}`}
          fill={C.orange}
          stroke="none"
        />
      </g>
    );
  } else {
    opMark = (
      <line x1={hc[0] - 1.25 * R} y1={hc[1]} x2={hc[0] + 1.25 * R} y2={hc[1]} stroke={C.orange} strokeWidth={4 * S} strokeDasharray={`${14 * S} ${10 * S}`} opacity={markA} />
    );
  }

  // 12 个群元素
  const cells: React.ReactNode[] = [];
  for (let f = 0; f < 2; f++) {
    for (let k = 0; k < 6; k++) {
      const e = {k, f};
      const [cx, cy] = cellPos(e);
      const isCur = cur.k === k && cur.f === f;
      const seen = visited.has(`${k},${f}`);
      const rr = cell * 0.36 * (isCur ? 1 + 0.18 * pulse : 1);
      const mini = (i: number) => {
        const an = (vAngle(e, i) * Math.PI) / 3;
        return [cx + Math.cos(an) * rr * 0.62, cy - Math.sin(an) * rr * 0.62];
      };
      const hexPts = Array.from({length: 6}, (_, i) => mini(i).join(',')).join(' ');
      const m0 = mini(0);
      const m1 = mini(1);
      cells.push(
        <g key={`${k}-${f}`} opacity={appear}>
          <circle cx={cx} cy={cy} r={rr} fill={isCur ? C.panelHi : C.panel} fillOpacity={isCur ? 1 : 0.6} stroke={isCur ? C.orange : seen ? C.sky : C.dim} strokeWidth={(isCur ? 4 : 2) * S} filter={isCur ? `url(#${uid}g)` : undefined} />
          <polygon points={hexPts} fill="none" stroke={seen || isCur ? C.sky : C.dim} strokeOpacity={0.6} strokeWidth={1.4 * S} />
          <circle cx={m0[0]} cy={m0[1]} r={rr * 0.16} fill={C.orange} />
          <circle cx={m1[0]} cy={m1[1]} r={rr * 0.12} fill={C.sky} />
        </g>,
      );
    }
  }

  return (
    <svg width={w} height={h}>
      <defs>
        <Glow id={uid + 'g'} w={w} h={h} r={4.5 * S} strength={2} />
        <Glow id={uid + 's'} w={w} h={h} r={2.2 * S} />
      </defs>
      <g opacity={appear}>
        <circle cx={hc[0]} cy={hc[1]} r={R * 1.17} fill="none" stroke={C.gray} strokeOpacity={0.25} strokeWidth={1.5 * S} strokeDasharray={`${3 * S} ${9 * S}`} />
        <g filter={`url(#${uid}g)`}>{opMark}</g>
        <polygon
          points={pts.map((p) => p.join(',')).join(' ')}
          fill={orient > 0 ? C.panelHi : C.deep}
          fillOpacity={0.85}
          stroke={finale > 0 ? C.orange : C.sky}
          strokeWidth={(5 + 2 * pulse) * S}
          strokeLinejoin="round"
          filter={`url(#${uid}g)`}
        />
        <g filter={`url(#${uid}s)`}>
          {pts.map(([x, y], i) => (
            <line key={'s' + i} x1={hc[0]} y1={hc[1]} x2={x} y2={y} stroke={C.sky} strokeOpacity={0.25} strokeWidth={2 * S} />
          ))}
          {pts.map(([x, y], i) => (
            <circle key={i} cx={x} cy={y} r={(i === 0 ? 0.11 : 0.085) * R * (1 + 0.15 * pulse)} fill={VCOL[i]} />
          ))}
          <circle cx={hc[0]} cy={hc[1]} r={0.03 * R} fill={C.ink} />
        </g>
      </g>
      {cells}
    </svg>
  );
};

export const dihedral: VizDef = {
  id: 'dihedral',
  title: '二面体群',
  course: '抽象代数',
  formula: String.raw`D_6=\langle r,s\mid r^6=s^2=1,\ srs=r^{-1}\rangle`,
  component: Dihedral,
};
