import React from 'react';
import {AbsoluteFill} from 'remotion';
import {Backdrop} from '../../components/Backdrop';
import {Chip} from '../../components/Chip';
import {Formula} from '../../components/Formula';
import {Viz} from '../../components/Viz';
import {useBeat, useProgress, useUnit} from '../../core/beat';
import {C, F} from '../../core/theme';
import {BEAT, clamp, easeInOutCubic, easeOutBack, easeOutCubic, seg} from '../../core/time';
import {defineModule} from '../../core/types';
import {useFontsFor, vizMeta} from './shared';

export type BeforeAfterProps = {
  leftLabel: string;
  rightLabel: string;
  tex: string;
  text: string;
  viz: string;
};

/**
 * 对比：左「课本上」灰色静态定义，右「Unimathity」同一知识点的 viz 发光播放；
 * 分割线从右（竖屏从下）扫到中间，把右半边揭开。
 */
export const BeforeAfter: React.FC<BeforeAfterProps> = ({leftLabel, rightLabel, tex, text, viz}) => {
  const {u, width, height, portrait} = useUnit();
  const {frame, duration} = useProgress();
  const {pulse} = useBeat();
  const meta = vizMeta(viz);
  useFontsFor(meta.title);

  // 分割线：第 1 拍开始扫，第 2 拍到位（短时长时按比例压缩）
  const s0 = Math.min(BEAT, Math.round(duration * 0.12));
  const s1 = Math.min(2 * BEAT, Math.round(duration * 0.3));
  const sw = easeInOutCubic(seg(frame, s0, s1));
  const full = portrait ? height : width;
  const mid = full / 2;
  const pos = full - (full - mid) * sw; // 分割线位置（横屏 x / 竖屏 y）
  const revealed = sw > 0.999;
  const after = seg(frame, s1, s1 + 10);
  const landHit = frame >= s1 ? Math.exp(-(frame - s1) / 6) : 0;

  // 左右（上下）两块区域
  const A = portrait ? {x: 0, y: 0, w: width, h: mid} : {x: 0, y: 0, w: mid, h: height};
  const B = portrait ? {x: 0, y: mid, w: width, h: mid} : {x: mid, y: 0, w: mid, h: height};

  const leftDim = 1 - 0.35 * after;
  const pad = (portrait ? 80 : 110) * u;
  const vizW = B.w - (portrait ? 120 : 140) * u;
  const vizH = B.h - (portrait ? 220 : 280) * u;
  const vizIn = easeOutCubic(seg(frame, s0 + 4, s1 + 6));

  return (
    <AbsoluteFill>
      {/* 底层：课本纸面，整屏 */}
      <AbsoluteFill style={{background: '#0b0d14'}}>
        <AbsoluteFill
          style={{
            backgroundImage: `repeating-linear-gradient(0deg, rgba(142,144,152,0.07) 0 ${2 * u}px, transparent ${2 * u}px ${56 * u}px)`,
          }}
        />
        <div
          style={{
            position: 'absolute',
            left: A.x + pad,
            top: A.y + (portrait ? 110 : 150) * u,
            width: A.w - pad * 2,
            opacity: leftDim,
            filter: `grayscale(1) blur(${after * 0.6}px)`,
          }}
        >
          <Chip size={26 * u} color={C.gray}>
            {leftLabel}
          </Chip>
          <div style={{marginTop: (portrait ? 40 : 56) * u, fontFamily: F.cn, fontWeight: 700, fontSize: 34 * u, color: C.gray}}>定义</div>
          <div
            style={{
              marginTop: 18 * u,
              fontFamily: F.cn,
              fontWeight: 400,
              fontSize: (portrait ? 30 : 30) * u,
              lineHeight: 1.75,
              color: 'rgba(142,144,152,0.85)',
              textAlign: 'justify',
            }}
          >
            {text}
          </div>
          <div style={{marginTop: 36 * u, padding: `${20 * u}px 0`, borderTop: `1px solid rgba(142,144,152,0.25)`, borderBottom: `1px solid rgba(142,144,152,0.25)`, textAlign: 'center'}}>
            <Formula tex={tex} size={(portrait ? 40 : 44) * u} color={C.gray} display />
          </div>
          {/* 下面再来几行“看不完”的灰字条 */}
          {[0.92, 0.78, 0.86, 0.55].map((wf, i) => (
            <div key={i} style={{marginTop: 22 * u, height: 14 * u, width: `${wf * 100}%`, background: 'rgba(142,144,152,0.16)', borderRadius: 7 * u}} />
          ))}
        </div>
      </AbsoluteFill>

      {/* 右（下）半：Unimathity，被分割线揭开 */}
      <AbsoluteFill style={{clipPath: portrait ? `inset(${pos}px 0 0 0)` : `inset(0 0 0 ${pos}px)`}}>
        <Backdrop tint={C.deep} energy={0.6} />
        <div style={{position: 'absolute', left: B.x, top: B.y, width: B.w, height: B.h}}>
          <div
            style={{
              position: 'absolute',
              left: (B.w - vizW) / 2,
              top: (portrait ? 150 : 200) * u,
              width: vizW,
              height: vizH,
              opacity: vizIn,
              transform: `scale(${0.92 + 0.08 * vizIn + 0.015 * pulse})`,
              filter: `drop-shadow(0 0 ${(14 + 16 * pulse) * u}px rgba(111,156,255,0.6))`,
            }}
          >
            <Viz id={viz} w={vizW} h={vizH} />
          </div>
          <div
            style={{
              position: 'absolute',
              left: (portrait ? 80 : 90) * u,
              top: (portrait ? 70 : 110) * u,
              display: 'flex',
              alignItems: 'center',
              gap: 20 * u,
              transform: `scale(${1 + 0.12 * landHit})`,
              transformOrigin: 'left center',
            }}
          >
            <Chip size={26 * u} color={C.orange} filled>
              {rightLabel}
            </Chip>
            <span style={{fontFamily: F.cn, fontWeight: 900, fontSize: 40 * u, color: C.ink, textShadow: `0 0 ${16 * u}px rgba(111,156,255,0.6)`}}>{meta.title}</span>
          </div>
          <div style={{position: 'absolute', left: 0, right: 0, bottom: (portrait ? 40 : 70) * u, display: 'flex', justifyContent: 'center', opacity: easeOutCubic(after)}}>
            <Formula tex={tex} size={(portrait ? 34 : 38) * u} color={C.sky} />
          </div>
        </div>
      </AbsoluteFill>

      {/* 分割线 */}
      <Divider pos={pos} portrait={portrait} u={u} width={width} height={height} pulse={pulse} hit={landHit} moving={!revealed && sw > 0} />
    </AbsoluteFill>
  );
};

const Divider: React.FC<{pos: number; portrait: boolean; u: number; width: number; height: number; pulse: number; hit: number; moving: boolean}> = ({
  pos,
  portrait,
  u,
  width,
  height,
  pulse,
  hit,
  moving,
}) => {
  const thick = (4 + 4 * hit) * u;
  const g = (18 + 30 * pulse + 60 * hit) * u;
  const badge = 74 * u;
  const bs = easeOutBack(clamp(hit > 0 ? 1 : 0), 2) * (1 + 0.15 * hit);
  const line: React.CSSProperties = portrait
    ? {left: 0, width, top: pos - thick / 2, height: thick}
    : {top: 0, height, left: pos - thick / 2, width: thick};
  const trail: React.CSSProperties = portrait
    ? {left: 0, width, top: pos, height: 160 * u, background: 'linear-gradient(180deg, rgba(168,205,246,0.35), transparent)'}
    : {top: 0, height, left: pos, width: 160 * u, background: 'linear-gradient(90deg, rgba(168,205,246,0.35), transparent)'};
  return (
    <>
      {moving ? <div style={{position: 'absolute', ...trail}} /> : null}
      <div style={{position: 'absolute', ...line, background: C.sky, boxShadow: `0 0 ${g}px ${C.sky}, 0 0 ${g * 2}px ${C.blue}`}} />
      <div
        style={{
          position: 'absolute',
          left: (portrait ? width / 2 : pos) - badge / 2,
          top: (portrait ? pos : height / 2) - badge / 2,
          width: badge,
          height: badge,
          borderRadius: 99,
          background: C.orange,
          color: C.bg,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: F.en,
          fontWeight: 700,
          fontSize: 40 * u,
          transform: `scale(${moving ? 0.8 : bs}) rotate(${portrait ? 90 : 0}deg)`,
          boxShadow: `0 0 ${(20 + 30 * pulse) * u}px ${C.orange}`,
        }}
      >
        →
      </div>
    </>
  );
};

export const beforeAfterModule = defineModule<BeforeAfterProps>({
  id: 'BeforeAfter',
  family: 'showcase',
  title: '课本 vs Unimathity',
  desc: '左侧灰色静态的课本定义，右侧同一知识点的 viz 发光播放，分割线扫过揭开。props: leftLabel, rightLabel, tex, text(课本段落), viz',
  bars: 2,
  component: BeforeAfter,
  defaults: {
    leftLabel: '课本上',
    rightLabel: 'Unimathity',
    viz: 'riemann',
    text: '设函数 f(x) 在区间 [a, b] 上有界，在 [a, b] 中任意插入若干个分点，把 [a, b] 分成 n 个小区间，在每个小区间上任取一点 ξᵢ，作和式……当 λ → 0 时，若和式的极限总存在，则称该极限为 f(x) 在 [a, b] 上的定积分。',
    tex: '\\int_a^b f(x)\\,dx=\\lim_{\\lambda\\to 0}\\sum_{i=1}^{n} f(\\xi_i)\\,\\Delta x_i',
  },
});
