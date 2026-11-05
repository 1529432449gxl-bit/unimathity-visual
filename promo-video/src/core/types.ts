import type React from 'react';

/** 模块所属段落：痛点引入 / 网站介绍 / 成果展示 / 通用。 */
export type Family = 'pain' | 'intro' | 'showcase' | 'common';

/** 切入方式：在模块开头叠加的转场。 */
export type Transition = 'none' | 'flash' | 'punch' | 'glitch' | 'slide';

/**
 * 一个可复用模块的登记信息。
 * - component 只读自己的 props，时长由外部 Sequence 决定（用 useProgress 自适应）。
 * - defaults 必须是完整、可直接渲染的一组 props（文字全写在这里，便于字体预加载与改文案）。
 * - bars 是推荐时长（小节，1 小节 = 2 秒）。
 */
export type ModuleDef<P extends Record<string, unknown> = Record<string, any>> = {
  id: string;
  family: Family;
  title: string; // 中文名，给人看
  desc: string; // 一句话说明用途与可改的 props
  bars: number;
  component: React.FC<P>;
  defaults: P;
};

export function defineModule<P extends Record<string, unknown>>(def: ModuleDef<P>): ModuleDef<P> {
  return def;
}

/** 时间线条目：按顺序拼接；时长用 bars 或 beats（拍）。 */
export type TimelineItem = {
  module: string;
  bars?: number;
  beats?: number;
  props?: Record<string, unknown>;
  transition?: Transition;
};
