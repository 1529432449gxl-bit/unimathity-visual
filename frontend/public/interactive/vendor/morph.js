// morph.js：让按参数重画的曲线连续变形。Morph.v(key, 数组) 返回缓动中的数组；Morph.bind(draw) 返回 kick()，
// 参数改变时调用 kick()，draw 会逐帧重画直到所有数组到位。
window.Morph = (function () {
  let dt = 1 / 60, last = 0, raf = 0, moving = false, fn = null; const store = {};
  function v(key, arr, rate = 10) {
    const t = store[key]; if (!t || t.length !== arr.length) { store[key] = arr.slice(); return store[key] }
    const k = 1 - Math.exp(-rate * dt);
    for (let i = 0; i < arr.length; i++) { const d = arr[i] - t[i]; if (Math.abs(d) > 1e-4 * (1 + Math.abs(arr[i]))) { t[i] += d * k; moving = true } else t[i] = arr[i] }
    return t;
  }
  function frame(now) { dt = last ? Math.min(.05, (now - last) / 1000) : 1 / 60; last = now; moving = false; fn(); if (moving) raf = requestAnimationFrame(frame); else { raf = 0; last = 0 } }
  return { v, s: (key, x, rate) => v(key, [x], rate)[0], bind(f) { fn = f; return () => { if (!raf) raf = requestAnimationFrame(frame) } } };
})();
