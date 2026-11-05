import React from 'react';
import {AbsoluteFill, random} from 'remotion';
import {Backdrop} from '../../components/Backdrop';
import {GlitchText} from '../../components/GlitchText';
import {useBeat, useProgress, useUnit} from '../../core/beat';
import {C, F} from '../../core/theme';
import {clamp, easeOutCubic} from '../../core/time';
import {defineModule} from '../../core/types';
import {HeartLine, hiMask, impact, isPunct, slamStyle} from './shared';

export type PainHookProps = {lines: string[]; highlight?: string};

/** 冷开场：黑底大字逐字砸入，每个字落地都震一下屏，最后一个字故障闪。 */
const PainHook: React.FC<PainHookProps> = ({lines, highlight}) => {
  const {frame, duration, t} = useProgress();
  const {u, width, height} = useUnit();
  const {pulse, frac} = useBeat();

  const rows = lines.map((l) => Array.from(l));
  const total = rows.reduce((s, r) => s + r.length, 0);
  const GAP = 2; // 行间停顿（以字间隔计）
  const budget = Math.min(duration - 16, 48);
  const stagger = Math.max(1.5, budget / Math.max(1, total + GAP * (rows.length - 1)));
  const DUR = 8;

  // 每个字的起砸帧
  const starts: number[][] = [];
  let k = 0;
  rows.forEach((r, li) => {
    starts.push(r.map((_, ci) => 2 + (k + ci + li * GAP) * stagger));
    k += r.length;
  });
  const hits = starts.flat().map((s) => s + DUR * 0.45);
  const hit = impact(frame, hits, 2.6);
  const lastLand = hits[hits.length - 1] ?? 0;

  // 屏幕震动
  const sx = (random(`hk-x${frame}`) - 0.5) * 2 * Math.min(1.6, hit) * 9 * u;
  const sy = (random(`hk-y${frame}`) - 0.5) * 2 * Math.min(1.6, hit) * 6 * u;
  const push = 1 + 0.05 * easeOutCubic(t);

  // 最后一行最后一个「字」（带上尾随标点）故障闪
  const lastRow = rows.length - 1;
  const lr = rows[lastRow] ?? [];
  let gStart = lr.length - 1;
  while (gStart > 0 && isPunct(lr[gStart])) gStart--;
  const after = frame - lastLand;
  const glitchOn =
    after >= 0 && (after < 5 || (frac < 0.14 && after > 6) || frame > duration - 7 || random(`hk-g${frame}`) < 0.12);

  const maxW = width * 0.86;
  const sizes = rows.map((r, i) => {
    const base = (i === rows.length - 1 ? 176 : 130) * u;
    return Math.min(base, maxW / Math.max(1, r.length * 1.02));
  });

  return (
    <AbsoluteFill>
      <Backdrop tint={C.bg} energy={0.15} dots={false} />
      <AbsoluteFill style={{background: `radial-gradient(ellipse 50% 40% at 50% 50%, rgba(34,48,86,${0.25 + 0.25 * pulse}), transparent 70%)`}} />
      <HeartLine frame={frame} width={width} y={height * 0.84} u={u} opacity={0.18 + 0.2 * pulse} amp={0.8} />
      <AbsoluteFill
        style={{
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'column',
          gap: 26 * u,
          transform: `translate(${sx}px, ${sy}px) scale(${push})`,
        }}
      >
        {rows.map((r, li) => {
          const mask = hiMask(lines[li], highlight);
          const isLast = li === lastRow;
          const head = isLast ? r.slice(0, gStart) : r;
          const tail = isLast ? r.slice(gStart) : [];
          const tailT0 = isLast ? starts[li][gStart] : 0;
          const renderChar = (ch: string, i: number) => (
            <span
              key={i}
              style={{
                ...slamStyle(frame, starts[li][i], DUR),
                color: mask[i] ? C.orange : undefined,
                textShadow: mask[i] ? `0 0 ${30 * u}px rgba(244,162,76,0.6)` : `0 0 ${24 * u}px rgba(168,205,246,0.25)`,
              }}
            >
              {ch}
            </span>
          );
          return (
            <div
              key={li}
              style={{
                fontFamily: F.cn,
                fontWeight: 900,
                fontSize: sizes[li],
                lineHeight: 1.12,
                letterSpacing: '0.02em',
                whiteSpace: 'pre',
                color: li === lastRow ? C.ink : C.sky,
                opacity: li === lastRow ? 1 : 0.92,
              }}
            >
              {head.map(renderChar)}
              {tail.length ? (
                <span style={slamStyle(frame, tailT0, DUR)}>
                  <GlitchText active={glitchOn} amount={34 * u} style={{whiteSpace: 'pre'}}>
                    {tail.map((ch, j) => (
                      <span key={j} style={{color: mask[gStart + j] ? C.orange : undefined}}>
                        {ch}
                      </span>
                    ))}
                  </GlitchText>
                </span>
              ) : null}
            </div>
          );
        })}
      </AbsoluteFill>
      {/* 落字闪白 */}
      <AbsoluteFill style={{background: C.white, opacity: clamp(hit * 0.05), mixBlendMode: 'screen', pointerEvents: 'none'}} />
      {/* 结尾整屏故障切片 */}
      {glitchOn && after > 0 ? (
        <AbsoluteFill
          style={{
            background: `linear-gradient(transparent ${random(`hk-s${frame}`) * 80}%, rgba(111,156,255,0.22) 0 ${random(`hk-s${frame}`) * 80 + 4}%, transparent 0)`,
            pointerEvents: 'none',
          }}
        />
      ) : null}
    </AbsoluteFill>
  );
};

export const PainHookModule = defineModule<PainHookProps>({
  id: 'PainHook',
  family: 'pain',
  title: '冷开场 · 逐字砸入',
  desc: '黑底大字逐行逐字砸入并震屏，最后一字故障闪。props：lines（每行一句），highlight（橙色强调子串，可选）。',
  bars: 1,
  component: PainHook,
  defaults: {lines: ['学数学，', '你是不是也这样？'], highlight: '这样'},
});
