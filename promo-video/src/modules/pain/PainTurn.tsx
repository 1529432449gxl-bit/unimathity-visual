import React, {useMemo} from 'react';
import {AbsoluteFill, random} from 'remotion';
import {Backdrop} from '../../components/Backdrop';
import {useBeat, useProgress, useUnit} from '../../core/beat';
import {C, F} from '../../core/theme';
import {BEAT, clamp, easeInOutCubic, easeOutCubic, seg} from '../../core/time';
import {defineModule} from '../../core/types';
import {FormulaFog, PAIN_FORMULAS, hiMask, slamStyle} from './shared';

export type PainTurnProps = {text: string; highlight: string; formulas: string[]};

/**
 * 反转：混乱的公式收拢消失、画面变暗，一条发光正弦线从左画到右，问题大字砸出（「看见」橙色），
 * 最后一拍整屏向中心收缩并白闪，接下一段的 drop。
 */
const PainTurn: React.FC<PainTurnProps> = ({text, highlight, formulas}) => {
  const {frame, duration: D} = useProgress();
  const {u, width, height, portrait} = useUnit();
  const {pulse} = useBeat();

  const collapseStart = Math.max(D * 0.6, D - BEAT);
  const clear = seg(frame, 0, D * 0.32);
  const build = seg(frame, D * 0.45, collapseStart);
  const c = seg(frame, collapseStart, D - 1);
  const cc = Math.pow(c, 2.6);

  // —— 正弦线
  const drawStart = D * 0.08;
  const drawEnd = D * 0.48;
  const draw = easeInOutCubic(seg(frame, drawStart, drawEnd));
  const cy = portrait ? height * 0.64 : height * 0.68;
  const x0 = width * 0.04;
  const x1 = width * 0.96;
  const amp = height * (portrait ? 0.045 : 0.075) * (1 + 0.7 * build + 0.12 * pulse * build);
  const cycles = portrait ? 2.2 : 3;
  const phase = frame * 0.06 * (1 + 2 * build);
  const N = 220;
  const pts: [number, number][] = [];
  for (let i = 0; i <= N; i++) {
    const s = i / N;
    if (s > draw) {
      const sx = draw;
      pts.push([x0 + (x1 - x0) * sx, cy - amp * Math.sin(2 * Math.PI * cycles * sx + phase)]);
      break;
    }
    pts.push([x0 + (x1 - x0) * s, cy - amp * Math.sin(2 * Math.PI * cycles * s + phase)]);
  }
  const d = pts.map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(1)} ${y.toFixed(1)}`).join(' ');
  const head = pts[pts.length - 1];
  const glowK = 1 + 1.4 * build + 0.6 * pulse;

  // —— 文字
  const lines = useMemo(() => {
    if (text.includes('\n')) return text.split('\n');
    if (portrait) {
      const k = text.search(/[，,]/);
      if (k > 0) return [text.slice(0, k + 1), text.slice(k + 1)];
    }
    return [text];
  }, [text, portrait]);
  const textStart = Math.round(D * 0.375);
  const flat = Array.from(lines.join(''));
  const stagger = Math.min(3, (D * 0.2) / Math.max(1, flat.length));
  const longest = Math.max(...lines.map((l) => Array.from(l).length));
  const size = Math.min((portrait ? 130 : 150) * u, (width * 0.88) / Math.max(1, longest * 1.03));

  // —— 向心汇聚的光线（铺垫 drop）
  const streaks = useMemo(
    () => Array.from({length: 40}, (_, i) => ({a: random(`ts-a${i}`) * Math.PI * 2, ph: random(`ts-p${i}`), len: 0.5 + random(`ts-l${i}`)})),
    [],
  );
  const R = Math.hypot(width, height) * 0.55;
  const speed = 0.012 + 0.05 * build * build;
  const ox = width / 2;
  const oy = height / 2;

  let charIdx = 0;

  return (
    <AbsoluteFill style={{backgroundColor: C.bg}}>
      <AbsoluteFill
        style={{
          transform: `scale(${(1 + 0.06 * easeOutCubic(build)) * (1 - 0.9 * cc)})`,
          filter: `brightness(${1 + 2.5 * cc}) blur(${cc * 6}px)`,
          borderRadius: `${cc * 50}%`,
          overflow: 'hidden',
        }}
      >
        <Backdrop tint={C.deep} energy={0.3 + 0.5 * build} />
        <AbsoluteFill style={{background: '#000', opacity: clamp(0.55 * easeOutCubic(clear) - 0.25 * build)}} />
        <FormulaFog formulas={formulas} frame={frame} width={width} height={height} u={u} count={18} seed="tf" opacity={1 - clear} converge={clear} />

        {/* 汇聚光线 */}
        <svg width={width} height={height} style={{position: 'absolute', inset: 0}}>
          {build > 0
            ? streaks.map((s, i) => {
                const q = (s.ph + frame * speed) % 1;
                const r0 = R * (1 - q);
                const r1 = r0 + R * 0.12 * s.len * (0.4 + build);
                const op = build * Math.sin(q * Math.PI) * 0.7;
                return (
                  <line
                    key={i}
                    x1={ox + Math.cos(s.a) * r0}
                    y1={oy + Math.sin(s.a) * r0}
                    x2={ox + Math.cos(s.a) * r1}
                    y2={oy + Math.sin(s.a) * r1}
                    stroke={i % 5 === 0 ? C.orange : C.sky}
                    strokeWidth={2.5 * u}
                    strokeLinecap="round"
                    opacity={op}
                  />
                );
              })
            : null}
        </svg>

        {/* 发光正弦线 */}
        <svg width={width} height={height} style={{position: 'absolute', inset: 0, overflow: 'visible'}}>
          <defs>
            <filter id="turn-glow" x="-20%" y="-50%" width="140%" height="200%">
              <feGaussianBlur stdDeviation={10 * u * glowK} />
            </filter>
            <linearGradient id="turn-grad" x1="0" x2="1" y1="0" y2="0">
              <stop offset="0" stopColor={C.blue} stopOpacity={0.2} />
              <stop offset="0.35" stopColor={C.sky} />
              <stop offset="1" stopColor={C.white} />
            </linearGradient>
          </defs>
          <line x1={x0} x2={x0 + (x1 - x0) * draw} y1={cy} y2={cy} stroke={C.dim} strokeWidth={1.5 * u} opacity={0.5} />
          {draw > 0 ? (
            <>
              <path d={d} fill="none" stroke={C.blue} strokeWidth={14 * u} opacity={0.55} filter="url(#turn-glow)" />
              <path d={d} fill="none" stroke="url(#turn-grad)" strokeWidth={5 * u} strokeLinecap="round" strokeLinejoin="round" />
              {draw < 1 || build > 0 ? (
                <>
                  <circle cx={head[0]} cy={head[1]} r={26 * u * (1 + 0.5 * pulse)} fill={C.sky} opacity={0.35} filter="url(#turn-glow)" />
                  <circle cx={head[0]} cy={head[1]} r={8 * u} fill={C.white} />
                </>
              ) : null}
            </>
          ) : null}
        </svg>

        {/* 问题大字 */}
        <AbsoluteFill
          style={{
            alignItems: 'center',
            justifyContent: 'flex-start',
            paddingTop: portrait ? height * 0.3 : height * 0.26,
            flexDirection: 'column',
          }}
        >
          {lines.map((line, li) => {
            const chars = Array.from(line);
            const mask = hiMask(line, highlight);
            return (
              <div
                key={li}
                style={{
                  fontFamily: F.cn,
                  fontWeight: 900,
                  fontSize: size,
                  lineHeight: 1.2,
                  whiteSpace: 'pre',
                  color: C.ink,
                  letterSpacing: '0.03em',
                  textShadow: `0 0 ${30 * u}px rgba(168,205,246,0.3)`,
                }}
              >
                {chars.map((ch, i) => {
                  const k = charIdx++;
                  const hi = mask[i];
                  return (
                    <span
                      key={i}
                      style={{
                        ...slamStyle(frame, textStart + k * stagger, 9),
                        color: hi ? C.orange : undefined,
                        textShadow: hi ? `0 0 ${(30 + 40 * pulse * (0.3 + build)) * u}px rgba(244,162,76,${0.6 + 0.3 * build})` : undefined,
                      }}
                    >
                      {ch}
                    </span>
                  );
                })}
              </div>
            );
          })}
        </AbsoluteFill>
      </AbsoluteFill>

      {/* 收缩时中心的白光 + 最后白闪 */}
      <AbsoluteFill
        style={{
          background: `radial-gradient(circle at 50% 50%, rgba(255,255,255,${0.95 * cc}) 0%, rgba(168,205,246,${0.5 * cc}) ${10 + 40 * cc}%, transparent ${20 + 60 * cc}%)`,
          pointerEvents: 'none',
        }}
      />
      <AbsoluteFill style={{background: C.white, opacity: easeOutCubic(seg(frame, D - 4, D - 2)), pointerEvents: 'none'}} />
      <AbsoluteFill style={{background: C.white, opacity: 0.12 * build * pulse * (1 - c), mixBlendMode: 'screen', pointerEvents: 'none'}} />
    </AbsoluteFill>
  );
};

export const PainTurnModule = defineModule<PainTurnProps>({
  id: 'PainTurn',
  family: 'pain',
  title: '反转 · 如果数学能被看见',
  desc: '画面清空变暗，发光正弦线从左画到右，问题大字砸出（highlight 橙色），最后一拍整屏收缩白闪接 drop。props：text（可用 \\n 换行）, highlight, formulas。',
  bars: 2,
  component: PainTurn,
  defaults: {text: '如果，数学能被看见？', highlight: '看见', formulas: PAIN_FORMULAS},
});
