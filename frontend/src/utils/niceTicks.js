/** 在 [lo, hi] 里取大约 count 个「整齐」的刻度值（步长为 1、2、5 × 10^k）。 */
export function niceTicks(lo, hi, count = 4) {
  const span = hi - lo
  if (!(span > 0) || !Number.isFinite(span)) return []
  const raw = span / Math.max(1, count)
  const power = 10 ** Math.floor(Math.log10(raw))
  const unit = raw / power
  const step = (unit >= 5 ? 5 : unit >= 2 ? 2 : 1) * power
  const ticks = []
  const start = Math.ceil(lo / step - 1e-9) * step
  for (let value = start; value <= hi + step * 1e-9; value += step) {
    ticks.push(Math.round(value / step) * step)
    if (ticks.length > 50) break
  }
  return ticks
}
