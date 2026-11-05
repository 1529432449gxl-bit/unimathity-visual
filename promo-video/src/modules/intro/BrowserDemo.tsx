import React from 'react';
import {AbsoluteFill} from 'remotion';
import {Backdrop} from '../../components/Backdrop';
import {Formula} from '../../components/Formula';
import {Viz} from '../../components/Viz';
import {useBeat} from '../../core/beat';
import {C, F} from '../../core/theme';
import {clamp, easeInOutCubic, easeOutCubic, lerp} from '../../core/time';
import {defineModule} from '../../core/types';
import {Stage, Sweep, hit, usePlan, useStage} from './util';

type Props = {
  url: string;
  course: string;
  chapter: string;
  toc: string[];
  active: number;
  tags: string[];
  formula: string;
  defLabel: string;
  demoLabel: string;
  viz: string;
};

/** 光标箭头（尖端在 0,0）。 */
const Cursor: React.FC<{x: number; y: number; press: number; opacity: number}> = ({x, y, press, opacity}) => (
  <svg
    width={56}
    height={64}
    viewBox="0 0 28 32"
    style={{position: 'absolute', left: x, top: y, transform: `scale(${1 - 0.18 * press})`, transformOrigin: '0 0', opacity, filter: 'drop-shadow(0 6px 10px rgba(0,0,0,0.6))', overflow: 'visible'}}
  >
    <path d="M1 1 L1 24 L7.5 18.5 L11.5 28 L15.5 26.3 L11.6 17 L20 17 Z" fill={C.white} stroke={C.bg} strokeWidth={1.6} strokeLinejoin="round" />
  </svg>
);

const Skel: React.FC<{x: number; y: number; w: number; q: number; tone?: string}> = ({x, y, w, q, tone = C.deep}) => (
  <div style={{position: 'absolute', left: x, top: y, width: w * easeOutCubic(q), height: 14, borderRadius: 7, background: tone, opacity: 0.9 * clamp(q * 2)}} />
);

/**
 * 浏览器样机：窗口 3D 倾斜飞入（第 0 拍），目录与正文逐行出现（第 1 拍），公式框亮起、光标出现（第 2 拍），
 * 点击播放（第 3 拍），抓住进度滑块（第 5 拍）来回拖动（第 6 拍），松手、玻璃反光扫过（第 7 拍）；页面全程缓慢滚动。
 */
const BrowserDemo: React.FC<Props> = (props) => {
  const {url, course, chapter, toc, active, tags, formula, defLabel, demoLabel, viz} = props;
  const {frame, at, len, p} = usePlan(8);
  const {pulse} = useBeat();
  const {W, H, portrait} = useStage();

  // ---- 版式（设计像素）----
  const WW = portrait ? 980 : 1500;
  const WH = portrait ? 1540 : 860;
  const TB = 66;
  const SB = portrait ? 0 : 310;
  const x0 = portrait ? 40 : 60;
  const cardW = portrait ? 900 : 1070;
  const vizW = cardW - 40;
  const vizH = portrait ? 500 : 380;
  const cardY = portrait ? 560 : 540;
  const ctrlY = cardY + 56 + 20 + vizH + 20; // 控件行顶部
  const cardH = ctrlY - cardY + 64 + 20;
  const trackX = 110;
  const trackL = cardW - 40 - trackX;
  const maxScroll = portrait ? 140 : Math.max(0, cardY + cardH + 40 - (WH - TB));

  // ---- 时间 ----
  const scroll = lerp(0, maxScroll * 0.9, easeInOutCubic(p(0.5, 2))) + maxScroll * 0.1 * easeInOutCubic(p(2.5, 5.5));
  const clickF = at(3);
  const grabF = at(5);
  const dragMid = at(6);
  const releaseF = at(7);
  const playV = (f: number) => lerp(0, 0.55, easeInOutCubic(clamp((f - clickF) / Math.max(1, grabF - clickF))));
  let v = playV(frame);
  if (frame >= grabF) {
    v = frame < dragMid ? lerp(0.55, 0.2, easeInOutCubic((frame - grabF) / Math.max(1, dragMid - grabF))) : lerp(0.2, 1, easeInOutCubic(clamp((frame - dragMid) / Math.max(1, releaseF - dragMid))));
  }
  const playing = frame >= clickF;
  const dragging = frame >= grabF && frame < releaseF;

  // 窗口坐标中的控件位置
  const ctrlCy = TB + ctrlY + 32 - scroll;
  const playPos = {x: SB + x0 + 20 + 30, y: ctrlCy};
  const knobPos = (vv: number) => ({x: SB + x0 + 20 + trackX + trackL * vv, y: ctrlCy});
  const start = {x: WW * 0.86, y: WH * 0.95};
  let cur = start;
  const m1 = easeInOutCubic(clamp((frame - at(2)) / Math.max(1, at(2.75) - at(2))));
  cur = {x: lerp(start.x, playPos.x, m1), y: lerp(start.y, playPos.y, m1)};
  if (frame >= at(4.25)) {
    const k = knobPos(0.55);
    const m2 = easeInOutCubic(clamp((frame - at(4.25)) / Math.max(1, grabF - at(4.25))));
    cur = {x: lerp(playPos.x, k.x, m2), y: lerp(playPos.y, k.y, m2)};
  }
  if (frame >= grabF) cur = knobPos(v);
  if (frame >= releaseF) {
    const m3 = easeOutCubic(clamp((frame - releaseF) / 12));
    const k = knobPos(v);
    cur = {x: k.x + 30 * m3, y: k.y + 50 * m3};
  }
  const cursorOp = clamp((frame - at(2)) / 5);
  const press = hit(frame, clickF, 4) + (dragging ? 0.7 : 0) + hit(frame, grabF, 4) * 0.3;

  // 3D 入场
  const q = easeOutCubic(p(0, 1.5));
  const settle = easeInOutCubic(p(1.5, 6.5));
  const rotX = lerp(lerp(34, 9, q), 3, settle);
  const rotY = lerp(lerp(portrait ? -24 : -38, portrait ? -8 : -12, q), portrait ? -3 : -4, settle);
  const tz = lerp(-900, 0, q);
  const ty = lerp(280, 0, q);
  const scale = (portrait ? 1 : 1) * (1 + 0.012 * pulse * (frame > at(1.5) ? 1 : 0));

  const reveal = (k: number) => easeOutCubic(p(0.35 + k * 0.12, 0.6));
  const defFlash = hit(frame, at(2), 7);
  const btnFlash = hit(frame, clickF, 6);
  const dots = 6;

  return (
    <AbsoluteFill>
      <Backdrop tint={C.deep} energy={0.5} />
      <Stage>
        <div
          style={{
            position: 'absolute',
            left: W / 2,
            top: H / 2 + (portrait ? 20 : 30),
            width: WW,
            height: WH,
            marginLeft: -WW / 2,
            marginTop: -WH / 2,
            perspective: 2400,
          }}
        >
          <div
            style={{
              position: 'absolute',
              inset: 0,
              transform: `translateY(${ty}px) translateZ(${tz}px) rotateX(${rotX}deg) rotateY(${rotY}deg) scale(${scale})`,
              transformStyle: 'preserve-3d',
              opacity: clamp(q * 3),
            }}
          >
            {/* 窗口 */}
            <div
              style={{
                position: 'absolute',
                inset: 0,
                borderRadius: 22,
                overflow: 'hidden',
                background: C.bg2,
                border: `2px solid rgba(168,205,246,0.35)`,
                boxShadow: `0 40px 120px rgba(0,0,0,0.7), 0 0 ${50 + 40 * pulse}px rgba(111,156,255,0.35)`,
              }}
            >
              {/* 标题栏 */}
              <div style={{position: 'absolute', left: 0, top: 0, right: 0, height: TB, background: C.panelHi, borderBottom: `1px solid rgba(168,205,246,0.15)`, display: 'flex', alignItems: 'center', padding: '0 26px', gap: 14}}>
                {[C.orange, C.sand, C.dim].map((c, i) => (
                  <div key={i} style={{width: 18, height: 18, borderRadius: 9, background: c}} />
                ))}
                <div
                  style={{
                    marginLeft: 30,
                    flex: 1,
                    maxWidth: portrait ? 760 : 860,
                    height: 42,
                    borderRadius: 21,
                    background: C.bg2,
                    border: `1px solid rgba(168,205,246,0.2)`,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 14,
                    padding: '0 22px',
                    fontFamily: F.cn,
                    fontSize: portrait ? 22 : 23,
                    color: C.sky,
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                  }}
                >
                  <svg width={18} height={20} viewBox="0 0 18 20">
                    <rect x="2" y="8" width="14" height="11" rx="2" fill={C.sky} opacity={0.8} />
                    <path d="M5 8 V5 a4 4 0 0 1 8 0 V8" fill="none" stroke={C.sky} strokeWidth="2" />
                  </svg>
                  {url}
                </div>
              </div>

              {/* 侧栏目录 */}
              {SB > 0 ? (
                <div style={{position: 'absolute', left: 0, top: TB, bottom: 0, width: SB, background: C.panel, borderRight: `1px solid rgba(168,205,246,0.12)`, padding: '36px 28px', boxSizing: 'border-box'}}>
                  <div style={{fontFamily: F.cn, fontWeight: 900, fontSize: 32, color: C.ink, marginBottom: 26, opacity: reveal(0)}}>{course}</div>
                  {toc.map((item, i) => {
                    const on = i === active && frame >= at(1.25);
                    const r = reveal(0.5 + i * 0.4);
                    return (
                      <div
                        key={i}
                        style={{
                          position: 'relative',
                          fontFamily: F.cn,
                          fontWeight: on ? 700 : 400,
                          fontSize: 23,
                          color: on ? C.orange : C.sky,
                          opacity: r * (on ? 1 : 0.7),
                          transform: `translateX(${(1 - r) * -30}px)`,
                          padding: '12px 16px',
                          marginBottom: 4,
                          borderRadius: 10,
                          background: on ? 'rgba(244,162,76,0.12)' : 'transparent',
                          borderLeft: `4px solid ${on ? C.orange : 'transparent'}`,
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {item}
                      </div>
                    );
                  })}
                </div>
              ) : null}

              {/* 正文（滚动） */}
              <div style={{position: 'absolute', left: SB, top: TB, right: 0, bottom: 0, overflow: 'hidden'}}>
                <div style={{position: 'absolute', left: 0, top: -scroll, width: WW - SB, height: 2000}}>
                  <div style={{position: 'absolute', left: x0, top: 46, fontFamily: F.cn, fontWeight: 900, fontSize: portrait ? 50 : 54, color: C.ink, opacity: reveal(0), transform: `translateY(${(1 - reveal(0)) * 20}px)`, whiteSpace: 'nowrap'}}>
                    {chapter}
                  </div>
                  <div style={{position: 'absolute', left: x0, top: 134, display: 'flex', gap: 14, opacity: reveal(1)}}>
                    {tags.map((tg, i) => (
                      <div key={i} style={{fontFamily: F.cn, fontWeight: 700, fontSize: 22, padding: '6px 18px', borderRadius: 20, border: `2px solid ${i === 0 ? C.orange : C.blue}`, color: i === 0 ? C.orange : C.sky}}>
                        {tg}
                      </div>
                    ))}
                  </div>
                  <Skel x={x0} y={206} w={(WW - SB) * 0.78} q={reveal(2)} />
                  <Skel x={x0} y={238} w={(WW - SB) * 0.7} q={reveal(2.4)} />
                  <Skel x={x0} y={270} w={(WW - SB) * 0.5} q={reveal(2.8)} />
                  {/* 定义框 */}
                  <div
                    style={{
                      position: 'absolute',
                      left: x0,
                      top: 316,
                      width: cardW,
                      height: 118,
                      borderRadius: 14,
                      background: 'rgba(244,162,76,0.07)',
                      borderLeft: `6px solid ${C.orange}`,
                      boxShadow: `0 0 ${40 * defFlash}px rgba(244,162,76,${0.5 * defFlash})`,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 40,
                      padding: '0 34px',
                      boxSizing: 'border-box',
                      opacity: reveal(3),
                      transform: `translateY(${(1 - reveal(3)) * 24}px)`,
                    }}
                  >
                    <div style={{fontFamily: F.cn, fontWeight: 900, fontSize: 28, color: C.orange}}>{defLabel}</div>
                    <Formula tex={formula} size={50} color={C.ink} style={{transform: `scale(${1 + 0.08 * defFlash})`, display: 'inline-block'}} />
                  </div>
                  <Skel x={x0} y={466} w={(WW - SB) * 0.74} q={reveal(4)} />
                  <Skel x={x0} y={498} w={(WW - SB) * 0.42} q={reveal(4.4)} />

                  {/* 交互卡片 */}
                  <div
                    style={{
                      position: 'absolute',
                      left: x0,
                      top: cardY,
                      width: cardW,
                      height: cardH,
                      borderRadius: 18,
                      background: C.panel,
                      border: `2px solid ${playing ? C.blue : 'rgba(168,205,246,0.25)'}`,
                      boxShadow: `0 0 ${20 + 30 * (btnFlash + (playing ? 0.4 * pulse : 0))}px rgba(111,156,255,0.4)`,
                      overflow: 'hidden',
                      opacity: reveal(5),
                      transform: `translateY(${(1 - reveal(5)) * 30}px)`,
                    }}
                  >
                    <div style={{height: 56, display: 'flex', alignItems: 'center', padding: '0 22px', gap: 14, background: C.panelHi}}>
                      <div style={{width: 12, height: 12, borderRadius: 6, background: playing ? C.orange : C.dim, boxShadow: playing ? `0 0 ${8 + 10 * pulse}px ${C.orange}` : 'none'}} />
                      <div style={{fontFamily: F.cn, fontWeight: 700, fontSize: 24, color: C.sky}}>{demoLabel}</div>
                      <div style={{flex: 1}} />
                      {new Array(dots).fill(0).map((_, i) => {
                        const on = v * dots > i + 0.001 || (i === 0 && playing);
                        return <div key={i} style={{width: 14, height: 14, borderRadius: 7, background: on ? C.orange : C.deep}} />;
                      })}
                    </div>
                    <div style={{position: 'absolute', left: 20, top: 56 + 20, width: vizW, height: vizH, borderRadius: 12, background: C.bg, overflow: 'hidden'}}>
                      <Viz id={viz} w={vizW} h={vizH} t={v} />
                    </div>
                    {/* 控件 */}
                    <div style={{position: 'absolute', left: 20, top: ctrlY - cardY, width: cardW - 40, height: 64}}>
                      <div
                        style={{
                          position: 'absolute',
                          left: 0,
                          top: 2,
                          width: 60,
                          height: 60,
                          borderRadius: 30,
                          background: playing ? C.orange : C.blue,
                          boxShadow: `0 0 ${16 + 40 * btnFlash}px ${playing ? C.orange : C.blue}`,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          transform: `scale(${1 - 0.15 * hit(frame, clickF, 3) + 0.1 * btnFlash})`,
                        }}
                      >
                        <svg width={26} height={26} viewBox="0 0 26 26">
                          {playing ? (
                            <>
                              <rect x="4" y="3" width="6" height="20" rx="2" fill={C.bg} />
                              <rect x="16" y="3" width="6" height="20" rx="2" fill={C.bg} />
                            </>
                          ) : (
                            <path d="M6 3 L23 13 L6 23 Z" fill={C.bg} />
                          )}
                        </svg>
                      </div>
                      {btnFlash > 0.02 ? (
                        <div style={{position: 'absolute', left: 30, top: 32, width: 60, height: 60, marginLeft: -30, marginTop: -30, borderRadius: 30, border: `3px solid ${C.orange}`, transform: `scale(${1 + (1 - btnFlash) * 2.2})`, opacity: btnFlash}} />
                      ) : null}
                      <div style={{position: 'absolute', left: trackX, top: 28, width: trackL, height: 10, borderRadius: 5, background: C.deep}} />
                      <div style={{position: 'absolute', left: trackX, top: 28, width: trackL * v, height: 10, borderRadius: 5, background: `linear-gradient(90deg, ${C.blue}, ${C.orange})`, boxShadow: `0 0 12px ${C.orange}`}} />
                      <div
                        style={{
                          position: 'absolute',
                          left: trackX + trackL * v - 16,
                          top: 17,
                          width: 32,
                          height: 32,
                          borderRadius: 16,
                          background: C.white,
                          border: `4px solid ${C.orange}`,
                          boxSizing: 'border-box',
                          transform: `scale(${dragging ? 1.35 : 1})`,
                          boxShadow: `0 0 ${dragging ? 26 : 10}px ${C.orange}`,
                        }}
                      />
                    </div>
                  </div>

                  <Skel x={x0} y={cardY + cardH + 46} w={(WW - SB) * 0.76} q={reveal(6)} />
                  <Skel x={x0} y={cardY + cardH + 78} w={(WW - SB) * 0.6} q={reveal(6.4)} />
                  <Skel x={x0} y={cardY + cardH + 110} w={(WW - SB) * 0.68} q={reveal(6.8)} />
                </div>
              </div>

              {/* 玻璃反光 */}
              <Sweep p={p(1.2, 0.9)} opacity={0.22} band={18} />
              <Sweep p={p(7, 0.9)} opacity={0.28} band={22} />
            </div>

            {/* 点击波纹 + 光标 */}
            <Cursor x={cur.x} y={cur.y} press={clamp(press)} opacity={cursorOp} />
          </div>
        </div>
      </Stage>
    </AbsoluteFill>
  );
};

export const BrowserDemoModule = defineModule<Props>({
  id: 'BrowserDemo',
  family: 'intro',
  title: '网站讲义页样机',
  desc: '浏览器窗口 3D 倾斜入场，展示讲义页（目录、正文、公式）与嵌入的交互卡片；光标点击播放、拖动进度条。props：url, course, chapter, toc, active, tags, formula, defLabel, demoLabel, viz。',
  bars: 2,
  component: BrowserDemo,
  defaults: {
    url: 'unimathity · 线性代数 · 特征值的几何意义',
    course: '线性代数',
    chapter: '特征值的几何意义',
    toc: ['行列式', '矩阵', '线性方程组', '向量空间', '线性变换', '特征值与特征向量', '二次型'],
    active: 5,
    tags: ['定义', '定理', '例题'],
    formula: 'A\\mathbf{v}=\\lambda\\mathbf{v}',
    defLabel: '定义',
    demoLabel: '交互演示',
    viz: 'linearMap',
  },
});
