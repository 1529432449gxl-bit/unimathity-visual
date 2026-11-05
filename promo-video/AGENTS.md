# Unimathity 宣传片模块库：给 agent 的复用说明

这是用 Remotion 4（React + TypeScript）写的视频工程。整片由许多**独立模块**拼成，模块之间只通过 props 通信。
任何 agent 都可以复用这些模块：直接渲染、改文案后渲染，或者用新的时间线拼出新短片。

## 一分钟上手

```bash
cd promo-video
npm install
npm run studio                       # 浏览器里预览、拖时间轴、改 props
npm run render                       # 渲染 60 秒主片 → out/UnimathityPromo.mp4
npm run render -- Section-Pain out/pain.mp4          # 只渲染一段
npm run render -- Mod-PainPhoto out/pain-photo.mp4   # 只渲染一个模块
npm run render -- UnimathityPromo out/custom.mp4 --props=examples/short-showcase-15s.json  # 自定义时间线
npm run list                         # 列出全部合成
```

本机没有 Remotion 自带的 Chrome 时，设置 `REMOTION_BROWSER=/path/to/chrome` 再渲染。

## 合成（composition）一览

| 合成 id | 内容 |
|---|---|
| `UnimathityPromo` | 60 秒主片：痛点 → 网站介绍 → 成果展示 → 收尾，带配乐 |
| `Section-Pain` / `Section-Intro` / `Section-Showcase` | 三段独立短片，各带对应段落的配乐 |
| `Mod-<模块 id>` | 单个模块，按默认 props 渲染，便于预览与单独导出 |
| `Viz-<画面 id>` | 单个数学画面，4 秒 |

`UnimathityPromo` 与各 `Section-*` 都接受同一种 props，所以用 `--props` 传入任意时间线就能出新视频：

```json
{
  "items": [
    {"module": "PainHook", "bars": 1, "transition": "none", "props": {"lines": ["期末周，", "你还在死记公式？"]}},
    {"module": "VizShowcase", "bars": 1, "props": {"viz": "riemann"}}
  ],
  "music": true,
  "musicFromBar": 0
}
```

- `bars`：时长，以小节计（1 小节 = 4 拍 = 2 秒）；也可以写 `beats`（1 拍 = 0.5 秒）。切点都落在拍上，画面和音乐自然对齐。
- `transition`：模块开头的转场，可选 `flash`（默认）、`punch`、`glitch`、`slide`、`none`。
- `props`：覆盖模块默认值；没写的项沿用默认。
- `musicFromBar`：配乐从第几小节开始播。痛点段 0、介绍段 8、展示段 18、收尾 28。

## 照片位

痛点段的照片位（`PhotoSlot`）按**槽位名**取图：把照片命名为槽位名放进 `public/photos/`，例如
`public/photos/pain-01.jpg`。`npm run studio` 和 `npm run render` 会自动扫描登记，不用改代码；没放的槽位显示占位框。
照片会统一处理成深蓝色调并缓慢推镜，任何照片放进去色调都和整片一致。

默认用到的槽位：`pain-01`～`pain-03`（三张痛点卡），`pain-04`～`pain-09`（拼贴墙），`quote-01`（学生原话卡）。
在 props 里改 `photo` / `photos` 就能指向别的槽位名。

## 目录结构

```
src/
  core/        time.ts 节拍网格 · theme.ts 配色字体 · beat.ts 拍点/进度/尺寸 hooks · types.ts 模块接口
  components/  Backdrop 背景 · SlamText 逐字砸入 · GlitchText 故障字 · Formula 公式 · Chip 标签
               PhotoSlot 照片位 · Viz 嵌入数学画面 · CutIn 转场 · FontGate 字体预加载
  viz/         数学画面库（只画图、不带文字），每个文件一个画面，在 index.ts 登记
  modules/
    pain/      第一段：学生痛点
    intro/     第二段：网站内容介绍
    showcase/  第三段：成果集中展示
  timelines/promo.ts   主片与三段的时间线（改顺序、换模块、改文案都在这里）
  Timeline.tsx         把时间线条目拼成视频
  registry.ts          汇总三个模块族
  Root.tsx             注册所有合成
scripts/
  make-music.mjs  纯 Node 合成配乐（120 BPM，段落边界见文件顶部 SECTIONS）
  scan-photos.mjs 扫描 public/photos 生成照片登记表
  render.mjs      渲染封装
```

## 新增一个模块

1. 在对应目录新建 `MyModule.tsx`，根节点 `<AbsoluteFill>`，最底层垫 `<Backdrop/>`。
2. 用 `useProgress()` 拿 0..1 的进度 `t`，用 `useBeat().pulse` 做随拍的动作，模块放在任何时长里都成立。
3. 所有文字写进 `defaults`，以便改文案、预加载字体。
4. 在该目录 `index.ts` 里用 `defineModule({...})` 登记，`Mod-MyModule` 合成会自动出现。

## 新增一个数学画面

在 `src/viz/` 新建文件，组件签名 `({w, h, t, frame}) => <svg …/>`：透明背景，随 `t` 推进，随 `frame` 做微动；
在 `src/viz/index.ts` 的 `VIZ` 里登记 `{id, title, course, formula, component}`。所有用 `viz` 参数的模块都能直接用它。

## 视觉规矩

- 颜色只用 `theme.ts` 的 `C`：深色底，浅蓝主线，橙色强调，灰色次要，深蓝面板。
- 字体：中文 Noto Sans SC，英文和数字 Space Grotesk，等宽 JetBrains Mono，公式 KaTeX。
- 数学画面上不放说明小字和数值读数；不编造用户数据或调查百分比。
- 画面完全由帧号决定，随机数用 `random(seed)`，保证每次渲染一致。

## 模块目录

见下方「模块清单」（随模块增减更新）。

<!-- MODULE-CATALOG -->
