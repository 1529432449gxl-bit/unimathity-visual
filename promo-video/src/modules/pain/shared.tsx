import React, {useMemo} from 'react';
import {random} from 'remotion';
import {Formula} from '../../components/Formula';
import {PhotoSlot} from '../../components/PhotoSlot';
import {C} from '../../core/theme';
import {BEAT, clamp, easeOutBack, easeOutCubic} from '../../core/time';

/** 痛点段默认的「看不懂、记不住」公式碎片。 */
export const PAIN_FORMULAS: string[] = [
  String.raw`\forall\varepsilon>0,\ \exists\delta>0,\ 0<|x-x_0|<\delta\Rightarrow|f(x)-A|<\varepsilon`,
  String.raw`\frac{\partial(x,y,z)}{\partial(u,v,w)}=\begin{vmatrix}x_u&x_v&x_w\\y_u&y_v&y_w\\z_u&z_v&z_w\end{vmatrix}`,
  String.raw`\oint_C f(z)\,dz=2\pi i\sum_{k}\operatorname{Res}(f,z_k)`,
  String.raw`\det(\lambda I-A)=\lambda^n-\operatorname{tr}(A)\lambda^{n-1}+\cdots`,
  String.raw`\sum_{n=1}^{\infty}\frac{(-1)^{n+1}}{n^{s}}`,
  String.raw`\int_E f\,d\mu=\sup_{\varphi\le f}\int_E\varphi\,d\mu`,
  String.raw`\varphi(ab)=\varphi(a)\varphi(b),\ \ker\varphi\trianglelefteq G`,
  String.raw`y''+p(x)y'+q(x)y=0`,
  String.raw`\hat f(\xi)=\int_{-\infty}^{\infty}f(x)e^{-2\pi i x\xi}\,dx`,
  String.raw`\lim_{n\to\infty}\Bigl(1+\frac1n\Bigr)^{n}`,
  String.raw`f(z)=\sum_{n=-\infty}^{\infty}c_n(z-z_0)^n`,
  String.raw`a^{p-1}\equiv1\pmod p`,
  String.raw`A=P\Lambda P^{-1}`,
  String.raw`\nabla\times\mathbf F=\Bigl(\frac{\partial R}{\partial y}-\frac{\partial Q}{\partial z}\Bigr)\mathbf i+\cdots`,
];

/** 每拍一次的随机抖动（拍起点最大，随 pulse 衰减）。 */
export function beatJitter(frame: number, seed: string, amp: number) {
  const b = Math.floor(frame / BEAT);
  const frac = frame / BEAT - b;
  const p = Math.exp(-frac * 6);
  return {
    x: (random(`${seed}x${b}`) - 0.5) * 2 * amp * p,
    y: (random(`${seed}y${b}`) - 0.5) * 2 * amp * p,
    r: (random(`${seed}r${b}`) - 0.5) * 2 * p,
  };
}

/** 冲击量：每个命中帧之后指数衰减，可叠加，用来驱动屏幕震动与闪白。 */
export function impact(frame: number, hits: number[], decay = 3) {
  let s = 0;
  for (const h of hits) if (frame >= h) s += Math.exp(-(frame - h) / decay);
  return s;
}

/** 逐字砸入的单字样式（与 SlamText 同款手感，但可逐字控制时刻）。 */
export function slamStyle(frame: number, t0: number, dur = 9): React.CSSProperties {
  const p = clamp((frame - t0) / dur);
  const s = 1.9 - 0.9 * easeOutBack(p, 2.2);
  return {
    display: 'inline-block',
    transform: `scale(${s}) translateY(${(1 - easeOutCubic(p)) * -0.15}em)`,
    filter: `blur(${(1 - easeOutCubic(p)) * 14}px)`,
    opacity: clamp(p * 2.5),
  };
}

export const isPunct = (ch: string) => /[，。？！、：；,.?!:;…\s]/.test(ch);

/** 区间 [a,b) 是否命中 highlight 子串（按字符下标）。 */
export function hiMask(text: string, highlight?: string): boolean[] {
  const chars = Array.from(text);
  const mask = chars.map(() => false);
  if (!highlight) return mask;
  const hc = Array.from(highlight);
  for (let i = 0; i + hc.length <= chars.length; i++) {
    if (hc.every((c, k) => chars[i + k] === c)) for (let k = 0; k < hc.length; k++) mask[i + k] = true;
  }
  return mask;
}

/**
 * 照片位包装：小尺寸时按比例缩放渲染 PhotoSlot，保证占位框里的说明字不被裁掉；
 * 换成真照片时效果一致。外加取景框角标。
 */
export const Photo: React.FC<{
  photo: string;
  w: number;
  h: number;
  radius?: number;
  minW?: number;
  brackets?: string | null;
  zoom?: [number, number];
  style?: React.CSSProperties;
}> = ({photo, w, h, radius = 16, minW = 470, brackets = C.sky, zoom, style}) => {
  const s = Math.min(1, w / minW);
  const bl = Math.min(w, h) * 0.09;
  const off = Math.max(8, Math.min(w, h) * 0.025);
  return (
    <div style={{position: 'relative', width: w, height: h, ...style}}>
      <div style={{position: 'absolute', left: 0, top: 0, width: w / s, height: h / s, transform: `scale(${s})`, transformOrigin: '0 0'}}>
        <PhotoSlot photo={photo} width={w / s} height={h / s} radius={radius / s} zoom={zoom} />
      </div>
      {brackets ? (
        <svg width={w + off * 2} height={h + off * 2} style={{position: 'absolute', left: -off, top: -off, overflow: 'visible'}}>
          {[
            [0, 0, 1, 1],
            [w + off * 2, 0, -1, 1],
            [0, h + off * 2, 1, -1],
            [w + off * 2, h + off * 2, -1, -1],
          ].map(([x, y, dx, dy], i) => (
            <path key={i} d={`M${x} ${y + dy * bl} L${x} ${y} L${x + dx * bl} ${y}`} fill="none" stroke={brackets} strokeWidth={3} opacity={0.85} />
          ))}
        </svg>
      ) : null}
    </div>
  );
};

/**
 * 背景公式雾：模糊、抖动、互相重叠的 KaTeX 碎片。depth 越小越糊越淡。
 * 每拍抖一下，个别碎片带蓝/橙重影，表达“看不懂、记不住”。
 */
export const FormulaFog: React.FC<{
  formulas: string[];
  frame: number;
  width: number;
  height: number;
  u: number;
  count?: number;
  seed?: string;
  opacity?: number;
  scale?: number;
  sharp?: boolean; // true：前景层，整体更糊但更大
  converge?: number; // 0..1 向中心收拢并消失
}> = ({formulas, frame, width, height, u, count = 16, seed = 'fog', opacity = 1, scale = 1, sharp = false, converge = 0}) => {
  const items = useMemo(
    () =>
      Array.from({length: count}, (_, i) => {
        const r = (k: string) => random(`${seed}-${i}-${k}`);
        const depth = r('d');
        return {
          tex: formulas.length ? formulas[Math.floor(r('f') * formulas.length) % formulas.length] : '',
          x: -0.08 + r('x') * 0.92,
          y: 0.04 + ((i + r('y') * 0.9) / count) * 0.92,
          depth,
          size: (sharp ? 70 : 30) + depth * (sharp ? 40 : 46),
          vx: (r('vx') - 0.5) * 1.4,
          vy: (r('vy') - 0.5) * 0.5,
          rot: (r('rot') - 0.5) * 16,
          color: [C.sky, C.gray, C.blue, C.sky, C.dim][Math.floor(r('c') * 5)],
          ghost: r('g') < 0.35,
          flick: r('fl'),
        };
      }),
    [formulas, count, seed, sharp],
  );
  if (!formulas.length) return null;
  return (
    <div style={{position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none'}}>
      {items.map((it, i) => {
        const j = beatJitter(frame, `${seed}j${i}`, (6 + it.depth * 10) * u);
        const b = Math.floor(frame / BEAT);
        const flicker = random(`${seed}fk${i}-${b}`) < 0.18 ? 0.4 : 1;
        let x = it.x * width + it.vx * frame * u + j.x;
        let y = it.y * height + it.vy * frame * u + j.y;
        const cx = width / 2;
        const cy = height / 2;
        const k = converge * converge;
        x = x + (cx - x) * k * 0.7;
        y = y + (cy - y) * k * 0.7;
        const blur = sharp ? 7 + (1 - it.depth) * 6 : (1 - it.depth) * 5 + 0.6;
        const op = (sharp ? 0.16 : 0.14 + it.depth * 0.32) * flicker * opacity * (1 - k);
        const size = it.size * u * scale * (1 - 0.5 * k);
        return (
          <div
            key={i}
            style={{
              position: 'absolute',
              left: x,
              top: y,
              transform: `translate(-10%, -50%) rotate(${it.rot + j.r * 3}deg)`,
              whiteSpace: 'nowrap',
              filter: `blur(${blur}px)`,
              opacity: op,
            }}
          >
            {it.ghost ? (
              <>
                <Formula tex={it.tex} size={size} color={C.blue} style={{position: 'absolute', left: -6 * u, top: 3 * u, opacity: 0.7}} />
                <Formula tex={it.tex} size={size} color={C.orange} style={{position: 'absolute', left: 7 * u, top: -2 * u, opacity: 0.45}} />
              </>
            ) : null}
            <Formula tex={it.tex} size={size} color={it.color} style={{position: 'relative'}} />
          </div>
        );
      })}
    </div>
  );
};

/** 心电图线：随拍出现尖峰，表达焦虑的心跳。 */
export const HeartLine: React.FC<{frame: number; width: number; y: number; u: number; color?: string; opacity?: number; amp?: number}> = ({
  frame,
  width,
  y,
  u,
  color = C.danger,
  opacity = 0.5,
  amp = 1,
}) => {
  const pts: string[] = [];
  const step = 6 * u;
  const period = width * 0.42; // 每拍滚过一个周期，尖峰与心跳底鼓同步
  const shift = ((frame / BEAT) * period) % period;
  for (let x = 0; x <= width; x += step) {
    const local = ((x + shift) % period) / period; // 0..1
    const d = local - 0.5;
    const g = (c: number, w: number) => Math.exp(-Math.pow((d - c) / w, 2));
    const v = -1 * g(0, 0.012) + 0.4 * g(0.03, 0.012) - 0.15 * g(-0.1, 0.03) - 0.12 * g(0.14, 0.035);
    pts.push(`${x.toFixed(1)},${(y + v * 70 * u * amp).toFixed(1)}`);
  }
  return (
    <svg width={width} height="100%" style={{position: 'absolute', left: 0, top: 0, overflow: 'visible'}}>
      <polyline points={pts.join(' ')} fill="none" stroke={color} strokeWidth={3 * u} opacity={opacity} style={{filter: `drop-shadow(0 0 ${8 * u}px ${color})`}} />
    </svg>
  );
};
