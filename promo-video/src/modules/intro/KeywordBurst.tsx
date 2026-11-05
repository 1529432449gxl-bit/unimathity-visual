import React from 'react';
import {AbsoluteFill, random} from 'remotion';
import {Backdrop} from '../../components/Backdrop';
import {GlitchText} from '../../components/GlitchText';
import {C, F} from '../../core/theme';
import {BEAT, clamp, easeOutBack, easeOutCubic, lerp} from '../../core/time';
import {defineModule} from '../../core/types';
import {Stage, hit, useStage} from './util';
import {useProgress} from '../../core/beat';

type Props = {words: string[]; kicker: string};

/**
 * 关键词快闪：一拍一个词（时长不够时改成半拍一个），四种入场轮换：砸入 / 故障 / 横甩 / 反白；
 * 最后一个词用橙色并停留到结束，伴随冲击环。
 */
const KeywordBurst: React.FC<Props> = ({words, kicker}) => {
  const {frame, duration} = useProgress();
  const {W, H, portrait} = useStage();
  const n = words.length;
  const per = duration / BEAT >= n ? BEAT : BEAT / 2;
  const idx = Math.min(n - 1, Math.floor(frame / per));
  const local = frame - idx * per;
  const last = idx === n - 1;
  const word = words[idx] ?? '';
  const chars = Array.from(word).length;
  const size = Math.min(portrait ? 260 : 300, ((W * 0.82) / Math.max(1, chars)) * 0.98);
  const style = last ? 0 : idx % 4;
  const q = clamp(local / 8);
  const pulse = Math.exp(-((frame % BEAT) / BEAT) * 5);

  let transform = '';
  let filter = '';
  let invert = 0;
  if (style === 0) {
    transform = `scale(${lerp(1.7, 1, easeOutBack(q, 2))})`;
    filter = `blur(${(1 - easeOutCubic(q)) * 16}px)`;
  } else if (style === 1) {
    transform = `translateX(${local < 5 ? (random(`kb${frame}`) - 0.5) * 60 : 0}px)`;
  } else if (style === 2) {
    const d = idx % 8 < 4 ? -1 : 1;
    transform = `translateX(${d * (1 - easeOutCubic(q)) * 600}px) skewX(${d * (1 - easeOutCubic(q)) * 25}deg)`;
    filter = `blur(${(1 - easeOutCubic(q)) * 10}px)`;
  } else {
    invert = local < per * 0.5 ? 1 : 0;
    transform = `scale(${lerp(0.8, 1, easeOutBack(q, 2))})`;
  }
  const hold = last ? 1 + 0.06 * easeOutCubic(clamp(local / Math.max(1, duration - idx * per))) : 1;
  const color = last ? C.orange : C.ink;
  const glowC = last ? 'rgba(244,162,76,0.75)' : 'rgba(111,156,255,0.7)';
  const ring = hit(frame, idx * per, 10);

  const text = (
    <span style={{fontFamily: F.cn, fontWeight: 900, fontSize: size, lineHeight: 1.1, color: invert ? C.bg : color, whiteSpace: 'nowrap', letterSpacing: '0.04em', textShadow: invert ? 'none' : `0 0 ${30 + 30 * pulse}px ${glowC}`}}>
      {word}
    </span>
  );

  // 两侧速度线
  const lines = new Array(10).fill(0).map((_, i) => {
    const y = H * (0.15 + 0.7 * random(`kl${i}`));
    const len = 200 + 400 * random(`kw${i}`);
    const side = i % 2 === 0 ? -1 : 1;
    const x = W / 2 + side * (W * 0.32 + ((local * 40 + random(`kx${i}`) * 400) % (W * 0.3)));
    return {x, y, len, op: 0.15 + 0.35 * pulse};
  });

  return (
    <AbsoluteFill>
      <Backdrop tint={last ? C.warm : C.deep} energy={0.9} />
      <AbsoluteFill style={{background: C.white, opacity: 0.18 * hit(frame, idx * per, 3), mixBlendMode: 'screen'}} />
      <Stage>
        {lines.map((l, i) => (
          <div key={i} style={{position: 'absolute', left: l.x - l.len / 2, top: l.y, width: l.len, height: 3, borderRadius: 2, background: `linear-gradient(90deg, transparent, ${i % 3 === 0 ? C.orange : C.sky}, transparent)`, opacity: l.op}} />
        ))}
        {/* 上一个词的残影 */}
        {idx > 0 ? (
          <div style={{position: 'absolute', left: W / 2, top: H / 2, transform: `translate(-50%,-50%) scale(${1 + 0.6 * easeOutCubic(q)})`, opacity: 0.25 * (1 - q), fontFamily: F.cn, fontWeight: 900, fontSize: size, color: 'transparent', WebkitTextStroke: `2px ${C.sky}`, whiteSpace: 'nowrap'}}>
            {words[idx - 1]}
          </div>
        ) : null}
        {/* 冲击环 */}
        <div
          style={{
            position: 'absolute',
            left: W / 2,
            top: H / 2,
            width: size * 1.6,
            height: size * 1.6,
            borderRadius: '50%',
            border: `${6 * ring}px solid ${last ? C.orange : C.blue}`,
            transform: `translate(-50%,-50%) scale(${0.6 + (1 - ring) * 1.8})`,
            opacity: ring,
          }}
        />
        <div style={{position: 'absolute', left: W / 2, top: H / 2, transform: `translate(-50%,-50%) ${transform} scale(${hold})`, filter}}>
          {invert ? <div style={{position: 'absolute', inset: '-6% -8%', background: C.ink, boxShadow: `0 0 60px ${C.sky}`}} /> : null}
          <div style={{position: 'relative'}}>
            {style === 1 ? (
              <GlitchText active={local < 5} amount={30}>
                {text}
              </GlitchText>
            ) : (
              text
            )}
          </div>
        </div>
        {/* 计数小字 */}
        <div style={{position: 'absolute', left: 0, right: 0, bottom: portrait ? 260 : 110, display: 'flex', justifyContent: 'center', gap: 14}}>
          {words.map((_, i) => (
            <div key={i} style={{width: i === idx ? 44 : 14, height: 14, borderRadius: 7, background: i <= idx ? (i === n - 1 ? C.orange : C.sky) : C.deep}} />
          ))}
        </div>
        <div style={{position: 'absolute', left: 0, right: 0, top: portrait ? 300 : 110, textAlign: 'center', fontFamily: F.en, fontWeight: 700, fontSize: 30, letterSpacing: '0.4em', color: C.sky, opacity: 0.7}}>{kicker}</div>
      </Stage>
    </AbsoluteFill>
  );
};

export const KeywordBurstModule = defineModule<Props>({
  id: 'KeywordBurst',
  family: 'intro',
  title: '关键词快闪',
  desc: '一拍一个大字关键词，砸入 / 故障 / 横甩 / 反白轮换，最后一个橙色停留。props：words（建议 词数 ≤ 拍数）、kicker（顶部小字）。',
  bars: 2,
  component: KeywordBurst,
  defaults: {
    words: ['定义', '定理', '例题', '动画', '拖一拖', '看得见'],
    kicker: 'UNIMATHITY',
  },
});
