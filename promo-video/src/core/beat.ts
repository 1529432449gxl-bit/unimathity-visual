import {useCurrentFrame, useVideoConfig} from 'remotion';
import {BAR, BEAT} from './time';

/**
 * 节拍时钟。模块都从拍点开始，所以局部帧号的拍相位与整片一致。
 * pulse：每拍起点为 1，随后指数衰减，可直接驱动闪烁、缩放、辉光。
 */
export function useBeat() {
  const frame = useCurrentFrame();
  const beat = frame / BEAT;
  const index = Math.floor(beat);
  const frac = beat - index;
  return {
    frame,
    beat,
    index,
    frac,
    pulse: Math.exp(-frac * 5),
    bar: Math.floor(frame / BAR),
    barFrac: (frame % BAR) / BAR,
  };
}

/** 本模块的进度 0..1（随所在 Sequence 的长度自适应）。 */
export function useProgress() {
  const frame = useCurrentFrame();
  const {durationInFrames, width, height, fps} = useVideoConfig();
  return {frame, t: Math.min(1, frame / Math.max(1, durationInFrames - 1)), duration: durationInFrames, width, height, fps};
}

/** 以 1080 为基准的尺寸单位，横竖屏都按短边缩放。 */
export function useUnit() {
  const {width, height} = useVideoConfig();
  return {u: Math.min(width, height) / 1080, width, height, portrait: height > width};
}
