/**
 * 平面小插图的几何计算：采样区域和曲线，算出坐标框、刻度和 SVG 路径。
 * 输出纯数据，PlaneFigure.vue 只负责把它画成 SVG。
 */

import { niceTicks } from './niceTicks'

// 画布基准宽度取接近右栏实际宽度（约 200～250px），这样 SVG 里的字号基本就是屏幕像素，不会被缩小。
const VIEW_WIDTH = 224
const PAD = 14

function finitePoint(point) {
  return Array.isArray(point) && Number.isFinite(point[0]) && Number.isFinite(point[1])
}

function sampleFillBoundary(domain, steps = 72) {
  const points = []
  const push = (s, t) => {
    const point = domain.map(s, t)
    if (finitePoint(point)) points.push(point)
  }
  for (let i = 0; i <= steps; i += 1) push(i / steps, 0)
  for (let i = 1; i <= steps; i += 1) push(1, i / steps)
  for (let i = steps - 1; i >= 0; i -= 1) push(i / steps, 1)
  for (let i = steps - 1; i > 0; i -= 1) push(0, i / steps)
  return points
}

function sampleCurve(curve, range, steps = 240) {
  const [a, b] = range
  const runs = []
  let run = []
  for (let i = 0; i <= steps; i += 1) {
    const point = curve.point(a + ((b - a) * i) / steps)
    if (finitePoint(point)) {
      run.push(point)
    } else if (run.length) {
      runs.push(run)
      run = []
    }
  }
  if (run.length) runs.push(run)
  return runs.filter((part) => part.length > 1)
}

function extent(points) {
  const xs = points.map((p) => p[0])
  const ys = points.map((p) => p[1])
  return { x: [Math.min(...xs), Math.max(...xs)], y: [Math.min(...ys), Math.max(...ys)] }
}

function padRange([lo, hi], ratio) {
  const span = hi - lo || Math.max(Math.abs(lo), 1)
  return [lo - span * ratio, hi + span * ratio]
}

/** 让横纵单位长度一致，同时把画面宽高比限制在 [0.62, 1.2]。 */
function equalAspect(box) {
  let [x0, x1] = box.x
  let [y0, y1] = box.y
  const ratio = (y1 - y0) / (x1 - x0)
  const clamped = Math.min(1.2, Math.max(0.62, ratio))
  if (ratio < clamped) {
    const extra = ((x1 - x0) * clamped - (y1 - y0)) / 2
    y0 -= extra
    y1 += extra
  } else if (ratio > clamped) {
    const extra = ((y1 - y0) / clamped - (x1 - x0)) / 2
    x0 -= extra
    x1 += extra
  }
  return { x: [x0, x1], y: [y0, y1] }
}

export function buildPlaneScene(spec) {
  const fills = spec.fills.map((fill) => ({ ...fill, points: sampleFillBoundary(fill.domain) }))
  const fixedCurves = spec.curves.filter((curve) => curve.range)

  let box = spec.box
  if (!box) {
    const collected = [
      ...fills.flatMap((fill) => fill.points),
      ...fixedCurves.flatMap((curve) => sampleCurve(curve, curve.range, 80).flat()),
      ...spec.points.map((point) => point.at),
      [0, 0],
    ]
    const raw = collected.length > 1 ? extent(collected) : { x: [-1, 1], y: [-1, 1] }
    box = { x: padRange(raw.x, 0.14), y: padRange(raw.y, 0.14) }
    box = equalAspect(box)
  }

  const width = VIEW_WIDTH
  const height = Math.round(VIEW_WIDTH * Math.min(1.2, Math.max(0.62, (box.y[1] - box.y[0]) / (box.x[1] - box.x[0]))))
  const sx = (width - 2 * PAD) / (box.x[1] - box.x[0])
  const sy = (height - 2 * PAD) / (box.y[1] - box.y[0])
  const toX = (x) => PAD + (x - box.x[0]) * sx
  const toY = (y) => height - PAD - (y - box.y[0]) * sy
  const clampY = (y) => Math.max(box.y[0] - (box.y[1] - box.y[0]) * 4, Math.min(box.y[1] + (box.y[1] - box.y[0]) * 4, y))
  const clampX = (x) => Math.max(box.x[0] - (box.x[1] - box.x[0]) * 4, Math.min(box.x[1] + (box.x[1] - box.x[0]) * 4, x))
  const project = ([x, y]) => [toX(clampX(x)), toY(clampY(y))]
  const pathOf = (points, close = false) =>
    points
      .map((point, index) => {
        const [px, py] = project(point)
        return `${index ? 'L' : 'M'}${px.toFixed(2)} ${py.toFixed(2)}`
      })
      .join('') + (close ? 'Z' : '')

  const fillShapes = fills
    .filter((fill) => fill.points.length > 2)
    .map((fill) => {
      const c = centroid(fill.points)
      return {
        d: pathOf(fill.points, true),
        color: fill.color,
        opacity: fill.opacity,
        border: fill.border,
        label: fill.label,
        labelAt: project(c),
      }
    })

  const curveShapes = spec.curves.flatMap((curve) => {
    const range = curve.range || (curve.kind === 'graph-y' ? box.y : box.x)
    return sampleCurve(curve, range).map((run, index, all) => {
      const end = pickLabelPoint(run, box, curve.labelAt ?? 0.78)
      return {
        d: pathOf(run),
        color: curve.color,
        width: curve.width,
        dashed: curve.dashed,
        label: index === all.length - 1 ? curve.label : '',
        labelAt: end ? project(end) : null,
      }
    })
  })

  const pointShapes = spec.points.map((point) => ({ at: project(point.at), label: point.label }))

  const xTicks = spec.ticks ? niceTicks(box.x[0], box.x[1], 4).filter((v) => Math.abs(v) > 1e-9) : []
  const yTicks = spec.ticks ? niceTicks(box.y[0], box.y[1], 4).filter((v) => Math.abs(v) > 1e-9) : []
  const axisY = box.y[0] <= 0 && box.y[1] >= 0 ? toY(0) : height - PAD
  const axisX = box.x[0] <= 0 && box.x[1] >= 0 ? toX(0) : PAD

  return {
    width,
    height,
    pad: PAD,
    box,
    fills: fillShapes,
    curves: curveShapes,
    points: pointShapes,
    axes: spec.axes
      ? {
          y: axisY,
          x: axisX,
          originVisible: box.x[0] <= 0 && box.x[1] >= 0 && box.y[0] <= 0 && box.y[1] >= 0,
          xTicks: xTicks.map((value) => ({ value, pos: toX(value) })),
          yTicks: yTicks.map((value) => ({ value, pos: toY(value) })),
        }
      : null,
    grid: spec.grid
      ? {
          xs: niceTicks(box.x[0], box.x[1], 6).map(toX),
          ys: niceTicks(box.y[0], box.y[1], 6).map(toY),
        }
      : null,
    toWorld: (px, py) => [box.x[0] + (px - PAD) / sx, box.y[0] + (height - PAD - py) / sy],
  }
}

function centroid(points) {
  let area = 0
  let cx = 0
  let cy = 0
  for (let i = 0; i < points.length; i += 1) {
    const [x0, y0] = points[i]
    const [x1, y1] = points[(i + 1) % points.length]
    const cross = x0 * y1 - x1 * y0
    area += cross
    cx += (x0 + x1) * cross
    cy += (y0 + y1) * cross
  }
  if (Math.abs(area) < 1e-12) {
    const e = extent(points)
    return [(e.x[0] + e.x[1]) / 2, (e.y[0] + e.y[1]) / 2]
  }
  return [cx / (3 * area), cy / (3 * area)]
}

/** 曲线标注放在曲线「画框内可见部分」的 at 比例处，默认靠后但不贴着端点。 */
function pickLabelPoint(run, box, at) {
  const mx = (box.x[1] - box.x[0]) * 0.06
  const my = (box.y[1] - box.y[0]) * 0.06
  const inside = (p) => p[0] >= box.x[0] + mx && p[0] <= box.x[1] - mx && p[1] >= box.y[0] + my && p[1] <= box.y[1] - my
  const visible = run.filter(inside)
  if (!visible.length) return null
  return visible[Math.min(visible.length - 1, Math.round((visible.length - 1) * at))]
}

/** 小插图里的数字：去掉多余的 0，负号用真正的减号。 */
export function formatTick(value) {
  const rounded = Math.round(value * 1000) / 1000
  return String(rounded).replace('-', '−')
}

/** 标注里的 x^2、sqrt(x) 换成更像数学排版的字符。 */
export function prettyLabel(text) {
  const sup = { 0: '⁰', 1: '¹', 2: '²', 3: '³', 4: '⁴', 5: '⁵', 6: '⁶', 7: '⁷', 8: '⁸', 9: '⁹', n: 'ⁿ', '-': '⁻' }
  return String(text || '')
    .replace(/\^\(?(-?[0-9n])\)?/g, (_, p) => [...p].map((ch) => sup[ch] || ch).join(''))
    .replace(/sqrt\(([^()]*)\)/g, '√$1')
    .replace(/\bpi\b/g, 'π')
    .replace(/\btheta\b/g, 'θ')
    .replace(/\*/g, '')
}
