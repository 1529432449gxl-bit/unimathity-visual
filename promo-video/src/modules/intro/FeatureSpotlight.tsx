import React from 'react';
import {AbsoluteFill} from 'remotion';
import {Backdrop} from '../../components/Backdrop';
import {Chip} from '../../components/Chip';
import {SlamText} from '../../components/SlamText';
import {Viz} from '../../components/Viz';
import {useBeat} from '../../core/beat';
import {C, F} from '../../core/theme';
import {clamp, easeOutBack, easeOutCubic, lerp} from '../../core/time';
import {defineModule} from '../../core/types';
import {Stage, Sweep, hit, usePlan, useStage} from './util';

type Props = {index: string; title: string; desc: string; tags: string[]; viz: string; side: 'left' | 'right'};

/** 发光面板：四角橙色括角、随拍呼吸的描边、扫描线。 */
export const GlowPanel: React.FC<{w: number; h: number; pulse: number; flash: number; children: React.ReactNode; scan?: number}> = ({w, h, pulse, flash, children, scan = -1}) => {
  const corner = (rot: number, x: number, y: number) => (
    <svg key={rot} width={60} height={60} viewBox="0 0 60 60" style={{position: 'absolute', left: x, top: y, transform: `rotate(${rot}deg)`}}>
      <path d="M4 40 V4 H40" fill="none" stroke={C.orange} strokeWidth={6} strokeLinecap="round" style={{filter: `drop-shadow(0 0 ${6 + 10 * flash}px ${C.orange})`}} />
    </svg>
  );
  return (
    <div style={{position: 'relative', width: w, height: h}}>
      <div
        style={{
          position: 'absolute',
          inset: 0,
          borderRadius: 28,
          background: `radial-gradient(ellipse at 50% 40%, ${C.panelHi} 0%, ${C.panel} 55%, ${C.bg2} 100%)`,
          border: `2px solid rgba(168,205,246,${0.35 + 0.4 * flash})`,
          boxShadow: `0 0 ${40 + 30 * pulse + 60 * flash}px rgba(111,156,255,${0.35 + 0.3 * flash}), inset 0 0 60px rgba(111,156,255,0.15)`,
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            position: 'absolute',
            inset: 0,
            backgroundImage: 'linear-gradient(rgba(168,205,246,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(168,205,246,0.06) 1px, transparent 1px)',
            backgroundSize: '48px 48px',
          }}
        />
        <div style={{position: 'absolute', left: 30, top: 30}}>{children}</div>
        {scan >= 0 && scan <= 1 ? (
          <div style={{position: 'absolute', left: 0, right: 0, top: `${scan * 100}%`, height: 3, background: C.sky, boxShadow: `0 0 24px 6px rgba(168,205,246,0.5)`, opacity: Math.sin(scan * Math.PI)}} />
        ) : null}
        <Sweep p={flash > 0 ? 1 - flash : 0} opacity={0.2} />
      </div>
      {corner(0, -14, -14)}
      {corner(90, w - 46, -14)}
      {corner(180, w - 46, h - 46)}
      {corner(270, -14, h - 46)}
    </div>
  );
};

/**
 * 卖点特写：第 0 拍面板滑入、大号序号砸下；第 1 拍标题逐字砸入；第 2 拍描述浮现；
 * 第 3~5 拍标签逐拍弹出；之后面板随拍呼吸、第 6 拍扫描线。side 决定文字在左还是右，竖屏自动改成上图下文。
 */
const FeatureSpotlight: React.FC<Props> = ({index, title, desc, tags, viz, side}) => {
  const {frame, at, len, p} = usePlan(8);
  const {pulse} = useBeat();
  const {W, H, portrait} = useStage();
  const textLeft = side !== 'right';

  const panelW = portrait ? 960 : 860;
  const panelH = portrait ? 720 : 700;
  const panelX = portrait ? (W - panelW) / 2 : textLeft ? W - 130 - panelW : 130;
  const panelY = portrait ? 170 : (H - panelH) / 2;
  const textX = portrait ? 80 : textLeft ? 130 : W - 130 - 800;
  const textW = portrait ? W - 160 : 800;
  const textY = portrait ? panelY + panelH + 90 : H / 2 - 300;

  const inQ = easeOutCubic(p(0, 1));
  const dir = portrait ? 0 : textLeft ? 1 : -1;
  const titleChars = Array.from(title).length;
  const titleSize = Math.min(portrait ? 96 : 88, (textW / Math.max(1, titleChars)) * 0.98);
  const idxQ = easeOutBack(p(0, 0.6), 2);
  const descQ = easeOutCubic(p(2, 1));
  const flash = hit(frame, at(4), 7) + hit(frame, at(6), 7) * 0.6;

  return (
    <AbsoluteFill>
      <Backdrop tint={C.deep} energy={0.55} />
      <Stage>
        {/* 背后的大号序号 */}
        <div
          style={{
            position: 'absolute',
            left: textX - (portrait ? 0 : 20),
            top: textY - (portrait ? 60 : 120),
            fontFamily: F.en,
            fontWeight: 700,
            fontSize: portrait ? 220 : 300,
            lineHeight: 1,
            color: 'transparent',
            WebkitTextStroke: `3px ${C.orange}`,
            opacity: 0.85 * clamp(idxQ),
            transform: `scale(${lerp(1.8, 1, idxQ)})`,
            transformOrigin: '0 50%',
            filter: `drop-shadow(0 0 ${14 + 16 * pulse}px rgba(244,162,76,0.6)) blur(${(1 - clamp(idxQ)) * 10}px)`,
            letterSpacing: '-0.03em',
          }}
        >
          {index}
        </div>

        {/* 文字列 */}
        <div style={{position: 'absolute', left: textX, top: textY + (portrait ? 150 : 210), width: textW}}>
          <SlamText text={title} start={at(1)} stagger={2} dur={8} size={titleSize} align="left" style={{textShadow: `0 0 26px rgba(111,156,255,0.55)`}} />
          <div
            style={{
              marginTop: 30,
              fontFamily: F.cn,
              fontWeight: 400,
              fontSize: portrait ? 38 : 36,
              lineHeight: 1.6,
              color: C.sky,
              opacity: descQ * 0.92,
              transform: `translateY(${(1 - descQ) * 24}px)`,
              filter: `blur(${(1 - descQ) * 6}px)`,
            }}
          >
            {desc}
          </div>
          <div style={{marginTop: 38, display: 'flex', gap: 18, flexWrap: 'wrap'}}>
            {tags.map((tg, i) => {
              const tq = clamp((frame - at(3 + i) + 3) / 9);
              const h = hit(frame, at(3 + i), 6);
              return (
                <div key={i} style={{transform: `scale(${easeOutBack(tq, 2.4)})`, opacity: tq > 0 ? 1 : 0, filter: `drop-shadow(0 0 ${12 * h}px ${C.orange})`}}>
                  <Chip size={portrait ? 32 : 30} color={i === 0 ? C.orange : C.sky} filled={h > 0.5}>
                    {tg}
                  </Chip>
                </div>
              );
            })}
          </div>
        </div>

        {/* 面板 */}
        <div
          style={{
            position: 'absolute',
            left: panelX,
            top: panelY,
            perspective: 2000,
            transform: `translate(${dir * (1 - inQ) * 500}px, ${portrait ? (1 - inQ) * -300 : 0}px)`,
            opacity: clamp(inQ * 2),
            filter: `blur(${(1 - inQ) * 12}px)`,
          }}
        >
          <div style={{transform: `rotateY(${dir * -(1 - inQ) * 35 + dir * -6}deg) scale(${1 + 0.015 * pulse})`}}>
            <GlowPanel w={panelW} h={panelH} pulse={pulse} flash={clamp(flash)} scan={p(6, 1.2) > 0 && p(6, 1.2) < 1 ? p(6, 1.2) : -1}>
              <Viz id={viz} w={panelW - 60} h={panelH - 60} t={clamp(lerp(0, 1, (frame - at(0.5)) / Math.max(1, len(7.5))))} />
            </GlowPanel>
          </div>
        </div>
      </Stage>
    </AbsoluteFill>
  );
};

export const FeatureSpotlightModule = defineModule<Props>({
  id: 'FeatureSpotlight',
  family: 'intro',
  title: '卖点特写',
  desc: '左文右图（side 可换）：大号序号 + 标题 + 描述 + 标签逐拍弹出，发光面板里播放 viz。props：index, title, desc, tags, viz, side(left|right，指文字所在侧)。',
  bars: 2,
  component: FeatureSpotlight,
  defaults: {
    index: '01',
    title: '逐步演示，自动播放',
    desc: '推导拆成一步一步的动画，可以自动播放，也能随时暂停、拖回去再看一遍。',
    tags: ['逐步演示', '自动播放', '随时暂停'],
    viz: 'newton',
    side: 'left',
  },
});
