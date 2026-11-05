# TikZ 渲染器

把知识库正文里的 `@tikz` 源码编译成 SVG，结果存进数据库的 `TikzFigure` 表。

## 这套东西装在哪台机器上

**只装在你录内容的机器上**（也就是现在这台开发机）。

生产服务器**不需要 Node，也不需要 TeX Live**：图在录入侧编译好，SVG 跟着数据库走，
线上只是把存好的 SVG 发给浏览器。

## 一次性安装

```powershell
cd scripts\tikz
npm install
```

`node-tikzjax` 是纯 WebAssembly 的 TeX，装完就能用，不需要另外安装 LaTeX。

## 日常用法

在项目根目录（激活虚拟环境后）：

```powershell
python manage.py render_tikz              # 只编译新增的和上次失败的
python manage.py render_tikz --force      # 全部重新编译
python manage.py render_tikz --slug limits-sequence
python manage.py render_tikz --dry-run    # 只看要编译什么
```

**在后台改完带图的正文后，记得跑一次这个命令**，否则前台那张图会显示"尚未渲染"。

## 支持哪些宏包

默认已经启用：`amsmath`、`amssymb`、`pgfplots`、`tikz-cd`，以及一批常用 TikZ 库
（`arrows.meta`、`calc`、`positioning`、`intersections`、`angles`、`quotes`、`patterns`、
`decorations.*`、`shapes.geometric`、`through`、`backgrounds`）。

要加别的，在 `mathapp/settings.py` 里设置：

```python
TIKZ_TEX_PACKAGES = {"amsmath": "", "pgfplots": "", "circuitikz": ""}
TIKZ_LIBRARIES = "arrows.meta,calc,positioning"
TIKZ_PREAMBLE = r"\pgfplotsset{compat=1.18}"
```

改动这三项会让所有图的缓存标识变化，下次执行命令时会自动全部重编。

## 已知限制

- **图里不能写中文**。node-tikzjax 用的是 BaKoMa 字体，只覆盖拉丁字母和数学符号。
  需要中文标注的图，得换成真正的 TeX Live + XeLaTeX + 中文字体，
  那时把 `render.mjs` 换成调用 `xelatex` + `dvisvgm` 即可，
  正文里的 `@tikz` 写法和数据库结构都不用改。
- TikZ 的 `external` 库不可用。
- 一次只跑一个实例（命令内部已经是串行的，不要自己并发调用）。
