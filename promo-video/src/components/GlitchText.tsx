import React from 'react';
import {random, useCurrentFrame} from 'remotion';
import {C} from '../core/theme';

/**
 * RGB 错位故障字。active=true 的帧上三层错开并横向切片抖动；否则正常显示。
 * 常用法：active={frame % BEAT < 3} 让每拍开头闪一下。
 */
export const GlitchText: React.FC<{
  children: React.ReactNode;
  active: boolean;
  amount?: number;
  style?: React.CSSProperties;
  colorA?: string;
  colorB?: string;
}> = ({children, active, amount = 14, style, colorA = C.blue, colorB = C.orange}) => {
  const frame = useCurrentFrame();
  const dx = active ? (random(`gx${frame}`) - 0.5) * amount : 0;
  const dy = active ? (random(`gy${frame}`) - 0.5) * amount * 0.3 : 0;
  const cut = active ? random(`gc${frame}`) * 100 : 0;
  const layer = (color: string, x: number, y: number, clip?: string): React.CSSProperties => ({
    position: 'absolute',
    inset: 0,
    color,
    transform: `translate(${x}px, ${y}px)`,
    mixBlendMode: 'screen',
    clipPath: clip,
  });
  return (
    <div style={{position: 'relative', display: 'inline-block', ...style}}>
      <div style={{visibility: 'hidden'}}>{children}</div>
      {active ? (
        <>
          <div style={layer(colorA, -dx, -dy)}>{children}</div>
          <div style={layer(colorB, dx, dy)}>{children}</div>
          <div style={layer(C.ink, dx * 1.6, 0, `inset(${cut}% 0 ${Math.max(0, 88 - cut)}% 0)`)}>{children}</div>
        </>
      ) : null}
      <div style={{position: 'absolute', inset: 0, opacity: active ? 0.85 : 1}}>{children}</div>
    </div>
  );
};
