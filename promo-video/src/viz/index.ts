import type {VizDef} from './types';
import {complexMap} from './complexMap';
import {dihedral} from './dihedral';
import {fourier} from './fourier';
import {galton} from './galton';
import {linearMap} from './linearMap';
import {modCircle} from './modCircle';
import {newton} from './newton';
import {phaseFlow} from './phaseFlow';
import {riemann} from './riemann';
import {taylor} from './taylor';

/** 可视化画面库：id -> 定义。新增 viz 在这里登记（每个文件导出一个 VizDef）。 */
const LIST: VizDef[] = [riemann, linearMap, newton, galton, complexMap, phaseFlow, taylor, fourier, dihedral, modCircle];

export const VIZ: Record<string, VizDef> = Object.fromEntries(LIST.map((v) => [v.id, v]));
