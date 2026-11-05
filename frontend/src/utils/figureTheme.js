/**
 * 小插图统一的视觉规范。平面图（SVG，经 CSS 变量）和空间图（Canvas，直接读这里）共用。
 *
 * 取自站点主色：墨绿 #223056 为主色，暖棕 #b5763a 为强调色，墨色 #161820 为线条与文字。
 *   - 区域 / 曲面：主色系；曲面按高度走「深墨绿 → 浅灰绿 → 浅沙色」的单色调色带，
 *     和平面图区域的浅绿填充是同一个色相，不再用彩虹色。
 *   - 边界曲线：墨绿深色；需要强调的线（交线、所求边界）用 color warm。
 *   - 坐标：刻度统一等宽 9px 灰字，轴名统一斜体衬线 12px。
 */

export const FIG = {
  ink: '#161820',
  inkSoft: '#4f525b',
  accent: '#223056',
  accentStrong: '#152141',
  warm: '#b5763a',
  muted: '#7a7c84',
  rule: '#c9cbd1',
  ruleSoft: '#e3e4e8',
  pane: '#f2f3f5',
  paper: '#fcfdfc',
  tickFont: '9px "JetBrains Mono", Consolas, monospace',
  axisFont: 'italic 12px "Times New Roman", "STIX Two Math", serif',
  labelFont: 'italic 11px "Times New Roman", "STIX Two Math", serif',
  curveWidth: 1.6,
  meshAlpha: 0.16,
  // 曲面高度色带：低处深、高处浅。
  ramp: [
    [23, 63, 49],
    [36, 84, 67],
    [62, 116, 94],
    [104, 151, 128],
    [154, 186, 166],
    [203, 214, 190],
    [229, 214, 176],
  ],
}

// 作者可以写的颜色名，全部落在站点色系里。
const NAMED = {
  accent: FIG.accent,
  green: FIG.accent,
  ink: FIG.ink,
  black: FIG.ink,
  warm: FIG.warm,
  orange: FIG.warm,
  brown: FIG.warm,
  sand: '#d9c08f',
  blue: '#3f6e8c',
  red: '#a4493f',
  gray: '#8e9098',
  grey: '#8e9098',
}

/** 名字或 #hex → #hex；认不出的返回空串（调用方用默认色）。 */
export function resolveColor(color) {
  const text = String(color || '').trim().toLowerCase()
  if (!text) return ''
  if (NAMED[text]) return NAMED[text]
  return /^#[0-9a-f]{3}([0-9a-f]{3})?$/.test(text) ? text : ''
}

export function hexToRgb(color) {
  let hex = resolveColor(color).replace('#', '')
  if (!hex) return null
  if (hex.length === 3) hex = [...hex].map((c) => c + c).join('')
  return [0, 2, 4].map((i) => parseInt(hex.slice(i, i + 2), 16))
}

export function rampColor(t) {
  const stops = FIG.ramp
  const x = Math.min(1, Math.max(0, t)) * (stops.length - 1)
  const i = Math.min(stops.length - 2, Math.floor(x))
  const f = x - i
  return stops[i].map((c, k) => c + (stops[i + 1][k] - c) * f)
}
