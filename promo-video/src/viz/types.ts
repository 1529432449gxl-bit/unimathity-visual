import type React from 'react';

/**
 * 数学画面（viz）的统一接口。一个 viz 只负责在 w×h 的透明 SVG 里画图：
 * - t：0..1 的演示进度（由宿主模块传入，宿主多长 t 就走多快，所以任何时长都能用）
 * - frame：局部帧号，用于持续的小运动（漂移、呼吸、拍点脉冲）
 * 不画背景、不画文字说明（标签由宿主模块负责），确需标注只用极少量英文或 KaTeX。
 */
export type VizProps = {w: number; h: number; t: number; frame: number};

export type VizDef = {
  id: string;
  title: string; // 中文标题，如「定积分的定义」
  course: string; // 课程，如「微积分」
  formula?: string; // 可选的配套 LaTeX 公式
  component: React.FC<VizProps>;
};
