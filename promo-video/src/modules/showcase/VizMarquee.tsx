import React from 'react';
import {AbsoluteFill} from 'remotion';
import {Backdrop} from '../../components/Backdrop';
import {SlamText} from '../../components/SlamText';
import {Viz} from '../../components/Viz';
import {useBeat, useProgress, useUnit} from '../../core/beat';
import {C, F} from '../../core/theme';
import {BEAT, easeOutCubic, seg} from '../../core/time';
import {defineModule} from '../../core/types';
import {useFontsFor, vizMeta} from './shared';

export type VizMarqueeProps = {vizList: string[]; title: string; subtitle: string};

/**
 * 长廊：多行 viz 卡片斜向无限横滚（相邻行反向），中间压一条大标题。
 */
export const VizMarquee: React.FC<VizMarqueeProps> = ({vizList, title, subtitle}) => {
  const {u, width, height, portrait} = useUnit();
  const {frame, t} = useProgress();
  const {pulse} = useBeat();
  const metas = vizList.map((id) => vizMeta(id));
  useFontsFor(metas.map((m) => m.title + m.course).join('') + title + subtitle);

  const rows = portrait ? 6 : 3;
  const cardW = (portrait ? 400 : 470) * u;
  const cardH = cardW * 0.62;
  const gap = 28 * u;
  const pitch = cardW + gap;
  const span = Math.hypot(width, height) * 1.1; // 旋转后需要覆盖的宽度
  const perRow = Math.max(vizList.length, Math.ceil(span / pitch) + 2);
  const period = perRow * pitch;
  const rowGap = 34 * u;
  const blockH = rows * cardH + (rows - 1) * rowGap;
  const enter = easeOutCubic(seg(frame, 0, 12));

  return (
    <AbsoluteFill>
      <Backdrop tint={C.deep} energy={0.5} />
      <AbsoluteFill style={{transform: `rotate(-8deg) scale(${1.12 + 0.05 * t})`, opacity: enter}}>
        {Array.from({length: rows}).map((_, r) => {
          const dir = r % 2 === 0 ? -1 : 1;
          const speed = (5.5 + r * 1.3) * u; // px / 帧
          const y = height / 2 - blockH / 2 + r * (cardH + rowGap);
          const shift = (((frame * speed * dir + r * pitch * 0.45) % period) + period) % period;
          return Array.from({length: perRow}).map((__, k) => {
            const idx = (k + r * 3) % vizList.length;
            let x = k * pitch + shift;
            x = (x % period) - pitch; // 落在 [-pitch, period - pitch)
            const left = width / 2 - span / 2 + x;
            if (left > width / 2 + span / 2 || left + cardW < width / 2 - span / 2) return null;
            const m = metas[idx];
            const lit = (k + r) % 5 === Math.floor(frame / BEAT) % 5 ? pulse : 0;
            return (
              <div
                key={`${r}-${k}`}
                style={{
                  position: 'absolute',
                  left,
                  top: y,
                  width: cardW,
                  height: cardH,
                  borderRadius: 16 * u,
                  overflow: 'hidden',
                  background: 'rgba(15,25,56,0.78)',
                  border: `${2 * u}px solid ${lit > 0.4 ? C.orange : 'rgba(168,205,246,0.25)'}`,
                  boxShadow: `0 ${14 * u}px ${40 * u}px rgba(0,0,0,0.5), 0 0 ${40 * lit * u}px rgba(244,162,76,${0.6 * lit})`,
                }}
              >
                <Viz id={vizList[idx]} w={cardW} h={cardH} speed={0.7 + ((k * 7 + r * 3) % 5) * 0.12} offset={((k * 3 + r) % 7) * 0.06} />
                <div
                  style={{
                    position: 'absolute',
                    left: 14 * u,
                    bottom: 10 * u,
                    fontFamily: F.cn,
                    fontWeight: 700,
                    fontSize: 20 * u,
                    color: C.orange,
                    whiteSpace: 'nowrap',
                    textShadow: '0 0 6px rgba(5,8,26,0.9)',
                  }}
                >
                  {m.course}
                </div>
              </div>
            );
          });
        })}
      </AbsoluteFill>
      {/* 中间压暗带 + 标题 */}
      <AbsoluteFill
        style={{
          background: 'radial-gradient(ellipse 55% 32% at 50% 50%, rgba(5,8,26,0.92) 0%, rgba(5,8,26,0.7) 45%, transparent 100%)',
        }}
      />
      <AbsoluteFill style={{alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 20 * u}}>
        <SlamText
          text={title}
          start={4}
          stagger={2}
          size={(portrait ? 120 : 130) * u}
          font={F.en}
          weight={700}
          highlight="100+"
          style={{fontFamily: `${F.en}`, textShadow: `0 0 ${(28 + 24 * pulse) * u}px rgba(111,156,255,0.6), 0 ${6 * u}px ${20 * u}px rgba(0,0,0,0.7)`}}
        />
        <SlamText text={subtitle} start={BEAT * 1.5} stagger={2} size={(portrait ? 50 : 52) * u} weight={700} color={C.sky} letterSpacing={0.1} />
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

export const vizMarqueeModule = defineModule<VizMarqueeProps>({
  id: 'VizMarquee',
  family: 'showcase',
  title: '画面长廊',
  desc: '多行 viz 卡片斜向无限横滚、相邻行反向，中间大标题。props: vizList, title, subtitle',
  bars: 2,
  component: VizMarquee,
  defaults: {
    vizList: ['riemann', 'linearMap', 'newton', 'galton', 'complexMap', 'phaseFlow', 'taylor', 'fourier', 'dihedral', 'modCircle'],
    title: '100+ 交互演示',
    subtitle: '覆盖 9 门大学数学课程',
  },
});
