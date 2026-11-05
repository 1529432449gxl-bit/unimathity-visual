import React from 'react';
import {useCurrentFrame} from 'remotion';
import {clamp, easeOutBack, easeOutCubic} from '../core/time';
import {C, F} from '../core/theme';

/**
 * 逐字砸入的大字。start：开始帧；stagger：相邻字间隔帧（拍上可用 BEAT/2 等）。
 * 每个字从放大、模糊、透明落到原位，节奏感来自 stagger 与拍对齐。
 */
export const SlamText: React.FC<{
  text: string;
  start?: number;
  stagger?: number;
  dur?: number;
  size?: number;
  color?: string;
  weight?: number;
  font?: string;
  letterSpacing?: number;
  highlight?: string; // 需要用强调色的子串
  highlightColor?: string;
  align?: 'left' | 'center' | 'right';
  style?: React.CSSProperties;
}> = ({
  text,
  start = 0,
  stagger = 3,
  dur = 9,
  size = 120,
  color = C.ink,
  weight = 900,
  font = F.cn,
  letterSpacing = 0.02,
  highlight,
  highlightColor = C.orange,
  align = 'center',
  style,
}) => {
  const frame = useCurrentFrame();
  const chars = Array.from(text);
  let hiStart = -1;
  if (highlight) hiStart = text.indexOf(highlight);
  const hiLen = highlight ? Array.from(highlight).length : 0;
  return (
    <div
      style={{
        fontFamily: font,
        fontWeight: weight,
        fontSize: size,
        lineHeight: 1.15,
        letterSpacing: `${letterSpacing}em`,
        textAlign: align,
        whiteSpace: 'pre',
        color,
        ...style,
      }}
    >
      {chars.map((ch, i) => {
        const p = clamp((frame - start - i * stagger) / dur);
        const s = 1.9 - 0.9 * easeOutBack(p, 2.2);
        const blur = (1 - easeOutCubic(p)) * 14;
        const isHi = hiStart >= 0 && i >= hiStart && i < hiStart + hiLen;
        return (
          <span
            key={i}
            style={{
              display: 'inline-block',
              transform: `scale(${s}) translateY(${(1 - easeOutCubic(p)) * -0.15}em)`,
              filter: `blur(${blur}px)`,
              opacity: clamp(p * 2.5),
              color: isHi ? highlightColor : undefined,
            }}
          >
            {ch === ' ' ? ' ' : ch}
          </span>
        );
      })}
    </div>
  );
};
