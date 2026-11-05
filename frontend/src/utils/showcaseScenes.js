/*
 * 数值分析第 1 章开头的“应用场景”演示：三块线稿风格的 Canvas 2D 动画，画面内不放文字。
 *   热场  二维热方程的有限差分解，画成网格节点加等温线；三个热源缓慢游走，指针所在处多一个热源。
 *   轨道  恒星引力下三颗行星的数值积分，轨迹画成一步一步的离散采样点；指针移入时时间放慢。
 *   曲线  过一组数据点的自然三次样条，相邻两段交替着色；数据点缓慢浮动，按住可拖动最近的点。
 * 配色与首页动画一致：米白底、墨色细线、一种墨蓝强调色。
 *
 * 每个场景是一个工厂函数，返回 reset(w, h) 和 frame(ctx, w, h, t, dt, ptr)；
 * mountShowcase() 负责画布缩放、统一的逐帧循环、指针事件，离开视口时停止绘制。
 */

const BG = '#fbfbfa'
const INK = '22, 24, 31'
const ACCENT = '34, 48, 86'
const TAU = Math.PI * 2

const ink = (a) => `rgba(${INK}, ${a})`
const accent = (a) => `rgba(${ACCENT}, ${a})`
const clamp01 = (v) => Math.max(0, Math.min(1, v))

function clear(ctx, w, h) {
  ctx.fillStyle = BG
  ctx.fillRect(0, 0, w, h)
}

/* ---------------- 热场：显式差分 + 等温线 ---------------- */

export const HEAT_NX = 44
export const HEAT_NY = 34
const HEAT_R = 0.22 // 显式格式 Δt/h² ≤ 1/4 才稳定，这里取 0.22
const HEAT_DECAY = 0.004 // 向环境散热，使场趋于动态平衡
const HEAT_RATE = 90 // 每秒推进的差分步数
const HEAT_LEVELS = [0.12, 0.24, 0.36, 0.48, 0.6, 0.72, 0.84]

export function createHeatField() {
  let u = new Float32Array(HEAT_NX * HEAT_NY)
  let v = new Float32Array(HEAT_NX * HEAT_NY)
  return {
    get values() {
      return u
    },
    // 在 (cx, cy)（单位正方形坐标）处注入高斯形热量。
    inject(cx, cy, s) {
      const gx = cx * (HEAT_NX - 1)
      const gy = cy * (HEAT_NY - 1)
      const r = 3
      for (let j = Math.max(1, Math.floor(gy - 3 * r)); j < Math.min(HEAT_NY - 1, gy + 3 * r); j += 1) {
        for (let i = Math.max(1, Math.floor(gx - 3 * r)); i < Math.min(HEAT_NX - 1, gx + 3 * r); i += 1) {
          const d2 = (i - gx) ** 2 + (j - gy) ** 2
          u[j * HEAT_NX + i] += s * Math.exp(-d2 / (2 * r * r))
        }
      }
    },
    step() {
      for (let j = 1; j < HEAT_NY - 1; j += 1) {
        for (let i = 1; i < HEAT_NX - 1; i += 1) {
          const k = j * HEAT_NX + i
          const lap = u[k - 1] + u[k + 1] + u[k - HEAT_NX] + u[k + HEAT_NX] - 4 * u[k]
          v[k] = (u[k] + HEAT_R * lap) * (1 - HEAT_DECAY)
        }
      }
      ;[u, v] = [v, u]
    },
  }
}

// 行进方格法：把一条等值线写进当前路径。鞍点格按固定配对处理，画面上看不出差别。
function contour(ctx, f, level, sx, sy) {
  const pts = []
  for (let j = 0; j < HEAT_NY - 1; j += 1) {
    for (let i = 0; i < HEAT_NX - 1; i += 1) {
      const a = f[j * HEAT_NX + i] - level
      const b = f[j * HEAT_NX + i + 1] - level
      const c = f[(j + 1) * HEAT_NX + i + 1] - level
      const d = f[(j + 1) * HEAT_NX + i] - level
      if ((a > 0) === (b > 0) && (b > 0) === (c > 0) && (c > 0) === (d > 0)) continue
      pts.length = 0
      if ((a > 0) !== (b > 0)) pts.push(i + a / (a - b), j)
      if ((b > 0) !== (c > 0)) pts.push(i + 1, j + b / (b - c))
      if ((c > 0) !== (d > 0)) pts.push(i + 1 - c / (c - d), j + 1)
      if ((d > 0) !== (a > 0)) pts.push(i, j + 1 - d / (d - a))
      for (let p = 0; p + 3 < pts.length; p += 4) {
        ctx.moveTo(pts[p] * sx, pts[p + 1] * sy)
        ctx.lineTo(pts[p + 2] * sx, pts[p + 3] * sy)
      }
    }
  }
}

export function createHeatScene() {
  const SOURCES = [
    { ax: 0.27, ay: 0.24, fx: 0.11, fy: 0.17, px: 0, py: 1.1, s: 0.05 },
    { ax: 0.26, ay: 0.26, fx: 0.13, fy: 0.09, px: 2.1, py: 0.3, s: 0.042 },
    { ax: 0.3, ay: 0.22, fx: 0.07, fy: 0.12, px: 4, py: 2.6, s: 0.036 },
  ]
  let field = createHeatField()
  let acc = 0
  let clock = 0
  let scale = 1

  const feed = (t, ptr, w, h) => {
    for (const s of SOURCES) {
      field.inject(0.5 + s.ax * Math.sin(s.fx * TAU * t + s.px), 0.5 + s.ay * Math.sin(s.fy * TAU * t + s.py), s.s)
    }
    if (ptr && ptr.k > 0.02) field.inject(ptr.sx / w, ptr.sy / h, 0.06 * ptr.k)
  }

  return {
    reset() {
      field = createHeatField()
      acc = 0
      clock = 0
      // 先在后台推进一段，进场时等温线已经成形。
      for (let k = 0; k < 600; k += 1) {
        feed(clock, null, 1, 1)
        field.step()
        clock += 1 / HEAT_RATE
      }
      scale = Math.max(...field.values) || 1
    },
    frame(ctx, w, h, t, dt, ptr) {
      acc += dt * HEAT_RATE
      while (acc >= 1) {
        acc -= 1
        clock += 1 / HEAT_RATE
        feed(clock, ptr, w, h)
        field.step()
      }
      let peak = 0
      for (const x of field.values) if (x > peak) peak = x
      // 等温线的数值随场的峰值平滑缩放，热源移动时线条不会突然出现或消失。
      scale += (Math.max(peak, 1e-6) - scale) * Math.min(1, dt * 1.5)

      clear(ctx, w, h)
      const sx = w / (HEAT_NX - 1)
      const sy = h / (HEAT_NY - 1)

      ctx.fillStyle = ink(0.13)
      for (let j = 2; j < HEAT_NY - 1; j += 2) {
        for (let i = 2; i < HEAT_NX - 1; i += 2) ctx.fillRect(i * sx - 0.6, j * sy - 0.6, 1.2, 1.2)
      }

      const f = field.values
      ctx.lineCap = 'round'
      HEAT_LEVELS.forEach((lv, k) => {
        const top = k >= HEAT_LEVELS.length - 2
        ctx.lineWidth = top ? 1.5 : 1
        ctx.strokeStyle = top ? accent(0.9) : ink(0.12 + 0.4 * (k / (HEAT_LEVELS.length - 1)))
        ctx.beginPath()
        contour(ctx, f, lv * scale, sx, sy)
        ctx.stroke()
      })
      ctx.lineCap = 'butt'
    },
  }
}

/* ---------------- 轨道：辛积分（蛙跳格式） ---------------- */

export const GM = 1
export const ORBITS = [
  { a: 0.34, e: 0.22, w: 0.6 },
  { a: 0.58, e: 0.42, w: 2.5 },
  { a: 0.86, e: 0.12, w: 4.3 },
]

// 近日点处的初始状态：位置在近日点，速度由活力公式给出，再整体转 w。
export function orbitStart({ a, e, w }) {
  const r = a * (1 - e)
  const v = Math.sqrt((GM * (1 + e)) / r)
  const c = Math.cos(w)
  const s = Math.sin(w)
  return { x: r * c, y: r * s, vx: -v * s, vy: v * c }
}

export function leapfrog(b, h) {
  let r3 = (b.x * b.x + b.y * b.y) ** 1.5
  b.vx -= (h / 2) * (GM * b.x) / r3
  b.vy -= (h / 2) * (GM * b.y) / r3
  b.x += h * b.vx
  b.y += h * b.vy
  r3 = (b.x * b.x + b.y * b.y) ** 1.5
  b.vx -= (h / 2) * (GM * b.x) / r3
  b.vy -= (h / 2) * (GM * b.y) / r3
}

export const energy = (b) => 0.5 * (b.vx * b.vx + b.vy * b.vy) - GM / Math.hypot(b.x, b.y)

export function createOrbitScene() {
  const H = 0.0015
  const RATE = 0.22 // 每秒推进的模拟时间
  const PER_ORBIT = 46 // 每圈记录的采样点数
  const KEEP = 40
  let bodies = []
  let acc = 0
  let slow = 1

  const advance = (simDt) => {
    acc += simDt
    while (acc >= H) {
      acc -= H
      for (const b of bodies) {
        leapfrog(b, H)
        b.since += H
        if (b.since >= b.every) {
          b.since -= b.every
          b.trail.push(b.x, b.y)
          if (b.trail.length > KEEP * 2) b.trail.splice(0, 2)
        }
      }
    }
  }

  return {
    reset() {
      acc = 0
      bodies = ORBITS.map((o) => {
        const b = orbitStart(o)
        const period = TAU * Math.sqrt(o.a ** 3 / GM)
        return { ...b, every: period / PER_ORBIT, since: 0, trail: [] }
      })
      advance(5.2)
    },
    frame(ctx, w, h, t, dt, ptr) {
      slow += ((ptr.inside ? 0.35 : 1) - slow) * Math.min(1, dt * 4)
      advance(dt * RATE * slow)

      clear(ctx, w, h)
      const cx = w / 2
      const cy = h / 2
      const u = Math.min(w, h) * 0.47
      const X = (x) => cx + x * u
      const Y = (y) => cy - y * u

      ctx.strokeStyle = ink(0.16)
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.arc(cx, cy, 9, 0, TAU)
      ctx.stroke()
      ctx.fillStyle = ink(0.85)
      ctx.beginPath()
      ctx.arc(cx, cy, 3.6, 0, TAU)
      ctx.fill()

      for (const b of bodies) {
        const n = b.trail.length / 2
        for (let i = 0; i < n; i += 1) {
          const age = (i + 1) / n
          ctx.fillStyle = ink(0.05 + 0.42 * age * age)
          ctx.beginPath()
          ctx.arc(X(b.trail[2 * i]), Y(b.trail[2 * i + 1]), 1.5, 0, TAU)
          ctx.fill()
        }
        // 最近几步连成折线：数值解就是这样一步一步走出来的。
        const from = Math.max(0, n - 5)
        ctx.strokeStyle = accent(0.75)
        ctx.lineWidth = 1.2
        ctx.beginPath()
        for (let i = from; i < n; i += 1) {
          const px = X(b.trail[2 * i])
          const py = Y(b.trail[2 * i + 1])
          if (i === from) ctx.moveTo(px, py)
          else ctx.lineTo(px, py)
        }
        if (n) ctx.lineTo(X(b.x), Y(b.y))
        ctx.stroke()
        ctx.fillStyle = accent(0.75)
        for (let i = from; i < n; i += 1) {
          ctx.beginPath()
          ctx.arc(X(b.trail[2 * i]), Y(b.trail[2 * i + 1]), 2, 0, TAU)
          ctx.fill()
        }
        ctx.fillStyle = accent(1)
        ctx.beginPath()
        ctx.arc(X(b.x), Y(b.y), 3.8, 0, TAU)
        ctx.fill()
      }
    },
  }
}

/* ---------------- 曲线：自然三次样条 ---------------- */

// 自然边界条件 M₀ = Mₙ = 0，追赶法解三对角方程组求各节点的二阶导数 M。
export function naturalSpline(xs, ys) {
  const n = xs.length - 1
  const hs = []
  for (let i = 0; i < n; i += 1) hs.push(xs[i + 1] - xs[i])
  const M = new Array(n + 1).fill(0)
  if (n >= 2) {
    const diag = []
    const rhs = []
    for (let i = 1; i < n; i += 1) {
      diag.push(2 * (hs[i - 1] + hs[i]))
      rhs.push(6 * ((ys[i + 1] - ys[i]) / hs[i] - (ys[i] - ys[i - 1]) / hs[i - 1]))
    }
    for (let k = 1; k < n - 1; k += 1) {
      const m = hs[k] / diag[k - 1]
      diag[k] -= m * hs[k]
      rhs[k] -= m * rhs[k - 1]
    }
    for (let k = n - 2; k >= 0; k -= 1) {
      M[k + 1] = (rhs[k] - (k < n - 2 ? hs[k + 1] * M[k + 2] : 0)) / diag[k]
    }
  }
  return (x) => {
    let i = 0
    while (i < n - 1 && x > xs[i + 1]) i += 1
    const h = hs[i]
    const a = xs[i + 1] - x
    const b = x - xs[i]
    return (
      (M[i] * a ** 3 + M[i + 1] * b ** 3) / (6 * h) +
      (ys[i] / h - (M[i] * h) / 6) * a +
      (ys[i + 1] / h - (M[i + 1] * h) / 6) * b
    )
  }
}

export function createSplineScene() {
  const N = 7
  const xs = Array.from({ length: N }, (_, i) => 0.08 + (0.84 * i) / (N - 1))
  const phase = [0.3, 1.9, 3.1, 0.9, 4.4, 2.6, 5.3]
  const freq = [0.21, 0.17, 0.24, 0.19, 0.15, 0.23, 0.18]
  const off = new Array(N).fill(0)
  let grab = -1
  let lastDown = false
  const auto = (i, t) => 0.5 + 0.2 * Math.sin(freq[i] * TAU * t + phase[i])

  return {
    reset() {
      off.fill(0)
      grab = -1
    },
    frame(ctx, w, h, t, dt, ptr) {
      const Y = (y) => (1 - y) * h
      const X = (x) => x * w
      const ys = xs.map((_, i) => auto(i, t) + off[i])

      // 按下时抓住附近的点，拖动只改它的高度；松手后偏移量缓慢回落到零。
      if (ptr.down && !lastDown && ptr.inside) {
        let best = 24
        grab = -1
        xs.forEach((x, i) => {
          const d = Math.hypot(X(x) - ptr.x, Y(ys[i]) - ptr.y)
          if (d < best) {
            best = d
            grab = i
          }
        })
      }
      if (!ptr.down) grab = -1
      lastDown = ptr.down
      for (let i = 0; i < N; i += 1) {
        if (i === grab) {
          const target = Math.min(0.9, Math.max(0.1, 1 - ptr.y / h))
          off[i] = target - auto(i, t)
          ys[i] = target
        } else {
          off[i] *= Math.exp(-dt * 0.9)
        }
      }

      const s = naturalSpline(xs, ys)
      clear(ctx, w, h)

      ctx.setLineDash([2, 5])
      ctx.strokeStyle = ink(0.12)
      ctx.lineWidth = 1
      ctx.beginPath()
      for (let i = 0; i < N; i += 1) {
        ctx.moveTo(X(xs[i]), Y(ys[i]) + 7)
        ctx.lineTo(X(xs[i]), h * 0.94)
      }
      ctx.stroke()
      ctx.setLineDash([])
      ctx.strokeStyle = ink(0.3)
      ctx.beginPath()
      ctx.moveTo(w * 0.04, h * 0.94)
      ctx.lineTo(w * 0.96, h * 0.94)
      ctx.stroke()

      // 每段是一个三次多项式，相邻两段交替用墨蓝和墨色，分段结构一眼可见。
      ctx.lineCap = 'round'
      ctx.lineWidth = 2
      for (let i = 0; i < N - 1; i += 1) {
        ctx.strokeStyle = i % 2 ? ink(0.5) : accent(0.95)
        ctx.beginPath()
        for (let k = 0; k <= 32; k += 1) {
          const x = xs[i] + ((xs[i + 1] - xs[i]) * k) / 32
          if (k) ctx.lineTo(X(x), Y(s(x)))
          else ctx.moveTo(X(x), Y(s(x)))
        }
        ctx.stroke()
      }
      ctx.lineCap = 'butt'

      let hover = -1
      if (ptr.inside && grab < 0) {
        xs.forEach((x, i) => {
          if (Math.hypot(X(x) - ptr.x, Y(ys[i]) - ptr.y) < 24) hover = i
        })
      }
      for (let i = 0; i < N; i += 1) {
        const on = i === grab || i === hover
        ctx.fillStyle = on ? accent(1) : BG
        ctx.strokeStyle = on ? accent(1) : ink(0.75)
        ctx.lineWidth = 1.4
        ctx.beginPath()
        ctx.arc(X(xs[i]), Y(ys[i]), on ? 5.5 : 4.2, 0, TAU)
        ctx.fill()
        ctx.stroke()
      }
    },
  }
}

export const SHOWCASE_SCENES = [createHeatScene, createOrbitScene, createSplineScene]

/* ---------------- 挂载 ---------------- */

export function mountShowcase(canvases, { container, reduceMotion = false } = {}) {
  const tiles = canvases.map((canvas, i) => ({
    canvas,
    ctx: canvas.getContext('2d'),
    scene: SHOWCASE_SCENES[i % SHOWCASE_SCENES.length](),
    ptr: { x: 0, y: 0, sx: 0, sy: 0, k: 0, inside: false, down: false },
    w: 0,
    h: 0,
  }))
  let t = 0
  let raf = 0
  let last = 0
  let smooth = 1 / 60
  let inView = true

  function resize(tile) {
    const rect = tile.canvas.getBoundingClientRect()
    if (!rect.width || !rect.height) return
    const dpr = Math.min(2, window.devicePixelRatio || 1)
    tile.w = rect.width
    tile.h = rect.height
    tile.canvas.width = Math.round(rect.width * dpr)
    tile.canvas.height = Math.round(rect.height * dpr)
    tile.ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    tile.scene.reset(tile.w, tile.h)
    if (reduceMotion) tile.scene.frame(tile.ctx, tile.w, tile.h, 0, 1 / 60, tile.ptr)
  }

  function loop(now) {
    raf = requestAnimationFrame(loop)
    const raw = last ? Math.min(0.05, (now - last) / 1000) : 1 / 60
    last = now
    smooth += (raw - smooth) * 0.2
    const dt = smooth
    t += dt
    for (const tile of tiles) {
      if (!tile.w) continue
      const p = tile.ptr
      const follow = Math.min(1, dt * 14)
      p.sx += (p.x - p.sx) * follow
      p.sy += (p.y - p.sy) * follow
      p.k += ((p.inside ? 1 : 0) - p.k) * Math.min(1, dt * 6)
      tile.scene.frame(tile.ctx, tile.w, tile.h, t, dt, p)
    }
  }

  function start() {
    if (reduceMotion || raf || !inView) return
    last = 0
    raf = requestAnimationFrame(loop)
  }

  function stop() {
    cancelAnimationFrame(raf)
    raf = 0
  }

  const cleanups = []
  for (const tile of tiles) {
    const { canvas, ptr } = tile
    const locate = (event) => {
      const rect = canvas.getBoundingClientRect()
      ptr.x = event.clientX - rect.left
      ptr.y = event.clientY - rect.top
      if (!ptr.inside) {
        ptr.sx = ptr.x
        ptr.sy = ptr.y
      }
      ptr.inside = true
    }
    const listeners = {
      pointermove: locate,
      pointerenter: locate,
      pointerdown(event) {
        locate(event)
        ptr.down = true
        canvas.setPointerCapture?.(event.pointerId)
      },
      pointerup() {
        ptr.down = false
      },
      pointerleave() {
        ptr.inside = false
        ptr.down = false
      },
      pointercancel() {
        ptr.inside = false
        ptr.down = false
      },
    }
    for (const [name, fn] of Object.entries(listeners)) canvas.addEventListener(name, fn)
    const ro = new ResizeObserver(() => resize(tile))
    ro.observe(canvas)
    resize(tile)
    cleanups.push(() => {
      for (const [name, fn] of Object.entries(listeners)) canvas.removeEventListener(name, fn)
      ro.disconnect()
    })
  }

  const io = new IntersectionObserver(
    ([entry]) => {
      inView = entry.isIntersecting
      if (inView) start()
      else stop()
    },
    { threshold: 0.05 },
  )
  io.observe(container || canvases[0])
  start()

  return {
    destroy() {
      stop()
      io.disconnect()
      for (const fn of cleanups) fn()
    },
  }
}
