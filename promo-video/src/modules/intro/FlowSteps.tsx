import React from 'react';
import {AbsoluteFill} from 'remotion';
import {Backdrop} from '../../components/Backdrop';
import {SlamText} from '../../components/SlamText';
import {useBeat} from '../../core/beat';
import {C, F} from '../../core/theme';
import {clamp, easeInOutCubic, easeOutBack, easeOutCubic, lerp} from '../../core/time';
import {defineModule} from '../../core/types';
import {GlowFilter, Stage, hit, usePlan, useStage} from './util';

type Step = {title: string; sub: string; icon?: 'book' | 'play' | 'drag' | 'spark'};
type Props = {title: string; steps: Step[]};

const ICONS = ['book', 'play', 'drag', 'spark'] as const;

/** 线稿小图标（100×100 视窗）。 */
const Icon: React.FC<{kind: string; color: string; size: number; t: number}> = ({kind, color, size, t}) => {
  const sw = 6;
  const common = {fill: 'none', stroke: color, strokeWidth: sw, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const};
  return (
    <svg width={size} height={size} viewBox="0 0 100 100">
      {kind === 'book' ? (
        <>
          <path d="M50 28 C40 20 24 18 12 22 V78 C24 74 40 76 50 84 C60 76 76 74 88 78 V22 C76 18 60 20 50 28 Z" {...common} />
          <path d="M50 28 V84" {...common} />
          <path d={`M22 38 H${lerp(22, 40, t)} M22 50 H${lerp(22, 40, t)} M60 38 H${lerp(60, 78, t)}`} {...common} strokeWidth={4} opacity={0.8} />
        </>
      ) : kind === 'play' ? (
        <>
          <rect x="10" y="18" width="80" height="58" rx="10" {...common} />
          <path d="M42 34 L62 47 L42 60 Z" {...common} fill={color} />
          <path d={`M14 88 H${lerp(14, 86, t)}`} {...common} />
        </>
      ) : kind === 'drag' ? (
        <>
          <path d="M12 50 H88" {...common} opacity={0.5} />
          <path d={`M12 50 H${lerp(30, 64, t)}`} {...common} />
          <circle cx={lerp(30, 64, t)} cy={50} r={11} {...common} fill={color} />
          <path d="M20 30 L10 50 L20 70 M80 30 L90 50 L80 70" {...common} strokeWidth={4} opacity={0.7} />
        </>
      ) : (
        <>
          <path d="M50 10 L58 40 L90 50 L58 60 L50 90 L42 60 L10 50 L42 40 Z" {...common} fill={color} fillOpacity={0.25} />
          <path d="M36 50 L46 60 L66 38" {...common} />
        </>
      )}
    </svg>
  );
};

/**
 * 学习路径：第 0 拍标题与轨道，第 1~4 拍节点逐拍弹出、连线发光生长；
 * 之后光点沿线流动，第 5~7 拍节点依次随拍亮起，最后一步用橙色收尾。横屏一行，竖屏一列。
 */
const FlowSteps: React.FC<Props> = ({title, steps}) => {
  const {frame, at, len, p} = usePlan(8);
  const {pulse} = useBeat();
  const {W, H, portrait} = useStage();
  const n = steps.length;
  const R = portrait ? 92 : 112;

  const pos = steps.map((_, i) => {
    const f = n === 1 ? 0.5 : i / (n - 1);
    return portrait ? {x: 200, y: lerp(560, 1640, f)} : {x: lerp(W * 0.14, W * 0.86, f), y: H * 0.47};
  });
  const popStep = Math.min(1, 4 / Math.max(1, n));
  const popAt = (i: number) => at(1 + i * popStep);
  const doneAt = popAt(n - 1);
  const push = 1 + 0.04 * easeInOutCubic(clamp((frame - doneAt) / Math.max(1, len(8) - doneAt)));

  return (
    <AbsoluteFill>
      <Backdrop tint={C.deep} energy={0.55} />
      <Stage>
        <div style={{position: 'absolute', left: 0, right: 0, top: portrait ? 200 : 120, display: 'flex', justifyContent: 'center'}}>
          <SlamText text={title} start={0} stagger={2} dur={8} size={portrait ? 96 : 80} style={{textShadow: `0 0 ${20 + 20 * pulse}px rgba(111,156,255,0.5)`}} />
        </div>
        <div style={{position: 'absolute', inset: 0, transform: `scale(${push})`, transformOrigin: '50% 55%'}}>
          <svg width={W} height={H} style={{position: 'absolute', left: 0, top: 0, overflow: 'visible'}}>
            <defs>
              <GlowFilter id="fs-glow" std={6} />
              <linearGradient id="fs-grad" gradientUnits="userSpaceOnUse" x1={pos[0].x} y1={pos[0].y} x2={pos[n - 1].x} y2={pos[n - 1].y}>
                <stop offset="0%" stopColor={C.sky} />
                <stop offset="70%" stopColor={C.blue} />
                <stop offset="100%" stopColor={C.orange} />
              </linearGradient>
            </defs>
            {pos.slice(0, -1).map((a, i) => {
              const b = pos[i + 1];
              const ax = portrait ? a.x : a.x + R + 14;
              const ay = portrait ? a.y + R + 14 : a.y;
              const bx = portrait ? b.x : b.x - R - 14;
              const by = portrait ? b.y - R - 14 : b.y;
              const g = easeInOutCubic(clamp((frame - popAt(i)) / Math.max(1, popAt(i + 1) - popAt(i) - 2)));
              const ex = lerp(ax, bx, g);
              const ey = lerp(ay, by, g);
              const L = Math.hypot(bx - ax, by - ay);
              const flow = frame > popAt(i + 1);
              return (
                <g key={i}>
                  <line x1={ax} y1={ay} x2={bx} y2={by} stroke={C.deep} strokeWidth={8} strokeLinecap="round" opacity={easeOutCubic(p(0, 1))} />
                  {g > 0 ? <line x1={ax} y1={ay} x2={ex} y2={ey} stroke="url(#fs-grad)" strokeWidth={6 + 3 * pulse} strokeLinecap="round" filter="url(#fs-glow)" /> : null}
                  {flow ? (
                    <line x1={ax} y1={ay} x2={bx} y2={by} stroke={C.white} strokeWidth={4} strokeLinecap="round" strokeDasharray={`${L * 0.08} ${L * 0.22}`} strokeDashoffset={-frame * 9} opacity={0.75} filter="url(#fs-glow)" />
                  ) : null}
                  {g > 0 && g < 1 ? <circle cx={ex} cy={ey} r={10} fill={C.white} filter="url(#fs-glow)" /> : null}
                  {flow
                    ? [0, 0.5].map((o) => {
                        const q = ((frame / 30 + o + i * 0.25) % 1 + 1) % 1;
                        return <circle key={o} cx={lerp(ax, bx, q)} cy={lerp(ay, by, q)} r={7} fill={C.orange} filter="url(#fs-glow)" opacity={Math.sin(q * Math.PI)} />;
                      })
                    : null}
                  {/* 箭头 */}
                  {g >= 1 ? (
                    <path
                      d={portrait ? `M${bx - 14} ${by - 16} L${bx} ${by} L${bx + 14} ${by - 16}` : `M${bx - 16} ${by - 14} L${bx} ${by} L${bx - 16} ${by + 14}`}
                      fill="none"
                      stroke={C.sky}
                      strokeWidth={5}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  ) : null}
                </g>
              );
            })}
          </svg>

          {steps.map((s, i) => {
            const {x, y} = pos[i];
            const f0 = popAt(i);
            const q = clamp((frame - f0 + 4) / 10);
            const sc = easeOutBack(q, 2.6);
            const last = i === n - 1;
            const color = last ? C.orange : C.sky;
            const waveAt = at(5) + i * Math.max(3, Math.round(len(2) / Math.max(1, n)));
            const wave = frame >= at(5) ? hit(frame, waveAt, 6) : 0;
            const land = hit(frame, f0, 6);
            const glowAmt = land + wave + (frame > doneAt ? 0.35 * pulse : 0);
            const textQ = easeOutCubic(clamp((frame - f0 - 2) / 8));
            const kind = s.icon ?? ICONS[i % ICONS.length];
            return (
              <React.Fragment key={i}>
                {/* 冲击环 */}
                {[land, last ? hit(frame, at(7), 8) : 0].map((h, k) =>
                  h > 0.02 ? (
                    <div
                      key={k}
                      style={{
                        position: 'absolute',
                        left: x,
                        top: y,
                        width: R * 2,
                        height: R * 2,
                        borderRadius: '50%',
                        border: `${4 * h}px solid ${color}`,
                        transform: `translate(-50%,-50%) scale(${1 + (1 - h) * 1.2})`,
                        opacity: h,
                      }}
                    />
                  ) : null,
                )}
                <div
                  style={{
                    position: 'absolute',
                    left: x,
                    top: y,
                    width: R * 2,
                    height: R * 2,
                    borderRadius: '50%',
                    transform: `translate(-50%,-50%) scale(${sc * (1 + 0.12 * wave)})`,
                    opacity: q > 0 ? 1 : 0,
                    background: `radial-gradient(circle at 35% 30%, ${C.panelHi}, ${C.panel} 70%)`,
                    border: `4px solid ${color}`,
                    boxShadow: `0 0 ${18 + 50 * glowAmt}px ${last ? 'rgba(244,162,76,0.75)' : 'rgba(111,156,255,0.7)'}, inset 0 0 30px rgba(111,156,255,0.25)`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Icon kind={kind} color={color} size={R * 1.05} t={easeInOutCubic(clamp((frame - f0) / len(1.5)))} />
                  <div
                    style={{
                      position: 'absolute',
                      top: -14,
                      right: -10,
                      minWidth: 54,
                      height: 54,
                      borderRadius: 27,
                      background: color,
                      color: C.bg,
                      fontFamily: F.en,
                      fontWeight: 700,
                      fontSize: 28,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    {String(i + 1).padStart(2, '0')}
                  </div>
                </div>
                <div
                  style={
                    portrait
                      ? {position: 'absolute', left: x + R + 50, top: y, transform: `translate(${(1 - textQ) * 60}px, -50%)`, opacity: textQ, textAlign: 'left', width: W - x - R - 100}
                      : {position: 'absolute', left: x, top: y + R + 40, transform: `translate(-50%, ${(1 - textQ) * 40}px)`, opacity: textQ, textAlign: 'center', width: 380}
                  }
                >
                  <div
                    style={{
                      fontFamily: F.cn,
                      fontWeight: 900,
                      fontSize: portrait ? 76 : 70,
                      color: last ? C.orange : C.ink,
                      textShadow: `0 0 ${16 + 30 * wave}px ${last ? 'rgba(244,162,76,0.6)' : 'rgba(111,156,255,0.6)'}`,
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {s.title}
                  </div>
                  <div style={{marginTop: 10, fontFamily: F.cn, fontWeight: 400, fontSize: portrait ? 34 : 30, color: C.sky, opacity: 0.8, lineHeight: 1.4}}>{s.sub}</div>
                </div>
              </React.Fragment>
            );
          })}
        </div>
      </Stage>
    </AbsoluteFill>
  );
};

export const FlowStepsModule = defineModule<Props>({
  id: 'FlowSteps',
  family: 'intro',
  title: '学习路径',
  desc: '「读讲义 → 看动画 → 动手拖 → 真正懂」节点逐拍弹出、连线发光流动。props：title, steps: {title, sub, icon?(book|play|drag|spark)}[]。',
  bars: 2,
  component: FlowSteps,
  defaults: {
    title: '学习路径',
    steps: [
      {title: '读讲义', sub: '定义、定理、例题配套', icon: 'book'},
      {title: '看动画', sub: '抽象概念变成画面', icon: 'play'},
      {title: '动手拖', sub: '拖动参数，图形即时变化', icon: 'drag'},
      {title: '真正懂', sub: '知道结论从哪里来', icon: 'spark'},
    ],
  },
});
