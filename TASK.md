# 云端任务：概率统计、复变函数、实变函数的可视化

本分支只放这次任务需要的材料，是网站项目 Unimathity（本地 D:\MathAPP）的一个子集，路径与本地一一对应。你只写代码、改讲义，做完推回本分支；站长在本地拉取、编译、运行。

## 工作方式

站长时间紧，只点同意，不写长回复。

1. 需要站长决定时，一律用可点击的选择题提问，推荐项放第一个并标明“推荐”，同类问题合并到一次提问。能按规范自行决定的，直接决定，写进交付说明。
2. 缺材料时主动提出，写明要哪个文件、放在本地哪个路径（例如 D:\MathAPP\content\library\reference\probability\ 下的某份 PDF），让站长一键同意后补传。
3. 提交、推送等需要授权的操作，直接发起，由站长点同意。
4. 全程中文。

## 材料位置

- 讲义：content/library/knowledge/probability、complex-analysis、real-analysis，每章若干 .math.md。概率统计已有 9 处 @interactive，复变、实变尚无。
- 写法与规范：docs/05（讲义模板写法）、docs/06（排版规范）、docs/07（可视化调优提示词，含视觉规格与验收标准）、docs/08（制作要求表）、docs/11（分工方案，含 n 阶一般情形的硬性规则）。
- 选题样板：docs/13（上一轮线性代数的选题提示词）、review/线性代数-可交互建议-gpt.md（上一轮筛选后的清单）。
- 交互页面与共用件：frontend/public/interactive/。共用件在 vendor/：plotfx.js（曲线、动效、逐步播放器）、view3d.js（空间投影）、lasteps.js（矩阵类逐步演示）、la2d.js（平面几何）、la3d.js（空间几何）、steady.js、morph.js、mathviz-kit.js，katex 也在其中。认可的样板：matrix-steps.html、eigen-geometry.html、jacobi-steps.html、newton-method.html，以及线性代数的 la-*.html；首页与数值分析的场景在 frontend/src/utils/heroScenes.js、showcaseScenes.js，微积分定积分样板在 frontend/src/components/interactive/RiemannSum.vue。
- 讲义解析与嵌入：frontend/src/utils/templateParser.js、frontend/src/components/interactive/InteractiveEmbed.vue（iframe 通过 postMessage 的 runge-height 回报高度）。
- TikZ：scripts/tikz/（README 与 render.mjs，依赖用 npm install 装 node-tikzjax）。

## 第一步 选题

通读三门课的讲义，跳过 @problem 与 @solution，按下面三类给出清单：

1. 动画或交互：内容本身是过程，或需要拖动参数才看得出规律，动起来才讲得清。
2. TikZ 推导图：步骤多、容易绕晕的符号推导，用一张配色加箭头的静态图把思路简单直观地画出来，参照 review 清单中的推导图条目。
3. 不做：正文讲得清、偏冷门、过于抽象、或与入选条目重复。

每章 2 到 4 处，少而精。概率统计已有的 9 处交互逐个评价保留或重做。清单写成 review/概率统计-可交互建议-claude.md 等三份，然后用一次选择题请站长确认（选项如“按清单开工（推荐）”“先看清单再说”），确认后进入第二步。

## 第二步 制作

1. 页面放 frontend/public/interactive/，文件名带课程前缀：prob-、cplx-、real-。优先复用 vendor 里的共用件，不另造副本。
2. 讲义中插入的格式：

```text
@text
一句中文引导，说明画面颜色（深蓝、橙色、浅蓝、灰色）与操作方式。

@interactive interpolation | 中文标题
src: /interactive/prob-xxx.html
```

TikZ 用 `@tikz 中文标题 | | wide`，下一行起写 tikzpicture。

3. TikZ 限制：图里不能有中文；不能用 \mathscr、\boldsymbol（会让整个渲染崩掉），线性变换等写法改用 \mathcal。每张图用 render.mjs 实际编译一次确认能出图。
4. 画面规矩：不放说明文字和数值读数，确需标注用英文或 KaTeX；不画背景网格与卡片边框；只展示方法正常工作的情形；逐步演示带自动播放（播放与暂停），手动操作即暂停；曲线类要有足够弯曲、展开足够步数，必要时用 docs/07 的镜头跟随。
5. 讲义写作规矩：只改引导句和插入的模块，不改其余正文；不提及参考教材；标题不加粗。
6. 自检：每个页面用 Playwright 在 760px 与 380px 宽度下截图，确认无报错、无横向溢出、播放时控件与画面不跳动。

## 交付

1. 推送到本分支 cloud-visual-prob-cplx-real。
2. 在仓库根目录写 DELIVERY.md：新增与修改的文件清单（按本地路径写，便于站长复制回 D:\MathAPP）；每个模块插在哪个小节；需要站长定夺的地方。
3. 提醒站长：本地复制后运行“导入课程内容”和“渲染TikZ图”，并把交互页面同步到 frontend\dist\interactive。
