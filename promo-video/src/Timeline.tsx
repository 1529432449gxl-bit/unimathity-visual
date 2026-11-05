import React from 'react';
import {AbsoluteFill, Sequence} from 'remotion';
import {CutIn} from './components/CutIn';
import {C, F} from './core/theme';
import {BAR, BEAT} from './core/time';
import type {TimelineItem} from './core/types';
import {MODULE_MAP} from './registry';

export function itemFrames(item: TimelineItem): number {
  const m = MODULE_MAP[item.module];
  if (item.beats != null) return Math.round(item.beats * BEAT);
  return Math.round((item.bars ?? m?.bars ?? 1) * BAR);
}

export function timelineFrames(items: TimelineItem[]): number {
  return items.reduce((s, it) => s + itemFrames(it), 0);
}

/** 解析后的完整 props（defaults + 覆盖），也用于收集字体预加载文字。 */
export function resolveProps(item: TimelineItem): Record<string, unknown> {
  const m = MODULE_MAP[item.module];
  return {...(m?.defaults ?? {}), ...(item.props ?? {})};
}

export function timelineText(items: TimelineItem[]): string {
  return items.map((it) => JSON.stringify(resolveProps(it))).join('');
}

/** 按顺序把模块拼成一条时间线；每段开头套转场。 */
export const Timeline: React.FC<{items: TimelineItem[]}> = ({items}) => {
  let from = 0;
  return (
    <AbsoluteFill style={{backgroundColor: C.bg}}>
      {items.map((item, i) => {
        const dur = itemFrames(item);
        const start = from;
        from += dur;
        const m = MODULE_MAP[item.module];
        const Comp = m?.component;
        return (
          <Sequence key={i} from={start} durationInFrames={dur} name={`${i + 1}. ${item.module}`}>
            <CutIn kind={item.transition ?? (i === 0 ? 'none' : 'flash')}>
              {Comp ? <Comp {...(resolveProps(item) as any)} /> : <Missing id={item.module} />}
            </CutIn>
          </Sequence>
        );
      })}
    </AbsoluteFill>
  );
};

const Missing: React.FC<{id: string}> = ({id}) => (
  <AbsoluteFill style={{alignItems: 'center', justifyContent: 'center', color: C.gray, fontFamily: F.mono, fontSize: 40}}>
    module:{id}（未实现）
  </AbsoluteFill>
);
