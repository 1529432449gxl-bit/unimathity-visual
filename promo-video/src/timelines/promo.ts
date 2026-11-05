import type {TimelineItem} from '../core/types';

/**
 * 60 秒主宣传片 = 痛点（8 小节）+ 网站介绍（10 小节）+ 成果展示（10 小节）+ 收尾（2 小节）。
 * 1 小节 = 2 秒。改顺序、换模块、改文案都只改这里；配乐段落边界在 scripts/make-music.mjs 的 SECTIONS。
 */
export const PAIN: TimelineItem[] = [
  {module: 'PainHook', bars: 1},
  {module: 'PainPhoto', bars: 1, transition: 'glitch', props: {photo: 'pain-01', index: '01', title: '公式背了又忘', subtitle: '符号一长串，意思一片空白', layout: 'left'}},
  {module: 'PainPhoto', bars: 1, transition: 'glitch', props: {photo: 'pain-02', index: '02', title: '定理只会背', subtitle: '画不出图，就想不出为什么', layout: 'right'}},
  {module: 'PainPhoto', bars: 1, transition: 'glitch', props: {photo: 'pain-03', index: '03', title: '矩阵一大就迷路', subtitle: 'n 阶一般情形，脑子装不下', layout: 'left'}},
  {module: 'PainCollage', bars: 2, transition: 'punch'},
  {module: 'PainTurn', bars: 2, transition: 'none'},
];

export const INTRO: TimelineItem[] = [
  {module: 'LogoReveal', bars: 2, transition: 'flash'},
  {module: 'CourseWall', bars: 2, transition: 'flash'},
  {module: 'FlowSteps', bars: 2, transition: 'slide'},
  {module: 'BrowserDemo', bars: 2, transition: 'punch'},
  {module: 'FeatureSpotlight', bars: 2, transition: 'flash'},
];

export const SHOWCASE: TimelineItem[] = [
  {module: 'VizShowcase', bars: 1, transition: 'flash', props: {viz: 'riemann', index: '01'}},
  {module: 'VizShowcase', bars: 1, transition: 'glitch', props: {viz: 'linearMap', index: '02'}},
  {module: 'VizShowcase', bars: 1, transition: 'flash', props: {viz: 'galton', index: '03'}},
  {module: 'VizShowcase', bars: 1, transition: 'glitch', props: {viz: 'complexMap', index: '04'}},
  {module: 'VizShowcase', bars: 1, transition: 'flash', props: {viz: 'phaseFlow', index: '05'}},
  {module: 'VizShowcase', bars: 1, transition: 'glitch', props: {viz: 'dihedral', index: '06'}},
  {module: 'ShowcaseGrid', bars: 2, transition: 'punch'},
  {module: 'StatsRow', bars: 2, transition: 'flash'},
];

export const OUTRO: TimelineItem[] = [{module: 'Outro', bars: 2, transition: 'flash'}];

export const PROMO: TimelineItem[] = [...PAIN, ...INTRO, ...SHOWCASE, ...OUTRO];

/** 三段独立短片（各自带对应段落的配乐）。 */
export const SECTIONS = {
  Pain: {items: PAIN, musicFromBar: 0},
  Intro: {items: INTRO, musicFromBar: 8},
  Showcase: {items: [...SHOWCASE, ...OUTRO], musicFromBar: 18},
};
