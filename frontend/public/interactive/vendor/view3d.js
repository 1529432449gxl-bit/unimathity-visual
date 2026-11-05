// view3d.js：空间类交互模块的投影与绘制层（配合 plotfx.js 使用，无其他依赖）。
// 约定：数学坐标 z 向上；正交投影，可拖动旋转视角；曲面按远近排序填充，用明暗区分朝向。
import { C, rgba, clamp } from './plotfx.js';

/** 相机：az 绕 z 轴的方位角，el 俯仰角，sc 缩放，(ox, oy) 原点的屏幕位置。 */
export function camera(o = {}) {
  const c = { az: -0.6, el: 0.45, sc: 100, ox: 0, oy: 0, ...o };
  c.P = p => {
    const ca = Math.cos(c.az), sa = Math.sin(c.az), ce = Math.cos(c.el), se = Math.sin(c.el);
    const x1 = p[0] * ca - p[1] * sa, y1 = p[0] * sa + p[1] * ca;
    return [c.ox + c.sc * x1, c.oy - c.sc * (p[2] * ce + y1 * se), y1 * ce - p[2] * se];
  };
  /** 视线方向（指向屏幕内），用于判断面朝向 */
  c.view = () => { const ca = Math.cos(c.az), sa = Math.sin(c.az), ce = Math.cos(c.el), se = Math.sin(c.el); return [sa * ce, ca * ce, -se]; };
  return c;
}
/** 拖动画布旋转视角；onStart 可用来暂停自动播放。 */
export function drag(canvas, cam, kick, { onStart = () => {}, elMin = -0.2, elMax = 1.45 } = {}) {
  let d = null;
  canvas.style.touchAction = 'none';
  canvas.addEventListener('pointerdown', e => { d = [e.clientX, e.clientY, cam.az, cam.el]; canvas.setPointerCapture(e.pointerId); onStart(); kick() });
  canvas.addEventListener('pointermove', e => { if (!d) return; cam.az = d[2] + (e.clientX - d[0]) * 0.008; cam.el = clamp(d[3] + (e.clientY - d[1]) * 0.006, elMin, elMax); kick() });
  const up = () => { d = null; kick() }; canvas.addEventListener('pointerup', up); canvas.addEventListener('pointercancel', up);
  return { get active() { return !!d } };
}
const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
export const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
export const dot3 = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
export const norm = a => Math.hypot(a[0], a[1], a[2]);
export const unit = a => { const n = norm(a) || 1; return [a[0] / n, a[1] / n, a[2] / n] };

/** 参数曲面网格：返回四边形列表 {pts:[p00,p10,p11,p01], d, n}。 */
export function mesh(F, u0, u1, v0, v1, nu, nv) {
  const G = []; for (let i = 0; i <= nu; i++) { G.push([]); for (let j = 0; j <= nv; j++) G[i].push(F(u0 + (u1 - u0) * i / nu, v0 + (v1 - v0) * j / nv)) }
  const Q = []; for (let i = 0; i < nu; i++) for (let j = 0; j < nv; j++) {
    const a = G[i][j], b = G[i + 1][j], c = G[i + 1][j + 1], d = G[i][j + 1];
    if ([a, b, c, d].some(p => !p || p.some(x => !Number.isFinite(x)))) continue;
    Q.push({ pts: [a, b, c, d], n: unit(cross(sub(b, a), sub(d, a))), i, j });
  }
  return Q;
}
/** 收集若干组面片后统一按远近排序绘制。items: [{quads, color, alpha, edge}] 或单个三角/多边形 {poly, color, alpha}。 */
export function paint(ctx, cam, items) {
  const all = [], L = unit([0.35, -0.5, 0.8]);
  for (const it of items) {
    if (it.poly) { const pr = it.poly.map(cam.P); all.push({ pr, d: pr.reduce((s, p) => s + p[2], 0) / pr.length, it, shade: 1 }); continue }
    for (const q of it.quads) { const pr = q.pts.map(cam.P); const s = 0.72 + 0.28 * Math.abs(dot3(q.n, L)); all.push({ pr, d: pr.reduce((s2, p) => s2 + p[2], 0) / 4, it, shade: s }) }
  }
  all.sort((a, b) => b.d - a.d);
  for (const f of all) {
    const { color = C.accent, alpha = .3, edge = 0, edgeColor } = f.it;
    ctx.beginPath(); f.pr.forEach((p, k) => k ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])); ctx.closePath();
    ctx.fillStyle = rgba(color, alpha * f.shade); ctx.fill();
    if (edge) { ctx.strokeStyle = rgba(edgeColor || color, edge); ctx.lineWidth = 0.7; ctx.stroke() }
  }
}
/** 空间折线 */
export function line(ctx, cam, pts, { color = C.accent, width = 2, alpha = 1, dash = null } = {}) {
  if (pts.length < 2) return; ctx.save(); ctx.globalAlpha = alpha; ctx.strokeStyle = color; ctx.lineWidth = width; ctx.lineCap = ctx.lineJoin = 'round';
  if (dash) ctx.setLineDash(dash); ctx.beginPath(); pts.forEach((p, k) => { const q = cam.P(p); k ? ctx.lineTo(q[0], q[1]) : ctx.moveTo(q[0], q[1]) }); ctx.stroke(); ctx.restore();
}
/** 空间箭头 */
export function arrow(ctx, cam, a, b, { color = C.accent, width = 2.2, alpha = 1, head = 9 } = {}) {
  const p = cam.P(a), q = cam.P(b), dx = q[0] - p[0], dy = q[1] - p[1], L = Math.hypot(dx, dy); if (L < 1) return;
  const ux = dx / L, uy = dy / L, h = Math.min(head, L * .45);
  ctx.save(); ctx.globalAlpha = alpha; ctx.strokeStyle = ctx.fillStyle = color; ctx.lineWidth = width; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(p[0], p[1]); ctx.lineTo(q[0] - ux * h * .7, q[1] - uy * h * .7); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(q[0], q[1]); ctx.lineTo(q[0] - ux * h - uy * h * .45, q[1] - uy * h + ux * h * .45); ctx.lineTo(q[0] - ux * h + uy * h * .45, q[1] - uy * h - ux * h * .45); ctx.closePath(); ctx.fill(); ctx.restore();
}
/** 细坐标轴 */
export function axes(ctx, cam, r = [1.6, 1.6, 1.4], { alpha = .7 } = {}) {
  for (const [k, e] of [[0, [r[0], 0, 0]], [1, [0, r[1], 0]], [2, [0, 0, r[2]]]]) line(ctx, cam, [[-e[0] * .15, -e[1] * .15, -e[2] * .15], e], { color: C.mute, width: 1, alpha });
}
/** 多边形（平面片）作为可排序对象 */
export const poly = (pts, color, alpha) => ({ poly: pts, color, alpha });
