import React from 'react';
import {useCurrentFrame} from 'remotion';
import {useProgress} from '../core/beat';
import {C, F} from '../core/theme';
import {VIZ} from '../viz';

/**
 * 按 id 嵌入一个数学画面。t 不传时用所在 Sequence 的进度；speed/offset 用于网格里错开节奏。
 * id 未登记时画一个占位框，方便并行开发。
 */
export const Viz: React.FC<{id: string; w: number; h: number; t?: number; speed?: number; offset?: number}> = ({id, w, h, t, speed = 1, offset = 0}) => {
  const frame = useCurrentFrame();
  const {t: auto} = useProgress();
  const def = VIZ[id];
  const tt = Math.min(1, Math.max(0, (t ?? auto) * speed + offset));
  if (!def) {
    return (
      <div style={{width: w, height: h, border: `2px dashed ${C.dim}`, color: C.gray, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: F.mono, fontSize: 24}}>
        viz:{id}
      </div>
    );
  }
  const Comp = def.component;
  return <Comp w={w} h={h} t={tt} frame={frame} />;
};
