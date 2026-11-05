import React from 'react';
import {AbsoluteFill} from 'remotion';
import {Backdrop} from '../../components/Backdrop';
import {SlamText} from '../../components/SlamText';
import {Viz} from '../../components/Viz';
import {useBeat} from '../../core/beat';
import {C, F} from '../../core/theme';
import {clamp, easeInOutCubic, easeOutBack, easeOutCubic} from '../../core/time';
import {defineModule} from '../../core/types';
import {Stage, Sweep, hit, usePlan, useStage} from './util';

type Card = {title: string; desc: string; viz: string};
type Props = {title: string; highlight: string; cards: Card[]};

/**
 * 三张卖点卡片：第 0 拍标题，第 1~3 拍卡片逐拍翻入（卡内 viz 随即开始播放），
 * 第 4~6 拍卡片依次被「点亮」，第 7 拍光带扫过、整体推镜。横屏一行三张，竖屏三行。
 */
const FeatureGrid: React.FC<Props> = ({title, highlight, cards}) => {
  const {frame, at, len, p} = usePlan(8);
  const {pulse} = useBeat();
  const {W, H, portrait} = useStage();
  const n = cards.length;
  const gap = portrait ? 34 : 40;
  const top = portrait ? 330 : 240;
  const padX = portrait ? 60 : 120;
  const cw = portrait ? W - padX * 2 : (W - padX * 2 - gap * (n - 1)) / n;
  const ch = portrait ? Math.min(440, (H - top - 140 - gap * (n - 1)) / n) : 660;
  const vizW = portrait ? Math.round(cw * 0.46) : Math.round(cw - 48);
  const vizH = portrait ? ch - 48 : 400;
  const stepB = Math.min(1, 3 / Math.max(1, n));
  const landAt = (i: number) => at(1 + i * stepB);
  const litAt = (i: number) => at(4 + i * stepB);
  const push = 1 + 0.04 * easeInOutCubic(p(4, 4));

  return (
    <AbsoluteFill>
      <Backdrop tint={C.deep} energy={0.55} />
      <Stage>
        <div style={{position: 'absolute', left: 0, right: 0, top: portrait ? 160 : 70, display: 'flex', justifyContent: 'center'}}>
          <SlamText text={title} start={0} stagger={2} dur={8} size={portrait ? 84 : 80} highlight={highlight} style={{textShadow: `0 0 ${20 + 20 * pulse}px rgba(111,156,255,0.5)`}} />
        </div>
        <div style={{position: 'absolute', inset: 0, transform: `scale(${push})`, transformOrigin: '50% 60%'}}>
          {cards.map((c, i) => {
            const x = portrait ? padX : padX + i * (cw + gap);
            const y = portrait ? top + i * (ch + gap) : top;
            const q = clamp((frame - landAt(i) + 9) / 10);
            const flip = (1 - easeOutBack(q, 1.3)) * (portrait ? 90 : -90);
            const land = hit(frame, landAt(i), 6);
            const lit = frame >= litAt(i) ? hit(frame, litAt(i), 10) : 0;
            const on = frame >= litAt(i) && frame < litAt(i) + len(1);
            const vt = clamp((frame - landAt(i)) / Math.max(1, len(8) - landAt(i)));
            return (
              <div key={i} style={{position: 'absolute', left: x, top: y, width: cw, height: ch, perspective: 1600}}>
                <div
                  style={{
                    position: 'absolute',
                    inset: 0,
                    transform: portrait ? `rotateX(${flip}deg) scale(${1 + 0.03 * lit})` : `rotateY(${flip}deg) scale(${1 + 0.04 * lit})`,
                    transformOrigin: portrait ? '50% 0%' : '50% 50%',
                    opacity: q > 0 ? clamp(q * 3) : 0,
                    borderRadius: 26,
                    overflow: 'hidden',
                    background: `linear-gradient(160deg, ${C.panelHi}, ${C.panel} 55%, ${C.bg2})`,
                    border: `2px solid ${on ? C.orange : 'rgba(168,205,246,0.3)'}`,
                    boxShadow: `0 0 ${20 + 50 * (land + lit)}px rgba(${on ? '244,162,76' : '111,156,255'},${0.3 + 0.4 * (land + lit)})`,
                    display: 'flex',
                    flexDirection: portrait ? 'row' : 'column',
                    alignItems: portrait ? 'center' : 'stretch',
                    padding: 24,
                    boxSizing: 'border-box',
                    gap: portrait ? 36 : 26,
                  }}
                >
                  <div style={{flex: 'none', width: vizW, height: vizH, borderRadius: 16, background: 'rgba(5,8,26,0.65)', overflow: 'hidden', border: `1px solid rgba(168,205,246,0.15)`}}>
                    <Viz id={c.viz} w={vizW} h={vizH} t={vt} />
                  </div>
                  <div style={{padding: portrait ? 0 : '0 10px', minWidth: 0}}>
                    <div style={{display: 'flex', alignItems: 'baseline', gap: 16}}>
                      <span style={{fontFamily: F.en, fontWeight: 700, fontSize: 40, color: C.orange}}>{String(i + 1).padStart(2, '0')}</span>
                      <span style={{fontFamily: F.cn, fontWeight: 900, fontSize: portrait ? 50 : 52, color: C.ink, whiteSpace: 'nowrap'}}>{c.title}</span>
                    </div>
                    <div style={{marginTop: 16, fontFamily: F.cn, fontSize: portrait ? 32 : 30, lineHeight: 1.55, color: C.sky, opacity: 0.85 * easeOutCubic(clamp((frame - landAt(i)) / 10))}}>{c.desc}</div>
                  </div>
                  <Sweep p={clamp((frame - litAt(i)) / 12)} opacity={0.3} band={30} />
                </div>
              </div>
            );
          })}
          <div style={{position: 'absolute', left: 0, top: 0, width: W, height: H, overflow: 'hidden', pointerEvents: 'none'}}>
            <Sweep p={p(7, 1)} opacity={0.35} band={12} />
          </div>
        </div>
      </Stage>
    </AbsoluteFill>
  );
};

export const FeatureGridModule = defineModule<Props>({
  id: 'FeatureGrid',
  family: 'intro',
  title: '三张卖点卡',
  desc: '三张卖点卡片逐拍翻入、依次点亮，卡内播放 viz。props：title, highlight, cards: {title, desc, viz}[]（建议 2~4 张）。',
  bars: 2,
  component: FeatureGrid,
  defaults: {
    title: '讲义 + 动画，一页学懂',
    highlight: '一页学懂',
    cards: [
      {title: '讲义成体系', desc: '定义、定理、例题配套讲解', viz: 'taylor'},
      {title: '动画嵌在正文', desc: '读到哪里，动画就在哪里', viz: 'fourier'},
      {title: '亲手拖一拖', desc: '拖动参数，可播放可暂停', viz: 'complexMap'},
    ],
  },
});
