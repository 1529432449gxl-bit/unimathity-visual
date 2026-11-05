<script setup>
import { computed, onBeforeUnmount, onMounted, ref, useId, watch } from 'vue'
import katex from 'katex'
import { compileExpr, evalConst } from '../../utils/mathExpr'
import { niceTicks } from '../../utils/niceTicks'

// 定积分定义的分步演示：曲边梯形 → 分割 → 近似 → 求和 → 取极限。
// 模块内不放说明文字：步骤按钮与下方定义式里对应的部分同步点亮，读数只用公式。
// 配置行：expression（被积函数，变量 x）、a、b、n（初始分点数）、
// point（random / left / mid / right，介点取法）、partition（random / uniform）。
const props = defineProps({
  item: {
    type: Object,
    required: true,
  },
})

const W = 720
const H = 320
const PAD = { left: 40, right: 26, top: 22, bottom: 52 }
const LIMIT_NS = [4, 8, 16, 32, 64, 128]
const WARM = '#b5763a'
const MUTE = '#c2c4ca'

// 每一步在定义式中对应的部分：0 积分本身，1 Δx_i，2 f(ξ_i)，3 Σ，4 lim。
const STAGE_TEX = ['A', '\\Delta x_i', 'f(\\xi_i)', '\\textstyle\\sum', '\\lambda\\to0']
const STAGE_NAMES = ['region', 'partition', 'approximate', 'sum', 'limit']

const POINT_RULES = [
  { value: 'random', label: 'rand' },
  { value: 'left', label: 'left' },
  { value: 'mid', label: 'mid' },
  { value: 'right', label: 'right' },
]

const uid = useId().replace(/[^a-z0-9-]/gi, '')
const config = computed(() => props.item.config || {})

function numberConfig(key, fallback) {
  const raw = config.value[key]
  if (raw === undefined || raw === '') return fallback
  try {
    return evalConst(String(raw))
  } catch {
    return fallback
  }
}

const compiled = computed(() => {
  const source = config.value.expression || '2 + sin(1.6x) + 0.15x^2'
  try {
    const fn = compileExpr(source, ['x'])
    return { f: (x) => { const y = fn(x); return Number.isFinite(y) ? y : 0 }, error: '' }
  } catch (error) {
    return { f: () => 0, error: `expression: ${error.message}` }
  }
})
const f = (x) => compiled.value.f(x)

const a = computed(() => numberConfig('a', 0.4))
const b = computed(() => {
  const value = numberConfig('b', 3.6)
  return value > a.value ? value : a.value + 1
})

const n = ref(Math.round(Math.min(40, Math.max(1, numberConfig('n', 6)))))
const pointRule = ref(POINT_RULES.some((rule) => rule.value === config.value.point) ? config.value.point : 'random')
const uniform = computed(() => config.value.partition === 'uniform')
const seed = ref(7)

// ---------- 数据 ----------

function rng(start) {
  let t = start >>> 0
  return () => {
    t += 0x6d2b79f5
    let r = Math.imul(t ^ (t >>> 15), 1 | t)
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r)
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296
  }
}

function buildPartition(count, salt) {
  const rand = rng(seed.value * 7919 + count * 31 + salt)
  const h = (b.value - a.value) / count
  const xs = [a.value]
  for (let i = 1; i < count; i += 1) {
    const jitter = uniform.value ? 0 : (rand() - 0.5) * 0.6
    xs.push(a.value + (i + jitter) * h)
  }
  xs.push(b.value)
  const pick = rng(seed.value * 104729 + count + salt)
  return xs.slice(1).map((right, i) => {
    const left = xs[i]
    const rule = pointRule.value
    const t = rule === 'left' ? 0 : rule === 'right' ? 1 : rule === 'mid' ? 0.5 : 0.08 + pick() * 0.84
    const xi = left + t * (right - left)
    return { left, right, xi, height: f(xi), dx: right - left }
  })
}

const cells = computed(() => buildPartition(n.value, 0))
const lambdaOf = (list) => Math.max(...list.map((cell) => cell.dx))
const riemann = (list) => list.reduce((sum, cell) => sum + cell.height * cell.dx, 0)

const exact = computed(() => {
  const m = 2000
  const h = (b.value - a.value) / m
  let s = f(a.value) + f(b.value)
  for (let i = 1; i < m; i += 1) s += (i % 2 ? 4 : 2) * f(a.value + i * h)
  return (s * h) / 3
})

// ---------- 坐标 ----------

const xRange = computed(() => {
  const pad = 0.1 * (b.value - a.value)
  return [Math.min(0, a.value - pad), b.value + pad]
})
const yRange = computed(() => {
  let lo = 0
  let hi = 0
  for (let i = 0; i <= 240; i += 1) {
    const x = xRange.value[0] + ((xRange.value[1] - xRange.value[0]) * i) / 240
    const y = f(x)
    lo = Math.min(lo, y)
    hi = Math.max(hi, y)
  }
  const span = hi - lo || 1
  return [lo < 0 ? lo - 0.12 * span : 0, hi + 0.16 * span]
})
const sx = (x) => PAD.left + ((x - xRange.value[0]) / (xRange.value[1] - xRange.value[0])) * (W - PAD.left - PAD.right)
const sy = (y) => H - PAD.bottom - ((y - yRange.value[0]) / (yRange.value[1] - yRange.value[0])) * (H - PAD.top - PAD.bottom)

const curvePath = computed(() => {
  const [x0, x1] = xRange.value
  const pts = []
  for (let i = 0; i <= 300; i += 1) {
    const x = x0 + ((x1 - x0) * i) / 300
    pts.push(`${sx(x).toFixed(1)},${sy(f(x)).toFixed(1)}`)
  }
  return `M${pts.join(' L')}`
})

const regionPath = computed(() => {
  const pts = []
  for (let i = 0; i <= 200; i += 1) {
    const x = a.value + ((b.value - a.value) * i) / 200
    pts.push(`${sx(x).toFixed(1)},${sy(f(x)).toFixed(1)}`)
  }
  return `M${sx(a.value)},${sy(0)} L${pts.join(' L')} L${sx(b.value)},${sy(0)} Z`
})

const yTicks = computed(() => niceTicks(yRange.value[0], yRange.value[1], 4).filter((t) => t !== 0))
const yAxisX = computed(() => sx(Math.max(0, xRange.value[0])))

const rectOf = (cell) => {
  const top = sy(Math.max(cell.height, 0))
  const bottom = sy(Math.min(cell.height, 0))
  return { x: sx(cell.left), y: top, width: Math.max(0.5, sx(cell.right) - sx(cell.left)), height: Math.max(0.5, bottom - top) }
}

// ---------- 播放 ----------

const stage = ref(0)
const sweep = ref(0)
const limitIndex = ref(-1)
const limitRows = ref([])
const playing = ref(false)
const root = ref(null)
let timers = []
let observer = null

function clearTimers() {
  timers.forEach((id) => clearTimeout(id))
  timers = []
}
const later = (fn, ms) => timers.push(setTimeout(fn, ms))

function runSweep(onDone) {
  sweep.value = 0
  const step = Math.min(320, 2600 / n.value)
  for (let k = 1; k <= n.value; k += 1) later(() => { sweep.value = k }, step * k)
  if (onDone) later(onDone, step * n.value + 1000)
}

function runLimit(onDone) {
  limitIndex.value = -1
  limitRows.value = []
  LIMIT_NS.forEach((count, i) => {
    later(() => {
      limitIndex.value = i
      const list = buildPartition(count, 1)
      limitRows.value = [...limitRows.value, { n: count, lambda: lambdaOf(list), s: riemann(list) }]
    }, 300 + i * 1100)
  })
  if (onDone) later(onDone, 300 + LIMIT_NS.length * 1100)
}

function goStage(index, auto = false) {
  clearTimers()
  if (!auto) playing.value = false
  stage.value = index
  if (index === 3) runSweep(auto ? () => goStage(4, true) : null)
  if (index === 4) runLimit(auto ? () => { playing.value = false } : null)
  if (index < 3) {
    sweep.value = 0
    if (auto) later(() => goStage(index + 1, true), index === 0 ? 1800 : 2400)
  }
}

function play() {
  playing.value = true
  goStage(0, true)
}

function stop() {
  clearTimers()
  playing.value = false
}

function reroll() {
  seed.value += 1
}

watch([n, pointRule, seed], () => {
  if (stage.value === 3 && !playing.value) sweep.value = n.value
  if (stage.value === 4 && !playing.value) goStage(4)
})

onMounted(() => {
  const reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches
  if (reduce || typeof IntersectionObserver === 'undefined' || !root.value) return
  observer = new IntersectionObserver((entries) => {
    if (entries.some((entry) => entry.isIntersecting)) {
      observer.disconnect()
      play()
    }
  }, { threshold: 0.5 })
  observer.observe(root.value)
})

onBeforeUnmount(() => {
  clearTimers()
  if (observer) observer.disconnect()
})

// ---------- 当前帧 ----------

const shownCells = computed(() => {
  if (stage.value === 4 && limitIndex.value >= 0) return buildPartition(LIMIT_NS[limitIndex.value], 1)
  return cells.value
})
const shownN = computed(() => shownCells.value.length)
const showRects = computed(() => stage.value >= 2)
const showLabels = computed(() => stage.value >= 1 && stage.value <= 3 && shownN.value <= 8)
const runningSum = computed(() => riemann(shownCells.value.slice(0, sweep.value)))

const fmt = (v, d = 4) => (Number.isFinite(v) ? v.toFixed(d) : '-')
const tex = (source, display = false) => katex.renderToString(source, { throwOnError: false, displayMode: display })

// 定义式：当前步骤对应的部分用暖棕色，已经走过的用墨色，还没到的用浅灰。
const definitionTex = computed(() => {
  const part = (k, body) => {
    if (stage.value === k) return `{\\color{${WARM}}${body}}`
    if (stage.value > k || (k === 0 && stage.value === 4)) return body
    return `{\\color{${MUTE}}${body}}`
  }
  return [
    part(0, '\\int_a^b f(x)\\,\\mathrm{d}x'),
    '=',
    part(4, '\\lim_{\\lambda\\to0}'),
    part(3, '\\sum_{i=1}^{n}'),
    part(2, 'f(\\xi_i)'),
    part(1, '\\Delta x_i'),
  ].join('')
})

const stats = computed(() => {
  const list = shownCells.value
  if (stage.value === 0) return []
  if (stage.value === 1) return [`n=${shownN.value}`, `\\lambda\\approx${fmt(lambdaOf(list), 3)}`]
  if (stage.value === 2) return [`n=${shownN.value}`, `\\lambda\\approx${fmt(lambdaOf(list), 3)}`]
  if (stage.value === 3) return [`S_{${sweep.value}}\\approx${fmt(runningSum.value)}`, `I\\approx${fmt(exact.value)}`]
  const last = limitRows.value[limitRows.value.length - 1]
  if (!last) return [`I\\approx${fmt(exact.value)}`]
  return [`n=${last.n}`, `S\\approx${fmt(last.s)}`, `|S-I|\\approx${fmt(Math.abs(last.s - exact.value), 4)}`]
})

// 收敛小图：横轴 log2 n，纵轴积分和 S，虚线为 I。
const MW = 260
const MH = 112
const MP = { l: 10, r: 26, t: 12, b: 22 }
const mini = computed(() => {
  const values = [...limitRows.value.map((row) => row.s), exact.value]
  let lo = Math.min(...values)
  let hi = Math.max(...values)
  const span = hi - lo || Math.abs(hi) * 0.1 || 1
  lo -= span * 0.25
  hi += span * 0.25
  const mx = (count) => MP.l + ((Math.log2(count) - 2) / 5) * (MW - MP.l - MP.r)
  const my = (v) => MH - MP.b - ((v - lo) / (hi - lo)) * (MH - MP.t - MP.b)
  const pts = limitRows.value.map((row) => ({ x: mx(row.n), y: my(row.s) }))
  return {
    pts,
    path: pts.length ? `M${pts.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' L')}` : '',
    iy: my(exact.value),
    ticks: LIMIT_NS.map((count) => ({ x: mx(count), label: count })),
  }
})
</script>

<template>
  <div ref="root" class="ix rs">
    <div class="ix-head">
      <span class="ix-badge rs-badge" aria-hidden="true">
        <svg viewBox="0 0 12 12"><path d="M3 2 L10 6 L3 10 Z" /></svg>
      </span>
      <span class="ix-title">{{ item.title || 'Riemann sum' }}</span>
    </div>
    <div class="ix-body rs-body">
      <p v-if="item.desc" class="ix-desc">{{ item.desc }}</p>
      <p v-if="compiled.error" class="rs-error">{{ compiled.error }}</p>

      <!-- 步骤：用符号代替文字 -->
      <div class="rs-steps" role="tablist">
        <div class="rs-track"><div class="rs-track-fill" :style="{ width: `${(stage / 4) * 100}%` }" /></div>
        <button
          v-for="(glyph, i) in STAGE_TEX"
          :key="i"
          type="button"
          role="tab"
          class="rs-step"
          :class="{ 'is-on': stage === i, 'is-past': stage > i }"
          :aria-selected="stage === i"
          :aria-label="STAGE_NAMES[i]"
          :title="STAGE_NAMES[i]"
          @click="goStage(i)"
          v-html="tex(glyph)"
        />
      </div>

      <svg class="rs-canvas" :viewBox="`0 0 ${W} ${H}`" role="img" aria-label="Riemann sum">
        <defs>
          <linearGradient :id="`${uid}-region`" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stop-color="#223056" stop-opacity="0.26" />
            <stop offset="1" stop-color="#223056" stop-opacity="0.04" />
          </linearGradient>
          <linearGradient :id="`${uid}-rect`" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stop-color="#d9a066" stop-opacity="0.55" />
            <stop offset="1" stop-color="#d9a066" stop-opacity="0.18" />
          </linearGradient>
          <linearGradient :id="`${uid}-hot`" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stop-color="#b5763a" stop-opacity="0.85" />
            <stop offset="1" stop-color="#b5763a" stop-opacity="0.45" />
          </linearGradient>
          <marker :id="`${uid}-arrow`" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto">
            <path d="M0 0.8 L7.5 4 L0 7.2" fill="none" stroke="#8a8c94" stroke-width="1.1" />
          </marker>
        </defs>

        <!-- 网格与坐标轴 -->
        <g class="rs-grid">
          <line v-for="t in yTicks" :key="`g${t}`" :x1="PAD.left" :x2="W - PAD.right" :y1="sy(t)" :y2="sy(t)" />
        </g>
        <g class="rs-axis">
          <line :x1="PAD.left - 6" :x2="W - PAD.right + 12" :y1="sy(0)" :y2="sy(0)" :marker-end="`url(#${uid}-arrow)`" />
          <line :x1="yAxisX" :x2="yAxisX" :y1="H - PAD.bottom + 8" :y2="PAD.top - 12" :marker-end="`url(#${uid}-arrow)`" />
          <text :x="W - PAD.right + 14" :y="sy(0) + 16" class="rs-axis-name">x</text>
          <text :x="yAxisX + 8" :y="PAD.top - 6" class="rs-axis-name">y</text>
          <text v-for="t in yTicks" :key="`yt${t}`" :x="yAxisX - 7" :y="sy(t) + 3" class="rs-tick" text-anchor="end">{{ t }}</text>
        </g>

        <!-- 曲边梯形 -->
        <path :d="regionPath" class="rs-region" :class="{ 'is-dim': showRects }" :fill="`url(#${uid}-region)`" />

        <!-- 矩形 -->
        <g v-if="showRects" :key="`rects-${stage === 4 ? limitIndex : 'm'}-${shownN}-${seed}-${pointRule}`" class="rs-rects" :class="{ 'is-fade': stage === 4 }">
          <rect
            v-for="(cell, i) in shownCells"
            :key="`r${i}`"
            v-bind="rectOf(cell)"
            class="rs-rect"
            :class="{
              'is-neg': cell.height < 0,
              'is-grow': stage === 2,
              'is-thin': shownN > 40,
            }"
            :fill="stage === 3 && i === sweep - 1 ? `url(#${uid}-hot)` : `url(#${uid}-rect)`"
            :style="{
              animationDelay: stage === 2 ? `${Math.min(i * 90, 1400)}ms` : '0ms',
              opacity: stage === 3 && i >= sweep ? 0.35 : 1,
            }"
          />
        </g>

        <!-- 分点 -->
        <g
          v-if="stage >= 1 && stage <= 3"
          :key="`part-${shownN}-${seed}`"
          class="rs-partition"
        >
          <line
            v-for="(cell, i) in shownCells.slice(1)"
            :key="`p${i}`"
            :x1="sx(cell.left)"
            :x2="sx(cell.left)"
            :y1="sy(0)"
            :y2="sy(f(cell.left))"
            :class="{ 'is-draw': stage === 1 }"
            :style="{ animationDelay: stage === 1 ? `${Math.min(i * 110, 1500)}ms` : '0ms' }"
          />
          <circle
            v-for="(cell, i) in shownCells.slice(1)"
            :key="`pd${i}`"
            :cx="sx(cell.left)"
            :cy="sy(0)"
            r="2.4"
            class="rs-tickdot"
          />
        </g>

        <!-- 介点 -->
        <g v-if="stage === 2 || stage === 3">
          <g v-for="(cell, i) in shownCells" :key="`xi${i}`" class="rs-xi">
            <line :x1="sx(cell.xi)" :x2="sx(cell.xi)" :y1="sy(0)" :y2="sy(cell.height)" />
            <circle :cx="sx(cell.xi)" :cy="sy(cell.height)" r="3.4" />
          </g>
        </g>

        <!-- 曲线与端点 -->
        <path :d="curvePath" class="rs-curve" />
        <line :x1="sx(a)" :x2="sx(a)" :y1="sy(0)" :y2="sy(f(a))" class="rs-edge" />
        <line :x1="sx(b)" :x2="sx(b)" :y1="sy(0)" :y2="sy(f(b))" class="rs-edge" />

        <!-- 标注：分点在轴下第一行，介点在第二行 -->
        <g class="rs-labels">
          <template v-if="showLabels">
            <text
              v-for="(cell, i) in shownCells"
              :key="`xl${i}`"
              :x="sx(cell.left)"
              :y="sy(0) + 18"
              text-anchor="middle"
            >x<tspan dy="3" class="rs-sub">{{ i }}</tspan></text>
            <text :x="sx(b)" :y="sy(0) + 18" text-anchor="middle">x<tspan dy="3" class="rs-sub">{{ shownN }}</tspan></text>
            <template v-if="stage >= 2">
              <text
                v-for="(cell, i) in shownCells"
                :key="`xil${i}`"
                :x="sx(cell.xi)"
                :y="sy(0) + 38"
                text-anchor="middle"
                class="rs-xi-label"
              >ξ<tspan dy="3" class="rs-sub">{{ i + 1 }}</tspan></text>
            </template>
          </template>
          <template v-else>
            <text :x="sx(a)" :y="sy(0) + 18" text-anchor="middle">a</text>
            <text :x="sx(b)" :y="sy(0) + 18" text-anchor="middle">b</text>
          </template>
          <text
            v-if="stage === 0"
            :x="sx((a + b) / 2)"
            :y="sy(f((a + b) / 2) / 2) + 7"
            text-anchor="middle"
            class="rs-area-label"
          >A</text>
          <text :x="sx(b) - 8" :y="sy(f(b)) - 12" text-anchor="end" class="rs-curve-label">y = f(x)</text>
        </g>
      </svg>

      <!-- 定义式 + 读数 + 收敛小图 -->
      <div class="rs-foot">
        <div class="rs-formula-col">
          <div class="rs-formula" v-html="tex(definitionTex, true)" />
          <div class="rs-stats">
            <span v-for="s in stats" :key="s" class="rs-chip" v-html="tex(s)" />
          </div>
        </div>
        <svg
          v-if="stage === 4"
          class="rs-mini"
          :viewBox="`0 0 ${MW} ${MH}`"
          role="img"
          aria-label="S converges to I"
        >
          <line :x1="MP.l" :x2="MW - MP.r" :y1="MH - MP.b" :y2="MH - MP.b" class="rs-mini-axis" />
          <line :x1="MP.l" :x2="MW - MP.r" :y1="mini.iy" :y2="mini.iy" class="rs-mini-i" />
          <text :x="MW - MP.r + 6" :y="mini.iy + 4" class="rs-mini-label">I</text>
          <g v-for="t in mini.ticks" :key="t.label">
            <line :x1="t.x" :x2="t.x" :y1="MH - MP.b" :y2="MH - MP.b + 3" class="rs-mini-axis" />
            <text :x="t.x" :y="MH - 6" text-anchor="middle" class="rs-mini-tick">{{ t.label }}</text>
          </g>
          <path :d="mini.path" class="rs-mini-path" />
          <circle
            v-for="(p, i) in mini.pts"
            :key="i"
            :cx="p.x"
            :cy="p.y"
            :r="i === mini.pts.length - 1 ? 4 : 2.6"
            class="rs-mini-dot"
            :class="{ 'is-last': i === mini.pts.length - 1 }"
          />
        </svg>
      </div>

      <!-- 控制：图标与符号 -->
      <div class="rs-controls">
        <button
          type="button"
          class="rs-icon rs-icon-main"
          :aria-label="playing ? 'Pause' : 'Play'"
          :title="playing ? 'Pause' : 'Play'"
          @click="playing ? stop() : play()"
        >
          <svg v-if="playing" viewBox="0 0 12 12"><rect x="2.5" y="2" width="2.6" height="8" rx="0.6" /><rect x="6.9" y="2" width="2.6" height="8" rx="0.6" /></svg>
          <svg v-else viewBox="0 0 12 12"><path d="M3 1.8 L10.4 6 L3 10.2 Z" /></svg>
        </button>

        <label class="rs-slider" :class="{ 'is-off': stage === 4 }">
          <span v-html="tex(`n=${n}`)" />
          <input v-model.number="n" type="range" min="1" max="40" step="1" :disabled="stage === 4" aria-label="n">
        </label>

        <div class="rs-seg" role="radiogroup" aria-label="xi">
          <span class="rs-seg-name" v-html="tex('\\xi_i')" />
          <button
            v-for="rule in POINT_RULES"
            :key="rule.value"
            type="button"
            role="radio"
            class="rs-seg-btn"
            :class="{ 'is-on': pointRule === rule.value }"
            :aria-checked="pointRule === rule.value"
            @click="pointRule = rule.value"
          >{{ rule.label }}</button>
        </div>

        <button type="button" class="rs-icon" aria-label="Shuffle" title="Shuffle" @click="reroll">
          <svg viewBox="0 0 16 16" class="rs-stroke-icon">
            <path d="M13 8a5 5 0 1 1-1.5-3.6" />
            <path d="M13 2.5v3.2H9.8" />
          </svg>
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.rs {
  --rs-ink: #161820;
  --rs-soft: #4f525b;
  --rs-faint: #8a8c94;
  --rs-accent: #223056;
  --rs-warm: #b5763a;
  --rs-rule: #dfe0e5;
}

.rs-body {
  padding-top: 16px;
}

.rs-badge {
  display: inline-grid;
  place-items: center;
  padding: 5px 7px;
}

.rs-badge svg {
  width: 10px;
  height: 10px;
  fill: #fff;
}

.rs-error {
  margin: 0 0 10px;
  color: #8a3b48;
  font-family: "JetBrains Mono", monospace;
  font-size: 12px;
}

/* 步骤条 */
.rs-steps {
  position: relative;
  display: flex;
  justify-content: space-between;
  max-width: 420px;
  margin: 2px auto 8px;
}

.rs-track {
  position: absolute;
  top: 50%;
  right: 18px;
  left: 18px;
  height: 2px;
  background: #e4e5e9;
  transform: translateY(-50%);
}

.rs-track-fill {
  height: 100%;
  background: var(--rs-accent);
  transition: width 0.5s ease;
}

.rs-step {
  position: relative;
  display: grid;
  place-items: center;
  min-width: 38px;
  height: 38px;
  border: 1.5px solid #d4d6dd;
  border-radius: 19px;
  padding: 0 8px;
  color: var(--rs-faint);
  background: #fff;
  font-size: 13px;
  cursor: pointer;
  transition: color 0.3s, border-color 0.3s, background-color 0.3s, box-shadow 0.3s;
}

.rs-step.is-past {
  border-color: var(--rs-accent);
  color: var(--rs-accent);
}

.rs-step.is-on {
  border-color: var(--rs-accent);
  color: #fff;
  background: var(--rs-accent);
  box-shadow: 0 0 0 4px rgba(34, 48, 86, 0.12);
}

/* 主图 */
.rs-canvas {
  display: block;
  width: 100%;
  height: auto;
  overflow: visible;
}

.rs-grid line {
  stroke: #eeeff1;
  stroke-width: 1;
}

.rs-axis line {
  stroke: #8a8c94;
  stroke-width: 1;
}

.rs-axis-name {
  fill: var(--rs-soft);
  font: italic 14px "Times New Roman", "STIX Two Math", serif;
}

.rs-tick {
  fill: #9a9ca3;
  font: 9px "JetBrains Mono", Consolas, monospace;
}

.rs-region {
  animation: rs-fade 1.1s ease-out both;
  transition: opacity 0.6s;
}

.rs-region.is-dim {
  opacity: 0.45;
}

.rs-curve {
  fill: none;
  stroke: var(--rs-accent);
  stroke-width: 2.4;
  stroke-linecap: round;
  stroke-linejoin: round;
  stroke-dasharray: 2400;
  animation: rs-draw 1.5s ease-out both;
}

.rs-edge {
  stroke: var(--rs-accent);
  stroke-width: 1.1;
  stroke-dasharray: 3 3;
  stroke-opacity: 0.7;
}

.rs-rect {
  stroke: var(--rs-warm);
  stroke-width: 1;
  stroke-opacity: 0.8;
  transform-box: fill-box;
  transform-origin: 50% 100%;
  transition: opacity 0.35s;
}

.rs-rect.is-thin {
  stroke-width: 0.5;
}

.rs-rect.is-neg {
  transform-origin: 50% 0%;
}

.rs-rect.is-grow {
  animation: rs-grow 0.65s cubic-bezier(0.2, 0.8, 0.3, 1) both;
}

.rs-rects.is-fade {
  animation: rs-fade 0.5s ease-out both;
}

.rs-partition line {
  stroke: var(--rs-ink);
  stroke-width: 1;
  stroke-opacity: 0.4;
}

.rs-partition line.is-draw {
  stroke-dasharray: 400;
  animation: rs-draw-short 0.7s ease-out both;
}

.rs-tickdot {
  fill: var(--rs-ink);
}

.rs-xi line {
  stroke: var(--rs-warm);
  stroke-width: 1;
  stroke-dasharray: 2 3;
}

.rs-xi circle {
  fill: #fff;
  stroke: var(--rs-warm);
  stroke-width: 1.8;
}

.rs-labels text {
  fill: var(--rs-ink);
  font: italic 13px "Times New Roman", "STIX Two Math", serif;
}

.rs-labels .rs-sub {
  font-size: 9px;
  font-style: normal;
}

.rs-labels .rs-xi-label {
  fill: var(--rs-warm);
}

.rs-labels .rs-area-label {
  fill: var(--rs-accent);
  font-size: 22px;
  animation: rs-fade 1s 0.8s ease-out both;
}

.rs-labels .rs-curve-label {
  fill: var(--rs-accent);
  font-size: 14px;
}

/* 定义式与读数 */
.rs-foot {
  display: flex;
  flex-wrap: wrap;
  gap: 12px 24px;
  align-items: center;
  justify-content: space-between;
  margin-top: 6px;
  border-top: 1px solid #eceff0;
  padding-top: 8px;
}

.rs-formula-col {
  flex: 1 1 280px;
  min-width: 0;
}

.rs-formula {
  overflow-x: auto;
  color: var(--rs-ink);
  font-size: 17px;
}

.rs-formula :deep(.katex-display) {
  margin: 6px 0;
  text-align: left;
}

.rs-formula :deep(.katex-display > .katex) {
  text-align: left;
}

.rs-stats {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  min-height: 30px;
}

.rs-chip {
  border-radius: 999px;
  padding: 3px 10px;
  color: var(--rs-accent);
  background: #eeeff3;
  font-size: 13px;
  animation: rs-fade 0.4s ease-out both;
}

.rs-mini {
  flex: 0 0 260px;
  width: 260px;
  height: auto;
  overflow: visible;
}

.rs-mini-axis {
  stroke: #b9bbc2;
  stroke-width: 1;
}

.rs-mini-i {
  stroke: var(--rs-accent);
  stroke-width: 1.2;
  stroke-dasharray: 4 3;
}

.rs-mini-label {
  fill: var(--rs-accent);
  font: italic 13px "Times New Roman", serif;
}

.rs-mini-tick {
  fill: #9a9ca3;
  font: 9px "JetBrains Mono", Consolas, monospace;
}

.rs-mini-path {
  fill: none;
  stroke: var(--rs-warm);
  stroke-width: 1.4;
  stroke-opacity: 0.6;
}

.rs-mini-dot {
  fill: #fff;
  stroke: var(--rs-warm);
  stroke-width: 1.5;
  transition: r 0.3s;
}

.rs-mini-dot.is-last {
  fill: var(--rs-warm);
}

/* 控制 */
.rs-controls {
  display: flex;
  flex-wrap: wrap;
  gap: 10px 18px;
  align-items: center;
  margin-top: 14px;
}

.rs-icon {
  display: inline-grid;
  place-items: center;
  width: 36px;
  height: 36px;
  border: 1px solid #caced9;
  border-radius: 50%;
  padding: 0;
  color: var(--rs-accent);
  background: #fff;
  cursor: pointer;
  transition: background-color 0.2s, transform 0.2s;
}

.rs-icon:hover {
  background: #e9eaef;
}

.rs-icon:active {
  transform: scale(0.94);
}

.rs-icon svg {
  width: 13px;
  height: 13px;
  fill: currentColor;
}

.rs-icon .rs-stroke-icon {
  width: 15px;
  height: 15px;
  fill: none;
  stroke: currentColor;
  stroke-width: 1.6;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.rs-icon-main {
  border-color: var(--rs-accent);
  color: #fff;
  background: var(--rs-accent);
}

.rs-icon-main:hover {
  background: #152141;
}

.rs-slider {
  display: inline-flex;
  gap: 10px;
  align-items: center;
  color: var(--rs-ink);
  font-size: 14px;
  transition: opacity 0.3s;
}

.rs-slider span {
  min-width: 46px;
}

.rs-slider.is-off {
  opacity: 0.4;
}

.rs-slider input {
  width: 140px;
  accent-color: var(--rs-accent);
}

.rs-seg {
  display: inline-flex;
  align-items: center;
  border: 1px solid #d4d6dd;
  border-radius: 999px;
  padding: 3px;
  background: #f6f6f8;
}

.rs-seg-name {
  padding: 0 8px 0 6px;
  color: var(--rs-soft);
  font-size: 14px;
}

.rs-seg-btn {
  border: 0;
  border-radius: 999px;
  padding: 4px 10px;
  color: var(--rs-soft);
  background: transparent;
  font-family: "JetBrains Mono", Consolas, monospace;
  font-size: 11px;
  cursor: pointer;
  transition: color 0.2s, background-color 0.2s;
}

.rs-seg-btn.is-on {
  color: #fff;
  background: var(--rs-accent);
}

@keyframes rs-draw {
  from { stroke-dashoffset: 2400; }
  to { stroke-dashoffset: 0; }
}

@keyframes rs-draw-short {
  from { stroke-dashoffset: 400; }
  to { stroke-dashoffset: 0; }
}

@keyframes rs-grow {
  from { transform: scaleY(0); }
  to { transform: scaleY(1); }
}

@keyframes rs-fade {
  from { opacity: 0; }
  to { opacity: 1; }
}

@media (max-width: 560px) {
  .rs-mini {
    flex-basis: 100%;
    width: 100%;
  }
}

@media (prefers-reduced-motion: reduce) {
  .rs-region,
  .rs-curve,
  .rs-rect.is-grow,
  .rs-rects.is-fade,
  .rs-partition line.is-draw,
  .rs-chip,
  .rs-labels .rs-area-label {
    animation: none;
  }
}
</style>
