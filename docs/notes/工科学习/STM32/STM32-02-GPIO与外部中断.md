---
title: STM32 GPIO 与外部中断
created: 2026-08-07
updated: 2026-08-11
tags:
  - 领域/嵌入式
  - 主题/STM32
  - 外设/GPIO
  - 外设/EXTI
  - 类型/学习笔记
  - 难度/入门
---

# STM32 GPIO 与外部中断

> 上一篇：[STM32-01-CubeMX与VSCode环境](STM32-01-CubeMX与VSCode环境.md) · 下一篇：[STM32-03-UART与DMA](STM32-03-UART与DMA.md) · 速查：[STM32-HAL函数速查](STM32-HAL函数速查.md)

对应 Keysking 第 2–7 集：点灯、按键、GPIO 内部结构和外部中断。

## 一、先建立输入输出模型

| 场景 | STM32 输入 | STM32 输出 |
|---|---|---|
| LED | 程序给出的亮灭命令 | GPIO 高/低电平 |
| 按键 | GPIO 读取的高/低电平 | 程序事件 |
| EXTI 按键 | 引脚边沿 | 中断回调被执行 |

输入电平不能悬空：外部没有电阻时使用内部上拉或下拉。按键接地常用 `Pull-up + Falling Edge`，松开读 1，按下读 0。

## 二、CubeMX 配置

### LED 输出

1. 选择引脚为 `GPIO_Output`。
2. 设置 User Label，如 `LED_GREEN`。
3. 通常选择 Push-Pull、Low speed、No pull。
4. 根据板上电路设置初始电平；有些 LED 低电平点亮。

### 按键轮询

1. 选择 `GPIO_Input`。
2. 无外部上拉时选择 Pull-up。
3. 在主循环读取并消抖。

### 外部中断

1. 选择 `GPIO_EXTIx`，按键接地时用 Falling Edge。
2. NVIC 中启用对应 EXTI IRQ。
3. 优先级数值越小，逻辑优先级越高。

```text
GPIO 引脚 → AFIO_EXTICR 选择 EXTI 线 → 边沿检测 → PR 挂起 → IMR 放行
         → NVIC 使能/挂起/优先级仲裁 → CPU 进入 IRQHandler → HAL 回调
```

这条链上任何一层未配置，都可能出现“引脚电平变化了，但回调不执行”。

## 三、重要函数

```c
HAL_GPIO_WritePin(LED_GPIO_Port, LED_Pin, GPIO_PIN_SET);
GPIO_PinState key = HAL_GPIO_ReadPin(KEY_GPIO_Port, KEY_Pin);
HAL_GPIO_TogglePin(LED_GPIO_Port, LED_Pin);
```

| 函数 | 输入 | 输出/副作用 |
|---|---|---|
| `HAL_GPIO_WritePin(port,pin,state)` | 端口、引脚掩码、SET/RESET | 改变输出电平 |
| `HAL_GPIO_ReadPin(port,pin)` | 端口、引脚掩码 | 返回 `GPIO_PIN_SET/RESET` |
| `HAL_GPIO_TogglePin(port,pin)` | 端口、引脚掩码 | 翻转输出状态 |
| `HAL_Delay(ms)` | 毫秒数 | 阻塞当前流程 |

## 四、按键消抖

入门版：检测按下 → 延时 20 ms → 再读一次 → 等待松开。缺点是阻塞主循环。

```c
if (HAL_GPIO_ReadPin(KEY_GPIO_Port, KEY_Pin) == GPIO_PIN_RESET) {
  HAL_Delay(20);
  if (HAL_GPIO_ReadPin(KEY_GPIO_Port, KEY_Pin) == GPIO_PIN_RESET) {
    HAL_GPIO_TogglePin(LED_GPIO_Port, LED_Pin);
    while (HAL_GPIO_ReadPin(KEY_GPIO_Port, KEY_Pin) == GPIO_PIN_RESET) {}
  }
}
```

项目版：使用 `HAL_GetTick()` 做状态机，每 5–10 ms 采样，稳定若干次才改变按键状态，不阻塞通信和电机控制。

## 五、外部中断的完整结构

### 1. GPIO 如何连接到 EXTI

STM32F1 通过 `AFIO_EXTICR` 把某个端口的引脚映射到 EXTI 线路：

```text
PA0 ─┐
PB0 ─┼─ AFIO_EXTICR选择其中一个 ─→ EXTI0
PC0 ─┘
```

EXTI0–15 与 GPIO 引脚编号对应，而不是与端口一一对应。因此 PA0 与 PB0 不能同时作为两路独立的 EXTI0 输入。EXTI0–4 各有独立 IRQ；EXTI5–9 和 EXTI10–15 分别共享 IRQ 向量。

### 2. EXTI 关键寄存器

下面按视频中的读图方式，从右侧输入线沿白色信号线向左看。绿色表示本例中写入 `1` 或正在起作用的位：

![stm32-exti-video-style](../attachments/diagrams/stm32-exti-video-style.png)

读图只抓住三步：

1. `RTSR/FTSR` 决定什么边沿能够产生触发脉冲。
2. 触发脉冲置位 `PR`，所以 `PR=1` 表示“这件事已经发生并被记住”。
3. `IMR=1` 才允许这项挂起请求送往 NVIC；`IMR=0` 只挡住出口，不一定清掉 `PR`。

图中的 `S-R` 锁存器是理解 `PR` 的关键：触发脉冲负责置位，软件向 `PR[x]` 写 1 负责复位。因此中断被屏蔽时，已经发生的边沿仍可能被 `PR` 记住。

| 寄存器 | 中文理解 | bit=1 的作用 |
|---|---|---|
| `EXTI_IMR` | 中断屏蔽寄存器 | 允许对应 EXTI 中断请求送往 NVIC |
| `EXTI_EMR` | 事件屏蔽寄存器 | 允许对应硬件事件路径 |
| `EXTI_RTSR` | 上升沿触发选择 | 上升沿可产生触发请求 |
| `EXTI_FTSR` | 下降沿触发选择 | 下降沿可产生触发请求 |
| `EXTI_SWIER` | 软件中断事件 | 写 1 软件触发对应 EXTI 线 |
| `EXTI_PR` | 请求挂起寄存器 | 读 1 表示挂起；**写 1 清除** |

!!! danger "PR 是 W1C"
    `EXTI_PR` 属于 Write 1 to Clear。要清 EXTI12，应向 bit12 写 1；写 0 不会清除。不要对这类寄存器随意使用普通读改写。

### 3. 中断屏蔽和请求挂起不是一回事

- `IMR=0`：屏蔽 EXTI 向 NVIC 发出的中断请求，但已经产生的 `PR` 挂起状态可能仍然存在。
- `IMR=1`：允许请求通过；若解除屏蔽时挂起位仍在，可能立即触发中断。
- `PR=1`：表示这条 EXTI 线已经检测到配置的触发；处理后必须清除。

因此临时屏蔽中断时需要明确策略：只是暂时不响应，还是还要丢弃屏蔽期间产生的事件。后者通常还要在重新开启前清理挂起位。

### 4. NVIC 是第二级控制器

EXTI 产生的是外设中断请求，Cortex-M3 的 NVIC 决定 CPU 是否以及何时响应。

| NVIC/CMSIS 概念 | 作用 |
|---|---|
| `ISER` / `NVIC_EnableIRQ()` | 使能某个 IRQ |
| `ICER` / `NVIC_DisableIRQ()` | 禁用某个 IRQ |
| `ISPR` / `NVIC_SetPendingIRQ()` | 软件设置 NVIC 挂起 |
| `ICPR` / `NVIC_ClearPendingIRQ()` | 清除 NVIC 挂起 |
| `IABR` / `NVIC_GetActive()` | 查询 IRQ 是否正在执行 |
| `IPR` / `NVIC_SetPriority()` | 配置中断优先级 |

!!! warning "两级屏蔽"
    `EXTI_IMR` 控制“EXTI 请求能否离开 EXTI”；`NVIC_DisableIRQ()` 控制“NVIC 是否把该 IRQ 交给 CPU”。二者位置不同，挂起位也不同。

全局 `__disable_irq()` 会通过 CPU 的 PRIMASK 屏蔽绝大多数可配置中断，只应在极短的临界区使用，并尽快执行 `__enable_irq()`。不要用它代替单个外设中断的正常管理。

图中应特别区分三种状态：

- **Pending**：请求已经到达，正在等待 CPU 接受。
- **Active**：CPU 正在执行该 IRQ 的处理程序。
- **Active + Pending**：ISR 执行期间又发生一次请求；退出后可能再次进入。

### 5. 优先级与嵌套

#### 5.1 两种优先级分别解决什么问题

STM32 资料中常见两个名称：

- **抢占优先级（Preemption Priority）**：决定一个新中断能不能打断正在执行的 ISR。
- **响应优先级（Subpriority，也叫子优先级）**：当多个中断已经挂起，并且抢占优先级相同时，决定退出当前 ISR 后先响应谁。

!!! warning "最容易考错的结论"
    响应优先级不能打断正在执行的中断。即使 A 的响应优先级为 0、B 为 3，只要两者抢占优先级相同，A 在 B 执行期间到达时也只能挂起等待。

两类优先级都遵守：**数值越小，逻辑优先级越高**。

#### 5.2 STM32F1 的优先级分组

STM32F1 在 8 位优先级字段中实现高 4 位。`AIRCR.PRIGROUP` 决定这 4 位如何分给抢占优先级和响应优先级；分组是整个 NVIC 的全局设置，不是每个 IRQ 单独选择。

![stm32-nvic-priority-grouping-video-style](../attachments/diagrams/stm32-nvic-priority-grouping-video-style.png)

| HAL 分组 | 抢占位数 | 响应位数 | 抢占取值 | 响应取值 |
|---|---:|---:|---:|---:|
| `NVIC_PRIORITYGROUP_0` | 0 | 4 | 固定为 0 | 0～15 |
| `NVIC_PRIORITYGROUP_1` | 1 | 3 | 0～1 | 0～7 |
| `NVIC_PRIORITYGROUP_2` | 2 | 2 | 0～3 | 0～3 |
| `NVIC_PRIORITYGROUP_3` | 3 | 1 | 0～7 | 0～1 |
| `NVIC_PRIORITYGROUP_4` | 4 | 0 | 0～15 | 固定为 0 |

- `GROUP_0`：可配置中断之间没有抢占层级，只按响应优先级排队。
- `GROUP_2`：抢占和排队各有 4 个等级，适合用于理解和练习。
- `GROUP_4`：全部位都用于抢占，响应优先级参数没有实际区分能力。

!!! warning "分组名称不是优先级"
    `GROUP_2` 不表示“中断处于第 2 组”，而表示 4 个有效位按“2 位抢占 + 2 位响应”切分。整个工程通常只设置一次，运行中不要随意更换分组。

#### 5.3 A、B、C 三个中断怎样执行

假设使用 `NVIC_PRIORITYGROUP_2`：

| 中断 | 抢占优先级 | 响应优先级 | 说明 |
|---|---:|---:|---|
| A：EXTI | 2 | 0 | 先进入 CPU |
| B：USART | 1 | 3 | 抢占值 1 小于 2，可以打断 A |
| C：TIM | 1 | 0 | 与 B 抢占值相同，不能打断 B；但排队时优先于响应值为 3 的同级请求 |

![stm32-nvic-preemption-video-style](../attachments/diagrams/stm32-nvic-preemption-video-style.png)

执行顺序：

```text
A 正在执行
→ B 到达：1 < 2，B 抢占 A
→ C 在 B 执行期间到达：C 与 B 的抢占值相同，C 只能 Pending
→ B 结束：C 是已挂起的同抢占级请求，开始执行 C
→ C 结束：恢复之前被抢占的 A
```

口诀：**抢占优先级看“能不能插队”；响应优先级看“大家都在等时谁先走”。**

#### 5.4 数值完全相同时谁先执行

若多个中断同时挂起，并且抢占优先级与响应优先级都相同，异常号/IRQ 号较小者先被服务。但工程逻辑不应依赖这种硬件兜底顺序，应主动设置清楚的优先级或用事件队列协调。

#### 5.5 CubeMX 中怎么配置

1. 打开 `System Core → NVIC`。
2. 在 `Priority Group` 选择分组，例如 `NVIC_PRIORITYGROUP_2`。
3. 勾选需要的 IRQ，例如 `EXTI15_10 interrupt`。
4. 在对应行设置 `Preemption Priority` 和 `Sub Priority`。
5. 检查数值是否落在当前分组允许范围内。
6. 生成代码后，在初始化代码中确认 `HAL_NVIC_SetPriority()` 的两个数值与 CubeMX 一致。

HAL 配置示例：

```c
// 整个工程通常只配置一次优先级分组
HAL_NVIC_SetPriorityGrouping(NVIC_PRIORITYGROUP_2);

// A：EXTI，(抢占2，响应0)
HAL_NVIC_SetPriority(EXTI15_10_IRQn, 2, 0);
HAL_NVIC_EnableIRQ(EXTI15_10_IRQn);

// B：USART，(抢占1，响应3)
HAL_NVIC_SetPriority(USART1_IRQn, 1, 3);
HAL_NVIC_EnableIRQ(USART1_IRQn);

// C：TIM，(抢占1，响应0)
HAL_NVIC_SetPriority(TIM2_IRQn, 1, 0);
HAL_NVIC_EnableIRQ(TIM2_IRQn);
```

若直接使用 CMSIS，可通过当前分组编码后再写入：

```c
uint32_t group = NVIC_GetPriorityGrouping();
uint32_t encoded = NVIC_EncodePriority(group, 2, 0);
NVIC_SetPriority(EXTI15_10_IRQn, encoded);
```

#### 5.6 工程中的注意事项

- ISR 必须短：清标志、保存数据或置事件标志后尽快退出。
- 不要在中断中执行长循环、阻塞通信、动态内存分配或复杂打印。
- SysTick 若被更高优先级 ISR 长时间阻塞，在 ISR 中调用 `HAL_Delay()` 可能无法前进，因此回调中应避免延时。
- 高优先级 ISR 若等待低优先级 ISR 才能释放的资源，会形成类似优先级反转或死锁的问题。
- 使用 FreeRTOS 时还要遵守 `configMAX_SYSCALL_INTERRUPT_PRIORITY`，不能只看这里的裸机排序规则。

### 6. 从边沿到回调的执行顺序

```text
引脚边沿
→ RTSR/FTSR 检测
→ EXTI_PR 对应位置 1
→ IMR 放行
→ NVIC 置挂起并按优先级仲裁
→ CPU 进入 EXTIx_IRQHandler
→ HAL_GPIO_EXTI_IRQHandler() 检查并清 PR
→ HAL_GPIO_EXTI_Callback() 执行用户代码
```

CubeMX 生成的中断入口通常类似：

```c
void EXTI15_10_IRQHandler(void)
{
  HAL_GPIO_EXTI_IRQHandler(KEY_Pin);
}
```

HAL 在处理函数内检查并清除 EXTI 挂起位，然后调用用户回调：

```c
void HAL_GPIO_EXTI_Callback(uint16_t GPIO_Pin)
{
  if (GPIO_Pin == KEY_Pin) {
    key_event = 1;  // 只记录事件
  }
}
```

如果同一个共享 IRQ 中启用了多个 EXTI 引脚，入口函数必须分别处理每个可能的 Pin，回调再根据 `GPIO_Pin` 区分来源。

### 7. 常用查看与控制代码

```c
// 查看 EXTI 是否挂起
if (__HAL_GPIO_EXTI_GET_IT(KEY_Pin) != RESET) {
  // 写1清除对应 EXTI_PR 位
  __HAL_GPIO_EXTI_CLEAR_IT(KEY_Pin);
}

// CMSIS 方式控制 NVIC；第二个参数是已经编码的逻辑优先级
uint32_t group = NVIC_GetPriorityGrouping();
uint32_t priority = NVIC_EncodePriority(group, 2, 0);
NVIC_SetPriority(EXTI15_10_IRQn, priority);
NVIC_EnableIRQ(EXTI15_10_IRQn);
// NVIC_DisableIRQ(EXTI15_10_IRQn);
// NVIC_ClearPendingIRQ(EXTI15_10_IRQn);
```

正常工程优先让 CubeMX/HAL 完成初始化；这些接口主要用于运行时临时控制和调试。

## 六、中断回调与主循环分工

主循环处理事件：

```c
if (key_event) {
  key_event = 0;
  HAL_GPIO_TogglePin(LED_GPIO_Port, LED_Pin);
}
```

!!! warning "中断规则"
    回调要短：不要在中断中等待按键松开、打印长串口、执行长延时或复杂浮点计算。共享变量用 `volatile`；读取多字节共享数据时考虑临界区。

## 七、容易混淆

- `GPIO_PIN_SET` 只是高电平，不一定表示“灯亮”。
- EXTI 的 `GPIO_Pin` 是引脚掩码，不是数字 0–15。
- PA0 与 PB0 共享 EXTI0，中断线有复用限制。
- EXTI 挂起位和 NVIC 挂起位属于两个不同层级。
- 清除 `EXTI_PR` 要写 1；忘记清除可能反复进入中断。
- 共享 IRQ 中必须判断具体是哪条 EXTI 线触发。
- 抢占优先级决定能否打断 ISR；响应优先级不能抢占，只负责同抢占级挂起请求的先后顺序。
- `NVIC_PRIORITYGROUP_x` 表示优先级位的切分方式，不表示某个中断属于“第 x 组”。
- 优先级分组对整个 NVIC 统一生效；不要给不同 IRQ 假想不同的分组。
- 机械按键会抖动；中断也不能自动消抖。
- 输出驱动能力有限，继电器、电机必须加驱动器件和续流保护。

## 练习

1. 三个 LED 实现流水灯，禁止复制三段重复代码，使用数组。
2. 一个按键短按切换 LED，长按 1 s 关闭全部 LED。
3. 把轮询按键改为 EXTI；比较主循环响应差异。
4. 暂时清除 `EXTI_IMR` 对应位，制造一次按键边沿，再恢复屏蔽位，观察 PR 和回调行为。
5. 同时配置 EXTI12 与 EXTI13，验证共享 `EXTI15_10_IRQn` 下的来源判断。
6. 使用 `NVIC_PRIORITYGROUP_2` 配置 EXTI、USART、TIM 为 `(2,0)`、`(1,3)`、`(1,0)`，用 GPIO 翻转或逻辑分析仪验证嵌套顺序。
7. 把 USART 与 TIM 设为相同抢占优先级，在 USART ISR 中制造短暂忙等待，观察 TIM 只能挂起而不能抢占。

## 复习问答

- 上拉输入未按时为什么是 1？
- 中断为何只置标志，不直接做业务？
- `EXTI_IMR` 与 `NVIC_DisableIRQ()` 分别屏蔽链路中的哪一级？
- `EXTI_PR` 为什么必须写 1 清除？
- Pending 与 Active 有什么区别？
- 抢占优先级和响应优先级分别解决什么问题？
- 为什么 `(抢占1，响应0)` 不能打断正在执行的 `(抢占1，响应3)`？
- `NVIC_PRIORITYGROUP_2` 的两个数值各能取多大范围？
- `GROUP_4` 下设置不同响应优先级为什么没有效果？
- `WritePin` 的第三个参数是物理电平还是灯的语义状态？

资料：[按键例程](https://docs.keysking.com/docs/stm32/example/GPIO_key/) · [外部中断例程](https://docs.keysking.com/docs/stm32/example/GPIO_EXTI/) · [RM0008 STM32F1 参考手册](https://www.st.com/resource/en/reference_manual/cd00171190-stm32f101-103-105-107-stm32f100-series-armbased-32bit-mcus-stmicroelectronics.pdf) · [PM0056 Cortex-M3 编程手册](https://www.st.com/resource/en/programming_manual/pm0056-stm32f10xxx20xxx21xxxl1xxxx-cortexm3-programming-manual-stmicroelectronics.pdf) · [STM32F1 HAL/LL 驱动手册](https://www.st.com/resource/en/user_manual/dm00122016-description-of-stm32f1-hal-and-lowlayer-drivers-stmicroelectronics.pdf) · [Arm CMSIS NVIC 接口](https://arm-software.github.io/CMSIS_5/Core/html/group__NVIC__gr.html)

<!-- lhyzs-note-nav:start -->
---
> ← 上一篇：[STM32 CubeMX 与 VSCode 环境](STM32-01-CubeMX与VSCode环境.md) · 下一篇：[STM32 UART 与 DMA](STM32-03-UART与DMA.md) →
<!-- lhyzs-note-nav:end -->
