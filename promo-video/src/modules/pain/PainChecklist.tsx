import React from 'react';
import {AbsoluteFill, random} from 'remotion';
import {Backdrop} from '../../components/Backdrop';
import {GlitchText} from '../../components/GlitchText';
import {useBeat, useProgress, useUnit} from '../../core/beat';
import {C, F} from '../../core/theme';
import {clamp, easeOutBack, easeOutCubic, seg} from '../../core/time';
import {defineModule} from '../../core/types';
import {FormulaFog, PAIN_FORMULAS, impact, slamStyle} from './shared';

export type PainChecklistProps = {
  title: string;
  items: string[];
  mark: 'check' | 'cross';
  formulas: string[];
};

/** 痛点清单：标题砸入，条目按拍弹出并被打勾（check）或划掉（cross）。 */
const PainChecklist: React.FC<PainChecklistProps> = ({title, items, mark, formulas}) => {
  const {frame, duration: D} = useProgress();
  const {u, width, height, portrait} = useUnit();
  const {pulse, frac} = useBeat();
  const n = Math.max(1, items.length);

  const colW = portrait ? width * 0.86 : Math.min(width * 0.5, 1000 * u);
  const tChars = Array.from(title);
  const tSize = Math.min(110 * u, colW / Math.max(1, tChars.length * 1.05));
  const rowH = Math.min((portrait ? 150 : 128) * u, (height * 0.62) / n);
  const iSize = rowH * 0.46;

  // 每条：出现 → 半拍后打勾/划掉
  const span = D * 0.62;
  const step = span / n;
  const t0 = (i: number) => D * 0.14 + i * step;
  const markAt = (i: number) => t0(i) + Math.min(7.5, step * 0.5);
  const hits = items.map((_, i) => markAt(i) + 3);
  const hit = impact(frame, hits, 2.6);
  const allDone = (hits[hits.length - 1] ?? 0) + 4;
  const finale = seg(frame, allDone, allDone + 10);
  const done = items.filter((_, i) => frame >= markAt(i)).length;
  const sx = (random(`ck-x${frame}`) - 0.5) * Math.min(1.5, hit) * 10 * u;

  return (
    <AbsoluteFill>
      <Backdrop tint={C.deep} energy={0.4} />
      <FormulaFog formulas={formulas} frame={frame} width={width} height={height} u={u} count={12} seed="ck" opacity={0.6} />
      <AbsoluteFill style={{background: 'radial-gradient(ellipse 55% 60% at 50% 50%, rgba(5,8,26,0.7), transparent 85%)'}} />
      <AbsoluteFill style={{alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 90 * u, transform: `translateX(${sx}px)`}}>
        <div style={{width: colW, display: 'flex', flexDirection: 'column', gap: 18 * u}}>
          <div style={{fontFamily: F.cn, fontWeight: 900, fontSize: tSize, color: C.ink, whiteSpace: 'pre', lineHeight: 1.15, marginBottom: 20 * u, textShadow: `0 0 ${28 * u}px rgba(168,205,246,0.3)`}}>
            <GlitchText active={(finale > 0 && frac < 0.14) || (frame > D - 5)} amount={26 * u}>
              {tChars.map((ch, i) => (
                <span key={i} style={slamStyle(frame, 2 + i * 2, 8)}>
                  {ch}
                </span>
              ))}
            </GlitchText>
          </div>
          {items.map((it, i) => {
            const a = t0(i);
            const p = clamp((frame - a) / 8);
            const m = easeOutCubic(seg(frame, markAt(i), markAt(i) + 6));
            const flash = frame >= markAt(i) ? Math.exp(-(frame - markAt(i)) / 4) : 0;
            const box = rowH * 0.56;
            const accent = mark === 'check' ? C.orange : C.danger;
            return (
              <div
                key={i}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 30 * u,
                  height: rowH,
                  padding: `0 ${30 * u}px`,
                  borderRadius: 16 * u,
                  background: `rgba(15,25,56,${0.75})`,
                  border: `${2 * u}px solid ${m > 0 ? accent : C.deep}`,
                  boxShadow: m > 0 ? `0 0 ${(14 + 26 * flash + 10 * pulse * finale) * u}px rgba(244,162,76,${0.25 + 0.4 * flash})` : 'none',
                  opacity: clamp(p * 2),
                  transform: `translateX(${(1 - easeOutBack(p, 1.6)) * -80 * u}px) scale(${1 + 0.04 * flash})`,
                  filter: `blur(${(1 - easeOutCubic(p)) * 10}px)`,
                }}
              >
                <svg width={box} height={box} viewBox="0 0 100 100" style={{flex: 'none', overflow: 'visible'}}>
                  <rect x="4" y="4" width="92" height="92" rx="16" fill="none" stroke={m > 0 ? accent : C.sky} strokeWidth="7" opacity={0.9} />
                  {mark === 'check' ? (
                    <path d="M20 52 L42 74 L84 22" fill="none" stroke={accent} strokeWidth="14" strokeLinecap="round" strokeLinejoin="round" pathLength={1} strokeDasharray="1" strokeDashoffset={1 - m} style={{filter: `drop-shadow(0 0 6px ${accent})`}} />
                  ) : (
                    <>
                      <path d="M24 24 L76 76" stroke={accent} strokeWidth="14" strokeLinecap="round" pathLength={1} strokeDasharray="1" strokeDashoffset={1 - clamp(m * 2)} />
                      <path d="M76 24 L24 76" stroke={accent} strokeWidth="14" strokeLinecap="round" pathLength={1} strokeDasharray="1" strokeDashoffset={1 - clamp(m * 2 - 1)} />
                    </>
                  )}
                </svg>
                <div style={{position: 'relative', fontFamily: F.cn, fontWeight: 700, fontSize: iSize, color: m > 0 && mark === 'cross' ? C.gray : C.ink, whiteSpace: 'pre'}}>
                  {it}
                  {mark === 'cross' ? (
                    <div style={{position: 'absolute', left: -6 * u, top: '52%', height: 5 * u, width: `calc(${m * 100}% + ${12 * u}px)`, background: C.danger, boxShadow: `0 0 ${10 * u}px ${C.danger}`}} />
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
        {!portrait ? (
          <div
            style={{
              position: 'relative',
              fontFamily: F.en,
              fontWeight: 700,
              fontSize: 480 * u,
              lineHeight: 1,
              width: 320 * u,
              textAlign: 'center',
              color: done > 0 ? C.orange : 'transparent',
              WebkitTextStroke: `${3 * u}px ${C.orange}`,
              opacity: clamp(frame / 8) * (done > 0 ? 1 : 0.35),
              transform: `scale(${1 + 0.12 * hit * (done > 0 ? 1 : 0) + 0.03 * pulse})`,
              filter: `drop-shadow(0 0 ${(20 + 30 * finale * pulse) * u}px rgba(244,162,76,0.55))`,
            }}
          >
            {String(done)}
          </div>
        ) : null}
      </AbsoluteFill>
      <AbsoluteFill style={{background: C.white, opacity: clamp(hit * 0.05), mixBlendMode: 'screen', pointerEvents: 'none'}} />
    </AbsoluteFill>
  );
};

export const PainChecklistModule = defineModule<PainChecklistProps>({
  id: 'PainChecklist',
  family: 'pain',
  title: '痛点清单 · 你中了几条',
  desc: '标题砸入，痛点条目按拍弹出，并被逐条打勾（check）或划掉（cross）。props：title, items, mark, formulas。',
  bars: 2,
  component: PainChecklist,
  defaults: {
    title: '你中了几条？',
    items: ['公式记住了，意思没懂', '证明能背，图想不出来', '换个题型就不会了', '考完一周全忘光'],
    mark: 'check',
    formulas: PAIN_FORMULAS,
  },
});
