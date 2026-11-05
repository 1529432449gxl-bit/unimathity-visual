import React from 'react';
import {AbsoluteFill} from 'remotion';
import {Backdrop} from '../../components/Backdrop';
import {Chip} from '../../components/Chip';
import {Formula} from '../../components/Formula';
import {SlamText} from '../../components/SlamText';
import {Viz} from '../../components/Viz';
import {useBeat, useProgress, useUnit} from '../../core/beat';
import {C, F} from '../../core/theme';
import {clamp, easeInOutCubic, easeOutBack, easeOutCubic, seg} from '../../core/time';
import {defineModule} from '../../core/types';
import {CornerFrame, pad2, useFontsFor, vizMeta} from './shared';

export type VizShowcaseProps = {
  viz: string;
  index: string | number;
  total: string | number;
  title?: string;
  course?: string;
  formula?: string;
  layout: 'full' | 'split';
};

/**
 * 单个数学画面的高光镜头：全屏（或左文右图）播放 viz，左下角课程 + 标题 + 公式，右上角序号。
 * 拍点上画面缩放脉冲、对焦框向内跳一下。
 */
export const VizShowcase: React.FC<VizShowcaseProps> = ({viz, index, total, title, course, formula, layout = 'full'}) => {
  const {u, width, height, portrait} = useUnit();
  const {frame, t} = useProgress();
  const {pulse} = useBeat();
  const meta = vizMeta(viz, {title, course, formula});
  useFontsFor(meta.title + meta.course);
  const split = layout === 'split';

  // viz 所在区域
  let box = {x: 0, y: 0, w: width, h: height};
  if (split) box = portrait ? {x: 0, y: 0, w: width, h: height * 0.6} : {x: width * 0.4, y: 0, w: width * 0.6, h: height};

  const zoom = 1 + 0.06 * easeInOutCubic(t) + 0.02 * pulse;
  const enter = easeOutCubic(seg(frame, 0, 8));
  const vizBlur = (1 - enter) * 12;

  // 对焦框：开头从外面收进来，之后每拍向内跳一下
  const snap = easeOutBack(seg(frame, 0, 9), 2.4);
  const rest = 64 * u;
  const inset = rest + (1 - snap) * -90 * u + pulse * 22 * u;
  const frameColor = pulse > 0.75 ? C.orange : C.sky;

  // 文字区
  const titleSize = (portrait ? 84 : split ? 104 : 96) * u;
  const formulaSize = (portrait ? 38 : 46) * u;
  const formulaIn = easeOutCubic(seg(frame, 14, 26));
  const chipIn = easeOutBack(seg(frame, 0, 8));

  const textBlock = (
    <div style={{display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 18 * u}}>
      {meta.course ? (
        <div style={{transform: `translateX(${(1 - chipIn) * -60 * u}px)`, opacity: clamp(chipIn * 2)}}>
          <Chip size={26 * u} color={C.orange}>
            <span style={{width: 10 * u, height: 10 * u, borderRadius: 99, background: C.orange, boxShadow: `0 0 ${10 * u}px ${C.orange}`}} />
            {meta.course}
          </Chip>
        </div>
      ) : null}
      <SlamText
        text={meta.title}
        start={3}
        stagger={2}
        size={titleSize}
        align="left"
        style={{textShadow: `0 0 ${24 * u}px rgba(111,156,255,${0.45 + 0.4 * pulse}), 0 ${4 * u}px ${18 * u}px rgba(0,0,0,0.6)`}}
      />
      {meta.formula ? (
        <div
          style={{
            opacity: formulaIn,
            transform: `translateY(${(1 - formulaIn) * 24 * u}px)`,
            filter: `blur(${(1 - formulaIn) * 8}px)`,
            padding: `${10 * u}px ${20 * u}px`,
            borderLeft: `${4 * u}px solid ${C.blue}`,
            background: 'linear-gradient(90deg, rgba(15,25,56,0.85), rgba(15,25,56,0))',
          }}
        >
          <Formula tex={meta.formula} size={formulaSize} color={C.sky} />
        </div>
      ) : null}
    </div>
  );

  const idxIn = easeOutCubic(seg(frame, 0, 10));
  const counter = (
    <div style={{display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8 * u, opacity: idxIn, filter: `blur(${(1 - idxIn) * 10}px)`}}>
      <div style={{display: 'flex', alignItems: 'baseline', gap: 14 * u, fontFamily: F.en, fontWeight: 700, lineHeight: 1}}>
        <span
          style={{
            fontSize: 112 * u,
            color: C.orange,
            textShadow: `0 0 ${(18 + 26 * pulse) * u}px rgba(244,162,76,${0.55 + 0.4 * pulse})`,
            transform: `translateY(${(1 - idxIn) * -40 * u}px)`,
            display: 'inline-block',
          }}
        >
          {pad2(index)}
        </span>
        <span style={{fontSize: 44 * u, color: C.gray}}>/ {pad2(total, '06')}</span>
      </div>
      <div style={{width: 240 * u, height: 4 * u, background: 'rgba(142,144,152,0.3)', borderRadius: 4 * u, overflow: 'hidden'}}>
        <div style={{width: `${t * 100}%`, height: '100%', background: C.sky, boxShadow: `0 0 ${8 * u}px ${C.sky}`}} />
      </div>
    </div>
  );

  // 对焦框中心的小十字（只在拍点闪现）
  const cx = box.x + box.w / 2;
  const cy = box.y + box.h / 2;
  const cross = 26 * u;

  return (
    <AbsoluteFill>
      <Backdrop tint={C.deep} energy={0.5} />
      {/* 数学画面 */}
      <div
        style={{
          position: 'absolute',
          left: box.x,
          top: box.y,
          width: box.w,
          height: box.h,
          overflow: 'hidden',
          transform: `scale(${zoom})`,
          filter: `blur(${vizBlur}px) drop-shadow(0 0 ${(10 + 10 * pulse) * u}px rgba(111,156,255,0.45))`,
          opacity: enter,
        }}
      >
        <Viz id={viz} w={box.w} h={box.h} />
      </div>
      {/* 文字压暗层 */}
      {!split ? (
        <AbsoluteFill
          style={{
            background: portrait
              ? 'linear-gradient(0deg, rgba(5,8,26,0.92) 0%, rgba(5,8,26,0.55) 26%, transparent 45%)'
              : 'radial-gradient(ellipse 60% 55% at 0% 100%, rgba(5,8,26,0.92) 0%, rgba(5,8,26,0.6) 45%, transparent 75%)',
          }}
        />
      ) : null}
      {/* 对焦框 */}
      <CornerFrame
        x={box.x + inset}
        y={box.y + inset}
        w={box.w - inset * 2}
        h={box.h - inset * 2}
        len={(portrait ? 70 : 90) * u}
        thick={5 * u}
        color={frameColor}
        glow={(8 + 14 * pulse) * u}
        opacity={0.55 + 0.45 * snap}
      />
      <div style={{position: 'absolute', left: cx - cross, top: cy - cross, width: cross * 2, height: cross * 2, opacity: 0.85 * pulse}}>
        <div style={{position: 'absolute', left: cross - 1.5 * u, top: 0, width: 3 * u, height: cross * 2, background: C.sky}} />
        <div style={{position: 'absolute', top: cross - 1.5 * u, left: 0, height: 3 * u, width: cross * 2, background: C.sky}} />
      </div>
      {/* 录制红点式的小橙点，随拍闪 */}
      <div
        style={{
          position: 'absolute',
          left: box.x + inset + 28 * u,
          top: box.y + inset + 26 * u,
          width: 14 * u,
          height: 14 * u,
          borderRadius: 99,
          background: C.orange,
          opacity: 0.35 + 0.65 * pulse,
          boxShadow: `0 0 ${16 * u}px ${C.orange}`,
        }}
      />
      {/* 文字 */}
      {split ? (
        <div
          style={{
            position: 'absolute',
            ...(portrait
              ? {left: 80 * u, right: 80 * u, top: height * 0.6 + 60 * u}
              : {left: 110 * u, width: width * 0.4 - 150 * u, top: 0, bottom: 0, justifyContent: 'center'}),
            display: 'flex',
            flexDirection: 'column',
            gap: 40 * u,
          }}
        >
          {textBlock}
        </div>
      ) : (
        <div style={{position: 'absolute', left: (portrait ? 70 : 100) * u, bottom: (portrait ? 140 : 96) * u}}>{textBlock}</div>
      )}
      <div style={{position: 'absolute', right: (portrait ? 70 : 110) * u, top: (portrait ? 110 : 90) * u}}>{counter}</div>
    </AbsoluteFill>
  );
};

export const vizShowcaseModule = defineModule<VizShowcaseProps>({
  id: 'VizShowcase',
  family: 'showcase',
  title: '数学画面高光',
  desc: '全屏/左文右图播放一个 viz，课程标签 + 标题逐字砸入 + 公式，右上角序号，拍点缩放与对焦框跳动。props: viz, index, total, title?, course?, formula?, layout(full|split)',
  bars: 1,
  component: VizShowcase,
  defaults: {viz: 'riemann', index: '01', total: '06', layout: 'full'},
});
