import React from 'react';
import {AbsoluteFill, Audio, Composition, Folder, staticFile} from 'remotion';
import {Backdrop} from './components/Backdrop';
import {FontGate} from './components/FontGate';
import {Viz} from './components/Viz';
import {C, F} from './core/theme';
import {BAR, FPS} from './core/time';
import type {TimelineItem} from './core/types';
import {ALL_MODULES} from './registry';
import {Timeline, timelineFrames, timelineText} from './Timeline';
import {PROMO, SECTIONS} from './timelines/promo';
import {VIZ} from './viz';

const W = 1920;
const H = 1080;

type TimelineProps = {items: TimelineItem[]; music: boolean; musicFromBar: number};

/** 任意时间线 + 可选配乐。其他 agent 可以用 --props 传入自己的 items 渲染新短片。 */
export const TimelineVideo: React.FC<TimelineProps> = ({items, music, musicFromBar}) => (
  <FontGate text={timelineText(items)}>
    <Timeline items={items} />
    {music ? <Audio src={staticFile('music.wav')} startFrom={musicFromBar * BAR} /> : null}
  </FontGate>
);

const VizStage: React.FC<{id: string}> = ({id}) => {
  const def = VIZ[id];
  return (
    <FontGate text={(def?.title ?? '') + (def?.course ?? '')}>
      <Backdrop />
      <AbsoluteFill style={{alignItems: 'center', justifyContent: 'center'}}>
        <Viz id={id} w={1500} h={900} />
      </AbsoluteFill>
      <div style={{position: 'absolute', left: 60, bottom: 40, color: C.gray, fontFamily: F.cn, fontSize: 28}}>
        {def ? `${def.course} · ${def.title}` : id}
      </div>
    </FontGate>
  );
};

export const Root: React.FC = () => (
  <>
    <Composition
      id="UnimathityPromo"
      component={TimelineVideo}
      durationInFrames={timelineFrames(PROMO)}
      fps={FPS}
      width={W}
      height={H}
      defaultProps={{items: PROMO, music: true, musicFromBar: 0}}
      calculateMetadata={({props}) => ({durationInFrames: Math.max(1, timelineFrames(props.items))})}
    />
    <Folder name="Sections">
      {Object.entries(SECTIONS).map(([name, s]) => (
        <Composition
          key={name}
          id={`Section-${name}`}
          component={TimelineVideo}
          durationInFrames={timelineFrames(s.items)}
          fps={FPS}
          width={W}
          height={H}
          defaultProps={{items: s.items, music: true, musicFromBar: s.musicFromBar}}
          calculateMetadata={({props}) => ({durationInFrames: Math.max(1, timelineFrames(props.items))})}
        />
      ))}
    </Folder>
    <Folder name="Modules">
      {ALL_MODULES.map((m) => (
        <Composition
          key={m.id}
          id={`Mod-${m.id}`}
          component={TimelineVideo}
          durationInFrames={m.bars * BAR}
          fps={FPS}
          width={W}
          height={H}
          defaultProps={{items: [{module: m.id, bars: m.bars, transition: 'none'}], music: false, musicFromBar: 0}}
          calculateMetadata={({props}) => ({durationInFrames: Math.max(1, timelineFrames(props.items))})}
        />
      ))}
    </Folder>
    <Folder name="Viz">
      {Object.keys(VIZ).map((id) => (
        <Composition key={id} id={`Viz-${id}`} component={VizStage} durationInFrames={4 * BAR} fps={FPS} width={W} height={H} defaultProps={{id}} />
      ))}
    </Folder>
  </>
);
