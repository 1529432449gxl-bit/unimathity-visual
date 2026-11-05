// la3d.js：线性代数空间类模块的补充件（配合 plotfx.js、view3d.js 使用）。
// 提供：三维向量运算、平面片、直角记号、屏幕拖动映射到平面内的点。
import { C } from './plotfx.js';
import * as V from './view3d.js';
export const add = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]], sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
export const mul = (k, a) => [k * a[0], k * a[1], k * a[2]], dot = V.dot3, cross = V.cross, norm = V.norm, unit = V.unit;
export const lin = (...ts) => ts.reduce((s, [k, v]) => add(s, mul(k, v)), [0, 0, 0]);
export const proj = (x, u) => mul(dot(x, u) / dot(u, u), u);
export const apply = (M, x) => M.map(r => r[0] * x[0] + r[1] * x[1] + r[2] * x[2]);
/** 由 u、w 张成、以 p 为中心的平面片（四边形），半径 s */
export function patch(p, u, w, s = 1.2) { const a = mul(s, unit(u)), b0 = sub(w, proj(w, u)), b = mul(s, unit(b0)); return [add(add(p, a), b), add(sub(p, a), b), sub(sub(p, a), b), sub(add(p, a), b)]; }
/** 平面片的边与面：返回给 V.paint 的对象 */
export const plane = (p, u, w, color, alpha = .12, s = 1.2) => ({ poly: patch(p, u, w, s), color, alpha });
export function edge(ctx, cam, p, u, w, { color = C.blue, alpha = .35, s = 1.2, width = 1 } = {}) { const q = patch(p, u, w, s); V.line(ctx, cam, [...q, q[0]], { color, alpha, width }); }
/** 直角记号：在点 o，沿方向 a、b */
export function rightAngle(ctx, cam, o, a, b, { k = .14, color = C.soft, alpha = .8 } = {}) { const u = mul(k, unit(a)), w = mul(k, unit(b)); V.line(ctx, cam, [add(o, u), add(add(o, u), w), add(o, w)], { color, width: 1, alpha }); }
/** 屏幕坐标 (sx,sy) 对应到平面 o + s u + t w 上的点（正交投影下为二元一次方程组） */
export function screenToPlane(cam, sx, sy, o, u, w) {
  const P0 = cam.P(o), Pu = cam.P(add(o, u)), Pw = cam.P(add(o, w));
  const a = Pu[0] - P0[0], b = Pw[0] - P0[0], c = Pu[1] - P0[1], d = Pw[1] - P0[1], det = a * d - b * c; if (Math.abs(det) < 1e-6) return null;
  const rx = sx - P0[0], ry = sy - P0[1]; const s = (rx * d - b * ry) / det, t = (a * ry - c * rx) / det; return [s, t];
}
export const K = (el, s, d) => katex.render(s, el, { throwOnError: false, displayMode: !!d });
export function legend(el, items) { el.innerHTML = ''; for (const [t, c, d] of items) { const e = document.createElement('span'); e.className = 'key' + (d ? ' dash' : ''); e.style.setProperty('--c', c); K(e, t); el.append(e) } }
export function formulas(box, list) { let m = 0; for (const t of list) { K(box, t, 1); m = Math.max(m, box.getBoundingClientRect().height) } box.style.minHeight = Math.ceil(m) + 'px'; let cur = null; return t => { if (t !== cur) { K(box, t, 1); cur = t } } }
export function playToggle(btn, S, kick) {
  const set = on => { S.playing = on; btn.textContent = on ? 'Pause' : 'Play'; btn.setAttribute('aria-pressed', String(on)); if (on) kick() };
  btn.onclick = () => set(!S.playing);
  document.addEventListener('visibilitychange', () => { if (document.hidden) set(false) });
  new IntersectionObserver(es => { if (!es[0].isIntersecting) set(false) }).observe(btn);
  return set;
}
export function segmented(host, items, value, onChange) {
  const bs = items.map(([val, tex]) => { const b = document.createElement('button'); b.type = 'button'; b.className = 'tg'; K(b, tex); b.onclick = () => { setv(val); onChange(val) }; host.append(b); return [val, b] });
  const setv = val => bs.forEach(([v2, b]) => b.setAttribute('aria-pressed', String(v2 === val))); setv(value); return setv;
}
