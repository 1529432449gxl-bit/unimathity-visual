import React, {useEffect, useState} from 'react';
import {continueRender, delayRender} from 'remotion';
import {C} from '../../core/theme';
import {VIZ} from '../../viz';

/**
 * showcase 模块族的公共小工具：viz 元信息回退、序号格式化、相机对焦框。
 */

type Meta = {title: string; course: string; formula?: string};

/** VIZ 未登记（或并行开发中）时用的回退文字。 */
const FALLBACK: Record<string, Meta> = {
  riemann: {title: '定积分的定义', course: '微积分', formula: '\\int_a^b f(x)\\,dx=\\lim_{n\\to\\infty}\\sum_{i=1}^{n} f(\\xi_i)\\,\\Delta x'},
  linearMap: {title: '线性变换', course: '线性代数', formula: 'A\\mathbf{v}=\\lambda\\mathbf{v}'},
  newton: {title: '牛顿迭代法', course: '数值分析', formula: 'x_{n+1}=x_n-\\dfrac{f(x_n)}{f\'(x_n)}'},
  galton: {title: '中心极限定理', course: '概率统计', formula: '\\dfrac{S_n-n\\mu}{\\sigma\\sqrt{n}}\\xrightarrow{d}N(0,1)'},
  complexMap: {title: '复变换', course: '复变函数', formula: 'w=f(z)=z^2'},
  phaseFlow: {title: '相空间', course: '常微分方程', formula: '\\dot{\\mathbf{x}}=f(\\mathbf{x})'},
  taylor: {title: '泰勒展开', course: '微积分', formula: 'f(x)=\\sum_{n=0}^{\\infty}\\dfrac{f^{(n)}(a)}{n!}(x-a)^n'},
  fourier: {title: '傅里叶级数', course: '微积分', formula: 'f(x)\\sim\\dfrac{a_0}{2}+\\sum_{n=1}^{\\infty}\\left(a_n\\cos nx+b_n\\sin nx\\right)'},
  dihedral: {title: '二面体群', course: '抽象代数', formula: 'D_n=\\langle r,s\\mid r^n=s^2=e,\\ srs=r^{-1}\\rangle'},
  modCircle: {title: '模乘圆', course: '数论', formula: 'k\\mapsto mk \\bmod n'},
};

/** 标题/课程/公式：props 覆盖 > VIZ 登记 > 本地回退 > id。 */
export function vizMeta(id: string, over: Partial<Meta> = {}): Meta {
  const v = VIZ[id];
  const f = FALLBACK[id];
  return {
    title: over.title || v?.title || f?.title || id,
    course: over.course || v?.course || f?.course || '',
    formula: over.formula ?? v?.formula ?? f?.formula,
  };
}

/** 所有 viz 的回退文字，用于字体预加载等。 */
export const ALL_VIZ_IDS = Object.keys(FALLBACK);

/** 序号统一成两位：1 -> "01"，"3" -> "03"。 */
export const pad2 = (v: string | number | undefined, d = '01') => {
  if (v == null || v === '') return d;
  const s = String(v);
  return /^\d$/.test(s) ? `0${s}` : s;
};

/**
 * 相机对焦框：四个 L 形角。inset 为离容器边缘的距离（可随拍跳动）。
 */
export const CornerFrame: React.FC<{
  x: number;
  y: number;
  w: number;
  h: number;
  len: number;
  thick: number;
  color?: string;
  glow?: number;
  opacity?: number;
}> = ({x, y, w, h, len, thick, color = C.sky, glow = 12, opacity = 1}) => {
  const base: React.CSSProperties = {
    position: 'absolute',
    width: len,
    height: len,
    borderColor: color,
    borderStyle: 'solid',
    borderWidth: 0,
    filter: `drop-shadow(0 0 ${glow}px ${color})`,
  };
  return (
    <div style={{position: 'absolute', left: x, top: y, width: w, height: h, opacity, pointerEvents: 'none'}}>
      <div style={{...base, left: 0, top: 0, borderTopWidth: thick, borderLeftWidth: thick}} />
      <div style={{...base, right: 0, top: 0, borderTopWidth: thick, borderRightWidth: thick}} />
      <div style={{...base, left: 0, bottom: 0, borderBottomWidth: thick, borderLeftWidth: thick}} />
      <div style={{...base, right: 0, bottom: 0, borderBottomWidth: thick, borderRightWidth: thick}} />
    </div>
  );
};

/** 把拍长度向下取整到 1/4 拍，保证动作仍落在拍格上。 */
export const snapBeat = (b: number) => Math.max(0.25, Math.floor(b * 4) / 4);

/**
 * 模块里出现、但不在 props 里的文字（如 VIZ 标题）不会被 FontGate 预取；
 * 这里补一次中文字体分片加载，避免个别帧用回退字体。
 */
export function useFontsFor(text: string) {
  const [handle] = useState(() => delayRender('showcase-fonts'));
  useEffect(() => {
    const specs = ['400 40px "Noto Sans SC"', '700 40px "Noto Sans SC"', '900 40px "Noto Sans SC"', '700 40px "Space Grotesk"'];
    Promise.all(specs.map((s) => document.fonts.load(s, text || 'a')))
      .catch(() => undefined)
      .then(() => continueRender(handle));
  }, [handle, text]);
}
