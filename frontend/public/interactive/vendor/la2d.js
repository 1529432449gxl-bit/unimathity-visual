// la2d.js：线性代数几何类模块的平面绘制与交互层（配合 plotfx.js 使用）。
// 提供：等比例视窗、向量箭头、过原点直线、平行四边形、变换后的网格、可拖动手柄、播放开关、图例与公式区。
import { C, rgba, clamp, view, approach } from './plotfx.js';
export { C, rgba, clamp };

/** 等比例视窗：以原点为中心，半宽 R（取宽高中较短方向）。每帧调用 fit(w,h)。 */
export function plane(R = 2.4) {
  const v = view([-R, R, -R, R], { l: 10, r: 10, t: 10, b: 10 });
  v.R = R; v.cx = 0; v.cy = 0;
  v.fit = (w, h) => { v.w = w; v.h = h; const a = w / h; const R2 = v.R; if (a >= 1) v.b = [v.cx - R2 * a, v.cx + R2 * a, v.cy - R2, v.cy + R2]; else v.b = [v.cx - R2, v.cx + R2, v.cy - R2 / a, v.cy + R2 / a]; };
  v.S = p => [v.X(p[0]), v.Y(p[1])];
  v.inv = (sx, sy) => [v.b[0] + (sx - v.pad.l) / (v.w - v.pad.l - v.pad.r) * (v.b[1] - v.b[0]), v.b[3] - (sy - v.pad.t) / (v.h - v.pad.t - v.pad.b) * (v.b[3] - v.b[2])];
  return v;
}
export const add = (a, b) => [a[0] + b[0], a[1] + b[1]], sub = (a, b) => [a[0] - b[0], a[1] - b[1]], mul = (k, a) => [k * a[0], k * a[1]];
export const dot = (a, b) => a[0] * b[0] + a[1] * b[1], len = a => Math.hypot(a[0], a[1]), cross = (a, b) => a[0] * b[1] - a[1] * b[0];
export const apply = (M, x) => [M[0][0] * x[0] + M[0][1] * x[1], M[1][0] * x[0] + M[1][1] * x[1]];
export const mm = (A, B) => [[A[0][0] * B[0][0] + A[0][1] * B[1][0], A[0][0] * B[0][1] + A[0][1] * B[1][1]], [A[1][0] * B[0][0] + A[1][1] * B[1][0], A[1][0] * B[0][1] + A[1][1] * B[1][1]]];
export const rot = t => [[Math.cos(t), -Math.sin(t)], [Math.sin(t), Math.cos(t)]];
export const lerpM = (A, B, t) => A.map((r, i) => r.map((x, j) => x + (B[i][j] - x) * t));
/** 在基 (e1,e2) 下的坐标 */
export function coords(e1, e2, x) { const d = cross(e1, e2); return [cross(x, e2) / d, cross(e1, x) / d]; }

export function arrow(ctx, v, a, b, { color = C.accent, width = 2.4, head = 10, alpha = 1, dash = null } = {}) {
  const p = v.S(a), q = v.S(b), dx = q[0] - p[0], dy = q[1] - p[1], L = Math.hypot(dx, dy); if (L < 1.5 || alpha <= 0) return;
  const ux = dx / L, uy = dy / L, h = Math.min(head, L * .45);
  ctx.save(); ctx.globalAlpha = alpha; ctx.strokeStyle = ctx.fillStyle = color; ctx.lineWidth = width; ctx.lineCap = 'round'; if (dash) ctx.setLineDash(dash);
  ctx.beginPath(); ctx.moveTo(p[0], p[1]); ctx.lineTo(q[0] - ux * h * .7, q[1] - uy * h * .7); ctx.stroke(); ctx.setLineDash([]);
  ctx.beginPath(); ctx.moveTo(q[0], q[1]); ctx.lineTo(q[0] - ux * h - uy * h * .42, q[1] - uy * h + ux * h * .42); ctx.lineTo(q[0] - ux * h + uy * h * .42, q[1] - uy * h - ux * h * .42); ctx.closePath(); ctx.fill(); ctx.restore();
}
export function seg(ctx, v, a, b, { color = C.mute, width = 1.2, alpha = 1, dash = null } = {}) {
  const p = v.S(a), q = v.S(b); ctx.save(); ctx.globalAlpha = alpha; ctx.strokeStyle = color; ctx.lineWidth = width; ctx.lineCap = 'round'; if (dash) ctx.setLineDash(dash);
  ctx.beginPath(); ctx.moveTo(p[0], p[1]); ctx.lineTo(q[0], q[1]); ctx.stroke(); ctx.restore();
}
/** 过点 p、方向 d 的整条直线（裁到视窗） */
export function fullLine(ctx, v, d, { p = [0, 0], color = C.blue, width = 1.2, alpha = .5, dash = null } = {}) {
  const n = len(d) || 1, u = [d[0] / n, d[1] / n], T = 4 * (v.b[1] - v.b[0]);
  seg(ctx, v, add(p, mul(-T, u)), add(p, mul(T, u)), { color, width, alpha, dash });
}
export function poly(ctx, v, pts, { fill = null, fillAlpha = .18, stroke = null, width = 1.4, alpha = 1 } = {}) {
  ctx.save(); ctx.globalAlpha = alpha; ctx.beginPath(); pts.forEach((p, k) => { const s = v.S(p); k ? ctx.lineTo(s[0], s[1]) : ctx.moveTo(s[0], s[1]) }); ctx.closePath();
  if (fill) { ctx.fillStyle = rgba(fill, fillAlpha); ctx.fill() } if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = width; ctx.lineJoin = 'round'; ctx.stroke() } ctx.restore();
}
/** 网格在 M 作用下的像：k 条线，淡色 */
export function grid(ctx, v, M = [[1, 0], [0, 1]], { n = 6, step = .5, color = C.rule, alpha = .7, width = 1 } = {}) {
  for (let i = -n; i <= n; i++) {
    seg(ctx, v, apply(M, [i * step, -n * step]), apply(M, [i * step, n * step]), { color, alpha, width });
    seg(ctx, v, apply(M, [-n * step, i * step]), apply(M, [n * step, i * step]), { color, alpha, width });
  }
}
export function dotAt(ctx, v, p, { r = 4.5, color = C.accent, alpha = 1, ring = true } = {}) {
  const s = v.S(p); ctx.save(); ctx.globalAlpha = alpha; ctx.beginPath(); ctx.arc(s[0], s[1], r, 0, 7); ctx.fillStyle = color; ctx.fill();
  if (ring) { ctx.strokeStyle = C.bg; ctx.lineWidth = 1.6; ctx.stroke() } ctx.restore();
}
/** 可拖动手柄：handles() 返回 [{id, p:[x,y]}]；onMove(id, 世界坐标)。返回 {active, hover}。 */
export function handles(canvas, v, list, onMove, { onStart = () => {}, kick = () => {}, r = 16 } = {}) {
  const st = { active: null, hover: null }; canvas.style.touchAction = 'none';
  const pos = e => { const b = canvas.getBoundingClientRect(); return [e.clientX - b.left, e.clientY - b.top] };
  const pick = (sx, sy) => { let best = null, bd = r; for (const h of list()) { const s = v.S(h.p), d = Math.hypot(s[0] - sx, s[1] - sy); if (d < bd) { bd = d; best = h.id } } return best };
  canvas.addEventListener('pointerdown', e => { const [x, y] = pos(e), id = pick(x, y); if (id == null) return; st.active = id; canvas.setPointerCapture(e.pointerId); onStart(id); kick() });
  canvas.addEventListener('pointermove', e => { const [x, y] = pos(e); if (st.active != null) { onMove(st.active, v.inv(x, y)); kick() } else { const h = pick(x, y); if (h !== st.hover) { st.hover = h; canvas.style.cursor = h != null ? 'grab' : 'default'; kick() } } });
  const up = () => { st.active = null; kick() }; canvas.addEventListener('pointerup', up); canvas.addEventListener('pointercancel', up);
  return st;
}
/** 播放开关按钮 */
export function playToggle(btn, S, kick) {
  const set = on => { S.playing = on; btn.textContent = on ? 'Pause' : 'Play'; btn.setAttribute('aria-pressed', String(on)); if (on) kick() };
  btn.onclick = () => set(!S.playing);
  document.addEventListener('visibilitychange', () => { if (document.hidden) set(false) });
  new IntersectionObserver(es => { if (!es[0].isIntersecting) set(false) }).observe(btn);
  return set;
}
export const K = (el, s, d) => katex.render(s, el, { throwOnError: false, displayMode: !!d });
export function legend(el, items) { el.innerHTML = ''; for (const [t, c, d] of items) { const e = document.createElement('span'); e.className = 'key' + (d ? ' dash' : ''); e.style.setProperty('--c', c); K(e, t); el.append(e) } }
/** 公式区：传入全部可能出现的公式，预排锁定高度 */
export function formulas(box, list) { let m = 0; for (const t of list) { K(box, t, 1); m = Math.max(m, box.getBoundingClientRect().height) } box.style.minHeight = Math.ceil(m) + 'px'; let cur = null; return t => { if (t !== cur) { K(box, t, 1); cur = t } } }
/** 分段按钮组：items=[[value, tex]]，返回 set(value) */
export function segmented(host, items, value, onChange) {
  const bs = items.map(([val, tex]) => { const b = document.createElement('button'); b.type = 'button'; b.className = 'tg'; K(b, tex); b.onclick = () => { setv(val); onChange(val) }; host.append(b); return [val, b] });
  const setv = val => bs.forEach(([v2, b]) => b.setAttribute('aria-pressed', String(v2 === val))); setv(value); return setv;
}
export { approach };
