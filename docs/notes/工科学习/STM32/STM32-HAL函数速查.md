---
title: STM32 HAL 函数速查
created: 2026-08-07
updated: 2026-08-15
tags:
  - 领域/嵌入式
  - 主题/STM32
  - 类型/速查表
  - 难度/入门
aliases:
  - STM32函数速查
  - HAL函数总结
---

# STM32 HAL 函数速查

> [STM32-00-Keysking教程索引](STM32-00-Keysking教程索引.md) · [半小时学完单片机基础](半小时学完单片机基础.md)

## 先读懂参数类型

| 类型 | 含义 | 例子 |
|---|---|---|
| `xxx_HandleTypeDef *` | 外设配置与运行状态的句柄 | `&huart2`、`&htim3` |
| `uint8_t *pData` | 数据缓冲区首地址 | `(uint8_t *)buf` |
| `uint16_t Size` | 元素/字节数量，按函数定义理解 | `sizeof(buf)` |
| `uint32_t Timeout` | 最长阻塞时间，通常 ms | `100`、`HAL_MAX_DELAY` |
| `HAL_StatusTypeDef` | 调用结果 | `HAL_OK/BUSY/TIMEOUT/ERROR` |

## 参数名速查

| 常见参数名 | 完整含义 | 判断方法 |
|---|---|---|
| `hxxx` / `hxxx*` | 外设句柄或句柄指针 | HAL 函数通常要求地址：`&huart2`、`&htim3` |
| `GPIOx` | GPIO 端口寄存器地址 | `GPIOA`、`GPIOB` 或 CubeMX 生成的 `LED_GPIO_Port` |
| `GPIO_Pin` | GPIO 引脚位掩码 | `GPIO_PIN_5`，不是整数 `5` |
| `pData` | 数据缓冲区首地址 | 发送区只读；接收区必须可写；异步完成前必须保持有效 |
| `Size` | 本次处理的元素数 | UART/I²C 通常是字节数；DMA/定时器函数要看原型定义 |
| `Length` | DMA 搬运元素数量 | 通常不是字节数，必须结合数据宽度理解 |
| `Timeout` | 轮询最长阻塞时间 | HAL 常用毫秒；`HAL_MAX_DELAY` 可能长期阻塞 |
| `Channel` | 定时器通道常量 | `TIM_CHANNEL_1`，不是数字 `1` |
| `DevAddress` | I²C 从机地址参数 | STM32 HAL 常传 `7位地址 << 1` |
| `MemAddress` | I²C 从机内部寄存器地址 | 与 `DevAddress` 是两种不同地址 |
| `Format` | RTC 数据编码格式 | `RTC_FORMAT_BIN` 或 `RTC_FORMAT_BCD` |

!!! warning "返回值"
    “函数调用了”不等于“操作成功”。通信、ADC 等函数应检查 `HAL_StatusTypeDef`；中断/DMA 启动函数返回 OK 只表示成功启动，真正完成看回调。

## GPIO

详解：[STM32-02-GPIO与外部中断](STM32-02-GPIO与外部中断.md#_4)

| 函数 | 关键输入 | 返回/结果 |
|---|---|---|
| `HAL_GPIO_WritePin(GPIOx, GPIO_Pin, PinState)` | 端口地址、引脚掩码、物理高低电平 | 改变输出电平，无返回值 |
| `HAL_GPIO_ReadPin(GPIOx, GPIO_Pin)` | 端口地址、引脚掩码 | 返回 `GPIO_PIN_SET/RESET` |
| `HAL_GPIO_TogglePin(GPIOx, GPIO_Pin)` | 端口地址、引脚掩码 | 翻转输出电平，无返回值 |
| `HAL_GPIO_EXTI_Callback(GPIO_Pin)` | 触发的引脚掩码 | 用户重写的弱回调，无返回值 |

## 时间与系统

| 函数 | 输入 | 返回/结果 |
|---|---|---|
| `HAL_Delay(ms)` | 毫秒 | 阻塞等待 |
| `HAL_GetTick()` | 无 | 启动后的毫秒 tick |

非阻塞判断：`if ((uint32_t)(HAL_GetTick() - last) >= period)`，无符号减法能自然处理 tick 回绕。

## UART

详解：[STM32-03-UART与DMA](STM32-03-UART与DMA.md#uart)

| 函数 | 模式 | 完成判断 |
|---|---|---|
| `HAL_UART_Transmit(huart,pData,Size,Timeout)` | 轮询发送：句柄、发送区、字节数、超时 | 函数返回时完成或失败 |
| `HAL_UART_Receive(huart,pData,Size,Timeout)` | 轮询接收：句柄、接收区、字节数、超时 | 函数返回时完成或失败 |
| `HAL_UART_Transmit_IT(huart,pData,Size)` | 中断发送，无超时参数 | `HAL_UART_TxCpltCallback(huart)` |
| `HAL_UART_Receive_IT(huart,pData,Size)` | 中断定长接收 | `HAL_UART_RxCpltCallback(huart)` |
| `HAL_UART_Transmit_DMA(huart,pData,Size)` | DMA发送 | `HAL_UART_TxCpltCallback(huart)` |
| `HAL_UART_Receive_DMA(huart,pData,Size)` | DMA定长接收 | `HAL_UART_RxCpltCallback(huart)` |
| `HAL_UARTEx_ReceiveToIdle_DMA(huart,pData,Size)` | DMA空闲线接收；Size 是缓冲区容量 | `HAL_UARTEx_RxEventCallback(huart,Size)` |

UART 表中所有异步启动函数都返回 `HAL_StatusTypeDef`；`HAL_OK` 只表示启动成功。回调中的 `huart` 是完成传输的串口句柄，`RxEventCallback` 中的 `Size` 表示本次可处理的数据位置/长度，具体含义还要结合 DMA Normal 或 Circular 模式判断。缓冲区在异步传输完成前必须一直有效，不能指向已经退出函数的局部数组。

## I²C

详解：[STM32-04-I2C与OLED](STM32-04-I2C与OLED.md#i2c_1)

| 函数 | 用途 | 关键点 |
|---|---|---|
| `HAL_I2C_Master_Transmit(hi2c,DevAddress,pData,Size,Timeout)` | 主机发送字节流 | `DevAddress` 通常传 `addr7 << 1` |
| `HAL_I2C_Master_Receive(hi2c,DevAddress,pData,Size,Timeout)` | 主机接收字节流 | 接收区可写，并处理超时/NACK |
| `HAL_I2C_Mem_Write(hi2c,DevAddress,MemAddress,MemAddSize,pData,Size,Timeout)` | 写设备内部寄存器 | `MemAddSize` 选 8/16 位寄存器地址 |
| `HAL_I2C_Mem_Read(hi2c,DevAddress,MemAddress,MemAddSize,pData,Size,Timeout)` | 读设备内部寄存器 | 传感器最常用模式 |
| `HAL_I2C_IsDeviceReady(hi2c,DevAddress,Trials,Timeout)` | 探测设备地址 | `Trials` 是尝试次数 |

I²C 表中的 `Size` 均为数据字节数，`Timeout` 为最长阻塞时间，返回值均为 HAL 状态。`MemAddress` 是芯片内部寄存器地址，不能与 `DevAddress` 混淆。上述函数有相应的 `_IT`、`_DMA` 变体（具体以当前 HAL 包为准）。

## 定时器

详解：[STM32-05-时钟树与定时器](STM32-05-时钟树与定时器.md#_7)；PWM：[STM32-06-PWM与电机控制](STM32-06-PWM与电机控制.md#pwm_1)。

| 函数/宏 | 输入 | 返回/结果 |
|---|---|---|
| `HAL_TIM_Base_Start(htim)` | 定时器句柄 | 开始计数，返回 HAL 状态 |
| `HAL_TIM_Base_Start_IT(htim)` | 句柄 | 开始计数并启用更新中断 |
| `HAL_TIM_PeriodElapsedCallback(htim)` | 产生更新事件的句柄 | 周期完成弱回调 |
| `HAL_TIM_PWM_Start(htim,Channel)` | 句柄、`TIM_CHANNEL_x` | 开始 PWM |
| `__HAL_TIM_SET_COMPARE(htim,Channel,Compare)` | 句柄、通道、CCR比较值 | 改占空比/脉宽 |
| `HAL_TIM_IC_Start_IT(htim,Channel)` | 句柄、输入捕获通道 | 捕获边沿并回调 |
| `HAL_TIM_ReadCapturedValue(htim,Channel)` | 句柄、通道 | 返回对应 CCR 快照 |
| `HAL_TIM_Encoder_Start(htim,TIM_CHANNEL_ALL)` | 编码器定时器、通道选择 | 开始正交计数 |
| `__HAL_TIM_GET_COUNTER(htim)` | 句柄 | 返回 CNT |
| `__HAL_TIM_SET_COUNTER(htim,Counter)` | 句柄、目标值 | 修改 CNT |

## ADC

详解：[STM32-07-ADC与RTC](STM32-07-ADC与RTC.md#_1)、[STM32-07-ADC与RTC](STM32-07-ADC与RTC.md#dma_1)。

| 函数 | 用途 | 注意 |
|---|---|---|
| `HAL_ADCEx_Calibration_Start(hadc)` | ADC句柄 | F1 采样前校准，返回 HAL 状态 |
| `HAL_ADC_Start(hadc)` | ADC句柄 | 启动规则转换 |
| `HAL_ADC_PollForConversion(hadc,Timeout)` | 句柄、超时毫秒数 | 返回状态，不是 ADC 值 |
| `HAL_ADC_GetValue(hadc)` | ADC句柄 | 返回转换结果，常见为 12 位值 |
| `HAL_ADC_Start_DMA(hadc,pData,Length)` | 句柄、目标数组、结果个数 | 指针常转换为 `uint32_t *` |
| `HAL_ADC_ConvCpltCallback(hadc)` | 完成转换的 ADC 句柄 | 快速置标志 |

## RTC

详解：[STM32-07-ADC与RTC](STM32-07-ADC与RTC.md#rtc_1)、[STM32-07-ADC与RTC](STM32-07-ADC与RTC.md#_3)。

| 函数 | 用途 | 注意 |
|---|---|---|
| `HAL_RTC_SetTime(hrtc,sTime,Format)` / `SetDate(hrtc,sDate,Format)` | 句柄、结构体地址、BIN/BCD格式 | 设置时间/日期 |
| `HAL_RTC_GetTime(hrtc,sTime,Format)` / `GetDate(hrtc,sDate,Format)` | 句柄、输出结构体、格式 | 通常先 Time 后 Date |
| `HAL_RTCEx_BKUPWrite(hrtc,BackupRegister,Data)` | 句柄、备份寄存器号、数据 | 保存首次初始化标记等少量数据 |
| `HAL_RTCEx_BKUPRead(hrtc,BackupRegister)` | 句柄、备份寄存器号 | 返回保存值 |
| `HAL_PWR_EnableBkUpAccess()` | 无参数 | 写 RTC/备份寄存器前解除写保护 |

`SetTime/SetDate` 的结构体是输入，`GetTime/GetDate` 的结构体是输出；四个函数均返回 HAL 状态。`Format` 必须和结构体字段采用的普通二进制数或 BCD 编码一致。

## DMA 通用检查表

- 方向：P→M 还是 M→P？
- 模式：Normal 还是 Circular？
- 地址自增：外设通常不增，内存通常增。
- 数据宽度：Byte/Half-word/Word 是否和寄存器、数组一致？
- 完成事件：Half、Complete、Error、UART IDLE 分别如何处理？
- 生命周期：缓冲区是否在完成前仍有效？

## 回调模板

```c
void HAL_xxx_Callback(Xxx_HandleTypeDef *h)
{
  if (h->Instance == XXX1) {
    event_flag = 1;
  }
}
```

回调中通常只做：保存长度/数据快照、置标志、重新武装外设。解析、打印、显示和电机控制放在主循环任务。

## 错误排查顺序

1. CubeMX 是否启用外设、引脚复用、时钟、NVIC/DMA？
2. 初始化函数是否在使用前调用？
3. Handle 与通道/实例是否选对？
4. 返回值是什么，错误码是什么？
5. 回调是否真的进入，接收是否重新启动？
6. 输入信号是否真实存在：用万用表、示波器或逻辑分析仪确认。

参考：[波特律动 HAL 库函数入口](https://docs.keysking.com/docs/stm32/intro/) · [STM32F1 HAL/LL 资料入口](https://docs.keysking.com/docs/stm32/resourcePack/)

<!-- lhyzs-note-nav:start -->
---
> ← 上一篇：[STM32 输入输出方式总览](STM32-11-输入输出方式总览.md) · 下一篇：[半小时学完单片机基础](半小时学完单片机基础.md) →
<!-- lhyzs-note-nav:end -->
