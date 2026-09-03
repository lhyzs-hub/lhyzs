---
title: Origin 2026 科研绘图小白实战教程
aliases:
  - Origin科研绘图入门
tags:
  - 科研工具
  - Origin
  - 数据可视化
  - 论文作图
date: 2026-09-04
---

# Origin 2026 科研绘图小白实战教程

!!! abstract "先看结论"
    Origin 最值得先学会的不是“把图做得花”，而是建立一条稳定的数据链：**导入原始数据 → 检查列类型 → 选择图型 → 调整图层/曲线 → 做分析 → 导出并保存项目**。

    本文用一个“浓度–吸光度标准曲线”案例，把这条链完整走一遍。你只需要会复制文件、点菜单和改数字，就能做出一张带误差棒、线性拟合和结果表的论文草图。

## 0. 本文适合谁

- 第一次打开 Origin，看到 Workbook、Worksheet、Graph、Layer 就头大的人。
- 会用 Excel 整理数据，但不会把数据变成规范科研图的人。
- 想把“能看”升级成“能放进论文/汇报”的人。

本文参考了 B 站视频 [Origin科研绘图超快速上手指南](https://www.bilibili.com/video/BV1BA411i7PT/)，并按 OriginLab 当前的 [Origin 2026 User Guide](https://cloud.originlab.com/index.aspx?go=Downloads%2FBrochuresAndInfoSheets)、[官方 GUI 教程](https://docs.originlab.com/tutorials/origin-gui/)、[基础绘图帮助](https://docs.originlab.com/origin-help/basic-graphing)、[线性回归帮助](https://docs.originlab.com/origin-help/lr-dialog/) 和 [导出帮助](https://docs.originlab.com/origin-help/simple-expgraph-dailog/) 校准菜单名称与操作逻辑。

!!! warning "关于版本与截图"
    本文中的界面图来自 OriginLab 官方 2026 用户指南/帮助中心的真实 Origin 界面截图，不是仿制 UI。官方帮助中心会跨版本复用一部分示例窗口，所以个别截图的标题栏可能仍显示旧版示例名称；菜单路径和功能说明按 Origin 2026 资料校准。你的 Origin 2026 若使用了深色主题、中文语言包或不同缩放比例，按钮位置和文字可能有小差异。

![Origin 2026 User Guide 工作区实拍示例](attachments%201/origin-2026/12-userguide-2026-workspace.png)

*图 1a｜Origin User Guide 2026 中的工作区示例，标出了 Project Explorer、Object Manager、Child Windows、Results Log、Tools、Script Window 和 Status Bar。*

## 1. 先建立一个不会迷路的心智模型

把 Origin 想成“数据表 + 图形编辑器 + 分析结果的项目文件”：

```text
Workbook（工作簿）
  └─ Worksheet（工作表）
       ├─ A(X)：横坐标
       ├─ B(Y)：测量值
       └─ C(Y Error)：误差
             ↓
       Plot（曲线/散点/柱状图）
             ↓
       Layer（图层）+ Plot Details（曲线细节）
             ↓
       Analysis（拟合/统计/峰分析）
             ↓
       Graph（最终图）→ PNG/TIFF/PDF/SVG
```

### 1.1 四个窗口先认清

![Origin 2026 工作区总览](attachments%201/origin-2026/01-origin-workspace.webp)

*图 1｜OriginLab 2026 User Guide 中的工作区总览：左侧 Project Explorer 管理项目文件夹，中间是 Workbook/Graph 等子窗口，右侧 Object Manager 管理图层和曲线，底部是 Status Bar。*

| 名称 | 你可以把它理解成 | 新手最常做的事 |
|---|---|---|
| Workbook | 一个项目里的“数据容器” | 保存工作表、计算列、分析结果 |
| Worksheet | 一张数据表 | 导入 CSV、改列名、指定 X/Y/误差 |
| Graph | 一张图 | 改坐标轴、图例、曲线样式、拟合结果 |
| Layer | Graph 里的一个坐标系 | 做上下排列、左右双 Y 轴、多面板 |

### 1.2 2026 界面里最容易忽略的两个面板

- **Project Explorer**：项目目录。数据多了以后，把“原始数据、清洗、最终图、拟合结果”分文件夹，查找会快很多。
- **Object Manager**：图形对象目录。它能列出 Layer、plot group 和每条曲线；想临时隐藏一条曲线时，不要乱删数据，先在这里取消勾选。

![Origin Object Manager](attachments%201/origin-2026/07-object-manager.webp)

*图 2｜Object Manager 可以逐层、逐组、逐曲线显示/隐藏对象；隐藏 plot 不会删除工作表中的原始数据。*

## 2. 准备练习数据：从 CSV 开始，不要从空白图开始

下载或直接使用本文配套文件：[origin-2026-standard-curve.csv](attachments%201/origin-2026/origin-2026-standard-curve.csv)。

这是**教学用合成数据**，模拟“浓度越高，吸光度越大”的标准曲线。它不是任何真实实验结果，不要直接当作论文数据。

| Concentration (mg/L) | Absorbance (a.u.) | SD (a.u.) |
|---:|---:|---:|
| 0 | 0.010 | 0.004 |
| 1 | 0.114 | 0.005 |
| 2 | 0.220 | 0.004 |
| 3 | 0.321 | 0.006 |
| 4 | 0.426 | 0.005 |
| 5 | 0.531 | 0.006 |
| 6 | 0.631 | 0.005 |
| 8 | 0.842 | 0.007 |
| 10 | 1.067 | 0.008 |
| 12 | 1.251 | 0.009 |

### 2.1 新建并保存项目

1. 打开 Origin 2026，选择 `File > New > Project`；也可以在欢迎页新建项目。
2. 立刻 `File > Save Project As...`，保存为 `origin-2026-standard-curve.opju`。
3. 后面每完成一个阶段就保存一次。`.opju` 项目文件可以把工作簿、图、分析结果和项目文件夹放在一起，别只保存最后导出的 PNG。

### 2.2 导入 CSV

推荐路径：`Data > Import from File > Single ASCII...`。

也可以把 CSV 从文件管理器直接拖到空白 Worksheet 中。导入后，你应该能看到三列数据；如果第一行被当成了数据而不是列名，在导入对话框中勾选“第一行为列名/Column Names”。

![Origin 工作簿与列属性](attachments%201/origin-2026/02-workbook-columns.webp)

*图 3｜工作簿中的列头同时显示短名、列指定、Long Name 和 Units；这些信息会直接影响图例、坐标轴标题和后续分析。*

![Origin User Guide 2026 工作表列指定示例](attachments%201/origin-2026/13-userguide-2026-worksheet.png)

*图 3a｜Origin User Guide 2026 中的工作表列指定示例：A(X)、B(Y)、C(X2)、D(Y2) 等标记决定了数据如何参与绘图。*

## 3. 第一件必须做对的事：检查列指定

Origin 不是只看“第几列”来画图，而是看列头里的 Plot Designation：

- `X`：横坐标；
- `Y`：纵坐标/测量值；
- `Y Error`：纵向误差棒；
- `X Error`：横向误差棒；
- `Z`：三维或矩阵相关数据；
- `Disregard`：暂不参与绘图。

对本例，目标应是：`A(X)`、`B(Y)`、`C(Y Error)`。

### 3.1 通过列头修改

1. 点击列头 `A`、`B` 或 `C`，选中整列。
2. 右键列头，找到 `Set As`。
3. 分别设置为 `X`、`Y`、`Y Error`。

如果列头已经显示为 `A(X)`、`B(Y)`、`C(YEr)`，就不必重复设置。

### 3.2 通过 Column Properties 修改

双击列头，打开 `Column Properties`，在 `Plot Designation` 下拉框里选择类型；同时把下面几项补完整：

- **Long Name**：例如 `Concentration`、`Absorbance`、`SD`；
- **Units**：例如 `mg/L`、`a.u.`；
- **Comments**：写数据来源、实验批次或预处理说明。

!!! tip "为什么一定要写 Long Name 和 Units？"
    Origin 的自动图例、坐标轴标题和分析报告经常从列标签读取信息。你现在多填两格，后面少手动改十处文字；也能减少“图上写的是浓度，实际列却是时间”的低级错误。

## 4. 画出第一张“能用”的图：散点 + 误差棒

### 4.1 用数据列一键生成图

1. 在 Worksheet 中选中 `B(Y)` 和 `C(Y Error)` 两列。
2. 选择 `Plot > Basic 2D > Scatter`。
3. Origin 会默认用最近的 `A(X)` 作为横坐标，并把 `C` 解释为 Y 方向误差。

如果你的菜单显示的是中文，对应关系通常是：`绘图 > 基础二维 > 散点`。菜单名称会随语言包变化，但“Basic 2D / Scatter”是最容易搜索到的关键词。

![散点图与误差棒](attachments%201/origin-2026/03-scatter-errorbar.webp)

*图 4｜官方教程示例：选中 Y 与 Y Error 后，Origin 可直接生成带误差棒的散点图。*

### 4.2 快速检查这张图是否画对

先不急着美化，检查三件事：

1. 横坐标是不是浓度 0–12，而不是行号 1–10？
2. 误差棒是不是上下方向，并且每个点只有一组误差？
3. 曲线/散点数量是否与选中的 Y 列一致？

出现问题时，先回 Worksheet 检查 `A(X)`、`B(Y)`、`C(Y Error)`，不要在 Graph 里硬修。

## 5. 把图改成论文草图：坐标轴、曲线和字体

### 5.1 坐标轴标题

最稳妥的做法是：

1. 在图中双击坐标轴，打开 `Axis` 对话框。
2. 在左侧选择 `Bottom`，进入 `Title` 或 `Title & Format` 页面。
3. 设置为 `Concentration (mg/L)`。
4. 选择 `Left`，设置为 `Absorbance (a.u.)`。

如果坐标轴标题自动带出了列名，可以保留并检查单位；不要让图上同时出现两套标题。

### 5.2 曲线和符号

点击散点或误差棒后，Origin 2026 会显示与当前对象相关的 Mini Toolbar。常用操作包括：

- 修改点形状和大小；
- 修改线型、线宽和颜色；
- 打开 `Plot Details` 做更细设置；
- 自动缩放到当前数据范围。

![Worksheet Mini Toolbar](attachments%201/origin-2026/05-minitoolbar-workbook.webp)

*图 5｜Mini Toolbar 会随选中的对象、窗口类型和点击位置变化；它适合快速改样式，不适合替代完整的 Plot Details。*

![Plot Mini Toolbar](attachments%201/origin-2026/06-minitoolbar-plot.webp)

*图 6｜选中 Graph 中的 plot 后出现的快捷工具；如果工具条消失，按住 `Shift` 或重新选中对象即可恢复。*

### 5.3 一套适合新手的稳妥样式

- 画布背景：白色；
- 数据点：实心圆，大小 5–7；
- 误差棒：黑色，线宽 1–1.5；
- 拟合线：黑色或深灰，线宽 1.5–2；
- 轴标题：9–11 pt；
- 刻度文字：8–10 pt；
- 图例：只保留必要信息；
- 颜色：同一组实验尽量只用一套颜色，不要每条线一个彩虹色。

!!! tip "论文图的判断标准"
    缩小到 Word 页面宽度后，刻度、单位、误差棒仍能看清；黑白打印时，不同组别仍能靠符号/线型区分；读者不看正文，也知道 X、Y 和误差分别是什么。

## 6. 加上线性拟合：从“趋势图”变成“可解释结果”

### 6.1 从 Graph 打开 Linear Fit

1. 激活 Graph 窗口。
2. 选择 `Analysis > Fitting > Linear Fit (Open Dialog...)`。
3. 在拟合对话框中确认输入数据是当前图中的 `Absorbance` plot。
4. 在 `Fitted Curves Plot` 中选择把拟合曲线加到 Source Graph；如果只想看结果，也可以先不加。
5. 点击 `Fit` 或 `OK`。

线性模型是：

\[
y = b + kx
\]

本例中，`k` 是标准曲线斜率，`b` 是截距；不要把 R² 当作“模型一定正确”的证明，它只能说明该模型对这组数据的线性解释程度。

用本文配套 CSV 练习时，结果应大致接近：`Slope = 0.1042`、`Intercept = 0.0099`、`R² = 0.9998`。不同的小数位设置可能让显示值略有差异；如果相差很大，优先回到列指定和输入数据检查。

![线性拟合结果图](attachments%201/origin-2026/11-linear-fit-result.webp)

*图 7｜官方帮助中心的线性拟合结果示例；实际项目中建议只在图上保留读者真正需要的参数，例如 slope、intercept、R² 和样本数。*

### 6.2 结果表建议保留什么

在 Graph 中点击拟合结果表，使用 Mini Toolbar 的 `Quantities in Table`：

- 保留 `Slope`；
- 保留 `Intercept`；
- 保留 `R-square` 或 Pearson's r；
- 需要定量分析时，再保留标准误、置信区间和 N；
- 删除不服务于结论的十几项默认统计量。

### 6.3 一定要检查拟合是否合理

- 残差是否随机分布，而不是明显弯曲；
- 是否存在一个点强烈拉动斜率；
- 是否应该加权拟合（不同点的误差不一样时尤其要注意）；
- 是否真的应该用线性模型，而不是指数、幂函数或二次模型；
- 拟合区间是否超过了实验校准范围。

!!! warning "不要为了让 R² 变大而随意删点"
    删除离群点必须有实验或质量控制依据，并且要在记录中说明；Origin 的拟合对话框能给你数值，但不能替你判断实验原因。

## 7. 多组数据与多面板：什么时候用 Layer

如果只是把多条曲线放在同一坐标系，通常是一个 Layer 多个 plot；如果每个图需要独立坐标轴，就要用多个 Layer。

### 7.1 同一坐标系叠加多条曲线

在 Worksheet 中选多个 `Y` 列，选择 `Plot > Basic 2D > Line + Symbol`。Origin 会把这些 Y 列作为多个 plot 放入同一个 Layer，并按列顺序生成图例。

### 7.2 上下/左右多面板

选中数据后，选择 `Plot > Multi-Panel/Axis > Vertical 2 Panel` 等布局。官方教程示例中的多面板图如下：

![Origin 多面板图](attachments%201/origin-2026/04-multipanel.webp)

*图 8｜多面板图适合把同一实验的不同变量放在上下排列的坐标系中；不建议为了“看起来高级”而把本来可以一张图讲清楚的数据拆碎。*

需要微调时：

1. 激活 Graph。
2. 选择 `Graph > Layer Management`。
3. 在 `Arrange` 页面设置行、列、间距和对齐。
4. 用 Object Manager 或图左上角的 Layer 编号切换当前图层。

## 8. 导出：不要把截图当最终图

### 8.1 常用路径

Graph 激活时选择 `File > Export Graph`。Origin 2026 的简化导出支持 PNG、BMP、JPEG、TIFF、EMF、SVG、PDF 等格式；需要批量图、精细页边距或更多控制时，使用 `File > Export Graphs (Advanced)`。

![Export Graph：栅格图设置](attachments%201/origin-2026/09-export-raster.webp)

*图 9｜导出栅格图时可设置格式、文件名、透明背景、DPI 和像素尺寸。*

![Export Graph：矢量图设置](attachments%201/origin-2026/10-export-vector.webp)

*图 10｜导出矢量图时可选择 PDF/SVG/EMF 等格式；线条和文字在排版中通常比截图更不容易糊。*

### 8.2 实用选择规则

| 用途 | 优先格式 | 建议 |
|---|---|---|
| 论文中的线图、散点图 | PDF / SVG / EMF | 优先矢量；提交前确认期刊是否接受 SVG/EMF |
| 期刊要求 TIFF | TIFF | 按期刊要求设置宽度和 DPI，常见是 300–600 DPI |
| PPT、组会、微信 | PNG | 适合快速分享，宽度不要小到文字读不清 |
| 需要透明背景 | PNG / TIFF | 在导出对话框勾选透明背景 |

!!! tip "推荐工作流"
    先导出一份 PNG 用于快速检查，再导出一份 PDF/SVG/TIFF 用于投稿。文件名写清楚版本，例如 `standard_curve_v03_600dpi.tif`，不要只叫 `Figure1.png`。

## 9. 保存与复现：让未来的你看得懂现在的你

在项目中建立这几个文件夹：

```text
01_raw_data
02_cleaned_data
03_analysis
04_final_graphs
```

每个项目至少保留：

- 原始 CSV/Excel，不覆盖；
- 清洗后的工作表；
- 分析输出表和拟合报告；
- 最终 Graph；
- 导出图；
- 一段 Notes，记录导入日期、筛选条件、拟合模型、删点理由和导出参数。

如果你换电脑或换 Origin 版本，优先打开 `.opju` 检查图、数据和分析是否一起存在；不要只传一张最终图片。

## 10. 新手最常见的 10 个坑

1. **把行号当成 X**：通常是 A 列没有设为 X，或者没有选到正确的 X 列。
2. **误差棒不显示**：C 列没设为 `Y Error`，或选列时漏选了误差列。
3. **误差棒方向错了**：把 X Error 当成 Y Error，或误差数据并非与 Y 一一对应。
4. **图例显示 Column B**：Long Name 为空；给列补上 Long Name，或手动编辑图例。
5. **改了图却把数据删掉**：Object Manager 里的 Hide/Remove Plot 与 Worksheet 删除不是一回事；先隐藏，后删除。
6. **拟合曲线覆盖数据点**：选中拟合线，在 Plot Details 中把线放到合适的绘制顺序，或降低线宽/改颜色。
7. **拟合结果满屏数字**：用 `Quantities in Table` 精简结果表。
8. **导出的图字很小**：导出前先设 Graph 页面尺寸，再根据用途设像素/DPI；不要放大一张低分辨率截图。
9. **中文变成方框**：统一换成系统中存在的字体，并在导出前检查；跨电脑共享时优先导出 PDF/SVG。
10. **只保存图片不保存项目**：图片不能保留数据列指定、拟合参数和可编辑图层；每次都保存 `.opju`。

## 11. 一页速查表

| 目标 | 操作路径 |
|---|---|
| 导入 CSV | `Data > Import from File > Single ASCII...` |
| 设为 X/Y/误差 | 列头右键 `Set As > X/Y/Y Error` |
| 散点图 | `Plot > Basic 2D > Scatter` |
| 折线+散点 | `Plot > Basic 2D > Line + Symbol` |
| 多面板 | `Plot > Multi-Panel/Axis` |
| 线性拟合 | `Analysis > Fitting > Linear Fit (Open Dialog...)` |
| 打开图层管理 | `Graph > Layer Management` |
| 打开对象管理 | `View > Object Manager` |
| 导出当前图 | `File > Export Graph` |
| 高级/批量导出 | `File > Export Graphs (Advanced)` |
| 查看示例和学习中心 | `Help > Learning Center` 或按 `F11` |
| 查看应用中心 | `Help > App Center` 或按 `F10` |

## 12. 练习任务：今天只做这 5 件事

- [ ] 导入配套 CSV，并确认 A(X)、B(Y)、C(Y Error)。
- [ ] 做出带误差棒的散点图。
- [ ] 把坐标轴标题改为带单位的英文或中文。
- [ ] 做一次线性拟合，并把图上的结果表精简到 slope、intercept、R²。
- [ ] 保存 `.opju`，同时导出 PNG 和 PDF/SVG。

完成这 5 件事，你已经掌握了 Origin 里最常用的一条科研作图主线。后续再学柱状图、箱线图、热图、峰分析、非线性拟合和批量作图，会容易很多，因为它们仍然遵循同一个底层逻辑：**数据列指定决定数据如何被理解，图层和 Plot Details 决定数据如何被呈现，分析工具负责把图上的趋势变成可报告的结果**。

## 资料与图片来源

1. [B 站：Origin科研绘图超快速上手指南](https://www.bilibili.com/video/BV1BA411i7PT/)，视频页面标题与简介参考。
2. [OriginLab：Origin User Guide 2026b PDF 下载页](https://cloud.originlab.com/index.aspx?go=Downloads%2FBrochuresAndInfoSheets)。
3. [OriginLab：Origin GUI 官方教程](https://docs.originlab.com/tutorials/origin-gui/)。
4. [OriginLab：Basic Graphing](https://docs.originlab.com/origin-help/basic-graphing)。
5. [OriginLab：The Linear Regression Dialog Box](https://docs.originlab.com/origin-help/lr-dialog/)。
6. [OriginLab：The Export Graph as Image Dialog Box](https://docs.originlab.com/origin-help/simple-expgraph-dailog/)。

图片均整理自 OriginLab 官方在线文档或 2026 用户指南中的界面示例；配套 CSV 为本文教学用合成数据。
