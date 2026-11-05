# 交付说明

## 本批：概率统计第一批 3 个模块 + 三门课筛选结果

### 新增与修改的文件（本地路径）

新增交互页面（复制到 `D:\MathAPP\frontend\public\interactive\`，并同步到 `frontend\dist\interactive\`）：

| 文件 | 模块 | 插入位置 |
| --- | --- | --- |
| `D:\MathAPP\frontend\public\interactive\prob-conditional.html` | 01+04 条件概率与独立性 | 1.4.1 条件概率的定义（定义 1.4.1 之后）；1.5.1 两个事件的独立性（定义 1.5.1 之后，`?mode=1` 直接进入独立模式） |
| `D:\MathAPP\frontend\public\interactive\prob-density-area.html` | 07 密度高度与面积 | 2.1.4 连续随机变量的概率密度函数（定义 2.1.4 之后） |
| `D:\MathAPP\frontend\public\interactive\prob-sampling-dist.html` | 22+24 重复抽样形成统计量分布 | 4.4.2 独立同分布下的中心极限定理（定理 4.4.1 之后，`?pop=skewed&n=10`）；5.3.2 样本均值及其抽样分布（定理 5.3.1 之后） |

修改的共用件：

- `D:\MathAPP\frontend\public\interactive\vendor\plotfx.js`：末尾追加 `spring`（带轻微回弹的弹簧过渡）、`vgrad`（竖直渐变填充）、`grip`（拖动柄）三个函数，只新增不改动原有函数，已有页面不受影响。

修改的讲义（只插入引导句与模块，正文未动）：

- `D:\MathAPP\content\library\knowledge\probability\01-随机事件与概率\04-条件概率.math.md`
- `D:\MathAPP\content\library\knowledge\probability\01-随机事件与概率\05-独立性.math.md`
- `D:\MathAPP\content\library\knowledge\probability\02-随机变量及其分布\01-随机变量及其分布.math.md`
- `D:\MathAPP\content\library\knowledge\probability\04-大数定律与中心极限定理\04-中心极限定理.math.md`
- `D:\MathAPP\content\library\knowledge\probability\05-统计量及其分布\03-统计量及其分布.math.md`

筛选结果（覆盖原稿，原稿另存为“筛选前备份”）：

- `D:\MathAPP\review\概率统计-可交互建议-gpt.md`（备份：`概率统计-可交互建议-gpt.筛选前备份.md`）
- `D:\MathAPP\review\复变函数-可交互建议-gpt.md`（备份同名）
- `D:\MathAPP\review\实变函数-可交互建议-gpt.md`（备份同名）

### 画面与操作

- 画面上的文字一律英文或公式（按钮 General / Independent、Normal / Skewed、Play / Pause）。
- 三个模块都有入场动画（曲线逐段画出、填充淡入），所有状态变化用弹簧过渡；进入视口约 1.5 秒后自动播放，任何手动操作即暂停，离开视口或切到后台自动暂停。
- 已用 Playwright 在 760px 与 380px 宽度下截图：无报错、无横向溢出、播放过程中控件位置不变。

### 需要站长定夺

- 自动播放：交互模块进入视口后会自动开始演示（为了更有动感）。样板页是等点击 Play 才播放，如需统一为点击才播放，告诉我即可。
- 条件概率模块中的事件 $A$ 画成“曲线下方区域”，而不是 GPT 设想里的“样本点”，面积直接就是概率，更不容易误读。

### 本地操作提醒

复制回 `D:\MathAPP` 后运行“导入课程内容”和“渲染TikZ图”，并把交互页面同步到 `frontend\dist\interactive`。

## 抽象代数（本会话“ODE,抽代”负责）

新增交互页面（复制到 `D:\MathAPP\frontend\public\interactive\`，并同步到 `frontend\dist\interactive\`）：

| 文件 | 模块 | 插入位置 |
| --- | --- | --- |
| `D:\MathAPP\frontend\public\interactive\alg-cyclic-steps.html` | 01+09 循环群生成元跳步与直积周期对齐 | 1.5 循环群（定理 1.5.4 之后）；2.4 群的直积（定理 2.4.2 之后，`?mode=1`） |
| `D:\MathAPP\frontend\public\interactive\alg-permutation-cycles.html` | 02+03 置换拆成轮换再拆成对换 | 1.6 置换群与对称群（定理 1.6.5 之后） |
| `D:\MathAPP\frontend\public\interactive\alg-dihedral.html` | 04 正多边形对称的复合 | 1.7 置换在对称变换群的应用（定义 1.7.1 之后） |
| `D:\MathAPP\frontend\public\interactive\alg-orbit-stabilizer.html` | 10+12 轨道与稳定子 | 2.5 群在集合上的作用（定理 2.5.4 之后，`?mode=orbit`）；2.6 西罗定理（推论 3 之后，`?mode=sylow`） |
| `D:\MathAPP\frontend\public\interactive\alg-burnside.html` | 11 伯恩赛德计数 | 2.5 群在集合上的作用（定理 2.5.6 之后） |
| `D:\MathAPP\frontend\public\interactive\alg-finite-field.html` | 24 有限域的两套坐标 | 5.5 有限域（定理 5.5.3 之后） |

修改的讲义（只插入引导句与模块）：`D:\MathAPP\content\library\knowledge\abstract-algebra\` 下 01-群理论\05、06、07，02-群的进一步讨论\04、05、06，05-域的扩张\05。

需要站长定夺：
- 置换模块用具体置换 σ=(1 5 8 3)(2 7 4)(6)∈S₈ 演示追踪过程（n 阶一般情形的规则针对矩阵与符号阵列，置换需要具体元素才能追踪）。
- 二面体模块默认正五边形，可调 3 到 8 边；如需与讲义例 1 一致可改默认为正方形。
- 轨道、伯恩赛德、有限域三个模块的公式区出现具体数字（如 8=4·2、g⁵=2+2α），用来点出结论；如要求只放符号可以去掉。
- 有限域 GF(25) 要走 24 步，自动播放一遍约 36 秒；可只保留 GF(9) 或加速。

## 常微分方程（本会话“ODE,抽代”负责）

| 文件 | 模块 | 插入位置 |
| --- | --- | --- |
| `D:\MathAPP\frontend\public\interactive\ode-direction-field.html` | 01+04+12 方向场与解曲线 | 1.1.1（定义 2 后）；2.2.1（`?mode=1`）；3.4.1（`?mode=2`） |
| `D:\MathAPP\frontend\public\interactive\ode-picard-steps.html` | 08 皮卡逐步逼近 | 3.1.2 |
| `D:\MathAPP\frontend\public\interactive\ode-existence-extend.html` | 10+11 存在矩形与延拓 | 3.2.2（定理 1 后）；3.3.2 |
| `D:\MathAPP\frontend\public\interactive\ode-liouville.html` | 19 刘维尔公式 | 5.3.1 |
| `D:\MathAPP\frontend\public\interactive\ode-phase-portrait.html` | 22+24 相图与线性化 | 5.6.2；6.1.3（线性化模式） |
| `D:\MathAPP\frontend\public\interactive\ode-lyapunov.html` | 23+25 稳定性与 V 函数 | 6.1.1；6.2.2 |

## 本批：概率统计、复变函数、实变函数按认可清单完成（Claude 云端会话）

以 review/ 下三份 -gpt.md（站长认可的筛选结果）为准。交互模块 34 个（概率统计 17 个、复变 11 个、实变 6 个，另外富比尼与实变卷积复用概率页面），TikZ 推导图 18 张，全部插入讲义，旧的 `@interactive function` 模块已按清单重写或下线。

### 新增或修改的交互页面（复制到 `D:\MathAPP\frontend\public\interactive\`，并同步到 `frontend\dist\interactive\`）

- `D:\MathAPP\frontend\public\interactive\prob-bayes.html`
- `D:\MathAPP\frontend\public\interactive\prob-cdf-steps.html`
- `D:\MathAPP\frontend\public\interactive\prob-poisson-limit.html`
- `D:\MathAPP\frontend\public\interactive\prob-normal-standardize.html`
- `D:\MathAPP\frontend\public\interactive\prob-exp-memoryless.html`
- `D:\MathAPP\frontend\public\interactive\prob-transform-density.html`
- `D:\MathAPP\frontend\public\interactive\prob-joint-slice.html`
- `D:\MathAPP\frontend\public\interactive\prob-convolution.html`
- `D:\MathAPP\frontend\public\interactive\prob-correlation.html`
- `D:\MathAPP\frontend\public\interactive\prob-lln.html`
- `D:\MathAPP\frontend\public\interactive\prob-unbiased-efficient.html`
- `D:\MathAPP\frontend\public\interactive\prob-likelihood.html`
- `D:\MathAPP\frontend\public\interactive\prob-bayes-normal.html`
- `D:\MathAPP\frontend\public\interactive\prob-ci-coverage.html`
- `D:\MathAPP\frontend\public\interactive\prob-power.html`
- `D:\MathAPP\frontend\public\interactive\prob-anova.html`
- `D:\MathAPP\frontend\public\interactive\prob-regression.html`
- `D:\MathAPP\frontend\public\interactive\cplx-multiply-roots.html`
- `D:\MathAPP\frontend\public\interactive\cplx-riemann-sphere.html`
- `D:\MathAPP\frontend\public\interactive\cplx-conformal-local.html`
- `D:\MathAPP\frontend\public\interactive\cplx-mapper.html`
- `D:\MathAPP\frontend\public\interactive\cplx-branch-surface.html`
- `D:\MathAPP\frontend\public\interactive\cplx-potential-flow.html`
- `D:\MathAPP\frontend\public\interactive\cplx-convergence-continuation.html`
- `D:\MathAPP\frontend\public\interactive\cplx-winding.html`
- `D:\MathAPP\frontend\public\interactive\cplx-residue.html`
- `D:\MathAPP\frontend\public\interactive\cplx-mobius-steps.html`
- `D:\MathAPP\frontend\public\interactive\cplx-poisson-kernel.html`
- `D:\MathAPP\frontend\public\interactive\real-preimage.html`
- `D:\MathAPP\frontend\public\interactive\real-inner-outer.html`
- `D:\MathAPP\frontend\public\interactive\real-layer-cake.html`
- `D:\MathAPP\frontend\public\interactive\real-egorov.html`
- `D:\MathAPP\frontend\public\interactive\real-bv-split.html`
- `D:\MathAPP\frontend\public\interactive\real-bernstein.html`

### 删除的页面

本会话中途做过、后来按认可清单撤下的页面已从仓库删除，本地若曾复制过请一并删除：prob-buffon、prob-histogram-density、prob-clt、prob-normal-density、prob-monotone-transform、prob-confidence、prob-two-errors、prob-least-squares、cplx-product、cplx-argument-principle、cplx-semicircle、cplx-max-modulus、cplx-arg-change、cplx-conformal-grid、cplx-joukowski、cplx-riemann-surface、cplx-taylor-disk、real-measure-squeeze、real-bounded-variation、real-countable-union、real-cantor-set、real-cantor-function、real-simple-approx、real-lebesgue-layers（均为 .html）。

### 修改的讲义（只插入引导句、模块与 TikZ，或替换/下线旧模块，正文未动）

- `D:\MathAPP\content\library\knowledge\complex-analysis\01-复数与复变函数\01-复数.math.md`
- `D:\MathAPP\content\library\knowledge\complex-analysis\01-复数与复变函数\04-复球面与无穷远点.math.md`
- `D:\MathAPP\content\library\knowledge\complex-analysis\02-解析函数\01-解析函数的概念与柯西-黎曼方程.math.md`
- `D:\MathAPP\content\library\knowledge\complex-analysis\02-解析函数\02-初等解析函数.math.md`
- `D:\MathAPP\content\library\knowledge\complex-analysis\02-解析函数\03-初等多值函数.math.md`
- `D:\MathAPP\content\library\knowledge\complex-analysis\03-复变函数的积分\01-复积分的概念及其简单性质.math.md`
- `D:\MathAPP\content\library\knowledge\complex-analysis\03-复变函数的积分\02-柯西积分定理.math.md`
- `D:\MathAPP\content\library\knowledge\complex-analysis\03-复变函数的积分\05-平面向量场——解析函数的应用.math.md`
- `D:\MathAPP\content\library\knowledge\complex-analysis\04-解析函数的幂级数表示法\03-解析函数的泰勒展开式.math.md`
- `D:\MathAPP\content\library\knowledge\complex-analysis\04-解析函数的幂级数表示法\04-解析函数零点的孤立性及惟一性定理.math.md`
- `D:\MathAPP\content\library\knowledge\complex-analysis\05-解析函数的洛朗展开与孤立奇点\01-解析函数的洛朗展开式.math.md`
- `D:\MathAPP\content\library\knowledge\complex-analysis\05-解析函数的洛朗展开与孤立奇点\03-解析函数在无穷远点的性质.math.md`
- `D:\MathAPP\content\library\knowledge\complex-analysis\06-留数理论及其应用\01-留数.math.md`
- `D:\MathAPP\content\library\knowledge\complex-analysis\06-留数理论及其应用\02-用留数定理计算实积分.math.md`
- `D:\MathAPP\content\library\knowledge\complex-analysis\06-留数理论及其应用\03-辐角原理及其应用.math.md`
- `D:\MathAPP\content\library\knowledge\complex-analysis\07-共形映射\01-解析变换的特性.math.md`
- `D:\MathAPP\content\library\knowledge\complex-analysis\07-共形映射\02-分式线性变换.math.md`
- `D:\MathAPP\content\library\knowledge\complex-analysis\07-共形映射\03-某些初等函数所构成的共形映射.math.md`
- `D:\MathAPP\content\library\knowledge\complex-analysis\08-解析延拓\01-解析延拓的概念与幂级数延拓.math.md`
- `D:\MathAPP\content\library\knowledge\complex-analysis\08-解析延拓\03-完全解析函数及黎曼面的概念.math.md`
- `D:\MathAPP\content\library\knowledge\complex-analysis\09-调和函数\01-平均值定理与极值原理.math.md`
- `D:\MathAPP\content\library\knowledge\complex-analysis\09-调和函数\02-泊松积分公式与狄利克雷问题.math.md`
- `D:\MathAPP\content\library\knowledge\probability\01-随机事件与概率\04-条件概率.math.md`
- `D:\MathAPP\content\library\knowledge\probability\01-随机事件与概率\05-独立性.math.md`
- `D:\MathAPP\content\library\knowledge\probability\02-随机变量及其分布\01-随机变量及其分布.math.md`
- `D:\MathAPP\content\library\knowledge\probability\02-随机变量及其分布\02-随机变量的数学期望.math.md`
- `D:\MathAPP\content\library\knowledge\probability\02-随机变量及其分布\04-常用离散分布.math.md`
- `D:\MathAPP\content\library\knowledge\probability\02-随机变量及其分布\05-常用连续分布.math.md`
- `D:\MathAPP\content\library\knowledge\probability\02-随机变量及其分布\06-随机变量函数的分布.math.md`
- `D:\MathAPP\content\library\knowledge\probability\03-多维随机变量及其分布\02-边际分布与随机变量的独立性.math.md`
- `D:\MathAPP\content\library\knowledge\probability\03-多维随机变量及其分布\03-多维随机变量函数的分布.math.md`
- `D:\MathAPP\content\library\knowledge\probability\03-多维随机变量及其分布\04-多维随机变量的特征数.math.md`
- `D:\MathAPP\content\library\knowledge\probability\03-多维随机变量及其分布\05-条件分布与条件期望.math.md`
- `D:\MathAPP\content\library\knowledge\probability\04-大数定律与中心极限定理\01-随机变量序列的两种收敛性.math.md`
- `D:\MathAPP\content\library\knowledge\probability\04-大数定律与中心极限定理\03-大数定律.math.md`
- `D:\MathAPP\content\library\knowledge\probability\05-统计量及其分布\03-统计量及其分布.math.md`
- `D:\MathAPP\content\library\knowledge\probability\05-统计量及其分布\04-三大抽样分布.math.md`
- `D:\MathAPP\content\library\knowledge\probability\06-参数估计\01-点估计的概念与无偏性.math.md`
- `D:\MathAPP\content\library\knowledge\probability\06-参数估计\03-最大似然估计与 EM 算法.math.md`
- `D:\MathAPP\content\library\knowledge\probability\06-参数估计\05-贝叶斯估计.math.md`
- `D:\MathAPP\content\library\knowledge\probability\06-参数估计\06-区间估计.math.md`
- `D:\MathAPP\content\library\knowledge\probability\07-假设检验\01-假设检验的基本思想与概念.math.md`
- `D:\MathAPP\content\library\knowledge\probability\07-假设检验\02-正态总体参数假设检验.math.md`
- `D:\MathAPP\content\library\knowledge\probability\08-方差分析与回归分析\01-方差分析.math.md`
- `D:\MathAPP\content\library\knowledge\probability\08-方差分析与回归分析\04-一元线性回归.math.md`
- `D:\MathAPP\content\library\knowledge\real-analysis\01-集合\02-映射与集合的势.math.md`
- `D:\MathAPP\content\library\knowledge\real-analysis\02-勒贝格测度\02-开闭集测度与内外测度.math.md`
- `D:\MathAPP\content\library\knowledge\real-analysis\02-勒贝格测度\03-勒贝格可测集.math.md`
- `D:\MathAPP\content\library\knowledge\real-analysis\02-勒贝格测度\07-广义测度与分解.math.md`
- `D:\MathAPP\content\library\knowledge\real-analysis\03-可测函数\01-可测函数及其运算.math.md`
- `D:\MathAPP\content\library\knowledge\real-analysis\03-可测函数\02-函数列的收敛.math.md`
- `D:\MathAPP\content\library\knowledge\real-analysis\03-可测函数\03-鲁津定理.math.md`
- `D:\MathAPP\content\library\knowledge\real-analysis\04-勒贝格积分\01-勒贝格积分的定义.math.md`
- `D:\MathAPP\content\library\knowledge\real-analysis\04-勒贝格积分\03-积分与极限交换.math.md`
- `D:\MathAPP\content\library\knowledge\real-analysis\04-勒贝格积分\05-乘积测度与重积分.math.md`
- `D:\MathAPP\content\library\knowledge\real-analysis\04-勒贝格积分\06-单调函数与微分.math.md`
- `D:\MathAPP\content\library\knowledge\real-analysis\05-函数空间Lp\01-Lp空间与收敛.math.md`
- `D:\MathAPP\content\library\knowledge\real-analysis\05-函数空间Lp\02-稠密性与可分性.math.md`
- `D:\MathAPP\content\library\knowledge\real-analysis\05-函数空间Lp\03-平移与卷积.math.md`

### 插入位置

每个模块的位置与认可清单“位置”一栏一致，跨两三处的合并条目用 url 参数区分模式（如 `prob-power.html?mode=power`、`cplx-mapper.html?preset=joukowski`、`real-layer-cake.html?mode=integral`）。旧模块处理：
- 重写替换：正态密度、指数密度、对数正态、似然函数、贝叶斯估计权重、功效函数；先射优势改为 TikZ。
- 下线：阳性结果的可信度（改由 1.4.3 的全概率与贝叶斯模块承担）、分组检验、组合方差。

### 需要站长定夺

- 建议 02+03 全概率与贝叶斯：插在 1.4.3，1.4.4 原模块直接下线，没有在 1.4.4 再放一次。
- 建议 32+33：同一页面三处使用，7.1.2 基本步骤后放两类错误模式，原功效函数位置放功效模式，7.1.3 放 p 值模式。
- TikZ 图在云端只核对了几何布局；本地字体编码与云端不同，公式排版请在“渲染TikZ图”后过目一遍。
- 用了 stepper 的页面，按钮读屏标签来自共用件 plotfx.js，仍是中文，画面上不显示，未改动共用件。
- 已知小瑕疵：prob-regression 在 380px 下左端把手光环被画布边缘截掉一点。

### 本地操作

复制回 `D:\MathAPP` 后运行“导入课程内容”和“渲染TikZ图”，并把交互页面同步到 `frontend\dist\interactive`。

抽象代数补充：

| 文件 | 模块 | 插入位置 |
| --- | --- | --- |
| `D:\MathAPP\frontend\public\interactive\alg-cosets.html` | 05 陪集分解（D₆，可切换子群） | 2.1（定理 2.1.4 证明之后） |
| `D:\MathAPP\frontend\public\interactive\alg-quotient.html` | 06+07+08 正规子群、商群与同态 | 2.2 定义 2.2.1 后（`?mode=normal`）；2.2 定义 2.2.2 后（`?mode=quotient`）；2.3 定理 2.3.4 后（`?mode=hom`） |

已知瑕疵：窄屏下同态模式隐藏元素名标签；个别内圈标签离圆环较近。

常微分方程补充：

| 文件 | 模块 | 插入位置 |
| --- | --- | --- |
| `D:\MathAPP\frontend\public\interactive\ode-duhamel.html` | 05+21 常数变易 | 2.3.2（定理 1 后）；5.4.2（`?mode=system`） |
| `D:\MathAPP\frontend\public\interactive\ode-heun-steps.html` | 13 改进欧拉法 | 3.6.2 |
| `D:\MathAPP\frontend\public\interactive\ode-power-series.html` | 17 幂级数解（艾里方程） | 4.7.1 |
| `D:\MathAPP\frontend\public\interactive\ode-limit-cycle.html` | 26 极限环与捕获环域 | 6.4.2 |

下线：2.3.2“解趋于同一条直线”、6.5“霍普夫分支中的径向速度”。

需要站长定夺：极限环默认用讲义 6.4.2 例题 1 的环域（可拖 μ），范德波尔作为第二预设且不画环域（它的外侧吸引太快，画不出可见的捕获环域）。

尚未完成：两门课的 TikZ 图（常微分方程 7 张、抽象代数 8 张）；常微分方程旧模块“双参数解族”“积分曲线族”“阻尼振动”“克莱罗切线族”“鞍结分支”仍在讲义中，待下线或改 TikZ。
