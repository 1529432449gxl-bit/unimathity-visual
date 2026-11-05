import React from 'react';
import {Img, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import {PHOTOS} from '../content/photos.generated';
import {C, F} from '../core/theme';

/**
 * 照片位。photo 可以写槽位名（如 "pain-01"，对应 public/photos/pain-01.jpg）或 public 下的相对路径。
 * 找不到照片时显示设计好的占位框（写明槽位名），换上照片后无需改代码：
 * 把文件放进 public/photos/，运行 npm run photos（studio / render 会自动运行）。
 * 照片统一做深蓝双色调处理 + 缓慢推镜（Ken Burns），与整片色调一致。
 */
export const PhotoSlot: React.FC<{
  photo: string;
  width: number | string;
  height: number | string;
  radius?: number;
  zoom?: [number, number]; // 推镜起止缩放
  pan?: [number, number]; // 横向平移（%）
  duotone?: boolean;
  style?: React.CSSProperties;
}> = ({photo, width, height, radius = 18, zoom = [1.08, 1.2], pan = [-2, 2], duotone = true, style}) => {
  const frame = useCurrentFrame();
  const {durationInFrames} = useVideoConfig();
  const t = Math.min(1, frame / Math.max(1, durationInFrames));
  const src = resolvePhoto(photo);
  const scale = zoom[0] + (zoom[1] - zoom[0]) * t;
  const x = pan[0] + (pan[1] - pan[0]) * t;
  return (
    <div
      style={{
        position: 'relative',
        width,
        height,
        borderRadius: radius,
        overflow: 'hidden',
        background: C.panel,
        boxShadow: '0 30px 80px rgba(0,0,0,0.55)',
        ...style,
      }}
    >
      {src ? (
        <>
          <Img
            src={src}
            style={{
              position: 'absolute',
              inset: 0,
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              transform: `scale(${scale}) translateX(${x}%)`,
              filter: duotone ? 'grayscale(1) contrast(1.15) brightness(0.9)' : undefined,
            }}
          />
          {duotone ? (
            <div style={{position: 'absolute', inset: 0, background: `linear-gradient(160deg, ${C.blue}, ${C.deep} 55%, ${C.warm})`, mixBlendMode: 'color', opacity: 0.85}} />
          ) : null}
          <div style={{position: 'absolute', inset: 0, background: 'linear-gradient(180deg, transparent 55%, rgba(5,8,26,0.6))'}} />
        </>
      ) : (
        <Placeholder name={photo} t={t} />
      )}
    </div>
  );
};

export function resolvePhoto(photo: string): string | null {
  if (!photo) return null;
  const hit = (PHOTOS as Record<string, string>)[photo];
  if (hit) return staticFile(hit);
  if (/\.(jpe?g|png|webp|gif)$/i.test(photo) && Object.values(PHOTOS).includes(photo)) return staticFile(photo);
  return null;
}

const Placeholder: React.FC<{name: string; t: number}> = ({name, t}) => (
  <div
    style={{
      position: 'absolute',
      inset: 0,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 18,
      background: `repeating-linear-gradient(135deg, ${C.panel} 0 22px, ${C.panelHi} 22px 44px)`,
      backgroundPosition: `${t * 120}px 0`,
      border: `3px dashed ${C.dim}`,
      borderRadius: 'inherit',
      color: C.sky,
      fontFamily: F.cn,
    }}
  >
    <svg width="84" height="70" viewBox="0 0 84 70" fill="none" stroke={C.sky} strokeWidth="4">
      <rect x="4" y="14" width="76" height="52" rx="8" />
      <path d="M28 14 L34 4 H50 L56 14" />
      <circle cx="42" cy="40" r="14" />
    </svg>
    <div style={{fontSize: 30, fontWeight: 700}}>照片位</div>
    <div style={{fontFamily: F.mono, fontSize: 22, color: C.gray}}>public/photos/{name}.jpg</div>
  </div>
);
