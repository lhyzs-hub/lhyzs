---
title: STM32 ADC 与 RTC
created: 2026-08-07
updated: 2026-08-07
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

首次上电才设置时间：在备份寄存器写入魔数，后续复位若魔数存在就不重复初始化。

```c
HAL_PWR_EnableBkUpAccess();
if (HAL_RTCEx_BKUPRead(&hrtc, RTC_BKP_DR1) != 0xA5A5) {
  // HAL_RTC_SetTime / HAL_RTC_SetDate
  HAL_RTCEx_BKUPWrite(&hrtc, RTC_BKP_DR1, 0xA5A5);
}
```

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
