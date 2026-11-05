/**
 * 空间小插图的软件渲染器（Canvas 2D，不依赖 WebGL / three.js）。
 *
 * 做法和 MATLAB 的 surf 类似：
 *   - 曲面按参数网格采样成四边形面片，按高度走站点色系的单色调色带（figureTheme.js），带网格线；
 *   - 正交投影，方位角 az / 仰角 el 控制视角；
 *   - 画家算法按深度从远到近画，半透明曲面也能看到后面的结构；
 *   - 背面三块坐标板带网格和刻度，像 MATLAB 的 box on。
 * 面片数控制在几千以内，小插图里每帧几毫秒。
 */

import { niceTicks } from './niceTicks'
import { formatTick } from './plane2d'
import { FIG, hexToRgb, rampColor } from './figureTheme'

const DEFAULT_CURVE = hexToRgb(FIG.accentStrong)

/** 把解析好的 spec 采样成世界坐标里的网格和折线，只做一次。 */
export function buildSpaceScene(spec) {
  const surfaces = spec.surfaces.map((surface) => {
    const n = surface.grid
    const rows = []
    for (let j = 0; j <= n; j += 1) {
      const row = []
      for (let i = 0; i <= n; i += 1) {
        const p = surface.point(i / n, j / n)
        row.push(p && p.every(Number.isFinite) ? p : null)
      }
      rows.push(row)
    }
    return { ...surface, n, rows, rgb: hexToRgb(surface.color) }
  })

  const curves = spec.curves.map((curve) => {
    const steps = 160
    const pts = []
    for (let i = 0; i <= steps; i += 1) {
      const t = curve.range[0] + ((curve.range[1] - curve.range[0]) * i) / steps
      const p = curve.point(t)
      pts.push(p && p.every(Number.isFinite) ? p : null)
    }
    return { ...curve, pts, rgb: hexToRgb(curve.color) || DEFAULT_CURVE }
  })

  let box = spec.box
  if (!box) {
    const all = [
      ...surfaces.flatMap((s) => s.rows.flat()),
      ...curves.flatMap((c) => c.pts),
      ...spec.points.map((p) => p.at),
    ].filter(Boolean)
    if (!all.length) {
      box = [[-1, 1], [-1, 1], [-1, 1]]
    } else {
      box = [0, 1, 2].map((k) => {
        let lo = Math.min(...all.map((p) => p[k]))
        let hi = Math.max(...all.map((p) => p[k]))
        if (hi - lo < 1e-9) {
          lo -= 0.5
          hi += 0.5
        }
        return [lo, hi]
      })
    }
  }

  // 每个轴映射到 [-L, L]。等比例为主，但最短轴不小于最长轴的 0.45，避免压成薄片。
  const spans = box.map(([lo, hi]) => hi - lo)
  const maxSpan = Math.max(...spans)
  const half = spans.map((span) => Math.max(0.45, span / maxSpan))
  const toUnit = (p) => p.map((v, k) => ((v - box[k][0]) / spans[k] * 2 - 1) * half[k])

  return {
    box,
    half,
    toUnit,
    surfaces,
    curves,
    points: spec.points,
    labels: spec.labels,
    axes: spec.axes,
    ticks: spec.ticks,
    zRange: box[2],
  }
}

function makeCamera(az, el) {
  const a = (az * Math.PI) / 180
  const e = (el * Math.PI) / 180
  const ca = Math.cos(a)
  const sa = Math.sin(a)
  const ce = Math.cos(e)
  const se = Math.sin(e)
  // 先绕 z 轴转 az，再抬高 el。返回 [屏幕右, 屏幕上, 深度(越大越远)]。
  return ([x, y, z]) => {
    const xr = x * ca - y * sa
    const yr = x * sa + y * ca
    return [xr, z * ce + yr * se, yr * ce - z * se]
  }
}

// 光源方向（相机坐标，指向光源）：左上前方。
const LIGHT = (() => {
  const v = [-0.45, 0.6, -0.66]
  const n = Math.hypot(...v)
  return v.map((c) => c / n)
})()

function shade(rgb, normal, opacity) {
  const n = Math.hypot(...normal) || 1
  const lambert = Math.abs((normal[0] * LIGHT[0] + normal[1] * LIGHT[1] + normal[2] * LIGHT[2]) / n)
  // 光照对比收敛一些，和平面图的平涂填充更接近。
  const k = 0.78 + 0.3 * lambert
  const [r, g, b] = rgb.map((c) => Math.min(255, Math.round(c * k)))
  return `rgba(${r},${g},${b},${opacity})`
}

/**
 * 画一帧。width / height 是 CSS 像素，ctx 已经按 devicePixelRatio 缩放。
 */
export function renderSpace(ctx, scene, view, width, height) {
  const cam = makeCamera(view.az, view.el)
  const radius = Math.hypot(...scene.half)
  const margin = scene.axes ? 22 : 8
  const scale = ((Math.min(width, height) / 2 - margin) / radius) * 1.06
  const cx = width / 2
  const cy = height / 2 + (scene.axes ? 4 : 0)
  const toScreen = (c) => [cx + c[0] * scale, cy - c[1] * scale]

  ctx.clearRect(0, 0, width, height)
  ctx.lineJoin = 'round'
  ctx.lineCap = 'round'

  if (scene.axes) drawBox(ctx, scene, cam, toScreen)

  const prims = []

  scene.surfaces.forEach((surface) => {
    const { rows, n } = surface
    const cams = rows.map((row) => row.map((p) => (p ? cam(scene.toUnit(p)) : null)))
    const zLo = scene.zRange[0]
    const zSpan = scene.zRange[1] - scene.zRange[0] || 1
    for (let j = 0; j < n; j += 1) {
      for (let i = 0; i < n; i += 1) {
        const quad = [cams[j][i], cams[j][i + 1], cams[j + 1][i + 1], cams[j + 1][i]]
        if (quad.some((q) => !q)) continue
        const world = [rows[j][i], rows[j][i + 1], rows[j + 1][i + 1], rows[j + 1][i]]
        const depth = (quad[0][2] + quad[1][2] + quad[2][2] + quad[3][2]) / 4
        // 对角线叉乘得法向（相机坐标）。
        const d1 = [quad[2][0] - quad[0][0], quad[2][1] - quad[0][1], quad[2][2] - quad[0][2]]
        const d2 = [quad[3][0] - quad[1][0], quad[3][1] - quad[1][1], quad[3][2] - quad[1][2]]
        const normal = [d1[1] * d2[2] - d1[2] * d2[1], d1[2] * d2[0] - d1[0] * d2[2], d1[0] * d2[1] - d1[1] * d2[0]]
        const zMean = (world[0][2] + world[1][2] + world[2][2] + world[3][2]) / 4
        const base = surface.rgb || rampColor((zMean - zLo) / zSpan)
        prims.push({
          kind: 'quad',
          depth,
          pts: quad.map(toScreen),
          fill: shade(base, normal, surface.opacity),
          mesh: surface.mesh,
          opacity: surface.opacity,
        })
      }
    }
  })

  scene.curves.forEach((curve) => {
    const color = `rgb(${curve.rgb.join(',')})`
    for (let i = 0; i < curve.pts.length - 1; i += 1) {
      const a = curve.pts[i]
      const b = curve.pts[i + 1]
      if (!a || !b) continue
      const ca = cam(scene.toUnit(a))
      const cb = cam(scene.toUnit(b))
      // 曲线往相机方向略微提前，避免和它所在的曲面抢深度而被遮住一半。
      prims.push({
        kind: 'seg',
        depth: (ca[2] + cb[2]) / 2 - 0.02,
        pts: [toScreen(ca), toScreen(cb)],
        color,
        width: curve.width,
        dashed: curve.dashed,
      })
    }
  })

  scene.points.forEach((point) => {
    const c = cam(scene.toUnit(point.at))
    prims.push({ kind: 'dot', depth: c[2] - 0.03, at: toScreen(c), label: point.label })
  })

  prims.sort((p, q) => q.depth - p.depth)

  prims.forEach((prim) => {
    if (prim.kind === 'quad') {
      const [a, b, c, d] = prim.pts
      ctx.beginPath()
      ctx.moveTo(a[0], a[1])
      ctx.lineTo(b[0], b[1])
      ctx.lineTo(c[0], c[1])
      ctx.lineTo(d[0], d[1])
      ctx.closePath()
      ctx.fillStyle = prim.fill
      ctx.fill()
      if (prim.mesh) {
        ctx.strokeStyle = `rgba(22, 24, 32,${FIG.meshAlpha * prim.opacity})`
        ctx.lineWidth = 0.5
        ctx.stroke()
      } else if (prim.opacity >= 0.99) {
        // 不画网格时用同色描边盖住相邻面片之间的抗锯齿缝。
        ctx.strokeStyle = prim.fill
        ctx.lineWidth = 0.6
        ctx.stroke()
      }
    } else if (prim.kind === 'seg') {
      ctx.beginPath()
      ctx.moveTo(prim.pts[0][0], prim.pts[0][1])
      ctx.lineTo(prim.pts[1][0], prim.pts[1][1])
      ctx.strokeStyle = prim.color
      ctx.lineWidth = prim.width
      ctx.setLineDash(prim.dashed ? [4, 3] : [])
      ctx.stroke()
      ctx.setLineDash([])
    } else {
      ctx.beginPath()
      ctx.arc(prim.at[0], prim.at[1], 2.6, 0, Math.PI * 2)
      ctx.fillStyle = FIG.ink
      ctx.fill()
      if (prim.label) {
        ctx.font = FIG.labelFont
        ctx.fillStyle = FIG.ink
        ctx.textAlign = 'left'
        ctx.textBaseline = 'bottom'
        ctx.fillText(prim.label, prim.at[0] + 4, prim.at[1] - 2)
      }
    }
  })
}

/** 背面三块坐标板 + 刻度 + 轴名。 */
function drawBox(ctx, scene, cam, toScreen) {
  const [hx, hy, hz] = scene.half
  const corner = (sx, sy, sz) => [sx * hx, sy * hy, sz * hz]
  const project = (p) => toScreen(cam(p))
  const depthOf = (p) => cam(p)[2]

  // 六个面：轴 k 取 ±1。面中心比盒心更远就是背面。
  const faces = []
  ;[0, 1, 2].forEach((k) => {
    ;[-1, 1].forEach((sign) => {
      const center = [0, 0, 0]
      center[k] = sign * scene.half[k]
      if (depthOf(center) > 1e-6) faces.push({ k, sign })
    })
  })

  const unitOf = (k, value) => ((value - scene.box[k][0]) / (scene.box[k][1] - scene.box[k][0]) * 2 - 1) * scene.half[k]
  const ticks = [0, 1, 2].map((k) => (scene.ticks ? niceTicks(scene.box[k][0], scene.box[k][1], k === 2 ? 3 : 2) : []))

  faces.forEach(({ k, sign }) => {
    const [u, v] = [0, 1, 2].filter((axis) => axis !== k)
    const at = (a, b) => {
      const p = [0, 0, 0]
      p[k] = sign * scene.half[k]
      p[u] = a
      p[v] = b
      return project(p)
    }
    const hu = scene.half[u]
    const hv = scene.half[v]
    const quad = [at(-hu, -hv), at(hu, -hv), at(hu, hv), at(-hu, hv)]
    ctx.beginPath()
    quad.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)))
    ctx.closePath()
    ctx.fillStyle = FIG.pane
    ctx.fill()
    ctx.strokeStyle = FIG.rule
    ctx.lineWidth = 0.8
    ctx.stroke()

    ctx.strokeStyle = FIG.ruleSoft
    ctx.lineWidth = 0.6
    ticks[u].forEach((value) => {
      const a = unitOf(u, value)
      const p0 = at(a, -hv)
      const p1 = at(a, hv)
      ctx.beginPath()
      ctx.moveTo(p0[0], p0[1])
      ctx.lineTo(p1[0], p1[1])
      ctx.stroke()
    })
    ticks[v].forEach((value) => {
      const b = unitOf(v, value)
      const p0 = at(-hu, b)
      const p1 = at(hu, b)
      ctx.beginPath()
      ctx.moveTo(p0[0], p0[1])
      ctx.lineTo(p1[0], p1[1])
      ctx.stroke()
    })
  })

  // 刻度标在离相机最近的底边（x、y）和屏幕最左侧的竖边（z）上。
  const center2d = project([0, 0, 0])
  ctx.fillStyle = FIG.muted
  ctx.font = FIG.tickFont

  const edgeFor = (k) => {
    if (k === 2) {
      const options = [
        [-1, -1],
        [1, -1],
        [1, 1],
        [-1, 1],
      ].map(([sx, sy]) => ({ sx, sy, x: project(corner(sx, sy, 0))[0] }))
      options.sort((p, q) => p.x - q.x)
      const pick = options[0]
      return (value) => [pick.sx * hx, pick.sy * hy, value]
    }
    const other = k === 0 ? 1 : 0
    const choices = [-1, 1].map((sign) => {
      const p = [0, 0, -hz]
      p[other] = sign * scene.half[other]
      return { sign, depth: depthOf(p) }
    })
    choices.sort((p, q) => p.depth - q.depth)
    const sign = choices[0].sign
    return (value) => {
      const p = [0, 0, -hz]
      p[other] = sign * scene.half[other]
      p[k] = value
      return p
    }
  }

  ;[0, 1, 2].forEach((k) => {
    const edge = edgeFor(k)
    const mid = project(edge(0))
    let ox = mid[0] - center2d[0]
    let oy = mid[1] - center2d[1]
    if (k === 2) {
      ox = -1
      oy = 0
    }
    const len = Math.hypot(ox, oy) || 1
    ox /= len
    oy /= len
    ctx.textAlign = ox < -0.35 ? 'right' : ox > 0.35 ? 'left' : 'center'
    ctx.textBaseline = oy > 0.35 ? 'top' : oy < -0.35 ? 'bottom' : 'middle'
    const edgeMid = project(edge(0))
    ticks[k].forEach((value) => {
      const u = unitOf(k, value)
      let [x, y] = project(edge(u))
      // 两条底边在角上相遇，端点刻度往边的中间挪一点，免得两个数字挤在一起。
      if (k !== 2 && Math.abs(Math.abs(u) - scene.half[k]) < 1e-6) {
        const dx = edgeMid[0] - x
        const dy = edgeMid[1] - y
        const d = Math.hypot(dx, dy) || 1
        x += (dx / d) * 7
        y += (dy / d) * 7
      }
      ctx.fillText(formatTick(value), x + ox * 5, y + oy * 5)
    })
    const label = scene.labels[k]
    if (label) {
      const end = project(edge(k === 2 ? scene.half[2] * 0.15 : 0))
      ctx.save()
      ctx.font = FIG.axisFont
      ctx.fillStyle = FIG.ink
      ctx.fillText(label, end[0] + ox * 19, end[1] + oy * 17)
      ctx.restore()
    }
  })
}
