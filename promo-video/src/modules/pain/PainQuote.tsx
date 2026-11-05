import React from 'react';
import {AbsoluteFill} from 'remotion';
import {Backdrop} from '../../components/Backdrop';
import {PhotoSlot} from '../../components/PhotoSlot';
import {useBeat, useProgress, useUnit} from '../../core/beat';
import {C, F} from '../../core/theme';
import {clamp, easeOutBack, easeOutCubic, easeOutExpo, seg} from '../../core/time';
import {defineModule} from '../../core/types';
import {FormulaFog, PAIN_FORMULAS, Photo, beatJitter, hiMask} from './shared';

export type PainQuoteProps = {
  photo: string;
  shape: 'circle' | 'portrait';
  quote: string;
  highlight?: string;
  who: string;
  quoteMarks: string;
  formulas: string[];
};

/** 学生原话：照片位（圆形头像或竖照片）+ 打字机式出现的一句话 + 署名。 */
const PainQuote: React.FC<PainQuoteProps> = ({photo, shape, quote, highlight, who, quoteMarks, formulas}) => {
  const {frame, duration: D} = useProgress();
  const {u, width, height, portrait} = useUnit();
  const {pulse, frac} = useBeat();
  const circle = shape !== 'portrait';

  // —— 版式
  const pw = circle ? (portrait ? 540 : 520) * u : (portrait ? 560 : 520) * u;
  const ph = circle ? pw : pw * 1.3;
  const colW = portrait ? width * 0.84 : width * 0.5;

  // —— 打字机
  const chars = Array.from(quote);
  const mask = hiMask(quote, highlight);
  const typeA = D * 0.12;
  const typeB = D * 0.68;
  const shown = Math.floor(seg(frame, typeA, typeB) * chars.length + 1e-6);
  const typing = frame >= typeA && shown < chars.length;
  const cursorOn = typing || frac < 0.5;
  const qSize = Math.min((portrait ? 66 : 70) * u, (colW * 4.2) / Math.max(1, chars.length)); // 约 3~4 行以内
  const whoP = easeOutCubic(seg(frame, D * 0.72, D * 0.85));
  const [openMark, closeMark] = [Array.from(quoteMarks)[0] ?? '', Array.from(quoteMarks)[1] ?? ''];

  // —— 照片入场
  const pin = easeOutBack(clamp(frame / 14), 1.6);
  const pj = beatJitter(frame, 'pq', 3 * u);
  const ring = frame * 0.6;

  const cursor = (atRight: number) => (
    <span
      style={{
        position: 'absolute',
        left: atRight ? '100%' : 0,
        top: '50%',
        width: 0.08 * qSize,
        height: qSize * 1.05,
        marginLeft: 0.1 * qSize,
        transform: 'translateY(-50%)',
        background: C.orange,
        boxShadow: `0 0 ${12 * u}px ${C.orange}`,
        opacity: frame >= typeA - 6 && cursorOn ? 1 : 0,
      }}
    />
  );

  const photoEl = (
    <div
      style={{
        position: 'relative',
        width: pw,
        height: ph,
        flex: 'none',
        transform: `translate(${pj.x}px, ${pj.y}px) scale(${0.6 + 0.4 * pin})`,
        opacity: clamp(frame / 6),
        filter: `blur(${(1 - clamp(frame / 10)) * 12}px)`,
      }}
    >
      {circle ? (
        <>
          <svg width={pw * 1.24} height={pw * 1.24} style={{position: 'absolute', left: -pw * 0.12, top: -pw * 0.12, overflow: 'visible'}}>
            <circle cx={pw * 0.62} cy={pw * 0.62} r={pw * 0.58} fill="none" stroke={C.sky} strokeWidth={2 * u} strokeDasharray={`${6 * u} ${14 * u}`} opacity={0.5} transform={`rotate(${ring} ${pw * 0.62} ${pw * 0.62})`} />
            <circle
              cx={pw * 0.62}
              cy={pw * 0.62}
              r={pw * 0.58}
              fill="none"
              stroke={C.orange}
              strokeWidth={5 * u}
              strokeLinecap="round"
              strokeDasharray={`${pw * 0.58 * 2 * Math.PI * 0.18} ${pw * 4}`}
              transform={`rotate(${-90 + ring * 2.2} ${pw * 0.62} ${pw * 0.62})`}
              style={{filter: `drop-shadow(0 0 ${(8 + 12 * pulse) * u}px ${C.orange})`}}
            />
          </svg>
          <div style={{position: 'absolute', inset: 0, borderRadius: '50%', overflow: 'hidden', boxShadow: `0 0 0 ${6 * u}px ${C.panelHi}, 0 30px 80px rgba(0,0,0,0.6)`}}>
            {/* 圆形里放方形照片位：按需缩放占位说明字 */}
            <div style={{position: 'absolute', left: 0, top: 0, width: Math.max(pw, 600 * u), height: Math.max(pw, 600 * u), transform: `scale(${pw / Math.max(pw, 600 * u)})`, transformOrigin: '0 0'}}>
              <PhotoSlot photo={photo} width="100%" height="100%" radius={0} />
            </div>
          </div>
        </>
      ) : (
        <Photo photo={photo} w={pw} h={ph} radius={20 * u} />
      )}
    </div>
  );

  const textEl = (
    <div style={{position: 'relative', width: colW, display: 'flex', flexDirection: 'column', gap: 34 * u, alignItems: 'flex-start'}}>
      <div
        style={{
          position: 'absolute',
          left: -40 * u,
          top: -150 * u,
          fontFamily: F.en,
          fontWeight: 700,
          fontSize: 260 * u,
          lineHeight: 1,
          color: C.orange,
          opacity: 0.85 * easeOutExpo(seg(frame, 2, 12)),
          transform: `scale(${1.6 - 0.6 * easeOutBack(seg(frame, 2, 12), 2)})`,
          textShadow: `0 0 ${30 * u}px rgba(244,162,76,0.5)`,
        }}
      >
        {openMark}
      </div>
      <div
        style={{
          position: 'relative',
          fontFamily: F.cn,
          fontWeight: 700,
          fontSize: qSize,
          lineHeight: 1.5,
          color: C.ink,
          textShadow: `0 ${4 * u}px ${20 * u}px rgba(5,8,26,0.9)`,
          minHeight: qSize * 1.5 * 2,
        }}
      >
        {chars.map((ch, i) => {
          const vis = i < shown;
          const age = vis ? frame - (typeA + (i / chars.length) * (typeB - typeA)) : 0;
          const p = clamp(age / 4);
          return (
            <span
              key={i}
              style={{
                position: 'relative',
                opacity: vis ? 0.3 + 0.7 * p : 0,
                color: mask[i] ? C.orange : undefined,
                filter: vis && p < 1 ? `blur(${(1 - p) * 6}px)` : undefined,
              }}
            >
              {ch}
              {i === shown - 1 && shown < chars.length ? cursor(1) : null}
            </span>
          );
        })}
        <span style={{position: 'relative', color: C.orange, fontFamily: F.en, opacity: shown >= chars.length ? 1 : 0}}>
          {closeMark}
          {shown >= chars.length ? cursor(1) : null}
        </span>
        {shown === 0 ? <span style={{position: 'absolute', left: 0, top: 0, height: qSize * 1.5}}>{cursor(0)}</span> : null}
      </div>
      <div style={{display: 'flex', alignItems: 'center', gap: 20 * u, opacity: whoP, transform: `translateX(${(1 - whoP) * 40 * u}px)`}}>
        <div style={{width: 70 * u * whoP, height: 3 * u, background: C.sky}} />
        <div style={{fontFamily: F.cn, fontWeight: 400, fontSize: 38 * u, color: C.sky, letterSpacing: '0.08em', whiteSpace: 'pre'}}>{who}</div>
      </div>
    </div>
  );

  return (
    <AbsoluteFill>
      <Backdrop tint={C.deep} energy={0.3} />
      <FormulaFog formulas={formulas} frame={frame} width={width} height={height} u={u} count={10} seed="pq" opacity={0.55} />
      <AbsoluteFill style={{background: 'radial-gradient(ellipse 60% 55% at 50% 50%, rgba(5,8,26,0.65), transparent 80%)'}} />
      <AbsoluteFill
        style={{
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: portrait ? 'column' : 'row',
          gap: (portrait ? 150 : 120) * u,
          transform: `scale(${1 + 0.03 * (frame / D)})`,
        }}
      >
        {photoEl}
        {textEl}
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

export const PainQuoteModule = defineModule<PainQuoteProps>({
  id: 'PainQuote',
  family: 'pain',
  title: '学生原话卡',
  desc: '照片位（circle 圆形头像 / portrait 竖照片）+ 打字机式出现的原话 + 署名。props：photo, shape, quote, highlight, who, quoteMarks, formulas。默认文案是示意，请替换为真实采访。',
  bars: 2,
  component: PainQuote,
  defaults: {
    photo: 'quote-01',
    shape: 'circle',
    quote: '上课每一步都听得懂，合上书就不知道它在说什么。',
    highlight: '不知道它在说什么',
    who: '某高校 · 大二学生',
    quoteMarks: '“”',
    formulas: PAIN_FORMULAS,
  },
});
