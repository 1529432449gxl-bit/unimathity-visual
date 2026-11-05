// plotfx.js：曲线类交互模块的共用绘制与动效层（无依赖）。
// 约定：浅灰底、深蓝主线、橙色强调；状态变化一律缓动过渡，新元素逐段画出或淡入，历史按年龄淡出。
export const C = { bg:'#fbfbfa', ink:'#161820', soft:'#4f525b', mute:'#7a7c84', rule:'#d5d7dd', faint:'#e3e4e8',
  accent:'#223056', warm:'#ad6844', hl:'#b5763a', hlBg:'#f3e3d2', blue:'#3f6e8c', pane:'#eeeff4' };
export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
export const lerp = (a, b, t) => a + (b - a) * t;
export const ease = { inOut: t => t < .5 ? 4*t*t*t : 1 - (-2*t+2)**3/2, out: t => 1 - (1-t)**3, back: t => 1 + 2.2*(t-1)**3 + 1.2*(t-1)**2 };
export const seg = (t, a, b) => clamp((t - a) / (b - a), 0, 1);
export function rgba(hex, a) { const n = parseInt(hex.slice(1), 16); return `rgba(${n>>16&255},${n>>8&255},${n&255},${a})`; }
/** 指数趋近：标量或数组都可，rate 越大越快。返回是否仍在运动。 */
export function approach(obj, key, target, dt, rate = 9) {
  const k = 1 - Math.exp(-rate * dt); let moving = false;
  if (Array.isArray(target)) { const cur = obj[key] && obj[key].length === target.length ? obj[key] : target.slice();
    for (let i = 0; i < target.length; i++) { const d = target[i] - cur[i]; if (Math.abs(d) > 1e-6 * (1 + Math.abs(target[i]))) { cur[i] += d * k; moving = true } else cur[i] = target[i] }
    obj[key] = cur; return moving }
  const cur = obj[key] ?? target, d = target - cur; if (Math.abs(d) > 1e-6 * (1 + Math.abs(target))) { obj[key] = cur + d * k; return true } obj[key] = target; return false;
}
/** 视窗：b=[xmin,xmax,ymin,ymax]，可缓动到目标视窗（镜头跟随）。 */
export function view(b, pad = { l: 14, r: 14, t: 14, b: 22 }) {
  const v = { b: b.slice(), target: b.slice(), pad, w: 0, h: 0,
    X: x => v.pad.l + (x - v.b[0]) / (v.b[1] - v.b[0]) * (v.w - v.pad.l - v.pad.r),
    Y: y => v.pad.t + (v.b[3] - y) / (v.b[3] - v.b[2]) * (v.h - v.pad.t - v.pad.b),
    aim(t, snap) { v.target = t.slice(); if (snap) v.b = t.slice() },
    step(dt, rate = 4.5) { return approach(v, 'b', v.target, dt, rate) } };
  return v;
}
/** 画布挂载：处理像素比与尺寸；draw(ctx,w,h,dt,now) 返回 true 表示还要下一帧。离屏或隐藏时停帧。 */
export function mount(canvas, draw) {
  let raf = 0, last = 0, w = 0, h = 0, ctx = canvas.getContext('2d'), visible = true;
  const size = () => { const r = canvas.getBoundingClientRect(), d = devicePixelRatio || 1; w = r.width; h = r.height;
    canvas.width = Math.round(w * d); canvas.height = Math.round(h * d); ctx.setTransform(d, 0, 0, d, 0, 0) };
  const frame = now => { raf = 0; const dt = last ? Math.min(.05, (now - last) / 1000) : 0; last = now;
    ctx.clearRect(0, 0, w, h); ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    const more = draw(ctx, w, h, dt, now); if (more && visible && !document.hidden) raf = requestAnimationFrame(frame); else last = 0 };
  const kick = () => { if (!raf) raf = requestAnimationFrame(frame) };
  new ResizeObserver(() => { size(); kick() }).observe(canvas);
  new IntersectionObserver(es => { visible = es[0].isIntersecting; if (visible) kick() }).observe(canvas);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) kick() });
  size(); return { kick, get w() { return w }, get h() { return h } };
}
/** 折线：pts 为屏幕坐标 [[x,y],...]；progress∈[0,1] 时只画出前一段（逐段画出）。 */
export function path(ctx, pts, { color = C.accent, width = 2.4, alpha = 1, dash = null, progress = 1, halo = 0 } = {}) {
  if (pts.length < 2 || progress <= 0 || alpha <= 0) return;
  let L = 0; const acc = [0]; for (let i = 1; i < pts.length; i++) { L += Math.hypot(pts[i][0]-pts[i-1][0], pts[i][1]-pts[i-1][1]); acc.push(L) }
  const stop = L * clamp(progress, 0, 1);
  const trace = () => { ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]);
    for (let i = 1; i < pts.length; i++) { if (acc[i] <= stop) ctx.lineTo(pts[i][0], pts[i][1]);
      else { const t = (stop - acc[i-1]) / (acc[i] - acc[i-1] || 1); ctx.lineTo(lerp(pts[i-1][0], pts[i][0], t), lerp(pts[i-1][1], pts[i][1], t)); break } } };
  ctx.save(); ctx.globalAlpha = alpha; ctx.setLineDash(dash || []);
  if (halo) { trace(); ctx.strokeStyle = rgba(C.bg, .9); ctx.lineWidth = width + halo; ctx.stroke() }
  trace(); ctx.strokeStyle = color; ctx.lineWidth = width; ctx.stroke(); ctx.restore();
}
/** 函数曲线采样：按屏幕宽度自适应取点，跳过非有限值。 */
export function curve(v, f, x0 = v.b[0], x1 = v.b[1], n = 0) {
  n = n || Math.max(120, Math.round((v.X(x1) - v.X(x0)) * 1.5)); const out = [];
  for (let i = 0; i <= n; i++) { const x = x0 + (x1 - x0) * i / n, y = f(x); if (Number.isFinite(y)) out.push([v.X(x), v.Y(y)]) } return out;
}
export function samples(v, ys, xs) { return ys.map((y, i) => [v.X(xs[i]), v.Y(y)]) }
export function dot(ctx, x, y, { r = 4, color = C.accent, alpha = 1, ring = true, scale = 1 } = {}) {
  if (scale <= 0 || alpha <= 0) return; ctx.save(); ctx.globalAlpha = alpha; ctx.beginPath(); ctx.arc(x, y, r * scale, 0, 7);
  ctx.fillStyle = color; ctx.fill(); if (ring) { ctx.strokeStyle = C.bg; ctx.lineWidth = 1.5; ctx.stroke() } ctx.restore();
}
export function fill(ctx, top, bottom, color, alpha = 1) {
  if (top.length < 2) return; ctx.save(); ctx.globalAlpha = alpha; ctx.beginPath(); ctx.moveTo(top[0][0], top[0][1]);
  for (const p of top) ctx.lineTo(p[0], p[1]); for (let i = bottom.length - 1; i >= 0; i--) ctx.lineTo(bottom[i][0], bottom[i][1]);
  ctx.closePath(); ctx.fillStyle = color; ctx.fill(); ctx.restore();
}
/** 只画坐标轴细线，可选少量刻度（11px 灰字）。 */
export function axes(ctx, v, { x = true, y = false, ticks = [], yticks = [] } = {}) {
  ctx.save(); ctx.strokeStyle = C.rule; ctx.lineWidth = 1; ctx.beginPath();
  const oy = clamp(0, v.b[2], v.b[3]), ox = clamp(0, v.b[0], v.b[1]);
  if (x && v.b[2] <= 0 && v.b[3] >= 0) { ctx.moveTo(v.pad.l, v.Y(oy)); ctx.lineTo(v.w - v.pad.r, v.Y(oy)) }
  if (y && v.b[0] <= 0 && v.b[1] >= 0) { ctx.moveTo(v.X(ox), v.pad.t); ctx.lineTo(v.X(ox), v.h - v.pad.b) } ctx.stroke();
  ctx.font = '11px "Microsoft YaHei",sans-serif'; ctx.fillStyle = C.mute; ctx.textAlign = 'center';
  for (const t of ticks) { const px = v.X(t); if (px < v.pad.l - 1 || px > v.w - v.pad.r + 1) continue; ctx.fillText(String(t), px, v.h - 6) }
  ctx.textAlign = 'right'; for (const t of yticks) ctx.fillText(String(t), v.pad.l - 5, v.Y(t) + 4);
  ctx.restore();
}
/** 屏幕上的 TeX 标签层：labels.set(id, tex, x, y, {color, dx, dy, alpha}) 每帧调用，未更新的自动隐藏。 */
export function labels(host) {
  host.style.position = 'relative'; host.style.overflow = 'hidden'; const layer = document.createElement('div'); layer.style.cssText = 'position:absolute;inset:0;pointer-events:none';
  host.appendChild(layer); const map = new Map(); let seen = new Set();
  return { set(id, tex, x, y, { color = C.ink, dx = 0, dy = 0, alpha = 1, size = 14 } = {}) {
      let e = map.get(id); if (!e) { e = document.createElement('span'); e.style.cssText = `position:absolute;white-space:nowrap;transform:translate(-50%,-50%);font-size:${size}px;transition:opacity .25s`; layer.appendChild(e); map.set(id, e) }
      if (e.dataset.t !== tex) { katex.render(tex, e, { throwOnError: false }); e.dataset.t = tex } e.style.color = color;
      e.style.left = (x + dx) + 'px'; e.style.top = (y + dy) + 'px'; e.style.opacity = alpha; seen.add(id) },
    end() { for (const [id, e] of map) if (!seen.has(id)) e.style.opacity = 0; seen = new Set() } };
}
/** 逐步播放器：每步 dur 秒的动画进度 p∈[0,1]；手动操作即暂停。nav 为放按钮的容器。 */
export function stepper(nav, { count, dur = 1.6, hold = .5, onChange = () => {}, kick = () => {} }) {
  nav.innerHTML = '<button type="button" data-a="first" aria-label="回到开始">↺</button><button type="button" data-a="prev" aria-label="上一步">◀</button><span class="ct"></span><button type="button" data-a="next" aria-label="下一步">▶</button><button type="button" data-a="play" class="play" aria-pressed="false">Play</button>';
  const q = a => nav.querySelector(`[data-a="${a}"]`), ct = nav.querySelector('.ct');
  const s = { i: 0, p: 1, playing: false, wait: 0, count };
  const sync = () => { ct.textContent = `${s.i} / ${s.count - 1}`; q('first').disabled = q('prev').disabled = s.i === 0; q('next').disabled = s.i >= s.count - 1;
    q('play').textContent = s.playing ? 'Pause' : 'Play'; q('play').setAttribute('aria-pressed', String(s.playing)) };
  const go = (i, animate) => { s.i = clamp(i, 0, s.count - 1); s.p = animate ? 0 : 1; s.wait = 0; sync(); onChange(s); kick() };
  const stop = () => { s.playing = false; sync() };
  q('first').onclick = () => { stop(); go(0, false) }; q('prev').onclick = () => { stop(); go(s.i - 1, false) }; q('next').onclick = () => { stop(); go(s.i + 1, true) };
  q('play').onclick = () => { if (s.playing) { stop(); return } if (s.i >= s.count - 1) go(0, false); s.playing = true; s.wait = hold; sync(); kick() };
  addEventListener('keydown', e => { if (e.target.type === 'range') return; if (e.key === 'ArrowRight') { stop(); go(s.i + 1, true) } if (e.key === 'ArrowLeft') { stop(); go(s.i - 1, false) } });
  document.addEventListener('visibilitychange', () => { if (document.hidden) stop() });
  s.tick = dt => { let moving = false;
    if (s.p < 1) { s.p = Math.min(1, s.p + dt / dur); moving = true }
    else if (s.playing) { if (s.i >= s.count - 1) stop(); else { s.wait -= dt; if (s.wait <= 0) { s.wait = hold; go(s.i + 1, true) } moving = true } }
    return moving || s.playing };
  s.reset = n => { s.count = n; go(0, false) }; s.stop = stop; s.go = go; sync(); return s;
}
export function reportHeight(el) {
  const send = () => parent.postMessage({ type: 'runge-height', height: Math.ceil(el.getBoundingClientRect().height) }, location.origin);
  new ResizeObserver(send).observe(el); addEventListener('load', send);
}
/** 统一的页面样式（与 matrix-steps / quad-steps / approx 一致）。 */
export const CSS = `*{box-sizing:border-box}body{margin:0;background:#fbfbfa;color:#161820;font:14px/1.6 "Microsoft YaHei",sans-serif}
main{padding:8px 2px 6px}.controls{display:flex;align-items:center;justify-content:center;gap:14px;margin-bottom:6px;flex-wrap:wrap}
.controls .n{flex:none;min-width:70px;text-align:right}.controls input[type=range]{flex:1;max-width:320px;min-width:120px;accent-color:#223056;min-height:30px}
.top{display:flex;flex-wrap:wrap;gap:6px;justify-content:center;margin-bottom:8px}
.top button,.tg{font:inherit;font-size:13px;border:1px solid #223056;border-radius:4px;color:#223056;padding:3px 12px;background:transparent;cursor:pointer}
.top button[aria-pressed="true"],.tg[aria-pressed="true"]{background:#223056;color:#fff}
.stage{position:relative}canvas{display:block;width:100%;height:330px;touch-action:pan-y}
.fx{margin:6px auto 0;max-width:760px;min-height:40px;display:flex;flex-direction:column;align-items:center;gap:6px;font-size:15px}
.fx>div{max-width:100%;overflow-x:auto;overflow-y:hidden;padding:2px 4px}
.legend{display:flex;flex-wrap:wrap;gap:4px 18px;justify-content:center;align-items:center;margin-top:4px}
.key:before{content:"";display:inline-block;width:20px;border-top:2.4px solid var(--c,#223056);margin:0 6px 4px 0}.key.dash:before{border-top-style:dashed}
.nav{display:flex;align-items:center;justify-content:center;gap:12px;margin-top:8px}
.nav button{width:44px;height:36px;border:1px solid #223056;border-radius:6px;background:transparent;color:#223056;font-size:18px;cursor:pointer;line-height:1}
.nav button:disabled{opacity:.3;cursor:default}.nav button.play{width:auto;padding:0 14px;font-size:14px}.nav button.play[aria-pressed="true"]{background:#223056;color:#fff}
.nav .ct{min-width:64px;text-align:center;color:#4f525b;font-variant-numeric:tabular-nums}
button:focus-visible,input:focus-visible{outline:2px solid #223056;outline-offset:2px}
@media(max-width:520px){canvas{height:270px}.fx{font-size:13px}.nav{gap:8px}}`;
export function style() { const s = document.createElement('style'); s.textContent = CSS; document.head.prepend(s) }
/** 角落小地图（逐步放大细节的配套）：B 为全局视窗；paint(mx,my,ctx) 画内容；自动画出当前镜头框。
 *  alpha 由调用方缓动（放大后渐显）；corner: 'tl' | 'tr' | 'bl' | 'br'。 */
export function minimap(ctx, v, { B, paint, alpha = 1, corner = 'tl', frac = .3, aspect = .62 }) {
  if (alpha <= .01) return;
  const W = Math.min(150, v.w * frac), H = W * aspect, ox = corner[1] === 'l' ? 14 : v.w - W - 14, oy = corner[0] === 't' ? 10 : v.h - H - 10;
  const mx = x => ox + (x - B[0]) / (B[1] - B[0]) * W, my = y => oy + (B[3] - y) / (B[3] - B[2]) * H;
  ctx.save(); ctx.globalAlpha = alpha; ctx.fillStyle = 'rgba(251,251,250,.94)'; ctx.strokeStyle = C.faint; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.roundRect(ox - 4, oy - 4, W + 8, H + 8, 6); ctx.fill(); ctx.stroke();
  ctx.beginPath(); ctx.rect(ox, oy, W, H); ctx.clip(); paint(mx, my, ctx);
  const x0 = clamp(mx(v.b[0]), ox, ox + W), x1 = clamp(mx(v.b[1]), ox, ox + W), y0 = clamp(my(v.b[3]), oy, oy + H), y1 = clamp(my(v.b[2]), oy, oy + H);
  const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2, rw = Math.max(4, x1 - x0), rh = Math.max(4, y1 - y0);
  ctx.globalAlpha = alpha; ctx.strokeStyle = C.hl; ctx.lineWidth = 1.2; ctx.strokeRect(cx - rw / 2, cy - rh / 2, rw, rh); ctx.restore();
}
/** 画一条函数曲线到小地图坐标 */
export function mapCurve(ctx, mx, my, f, x0, x1, { color = C.accent, width = 1.4, n = 90 } = {}) {
  const pts = []; for (let k = 0; k <= n; k++) { const x = x0 + (x1 - x0) * k / n; pts.push([mx(x), my(f(x))]) } path(ctx, pts, { color, width });
}
/** 弹簧趋近（略带回弹，比指数趋近更有“手感”）：速度存在 obj[key+'$v']。返回是否仍在运动。 */
export function spring(obj, key, target, dt, { k = 120, z = .72 } = {}) {
  const vk = key + '$v'; let x = obj[key] ?? target, v = obj[vk] || 0; const c = 2 * z * Math.sqrt(k);
  for (let s = 0, n = Math.max(1, Math.ceil(dt / .008)); s < n; s++) { const h = dt / n; v += (-k * (x - target) - c * v) * h; x += v * h }
  if (Math.abs(x - target) < 1e-5 * (1 + Math.abs(target)) && Math.abs(v) < 1e-4) { x = target; v = 0 }
  obj[key] = x; obj[vk] = v; return v !== 0 || x !== target;
}
/** 竖直渐变填充色：从 y0（不透明度 a0）到 y1（不透明度 a1）。 */
export function vgrad(ctx, y0, y1, hex, a0, a1) { const g = ctx.createLinearGradient(0, y0, 0, y1); g.addColorStop(0, rgba(hex, a0)); g.addColorStop(1, rgba(hex, a1)); return g }
/** 拖动柄：圆角小胶囊，hover/drag 时放大。 */
export function grip(ctx, x, y, { color = C.accent, s = 1, w = 8, h = 22 } = {}) {
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s); ctx.beginPath(); ctx.roundRect(-w / 2, -h / 2, w, h, w / 2);
  ctx.fillStyle = C.bg; ctx.fill(); ctx.lineWidth = 1.6; ctx.strokeStyle = color; ctx.stroke();
  ctx.beginPath(); ctx.moveTo(0, -h / 4); ctx.lineTo(0, h / 4); ctx.lineWidth = 1.2; ctx.stroke(); ctx.restore();
}
