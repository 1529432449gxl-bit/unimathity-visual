import React from 'react';
import {AbsoluteFill, random} from 'remotion';
import {Backdrop} from '../../components/Backdrop';
import {useBeat, useProgress, useUnit} from '../../core/beat';
import {C, F} from '../../core/theme';
import {clamp, easeOutBack, easeOutCubic, easeOutExpo, seg} from '../../core/time';
import {defineModule} from '../../core/types';
import {slamStyle} from './shared';

export type TitleCardProps = {index: string; title: string; subtitle: string; accent: string};

/** 段落标题卡：大号编号（先滚动乱码再定格）+ 竖分隔线 + 逐字砸入的标题 + 副标题。 */
const TitleCard: React.FC<TitleCardProps> = ({index, title, subtitle, accent}) => {
  const {frame, duration, t} = useProgress();
  const {u, width, portrait} = useUnit();
  const {pulse} = useBeat();

  const digits = Array.from(index);
  const numIn = easeOutBack(clamp(frame / 10), 1.8);
  const numSize = (portrait ? 320 : 420) * u;
  const rolling = (i: number) => frame < 7 + i * 2;

  const tChars = Array.from(title);
  const tStart = 8;
  const stagger = Math.min(3, (duration * 0.3) / Math.max(1, tChars.length));
  const tEnd = tStart + tChars.length * stagger + 6;
  const colW = portrait ? width * 0.86 : width * 0.5;
  const tSize = Math.min(156 * u, colW / Math.max(1, tChars.length * 1.04));
  const subP = easeOutCubic(seg(frame, tEnd - 4, tEnd + 8));
  const subSize = Math.min(48 * u, colW / Math.max(1, Array.from(subtitle).length * 1.05));
  const lineP = easeOutExpo(seg(frame, 2, 14));
  const sweep = seg(frame, 12, 26);
  const drift = 1 + 0.035 * t;

  const numberEl = (
    <div
      style={{
        position: 'relative',
        fontFamily: F.en,
        fontWeight: 700,
        fontSize: numSize,
        lineHeight: 0.9,
        letterSpacing: '-0.04em',
        color: accent,
        transform: `scale(${(0.4 + 0.6 * numIn) * (1 + 0.03 * pulse)})`,
        filter: `blur(${(1 - clamp(frame / 8)) * 12}px) drop-shadow(0 0 ${(24 + 20 * pulse) * u}px ${accent})`,
        opacity: clamp(frame / 4),
        whiteSpace: 'pre',
      }}
    >
      {digits.map((dch, i) => (
        <span key={i} style={{display: 'inline-block', minWidth: '0.62em', textAlign: 'center'}}>
          {rolling(i) && /\d/.test(dch) ? String(Math.floor(random(`tc${frame}-${i}`) * 10)) : dch}
        </span>
      ))}
      {/* 扫光 */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: `linear-gradient(105deg, transparent ${sweep * 140 - 30}%, rgba(255,255,255,0.75) ${sweep * 140 - 15}%, transparent ${sweep * 140}%)`,
          mixBlendMode: 'overlay',
          opacity: sweep > 0 && sweep < 1 ? 1 : 0,
        }}
      />
    </div>
  );

  const textEl = (
    <div style={{display: 'flex', flexDirection: 'column', alignItems: portrait ? 'center' : 'flex-start', gap: 22 * u, width: portrait ? colW : undefined}}>
      <div style={{fontFamily: F.cn, fontWeight: 900, fontSize: tSize, lineHeight: 1.1, color: C.ink, whiteSpace: 'pre', letterSpacing: '0.04em', textShadow: `0 0 ${28 * u}px rgba(168,205,246,0.3)`}}>
        {tChars.map((ch, i) => (
          <span key={i} style={slamStyle(frame, tStart + i * stagger, 9)}>
            {ch}
          </span>
        ))}
      </div>
      <div
        style={{
          fontFamily: F.cn,
          fontWeight: 400,
          fontSize: subSize,
          color: C.sky,
          letterSpacing: '0.12em',
          whiteSpace: 'pre',
          opacity: subP,
          transform: `translateY(${(1 - subP) * 16 * u}px)`,
          filter: `blur(${(1 - subP) * 8}px)`,
        }}
      >
        {subtitle}
      </div>
    </div>
  );

  return (
    <AbsoluteFill>
      <Backdrop tint={C.deep} energy={0.5} />
      {/* 背景巨号描边 */}
      <AbsoluteFill style={{alignItems: 'center', justifyContent: 'center', overflow: 'hidden'}}>
        <div
          style={{
            fontFamily: F.en,
            fontWeight: 700,
            fontSize: 900 * u,
            lineHeight: 1,
            color: 'transparent',
            WebkitTextStroke: `${2 * u}px rgba(168,205,246,0.08)`,
            transform: `translateX(${(0.5 - t) * 120 * u}px) scale(${drift})`,
            whiteSpace: 'pre',
          }}
        >
          {index}
        </div>
      </AbsoluteFill>
      {/* 横向扫过的细线 */}
      <div style={{position: 'absolute', left: 0, top: '50%', height: 2 * u, width: `${lineP * 100}%`, background: `linear-gradient(90deg, transparent, ${accent})`, opacity: 0.5 * (1 - seg(frame, 14, 30))}} />
      <AbsoluteFill style={{alignItems: 'center', justifyContent: 'center', transform: `scale(${drift})`}}>
        <div style={{display: 'flex', flexDirection: portrait ? 'column' : 'row', alignItems: 'center', gap: (portrait ? 40 : 60) * u}}>
          {numberEl}
          <div
            style={{
              width: portrait ? 260 * u * lineP : 5 * u,
              height: portrait ? 5 * u : 320 * u * lineP,
              borderRadius: 3 * u,
              background: accent,
              boxShadow: `0 0 ${18 * u}px ${accent}`,
            }}
          />
          {textEl}
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

export const TitleCardModule = defineModule<TitleCardProps>({
  id: 'TitleCard',
  family: 'common',
  title: '段落标题卡',
  desc: '「01」大号编号（乱码滚动后定格）+ 标题逐字砸入 + 副标题。通用于各段开头。props：index, title, subtitle, accent（颜色）。',
  bars: 1,
  component: TitleCard,
  defaults: {index: '01', title: '学生的痛点', subtitle: '公式、定理、证明，越学越抽象', accent: C.orange},
});
