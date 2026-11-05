import React from 'react';
import {AbsoluteFill} from 'remotion';
import {Backdrop} from '../../components/Backdrop';
import {SlamText} from '../../components/SlamText';
import {useBeat, useProgress, useUnit} from '../../core/beat';
import {C, F} from '../../core/theme';
import {BEAT, clamp, easeOutBack, easeOutCubic, easeOutExpo, seg} from '../../core/time';
import {defineModule} from '../../core/types';
import {snapBeat} from './shared';

export type StatItem = {value: number; suffix?: string; label: string};
export type StatsRowProps = {items: StatItem[]; title: string};

/**
 * 数字滚动计数：每拍落下一个大数字，随后滚动到目标值，下方中文标签。
 */
export const StatsRow: React.FC<StatsRowProps> = ({items, title}) => {
  const {u, width, portrait} = useUnit();
  const {frame, duration} = useProgress();
  const {pulse} = useBeat();
  const n = items.length;
  const totalBeats = duration / BEAT;
  const first = title ? 1 : 0.5; // 第一拍留给标题
  const step = snapBeat(Math.min(1, (totalBeats - first - 1.5) / Math.max(1, n)));

  const colW = portrait ? width - 160 * u : Math.min(560 * u, (width - 200 * u) / n);
  const numSize = (portrait ? 210 : 230) * u;

  return (
    <AbsoluteFill>
      <Backdrop tint={C.deep} energy={0.55} />
      {/* 横向扫光 */}
      <AbsoluteFill
        style={{
          background: `linear-gradient(90deg, transparent ${-30 + (frame / duration) * 160}%, rgba(111,156,255,0.10) ${-15 + (frame / duration) * 160}%, transparent ${(frame / duration) * 160}%)`,
        }}
      />
      <AbsoluteFill style={{alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: (portrait ? 70 : 60) * u}}>
        {title ? <SlamText text={title} start={0} stagger={2} size={(portrait ? 72 : 60) * u} color={C.sky} weight={700} style={{textShadow: `0 0 ${18 * u}px rgba(111,156,255,0.5)`}} /> : null}
        <div style={{display: 'flex', flexDirection: portrait ? 'column' : 'row', alignItems: 'center', justifyContent: 'center'}}>
          {items.map((it, i) => {
            const at = Math.round((first + i * step) * BEAT);
            const land = seg(frame, at, at + 8);
            const count = easeOutExpo(seg(frame, at, at + Math.round(BEAT * 1.4)));
            const shown = Math.round(it.value * count);
            const done = count > 0.985;
            const hit = Math.exp(-Math.max(0, frame - at) / 6) * (frame >= at ? 1 : 0);
            const glowAmt = 0.45 + 0.35 * pulse * (done ? 1 : 0) + 0.6 * hit;
            const s = 1.7 - 0.7 * easeOutBack(land, 2.2);
            const labelIn = easeOutCubic(seg(frame, at + 6, at + 16));
            return (
              <React.Fragment key={i}>
                {i > 0 ? (
                  <div
                    style={{
                      ...(portrait
                        ? {height: 2 * u, width: 360 * u * easeOutCubic(land), margin: `${30 * u}px 0`}
                        : {width: 2 * u, height: 300 * u * easeOutCubic(land), margin: `0 ${20 * u}px`}),
                      background: `linear-gradient(${portrait ? 90 : 180}deg, transparent, ${C.blue}, transparent)`,
                      opacity: 0.8,
                    }}
                  />
                ) : null}
                <div style={{width: colW, display: 'flex', flexDirection: 'column', alignItems: 'center', opacity: clamp(land * 3)}}>
                  <div
                    style={{
                      fontFamily: F.en,
                      fontWeight: 700,
                      fontSize: numSize,
                      lineHeight: 1,
                      letterSpacing: '-0.03em',
                      color: C.ink,
                      fontVariantNumeric: 'tabular-nums',
                      transform: `scale(${s})`,
                      filter: `blur(${(1 - easeOutCubic(land)) * 14}px)`,
                      textShadow: `0 0 ${(24 + 40 * hit) * u}px rgba(111,156,255,${glowAmt}), 0 0 ${80 * u * hit}px rgba(244,162,76,${0.6 * hit})`,
                      display: 'flex',
                      alignItems: 'flex-start',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    <span>{shown}</span>
                    {it.suffix ? (
                      <span
                        style={{
                          fontSize: numSize * 0.55,
                          color: C.orange,
                          marginLeft: 6 * u,
                          marginTop: numSize * 0.04,
                          opacity: done ? 1 : 0.25,
                          transform: `scale(${done ? 1 + 0.25 * Math.exp(-Math.max(0, frame - at - BEAT * 1.4) / 5) : 0.8})`,
                          textShadow: `0 0 ${24 * u}px rgba(244,162,76,0.8)`,
                          display: 'inline-block',
                        }}
                      >
                        {it.suffix}
                      </span>
                    ) : null}
                  </div>
                  <div
                    style={{
                      marginTop: 18 * u,
                      fontFamily: F.cn,
                      fontWeight: 700,
                      fontSize: (portrait ? 50 : 46) * u,
                      color: C.sky,
                      letterSpacing: '0.12em',
                      opacity: labelIn,
                      transform: `translateY(${(1 - labelIn) * 20 * u}px)`,
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {it.label}
                  </div>
                </div>
              </React.Fragment>
            );
          })}
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

export const statsRowModule = defineModule<StatsRowProps>({
  id: 'StatsRow',
  family: 'showcase',
  title: '数字计数',
  desc: '每拍落一个大数字并滚动计数，下配中文标签。props: items({value, suffix?, label}[]), title(为空不显示)',
  bars: 2,
  component: StatsRow,
  defaults: {
    title: '大学数学，一站看懂',
    items: [
      {value: 9, label: '门课程'},
      {value: 100, suffix: '+', label: '交互演示'},
      {value: 160, suffix: '+', label: '讲义小节'},
    ],
  },
});
