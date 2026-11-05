import type {VizDef} from './types';
import {riemann} from './riemann';

/** 可视化画面库：id -> 定义。新增 viz 在这里登记。 */
const LIST: VizDef[] = [riemann];

export const VIZ: Record<string, VizDef> = Object.fromEntries(LIST.map((v) => [v.id, v]));
