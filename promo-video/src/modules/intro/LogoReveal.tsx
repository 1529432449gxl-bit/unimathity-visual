import React, {useMemo} from 'react';
import {AbsoluteFill, random} from 'remotion';
import {Backdrop} from '../../components/Backdrop';
import {SlamText} from '../../components/SlamText';
import {useBeat} from '../../core/beat';
import {C, F} from '../../core/theme';
import {clamp, easeInOutCubic, easeOutBack, easeOutCubic, easeOutExpo, lerp} from '../../core/time';
import {defineModule} from '../../core/types';
import {GlowFilter, Stage, SweepText, hit, usePlan, useStage} from './util';

const SYMBOLS = ['∫', '∑', '∂', 'π', '∞', 'λ', '∇', 'θ', 'ε', 'δ', '√', '∮', 'Δ', 'φ', 'μ', '≈', 'ℤ', 'ℂ', '∈', '⊗'];

type Props = {name: string; tagline: string; highlight: string};

/**
 * 字标揭幕：数学符号从中心炸开、四散，再按「三组三拍」飞聚成字标；背后椭圆光环描出，
 * 橙色彗星头沿环跑；第 4 拍副标题砸入，第 5、7 拍光带扫过字标。
 */
const LogoReveal: React.FC<Props> = ({name, tagline, highlight}) => {
  const {frame, at, len, p} = usePlan(8);
  const {pulse} = useBeat();
  const {W, H, portrait} = useStage();
  const letters = Array.from(name);
  const n = letters.length;
  const size = Math.min(210, (W * 0.84) / (n * 0.62));
  const cx = W / 2;
  const cy = H * (portrait ? 0.45 : 0.46);

  // 三组落地：前 30% / 中 40% / 后 30% 的字母，分别在第 1、2、3 拍落下
  const groupOf = (i: number) => (i < Math.round(n * 0.3) ? 0 : i < Math.round(n * 0.7) ? 1 : 2);
  const land = [at(1), at(2), at(3)];

  const scatter = useMemo(
    () =>
      letters.map((_, i) => {
        const a = random(`lr-a${i}`) * Math.PI * 2;
        const r = 0.28 + random(`lr-r${i}`) * 0.2;
        return {
          dx: Math.cos(a) * W * r,
          dy: Math.sin(a) * H * r * 0.9,
          rot: (random(`lr-o${i}`) - 0.5) * 220,
          sym: SYMBOLS[Math.floor(random(`lr-s${i}`) * SYMBOLS.length)],
        };
      }),
    [name, W, H],
  );
  const dust = useMemo(
    () =>
      new Array(26).fill(0).map((_, i) => ({
        a: random(`ld-a${i}`) * Math.PI * 2,
        r: 0.3 + random(`ld-r${i}`) * 0.45,
        s: 0.35 + random(`ld-s${i}`) * 0.7,
        sym: SYMBOLS[i % SYMBOLS.length],
        spin: (random(`ld-w${i}`) - 0.5) * 2,
        orange: random(`ld-c${i}`) < 0.22,
      })),
    [],
  );

  // 光环
  const ringRx = Math.min(W * 0.44, size * n * 0.4);
  const ringRy = portrait ? ringRx * 0.75 : H * 0.34;
  const drawP = easeInOutCubic(p(0, 2.2));
  const ang = -Math.PI / 2 + drawP * Math.PI * 2;
  const tilt = -8;
  const headX = Math.cos(ang) * ringRx;
  const headY = Math.sin(ang) * ringRy;

  const burst = easeOutExpo(clamp(frame / Math.max(4, len(0.6))));
  const allLanded = frame >= land[2];
  const shake = (hit(frame, land[0], 3) + hit(frame, land[1], 3) + hit(frame, land[2], 3)) * 6;
  const zoom = 1 + 0.05 * easeInOutCubic(p(4, 4)) + 0.015 * pulse * (allLanded ? 1 : 0);
  const sweep1 = p(5, 1.1);
  const sweep2 = p(7, 0.9);
  const lineP = easeOutCubic(p(4, 1));

  const wordStyle: React.CSSProperties = {
    fontFamily: F.en,
    fontWeight: 700,
    fontSize: size,
    letterSpacing: '-0.01em',
    lineHeight: 1,
  };

  return (
    <AbsoluteFill>
      <Backdrop tint={C.deep} energy={0.6} />
      <Stage>
        {/* 背景漂浮符号 */}
        {dust.map((d, i) => {
          const rr = lerp(0.05, d.r, burst) + frame * 0.0006;
          const a = d.a + frame * 0.003 * d.spin;
          return (
            <div
              key={i}
              style={{
                position: 'absolute',
                left: cx + Math.cos(a) * W * rr * 0.75,
                top: cy + Math.sin(a) * H * rr * 0.7,
                transform: `translate(-50%,-50%) scale(${d.s * (1 + 0.15 * pulse)}) rotate(${frame * d.spin}deg)`,
                fontFamily: F.math,
                fontSize: 70,
                color: d.orange ? C.orange : C.sky,
                opacity: 0.18 * burst + 0.08 * pulse,
                filter: 'blur(0.5px)',
              }}
            >
              {d.sym}
            </div>
          );
        })}

        {/* 光环 */}
        <svg width={W} height={H} style={{position: 'absolute', left: 0, top: 0, overflow: 'visible'}}>
          <defs>
            <GlowFilter id="lr-glow" std={7} />
            <radialGradient id="lr-core">
              <stop offset="0%" stopColor={C.blue} stopOpacity={0.35} />
              <stop offset="100%" stopColor={C.blue} stopOpacity={0} />
            </radialGradient>
          </defs>
          <ellipse cx={cx} cy={cy} rx={ringRx * 1.1} ry={ringRy * 1.1} fill="url(#lr-core)" opacity={0.6 + 0.4 * pulse} />
          <g transform={`translate(${cx} ${cy}) rotate(${tilt})`}>
            <ellipse
              rx={ringRx}
              ry={ringRy}
              fill="none"
              stroke={C.sky}
              strokeWidth={4 + 2 * pulse}
              pathLength={1}
              strokeDasharray={`${drawP} 1`}
              transform="rotate(-90)"
              filter="url(#lr-glow)"
              opacity={0.9}
            />
            <ellipse
              rx={ringRx * 1.07}
              ry={ringRy * 1.07}
              fill="none"
              stroke={C.blue}
              strokeWidth={2}
              strokeDasharray="4 18"
              strokeDashoffset={-frame * 2}
              opacity={0.55 * easeOutCubic(p(1, 1))}
            />
            <ellipse
              rx={ringRx * 0.93}
              ry={ringRy * 0.93}
              fill="none"
              stroke={C.orange}
              strokeWidth={1.5}
              pathLength={1}
              strokeDasharray="0.08 0.92"
              strokeDashoffset={-frame * 0.006}
              opacity={0.7 * easeOutCubic(p(2, 1))}
            />
            {drawP > 0 && drawP < 1 ? (
              <>
                <circle cx={headX} cy={headY} r={16} fill={C.orange} opacity={0.35} filter="url(#lr-glow)" />
                <circle cx={headX} cy={headY} r={8} fill={C.white} />
              </>
            ) : (
              <circle cx={Math.cos(ang + frame * 0.04) * ringRx} cy={Math.sin(ang + frame * 0.04) * ringRy} r={7 + 4 * pulse} fill={C.orange} filter="url(#lr-glow)" />
            )}
          </g>
          {/* 落地冲击波 */}
          {land.map((f, gi) => {
            const q = clamp((frame - f) / 14);
            if (q <= 0 || q >= 1) return null;
            return (
              <ellipse
                key={gi}
                cx={cx}
                cy={cy}
                rx={lerp(size * 2, ringRx * 1.35, easeOutCubic(q))}
                ry={lerp(size * 0.7, ringRy * 1.35, easeOutCubic(q))}
                fill="none"
                stroke={gi === 2 ? C.orange : C.sky}
                strokeWidth={6 * (1 - q)}
                opacity={1 - q}
              />
            );
          })}
        </svg>

        {/* 字标 */}
        <div
          style={{
            position: 'absolute',
            left: cx,
            top: cy,
            transform: `translate(-50%,-50%) translate(${shake * (random(`sx${frame}`) - 0.5)}px, ${shake * (random(`sy${frame}`) - 0.5)}px) scale(${zoom})`,
            display: 'flex',
            ...wordStyle,
          }}
        >
          {letters.map((ch, i) => {
            const g = groupOf(i);
            const end = land[g] + (i - (g === 0 ? 0 : g === 1 ? Math.round(n * 0.3) : Math.round(n * 0.7))) * 1.2;
            const start = Math.max(len(0.5), end - Math.max(6, len(0.75)));
            const fp = clamp((frame - start) / Math.max(1, end - start));
            const e = Math.pow(fp, 2.2); // 加速飞入
            const sc = scatter[i];
            const x = sc.dx * burst * (1 - e);
            const y = sc.dy * burst * (1 - e);
            const rot = sc.rot * (1 - e);
            const landed = frame >= end;
            const imp = hit(frame, end, 4);
            const symOp = landed ? 0 : clamp(burst * 1.4) * (1 - clamp((fp - 0.75) / 0.25));
            const letterOp = landed ? 1 : clamp((fp - 0.7) / 0.3);
            const isAccent = g === 1;
            return (
              <span key={i} style={{position: 'relative', display: 'inline-block', transform: `translate(${x}px, ${y}px) rotate(${rot}deg)`}}>
                <span
                  style={{
                    display: 'inline-block',
                    opacity: letterOp,
                    transform: `scale(${1 + imp * 0.28})`,
                    color: C.ink,
                    textShadow: `0 0 ${18 + 30 * imp}px ${isAccent ? 'rgba(244,162,76,0.55)' : 'rgba(111,156,255,0.75)'}, 0 0 4px rgba(255,255,255,0.6)`,
                    filter: `blur(${(1 - letterOp) * 10}px)`,
                  }}
                >
                  {ch === ' ' ? ' ' : ch}
                </span>
                <span
                  style={{
                    position: 'absolute',
                    left: '50%',
                    top: '50%',
                    transform: `translate(-50%,-50%) scale(${0.8 + 0.3 * (1 - fp)})`,
                    fontFamily: F.math,
                    fontWeight: 400,
                    color: i % 3 === 1 ? C.orange : C.sky,
                    opacity: symOp,
                    textShadow: `0 0 20px ${i % 3 === 1 ? C.orange : C.blue}`,
                    filter: `blur(${fp * 3}px)`,
                  }}
                >
                  {sc.sym}
                </span>
              </span>
            );
          })}
          <SweepText text={name} p={sweep1} style={{...wordStyle, display: 'block'}} />
          <SweepText text={name} p={sweep2} style={{...wordStyle, display: 'block'}} color={C.sand} />
        </div>

        {/* 橙色下划线 + 副标题 */}
        <div
          style={{
            position: 'absolute',
            left: cx,
            top: cy + size * 0.68,
            width: size * n * 0.5 * lineP,
            height: 6,
            borderRadius: 3,
            transform: 'translateX(-50%)',
            background: `linear-gradient(90deg, transparent, ${C.orange} 20%, ${C.sand} 50%, ${C.orange} 80%, transparent)`,
            boxShadow: `0 0 ${16 + 16 * pulse}px ${C.orange}`,
            opacity: lineP,
          }}
        />
        <div style={{position: 'absolute', left: 0, right: 0, top: cy + size * 0.68 + 40, display: 'flex', justifyContent: 'center'}}>
          <SlamText
            text={tagline}
            start={at(4)}
            stagger={2}
            dur={8}
            size={portrait ? 64 : 72}
            weight={900}
            highlight={highlight}
            letterSpacing={0.12}
            style={{textShadow: `0 0 24px rgba(111,156,255,0.5)`}}
          />
        </div>

        {/* 第 4 拍起的闪白 */}
        <AbsoluteFill style={{background: C.white, opacity: 0.35 * hit(frame, land[2], 3), mixBlendMode: 'screen', pointerEvents: 'none'}} />
      </Stage>
    </AbsoluteFill>
  );
};

export const LogoRevealModule = defineModule<Props>({
  id: 'LogoReveal',
  family: 'intro',
  title: '字标揭幕',
  desc: '数学符号飞聚成「Unimathity」字标，光环描出、副标题砸入、光带扫过。props：name, tagline, highlight（副标题中橙色强调的子串）。',
  bars: 2,
  component: LogoReveal,
  defaults: {name: 'Unimathity', tagline: '让大学数学看得见', highlight: '看得见'},
});

export {easeOutBack};
