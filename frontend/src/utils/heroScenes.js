/*
 * 首页首屏的数学动画。
 *
 * 纯 Canvas 2D 绘制，不引入第三方库。每个场景是一个工厂函数，返回
 *   reset(w, h)                 画布尺寸变化或切入场景时调用
 *   frame(ctx, w, h, t, dt, ptr)
 *                               每帧调用；t 为进入场景后的秒数，dt 为本帧时长；
 *                               ptr 为指针状态（见 createPointer），可返回一行读数文字
 *
 * mountTile() 把一个场景固定挂在一块画布上：负责画布缩放、逐帧循环、按 loop 循环重播，
 * speed 为播放倍速（场景时间 = 真实时间 × speed），
 * 离开视口或系统开启“减少动态效果”时停止逐帧绘制。
 */

const BG = '#fbfbfa'
const INK = '22, 24, 31'
const ACCENT = '34, 48, 86'
const WARM = '181, 118, 58'
const TAU = Math.PI * 2

const ink = (a) => `rgba(${INK}, ${a})`
const accent = (a) => `rgba(${ACCENT}, ${a})`
const warm = (a) => `rgba(${WARM}, ${a})`
const lerp = (a, b, k) => a + (b - a) * k
const clamp01 = (v) => Math.max(0, Math.min(1, v))
const easeInOut = (v) => (v < 0.5 ? 4 * v * v * v : 1 - (-2 * v + 2) ** 3 / 2)

function clear(ctx, w, h) {
  ctx.fillStyle = BG
  ctx.fillRect(0, 0, w, h)
}

function gauss() {
  let u = 0
  let v = 0
  while (u === 0) u = Math.random()
  while (v === 0) v = Math.random()
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(TAU * v)
}

function arrow(ctx, x0, y0, x1, y1, head = 7) {
  const a = Math.atan2(y1 - y0, x1 - x0)
  ctx.beginPath()
  ctx.moveTo(x0, y0)
  ctx.lineTo(x1, y1)
  ctx.stroke()
  ctx.beginPath()
  ctx.moveTo(x1, y1)
  ctx.lineTo(x1 - head * Math.cos(a - 0.38), y1 - head * Math.sin(a - 0.38))
  ctx.lineTo(x1 - head * Math.cos(a + 0.38), y1 - head * Math.sin(a + 0.38))
  ctx.closePath()
  ctx.fill()
}

/* ---------- 01 线性变换：网格、单位圆的像与两条主轴 ----------
 * 交互：指针拖着 e₁ 的像走，e₂ 的像保持自动演化，读数给出行列式。 */
function linearMap() {
  return {
    reset() {},
    frame(ctx, w, h, t, dt, ptr) {
      clear(ctx, w, h)
      const cx = w / 2
      const cy = h / 2
      const u = Math.min(w, h) / 6.4
      const k = ptr.k
      const e = Math.max(easeInOut(clamp01((t - 0.3) / 2.2)), k)

      // 目标矩阵用 SVD 形式 R(a1)·diag(s1, s2)·R(a2) 随时间缓慢变化，保证始终非退化。
      const a1 = 0.55 + 0.45 * Math.sin(0.42 * t)
      const a2 = -0.35 + 0.5 * Math.sin(0.31 * t + 1.2)
      const s1 = 1.38 + 0.2 * Math.sin(0.47 * t + 0.4)
      const s2 = 0.68 + 0.14 * Math.sin(0.36 * t + 2.1)
      const c1 = Math.cos(a1)
      const n1 = Math.sin(a1)
      const c2 = Math.cos(a2)
      const n2 = Math.sin(a2)
      let A00 = c1 * s1 * c2 - n1 * s2 * n2
      const A01 = -c1 * s1 * n2 - n1 * s2 * c2
      let A10 = n1 * s1 * c2 + c1 * s2 * n2
      const A11 = -n1 * s1 * n2 + c1 * s2 * c2
      if (k > 0.001) {
        A00 = lerp(A00, (ptr.sx - cx) / u, k)
        A10 = lerp(A10, (cy - ptr.sy) / u, k)
      }
      const m00 = 1 + (A00 - 1) * e
      const m01 = A01 * e
      const m10 = A10 * e
      const m11 = 1 + (A11 - 1) * e
      const P = (x, y) => [cx + u * (m00 * x + m01 * y), cy - u * (m10 * x + m11 * y)]

      ctx.lineWidth = 1
      ctx.strokeStyle = ink(0.06)
      ctx.beginPath()
      const K = Math.ceil(Math.max(w, h) / u / 2) + 1
      for (let k = -K; k <= K; k += 1) {
        ctx.moveTo(cx + k * u, 0)
        ctx.lineTo(cx + k * u, h)
        ctx.moveTo(0, cy + k * u)
        ctx.lineTo(w, cy + k * u)
      }
      ctx.stroke()

      const G = 12
      ctx.strokeStyle = ink(0.2)
      ctx.beginPath()
      for (let k = -G; k <= G; k += 1) {
        if (k === 0) continue
        let [x0, y0] = P(k, -G)
        let [x1, y1] = P(k, G)
        ctx.moveTo(x0, y0)
        ctx.lineTo(x1, y1)
        ;[x0, y0] = P(-G, k)
        ;[x1, y1] = P(G, k)
        ctx.moveTo(x0, y0)
        ctx.lineTo(x1, y1)
      }
      ctx.stroke()

      ctx.strokeStyle = ink(0.42)
      ctx.beginPath()
      ctx.moveTo(...P(-G, 0))
      ctx.lineTo(...P(G, 0))
      ctx.moveTo(...P(0, -G))
      ctx.lineTo(...P(0, G))
      ctx.stroke()

      ctx.setLineDash([3, 4])
      ctx.strokeStyle = ink(0.28)
      ctx.beginPath()
      ctx.arc(cx, cy, u, 0, TAU)
      ctx.stroke()
      ctx.setLineDash([])

      ctx.beginPath()
      for (let i = 0; i <= 120; i += 1) {
        const th = (TAU * i) / 120
        const [x, y] = P(Math.cos(th), Math.sin(th))
        if (i) ctx.lineTo(x, y)
        else ctx.moveTo(x, y)
      }
      const det = m00 * m11 - m01 * m10
      // 行列式变号（定向翻转）时，单位圆的像换成暖色。
      ctx.fillStyle = det >= 0 ? accent(0.07) : warm(0.12)
      ctx.fill()
      ctx.strokeStyle = det >= 0 ? accent(0.95) : warm(0.95)
      ctx.lineWidth = 1.6
      ctx.stroke()

      // 椭圆主轴 = M 作用在 MᵀM 特征向量上的像。
      const a = m00 * m00 + m10 * m10
      const b = m00 * m01 + m10 * m11
      const c = m01 * m01 + m11 * m11
      const th = 0.5 * Math.atan2(2 * b, a - c)
      ctx.lineWidth = 1
      ctx.setLineDash([5, 4])
      ctx.strokeStyle = accent(0.55)
      ctx.beginPath()
      for (const [vx, vy] of [
        [Math.cos(th), Math.sin(th)],
        [-Math.sin(th), Math.cos(th)],
      ]) {
        ctx.moveTo(...P(-vx, -vy))
        ctx.lineTo(...P(vx, vy))
      }
      ctx.stroke()
      ctx.setLineDash([])

      ctx.lineWidth = 1.8
      ctx.strokeStyle = ink(0.88)
      ctx.fillStyle = ink(0.88)
      arrow(ctx, cx, cy, ...P(1, 0))
      arrow(ctx, cx, cy, ...P(0, 1))

      ctx.fillStyle = ink(0.9)
      ctx.beginPath()
      ctx.arc(cx, cy, 2.5, 0, TAU)
      ctx.fill()

      if (k > 0.01) {
        const [hx, hy] = P(1, 0)
        ctx.strokeStyle = accent(0.8 * k)
        ctx.lineWidth = 1.2
        ctx.beginPath()
        ctx.arc(hx, hy, 5 + 4 * k, 0, TAU)
        ctx.stroke()
      }
      return `det A = ${det.toFixed(2)}`
    },
  }
}

/* ---------- 02 傅里叶级数：本轮叠加画出方波 ----------
 * 交互：指针横向位置决定叠加的项数（1–24 项），吉布斯现象随之显现。 */
function fourier() {
  const TERMS = 8
  let samples = []
  return {
    reset() {
      samples = []
    },
    frame(ctx, w, h, t, dt, ptr) {
      const terms =
        ptr.k > 0.5 ? 1 + Math.round(clamp01((ptr.sx - w * 0.05) / (w * 0.9)) * 23) : TERMS
      clear(ctx, w, h)
      const R = Math.min(h * 0.2, w * 0.13)
      const cx = w * 0.23
      const cy = h / 2
      const x0 = cx + R * 1.75
      const x1 = w - Math.max(24, w * 0.05)
      const phi = t * 1.05

      ctx.lineWidth = 1
      ctx.strokeStyle = ink(0.12)
      ctx.beginPath()
      ctx.moveTo(x0, cy)
      ctx.lineTo(x1, cy)
      ctx.moveTo(x0, cy - R * 1.45)
      ctx.lineTo(x0, cy + R * 1.45)
      ctx.stroke()
      ctx.setLineDash([2, 5])
      ctx.strokeStyle = ink(0.14)
      ctx.beginPath()
      ctx.moveTo(x0, cy - R)
      ctx.lineTo(x1, cy - R)
      ctx.moveTo(x0, cy + R)
      ctx.lineTo(x1, cy + R)
      ctx.stroke()
      ctx.setLineDash([])

      let x = cx
      let y = cy
      for (let k = 0; k < terms; k += 1) {
        const n = 2 * k + 1
        const r = (R * 4) / (Math.PI * n)
        ctx.strokeStyle = ink(k === 0 ? 0.2 : 0.13)
        ctx.beginPath()
        ctx.arc(x, y, r, 0, TAU)
        ctx.stroke()
        const nx = x + r * Math.cos(n * phi)
        const ny = y - r * Math.sin(n * phi)
        ctx.strokeStyle = ink(0.6)
        ctx.beginPath()
        ctx.moveTo(x, y)
        ctx.lineTo(nx, ny)
        ctx.stroke()
        x = nx
        y = ny
      }

      ctx.setLineDash([3, 4])
      ctx.strokeStyle = ink(0.32)
      ctx.beginPath()
      ctx.moveTo(x, y)
      ctx.lineTo(x0, y)
      ctx.stroke()
      ctx.setLineDash([])

      samples.push(phi, y - cy)
      const pxPerRad = (x1 - x0) / (TAU * 1.2)
      let cut = 0
      while (cut < samples.length && (phi - samples[cut]) * pxPerRad > x1 - x0) cut += 2
      if (cut) samples = samples.slice(cut)

      ctx.strokeStyle = accent(0.95)
      ctx.lineWidth = 1.6
      ctx.beginPath()
      for (let i = samples.length - 2; i >= 0; i -= 2) {
        const px = x0 + (phi - samples[i]) * pxPerRad
        const py = cy + samples[i + 1]
        if (i === samples.length - 2) ctx.moveTo(px, py)
        else ctx.lineTo(px, py)
      }
      ctx.stroke()

      ctx.fillStyle = accent(1)
      for (const [px, py] of [
        [x, y],
        [x0, y],
      ]) {
        ctx.beginPath()
        ctx.arc(px, py, 2.6, 0, TAU)
        ctx.fill()
      }
      return `N = ${terms}`
    },
  }
}

/* ---------- 03 定积分的定义：黎曼和 Σ f(ξᵢ)Δx 随分割加细逼近曲线下面积 ----------
 * 分割数 n 从 2 起逐级加倍，每个小区间里的取点 ξᵢ 来回滑动，矩形随之起伏，
 * 但 n 越大，不管 ξᵢ 取在哪，和都越贴近积分值。
 * 交互：指针左右定 n（1 到 120），上下定 ξᵢ 在小区间里的位置（下为左端点、上为右端点）。 */
function riemann() {
  const f = (x) => 0.46 + 0.26 * Math.sin(TAU * 0.85 * x + 0.5) + 0.1 * Math.sin(TAU * 2.2 * x + 1.3)
  const STEP = 1.8 // 自动播放时每隔多少场景秒分割数翻倍
  const MAXN = 128
  let exact = 0
  {
    const M = 600
    for (let k = 0; k <= M; k += 1) {
      const wgt = k === 0 || k === M ? 1 : k % 2 ? 4 : 2
      exact += wgt * f(k / M)
    }
    exact /= 3 * M
  }
  return {
    reset() {},
    frame(ctx, w, h, t, dt, ptr) {
      clear(ctx, w, h)
      const x0 = w * 0.08
      const x1 = w * 0.92
      const base = h * 0.8
      const H = h * 0.68
      const sx = (x) => x0 + (x1 - x0) * x
      const sy = (y) => base - H * y
      const tag = lerp(0.5 + 0.45 * Math.sin(0.9 * t), clamp01((base - ptr.sy) / H), ptr.k)

      // 自动播放：每级停留 STEP 秒，最后 30% 的时间里 n 与 2n 两层矩形交叉淡入淡出。
      let nA
      let nB
      let q = 0
      if (ptr.k > 0.5) {
        nA = 1 + Math.round(clamp01((ptr.sx - x0) / (x1 - x0)) * 119)
        nB = nA
      } else {
        const stage = 1 + t / STEP
        nA = Math.min(MAXN, 2 ** Math.floor(stage))
        nB = Math.min(MAXN, nA * 2)
        if (nB !== nA) {
          const u = clamp01((stage - Math.floor(stage) - 0.7) / 0.3)
          q = u * u * (3 - 2 * u)
        }
      }

      const layer = (n, k) => {
        if (k < 0.01) return 0
        const dx = 1 / n
        let sum = 0
        ctx.beginPath()
        for (let i = 0; i < n; i += 1) {
          const y = f((i + tag) * dx)
          sum += y * dx
          ctx.rect(sx(i * dx), sy(y), sx(dx) - x0, base - sy(y))
        }
        ctx.fillStyle = ink(0.07 * k)
        ctx.fill()
        const edge = 0.3 * clamp01(1 - (n - 24) / 72) * k
        if (edge > 0.01) {
          ctx.lineWidth = 1
          ctx.strokeStyle = ink(edge)
          ctx.stroke()
        }
        return sum
      }
      // 取点 ξᵢ：分割较粗时画出落点和到横轴的虚线，分割变细后渐隐。
      const tags = (n, k) => {
        const dotK = clamp01(1 - (n - 12) / 24) * k
        if (dotK < 0.01) return 0
        const dx = 1 / n
        ctx.setLineDash([2, 4])
        ctx.lineWidth = 1
        ctx.strokeStyle = ink(0.22 * dotK)
        ctx.beginPath()
        for (let i = 0; i < n; i += 1) {
          const xi = (i + tag) * dx
          ctx.moveTo(sx(xi), base)
          ctx.lineTo(sx(xi), sy(f(xi)))
        }
        ctx.stroke()
        ctx.setLineDash([])
        return dotK
      }
      const dots = (n, k) => {
        if (k < 0.01) return
        const dx = 1 / n
        ctx.fillStyle = accent(k)
        for (let i = 0; i < n; i += 1) {
          const xi = (i + tag) * dx
          ctx.beginPath()
          ctx.arc(sx(xi), sy(f(xi)), 2.6, 0, TAU)
          ctx.fill()
        }
      }

      const sumA = layer(nA, 1 - q)
      const sumB = nB !== nA ? layer(nB, q) : sumA
      const kA = tags(nA, 1 - q)
      const kB = nB !== nA ? tags(nB, q) : 0

      ctx.lineWidth = 1
      ctx.strokeStyle = ink(0.4)
      ctx.beginPath()
      ctx.moveTo(x0 - w * 0.03, base)
      ctx.lineTo(x1 + w * 0.03, base)
      ctx.stroke()

      ctx.strokeStyle = accent(0.95)
      ctx.lineWidth = 1.8
      ctx.beginPath()
      for (let k = 0; k <= 160; k += 1) {
        const x = k / 160
        if (k) ctx.lineTo(sx(x), sy(f(x)))
        else ctx.moveTo(sx(x), sy(f(x)))
      }
      ctx.stroke()
      dots(nA, kA)
      dots(nB, kB)

      const n = q > 0.5 ? nB : nA
      const sum = q > 0.5 ? sumB : sumA
      return `n = ${n}   Σ = ${sum.toFixed(4)}   ∫ = ${exact.toFixed(4)}`
    },
  }
}

/* ---------- 04 相空间：范德波尔方程的流，粒子汇聚到极限环 ----------
 * 交互：指针处叠加一个涡旋场，按住时再加一个向外的推力。 */
function phaseFlow() {
  const MU = 1.1
  const TRAIL = 26
  const BANDS = 5
  const XR = 3.4
  const YR = 3.9
  let parts = []
  // 指针在相平面里的位置与强度，由 frame 每帧写入。
  const pull = { x: 0, y: 0, k: 0, push: 0 }

  const field = (x, y) => {
    let fx = y
    let fy = MU * (1 - x * x) * y - x
    if (pull.k > 0.001) {
      const dx = x - pull.x
      const dy = y - pull.y
      const r2 = dx * dx + dy * dy
      const g = Math.exp(-r2 / 1.6) / (r2 + 0.25)
      fx += pull.k * g * (-3.2 * dy + pull.push * 3 * dx)
      fy += pull.k * g * (3.2 * dx + pull.push * 3 * dy)
    }
    return [fx, fy]
  }

  function spawn(p) {
    p.x = (Math.random() * 2 - 1) * XR
    p.y = (Math.random() * 2 - 1) * YR
    p.age = 0
    p.life = 1.8 + Math.random() * 3.2
    p.tr = [p.x, p.y]
    p.dying = false
  }

  function advance(dt) {
    const hs = Math.min(dt, 0.05) * 1.15
    for (const p of parts) {
      // 到寿命的粒子原地停下，尾迹从尾端逐帧收回，收完再重生，避免整条尾迹突然消失。
      if (p.dying) {
        p.tr.splice(0, 4)
        if (p.tr.length < 4) spawn(p)
        continue
      }
      const [ax, ay] = field(p.x, p.y)
      const [bx, by] = field(p.x + hs * ax, p.y + hs * ay)
      p.x += (hs * (ax + bx)) / 2
      p.y += (hs * (ay + by)) / 2
      p.age += dt
      if (p.age > p.life || Math.abs(p.x) > XR * 1.4 || Math.abs(p.y) > YR * 1.4) {
        p.dying = true
        continue
      }
      p.tr.push(p.x, p.y)
      if (p.tr.length > TRAIL * 2) p.tr.splice(0, 2)
    }
  }

  return {
    reset(w, h) {
      const count = Math.round(Math.max(60, Math.min(150, (w * h) / 1500)))
      parts = Array.from({ length: count }, () => {
        const p = {}
        spawn(p)
        p.age = Math.random() * p.life
        return p
      })
      for (let i = 0; i < TRAIL; i += 1) advance(1 / 60)
    },
    frame(ctx, w, h, t, dt, ptr) {
      // x、y 分别缩放，让相图铺满横向画布。
      const sx = w / (2 * XR + 0.4)
      const sy = h / (2 * YR + 0.4)
      const cx = w / 2
      const cy = h / 2
      pull.x = (ptr.sx - cx) / sx
      pull.y = (cy - ptr.sy) / sy
      pull.k = ptr.k
      pull.push = lerp(pull.push, ptr.down ? 1 : 0, Math.min(1, dt * 8))
      advance(dt)
      clear(ctx, w, h)

      ctx.lineWidth = 1
      ctx.strokeStyle = ink(0.1)
      ctx.beginPath()
      ctx.moveTo(0, cy)
      ctx.lineTo(w, cy)
      ctx.moveTo(cx, 0)
      ctx.lineTo(cx, h)
      ctx.stroke()

      const per = TRAIL / BANDS
      for (let band = 0; band < BANDS; band += 1) {
        ctx.strokeStyle = ink(0.05 + 0.55 * ((band + 1) / BANDS) ** 1.6)
        ctx.beginPath()
        for (const p of parts) {
          const segs = p.tr.length / 2 - 1
          const offset = TRAIL - 1 - segs
          for (let j = 0; j < segs; j += 1) {
            if (Math.floor((j + offset) / per) !== band) continue
            ctx.moveTo(cx + p.tr[2 * j] * sx, cy - p.tr[2 * j + 1] * sy)
            ctx.lineTo(cx + p.tr[2 * j + 2] * sx, cy - p.tr[2 * j + 3] * sy)
          }
        }
        ctx.stroke()
      }

      ctx.fillStyle = accent(0.85)
      for (const p of parts) {
        if (!p.dying) ctx.fillRect(cx + p.x * sx - 1, cy - p.y * sy - 1, 2, 2)
      }
      if (ptr.k > 0.01) {
        ctx.strokeStyle = (pull.push > 0.5 ? warm : accent)(0.45 * ptr.k)
        ctx.setLineDash([2, 4])
        ctx.beginPath()
        ctx.arc(ptr.sx, ptr.sy, 38, 0, TAU)
        ctx.stroke()
        ctx.setLineDash([])
      }
      return `μ = ${MU}   按住：推开`
    },
  }
}

/* ---------- 05 曲面：旋转的径向波，按深度渐隐 ----------
 * 交互：指针横向控制方位角，纵向控制仰角。 */
function surface() {
  const N = 24
  const R = 3
  const BANDS = 6
  return {
    reset() {},
    frame(ctx, w, h, t, dt, ptr) {
      clear(ctx, w, h)
      const S = Math.min(w, h * 1.35) / 7.6
      const cx = w / 2
      const cy = h * 0.5
      // 视角在对角方向附近来回摆动：网格与屏幕轴对齐时曲面会显得扁平。
      const phi = lerp(
        Math.PI / 4 + 0.42 * Math.sin(0.28 * t),
        Math.PI / 4 + (ptr.sx / w - 0.5) * 2.6,
        ptr.k,
      )
      const E = lerp(0.6, 0.18 + clamp01(ptr.sy / h) * 0.95, ptr.k)
      const cp = Math.cos(phi)
      const sp = Math.sin(phi)
      const ce = Math.cos(E)
      const se = Math.sin(E)
      const Z = (x, y) => {
        const r = Math.hypot(x, y)
        return 1.05 * Math.cos(1.7 * r - 1.8 * t) * Math.exp(-0.16 * r * r)
      }

      const pts = new Array((N + 1) * (N + 1))
      for (let i = 0; i <= N; i += 1) {
        for (let j = 0; j <= N; j += 1) {
          const x = -R + (2 * R * i) / N
          const y = -R + (2 * R * j) / N
          const z = Z(x, y)
          const xr = x * cp - y * sp
          const yr = x * sp + y * cp
          pts[i * (N + 1) + j] = [cx + S * xr, cy + S * (yr * se - z * ce), yr * ce + z * se]
        }
      }
      const at = (i, j) => pts[i * (N + 1) + j]
      const dMax = R * 1.45

      ctx.lineWidth = 1
      for (let band = 0; band < BANDS; band += 1) {
        ctx.strokeStyle = ink(0.05 + 0.4 * ((band + 1) / BANDS) ** 1.5)
        ctx.beginPath()
        for (let i = 0; i <= N; i += 1) {
          for (let j = 0; j < N; j += 1) {
            for (const [a, b] of [
              [at(i, j), at(i, j + 1)],
              [at(j, i), at(j + 1, i)],
            ]) {
              const d = clamp01(((a[2] + b[2]) / 2 + dMax) / (2 * dMax))
              if (Math.min(BANDS - 1, Math.floor(d * BANDS)) !== band) continue
              ctx.moveTo(a[0], a[1])
              ctx.lineTo(b[0], b[1])
            }
          }
        }
        ctx.stroke()
      }

      ctx.strokeStyle = accent(0.95)
      ctx.lineWidth = 1.7
      ctx.beginPath()
      const mid = N / 2
      for (let i = 0; i <= N; i += 1) {
        const [px, py] = at(i, mid)
        if (i) ctx.lineTo(px, py)
        else ctx.moveTo(px, py)
      }
      ctx.stroke()
      const deg = (v) => Math.round((v * 180) / Math.PI)
      return `方位 ${deg(phi)}°   仰角 ${deg(E)}°`
    },
  }
}

/* ---------- 06 模乘圆：圆周 n 等分，第 i 点连向第 k·i (mod n) 点 ----------
 * k 从 2 慢慢增大，弦的包络由心脏线过渡到肾脏线、再到多瓣花形。
 * 交互：指针左右移动直接调 k，点击一次让高亮弦从头扫一遍。 */
function modCircle() {
  const N = 180
  let sweepFrom = 0
  let clicks = -1
  return {
    reset() {
      sweepFrom = 0
    },
    frame(ctx, w, h, t, dt, ptr) {
      clear(ctx, w, h)
      if (clicks < 0) clicks = ptr.clicks
      if (ptr.clicks !== clicks) {
        clicks = ptr.clicks
        sweepFrom = t
      }
      const auto = 2 + 0.16 * t
      const manual = 2 + clamp01((ptr.sx - w * 0.08) / (w * 0.84)) * 8
      const k = lerp(auto, manual, ptr.k)
      const R = Math.min(w, h) * 0.39
      const cx = w / 2
      const cy = h / 2
      const P = (v) => {
        const th = Math.PI + (TAU * v) / N
        return [cx + R * Math.cos(th), cy - R * Math.sin(th)]
      }

      ctx.lineWidth = 1
      ctx.strokeStyle = ink(0.22)
      ctx.beginPath()
      ctx.arc(cx, cy, R, 0, TAU)
      ctx.stroke()

      ctx.strokeStyle = ink(0.15)
      ctx.beginPath()
      for (let i = 1; i < N; i += 1) {
        const [x0, y0] = P(i)
        const [x1, y1] = P(i * k)
        ctx.moveTo(x0, y0)
        ctx.lineTo(x1, y1)
      }
      ctx.stroke()

      // 一条高亮弦沿圆周扫过，提示“第 i 点连向第 k·i 点”的规则。
      const head = Math.floor((t - sweepFrom) * 26) % N
      ctx.strokeStyle = accent(0.95)
      ctx.lineWidth = 1.6
      ctx.beginPath()
      for (let d = 0; d < 6; d += 1) {
        const i = (head - d + N) % N
        const [x0, y0] = P(i)
        const [x1, y1] = P(i * k)
        ctx.globalAlpha = 1 - d / 6
        ctx.beginPath()
        ctx.moveTo(x0, y0)
        ctx.lineTo(x1, y1)
        ctx.stroke()
      }
      ctx.globalAlpha = 1
      const [hx, hy] = P(head)
      const [tx, ty] = P(head * k)
      ctx.fillStyle = accent(1)
      for (const [px, py] of [
        [hx, hy],
        [tx, ty],
      ]) {
        ctx.beginPath()
        ctx.arc(px, py, 2.8, 0, TAU)
        ctx.fill()
      }
      return `k = ${k.toFixed(2)}   n = ${N}`
    },
  }
}

export const SCENES = [
  { key: 'linear', title: '线性变换', subject: '线性代数', create: linearMap },
  { key: 'fourier', title: '傅里叶级数', subject: '数学分析', create: fourier },
  { key: 'riemann', title: '定积分', subject: '微积分', create: riemann, loop: 13.5 },
  { key: 'flow', title: '相空间', subject: '微分方程', create: phaseFlow },
  { key: 'surface', title: '曲面', subject: '多元微积分', create: surface },
  { key: 'modular', title: '模乘圆', subject: '数论', create: modCircle, loop: 34 },
]

/*
 * 指针状态，传给每个场景：
 *   x, y     画布内的 CSS 像素坐标；sx, sy 为平滑后的坐标（场景用它，避免抖动）
 *   k        指针“在场”的程度，进入画布渐变到 1、离开渐变到 0
 *   down     是否按下；clicks 为累计点击次数，场景比较它来响应单击
 *
 * SCENES 中的 loop（场景秒数）给需要循环的场景用：到时淡出、从头再播，
 * 例如定积分的分割数只会越来越细，模乘圆的 k 只会越来越大。
 */
function createPointer() {
  return { x: 0, y: 0, sx: 0, sy: 0, k: 0, inside: false, down: false, clicks: 0 }
}

function monoFont(size) {
  const family =
    getComputedStyle(document.documentElement).getPropertyValue('--font-mono').trim() || 'monospace'
  return `${size}px ${family}`
}

// 十字准星 + 坐标读数 + 场景读数。坐标以画布中心为原点、短边的 1/6.4 为单位长度。
function drawOverlay(ctx, w, h, ptr, label, font) {
  const k = ptr.k
  if (k > 0.01) {
    ctx.save()
    ctx.lineWidth = 1
    ctx.strokeStyle = ink(0.16 * k)
    ctx.setLineDash([2, 5])
    ctx.beginPath()
    ctx.moveTo(ptr.sx, 0)
    ctx.lineTo(ptr.sx, h)
    ctx.moveTo(0, ptr.sy)
    ctx.lineTo(w, ptr.sy)
    ctx.stroke()
    ctx.setLineDash([])

    const u = Math.min(w, h) / 6.4
    const X = (ptr.sx - w / 2) / u
    const Y = (h / 2 - ptr.sy) / u
    const text = `(${X.toFixed(2)}, ${Y.toFixed(2)})`
    ctx.font = font
    const tw = ctx.measureText(text).width
    let tx = ptr.sx + 12
    let ty = ptr.sy - 12
    if (tx + tw + 12 > w) tx = ptr.sx - tw - 20
    if (ty < 22) ty = ptr.sy + 24
    ctx.fillStyle = `rgba(251, 251, 250, ${0.88 * k})`
    ctx.fillRect(tx - 5, ty - 13, tw + 10, 19)
    ctx.fillStyle = ink(0.72 * k)
    ctx.fillText(text, tx, ty)
    ctx.restore()
  }
  if (label) {
    ctx.save()
    ctx.font = font
    ctx.fillStyle = ink(0.34 + 0.4 * k)
    ctx.fillText(label, 16, h - 16)
    ctx.restore()
  }
}

/*
 * 首页六宫格：每个画布固定播放一个场景，不轮播。
 * 绘制上限为 idleFps（默认 60，高刷屏上也不超过它）；指针移入的那一格不受限，并显示准星与读数。
 */
export function mountTile(canvas, index, { speed = 1, idleFps = 60, fade = 320 } = {}) {
  const ctx = canvas.getContext('2d')
  const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false
  const def = SCENES[index]
  const ptr = createPointer()
  const font = monoFont(11)
  let scene = def.create()
  let w = 0
  let h = 0
  let t = 0
  let acc = 0
  let smooth = 1 / 60
  let last = 0
  let raf = 0
  let inView = true
  let restarting = false
  let fadeTimer = 0

  function drawStill() {
    scene.reset(w, h)
    const dt = 1 / 30
    for (let k = 0; k <= 150; k += 1) scene.frame(ctx, w, h, k * dt, dt, ptr)
  }

  function resize() {
    const rect = canvas.getBoundingClientRect()
    if (!rect.width || !rect.height) return
    const dpr = Math.min(1.5, window.devicePixelRatio || 1)
    w = rect.width
    h = rect.height
    canvas.width = Math.round(w * dpr)
    canvas.height = Math.round(h * dpr)
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    if (reduced) drawStill()
    else scene.reset(w, h)
  }

  function restart() {
    restarting = true
    canvas.style.opacity = '0'
    fadeTimer = window.setTimeout(() => {
      scene = def.create()
      scene.reset(w, h)
      t = 0
      canvas.style.opacity = '1'
      restarting = false
    }, fade)
  }

  function loop(now) {
    raf = requestAnimationFrame(loop)
    acc += last ? (now - last) / 1000 : 1 / 60
    last = now
    const live = ptr.inside || ptr.k > 0.02
    if (!live && acc < 1 / idleFps - 0.002) return
    // 帧间隔做一次低通滤波：偶发的掉帧或计时抖动不会让画面一顿一跳。
    smooth += (Math.min(0.05, acc) - smooth) * 0.2
    const dt = smooth
    acc = 0
    const follow = Math.min(1, dt * 14)
    ptr.sx += (ptr.x - ptr.sx) * follow
    ptr.sy += (ptr.y - ptr.sy) * follow
    ptr.k += ((ptr.inside ? 1 : 0) - ptr.k) * Math.min(1, dt * 6)
    const sdt = dt * speed
    t += sdt
    const label = scene.frame(ctx, w, h, t, sdt, ptr)
    drawOverlay(ctx, w, h, ptr, ptr.k > 0.02 ? label : '', font)
    if (def.loop && t > def.loop && !ptr.inside && !restarting) restart()
  }

  function start() {
    if (reduced || raf || !inView) return
    last = 0
    raf = requestAnimationFrame(loop)
  }

  function stop() {
    cancelAnimationFrame(raf)
    raf = 0
  }

  function locate(event) {
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
      ptr.clicks += 1
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

  const resizeObserver = new ResizeObserver(resize)
  resizeObserver.observe(canvas)
  const viewObserver = new IntersectionObserver(
    ([entry]) => {
      inView = entry.isIntersecting
      if (inView) start()
      else stop()
    },
    { threshold: 0.05 },
  )
  viewObserver.observe(canvas)

  resize()
  start()

  return {
    destroy() {
      stop()
      window.clearTimeout(fadeTimer)
      for (const [name, fn] of Object.entries(listeners)) canvas.removeEventListener(name, fn)
      resizeObserver.disconnect()
      viewObserver.disconnect()
    },
  }
}
