import React, {useMemo} from 'react';
import {AbsoluteFill, random} from 'remotion';
import {Backdrop} from '../../components/Backdrop';
import {GlitchText} from '../../components/GlitchText';
import {useBeat, useProgress, useUnit} from '../../core/beat';
import {C, F} from '../../core/theme';
import {clamp, easeOutBack, easeOutCubic, seg} from '../../core/time';
import {defineModule} from '../../core/types';
import {FormulaFog, PAIN_FORMULAS, Photo, beatJitter, hiMask, impact, slamStyle} from './shared';

export type PainCollageProps = {
  photos: string[];
  words: string[];
  center: string;
  highlight?: string;
  formulas: string[];
};

type Row = {y: number; size: number; speed: number; dir: number; text: string; front: boolean; kind: 'solid' | 'outline' | 'accent'; off: number};

/** 拼贴墙：照片按半拍依次弹出，关键词多行反向滚动，后半段中央大字砸出。 */
const PainCollage: React.FC<PainCollageProps> = ({photos, words, center, highlight, formulas}) => {
  const {frame, duration} = useProgress();
  const {u, width, height, portrait} = useUnit();
  const {pulse, frac, index: beatIdx} = useBeat();

  // —— 照片网格（带随机偏移与旋转）
  const cols = portrait ? 2 : 3;
  const n = photos.length;
  const rowsN = Math.max(1, Math.ceil(n / cols));
  const cellW = (width * 0.94) / cols;
  const cellH = (height * (portrait ? 0.9 : 0.9)) / rowsN;
  const order = useMemo(() => {
    const idx = photos.map((_, i) => i);
    return idx.sort((a, b) => random(`co${a}`) - random(`co${b}`));
  }, [photos]);
  const popEvery = duration / 16; // 2 小节时为半拍
  const cStart = Math.round(duration * 0.5);

  // —— 关键词滚动行
  const rows: Row[] = useMemo(() => {
    const count = portrait ? 8 : 6;
    const list: Row[] = [];
    for (let i = 0; i < count; i++) {
      const r = (k: string) => random(`cw${i}${k}`);
      const front = i % 3 === 1;
      const size = (front ? 92 + r('s') * 40 : 46 + r('s') * 40) * u;
      const ws = words.length ? words : [''];
      const startAt = Math.floor(r('o') * ws.length);
      const speed = (front ? 10 + r('v') * 8 : 4 + r('v') * 6) * u;
      const need = width * 2.2 + speed * (duration + 60);
      let text = '';
      let est = 0;
      let k = 0;
      while (est < need && k < 400) {
        const w = ws[(startAt + k) % ws.length];
        text += w + '   ';
        est += Array.from(w).length * size * 0.95;
        k++;
      }
      list.push({
        y: ((i + 0.5) / count) * height + (r('y') - 0.5) * 30 * u,
        size,
        speed,
        dir: i % 2 === 0 ? -1 : 1,
        text,
        front,
        kind: i === 2 || i === 5 ? 'accent' : front ? 'outline' : 'solid',
        off: r('off') * width * 0.5,
      });
    }
    return list;
  }, [words, portrait, u, width, height, duration]);
  // 拍起点猛推一下，然后滑行
  const lurch = beatIdx + (1 - Math.exp(-frac * 5));
  const travel = (sp: number) => sp * (frame * 0.7 + lurch * 6);

  const renderRow = (r: Row, i: number) => {
    // 向左滚：左端锚在屏幕左侧外；向右滚：右端锚在屏幕右侧外
    const anchor = r.dir < 0 ? -r.off : width + r.off;
    const move = r.dir < 0 ? `translateX(${-travel(r.speed)}px)` : `translateX(-100%) translateX(${travel(r.speed)}px)`;
    const style: React.CSSProperties =
      r.kind === 'outline'
        ? {color: 'transparent', WebkitTextStroke: `${2 * u}px rgba(168,205,246,0.45)`}
        : r.kind === 'accent'
          ? {color: `rgba(244,162,76,${0.35 + 0.25 * pulse})`}
          : {color: 'rgba(142,144,152,0.35)'};
    return (
      <div
        key={i}
        style={{
          position: 'absolute',
          left: anchor,
          top: r.y,
          transform: `${move} translateY(-50%) skewX(${-r.dir * 6 * pulse}deg)`,
          whiteSpace: 'pre',
          fontFamily: F.cn,
          fontWeight: r.front ? 900 : 700,
          fontSize: r.size,
          lineHeight: 1,
          filter: r.front ? `blur(${1 + 3 * pulse}px)` : 'blur(1.5px)',
          ...style,
        }}
      >
        {r.text}
      </div>
    );
  };

  // —— 中央大字
  const cChars = Array.from(center);
  const cStagger = Math.min(4, (duration * 0.18) / Math.max(1, cChars.length));
  const cSize = Math.min((portrait ? 150 : 200) * u, (width * 0.86) / Math.max(1, cChars.length * 1.04));
  const cHits = cChars.map((_, i) => cStart + i * cStagger + 4);
  const hitC = impact(frame, cHits, 3);
  const popHits = order.map((_, k) => Math.round(k * popEvery) + 3);
  const hitP = impact(frame, popHits, 2.5);
  const dim = easeOutCubic(seg(frame, cStart - 2, cStart + 8));
  const mask = hiMask(center, highlight);
  const shakeAmt = Math.min(1.6, hitC + hitP * 0.5);
  const sx = (random(`cl-x${frame}`) - 0.5) * 2 * shakeAmt * 9 * u;
  const sy = (random(`cl-y${frame}`) - 0.5) * 2 * shakeAmt * 6 * u;
  const lastHit = cHits[cHits.length - 1] ?? cStart;
  const cGlitch = (frame > lastHit && frame < lastHit + 5) || (frame > lastHit + 6 && frac < 0.12) || frame > duration - 5;

  return (
    <AbsoluteFill>
      <Backdrop tint={C.deep} energy={0.6} />
      <FormulaFog formulas={formulas} frame={frame} width={width} height={height} u={u} count={10} seed="cf" opacity={0.7} />
      <AbsoluteFill style={{transform: `translate(${sx}px, ${sy}px) scale(${1 + 0.04 * easeOutCubic(frame / duration)})`}}>
        {rows.filter((r) => !r.front).map(renderRow)}

        {/* 照片墙 */}
        <AbsoluteFill style={{filter: `blur(${dim * 5}px) brightness(${1 - dim * 0.45})`}}>
          {order.map((pi, k) => {
            const photo = photos[pi];
            const col = pi % cols;
            const row = Math.floor(pi / cols);
            const r = (s: string) => random(`cp${pi}${s}`);
            const w = cellW * (0.7 + r('w') * 0.14);
            const h = cellH * (0.66 + r('h') * 0.12);
            const cx = width * 0.03 + cellW * (col + 0.5) + (r('x') - 0.5) * cellW * 0.22;
            const cy = height * 0.05 + cellH * (row + 0.5) + (r('y') - 0.5) * cellH * 0.18;
            const rot = (r('r') - 0.5) * 14;
            const t0 = Math.round(k * popEvery);
            const p = clamp((frame - t0) / 9);
            if (p <= 0) return null;
            const j = beatJitter(frame, `cj${pi}`, 6 * u);
            const s = 0.35 + 0.65 * easeOutBack(p, 2.4);
            const flash = Math.exp(-Math.max(0, frame - t0) / 3);
            return (
              <div
                key={pi}
                style={{
                  position: 'absolute',
                  left: cx - w / 2,
                  top: cy - h / 2,
                  transform: `translate(${j.x}px, ${j.y}px) rotate(${rot + (1 - p) * 18 + j.r}deg) scale(${s * (1 + 0.025 * pulse)})`,
                  opacity: clamp(p * 3),
                  zIndex: k,
                }}
              >
                <Photo photo={photo} w={w} h={h} radius={12 * u} brackets={null} style={{border: `${5 * u}px solid ${C.ink}`, borderRadius: 14 * u, boxShadow: '0 24px 60px rgba(0,0,0,0.6)'}} />
                <div style={{position: 'absolute', inset: 0, background: C.white, opacity: flash * 0.6, borderRadius: 14 * u}} />
              </div>
            );
          })}
        </AbsoluteFill>

        {rows.filter((r) => r.front).map((r, i) => renderRow(r, i + 100))}
      </AbsoluteFill>

      {/* 中央压暗带 + 大字 */}
      <AbsoluteFill style={{background: `rgba(5,8,26,${dim * 0.55})`}} />
      {frame >= cStart - 1 ? (
        <AbsoluteFill style={{alignItems: 'center', justifyContent: 'center'}}>
          <div
            style={{
              position: 'absolute',
              left: 0,
              right: 0,
              top: '50%',
              height: cSize * 1.7,
              transform: `translateY(-50%) scaleY(${easeOutBack(seg(frame, cStart - 1, cStart + 7), 2)})`,
              background: 'linear-gradient(90deg, transparent, rgba(5,8,26,0.85) 15%, rgba(5,8,26,0.85) 85%, transparent)',
              borderTop: `${3 * u}px solid rgba(244,162,76,0.7)`,
              borderBottom: `${3 * u}px solid rgba(244,162,76,0.7)`,
            }}
          />
          <div style={{transform: `translate(${sx * 0.6}px, ${sy * 0.6}px) scale(${1 + 0.035 * pulse})`}}>
            <GlitchText active={cGlitch} amount={40 * u}>
              <div
                style={{
                  fontFamily: F.cn,
                  fontWeight: 900,
                  fontSize: cSize,
                  lineHeight: 1.1,
                  whiteSpace: 'pre',
                  color: C.ink,
                  letterSpacing: '0.04em',
                  textShadow: `0 0 ${40 * u}px rgba(168,205,246,0.35)`,
                }}
              >
                {cChars.map((ch, i) => (
                  <span
                    key={i}
                    style={{
                      ...slamStyle(frame, cStart + i * cStagger, 9),
                      color: mask[i] ? C.orange : undefined,
                      textShadow: mask[i] ? `0 0 ${40 * u}px rgba(244,162,76,0.7)` : undefined,
                    }}
                  >
                    {ch}
                  </span>
                ))}
              </div>
            </GlitchText>
          </div>
        </AbsoluteFill>
      ) : null}
      <AbsoluteFill style={{background: C.white, opacity: clamp(hitC * 0.07 + hitP * 0.025), mixBlendMode: 'screen', pointerEvents: 'none'}} />
    </AbsoluteFill>
  );
};

export const PainCollageModule = defineModule<PainCollageProps>({
  id: 'PainCollage',
  family: 'pain',
  title: '拼贴墙 · 越学越迷糊',
  desc: '多张照片位按半拍依次弹出成拼贴墙，关键词多行以不同速度横向滚动，后半段中央大字砸出。props：photos（槽位名数组）, words, center, highlight, formulas。',
  bars: 2,
  component: PainCollage,
  defaults: {
    photos: ['pain-04', 'pain-05', 'pain-06', 'pain-07', 'pain-08', 'pain-09'],
    words: ['极限', '级数', '特征值', '留数', '测度', '群同态', '一致收敛', '雅可比行列式', '傅里叶变换', '柯西积分公式', '正交补', '拉格朗日乘子', '勒贝格积分', '商群', '特征多项式', '泰勒展开', '洛朗级数', '相平面', '同余', '插值误差'],
    center: '越学越迷糊',
    highlight: '迷糊',
    formulas: PAIN_FORMULAS,
  },
});
