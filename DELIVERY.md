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
