import React from 'react';
import {C, F} from '../core/theme';

/** 小标签：如「线性代数 · 特征值几何意义」。 */
export const Chip: React.FC<{children: React.ReactNode; color?: string; size?: number; filled?: boolean; style?: React.CSSProperties}> = ({
  children,
  color = C.orange,
  size = 26,
  filled = false,
  style,
}) => (
  <div
    style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: size * 0.4,
      padding: `${size * 0.32}px ${size * 0.75}px`,
      borderRadius: size * 2,
      border: `2px solid ${color}`,
      background: filled ? color : 'rgba(5,8,26,0.55)',
      color: filled ? C.bg : color,
      fontFamily: F.cn,
      fontWeight: 700,
      fontSize: size,
      letterSpacing: '0.04em',
      whiteSpace: 'nowrap',
      ...style,
    }}
  >
    {children}
  </div>
);
