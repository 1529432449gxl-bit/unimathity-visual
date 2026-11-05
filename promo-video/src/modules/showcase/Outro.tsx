import React from 'react';
import {AbsoluteFill} from 'remotion';
import {Backdrop} from '../../components/Backdrop';
import {SlamText} from '../../components/SlamText';
import {Viz} from '../../components/Viz';
import {useBeat, useProgress, useUnit} from '../../core/beat';
import {C, F} from '../../core/theme';
import {BAR, BEAT, clamp, easeInOutCubic, easeOutCubic, seg} from '../../core/time';
import {defineModule} from '../../core/types';

export type OutroProps = {name: string; tagline: string; cta: string; viz: string};

/**
 * 收尾：环形光 + 背景 viz，字标砸入、tagline、cta，最后半小节淡出到黑。
 */
export const Outro: React.FC<OutroProps> = ({name, tagline, cta, viz}) => {
  const {u, width, height, portrait} = useUnit();
  const {frame, t, duration} = useProgress();
  const {pulse} = useBeat();
  const fadeLen = Math.min(BAR / 2, Math.round(duration * 0.3));
  const fadeStart = duration - fadeLen;
  const tagAt = Math.min(2 * BEAT, Math.round(duration * 0.2));
  const ctaAt = Math.min(Math.round(3.5 * BEAT), Math.round(duration * 0.38));
  const fade = easeInOutCubic(seg(frame, fadeStart, duration - 2));
  const live = 1 - fade; // 淡出时拍点光效也一起收掉

  const S = Math.min(width, height);
  const ringR = S * (portrait ? 0.42 : 0.4);
  const ringDraw = easeOutCubic(seg(frame, 0, 18));
  const vizSize = S * 1.05;
  const ctaIn = easeOutCubic(seg(frame, ctaAt, ctaAt + 10));
  const sweep = seg(frame, ctaAt + 6, ctaAt + 26);

  return (
    <AbsoluteFill>
      <Backdrop tint={C.deep} energy={0.6 * live} />
      {/* 背景 viz，缓慢旋转、放大 */}
      <AbsoluteFill style={{alignItems: 'center', justifyContent: 'center'}}>
        <div
          style={{
            width: vizSize,
            height: vizSize,
            opacity: 0.42 * easeOutCubic(seg(frame, 0, 14)),
            transform: `rotate(${frame * 0.12}deg) scale(${1.0 + 0.08 * t + 0.015 * pulse * live})`,
            maskImage: 'radial-gradient(circle, black 35%, transparent 70%)',
            WebkitMaskImage: 'radial-gradient(circle, black 35%, transparent 70%)',
            filter: `drop-shadow(0 0 ${12 * u}px rgba(111,156,255,0.5))`,
          }}
        >
          <Viz id={viz} w={vizSize} h={vizSize} />
        </div>
      </AbsoluteFill>
      {/* 环形光 */}
      <AbsoluteFill>
        <svg width={width} height={height} style={{position: 'absolute', inset: 0}}>
          <defs>
            <linearGradient id="outro-ring" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor={C.blue} />
              <stop offset="55%" stopColor={C.sky} />
              <stop offset="100%" stopColor={C.orange} />
            </linearGradient>
            <filter id="outro-glow" x="-30%" y="-30%" width="160%" height="160%">
              <feGaussianBlur stdDeviation={14 * u} />
            </filter>
          </defs>
          <g transform={`rotate(${-90 + frame * 0.6} ${width / 2} ${height / 2})`}>
            <circle
              cx={width / 2}
              cy={height / 2}
              r={ringR}
              fill="none"
              stroke="url(#outro-ring)"
              strokeWidth={(16 + 18 * pulse * live) * u}
              pathLength={1}
              strokeDasharray={`${ringDraw} 1`}
              filter="url(#outro-glow)"
              opacity={0.7}
            />
            <circle
              cx={width / 2}
              cy={height / 2}
              r={ringR}
              fill="none"
              stroke="url(#outro-ring)"
              strokeWidth={3 * u}
              pathLength={1}
              strokeDasharray={`${ringDraw} 1`}
            />
            <circle cx={width / 2} cy={height / 2} r={ringR * (1.08 + 0.04 * pulse)} fill="none" stroke={C.sky} strokeWidth={1.5 * u} opacity={0.25 * ringDraw} strokeDasharray={`${4 * u} ${14 * u}`} />
          </g>
        </svg>
      </AbsoluteFill>
      {/* 中心压暗，保证字清楚 */}
      <AbsoluteFill style={{background: 'radial-gradient(ellipse 45% 30% at 50% 50%, rgba(5,8,26,0.75), transparent 100%)'}} />
      <AbsoluteFill style={{alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 26 * u}}>
        <SlamText
          text={name}
          start={0}
          stagger={2}
          dur={10}
          size={(portrait ? 150 : 180) * u}
          font={F.en}
          weight={700}
          letterSpacing={-0.01}
          highlight="math"
          style={{textShadow: `0 0 ${(30 + 30 * pulse * live) * u}px rgba(111,156,255,0.65), 0 ${6 * u}px ${24 * u}px rgba(0,0,0,0.6)`}}
        />
        <SlamText text={tagline} start={tagAt} stagger={2} size={(portrait ? 66 : 64) * u} weight={700} color={C.sky} letterSpacing={0.14} style={{textShadow: `0 0 ${18 * u}px rgba(168,205,246,0.45)`}} />
        <div
          style={{
            marginTop: 24 * u,
            position: 'relative',
            overflow: 'hidden',
            padding: `${16 * u}px ${40 * u}px`,
            borderRadius: 99,
            border: `${2 * u}px solid ${C.orange}`,
            background: 'rgba(5,8,26,0.6)',
            color: C.ink,
            fontFamily: F.cn,
            fontWeight: 700,
            fontSize: 36 * u,
            letterSpacing: '0.08em',
            whiteSpace: 'nowrap',
            opacity: ctaIn,
            transform: `translateY(${(1 - ctaIn) * 30 * u}px)`,
            boxShadow: `0 0 ${(16 + 20 * pulse * live) * u}px rgba(244,162,76,0.45)`,
            display: 'flex',
            alignItems: 'center',
            gap: 18 * u,
          }}
        >
          <span>{cta}</span>
          <span style={{color: C.orange, fontFamily: F.en, transform: `translateX(${pulse * live * 8 * u}px)`, display: 'inline-block'}}>→</span>
          <div
            style={{
              position: 'absolute',
              top: 0,
              bottom: 0,
              width: '30%',
              left: `${-40 + sweep * 150}%`,
              background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.35), transparent)',
              opacity: sweep > 0 && sweep < 1 ? 1 : 0,
            }}
          />
        </div>
      </AbsoluteFill>
      <AbsoluteFill style={{background: '#000', opacity: clamp(fade)}} />
    </AbsoluteFill>
  );
};

export const outroModule = defineModule<OutroProps>({
  id: 'Outro',
  family: 'showcase',
  title: '收尾',
  desc: '字标 + tagline + cta，背后环形光与 viz，最后半小节淡出到黑。props: name, tagline, cta, viz',
  bars: 2,
  component: Outro,
  defaults: {name: 'Unimathity', tagline: '让大学数学看得见', cta: '打开讲义，拖一拖就懂', viz: 'modCircle'},
});
