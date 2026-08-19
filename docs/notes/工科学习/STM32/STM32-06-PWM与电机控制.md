---
title: STM32 PWM 与电机控制
created: 2026-08-07
updated: 2026-08-15
tags:
  - 领域/嵌入式
  - 主题/STM32
  - 外设/PWM
  - 主题/电机控制
  - 类型/实践笔记
  - 难度/进阶
---

# STM32 PWM 与电机控制

> 上一篇：[STM32-05-时钟树与定时器](STM32-05-时钟树与定时器.md) · 下一篇：[STM32-07-ADC与RTC](STM32-07-ADC与RTC.md) · 相关：[PID控制笔记](../koala考核期/PID控制笔记.md)

对应第 20、22、23 集及 WS2812、蜂鸣器补充篇。

## 一、PWM 参数

```text
PWM频率 = TIM_CLK / ((PSC+1) × (ARR+1))
占空比 = CCR / (ARR+1)
```

CubeMX：选择 `PWM Generation CHx`，设置 PSC、ARR、Pulse 和极性。启动后修改 CCR 即可改变占空比。

```c
HAL_TIM_PWM_Start(&htim3, TIM_CHANNEL_1);
__HAL_TIM_SET_COMPARE(&htim3, TIM_CHANNEL_1, compare);
```

## 二、PWM 函数参数详解

### 1. 启动 PWM 输出

```c
HAL_StatusTypeDef HAL_TIM_PWM_Start(
    TIM_HandleTypeDef *htim,
    uint32_t Channel);
```

| 参数/返回值 | 含义 |
|---|---|
| `htim` | 已配置 PWM 的定时器句柄地址，如 `&htim3` |
| `Channel` | PWM 通道常量，如 `TIM_CHANNEL_1`，不是数字 `1` |
| 返回值 | `HAL_OK` 表示通道成功启动；调用后引脚是否有波形还取决于复用引脚、ARR/PSC/CCR 和极性配置 |

### 2. 修改比较值和读取周期值

```c
__HAL_TIM_SET_COMPARE(&htim3, TIM_CHANNEL_1, compare);
uint32_t arr = __HAL_TIM_GET_AUTORELOAD(&htim3);
```

| 参数/返回值 | 含义 |
|---|---|
| 第 1 个参数 | 定时器句柄地址 |
| `TIM_CHANNEL_1` | 要修改哪个捕获比较寄存器 CCRx |
| `compare` | 写入 CCRx 的比较值；边沿对齐、向上计数、有效高 PWM 下通常越大占空比越高 |
| GET 返回值 | 自动重装寄存器 ARR 的当前值；一个周期通常包含 `ARR+1` 个计数 |

应先把 `compare` 限制在 `0～ARR+1` 的合理范围。具体到 100% 占空比时的边界行为还与 PWM 模式和芯片定时器实现有关，应使用示波器确认。

### 3. PWM + DMA

```c
HAL_StatusTypeDef HAL_TIM_PWM_Start_DMA(
    TIM_HandleTypeDef *htim,
    uint32_t Channel,
    const uint32_t *pData,
    uint16_t Length);
```

| 参数 | 含义 |
|---|---|
| `htim` | PWM 定时器句柄 |
| `Channel` | DMA 要更新的 PWM 通道 |
| `pData` | 比较值序列首地址；每个元素通常依次送入对应 CCR，用脉宽表示数据 |
| `Length` | 要传输的比较值元素数量，不是字节数；WS2812 通常包含所有数据位和复位低电平槽 |
| 返回值 | 是否成功启动 DMA 传输；真正完成要看 PWM/DMA 完成回调 |

DMA 完成前 `pData` 不可被释放或随意修改。数组元素宽度、DMA 内存宽度和 CCR 寄存器宽度必须匹配。

## 三、呼吸灯

输入：目标亮度 0–100%。输出：CCR。

```c
uint32_t compare = brightness * (__HAL_TIM_GET_AUTORELOAD(&htim3) + 1) / 100;
__HAL_TIM_SET_COMPARE(&htim3, TIM_CHANNEL_1, compare);
```

人的亮度感知不是线性的；视觉更平滑时可使用 gamma 查表。不要在主循环里用大量 `HAL_Delay()`，用定时节拍渐变。

## 四、舵机

常见模拟舵机：约 50 Hz，脉宽通常约 0.5–2.5 ms 对应角度范围，但必须查型号手册并限制机械行程。

```c
uint32_t pulse_us = 500 + angle * 2000 / 180;
__HAL_TIM_SET_COMPARE(&htim2, TIM_CHANNEL_1, pulse_us); // 计数单位为1us时
```

舵机由独立 5 V 电源供电并共地。抖动先查电源压降、地线、脉宽范围和刷新周期。

## 五、直流电机 + DRV8833

GPIO/PWM 只发控制信号，驱动芯片承担电流。

| IN1 | IN2 | 典型状态 |
|---|---|---|
| PWM | 0 | 正转调速 |
| 0 | PWM | 反转调速 |
| 0 | 0 | 滑行/停止（以手册为准） |
| 1 | 1 | 制动（以手册为准） |

```c
void motor_set(int16_t speed)
{
  speed = CLAMP(speed, -1000, 1000);
  if (speed >= 0) {
    set_pwm_ch1(speed); set_pwm_ch2(0);
  } else {
    set_pwm_ch1(0); set_pwm_ch2(-speed);
  }
}
```

换向前先降到 0，并限制加速度。闭环速度控制参见 [PID控制笔记](../koala考核期/PID控制笔记.md)。

## 六、无源蜂鸣器

频率决定音高，占空比影响有效驱动。改变 ARR/PSC 时同时维护 CCR，避免占空比异常。

```text
note_frequency → 计算ARR → CCR=(ARR+1)/2 → 延时/节拍维持音长
```

## 七、WS2812

WS2812 用单线脉宽编码，不是普通 PWM 调光。常用“定时器 PWM + DMA”把每一位映射为不同 CCR 序列，DMA 发送完后保持低电平复位。

流程：RGB 像素 → 按 GRB 顺序展开 24 bit → 生成 CCR 数组 → `HAL_TIM_PWM_Start_DMA()` → 完成回调停止 PWM。

!!! warning "WS2812 电气事项"
    大量灯珠需要独立 5 V 电源；估算最大电流并在数据输入附近加去耦。3.3 V 数据在某些 5 V 灯带上裕量不足，必要时加电平转换。

## 八、常见问题

| 现象 | 检查 |
|---|---|
| PWM 引脚无波形 | 是否 Start、通道/复用引脚是否正确 |
| 频率差一倍 | APB 定时器时钟倍频、PSC/ARR 的 +1 |
| 电机复位单片机 | 供电、共地、去耦、反电动势、走线 |
| 舵机顶死 | 脉宽映射超限、机械负载 |
| WS2812 颜色错 | GRB 顺序、时序、DMA 长度 |

## 九、验收

- [ ] 示波器/逻辑分析仪验证 PWM 频率和占空比
- [ ] 呼吸灯无阻塞运行，同时 UART 可收命令
- [ ] 舵机角度限幅且供电稳定
- [ ] 电机正反转、制动和斜坡控制正确

资料：[PWM呼吸灯](https://docs.keysking.com/docs/stm32/example/PWM_RGB/) · [舵机控制](https://docs.keysking.com/docs/stm32/example/PWM_Servo/) · [DRV8833电机](https://docs.keysking.com/docs/stm32/example/PWM_DRV8833/)

<!-- lhyzs-note-nav:start -->
---
> ← 上一篇：[STM32 时钟树与定时器](STM32-05-时钟树与定时器.md) · 下一篇：[STM32 ADC 与 RTC](STM32-07-ADC与RTC.md) →
<!-- lhyzs-note-nav:end -->
