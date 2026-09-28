---
title: Adobe Illustrator 2026 科研绘图零基础入门
aliases:
  - Illustrator科研绘图入门
  - AI科研绘图小白教程
tags:
  - 科研工具
  - Adobe Illustrator
  - 科研绘图
  - 论文作图
  - 矢量图
  - 机械工程
  - 工程示意图
date: 2026-09-04
updated: 2026-09-21
---

# Adobe Illustrator 2026 科研绘图零基础入门

!!! abstract "先看结论"
    Illustrator（简称 AI，但不要和“人工智能”混淆）最适合做的是：**把机械原理示意、实验装置图、CAD 视图、真实数据图、标注和图例整理成一张结构清楚、可编辑、可缩放的科研插图**。

    推荐的科研绘图链路是：**CAD 建立准确几何 → Origin/Excel/R/Python 处理数据 → Illustrator 整理示意图、标注和版式 → 保存 `.ai` 源文件 → 按投稿要求导出 PDF/SVG/TIFF/PNG**。

!!! note "版本说明"
    本笔记按 Adobe Illustrator 桌面版截至 **2026-09-21** 可查到的最新公开版本 **30.8（2026 年 8 月）** 整理。2026 版界面中最值得新手注意的是：顶部有工具/帮助搜索，右侧常用 Properties（属性）面板，画布上会出现 Contextual Task Bar（上下文任务栏），Layers（图层）和 Links（链接）管理也更适合复杂科研图。不同语言包、Windows/macOS、屏幕缩放和工作区布局会让按钮位置略有差异；菜单名以英文关键词为准，括号内给出常见中文译名。[Adobe 30.8 版本说明](https://helpx.adobe.com/illustrator/desktop/new-features/release-notes.html)

!!! info "本文图片说明"
    下文界面图均下载自 Adobe 官方 Illustrator 桌面版帮助页面，并保存在本地 `attachments/adobe-illustrator-2026/`，断网也能在 Obsidian 中查看。Adobe 会在当前帮助页中复用仍适用于 30.x 的界面截图，因此工作区总览的标题栏可能显示 Illustrator 2025；截图所在页面已于 2026-06-01 更新，所示 Toolbar、Properties、Contextual Task Bar、Layers 等布局仍是 2026 版的操作逻辑。

!!! tip "你只需要先学会 20% 的功能"
    先掌握：选择、矩形/椭圆、钢笔、填色/描边、图层、对齐、编组、路径查找器/形状生成器、文字、箭头、剪切蒙版、置入和导出。不要一开始就钻研 3D、渐变网格、复杂画笔或生成式功能。

## 0. 这篇笔记适合谁

- 第一次打开 Illustrator，看到锚点、路径、图层就不知道从哪里下手的人。
- 会用 Excel、Origin、R 或 Python 出数据图，但不会把图排成论文插图的人。
- 机械、车辆、能源、材料等专业的学生，需要制作机构原理图、实验装置示意图、装配爆炸图或论文多面板图。
- 想把 SolidWorks、Origin、Excel 或 Python 的结果整理成清楚、可编辑的论文插图。
- 希望最终文件能继续修改、放大不糊、换颜色不必重画的人。

本文的主线改为机械工程常见图件：**简支梁受力图、轴系装配爆炸示意图、拉伸实验装置与结果拼图**。其中几何外形是教学示意，尺寸和载荷不代表真实设计值；真正用于论文时，结构关系要对照 CAD/实验记录，力学符号、单位和数据要对照计算与原始数据。

## 1. Illustrator 在科研工作流里到底做什么

### 1.1 它擅长什么

| 任务 | Illustrator 的作用 |
|---|---|
| 机械原理/受力示意图 | 画构件、支承、载荷、运动方向、尺寸辅助线和标注 |
| 实验装置图 | 用简化外形表达试验机、传感器、夹具、管路和信号流向 |
| 装配爆炸示意图 | 把 CAD 输出作为准确底图，再整理线条、序号、引出线和图例 |
| 多图拼版 | 把 A/B/C 图、统计图、材料显微照片、装置照片和说明排成一张 Figure |
| 图标与标注 | 画箭头、虚线、比例尺、放大框、图例和标签 |
| 数据图后期排版 | 置入 Origin/Excel/R 导出的 PDF/SVG，调整位置与版式 |

### 1.2 它不应该替你做什么

- 不要在 Illustrator 里手工“画出”实验数据趋势，也不要为了好看修改柱高、误差棒或散点位置。
- 不要用 Image Trace（图像描摹）把显微照片变成彩色矢量图后，再把它当成定量结果。
- 不要把截图当作最终论文图：截图通常会糊，文字和线条也不能独立编辑。
- 不要把复杂的统计分析、回归、显著性检验交给 Illustrator。
- Illustrator 是矢量插图和排版软件，不是参数化 CAD。不要在里面凭目测制作需要加工的零件图、配合尺寸或公差；准确几何和工程尺寸应由 SolidWorks 等 CAD 建立并校核，Illustrator 负责示意表达和论文版式。工程图流程可对照库中的 [SolidWorks-05-工程图与交付](../SolidWorks/SolidWorks-05-工程图与交付.md)。

!!! warning "一条最稳的分工"
    **Origin/Excel/R/Python：** 数据清洗、统计、拟合和数据图。
    **Illustrator：** 版式、矢量图标、箭头、标签、图例、拼版和最终导出。
    这与库中已有的 [Origin 2026 科研绘图入门](../origin/[Origin%202026]%20科研绘图小白实战教程.md) 是一套互补流程：Origin 负责真实数据，Illustrator 负责机械示意与整图排版。

### 1.3 把工作流记成这一张图

```text
CAD几何 / 原始数据 / 实验照片
        ↓
SolidWorks等CAD：建立和校核几何；Origin、Excel、R、Python：处理数据并出图
        ↓  导出 PDF/SVG 或高分辨率 TIFF/PNG
Illustrator：置入CAD和数据图 → 整理排版 → 加标注 → 统一风格
        ↓
保存 .ai 源文件 + 导出投稿文件 + 保留版本记录
```

## 2. 先建立一个不会迷路的心智模型

把 Illustrator 想成“无限大的画桌”，而不是普通画图软件。

| Illustrator 里的词 | 零基础理解 | 科研绘图中的例子 |
|---|---|---|
| Artboard（画板） | 最终要导出的那张纸 | 一张 Figure、一个海报页面 |
| Object（对象） | 画面上的一个东西 | 一个零件轮廓、一根载荷箭头、一个文字框 |
| Path（路径） | 对象的几何骨架，由锚点和线段组成 | 构件外形、曲线引出线 |
| Anchor Point（锚点） | 路径上的控制点 | 调整试样或护罩轮廓的点 |
| Fill（填色） | 对象内部的颜色 | 机构的浅灰色填充 |
| Stroke（描边） | 对象边缘或开放路径的线 | 零件轮廓、中心线、力箭头 |
| Layer（图层） | 管理一组对象的抽屉 | CAD底图、箭头、标注、实验曲线 |
| Group（编组） | 把几个对象临时捆在一起移动 | “图标+标签”一起移动 |
| Clipping Mask（剪切蒙版） | 只显示某个形状里面的内容，不删除外面部分 | 把照片裁进圆形、放大框 |
| Appearance（外观） | 对象的填色、描边、透明度、效果集合 | 同一对象同时有填色和双重描边 |

最重要的一句话：**Illustrator 中的对象不是一张“涂上去的像素”，而是一组可以随时修改的几何对象。**

## 3. 第一次打开 2026 版：先认识界面

### 3.1 2026 界面从上到下、从左到右看

官方 2026 工作区概览图可以对照查看：[Adobe Illustrator workspace overview](https://helpx.adobe.com/illustrator/desktop/get-started/learn-the-basics/workspace-overview.html)。打开一个文档后，先定位下面几个区域：

![Illustrator 2026 工作区组成](attachments/adobe-illustrator-2026/01-workspace-overview.png)

*图 1｜Adobe 官方工作区总览。A：Document Window（文档窗口）；B：Control（控制栏）；C：Application Bar（应用栏）；D：Properties（属性面板）；E：Contextual Task Bar（上下文任务栏）；F：Help Bar；G：Status Bar（状态栏）；H：Toolbar（工具栏）。图中标题栏虽显示 2025，但来源页于 2026-06-01 更新，界面结构适用于当前 30.x 工作流。*

| 区域 | 你会看到什么 | 新手现在怎么用 |
|---|---|---|
| 顶部菜单栏 | File、Edit、Object、Type、Select、Effect、View、Window、Help | 找不到按钮时，先从菜单找 |
| 左侧 Toolbar（工具栏） | 选择、钢笔、文字、形状、缩放等工具 | 画什么就选什么工具；长按图标可展开同组工具 |
| 顶部 Control（控制栏） | 当前选中对象的常用参数 | 快速改填色、描边、位置和尺寸 |
| 右侧 Properties（属性） | 根据当前对象显示对应选项 | 零基础最常用的“总控制台” |
| 画布中央 Document Window | 画板和画板外的灰色区域 | 画板内是最终输出范围，画板外可暂存对象 |
| 画布附近 Contextual Task Bar | 随选中对象变化的快捷操作 | 适合快速改样式，不必替代完整面板 |
| 右侧面板组 | Layers、Align、Pathfinder、Stroke、Appearance、Color、Links 等 | 复杂图一定要用面板，不要只靠鼠标拖 |
| 底部 Status Bar | 缩放比例、当前工具、活动画板 | 检查当前缩放和画板 |

2026 版右上方的工具/帮助搜索可以直接搜 `Align`、`Stroke`、`Clipping Mask`、`Image Trace` 等关键词；当你不知道功能藏在哪个菜单时，这是最快的入口。

### 3.2 建议打开的面板

通过 `Window（窗口）` 菜单打开：

- `Properties（属性）`：先用它完成大多数基础设置。
- `Layers（图层）`：创建、命名、锁定、隐藏和重排图层。
- `Align（对齐）`：让对象整齐排列，避免凭眼睛对齐。
- `Pathfinder（路径查找器）`：合并、相减、相交形状。
- `Stroke（描边）`：线宽、虚线、端点、拐角和箭头。
- `Appearance（外观）`：检查一个对象到底叠了哪些填色和描边。
- `Color（颜色）`、`Swatches（色板）`：统一颜色。
- `Links（链接）`：查看置入的图片是否丢失、是否嵌入。
- `Artboards（画板）`：增加、删除、命名和导出多个画板。

如果面板被拖乱了，可使用 `Window > Workspace > Essentials` 或 `Window > Workspace > Reset Essentials` 恢复；整理好后可用 `Window > Workspace > New Workspace` 保存自己的“科研绘图”工作区。官方工作区管理说明见：[Manage workspaces](https://helpx.adobe.com/illustrator/desktop/get-started/learn-the-basics/manage-workspaces.html)。

![Illustrator Properties 属性面板](attachments/adobe-illustrator-2026/02-properties-panel.jpg)

*图 2｜选中一个矩形后的 Properties 面板。最常用的是 Transform（位置、宽高、角度）、Appearance（填色、描边、透明度）、Align（对齐）和 Quick Actions（快捷操作）。新手如果不知道去哪里改参数，先选中对象，再看右侧 Properties。*

### 3.3 第一次设置：只改这些

1. 选择 `Edit > Preferences > Units`（Windows）或 `Illustrator > Settings > Units`（macOS），把 `General` 改为 `Millimeters（毫米）`。
2. 在同一设置中把 `Stroke` 和 `Type` 的单位也确认好，避免画板用 mm、线宽却突然显示 pt 而不理解。
3. 选择 `Edit > Preferences > General`，确认 `Keyboard Increment`（键盘微移距离）是方便你排版的数值；科研图通常可先设为 `1 mm`，精细调整时按住 `Shift` 增大步长。
4. 选择 `View > Smart Guides`（智能参考线），方便对象吸附到中心、边缘和锚点。
5. 选择 `View > Rulers > Show Rulers`（显示标尺），快捷键通常是 `Ctrl+R`。

## 4. 创建第一个科研绘图文件

### 4.1 新建画板

1. `File > New`（`Ctrl+N`）。
2. 在 New Document 对话框中把单位改为 `mm`。
3. 练习时输入 `Width 180 mm`、`Height 120 mm`、横向（Landscape），画板数量先设为 1。
4. `Color Mode`：没有投稿要求时可先用 RGB；期刊明确要求 CMYK 时再切换。不要把 Color 面板显示为 RGB 误认为文档已经是 RGB，颜色面板的显示模式和文档色彩模式是两件事。
5. `Raster Effects`：如果会使用阴影、模糊等效果，练习论文图可先用 `300 ppi`；具体投稿以期刊要求为准。
6. 点击 `Create`，马上 `File > Save As` 保存为 `科研绘图_练习_v01.ai`。

!!! warning "画板尺寸要按“最终发表尺寸”考虑"
    不要先在 4K 屏幕上把字画得巨大，最后缩到论文栏宽后才发现看不清。建议先估计期刊的单栏/双栏宽度，按最终尺寸设置画板，再决定字体和线宽。

### 4.2 建立图层抽屉

打开 `Window > Layers`，建立并命名为：

```text
00_参考线（可选，不打印）
01_背景
02_CAD底图/装置主体
03_载荷、运动方向与引出线
04_文字、序号与图例
05_实验照片/Origin数据图
```

图层面板左侧的眼睛控制显示，锁形图标控制编辑；2026 版图层面板还可搜索和筛选对象。锁定已经完成的图层，再处理下一层，能明显减少误选后拖动整张 CAD 底图或整套箭头的情况。Adobe 的图层说明见：[Layers overview](https://helpx.adobe.com/illustrator/desktop/manage-layers/create-and-organize-layers/layers-overview.html)。

![Illustrator 2026 Layers 图层面板](attachments/adobe-illustrator-2026/03-layers-panel.jpg)

*图 3｜Adobe 2026 图层面板实图。A：搜索；B：筛选；C：面板菜单；D：保存选择；E：收集用于导出；F：定位对象；G：创建/释放剪切蒙版；H：新建图层；I：新建子图层；J：删除。每行左侧“眼睛”控制显示，锁定列位于眼睛右侧；右侧小圆用于选中/定位对应对象。科研图对象很多时，应先给图层和关键组命名。*

## 5. 先练会基础工具：做一张最小可用的工程示意图

目标不是画出精细的 CAD 图，而是练会 Illustrator 的基本动作：

```text
机械部件  →  载荷或运动关系  →  标签与尺寸说明  →  论文版式
```

完成后的练习图应至少有：一个主体、两个支承/连接对象、三条方向明确的箭头、三个标签和一个图例色块。所有内容都要能被单独选中、移动和重新上色。

### 5.1 画机械主体：先用基本形状，不要一上来抠锚点

1. 在主体图层选择 Rectangle Tool（矩形工具，M），画一个细长矩形，作为梁、导轨或机架横梁的简化外形。
2. 选中对象，在 Properties > Appearance 中设置浅灰色填色、深灰色描边，线宽先试 1–1.5 pt。
3. 用 Line Segment Tool（直线段工具）画轴线、接触线或基准线；若画的是中心线，把 Stroke 改成虚线。
4. 用 Ellipse Tool（椭圆工具，L）画轴承、滚轮或圆轴端面。按住 Shift 可画正圆。
5. 按 Alt 拖动复制一个相同支承，再用 Properties 中的 Transform 数值或 Align 面板摆正位置。
6. 对象较多时，先选中一组相近零件按 Ctrl+G 编组；不要把背景、箭头、文字全部合成一个对象。

此时你应当练会：选择对象、调整尺寸、填色、描边、复制和层级关系。不要把所有对象合并成一张图；后面还要分别修改它们。

### 5.2 用 Pathfinder 和 Shape Builder 做简单复杂形状

当两个基本形状叠在一起时，有两种常用方法：

- **Pathfinder（路径查找器）**：选中多个对象，打开 `Window > Pathfinder`，使用 `Unite（联集）`、`Minus Front（减去顶层）`、`Intersect（交集）` 等按钮。
- **Shape Builder（形状生成器，Shift+M）**：选中多个重叠形状后，用鼠标拖过要合并的区域；按住 `Alt` 点击可以删除区域。它很适合把两个椭圆拼成弯月、把矩形切出缺口。

练习：画两个重叠的椭圆，选择它们，按 `Shift+M`，拖过重叠区域合并；再按住 `Alt` 点击不需要的区域。保留原始对象的好处是出错后可以 `Ctrl+Z`，而不是重新画一遍。

### 5.3 画直线和箭头：不要手工画三角形箭头

1. 切换到 `03_箭头与连线` 图层。
2. 选择 `Line Segment Tool（直线段工具）`，从一个对象拖到另一个对象。
3. 确认 `Fill` 设为无（None），`Stroke` 设为深灰或深蓝。
4. 打开 `Window > Stroke`，如果没有显示完整选项，打开面板菜单并选择 `Show Options`。
5. 在 `Weight` 设置线宽；在 `Cap` 选择 `Round Cap`（圆头）；在 `Arrowheads` 中选择末端箭头，并用 `Scale` 调整箭头大小。
6. 如果箭头方向反了，点击 `Swap start and end arrowheads`；如果箭头尖端超出对象太多，使用 `Align` 中的对齐选项。

直线、虚线、圆头和箭头都应由 Stroke 面板控制；这样全图可以统一修改。官方说明见：[Add arrowheads to paths](https://helpx.adobe.com/illustrator/desktop/paint-and-fill/apply-and-edit-strokes/add-arrowheads.html) 和 [Change line caps and joins](https://helpx.adobe.com/illustrator/desktop/paint-and-fill/apply-and-edit-strokes/change-the-caps-or-joins-of-a-line.html)。

![Illustrator Stroke 箭头设置](attachments/adobe-illustrator-2026/05-stroke-arrowheads.jpg)

*图 4｜Stroke 面板真实界面。上方 Weight 控制线宽，Cap/Corner 控制端点和转角；橙框内两个 Arrowheads 下拉框分别对应路径起点和终点，右侧双箭头可交换方向，Scale 调整箭头大小，Align 决定箭头尖端是否压在线段端点上。示例的 19 pt 很粗，只用于演示；论文图通常从约 1–1.5 pt 试起。*

### 5.4 画曲线和机构轮廓：先少点，再调弧度

1. 选择 `Pen Tool（钢笔工具，P）`。
2. 画直线：依次点击几个点。
3. 画曲线：在起点按住鼠标拖动，释放后移动到终点再拖动；拖动方向决定曲线的切线方向。
4. 闭合形状：回到第一个锚点，看到小圆圈后点击。
5. 用 `Direct Selection Tool（直接选择工具，A）` 点击单个锚点，拖动锚点或手柄调整弧度。

零基础最容易犯的错是锚点太多。一个平滑的护罩、软管或不规则试样轮廓，通常先用 6–12 个关键锚点，再用手柄调整；锚点越多，越容易抖、越难统一修改。Adobe 2026 钢笔曲线操作见：[Draw curves with the Pen tool](https://helpx.adobe.com/illustrator/desktop/draw-shapes-and-paths/draw-shapes/draw-curves-with-the-pen-tool.html)。

### 5.5 放置文字和标签：文字先保持可编辑

1. 选择 Type Tool（文字工具，T），在画板上单击，输入“试样”“载荷 F”“位移 ΔL”或“传感器”等标签。
2. 选中文字后，在 `Properties` 或 `Window > Type > Character` 中设置字体、字重、字号、行距和字距。
3. 标签放在对象附近，但不要压住箭头、误差棒或关键结构。
4. 需要文字框时，用文字工具拖出一个矩形区域再输入；这比手动换行更稳定。
5. 练习图可先用 Arial、Helvetica、Aptos 等清晰无衬线字体；中文字体要选目标电脑和投稿流程都能使用的字体。

!!! warning "不要过早 Create Outlines"
    `Type > Create Outlines`（创建轮廓）会把文字变成路径，之后不能像文字一样改内容、字号和拼写。保留一个文字仍可编辑的 `.ai` 主文件；只有在投稿系统或跨电脑字体替换风险确实存在时，另存一份“outlined”副本再转轮廓。Adobe 也明确提醒，转为 outlines 后会失去文字属性。

### 5.6 用 Align 把图排整齐

1. 用 `Selection Tool（选择工具，V）` 框选多个标签或色块。
2. 打开 `Window > Align`。
3. 选择 `Align to Selection`，尝试水平居中、垂直居中、水平分布和垂直分布。
4. 如果要相对画板居中，选择 `Align to Artboard`；如果要相对某一个固定对象对齐，选择 `Align to Key Object`。

!!! tip "“Align to” 是最容易被忽略的下拉框"
    同一个“水平居中”按钮，在 Align to Selection、Align to Artboard 和 Align to Key Object 下结果完全不同。排版前先看清参照物。官方 2026 对齐说明见：[Align or distribute selected objects](https://helpx.adobe.com/illustrator/desktop/manage-objects/arrange-objects/align-and-distribute-objects.html)。

![Illustrator 2026 Align 对齐面板](attachments/adobe-illustrator-2026/04-align-panel.jpg)

*图 5｜Adobe Illustrator 30.5/2026 对齐界面。上排 Align Objects 控制左、中心、右、上、中、下对齐；中排 Distribute Objects 控制等距分布；底部 Align To 决定参照物。图中高亮的是水平和垂直中心对齐。科研流程图要优先用数值和对齐面板，不要全靠目测。*

### 5.7 编组、锁定和调整层级

- `Ctrl+G`：把多个对象编组，便于整体移动。
- `Ctrl+Shift+G`：取消编组。
- `Object > Arrange > Bring to Front / Send to Back`：调整前后遮挡关系。
- `Ctrl+2`：锁定选中对象，防止误拖。
- `Ctrl+Alt+2`：解锁全部对象。
- 图层面板中的眼睛：隐藏/显示；锁：禁止编辑。

建议把“试验机架”“夹具”等对象分别编组，但不要把“所有内容”编成一个超级大组。图层和编组的区别是：**图层负责管理结构，编组负责临时整体操作。**

## 6. 三个机械工程小项目：照着步骤做出可交付图

!!! warning "开始前先记住"
    下面的图都是“解释结构或原理”的示意图。凡是要表达真实尺寸、载荷、配合、试验曲线的地方，都从 CAD、计算书、实验记录或数据软件取值。不要为了让图更顺眼而改动工程事实。

### 项目一：简支梁自由体图

**练习目标：** 在一张图里表达梁、支承、外载荷、反力和跨距。此图用于练习画法，不替代受力分析计算。

**准备画板：** 新建横向 180 × 100 mm 画板，按 Ctrl+S 保存为 P01_简支梁受力图_v01.ai。在 Layers 面板建立“梁与支承”“载荷与反力”“尺寸与文字”三层。

![简支梁自由体图项目完成效果](attachments/adobe-illustrator-2026/project-01-beam-fbd.svg)

1. 在“梁与支承”图层，用 M 画一根细长矩形作为梁；填充浅灰，描边深灰。
2. 选择 Pen Tool（钢笔工具，P），在梁下方点击三个点画出一个三角支承，再回到起点闭合路径；复制它到梁的另一端。用一条短线画滚轮底座，表达一个固定铰支座和一个滚动支座。
3. 切换到“载荷与反力”图层，用 Line Segment Tool 画一条从梁上方指向梁的竖直线。在 Window > Stroke 中设置末端箭头，标注 P 或 F。
4. 分别在两个支承附近画向上的箭头，标注 R_A 和 R_B。箭头方向必须按你的受力图约定设置；本练习只练标法，不预设反力数值。
5. 在梁下方画一条双向箭头作为跨距尺寸线，标注 L。尺寸线和受力箭头分层，移动载荷时不容易误选。
6. 用 T 添加 A、B、P、R_A、R_B、L 标签。选择同类文字后用 Align 面板对齐；缩小到论文栏宽预览，检查标签有没有压在线上。
7. 用 V 框选梁和支承，编组并命名；单独锁定底图，再检查每个箭头方向、支承位置、符号和单位。
8. Ctrl+S 保存；导出 PDF 供排版，另导出 PNG 作为预览。把图与受力计算分开核对，避免把示意图误当作已验证结果。

**完成检查：** 一眼能区分构件、外力、支承反力和尺寸；箭头尖端落在正确对象附近；变量符号一致；图上没有自己猜的数值。

### 项目二：轴—联轴器—轴承装配爆炸示意图

**练习目标：** 练习“CAD 提供准确几何，Illustrator 负责表达和版式”的机械工作流。

**准备素材：** 使用自己已有的装配体，或跟随库中的 [SolidWorks-04-装配体与配合](../SolidWorks/SolidWorks-04-装配体与配合.md) 建立简单轴系。在 SolidWorks 中准备一张等轴测爆炸视图；优先从工程图导出矢量 PDF。仅练习时也可以用 DXF。Illustrator 支持打开或置入 PDF、DWG、DXF 等格式，导入选项会随格式而变。[Adobe 支持格式](https://helpx.adobe.com/illustrator/desktop/get-started/learn-the-basics/supported-file-formats.html) · [导入 AutoCAD 文件](https://helpx.adobe.com/illustrator/desktop/add-and-import-files/import-other-file-types/import-autocad-files.html)

![轴系爆炸示意图项目完成效果](attachments/adobe-illustrator-2026/project-02-exploded-assembly.svg)

1. 在 Illustrator 新建 A4 横向画板，先保存为 P02_轴系爆炸图_v01.ai。
2. 选择 File > Place，找到 CAD 导出的 PDF，在文件选择器中勾选 Link（链接）和 Show Import Options（显示导入选项）后置入。弹出 PDF 选项时，先用 Crop to: Art 或 Bounding Box；看不到主体时，改选 Media 再检查。
3. 打开 Window > Links，确认底图没有 Missing Link。把底图放在“CAD底图”图层，调整到合适大小后锁定该层。不要直接在底图上重画尺寸或加工轮廓。
4. 新建“序号与引出线”图层，用 Line Segment Tool 画简洁的引出线；用椭圆工具画序号圆圈，在里面输入 1、2、3……。引出线尽量不交叉，末端指向零件而不是空白处。
5. 新建“零件名称与说明”图层，按真实 BOM 录入轴、联轴器、轴承、端盖、紧固件等名称和数量。零件名称与 BOM/图纸保持一致，不要凭示意图猜零件材料或规格。
6. 用 Align 对齐序号，用相同字号和线宽统一外观；若 CAD 底图线条太密，可在 CAD 中另存一份简化视图，再重新置入。
7. 交付前对照 SolidWorks 爆炸顺序和 BOM，逐件检查序号、数量、装配方向。保存可编辑 AI，另导出 PDF。

**完成检查：** 装配顺序能看懂；序号与 BOM 一一对应；底图来源可追溯；所有外形和尺寸仍由 CAD 源文件控制。

### 项目三：拉伸试验装置图 + 真实应力—应变曲线拼版

**练习目标：** 做一张适合论文方法或结果部分的双面板图：(a) 试验装置示意，(b) 实测曲线。把设备结构、试样、传感器和真实结果讲清楚。

![拉伸试验装置示意图项目完成效果](attachments/adobe-illustrator-2026/project-03-tensile-test.svg)

1. 画板设为横向 180 × 110 mm，保存为 P03_拉伸试验示意_v01.ai。图层命名为“装置示意”“照片与曲线”“文字与标注”。
2. 在装置图层用矩形工具画试验机底座、两根立柱和横梁；用较深灰描边、浅灰填充。用小矩形画上下夹具，中间用窄矩形或钢笔画试样。
3. 在试样两侧画引伸计夹头或传感器，用细线连接到右侧数据采集/控制器小框。若你的实验没有该传感器，不要为了画面完整而加上。
4. 用 Stroke 面板画拉伸方向箭头；在图旁用引出线标注“载荷传感器”“上夹具”“试样”“引伸计”等真实部件。试样尺寸只写你的实验实际采用值，单位明确。
5. 如需放实物照片，选择 File > Place 置入原图；要裁成局部时，用形状做 Clipping Mask（Ctrl+7）。在图注或图内注明照片与示意图的对应关系。
6. 在 Origin 中从原始数据生成应力—应变曲线，按库中的 [Origin 2026 入门笔记](../origin/[Origin%202026]%20科研绘图小白实战教程.md) 导出 PDF/SVG，再回到 Illustrator 用 File > Place 放到面板 (b)。不要在 Illustrator 里拖动曲线节点来改数据。
7. 在每个面板左上角分别加粗体 (a)、(b)；统一字体、字号、坐标轴线宽和留白。确认应力/应变符号、单位、试验条件与实验记录相符。
8. 在最终版面尺寸下检查后保存 AI 主文件，导出 PDF；期刊需要位图时再按要求导出 TIFF/PNG。

**完成检查：** (a) 中的部件和传感器确实存在于你的实验；(b) 曲线来自原始数据；照片、示意图和曲线没有混淆；所有单位与图注一致。

## 7. 机械科研绘图常用模块

### 7.1 机械实验流程图

适合实验流程、技术路线和研究框架。

1. 用 `Rectangle Tool（矩形工具，M）` 或 `Rounded Rectangle Tool` 画第一个步骤框。
2. 在 Properties 中输入精确的 W、H，复制后只改文字，保证框大小统一。
3. 选中所有步骤框，用 Align 的 `Vertical Align Center` 和 `Horizontal Distribute Space` 排列。
4. 画箭头时把箭头放在单独图层，并用 `Object > Arrange > Send to Back` 送到框的后面。
5. 如果有分支，用实线表示主流程、虚线表示补充关系；在图例中说明含义。

### 7.2 机械结构简化表达

优先从 CAD 导出准确轮廓、剖面或等轴测视图，再用简单形状补充载荷、运动方向、传感器和说明。颜色不超过 5–7 个主色。能用线型和箭头说明清楚时，不必追求 3D 写实。

常见层级可以是：

```text
装置底图（由 CAD 输出）
  ├─ 主要零件/子装配
  ├─ 载荷、运动或流向标记
  ├─ 零件序号与传感器标签
  └─ 图例、尺寸说明与数据结果
```

### 7.3 局部放大框模块

1. 复制要放大的区域或照片。
2. 画一个圆形/矩形作为蒙版，确保蒙版形状在最上方。
3. 同时选中蒙版和被裁切内容，选择 `Object > Clipping Mask > Make`，或使用 `Ctrl+7`。
4. 想重新调整内容时，用直接选择工具进入蒙版内部移动图片；想取消蒙版，用 `Object > Clipping Mask > Release`。

剪切蒙版只隐藏外部内容，不会删除；蒙版路径本身需要是矢量对象。官方说明见：[Create clipping masks](https://helpx.adobe.com/illustrator/desktop/manage-objects/edit-objects/create-clipping-masks.html)。

![Illustrator Layers 面板中的剪切蒙版](attachments/adobe-illustrator-2026/06-clipping-mask.jpg)

*图 6｜Layers 面板中的 Make/Release Clipping Mask 按钮（橙框）。创建时要把蒙版形状放在被裁对象上方；选中蒙版形状和下方内容后再点击。图层中出现 `<Group>` 很正常，展开它可以分别选中蒙版路径和内部对象。*

### 7.4 置入照片、CAD视图和数据图

选择 `File > Place`：

- 放置照片、显微图、实验装置照片：通常保留为链接的 PNG/TIFF/JPEG，便于更新和控制文件大小。
- 放置 Origin/Excel/R 导出的图：优先 PDF 或 SVG，尽量保留矢量文字、线条和散点。
- 交付前打开 `Window > Links`，检查是否有缺失链接；必要时在 Links 面板中选择 `Embed` 把文件嵌入。
- 2026.8 支持在同一文件夹中自动寻找并重新链接其他缺失文件，但仍应把源图片、`.ai` 和导出文件放在有组织的项目文件夹中。

链接文件较小且便于更新，嵌入文件自包含、交付更稳；二者要根据工作阶段选择。官方说明见：[Links panel overview](https://helpx.adobe.com/illustrator/desktop/add-and-import-files/manage-linked-and-embedded-files/links-panel-overview.html)。

![Illustrator Links 链接面板](attachments/adobe-illustrator-2026/07-links-panel.jpg)

*图 7｜Links 面板检测到缺失链接时会显示红色状态标记。打开面板菜单可使用 Relink 重新定位、Go To Link 找到画板中的对象、Update Link 更新源文件，或 Embed Image(s) 嵌入素材。交付前至少执行一次 `Show Missing` 检查。*

### 7.5 Image Trace：只在合适的时候用

使用方法：选中置入图片，选择 `Window > Image Trace`，选择 `Black and White`、`Grayscale`、`Low Color` 或 `Outline` 等预设，检查预览后点击 `Expand` 转为可编辑路径。

适合：

- 简单的手绘草图、黑白图标、低复杂度线稿。
- 需要把一个简单 logo 或示意轮廓转为矢量路径。

不适合：

- 显微照片、真实组织照片、复杂渐变和噪声很大的图片。
- 任何需要保持像素强度、灰度或定量关系的图。

描摹后路径数量可能暴增，文件会变慢；先用低颜色数、适当噪声过滤和较低精度试验。官方 2026 面板说明见：[Image Trace panel options](https://helpx.adobe.com/illustrator/desktop/manage-objects/traces-mockups-symbols/image-trace-panel-options.html)。

## 8. 颜色、线宽和文字：先建立一套“论文风格”

### 8.1 一个适合新手的限制型配色

不要为了“高级”给每个对象换一个颜色。可以先建立一组色板：

| 用途 | 建议颜色 | Hex 示例 |
|---|---|---|
| 主体/正常状态 | 深蓝 | `#1F4E79` |
| 次要结构/背景 | 浅蓝 | `#DCEFF7` |
| 过程/中性信息 | 青绿 | `#4EAAA0` |
| 处理/刺激 | 橙色 | `#F39C5A` |
| 损伤/升高/警示 | 红色 | `#D9534F` |
| 辅助线/文字 | 深灰 | `#333333` |
| 次要背景 | 浅灰 | `#F2F4F7` |

在 `Window > Swatches` 中保存常用颜色；最好使用同一套颜色贯穿全图，并用形状或线型辅助区分，避免只靠颜色表达信息。Color 面板可以切换 RGB/CMYK/HSB 等显示方式，但这不会自动改变文档的色彩模式；官方说明见：[Select colors using the Color panel](https://helpx.adobe.com/illustrator/desktop/manage-colors/select-and-adjust-colors/select-colors-using-the-color-panel.html)。

### 8.2 线宽和文字的实用起点

下面只是练习起点，最终应在“最终发表尺寸”下检查：

- 主轮廓：`1–1.5 pt`。
- 次轮廓、内部结构：`0.7–1 pt`。
- 主箭头：`1.2–1.8 pt`，箭头大小与线宽匹配。
- 最终文字：常见可从 `7–10 pt` 试起；小于期刊可读性要求时不要硬缩。
- 字体层级：标题 > 小标题/组别 > 普通标签 > 注释，不要让所有字一样大。

关键检验：把画面缩到论文页面宽度，甚至打印一张黑白草稿；如果线条、箭头、图例和文字仍清楚，才算真正可用。

## 9. 把 Origin/Excel 的数据图放进 Illustrator

### 8.1 推荐做法

1. 先在 Origin、Excel、R 或 Python 中完成数据处理、统计和数据图。
2. 导出一份 PDF/SVG（优先矢量）和一份 PNG/TIFF（用于预览或期刊指定格式）。
3. 在 Illustrator 中用 `File > Place` 置入 PDF/SVG。
4. 用剪切蒙版、对齐面板和图层完成拼版。
5. 数据变化时，回到原分析软件重新导出，再在 Links 面板中更新或替换，不要手改图中的数值。

### 8.2 为什么不要在 Illustrator 里改数据图

因为修改柱高、散点位置、误差棒和拟合线会切断“原始数据—分析—图形”的证据链。Illustrator 可以改颜色、大小、布局和标签，但统计结果应该由产生它的软件重新生成。

### 8.3 PDF 置入后常见现象

- 图形被拆成许多组：先在 Layers 面板中找到对应对象，再用编组/取消编组；不要一上来全选全拆。
- 文字无法编辑：可能是源软件导出时已经转轮廓，或 PDF 被当成整体对象；保留原始数据图文件。
- 线条看起来有白边/裁切：检查 PDF 页边界、剪切蒙版和 Illustrator 的 GPU 预览；导出前用 `View > Overprint Preview` 或 PDF 阅读器复核。
- 图变模糊：说明放入的是低分辨率位图；回到数据软件重新导出 PDF/SVG，或者按期刊要求导出 300–600 ppi TIFF。

## 10. 保存与导出：源文件和交付文件分开

### 10.1 文件夹建议

```text
科研绘图_项目名/
├─ 01_raw_data/          原始数据、原始照片，只读保存
├─ 02_analysis/          Origin/Excel/R/Python 项目和导出的数据图
├─ 03_assets/            图标、照片、参考素材
├─ 04_illustrator/       .ai 源文件与版本
└─ 05_export/            PDF、SVG、TIFF、PNG 交付文件
```

版本命名示例：`Figure2_test_rig_v03.ai`、`Figure2_test_rig_v03_print.pdf`、`Figure2_test_rig_v03_600dpi.tif`。

### 10.2 保存主文件

- `File > Save`：保存可继续编辑的 `.ai` 主文件。
- 复杂项目建议每完成一个大步骤就另存一个版本，例如 `v01_layout`、`v02_arrows`、`v03_text`。
- 交付前先保存一个文字可编辑版本，再根据需要另存“轮廓化副本”。

### 10.3 导出 PDF

1. `File > Save a Copy` 或 `File > Save As`。
2. 格式选择 `Adobe PDF (pdf)`。
3. 论文线稿、机制图和矢量数据图通常可从 `High Quality Print` 起步；如果期刊给了 PDF/X 标准，按期刊指定。
4. 保留一份可编辑 `.ai`，不要把“Preserve Illustrator Editing Capabilities”当成唯一备份。
5. 用 PDF 阅读器打开导出的文件，检查文字、透明度、箭头、字体和裁切范围。

### 10.4 导出 PNG/TIFF/SVG

1. 选择 `File > Export > Export As`。
2. 勾选 `Use Artboards`，否则可能把画板外的暂存对象也带进去。
3. 栅格格式中设置目标分辨率：一般预览 150–300 ppi，投稿按期刊要求常见为 300–600 ppi。
4. 需要透明背景时，选择透明背景；需要白底投稿时，不要误把透明当成白色。
5. SVG 适合网页、矢量归档和后续编辑，但必须确认投稿系统接受。
6. 2026.7 起，`Export for Screens` 支持导出 TIFF；它适合多画板/多资产批量导出。Adobe 官方导出说明见：[How to export artwork in Illustrator](https://helpx.adobe.com/illustrator/using/exporting-artwork.html)。

![Illustrator PNG 导出选项](attachments/adobe-illustrator-2026/08-png-export-options.jpg)

*图 8｜PNG Options。Resolution 不要沿用图中演示的 Screen (72 ppi) 直接投稿；论文图片应改成期刊要求的分辨率。Anti-aliasing 中，含大量小字时可测试 Type Optimized，图标/线稿为主时可测试 Art Optimized。Background Color 可选 Transparent 或白底。*

![Illustrator TIFF 导出选项](attachments/adobe-illustrator-2026/09-tiff-export-options.jpg)

*图 9｜TIFF Options。依次检查 Color Model、Resolution、Anti-aliasing、LZW Compression 和 ICC Profile。LZW 是无损压缩，通常能减小文件；色彩模式和 ICC 配置应服从期刊要求，不要因为界面默认是 RGB 或 72 ppi 就直接确认。*

| 用途 | 优先格式 | 备注 |
|---|---|---|
| 论文线图、机械示意图、流程图 | PDF / SVG | 优先矢量，放大不糊 |
| 期刊指定图片 | TIFF | 按期刊宽度和 ppi 导出 |
| PPT、组会、聊天分享 | PNG | 透明背景或白底按场景选择 |
| 主文件 | AI | 保留图层、文字、蒙版和可编辑性 |

## 11. 零基础快捷键清单

| 快捷键 | 功能 | 先记住它的原因 |
|---|---|---|
| `V` | 选择工具 | 移动/缩放整体对象 |
| `A` | 直接选择工具 | 调锚点和路径 |
| `P` | 钢笔工具 | 画曲线和不规则轮廓 |
| `T` | 文字工具 | 添加标签 |
| `M` | 矩形工具 | 画步骤框、色块 |
| `L` | 椭圆工具 | 画轴端面、圆孔、滚轮 |
| `Shift+O` | 画板工具 | 调整或切换画板 |
| `Shift+M` | 形状生成器 | 合并/删除重叠区域 |
| `Ctrl+G` | 编组 | 整体移动多个对象 |
| `Ctrl+Shift+G` | 取消编组 | 分开修改对象 |
| `Ctrl+2` | 锁定选中对象 | 防止误拖 |
| `Ctrl+Alt+2` | 解锁全部 | 找不到对象时排查 |
| `Ctrl+7` | 创建剪切蒙版 | 做圆形照片、放大框 |
| `Ctrl+Z` | 撤销 | 出错先撤销，不要硬修 |
| `Ctrl+S` | 保存 | 形成肌肉记忆 |

## 12. 新手最常见的坑与排查顺序

1. **点了对象却选不中**：先看 Layers 是否锁定，再检查对象是否被编组或在剪切蒙版里。
2. **拖动时整套装置一起跑**：你选中的是 Group；用直接选择工具或进入隔离模式编辑内部对象。
3. **箭头没有箭头**：检查是否选中 Stroke、Stroke 面板是否展开 Show Options、箭头是否设置在正确端点。
4. **对象只有轮廓没有颜色**：检查 Fill 是否为 None；对象可能是开放路径，开放路径不能像封闭形状一样填内部。
5. **对齐后位置很奇怪**：检查 Align to 是 Selection、Artboard 还是 Key Object。
6. **文字变成方框或被替换**：目标电脑缺少字体；保存字体清单，或另存一份文字转轮廓副本。
7. **置入图片显示问号/缺失**：打开 Links 面板，Relink 到正确文件；交付前考虑 Embed 或把图片一起打包。
8. **图片被剪掉了**：可能被旧的 Clipping Mask 罩住；用 `Object > Clipping Mask > Release` 检查。
9. **文件越来越卡**：Image Trace 生成了过多路径、嵌入了超大照片、图层缩略图过多或用了复杂透明/渐变；先保留链接图片、减少描摹复杂度。
10. **导出的图很糊**：不要放大截图；重新导出 PDF/SVG 或按要求提高 TIFF/PNG 的 ppi。
11. **颜色在屏幕和 PDF 中不同**：检查文档 RGB/CMYK、色彩配置文件和期刊要求；不要只看 Color 面板上的 RGB/CMYK 标签。
12. **图看起来很花**：删颜色、删装饰、减线条；让颜色、线型和箭头承担信息，而不是承担装饰。

## 13. 一周入门练习路线

### 第 1 天：界面和对象

- [ ] 新建 180 × 120 mm 画板并保存 `.ai`。
- [ ] 打开 Properties、Layers、Align、Stroke、Pathfinder。
- [ ] 用矩形、椭圆画 10 个对象，练习填色和描边。

### 第 2 天：选择和层级

- [ ] 练习 V、A、编组、取消编组、锁定、解锁。
- [ ] 用 Layers 建立背景、主体、箭头、文字 4 层。
- [ ] 练习 Bring to Front / Send to Back。

### 第 3 天：箭头和路径

- [ ] 画直线、虚线、圆头线和带箭头曲线。
- [ ] 用钢笔只画 5–8 个锚点的试样、软管或护罩轮廓。
- [ ] 练习 Shape Builder 合并/删除区域。

### 第 4 天：文字和对齐

- [ ] 做 3 个大小一致的流程框。
- [ ] 用 Align 对齐并均匀分布。
- [ ] 保持文字可编辑，做一个标题、三个标签和一个图例。

### 第 5 天：蒙版和素材

- [ ] 把一张照片裁成圆形放大框。
- [ ] 用 Links 面板查看链接/嵌入状态。
- [ ] 用 Image Trace 描摹一个简单黑白图标，比较描摹前后路径数量。

### 第 6 天：拼一张科研图

- [ ] 完成简支梁受力图、轴系爆炸示意图或拉伸试验装置图中的至少一项。
- [ ] 使用不超过 6 个主色，统一箭头和字体。
- [ ] 把一张 Origin/Excel 导出的 PDF 置入并排版。

### 第 7 天：交付检查

- [ ] 保存文字可编辑的 `.ai` 主文件。
- [ ] 导出 PDF 和 PNG/TIFF。
- [ ] 在最终尺寸下检查字体、线宽、单位、透明度、裁切、链接和拼写。
- [ ] 复制给别人打开测试；对方不应需要猜测缺了哪些素材。

## 14. 视频与资料路线

### 14.1 先学软件基础

1. [B 站：目前 B 站较完整的 Illustrator 零基础全套教程（2025 版）](https://www.bilibili.com/video/BV1ua7pzrEmM/)
   - 适合：完全没打开过 Illustrator 的人。
   - 建议先看前面的初始设置、基础操作、图形工具、对齐、文字、线段、矩形和画笔部分；后面的 IP/作品集内容与科研绘图关联较弱。
2. [YouTube：Adobe Illustrator 2026 Tutorial – Full Beginner Guide](https://www.youtube.com/watch?v=sDy6KIwVv2M)
   - 适合：想对照 2026 版界面和英文菜单的人。
   - 重点看：Pen、Shapes、Paths、Typography、Layers、Artboards、Export。
3. [Adobe Illustrator Desktop Help](https://helpx.adobe.com/illustrator/desktop.html)
   - 适合：遇到具体按钮、菜单或参数时查官方定义。

### 14.2 参考跨学科科研图的组织方法

1. [B 站：sci 科研绘图——用 Adobe Illustrator 绘制高分文章机制图](https://www.bilibili.com/video/BV1EY411A7Ti/)
   - 是一个科研绘图合集，案例偏生命科学；机械专业读者可只观察分层、引出线、标签和图例如何安排。
   - 不要照搬作者的科学内容或素材；只学习“如何拆图、如何分层、如何统一颜色与箭头”。
2. [B 站：Adobe Illustrator 科研绘图 + 素材](https://www.bilibili.com/cheese/play/ep2025857)
   - 更偏系统课和案例课，包含基础设置、形状/吸管、路径查找器、钢笔、描边和机制图案例；重点借鉴软件操作，不需要照抄生物素材。
   - 部分内容可能需要购买或登录；观看前注意作者素材版权。
3. [B 站：夏星科研绘图系列](https://www.bilibili.com/video/BV1qX4y1N71v/)
   - 案例偏生物对象，适合练习曲线、填色和简单对象拆分；机械专业可以跳过题材本身。
   - 这些短视频适合“模仿一个小对象”，不建议替代基础软件学习。

### 14.3 机械工程案例与已有笔记

1. [B站：爆炸图分析教程 Adobe Illustrator](https://www.bilibili.com/video/BV1qG4y1D7CC/)：观察如何用 Illustrator 组织零件、引出线和注释；图件是设计表达练习，尺寸仍应回到 CAD。
2. [B站：SketchUp + Illustrator 绘制爆炸轴测图](https://www.bilibili.com/video/BV1xyyrBzE4e/)：案例是建筑，但“模型导出—Illustrator 分层—上色—加说明”的流程可迁移到机械装配示意。
3. [YouTube：Exploded diagram 从 SketchUp 到 Illustrator](https://www.youtube.com/watch?v=zfUppz_K8fw)：06:45 后进入 Illustrator，11:25 开始组织爆炸图，12:10 演示 Live Paint 上色。模型是建筑空间，适合学软件操作，不照搬机械结构。
4. [GitHub：Adobe Illustrator for Scientific Graphic Design](https://github.com/JunchuanYu/Adobe_Illustrator_for_Scientific_Graphic_Design)：附有基础操作、科研示意图、图表美化、技术路线图等案例和配套教学视频；可把技术路线图的方法迁移到机械实验流程。

本库里可接着查：[SolidWorks-04-装配体与配合](../SolidWorks/SolidWorks-04-装配体与配合.md) 生成爆炸视图，[SolidWorks-05-工程图与交付](../SolidWorks/SolidWorks-05-工程图与交付.md) 处理工程图和 PDF，[Origin 2026 科研绘图](../origin/[Origin%202026]%20科研绘图小白实战教程.md) 导出真实数据曲线，以及 [机械任务笔记](../koala考核期/机械任务笔记.md) 梳理实验需求与验证指标。

### 14.4 官方资料优先查这些页面

- [Illustrator 2026/30.x release notes](https://helpx.adobe.com/illustrator/desktop/new-features/release-notes.html)：确认版本新功能和修复。
- [Workspace overview](https://helpx.adobe.com/illustrator/desktop/get-started/learn-the-basics/workspace-overview.html)：对照 2026 界面各区域。
- [Paths overview](https://helpx.adobe.com/illustrator/desktop/draw-shapes-and-paths/learn-drawing-basics/paths-overview.html)：理解路径、锚点、填色和描边。
- [Layers panel overview](https://helpx.adobe.com/illustrator/desktop/manage-layers/create-and-organize-layers/layers-panel-overview.html)：理解图层面板中的显示、锁定、选择和目标列。
- [How to save artwork](https://helpx.adobe.com/illustrator/using/saving-artwork.html)：理解 AI、PDF、SVG 等格式该怎么保存。
- [How to export artwork](https://helpx.adobe.com/illustrator/using/exporting-artwork.html)：理解 Use Artboards、分辨率和各导出格式。

!!! warning "视频版本差异"
    视频可能使用 2023–2025 版，工具图标、面板布局、中文翻译和上下文任务栏会不同。看视频时重点理解“对象—路径—图层—面板”的逻辑，再回到 2026 版按菜单关键词定位；不要因为按钮位置不同就认为功能消失了。

## 15. 最终提交前的检查清单

- [ ] `.ai` 源文件仍可打开、图层命名清楚、文字仍可编辑或已另存轮廓副本。
- [ ] CAD 底图和真实结构一致；尺寸、公差、材料、载荷没有由 Illustrator 凭目测编造。
- [ ] 受力图的箭头、支承和符号经过计算/课程约定核对；实验示意中的传感器与真实装置一致。
- [ ] 所有箭头方向与正文叙述一致，没有箭头穿过文字或遮挡数据。
- [ ] 所有文字、单位、上下标、希腊字母和拼写正确。
- [ ] 图例、颜色和线型的含义前后一致。
- [ ] 真实数据图来自分析软件导出，没有手工改变数据关系。
- [ ] 线宽和字号在最终发表尺寸下仍清楚。
- [ ] 显微照片或大图没有被错误 Image Trace，也没有丢失比例尺。
- [ ] Links 面板没有缺失文件；交付时相关素材已一并保存或已嵌入。
- [ ] 已导出 PDF 和期刊要求的 TIFF/PNG/SVG，并用外部阅读器检查。
- [ ] 文件名包含版本号，原始数据、分析项目、素材和导出文件没有互相覆盖。

如果这些项目都能打勾，你已经建立了一条可以复现、修改和交付的机械科研绘图流程。

## 资料来源与整理说明

本文结合了：

1. Adobe Illustrator 2026 官方版本说明、工作区概览、路径、图层、对齐、描边/箭头、文字、剪切蒙版、Links、Image Trace、保存与导出帮助页面。
2. B 站/YouTube Illustrator 零基础教程与爆炸图案例，以及 GitHub 上含配套视频和练习资料的科研绘图案例。
3. 本 Obsidian 库已有的 SolidWorks 装配/工程图、Origin 数据绘图和机械任务笔记；将几何建模、数据计算和论文版式拆成各自明确的环节。

!!! note "关于 2026 的生成式功能"
    Illustrator 30.x 的 Firefly、Concept to Vector、Generative Shape Fill 等功能在不同地区和账号条件下可能不可用，Adobe 的版本说明也标注了部分功能在中国大陆不可用。它们不是科研绘图入门的必要条件；本文主流程全部基于传统且可复现的矢量工具。使用生成式功能时，仍需核查图像版权、科学准确性和期刊政策。
