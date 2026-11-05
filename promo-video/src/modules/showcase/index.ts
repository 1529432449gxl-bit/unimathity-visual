import type {ModuleDef} from '../../core/types';
import {beforeAfterModule} from './BeforeAfter';
import {outroModule} from './Outro';
import {showcaseGridModule} from './ShowcaseGrid';
import {statsRowModule} from './StatsRow';
import {vizMarqueeModule} from './VizMarquee';
import {vizShowcaseModule} from './VizShowcase';

/** showcase 段落的模块清单。新增模块在这里登记。 */
export const MODULES_SHOWCASE: ModuleDef<any>[] = [];
MODULES_SHOWCASE.push(vizShowcaseModule, showcaseGridModule, statsRowModule, outroModule, beforeAfterModule, vizMarqueeModule);
