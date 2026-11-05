import React from 'react';
import {AbsoluteFill} from 'remotion';
import {Backdrop} from '../../components/Backdrop';
import {Formula} from '../../components/Formula';
import {SlamText} from '../../components/SlamText';
import {useBeat} from '../../core/beat';
import {C, F} from '../../core/theme';
import {clamp, easeInOutCubic, easeOutBack} from '../../core/time';
import {defineModule} from '../../core/types';
import {Stage, Sweep, hit, usePlan, useStage} from './util';

type Course = {name: string; symbol: string; sub: string};
type Props = {title: string; highlight: string; courses: Course[]};

/**
 * 课程墙：标题第 0 拍砸入，磁贴按半拍依次翻入（每块落地闪一下）；到齐后第 5 拍描边波纹，
 * 第 6 拍光带扫过，第 7 拍符号随拍弹跳，全程缓慢推镜。
 */
const CourseWall: React.FC<Props> = ({title, highlight, courses}) => {
  const {frame, at, len, p} = usePlan(8);
  const {pulse, index: beatIdx} = useBeat();
  const {W, H, portrait} = useStage();
  const n = courses.length;
  const cols = n <= 4 ? n : Math.ceil(Math.sqrt(n));
  const rows = Math.ceil(n / cols);

  const padX = portrait ? 48 : 150;
  const gap = portrait ? 22 : 26;
  const top = portrait ? 330 : 210;
  const bottom = portrait ? 200 : 70;
  const tileW = (W - padX * 2 - gap * (cols - 1)) / cols;
  const tileH = Math.min(portrait ? 420 : 250, (H - top - bottom - gap * (rows - 1)) / rows);
  const gridH = rows * tileH + (rows - 1) * gap;
  const gridTop = top + (H - top - bottom - gridH) / 2;

  const step = Math.min(0.5, 4.5 / Math.max(1, n));
  const landAt = (i: number) => at(0.5 + i * step);
  const allIn = landAt(n - 1);
  const push = 1 + 0.045 * easeInOutCubic(clamp((frame - allIn) / Math.max(1, len(8) - allIn + len(0.5))));
  const sweep = p(6, 1.2);

  return (
    <AbsoluteFill>
      <Backdrop tint={C.deep} energy={0.55} />
      <Stage>
        <div style={{position: 'absolute', left: 0, right: 0, top: portrait ? 150 : 50, display: 'flex', justifyContent: 'center'}}>
          <SlamText text={title} start={0} stagger={2} dur={8} size={portrait ? 92 : 84} highlight={highlight} style={{textShadow: `0 0 ${20 + 20 * pulse}px rgba(111,156,255,0.55)`}} />
        </div>
        <div
          style={{
            position: 'absolute',
            left: 0,
            top: 0,
            width: W,
            height: H,
            transform: `scale(${push})`,
            transformOrigin: `${W / 2}px ${gridTop + gridH / 2}px`,
          }}
        >
          {courses.map((c, i) => {
            const r = Math.floor(i / cols);
            const col = i % cols;
            const x = padX + col * (tileW + gap);
            const y = gridTop + r * (tileH + gap);
            const f0 = landAt(i) - 9;
            const fp = clamp((frame - f0) / 9);
            const flip = (1 - easeOutBack(fp, 1.4)) * 95;
            const landed = hit(frame, landAt(i), 5);
            const wave = hit(frame, at(5) + (r + col) * 2, 6);
            const bump = frame >= at(7) ? hit(frame, at(7) + (r + col) * 2, 5) : 0;
            const beatGlow = frame > allIn ? pulse * 0.5 : 0;
            const live = fp > 0;
            const accent = beatIdx % n === i && frame > allIn;
            return (
              <div
                key={i}
                style={{
                  position: 'absolute',
                  left: x,
                  top: y,
                  width: tileW,
                  height: tileH,
                  perspective: 1400,
                }}
              >
                <div
                  style={{
                    position: 'absolute',
                    inset: 0,
                    transform: `rotateY(${flip}deg) translateZ(${landed * 30}px)`,
                    transformOrigin: '0% 50%',
                    opacity: live ? clamp(fp * 3) : 0,
                    borderRadius: 22,
                    overflow: 'hidden',
                    background: `linear-gradient(145deg, ${C.panelHi} 0%, ${C.panel} 60%, ${C.bg2} 100%)`,
                    border: `2px solid ${wave > 0.05 || accent ? C.orange : C.deep}`,
                    boxShadow: `0 0 ${10 + 40 * (landed + wave) + 18 * beatGlow}px rgba(${wave > landed ? '244,162,76' : '111,156,255'},${0.25 + 0.5 * Math.max(landed, wave)}), inset 0 1px 0 rgba(168,205,246,0.15)`,
                    display: 'flex',
                    flexDirection: portrait ? 'column' : 'row',
                    alignItems: portrait ? 'flex-start' : 'center',
                    gap: portrait ? 14 : 26,
                    padding: portrait ? '30px 26px' : '0 28px',
                    boxSizing: 'border-box',
                  }}
                >
                  <div
                    style={{
                      flex: 'none',
                      width: portrait ? 120 : 136,
                      height: portrait ? 120 : 136,
                      borderRadius: 20,
                      background: 'rgba(5,8,26,0.6)',
                      border: `1px solid rgba(168,205,246,0.18)`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      transform: `scale(${1 + 0.25 * bump + 0.2 * landed})`,
                    }}
                  >
                    <Formula
                      tex={c.symbol}
                      size={symbolSize(c.symbol, portrait)}
                      color={C.orange}
                      style={{filter: `drop-shadow(0 0 ${10 + 16 * (landed + bump)}px rgba(244,162,76,0.7))`}}
                    />
                  </div>
                  <div style={{minWidth: 0, flex: 1}}>
                    <div style={{fontFamily: F.cn, fontWeight: 900, fontSize: portrait ? 46 : 48, color: C.ink, lineHeight: 1.15, whiteSpace: 'nowrap'}}>{c.name}</div>
                    <div
                      style={{
                        marginTop: 10,
                        fontFamily: F.cn,
                        fontWeight: 400,
                        fontSize: portrait ? 24 : 23,
                        lineHeight: 1.45,
                        color: C.sky,
                        opacity: 0.78,
                      }}
                    >
                      {c.sub}
                    </div>
                  </div>
                  <Sweep p={clamp((frame - landAt(i) + 2) / 10)} opacity={0.35} band={30} />
                </div>
              </div>
            );
          })}
          <div style={{position: 'absolute', left: padX - 20, top: gridTop - 20, width: W - padX * 2 + 40, height: gridH + 40, overflow: 'hidden', pointerEvents: 'none'}}>
            <Sweep p={sweep} band={14} opacity={0.5} />
          </div>
        </div>
        <AbsoluteFill style={{background: C.orange, opacity: 0.12 * hit(frame, at(5), 4), mixBlendMode: 'screen'}} />
      </Stage>
    </AbsoluteFill>
  );
};

/** 按公式里的字形数估算字号，保证放进符号框。 */
function symbolSize(tex: string, portrait: boolean) {
  const g = tex
    .replace(/\\(mathbf|mathbb|mathrm|mathcal|mathfrak|text|boldsymbol)\b/g, '')
    .replace(/\\[a-zA-Z]+/g, 'X')
    .replace(/[{}\s]/g, '').length;
  const base = portrait ? 0.9 : 1;
  return base * (g <= 1 ? 80 : g <= 2 ? 64 : g <= 3 ? 52 : 42);
}

export const CourseWallModule = defineModule<Props>({
  id: 'CourseWall',
  family: 'intro',
  title: '课程墙',
  desc: '9 门课 3×3 磁贴按半拍翻入，到齐后推镜、光带扫过。props：title, highlight, courses: {name, symbol(LaTeX), sub}[]（数量可变，自动排网格）。',
  bars: 2,
  component: CourseWall,
  defaults: {
    title: '9 门大学数学课',
    highlight: '9',
    courses: [
      {name: '微积分', symbol: '\\int', sub: '极限、导数与积分'},
      {name: '线性代数', symbol: 'A\\mathbf{x}', sub: '矩阵、线性变换与特征值'},
      {name: '概率统计', symbol: 'P(A)', sub: '随机变量与数理统计'},
      {name: '复变函数', symbol: '\\mathbb{C}', sub: '解析函数、留数与共形映射'},
      {name: '实变函数', symbol: '\\mu', sub: '测度、可测函数与积分'},
      {name: '常微分方程', symbol: "y'", sub: '初等解法、线性系统与稳定性'},
      {name: '抽象代数', symbol: 'G', sub: '群、环与域的扩张'},
      {name: '数值分析', symbol: '\\approx', sub: '插值、逼近与数值求解'},
      {name: '数论', symbol: '\\mathbb{Z}', sub: '整除、同余与模运算'},
    ],
  },
});

