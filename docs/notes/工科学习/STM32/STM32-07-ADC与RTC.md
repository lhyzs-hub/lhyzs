---
title: STM32 ADC 与 RTC
created: 2026-08-07
updated: 2026-08-15
tags:
  - 领域/嵌入式
  - 主题/STM32
  - 外设/ADC
  - 外设/RTC
  - 类型/学习笔记
  - 难度/进阶
---

# STM32 ADC 与 RTC

> 上一篇：[STM32-06-PWM与电机控制](STM32-06-PWM与电机控制.md) · 下一篇：[STM32-08-工程化专题与综合项目](STM32-08-工程化专题与综合项目.md) · 速查：[STM32-HAL函数速查](STM32-HAL函数速查.md)

对应第 24–27 集：ADC、多通道、NTC、内部参考电压、RTC 和万年历。

## 一、ADC 输入输出

12 位 ADC 把模拟输入变为 0–4095：

```text
Vin ≈ raw / 4095 × Vref
```

这是理想公式；误差来自参考电压、采样时间、源阻抗、噪声、ADC 偏差和分压电阻。

## 二、CubeMX 与单次采样

1. 选择引脚 `ADC1_INx`。
2. ADC1 Regular Conversion，选择通道、Rank 和 Sample Time。
3. F1 上电后先校准。

```c
HAL_ADCEx_Calibration_Start(&hadc1);
HAL_ADC_Start(&hadc1);
if (HAL_ADC_PollForConversion(&hadc1, 10) == HAL_OK) {
  uint32_t raw = HAL_ADC_GetValue(&hadc1);
}
HAL_ADC_Stop(&hadc1);
```

`PollForConversion` 返回状态，真正的 ADC 结果由 `GetValue` 返回。

### 单次采样函数参数

```c
HAL_StatusTypeDef HAL_ADCEx_Calibration_Start(ADC_HandleTypeDef *hadc);
HAL_StatusTypeDef HAL_ADC_Start(ADC_HandleTypeDef *hadc);
HAL_StatusTypeDef HAL_ADC_PollForConversion(ADC_HandleTypeDef *hadc,
                                            uint32_t Timeout);
uint32_t HAL_ADC_GetValue(ADC_HandleTypeDef *hadc);
HAL_StatusTypeDef HAL_ADC_Stop(ADC_HandleTypeDef *hadc);
```

| 函数/参数 | 含义 |
|---|---|
| `hadc` | ADC 句柄地址，如 `&hadc1`；决定使用 ADC1 的配置、通道序列和状态 |
| `HAL_ADCEx_Calibration_Start()` | F1 上对指定 ADC 启动校准，返回 HAL 状态；通常初始化后、正式采样前调用 |
| `HAL_ADC_Start()` | 启动规则组转换；返回 `HAL_OK` 只表示启动成功 |
| `Timeout` | `PollForConversion` 最长等待转换完成的毫秒数；超时返回 `HAL_TIMEOUT` |
| `HAL_ADC_GetValue()` 返回值 | 当前规则转换数据寄存器值，12 位 ADC 常见范围为 0～4095 |
| `HAL_ADC_Stop()` | 停止指定 ADC 的规则转换，返回 HAL 状态 |

## 三、多通道与 DMA

启用 Scan Conversion，配置每个 Rank；DMA 缓冲区顺序与 Rank 一致。

```c
volatile uint16_t adc_dma[3];
HAL_ADC_Start_DMA(&hadc1, (uint32_t *)adc_dma, 3);

void HAL_ADC_ConvCpltCallback(ADC_HandleTypeDef *hadc)
{
  if (hadc == &hadc1) adc_ready = 1;
}
```

### DMA 采样函数参数

```c
HAL_StatusTypeDef HAL_ADC_Start_DMA(
    ADC_HandleTypeDef *hadc,
    uint32_t *pData,
    uint32_t Length);
```

| 参数 | 含义 |
|---|---|
| `hadc` | 使用哪个 ADC，如 `&hadc1` |
| `pData` | DMA 目标数组首地址；HAL 原型要求 `uint32_t *`，所以 `uint16_t` 数组常见强制转换，但 DMA 数据宽度必须在 CubeMX 中正确设为半字 |
| `Length` | 一轮 DMA 要搬运的**转换结果个数**，不是字节数；三通道各采一次通常为 `3` |
| 返回值 | 是否成功启动 ADC 与 DMA；数据完成由回调通知 |

```c
void HAL_ADC_ConvCpltCallback(ADC_HandleTypeDef *hadc);
```

回调参数 `hadc` 用于区分 ADC 实例。若使用 Circular DMA，完成回调会反复进入；回调中只置 `adc_ready` 标志，避免耗时计算。

连续采样要明确：触发源、采样率、DMA Normal/Circular、缓冲区长度以及数据处理能否跟上。

## 四、提高稳定性

- 增大采样时间以适应高阻信号源。
- 多次采样做均值、中值或低通滤波。
- 模拟地与数字噪声源合理布线，电机电源与模拟测量隔离。
- 不要把 `3.3` 当作精确 Vref；可测 VDDA 或使用内部参考进行校正。

## 五、NTC 测温

1. ADC 得到分压。
2. 根据分压电路算 NTC 电阻。
3. 用 Beta 公式或查表求温度。

```text
1/T = 1/T0 + ln(R/R0)/B
T(℃) = T(K) - 273.15
```

先确认 NTC 在分压上方还是下方，否则电阻公式会写反。检查开路、短路和超量程。

## 六、RTC

时钟源优先使用 32.768 kHz LSE；没有外部低速晶振时可用 LSI，但长期精度通常更差。要实现掉电走时，VBAT 域必须有备用电源。

```c
RTC_TimeTypeDef time;
RTC_DateTypeDef date;
HAL_RTC_GetTime(&hrtc, &time, RTC_FORMAT_BIN);
HAL_RTC_GetDate(&hrtc, &date, RTC_FORMAT_BIN); // 必须随后读日期
```

STM32 HAL 读取 RTC 时通常要求先读 Time 再读 Date，以正确解锁影子寄存器。

### RTC 读取函数参数

```c
HAL_StatusTypeDef HAL_RTC_GetTime(
    RTC_HandleTypeDef *hrtc,
    RTC_TimeTypeDef *sTime,
    uint32_t Format);

HAL_StatusTypeDef HAL_RTC_GetDate(
    RTC_HandleTypeDef *hrtc,
    RTC_DateTypeDef *sDate,
    uint32_t Format);
```

| 参数 | 含义 |
|---|---|
| `hrtc` | RTC 句柄地址，通常为 `&hrtc` |
| `sTime` | 接收时、分、秒等字段的结构体地址，如 `&time` |
| `sDate` | 接收年、月、日、星期等字段的结构体地址，如 `&date` |
| `Format` | `RTC_FORMAT_BIN` 返回普通二进制数；`RTC_FORMAT_BCD` 返回 BCD 编码，不能直接按普通十进制使用 |
| 返回值 | `HAL_OK` 表示读取成功，数据写入对应结构体 |

设置时间和日期时，函数原型及参数方向如下：

```c
HAL_StatusTypeDef HAL_RTC_SetTime(
    RTC_HandleTypeDef *hrtc,
    RTC_TimeTypeDef *sTime,
    uint32_t Format);

HAL_StatusTypeDef HAL_RTC_SetDate(
    RTC_HandleTypeDef *hrtc,
    RTC_DateTypeDef *sDate,
    uint32_t Format);
```

| 参数 | 含义 |
|---|---|
| `hrtc` | 要设置的 RTC 句柄地址 |
| `sTime` | 待写入的时间结构体地址；先填写 `Hours`、`Minutes`、`Seconds` 等字段 |
| `sDate` | 待写入的日期结构体地址；先填写 `Year`、`Month`、`Date`、`WeekDay` 等字段 |
| `Format` | 说明结构体字段采用普通二进制数还是 BCD 编码，必须与填写方式一致 |
| 返回值 | `HAL_OK` 表示设置成功；其他状态应进入错误处理，不要直接写初始化标记 |

首次上电才设置时间：在备份寄存器写入魔数，后续复位若魔数存在就不重复初始化。

```c
HAL_PWR_EnableBkUpAccess();
if (HAL_RTCEx_BKUPRead(&hrtc, RTC_BKP_DR1) != 0xA5A5) {
  // 先调用 HAL_RTC_SetTime / HAL_RTC_SetDate，且都成功后再写标记
  HAL_RTCEx_BKUPWrite(&hrtc, RTC_BKP_DR1, 0xA5A5);
}
```

### 备份域函数参数

```c
void HAL_PWR_EnableBkUpAccess(void);
uint32_t HAL_RTCEx_BKUPRead(RTC_HandleTypeDef *hrtc,
                           uint32_t BackupRegister);
void HAL_RTCEx_BKUPWrite(RTC_HandleTypeDef *hrtc,
                         uint32_t BackupRegister,
                         uint32_t Data);
```

| 参数/返回值 | 含义 |
|---|---|
| `HAL_PWR_EnableBkUpAccess()` | 无参数、无返回值，解除备份域写保护；写 RTC 或备份寄存器前调用 |
| `hrtc` | RTC 句柄地址 |
| `BackupRegister` | 备份寄存器编号，如 `RTC_BKP_DR1`；不是任意内存地址 |
| `Data` | 要保存的标记或少量数据，实际有效位宽以具体芯片参考手册为准 |
| `BKUPRead` 返回值 | 指定备份寄存器保存的值 |

## 七、万年历项目拆分

```text
RTC驱动 → 时间模型 → 按键设置 → 显示格式化 → OLED刷新
```

不要让 OLED 或按键逻辑直接修改 RTC 结构体。先修改应用层时间，验证年月日范围后一次写入 RTC。

## 八、验收

- [ ] 电位器采样稳定，电压换算与万用表接近
- [ ] 三通道 DMA 顺序和采样率明确
- [ ] NTC 断线时能报错，不显示荒谬温度
- [ ] 复位不重设 RTC，断主电后 VBAT 仍走时

资料：[ADC电位器](https://docs.keysking.com/docs/stm32/example/ADC_Potentiometer/) · [ADC NTC](https://docs.keysking.com/docs/stm32/example/ADC_NTC/) · [RTC掉电走时](https://docs.keysking.com/docs/stm32/example/Misc_RTC/)

<!-- lhyzs-note-nav:start -->
---
> ← 上一篇：[STM32 PWM 与电机控制](STM32-06-PWM与电机控制.md) · 下一篇：[STM32 工程化专题与综合项目](STM32-08-工程化专题与综合项目.md) →
<!-- lhyzs-note-nav:end -->
