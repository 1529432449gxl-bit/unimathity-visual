// lasteps.js：线性代数逐步演示的共用层（矩阵格子 + 公式区 + 播放条），配合 KaTeX 使用，无其他依赖。
// 用法：LAS.run({ steps, interval })，steps[i] = { mats:[...], hi:[[key,i,j,cls]], lines:[tex] }。
//   mats 的元素：{ key, label, cells:[[tex]], aug:列号（其左画竖虚线）, hsep:行号（其上画横虚线）, det:true 画行列式竖线, tint:[[cls]] }
//   或 { key, sym: tex } 表示矩阵之间的符号（=、→、乘号等）；{ key, br: true } 强制换行。
//   高亮 cls：s 引用项（深蓝框）、t 更新项（橙框）、p 已处理（浅蓝灰底）、d 淡化。tint：k1 深蓝块、k2 浅蓝块、k3 橙块、k0 灰块。
// 同一结构的相邻两步原地更新：底色缓变，内容变化的格子淡入；结构变化时整体淡入。加载时预排全部步骤，锁定列宽与各区高度。
(function () {
  const CSS = `*{box-sizing:border-box}body{margin:0;background:#fbfbfa;color:#161820;font:14px/1.6 "Microsoft YaHei",sans-serif}
main{padding:10px 2px 6px}
.mats{display:flex;flex-wrap:wrap;gap:14px 14px;justify-content:center;align-items:center}
.mats.fade{animation:lasf .45s ease}
@keyframes lasf{from{opacity:.15}to{opacity:1}}
.mat{display:flex;flex-direction:column;align-items:center;gap:2px}
.mat .lab{font-size:15px;min-height:26px;display:flex;align-items:flex-end}
.sym{font-size:17px;padding:0 2px;align-self:center;margin-top:26px}
.grid{display:grid;gap:3px;padding:4px 8px;position:relative}
.grid:before,.grid:after{content:"";position:absolute;top:0;bottom:0;width:7px;border:1.6px solid #4f525b}
.grid:before{left:0;border-right:0}.grid:after{right:0;border-left:0}
.grid.det:before,.grid.det:after{width:0;border:0;border-left:1.6px solid #4f525b}
.cell{min-width:var(--cw,44px);height:var(--ch,34px);padding:0 4px;display:flex;align-items:center;justify-content:center;border-radius:5px;font-size:14px;white-space:nowrap;transition:background .35s,box-shadow .35s,color .35s}
.cell.fresh>span{animation:lasf .5s ease}
.cell.vsep{margin-left:9px;position:relative}.cell.vsep:before{content:"";position:absolute;left:-7px;top:-2px;bottom:-2px;border-left:1.4px dashed #9a9da5}
.cell.hsep{margin-top:7px;position:relative}.cell.hsep:after{content:"";position:absolute;top:-6px;left:-2px;right:-2px;border-top:1.4px dashed #9a9da5}
.cell.z{color:#b3b5bc}.cell.zero{color:#9a9da5}
.cell.k1{background:#e4e7f0}.cell.k2{background:#e3edf2}.cell.k3{background:#f6eadf}.cell.k0{background:#f1f1ef}
.cell.s{box-shadow:inset 0 0 0 2px #223056;background:#eeeff4}
.cell.t{background:#f3e3d2;box-shadow:inset 0 0 0 2px #b5763a;color:#161820}
.cell.p{background:#eeeff4}
.cell.d{color:#c9cbd1}
.fx{margin:12px auto 0;max-width:780px;display:flex;flex-direction:column;align-items:center;justify-content:flex-start;gap:4px;font-size:16px}
.fx.fade{animation:lasf .45s ease}
.fx .katex-display{margin:0}.fx .l{max-width:100%;overflow-x:auto;overflow-y:hidden;padding:2px 4px}
.nav{display:flex;align-items:center;justify-content:center;gap:12px;margin-top:10px}
.nav button{width:44px;height:36px;border:1px solid #223056;border-radius:6px;background:transparent;color:#223056;font-size:18px;cursor:pointer;line-height:1}
.nav button:disabled{opacity:.3;cursor:default}.nav button.play{width:auto;padding:0 14px;font-size:14px}.nav button.play[aria-pressed="true"]{background:#223056;color:#fff}
.nav .ct{min-width:64px;text-align:center;color:#4f525b;font-variant-numeric:tabular-nums}
button:focus-visible{outline:2px solid #223056;outline-offset:2px}
@media(max-width:560px){.cell{--cw:34px;--ch:30px;font-size:12px;padding:0 2px}.grid{gap:2px;padding:3px 6px}.mats{gap:10px 8px}.fx{font-size:13px}.sym{font-size:15px}}`;
  const K = (el, s, d) => katex.render(s, el, { throwOnError: false, displayMode: !!d });

  function run(o) {
    const steps = o.steps, interval = o.interval || 1600;
    const st = document.createElement('style'); st.textContent = CSS; document.head.prepend(st);
    const main = document.querySelector('main') || document.body.appendChild(document.createElement('main'));
    main.innerHTML = '<div class="mats"></div><div class="fx"></div><div class="nav"><button type="button" data-a="first" aria-label="回到开始">↺</button><button type="button" data-a="prev" aria-label="上一步">◀</button><span class="ct"></span><button type="button" data-a="next" aria-label="下一步">▶</button><button type="button" data-a="play" class="play" aria-pressed="false">Play</button></div>';
    const matsEl = main.querySelector('.mats'), fx = main.querySelector('.fx'), ct = main.querySelector('.ct');
    const q = a => main.querySelector(`[data-a="${a}"]`);
    let cur = 0, sig = '', fxSig = '', built = {}, widths = {};

    const signature = s => s.mats.map(m => m.br ? 'br' + m.key : m.sym !== undefined ? 'y' + m.key : m.key + ':' + m.cells.length + 'x' + m.cells[0].length + ':' + (m.aug ?? '') + ':' + (m.hsep ?? '')).join('|');
    function build(s) {
      matsEl.innerHTML = ''; built = {};
      for (const m of s.mats) {
        if (m.br) { const e = document.createElement('div'); e.style.cssText = 'flex-basis:100%;height:0'; matsEl.append(e); built[m.key] = { br: 1 }; continue }
        if (m.sym !== undefined) { const e = document.createElement('div'); e.className = 'sym'; matsEl.append(e); built[m.key] = { sym: e, t: null }; continue }
        const box = document.createElement('div'); box.className = 'mat';
        const lab = document.createElement('div'); lab.className = 'lab';
        const g = document.createElement('div'); g.className = 'grid' + (m.det ? ' det' : '');
        g.style.gridTemplateColumns = `repeat(${m.cells[0].length},auto)`;
        const cells = m.cells.map((r, i) => r.map((_, j) => { const d = document.createElement('div'); d.className = 'cell'; const sp = document.createElement('span'); d.append(sp); g.append(d); return { d, sp, t: null } }));
        box.append(lab, g); matsEl.append(box); built[m.key] = { lab, cells, labT: null };
      }
    }
    function render(animate) {
      const s = steps[cur], sg = signature(s);
      if (sg !== sig) { build(s); sig = sg; if (animate) { matsEl.classList.remove('fade'); void matsEl.offsetWidth; matsEl.classList.add('fade') } }
      const hm = {}; (s.hi || []).forEach(([k, i, j, c]) => { hm[k + ',' + i + ',' + j] = c });
      for (const m of s.mats) {
        const b = built[m.key]; if (m.br) continue;
        if (m.sym !== undefined) { if (b.t !== m.sym) { K(b.sym, m.sym); b.t = m.sym } continue }
        const lab = m.label || ''; if (b.labT !== lab) { K(b.lab, lab); b.labT = lab }
        m.cells.forEach((r, i) => r.forEach((tx, j) => {
          const c = b.cells[i][j]; tx = tx ?? '';
          let cls = 'cell';
          if (m.aug !== undefined && j === m.aug) cls += ' vsep';
          if (m.hsep !== undefined && i === m.hsep) cls += ' hsep';
          if (/dots/.test(tx)) cls += ' z'; else if (tx === '0' || tx === 'O') cls += ' zero';
          const tn = m.tint && m.tint[i] && m.tint[i][j]; if (tn) cls += ' ' + tn;
          const h = hm[m.key + ',' + i + ',' + j]; if (h) cls += ' ' + h;
          if (c.t !== tx) { K(c.sp, tx); if (animate && c.t !== null) { c.d.classList.remove('fresh'); void c.d.offsetWidth; cls += ' fresh' } c.t = tx }
          else if (c.d.classList.contains('fresh')) cls += ' fresh';
          const w = widths[m.key + ',' + j]; if (w) c.d.style.minWidth = w + 'px';
          c.d.className = cls;
        }));
      }
      const fs = (s.lines || []).join('\u0001');
      if (fs !== fxSig) { fx.innerHTML = ''; (s.lines || []).forEach(t => { const d = document.createElement('div'); d.className = 'l'; K(d, t, true); fx.append(d) }); fxSig = fs; if (animate) { fx.classList.remove('fade'); void fx.offsetWidth; fx.classList.add('fade') } }
      ct.textContent = `${cur} / ${steps.length - 1}`;
      q('first').disabled = q('prev').disabled = cur === 0; q('next').disabled = cur === steps.length - 1;
    }
    // 预排：量出每个矩阵每一列的最大宽度、各区最大高度并锁定
    function sweep() {
      widths = {}; matsEl.style.minHeight = ''; fx.style.minHeight = '';
      const keep = cur; let hm = 0, hf = 0;
      for (let i = 0; i < steps.length; i++) {
        cur = i; render(false);
        for (const m of steps[i].mats) { if (m.sym !== undefined || m.br) continue; built[m.key].cells.forEach(r => r.forEach((c, j) => { c.d.style.minWidth = ''; const k = m.key + ',' + j; widths[k] = Math.max(widths[k] || 0, Math.ceil(c.d.getBoundingClientRect().width)) })) }
      }
      for (let i = 0; i < steps.length; i++) { cur = i; sig = ''; render(false); hm = Math.max(hm, matsEl.getBoundingClientRect().height); hf = Math.max(hf, fx.getBoundingClientRect().height) }
      matsEl.style.minHeight = Math.ceil(hm) + 'px'; fx.style.minHeight = Math.ceil(hf) + 'px';
      cur = keep; sig = ''; render(false);
    }
    const go = (v, animate) => { cur = Math.max(0, Math.min(steps.length - 1, v)); render(animate) };
    let timer = null; const pb = q('play');
    const stop = () => { clearInterval(timer); timer = null; pb.textContent = 'Play'; pb.setAttribute('aria-pressed', 'false') };
    pb.onclick = () => { if (timer) { stop(); return } if (cur >= steps.length - 1) go(0, true); pb.textContent = 'Pause'; pb.setAttribute('aria-pressed', 'true'); timer = setInterval(() => { if (cur >= steps.length - 1) { stop(); return } go(cur + 1, true); if (cur >= steps.length - 1) stop() }, interval) };
    q('next').onclick = () => { stop(); go(cur + 1, true) }; q('prev').onclick = () => { stop(); go(cur - 1, true) }; q('first').onclick = () => { stop(); go(0, true) };
    document.addEventListener('visibilitychange', () => { if (document.hidden) stop() });
    new IntersectionObserver(es => { if (!es[0].isIntersecting) stop() }).observe(main);
    addEventListener('keydown', e => { if (e.key === 'ArrowRight') { stop(); go(cur + 1, true) } if (e.key === 'ArrowLeft') { stop(); go(cur - 1, true) } });
    new ResizeObserver(() => parent.postMessage({ type: 'runge-height', height: Math.ceil(main.getBoundingClientRect().height) }, location.origin)).observe(main);
    let lastW = innerWidth, rt = 0; addEventListener('resize', () => { if (Math.abs(innerWidth - lastW) < 8) return; lastW = innerWidth; clearTimeout(rt); rt = setTimeout(sweep, 150) });
    sweep(); if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => setTimeout(sweep, 30));
    window.msteps = { n: () => steps.length, go: i => go(i, false), cur: () => cur };
  }

  // n 阶一般矩阵的指标与元素：rows/cols 为指标列表，含 '\\vdots'、'\\cdots' 的位置自动成为省略号
  const isV = x => x === '\\vdots', isC = x => x === '\\cdots';
  function gen(rows, cols, f) {
    return rows.map((r, i) => cols.map((c, j) => {
      if (isV(r) && isC(c)) return '\\ddots';
      if (isV(r)) return f(r, c, i, j, 'v') ?? '\\vdots';
      if (isC(c)) return f(r, c, i, j, 'c') ?? '\\cdots';
      return f(r, c, i, j, '');
    }));
  }
  const sub = (a, b) => (a.length > 1 || b.length > 1) ? `{${a},${b}}` : `{${a}${b}}`;
  window.LAS = { run, gen, sub, K, isV, isC };
})();
