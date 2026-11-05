import React from 'react';
import {AbsoluteFill, random} from 'remotion';
import {Backdrop} from '../../components/Backdrop';
import {Chip} from '../../components/Chip';
import {GlitchText} from '../../components/GlitchText';
import {useBeat, useProgress, useUnit} from '../../core/beat';
import {C, F} from '../../core/theme';
import {BEAT, clamp, easeOutCubic, easeOutExpo, seg} from '../../core/time';
import {defineModule} from '../../core/types';
import {FormulaFog, PAIN_FORMULAS, Photo, beatJitter, hiMask, impact, slamStyle} from './shared';

export type PainPhotoProps = {
  photo: string;
  index: string;
  label: string;
  title: string;
  subtitle: string;
  layout: 'left' | 'right';
  highlight?: string;
  formulas: string[];
};

/** 痛点卡：大照片位 + 「痛点 01」+ 逐字砸入的大标题 + 副标题，背景是抖动重叠的公式雾。 */
const PainPhoto: React.FC<PainPhotoProps> = ({photo, index, label, title, subtitle, layout, highlight, formulas}) => {
  const {frame, duration, t} = useProgress();
  const {u, width, height, portrait} = useUnit();
  const {pulse, frac} = useBeat();
  const left = layout !== 'right';
  const dir = left ? 1 : -1;

  // —— 版式
  let px: number, py: number, pw: number, ph: number;
  let tx: number, ty: number, tw: number, th: number;
  if (portrait) {
    pw = width * 0.86;
    ph = height * 0.47;
    px = (width - pw) / 2 + dir * -width * 0.015;
    py = height * 0.07;
    tx = width * 0.08;
    tw = width * 0.84;
    ty = py + ph + height * 0.04;
    th = height - ty - height * 0.06;
  } else {
    pw = width * 0.53;
    ph = height * 0.8;
    py = (height - ph) / 2;
    px = left ? width * 0.045 : width - pw - width * 0.045;
    tw = width * 0.42;
    tx = left ? px + pw - width * 0.02 : px + width * 0.02 - tw;
    ty = height * 0.12;
    th = height * 0.76;
  }

  // —— 时间（按拍设计，长于 1 小节时自然停留）
  const titleStart = 5;
  const chars = Array.from(title);
  const stagger = Math.min(3, (duration * 0.42) / Math.max(1, chars.length));
  const titleEnd = titleStart + chars.length * stagger + 8;
  const subStart = Math.min(titleEnd, duration * 0.62);
  const pad = portrait ? 0 : width * 0.035;
  const usable = tw - pad;
  const titleSize = Math.min(132 * u, (usable * 0.97) / Math.max(1, chars.length * 1.04));
  const subChars = Array.from(subtitle).length;
  const subSize = Math.min(46 * u, (usable * 0.96) / Math.max(1, subChars));
  const mask = hiMask(title, highlight);
  const hits = chars.map((_, i) => titleStart + i * stagger + 4);
  const hit = impact(frame, hits, 2.4);

  // —— 照片入场与随拍抖动
  const pin = easeOutExpo(clamp(frame / 12));
  const pj = beatJitter(frame, `pp${index}`, 7 * u);
  const shake = (random(`pp-s${frame}`) - 0.5) * Math.min(1.5, hit) * 8 * u;
  const tilt = (portrait ? 0.8 : 1.6) * -dir;
  const photoStyle: React.CSSProperties = {
    position: 'absolute',
    left: px,
    top: py,
    transform: `translate(${(1 - pin) * -dir * width * 0.08 + pj.x}px, ${pj.y}px) rotate(${tilt + pj.r * 0.4}deg) scale(${1.08 - 0.08 * pin})`,
    filter: `blur(${(1 - pin) * 16}px)`,
    opacity: clamp(pin * 1.5),
  };
  const rgbOn = frac < 0.16 && frame > 8;
  const outEnd = seg(frame, duration - 5, duration);

  return (
    <AbsoluteFill>
      <Backdrop tint={C.deep} energy={0.45} />
      <FormulaFog formulas={formulas} frame={frame} width={width} height={height} u={u} count={18} seed={`pf${index}`} />

      {/* 巨大描边编号 */}
      <div
        style={{
          position: 'absolute',
          left: portrait ? width * 0.5 : tx + tw * 0.5,
          top: portrait ? ty + th * 0.5 : height * 0.5,
          transform: `translate(-50%, -50%) translateX(${-dir * 30 * u * (1 - t)}px)`,
          fontFamily: F.en,
          fontWeight: 700,
          fontSize: (portrait ? 520 : 560) * u,
          lineHeight: 1,
          color: 'transparent',
          WebkitTextStroke: `${3 * u}px rgba(168,205,246,${0.1 + 0.05 * pulse})`,
          letterSpacing: '-0.04em',
        }}
      >
        {index}
      </div>

      {/* 照片：RGB 错位描边 + 照片位 */}
      <div style={photoStyle}>
        {rgbOn ? (
          <>
            <div style={{position: 'absolute', inset: 0, border: `3px solid ${C.blue}`, borderRadius: 16 * u, transform: `translate(${-12 * u * pulse}px, ${4 * u * pulse}px)`, opacity: 0.8}} />
            <div style={{position: 'absolute', inset: 0, border: `3px solid ${C.orange}`, borderRadius: 16 * u, transform: `translate(${12 * u * pulse}px, ${-4 * u * pulse}px)`, opacity: 0.7}} />
          </>
        ) : null}
        <Photo photo={photo} w={pw} h={ph} radius={16 * u} />
        {/* 扫描线与暗角，压抑感 */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            borderRadius: 16 * u,
            background: `repeating-linear-gradient(0deg, rgba(5,8,26,0.18) 0 ${2 * u}px, transparent ${2 * u}px ${5 * u}px)`,
            boxShadow: `inset 0 0 ${120 * u}px rgba(5,8,26,0.8)`,
            pointerEvents: 'none',
          }}
        />
        {rgbOn ? (
          <div
            style={{
              position: 'absolute',
              left: 0,
              right: 0,
              top: `${random(`pp-cut${Math.floor(frame / BEAT)}`) * 80}%`,
              height: 18 * u,
              background: 'rgba(168,205,246,0.25)',
              transform: `translateX(${(random(`pp-cx${frame}`) - 0.5) * 40 * u}px)`,
              mixBlendMode: 'screen',
            }}
          />
        ) : null}
      </div>

      {/* 前景公式碎片，越过照片边缘造成重叠 */}
      <FormulaFog formulas={formulas} frame={frame} width={width} height={height} u={u} count={4} seed={`pg${index}`} sharp opacity={0.9} />

      {/* 文字 */}
      <div
        style={{
          position: 'absolute',
          left: tx,
          top: ty,
          width: tw,
          height: th,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: portrait ? 'center' : left ? 'flex-start' : 'flex-end',
          textAlign: portrait ? 'center' : left ? 'left' : 'right',
          gap: 26 * u,
          transform: `translate(${shake}px, ${shake * 0.4}px)`,
          paddingLeft: left ? pad : 0,
          paddingRight: left ? 0 : pad,
          boxSizing: 'border-box',
        }}
      >
        <div
          style={{
            opacity: clamp(frame / 5),
            transform: `translateY(${(1 - easeOutCubic(clamp(frame / 8))) * 20 * u}px) scale(${1 + 0.06 * pulse})`,
            transformOrigin: left ? 'left center' : 'right center',
          }}
        >
          <Chip color={C.danger} size={30 * u} filled={rgbOn}>
            {label} <span style={{fontFamily: F.en}}>{index}</span>
          </Chip>
        </div>
        <div
          style={{
            fontFamily: F.cn,
            fontWeight: 900,
            fontSize: titleSize,
            lineHeight: 1.12,
            letterSpacing: '0.02em',
            whiteSpace: 'pre',
            color: C.ink,
            textShadow: `0 ${6 * u}px ${30 * u}px rgba(5,8,26,0.9), 0 0 ${26 * u}px rgba(168,205,246,0.25)`,
          }}
        >
          {chars.map((ch, i) => {
            const isLastChar = i === chars.length - 1;
            const node = (
              <span key={i} style={{...slamStyle(frame, titleStart + i * stagger, 8), color: mask[i] ? C.orange : undefined}}>
                {ch}
              </span>
            );
            return isLastChar ? (
              <GlitchText key={i} active={(frame > hits[i] && frame < hits[i] + 4) || (frac < 0.1 && frame > titleEnd) || outEnd > 0} amount={22 * u}>
                {node}
              </GlitchText>
            ) : (
              node
            );
          })}
        </div>
        <div
          style={{
            width: tw * 0.32 * easeOutCubic(seg(frame, titleEnd - 6, titleEnd + 6)),
            height: 5 * u,
            borderRadius: 3 * u,
            background: C.orange,
            boxShadow: `0 0 ${16 * u}px ${C.orange}`,
          }}
        />
        <div
          style={{
            fontFamily: F.cn,
            fontWeight: 400,
            fontSize: subSize,
            color: C.sky,
            whiteSpace: 'pre',
            opacity: easeOutCubic(seg(frame, subStart, subStart + 9)),
            filter: `blur(${(1 - easeOutCubic(seg(frame, subStart, subStart + 9))) * 10}px)`,
            transform: `translateY(${(1 - easeOutCubic(seg(frame, subStart, subStart + 9))) * 18 * u}px)`,
            textShadow: `0 ${4 * u}px ${18 * u}px rgba(5,8,26,0.95)`,
          }}
        >
          {subtitle}
        </div>
      </div>

      <AbsoluteFill style={{background: C.white, opacity: clamp(hit * 0.04), mixBlendMode: 'screen', pointerEvents: 'none'}} />
    </AbsoluteFill>
  );
};

export const PainPhotoModule = defineModule<PainPhotoProps>({
  id: 'PainPhoto',
  family: 'pain',
  title: '痛点卡 · 照片 + 大标题',
  desc: '约 55% 的照片位 + 「痛点 01」标签 + 逐字砸入的大标题 + 副标题，背景是模糊抖动的公式雾。props：photo, index, label, title, subtitle, layout(left/right), highlight, formulas。',
  bars: 1,
  component: PainPhoto,
  defaults: {
    photo: 'pain-01',
    index: '01',
    label: '痛点',
    title: '公式背了又忘',
    subtitle: '符号一长串，意思一片空白',
    layout: 'left',
    formulas: PAIN_FORMULAS,
  },
});
