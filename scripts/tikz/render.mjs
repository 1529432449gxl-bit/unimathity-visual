/**
 * TikZ -> SVG 批量编译器。
 *
 * 由 `python manage.py render_tikz` 调用：从 stdin 读一段 JSON，逐个编译，
 * 把结果按 JSON 写回 stdout。刻意串行执行——node-tikzjax 明确说明
 * 不能并发运行多个实例，否则结果会互相污染。
 *
 * 输入： {"options": {...}, "items": [{"hash": "...", "source": "\\begin{tikzpicture}..."}]}
 * 输出： {"results": [{"hash": "...", "ok": true, "svg": "<svg .../>"}]}
 */

import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)

function fail(message) {
  process.stdout.write(JSON.stringify({ results: [], fatal: message }))
  process.exit(1)
}

let tex2svg
try {
  const mod = await import('node-tikzjax')
  // node-tikzjax 是 CJS 包，经过 ESM 互操作后函数可能落在 default 或 default.default 上。
  tex2svg = typeof mod.default === 'function' ? mod.default : mod.default && mod.default.default
  if (typeof tex2svg !== 'function') throw new Error('node-tikzjax 没有导出可调用的 tex2svg')
} catch (err) {
  fail(
    '没有安装 node-tikzjax。请在 scripts/tikz 目录下执行 `npm install`，' +
      '详见 scripts/tikz/README.md。原始错误：' + (err && err.message),
  )
}

const raw = await new Promise((resolve, reject) => {
  let buffer = ''
  process.stdin.setEncoding('utf8')
  process.stdin.on('data', (chunk) => (buffer += chunk))
  process.stdin.on('end', () => resolve(buffer))
  process.stdin.on('error', reject)
})

let payload
try {
  payload = JSON.parse(raw)
} catch (err) {
  fail('stdin 不是合法 JSON：' + (err && err.message))
}

const options = payload.options || {}
const items = Array.isArray(payload.items) ? payload.items : []
const results = []

for (const item of items) {
  try {
    // TeX 引擎要的是完整的 document 环境；作者在正文里只写 tikzpicture，这里补上。
    const body = /\\begin\{document\}/.test(item.source)
      ? item.source
      : `\\begin{document}\n${item.source}\n\\end{document}`

    const svg = await tex2svg(body, {
      showConsole: false,
      // 刻意不用 embedFontCss：它只会往 SVG 里插一行指向 jsdelivr 的 @import，
      // 国内访问不稳。字体由 render_tikz 命令复制到 frontend/public/tikz-fonts/，
      // 和页面同源加载，浏览器还能跨图缓存。
      embedFontCss: false,
      texPackages: options.texPackages || {},
      tikzLibraries: options.tikzLibraries || '',
      addToPreamble: options.addToPreamble || '',
    })
    results.push({ hash: item.hash, ok: true, svg })
  } catch (err) {
    results.push({
      hash: item.hash,
      ok: false,
      error: (err && (err.stack || err.message)) || String(err),
    })
  }
}

process.stdout.write(JSON.stringify({ results }))
