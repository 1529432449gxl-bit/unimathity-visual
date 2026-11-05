import React from 'react';
import {AbsoluteFill} from 'remotion';
import {useBeat} from '../core/beat';
import {C} from '../core/theme';

/**
 * 深色背景：径向渐变 + 缓慢漂移的点阵 + 暗角 + 颗粒。所有模块都垫这一层，保证整片统一。
 * tint：中心光的颜色；energy：随拍闪亮的强度（0 关闭）。
 */
export const Backdrop: React.FC<{tint?: string; energy?: number; dots?: boolean; grain?: boolean}> = ({
  tint = C.deep,
  energy = 0.35,
  dots = true,
  grain = true,
}) => {
  const {frame, pulse} = useBeat();
  const glowA = 0.55 + energy * 0.35 * pulse;
  return (
    <AbsoluteFill style={{backgroundColor: C.bg, overflow: 'hidden'}}>
      <AbsoluteFill
        style={{
          background: `radial-gradient(ellipse 70% 60% at 50% 45%, ${tint} 0%, ${C.bg2} 45%, ${C.bg} 100%)`,
          opacity: glowA,
        }}
      />
      {dots ? (
        <AbsoluteFill
          style={{
            backgroundImage: `radial-gradient(circle, rgba(168,205,246,0.16) 1.2px, transparent 1.6px)`,
            backgroundSize: '44px 44px',
            backgroundPosition: `${(frame * 0.35) % 44}px ${(frame * 0.6) % 44}px`,
            maskImage: 'radial-gradient(ellipse 75% 70% at 50% 50%, black 30%, transparent 100%)',
            WebkitMaskImage: 'radial-gradient(ellipse 75% 70% at 50% 50%, black 30%, transparent 100%)',
          }}
        />
      ) : null}
      <AbsoluteFill style={{background: 'radial-gradient(ellipse 85% 80% at 50% 50%, transparent 55%, rgba(0,0,0,0.65) 100%)'}} />
      {grain ? (
        <AbsoluteFill style={{opacity: 0.07, mixBlendMode: 'screen'}}>
          <svg width="100%" height="100%">
            <filter id="grain">
              <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="2" seed={frame % 23} />
            </filter>
            <rect width="100%" height="100%" filter="url(#grain)" />
          </svg>
        </AbsoluteFill>
      ) : null}
    </AbsoluteFill>
  );
};
