---
title: STM32 CubeMX 与 VSCode 环境
created: 2026-08-07
updated: 2026-08-07
tags:
  - 领域/嵌入式
  - 主题/STM32
  - 工具/STM32CubeMX
  - 工具/VSCode
  - 类型/实践笔记
  - 难度/入门
---

# STM32 CubeMX 与 VSCode 环境

> [STM32-00-Keysking教程索引](STM32-00-Keysking教程索引.md) · 下一篇：[STM32-02-GPIO与外部中断](STM32-02-GPIO与外部中断.md)

## 工具分工

| 工具 | 负责什么 | 不负责什么 |
|---|---|---|
| STM32CubeMX | 选芯片、分配引脚、配置时钟/外设、生成初始化代码 | 日常写业务代码 |
| VSCode + ST 官方扩展包 | 编辑、CMake 构建、下载、调试、串口终端 | 图形化修改 `.ioc` |
| ST-LINK | SWD 下载与调试 | 给大功率负载供电 |

> [!info] 版本说明
> ST 当前的 VSCode 扩展采用模块化工具包、CMake 和 ST 自己的调试适配器；旧教程中的 CubeCLT“一体包”工作流已被新版 Bundle Manager 逐步替代。若学校电脑安装的是旧版扩展，也可继续用 CubeMX 生成 CMake 工程，核心代码不变。

## 一、安装

1. 安装 [STM32CubeMX](https://www.st.com/en/development-tools/stm32cubemx.html)。
2. 安装 [Visual Studio Code](https://code.visualstudio.com/)。
3. 在 VSCode 扩展中安装 `STM32CubeIDE for Visual Studio Code`（发布者 STMicroelectronics）。
4. 打开侧栏 `STM32Cube`，让 Bundle Manager 下载编译器、CMake/Ninja、下载与调试组件。
5. 连接 ST-LINK，在 Board Manager 中确认能识别探针并按提示升级固件。

验收：终端能调用 CMake，扩展能看到 ST-LINK，CubeMX 能下载 `STM32CubeF1` 固件包。

## 二、CubeMX 新建工程

以 `STM32F103C8Tx` 为例：

1. `New Project → MCU Selector`，搜索并选择芯片。
2. `System Core → SYS → Debug` 选择 `Serial Wire`。
3. `System Core → RCC`：使用板载晶振时把 HSE 设为 `Crystal/Ceramic Resonator`。
4. 在 `Clock Configuration` 中配置系统时钟；F103 常用 72 MHz，但必须按实际晶振核对。
5. 配置本次实验所需引脚和外设。
6. `Project Manager`：项目路径不要有中文、空格或特殊字符。
7. `Toolchain / IDE` 选择 `CMake`。
8. `Code Generator` 勾选“每个外设生成独立 `.c/.h`”以及“保留用户代码”。
9. `Generate Code`。

## 三、在 VSCode 打开

1. 用 VSCode 打开包含 `.ioc` 和 `CMakeLists.txt` 的**项目根目录**。
2. ST 扩展自动发现 STM32Cube CMake 工程。
3. 选择 Debug/Release 配置，执行 Configure，再 Build。
4. 构建成功后应得到 `.elf`；它同时包含机器码和调试符号。
5. 连接 SWD：`SWDIO`、`SWCLK`、`GND`，目标板供电按开发板要求连接。
6. 使用扩展的 Run/Debug 启动下载；首次可停在 `main()`。

## 四、每次改 `.ioc` 的正确流程

```mermaid
flowchart LR
    A[关闭正在调试的会话] --> B[CubeMX 修改 ioc]
    B --> C[Generate Code]
    C --> D[VSCode 重新 Configure]
    D --> E[Build]
    E --> F[下载与调试]
```

只把自己的代码写在 CubeMX 的用户区或独立文件：

```c
/* USER CODE BEGIN 2 */
app_init();
/* USER CODE END 2 */

while (1)
{
  /* USER CODE BEGIN WHILE */
  app_loop();
  /* USER CODE END WHILE */
}
```

更推荐创建 `Core/Inc/app.h`、`Core/Src/app.c`，让 `main.c` 只负责初始化与调度。

## 五、调试最小闭环

1. 在 `main()` 或 `app_loop()` 左侧设置断点。
2. 启动 Debug，观察 Call Stack、Variables、Watch 和外设寄存器。
3. 用 Step Over 单步；实时控制程序不要长时间停住，否则定时和通信会超时。
4. 无法下载时依次检查：供电、共地、SWD、芯片型号、`Serial Wire`、ST-LINK 固件、是否被其他软件占用。

## 六、常见问题

| 现象 | 优先检查 |
|---|---|
| Configure 找不到编译器 | ST Bundle 是否安装/激活，重开 VSCode |
| 代码能编译但不能下载 | SWD 接线、供电、芯片型号、探针占用 |
| 重新生成后代码消失 | 代码不在 USER CODE 区或独立文件 |
| 函数跳转失效 | 重新 CMake Configure，等待 clangd 建索引 |
| 改了 CubeMX 但行为不变 | 是否 Generate Code、重新 Build 和下载 |
| 工程路径报奇怪错误 | 移到纯英文短路径 |

## 本篇验收

- [ ] 从空目录生成 CMake 工程
- [ ] VSCode 零错误构建出 `.elf`
- [ ] ST-LINK 下载成功并停在 `main()`
- [ ] 修改 `.ioc` 后重新生成，用户代码仍存在

## 资料

- [ST 官方 VSCode 扩展说明](https://marketplace.visualstudio.com/items?itemName=stmicroelectronics.stm32-vscode-extension)
- [ST VSCode 安装指南 UM3512](https://www.st.com/resource/en/user_manual/um3512-stm32cubeide-for-visual-studio-code-installation-guide-stmicroelectronics.pdf)
- [Keysking 配套资源](https://docs.keysking.com/docs/stm32/resourcePack/)

<!-- lhyzs-note-nav:start -->
---
> ← 上一篇：[STM32 Keysking 教程索引](STM32-00-Keysking教程索引.md) · 下一篇：[STM32 GPIO 与外部中断](STM32-02-GPIO与外部中断.md) →
<!-- lhyzs-note-nav:end -->
