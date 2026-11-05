import React from 'react';
import {AbsoluteFill, random, useCurrentFrame} from 'remotion';
import type {Transition} from '../core/types';
import {clamp, easeOutCubic} from '../core/time';

/** 模块开头的转场。放在 Sequence 里包住模块即可，帧号为局部帧。 */
export const CutIn: React.FC<{kind?: Transition; children: React.ReactNode}> = ({kind = 'flash', children}) => {
  const frame = useCurrentFrame();
  if (kind === 'none') return <AbsoluteFill>{children}</AbsoluteFill>;
  const p = clamp(frame / 10);
  let style: React.CSSProperties = {};
  let overlay: React.ReactNode = null;
  if (kind === 'flash') {
    style = {transform: `scale(${1.06 - 0.06 * easeOutCubic(p)})`};
    overlay = <AbsoluteFill style={{background: '#fff', opacity: 0.85 * Math.pow(1 - clamp(frame / 6), 2), pointerEvents: 'none'}} />;
  } else if (kind === 'punch') {
    style = {transform: `scale(${1.18 - 0.18 * easeOutCubic(clamp(frame / 8))})`, filter: `blur(${(1 - clamp(frame / 6)) * 8}px)`};
  } else if (kind === 'glitch') {
    const on = frame < 7;
    const dx = on ? (random(`cut${frame}`) - 0.5) * 80 : 0;
    style = {transform: `translateX(${dx}px)`, filter: on ? `hue-rotate(${random(`h${frame}`) * 90}deg) saturate(1.6)` : undefined};
    overlay = on ? (
      <AbsoluteFill style={{background: `linear-gradient(transparent ${random(`a${frame}`) * 80}%, rgba(111,156,255,0.35) 0 ${random(`a${frame}`) * 80 + 6}%, transparent 0)`}} />
    ) : null;
  } else if (kind === 'slide') {
    style = {transform: `translateX(${(1 - easeOutCubic(clamp(frame / 9))) * 100}%)`};
  }
  return (
    <AbsoluteFill style={{overflow: 'hidden'}}>
      <AbsoluteFill style={style}>{children}</AbsoluteFill>
      {overlay}
    </AbsoluteFill>
  );
};
