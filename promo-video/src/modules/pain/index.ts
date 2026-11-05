import type {ModuleDef} from '../../core/types';
import {PainChecklistModule} from './PainChecklist';
import {PainCollageModule} from './PainCollage';
import {PainHookModule} from './PainHook';
import {PainPhotoModule} from './PainPhoto';
import {PainQuoteModule} from './PainQuote';
import {PainTurnModule} from './PainTurn';
import {TitleCardModule} from './TitleCard';

/** pain 段落的模块清单。新增模块在这里登记（TitleCard 为通用标题卡，family: common）。 */
export const MODULES_PAIN: ModuleDef<any>[] = [
  PainHookModule,
  PainPhotoModule,
  PainCollageModule,
  PainTurnModule,
  TitleCardModule,
  PainQuoteModule,
  PainChecklistModule,
];
