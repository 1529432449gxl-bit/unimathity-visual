import type {ModuleDef} from './core/types';
import {MODULES_PAIN} from './modules/pain';
import {MODULES_INTRO} from './modules/intro';
import {MODULES_SHOWCASE} from './modules/showcase';

export const ALL_MODULES: ModuleDef<any>[] = [...MODULES_PAIN, ...MODULES_INTRO, ...MODULES_SHOWCASE];
export const MODULE_MAP: Record<string, ModuleDef<any>> = Object.fromEntries(ALL_MODULES.map((m) => [m.id, m]));
