---
title: STM32 HAL 函数速查
created: 2026-08-07
updated: 2026-08-07
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

!!! warning "返回值"
    “函数调用了”不等于“操作成功”。通信、ADC 等函数应检查 `HAL_StatusTypeDef`；中断/DMA 启动函数返回 OK 只表示成功启动，真正完成看回调。

## GPIO

| 函数 | 关键输入 | 返回/结果 |
|---|---|---|
| `HAL_GPIO_WritePin(port,pin,state)` | 端口、引脚、SET/RESET | 改变电平 |
| `HAL_GPIO_ReadPin(port,pin)` | 端口、引脚 | `GPIO_PinState` |
| `HAL_GPIO_TogglePin(port,pin)` | 端口、引脚 | 翻转电平 |
| `HAL_GPIO_EXTI_Callback(pin)` | 触发的引脚掩码 | 用户重写的弱回调 |

## 时间与系统

| 函数 | 输入 | 返回/结果 |
|---|---|---|
| `HAL_Delay(ms)` | 毫秒 | 阻塞等待 |
| `HAL_GetTick()` | 无 | 启动后的毫秒 tick |

非阻塞判断：`if ((uint32_t)(HAL_GetTick() - last) >= period)`，无符号减法能自然处理 tick 回绕。

## UART

| 函数 | 模式 | 完成判断 |
|---|---|---|
| `HAL_UART_Transmit(h,p,n,t)` | 轮询发送 | 函数返回 |
| `HAL_UART_Receive(h,p,n,t)` | 轮询接收 | 函数返回 |
| `HAL_UART_Transmit_IT(h,p,n)` | 中断发送 | `HAL_UART_TxCpltCallback` |
| `HAL_UART_Receive_IT(h,p,n)` | 中断接收 | `HAL_UART_RxCpltCallback` |
| `HAL_UART_Transmit_DMA(h,p,n)` | DMA发送 | `HAL_UART_TxCpltCallback` |
| `HAL_UART_Receive_DMA(h,p,n)` | DMA定长接收 | `HAL_UART_RxCpltCallback` |
| `HAL_UARTEx_ReceiveToIdle_DMA(h,p,n)` | DMA不定长 | `HAL_UARTEx_RxEventCallback(h,Size)` |

缓冲区在异步传输完成前必须一直有效，不能指向已经退出函数的局部数组。

## I²C

| 函数 | 用途 | 关键点 |
|---|---|---|
| `HAL_I2C_Master_Transmit` | 主机发送字节流 | 地址通常传 `addr7 << 1` |
| `HAL_I2C_Master_Receive` | 主机接收字节流 | 处理超时/NACK |
| `HAL_I2C_Mem_Write` | 写设备寄存器 | 指定 8/16 位寄存器地址 |
| `HAL_I2C_Mem_Read` | 读设备寄存器 | 最常用的传感器模式 |
| `HAL_I2C_IsDeviceReady` | 探测设备 | 可用于上电检查/扫描 |

上述函数均有 `_IT`、`_DMA` 变体（具体以当前 HAL 包为准）。

## 定时器

| 函数/宏 | 输入 | 返回/结果 |
|---|---|---|
| `HAL_TIM_Base_Start` | 定时器句柄 | 开始计数 |
| `HAL_TIM_Base_Start_IT` | 句柄 | 更新事件触发回调 |
| `HAL_TIM_PeriodElapsedCallback` | 句柄 | 周期完成回调 |
| `HAL_TIM_PWM_Start(h,ch)` | 句柄、通道 | 开始 PWM |
| `__HAL_TIM_SET_COMPARE(h,ch,v)` | CCR 值 | 改占空比/脉宽 |
| `HAL_TIM_IC_Start_IT(h,ch)` | 输入捕获通道 | 捕获边沿并回调 |
| `HAL_TIM_ReadCapturedValue(h,ch)` | 通道 | 读取 CCR 快照 |
| `HAL_TIM_Encoder_Start(h,ALL)` | 编码器定时器 | 开始正交计数 |
| `__HAL_TIM_GET_COUNTER(h)` | 句柄 | 读取 CNT |
| `__HAL_TIM_SET_COUNTER(h,v)` | 句柄、值 | 修改 CNT |

## ADC

| 函数 | 用途 | 注意 |
|---|---|---|
| `HAL_ADCEx_Calibration_Start` | F1 ADC 校准 | 采样前执行 |
| `HAL_ADC_Start` | 启动转换 | 配合轮询 |
| `HAL_ADC_PollForConversion` | 等待转换 | 返回状态，不是 ADC 值 |
| `HAL_ADC_GetValue` | 读取结果 | 常见为 12 位值 |
| `HAL_ADC_Start_DMA` | DMA采样 | 数据指针常转换为 `uint32_t *` |
| `HAL_ADC_ConvCpltCallback` | DMA/中断完成 | 快速置标志 |

## RTC

| 函数 | 用途 | 注意 |
|---|---|---|
| `HAL_RTC_SetTime/SetDate` | 设置时间/日期 | 指定 BIN 或 BCD 格式 |
| `HAL_RTC_GetTime/GetDate` | 读取 | 通常先 Time 后 Date |
| `HAL_RTCEx_BKUPWrite/Read` | 备份寄存器 | 判断是否首次设置 |
| `HAL_PWR_EnableBkUpAccess` | 允许访问备份域 | 写 RTC/备份寄存器前 |

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
