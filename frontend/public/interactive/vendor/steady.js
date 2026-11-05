// steady.js：消除逐步演示的界面抖动。
// Steady.sweep(els, n, go, back)：加载时把 n 步依次排一遍，量出各区域最大高度并锁定为 min-height。
// Steady.hold(...els)：高度只增不减，兜住滑块、切换算法等预排不到的情况。
window.Steady = {
  sweep(els, n, go, back) {
    els = els.filter(Boolean); const m = els.map(() => 0);
    for (let i = 0; i < n; i++) { go(i); els.forEach((e, k) => { m[k] = Math.max(m[k], e.getBoundingClientRect().height) }) }
    back(); els.forEach((e, k) => { e.style.minHeight = Math.ceil(m[k]) + 'px' });
  },
  hold(...els) {
    els.filter(Boolean).forEach(e => { let m = 0; new ResizeObserver(() => { const h = e.getBoundingClientRect().height; if (h > m + .5) { m = h; e.style.minHeight = Math.ceil(m) + 'px' } }).observe(e) });
  },
};
