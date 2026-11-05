import type {ModuleDef} from '../../core/types';
import {BrowserDemoModule} from './BrowserDemo';
import {CourseWallModule} from './CourseWall';
import {FeatureGridModule} from './FeatureGrid';
import {FeatureSpotlightModule} from './FeatureSpotlight';
import {FlowStepsModule} from './FlowSteps';
import {KeywordBurstModule} from './KeywordBurst';
import {LogoRevealModule} from './LogoReveal';

/** intro 段落的模块清单。新增模块在这里登记。 */
export const MODULES_INTRO: ModuleDef<any>[] = [LogoRevealModule, CourseWallModule, FlowStepsModule, BrowserDemoModule, FeatureSpotlightModule, FeatureGridModule, KeywordBurstModule];
