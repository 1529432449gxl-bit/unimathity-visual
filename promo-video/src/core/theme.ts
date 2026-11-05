/**
 * 视觉规范。色系取自站点主色（深蓝 #223056、暖棕 #b5763a），在深色底上提亮使用：
 * 深蓝做面板，浅蓝做主线条，橙色做强调，灰色做次要信息。
 */
export const C = {
  bg: '#05081a',
  bg2: '#0a1230',
  panel: '#0f1938',
  panelHi: '#16234a',
  deep: '#223056',
  blue: '#6f9cff',
  sky: '#a8cdf6',
  orange: '#f4a24c',
  warm: '#b5763a',
  sand: '#e8c48c',
  gray: '#8e9098',
  dim: '#4b5576',
  ink: '#eef2fa',
  white: '#ffffff',
  danger: '#ff7a5c',
};

export const F = {
  cn: '"Noto Sans SC", "Microsoft YaHei", "PingFang SC", "WenQuanYi Zen Hei", sans-serif',
  en: '"Space Grotesk", "Noto Sans SC", "WenQuanYi Zen Hei", sans-serif',
  mono: '"JetBrains Mono", "Noto Sans SC", monospace',
  math: 'KaTeX_Main, "Times New Roman", serif',
};

export const glow = (color: string, r = 18) => `0 0 ${r}px ${color}`;
