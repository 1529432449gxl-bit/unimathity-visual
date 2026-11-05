import React from 'react';
import {AbsoluteFill, random} from 'remotion';
import {Backdrop} from '../../components/Backdrop';
import {SlamText} from '../../components/SlamText';
import {Viz} from '../../components/Viz';
import {useBeat, useProgress, useUnit} from '../../core/beat';
import {C, F} from '../../core/theme';
import {BEAT, clamp, easeInOutCubic, easeOutBack, easeOutCubic, seg} from '../../core/time';
import {defineModule} from '../../core/types';
import {snapBeat, useFontsFor, vizMeta} from './shared';

export type ShowcaseGridProps = {
  vizList: string[];
  cols: number;
  title: string;
};

/**
 * 多画面网格：格子按拍翻入，各格 viz 错开节奏同时播放，整体缓慢推镜，最后一拍全部高亮一闪。
 */
export const ShowcaseGrid: React.FC<ShowcaseGridProps> = ({vizList, cols = 3, title}) => {
  const {u, width, height, portrait} = useUnit();
  const {frame, t, duration} = useProgress();
  const {pulse, index: beatIdx} = useBeat();
  const metas = vizList.map((id) => vizMeta(id));
  useFontsFor(metas.map((m) => m.title + m.course).join('') + title);

  const n = vizList.length;
  const c = Math.max(1, portrait ? Math.min(cols, 2) : cols);
  const rows = Math.ceil(n / c);
  const head = title ? (portrait ? 260 : 170) * u : 70 * u;
  const mx = (portrait ? 60 : 100) * u;
  const gap = 26 * u;
  const areaW = width - mx * 2;
  const areaH = height - head - (portrait ? 120 : 70) * u;
  const cw = (areaW - gap * (c - 1)) / c;
  const ch = (areaH - gap * (rows - 1)) / rows;

  // 翻入节奏：每格占 step 拍，最后两拍留给满屏播放与高亮
  const totalBeats = duration / BEAT;
  const step = snapBeat(Math.min(1, (totalBeats - 2) / Math.max(1, n)));
  const lastBeatStart = Math.max(0, Math.floor(totalBeats - 1)) * BEAT;
  const flash = frame >= lastBeatStart ? pulse : 0;

  const push = 1 + 0.07 * easeInOutCubic(t);
  const allIn = n * step;

  return (
    <AbsoluteFill>
      <Backdrop tint={C.deep} energy={0.6} />
      <AbsoluteFill style={{transform: `scale(${push})`, perspective: 2200 * u}}>
        {title ? (
          <div style={{position: 'absolute', left: 0, right: 0, top: (portrait ? 110 : 52) * u, display: 'flex', justifyContent: 'center'}}>
            <SlamText text={title} start={0} stagger={2} size={(portrait ? 76 : 64) * u} style={{textShadow: `0 0 ${20 * u}px rgba(111,156,255,0.5)`}} highlight="动" />
          </div>
        ) : null}
        {vizList.map((id, i) => {
          const r = Math.floor(i / c);
          const col = i % c;
          // 末行不满时居中
          const inRow = r === rows - 1 ? n - r * c : c;
          const rowShift = ((c - inRow) * (cw + gap)) / 2;
          const x = mx + col * (cw + gap) + rowShift;
          const y = head + r * (ch + gap);
          const at = i * step * BEAT;
          const p = seg(frame, at, at + 11);
          const e = easeOutBack(p, 1.6);
          const rot = (1 - easeOutCubic(p)) * (col % 2 === 0 ? -95 : 95);
          // 全部翻入后，每拍轮流点亮一格
          const active = beatIdx >= allIn && beatIdx % n === i ? pulse : 0;
          const hi = Math.max(active * 0.8, flash);
          const speed = 0.8 + random(`grid-s-${i}`) * 0.5;
          const offset = 0.04 + random(`grid-o-${i}`) * 0.25;
          const m = metas[i];
          return (
            <div
              key={i}
              style={{
                position: 'absolute',
                left: x,
                top: y,
                width: cw,
                height: ch,
                borderRadius: 18 * u,
                overflow: 'hidden',
                background: 'rgba(15,25,56,0.72)',
                border: `${2 * u}px solid ${hi > 0.3 ? C.orange : 'rgba(168,205,246,0.28)'}`,
                boxShadow: `0 ${18 * u}px ${50 * u}px rgba(0,0,0,0.5), 0 0 ${(10 + 50 * hi) * u}px rgba(244,162,76,${0.7 * hi})`,
                transform: `rotateY(${rot}deg) scale(${0.82 + 0.18 * e})`,
                opacity: clamp(p * 3),
                filter: `blur(${(1 - easeOutCubic(p)) * 10}px) brightness(${1 + 0.25 * flash})`,
              }}
            >
              <Viz id={id} w={cw} h={ch} speed={speed} offset={offset} />
              <div
                style={{
                  position: 'absolute',
                  left: 0,
                  right: 0,
                  bottom: 0,
                  padding: `${28 * u}px ${18 * u}px ${12 * u}px`,
                  background: 'linear-gradient(0deg, rgba(5,8,26,0.85), transparent)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10 * u,
                  fontFamily: F.cn,
                  fontWeight: 700,
                  fontSize: 22 * u,
                  color: C.ink,
                  whiteSpace: 'nowrap',
                }}
              >
                <span style={{color: C.orange}}>{m.course}</span>
                <span style={{color: C.dim}}>·</span>
                <span>{m.title}</span>
              </div>
              <AbsoluteFill style={{background: C.white, opacity: 0.18 * flash + 0.5 * Math.pow(1 - p, 2) * (p > 0 ? 1 : 0), mixBlendMode: 'screen'}} />
            </div>
          );
        })}
      </AbsoluteFill>
      <AbsoluteFill style={{background: C.sky, opacity: 0.12 * flash, mixBlendMode: 'screen'}} />
    </AbsoluteFill>
  );
};

export const showcaseGridModule = defineModule<ShowcaseGridProps>({
  id: 'ShowcaseGrid',
  family: 'showcase',
  title: '多画面网格',
  desc: '2×3 / 3×3 网格同时播放多个 viz，按拍翻入、缓慢推镜、末拍全亮。props: vizList(viz id 数组), cols, title(为空则不显示标题)',
  bars: 2,
  component: ShowcaseGrid,
  defaults: {
    vizList: ['riemann', 'linearMap', 'fourier', 'phaseFlow', 'complexMap', 'modCircle'],
    cols: 3,
    title: '每个概念，都动起来',
  },
});
