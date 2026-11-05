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
