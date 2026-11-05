import React from 'react';
import {AbsoluteFill} from 'remotion';
import {useProgress, useUnit} from '../../core/beat';
import {BEAT, clamp, lerp} from '../../core/time';

/**
 * 节拍计划：模块按「计划拍数」（默认 8 拍 = 2 小节）设计动作，实际时长变化时按比例伸缩，
 * 并吸附到半拍网格上，所以 1~4 小节都能保持动作落在拍点。
 * - at(k)：计划第 k 拍对应的局部帧（吸附到半拍）
 * - len(k)：k 拍的伸缩后帧数（至少 3 帧）
 * - p(k, d)：从第 k 拍开始、持续 d 拍的 0..1 进度
 */
export function usePlan(plan = 8) {
  const {frame, duration, t} = useProgress();
  const nb = duration / BEAT;
  const s = nb / plan;
  const at = (k: number) => (Math.round(k * s * 2) / 2) * BEAT;
  const len = (k: number) => Math.max(3, k * s * BEAT);
  const p = (k: number, d: number) => clamp((frame - at(k)) / len(d));
  return {frame, duration, t, nb, s, at, len, p};
}

/** 某个事件帧之后的指数衰减冲击（0..1），用于落地闪光、震动。 */
export const hit = (frame: number, start: number, decay = 6) => (frame < start ? 0 : Math.exp(-(frame - start) / decay));

/**
 * 设计坐标舞台：横屏为 1920×1080、竖屏为 1080×1920（按短边 1080 归一），整体按 u 缩放。
 * 子元素直接用像素写布局。
 */
export const Stage: React.FC<{children: React.ReactNode; style?: React.CSSProperties}> = ({children, style}) => {
  const {u, width, height} = useUnit();
  return (
    <AbsoluteFill style={{overflow: 'hidden'}}>
      <div
        style={{
          position: 'absolute',
          left: 0,
          top: 0,
          width: width / u,
          height: height / u,
          transform: `scale(${u})`,
          transformOrigin: '0 0',
          ...style,
        }}
      >
        {children}
      </div>
    </AbsoluteFill>
  );
};

/** 舞台尺寸（设计像素）。 */
export function useStage() {
  const {u, width, height, portrait} = useUnit();
  return {W: width / u, H: height / u, portrait};
}

/** 光带扫过：放在 position:relative + overflow:hidden 的容器里。p 为 0..1。 */
export const Sweep: React.FC<{p: number; angle?: number; band?: number; color?: string; opacity?: number}> = ({
  p,
  angle = 18,
  band = 22,
  color = 'rgba(255,255,255,0.9)',
  opacity = 0.55,
}) => {
  if (p <= 0 || p >= 1) return null;
  const x = lerp(-band * 2.5, 100 + band * 1.5, p);
  return (
    <div
      style={{
        position: 'absolute',
        top: '-60%',
        height: '220%',
        left: `${x}%`,
        width: `${band}%`,
        transform: `rotate(${angle}deg)`,
        background: `linear-gradient(90deg, transparent 0%, ${color} 50%, transparent 100%)`,
        opacity,
        mixBlendMode: 'screen',
        pointerEvents: 'none',
        filter: 'blur(6px)',
      }}
    />
  );
};

/** 文字光带：在文字上叠一层只在字形内可见的高光，p 从 0 到 1 由左向右扫过。 */
export const SweepText: React.FC<{text: string; p: number; style?: React.CSSProperties; color?: string}> = ({text, p, style, color = '#ffffff'}) => {
  if (p <= 0 || p >= 1) return null;
  return (
    <span
      aria-hidden
      style={{
        position: 'absolute',
        inset: 0,
        whiteSpace: 'pre',
        color: 'transparent',
        backgroundImage: `linear-gradient(105deg, transparent 0%, transparent 42%, ${color} 50%, transparent 58%, transparent 100%)`,
        backgroundSize: '300% 100%',
        backgroundPosition: `${lerp(100, 0, p)}% 0`,
        WebkitBackgroundClip: 'text',
        backgroundClip: 'text',
        filter: `drop-shadow(0 0 12px ${color})`,
        ...style,
      }}
    >
      {text}
    </span>
  );
};

/** 一次性 SVG 发光滤镜定义（id 需唯一）。 */
export const GlowFilter: React.FC<{id: string; std?: number}> = ({id, std = 6}) => (
  <filter id={id} x="-50%" y="-50%" width="200%" height="200%">
    <feGaussianBlur stdDeviation={std} result="b" />
    <feMerge>
      <feMergeNode in="b" />
      <feMergeNode in="b" />
      <feMergeNode in="SourceGraphic" />
    </feMerge>
  </filter>
);
