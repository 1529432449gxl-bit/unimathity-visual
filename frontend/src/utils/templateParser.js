import { ASIDE_KEYS, normalizeAsideSize, normalizeAsideType } from './asideSpec'

// 正文里标记小插图位置的占位行。AsideFlow 按它把 Markdown 切段，
// 把插图浮动在对应位置的右侧。
export const ASIDE_MARKER = /^@@aside:(\d+)@@$/

function splitBar(text) {
  const index = text.indexOf('|')
  return index < 0 ? [text.trim(), ''] : [text.slice(0, index).trim(), text.slice(index + 1).trim()]
}

function splitFields(text) {
  return String(text || '')
    .split('|')
    .map((field) => field.trim())
}

function parseListField(text) {
  return String(text || '')
    .split(/[,，、]/)
    .map((item) => item.trim())
    .filter(Boolean)
}

function parseConfigBlock(text) {
  const config = {}
  String(text || '')
    .split(/\r?\n/)
    .forEach((line) => {
      const match = line.match(/^([a-zA-Z][\w-]*)\s*:\s*(.*?)\s*$/)
      if (match) config[match[1]] = match[2]
    })
  return config
}

function commandFrom(line) {
  const match = line.match(/^@([a-z-]+)\s*(.*)$/i)
  if (!match) return null
  return { name: match[1].toLowerCase(), args: match[2] || '' }
}

export function parseTemplate(source, fallbackTitle = '未命名内容') {
  const normalizedSource = String(source || '')
  const page = {
    chapter: null,
    section: { id: 'lesson-section', num: '', title: fallbackTitle },
    subsections: [],
  }

  let currentSub = null
  let currentItem = null
  let currentField = null
  let lastItem = null
  let id = 0
  // @tikz 的序号：后端按同样的顺序返回编译好的 SVG，两边靠这个下标对齐。
  let tikzCount = 0
  // 正在收集配置行的 @aside（紧跟在指令后的 `key: value` 行）。
  let collectingAside = null

  const nextId = (prefix) => `${prefix}-${++id}`
  const ensureSub = () => {
    if (!currentSub) {
      currentSub = { id: nextId('sub'), num: '', title: '正文', implicit: true, items: [] }
      page.subsections.push(currentSub)
    }
    return currentSub
  }
  const finishField = () => {
    if (currentItem && currentField) {
      currentItem[currentField] = trimBlank(currentItem[currentField] || '')
    }
    currentItem = null
    currentField = null
  }
  const addItem = (item, field = 'body') => {
    finishField()
    ensureSub().items.push(item)
    currentItem = item
    currentField = field
    lastItem = item
  }

  normalizedSource.split(/\r?\n/).forEach((line) => {
    if (collectingAside) {
      const match = line.match(/^\s*([a-zA-Z][a-zA-Z0-9]*)\s*:\s*(.*?)\s*$/)
      if (match && ASIDE_KEYS.includes(match[1].toLowerCase())) {
        const key = match[1].toLowerCase()
        if (key === 'src') collectingAside.src = match[2]
        else if (key === 'alt') collectingAside.alt = match[2]
        else collectingAside.lines.push({ key, value: match[2] })
        return
      }
      collectingAside = null
    }

    const command = commandFrom(line)
    if (!command) {
      if (currentItem && currentField) {
        currentItem[currentField] = `${currentItem[currentField] || ''}${line}\n`
      }
      return
    }

    // @aside 小插图 | 标题 | 图注 | 尺寸 | 图片地址
    // 插在当前正在书写的字段（题面、解析、定理正文……）里，不结束这个字段，
    // 所以写在解析中间时，后面的文字仍属于同一段解析。
    if (command.name === 'aside') {
      const [rawType, title, caption, size, src] = splitFields(command.args)
      const flowKinds = ['text', 'problem', 'def', 'theorem', 'corollary', 'proposition', 'lemma', 'property']
      if (!currentItem || !currentField || !flowKinds.includes(currentItem.kind)) {
        addItem({ id: nextId('text'), kind: 'text', title: '', body: '' })
      }
      const type = normalizeAsideType(rawType)
      const asides = (currentItem.asides ||= {})
      const list = (asides[currentField] ||= [])
      const aside = {
        id: nextId('aside'),
        type: type || 'image',
        rawType,
        title: title || '',
        caption: caption || '',
        size: normalizeAsideSize(size),
        src: src || '',
        alt: '',
        lines: [],
        error: type ? '' : `未知的小插图类型「${rawType}」，可用 image / plane / space`,
      }
      currentItem[currentField] = `${currentItem[currentField] || ''}\n@@aside:${list.length}@@\n\n`
      list.push(aside)
      collectingAside = aside
      return
    }

    finishField()

    if (command.name === 'chapter') {
      const [num, title] = splitBar(command.args)
      page.chapter = { num, title }
      return
    }

    if (command.name === 'section') {
      const [num, title] = splitBar(command.args)
      page.section = { id: nextId('section'), num, title: title || fallbackTitle }
      return
    }

    if (command.name === 'subsection') {
      const [num, title] = splitBar(command.args)
      currentSub = { id: nextId('sub'), num, title, items: [] }
      page.subsections.push(currentSub)
      return
    }

    if (command.name === 'solution') {
      if (lastItem) {
        currentItem = lastItem
        currentItem.solutionLabel = command.args.trim() || defaultSolutionLabel(lastItem.kind)
        currentItem.solution = ''
        currentField = 'solution'
      }
      return
    }

    if (command.name === 'image' || command.name === 'figure') {
      const [title, src, caption, alt, width] = splitFields(command.args)
      ensureSub().items.push({
        id: nextId('figure'),
        kind: 'figure',
        title,
        src,
        caption,
        alt,
        width: width || 'wide',
      })
      return
    }

    if (command.name === 'interactive-sine') {
      const [title, desc] = splitBar(command.args)
      ensureSub().items.push({ id: nextId('ix'), kind: 'interactive-sine', title, desc })
      return
    }

    if (command.name === 'interactive') {
      const [first, second, third] = splitFields(command.args)
      const type = String(first || '').toLowerCase()
      const knownTypes = ['sine', 'function', 'geogebra', 'desmos', 'tabular', 'riemann', 'darboux', 'showcase', 'interpolation']

      if (knownTypes.includes(type)) {
        const kind = type === 'sine'
          ? 'interactive-sine'
          : type === 'function'
            ? 'interactive-function'
            : type === 'tabular'
              ? 'interactive-tabular'
              : type === 'riemann'
                ? 'interactive-riemann'
                : type === 'darboux'
                  ? 'interactive-darboux'
                  : type === 'showcase'
                    ? 'interactive-showcase'
                    : 'interactive-embed'

        addItem({
          id: nextId('ix'),
          kind,
          interactiveType: type,
          title: second || defaultInteractiveTitle(type),
          desc: third || '',
          body: '',
        })
        return
      }

      const [title, desc] = splitBar(command.args)
      addItem({ id: nextId('ix'), kind: 'interactive', title, desc, body: '' })
      return
    }

    if (command.name === 'video') {
      const [title, src, desc, poster, previewOrAccess, accessField] = splitFields(command.args)
      const previewIsAccess = ['member', 'free'].includes(String(previewOrAccess || '').toLowerCase())
      ensureSub().items.push({
        id: nextId('video'),
        kind: 'video',
        title,
        src,
        desc,
        poster,
        previewSeconds: previewIsAccess ? 0 : Number(previewOrAccess) || 0,
        access: previewIsAccess
          ? previewOrAccess.toLowerCase()
          : String(accessField || '').toLowerCase(),
      })
      return
    }

    const blockKinds = ['def', 'theorem', 'corollary', 'proposition', 'lemma', 'property']
    if (blockKinds.includes(command.name)) {
      const [num, title] = splitBar(command.args)
      addItem({ id: nextId(command.name), kind: command.name, num, title, body: '' })
      return
    }

    if (command.name === 'problem') {
      const [title, type, difficulty, knowledge, tags] = splitFields(command.args)
      addItem({
        id: nextId('problem'),
        kind: 'problem',
        title: title || '训练',
        problemType: type || '计算题',
        difficulty: difficulty || '基础',
        knowledge: parseListField(knowledge),
        tags: parseListField(tags),
        body: '',
      })
      return
    }

    if (command.name === 'table') {
      const [title, desc] = splitBar(command.args)
      addItem({ id: nextId('table'), kind: 'table', title, desc, body: '' })
      return
    }

    if (command.name === 'code') {
      const [title, lang, desc] = splitFields(command.args)
      addItem({ id: nextId('code'), kind: 'code', title, lang, desc, body: '' })
      return
    }

    // @tikz 标题 | 图注 | 宽度
    // 指令行之后、下一条 @ 指令之前的所有内容都是 TikZ 源码，
    // 取法和 @code / @table 一致。正文里存的永远是源码，
    // 页面上显示的 SVG 由后端预编译后随接口下发。
    if (command.name === 'tikz') {
      const [title, caption, width] = splitFields(command.args)
      addItem({
        id: nextId('tikz'),
        kind: 'tikz',
        title: title || '图形',
        caption: caption || '',
        width: width || 'wide',
        tikzIndex: tikzCount,
        body: '',
      })
      tikzCount += 1
      return
    }

    if (command.name === 'text' || command.name === 'markdown') {
      addItem({ id: nextId('text'), kind: 'text', title: command.args.trim(), body: '' })
    }
  })

  finishField()
  // 没写编号的 @subsection 补成「节编号.序号」，与后端目录接口（content/numbering.py）同一条规则，
  // 这样侧边目录里的 Sub 编号和页面里的小节标题始终对得上。
  let subIndex = 0
  page.subsections.forEach((sub) => {
    if (sub.implicit || !sub.title) return
    subIndex += 1
    if (!sub.num && page.section.num) sub.num = `${page.section.num}.${subIndex}`
  })
  page.subsections.forEach((sub) => {
    sub.items.forEach((item) => {
      if (item.body && item.kind.startsWith('interactive')) {
        item.config = parseConfigBlock(item.body)
      }
    })
  })

  if (!page.subsections.length) {
    page.subsections.push({
      id: nextId('sub'),
      num: '',
      title: '正文',
      implicit: true,
      items: [{ id: nextId('text'), kind: 'text', title: '', body: normalizedSource }],
    })
  }

  return page
}

export function trimBlank(text) {
  return String(text || '').replace(/^\n+/, '').replace(/\n+$/, '')
}

function defaultSolutionLabel(kind) {
  return ['theorem', 'corollary', 'proposition', 'lemma', 'property'].includes(kind) ? '证明' : '解析'
}

function defaultInteractiveTitle(type) {
  const titles = {
    sine: '正弦曲线交互',
    function: '函数图像交互',
    geogebra: 'GeoGebra 几何演示',
    desmos: 'Desmos 函数图像',
    tabular: 'Tabular integration',
    riemann: 'Riemann sum',
    darboux: 'Darboux sums',
    showcase: '数值分析的应用场景',
    interpolation: '插值演示',
  }
  return titles[type] || '交互模块'
}
