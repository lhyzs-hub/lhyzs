---
title: STM32 I2C 与 OLED
created: 2026-08-07
updated: 2026-08-07
tags:
  - 领域/嵌入式
  - 主题/STM32
  - 外设/I2C
  - 模块/OLED
  - 类型/学习笔记
  - 难度/进阶
---

# STM32 I2C 与 OLED

> 上一篇：[[STM32-03-UART与DMA]] · 下一篇：[[STM32-05-时钟树与定时器]] · 速查：[[STM32-HAL函数速查]]

对应第 12–14 集及温湿度计番外。

## 一、I²C 的输入输出

| 信号 | 谁输出 | 说明 |
|---|---|---|
| SCL | 通常主机输出 | 时钟，开漏，需要上拉 |
| SDA | 主从双方 | 数据，开漏，需要上拉 |
| 地址 | 主机输出 | 选择从机及读写方向 |
| ACK/NACK | 接收方输出 | 是否应答 |

STM32 HAL 常用的是**左移一位后的 8 位地址参数**。若手册写 AHT20 7 位地址 `0x38`，HAL 调用通常传 `0x38 << 1`，也就是 `0x70`。这是最常见的地址坑。

## 二、CubeMX

1. `Connectivity → I2C1 → I2C`。
2. 核对 SCL/SDA 引脚和重映射，常用 100 kHz 起步。
3. 硬件必须有上拉电阻；板载模块通常已带。
4. 使用中断/DMA时再启用 Event/Error IRQ 和 DMA 请求。

## 三、HAL 调用模式

```c
#define AHT20_ADDR (0x38 << 1)

HAL_I2C_Master_Transmit(&hi2c1, AHT20_ADDR, cmd, cmd_len, 100);
HAL_I2C_Master_Receive(&hi2c1, AHT20_ADDR, data, data_len, 100);
```

带寄存器地址的设备优先用：

```c
HAL_I2C_Mem_Read(&hi2c1, DEV_ADDR, reg,
                 I2C_MEMADD_SIZE_8BIT, data, len, 100);
```

每次检查返回值：

```c
HAL_StatusTypeDef st = HAL_I2C_IsDeviceReady(&hi2c1, DEV_ADDR, 3, 100);
if (st != HAL_OK) { error_count++; }
```

## 四、AHT20 读取流程

1. 上电等待并检查状态。
2. 必要时初始化/校准。
3. 发送测量命令。
4. 等待传感器完成，读取状态与 6 字节数据。
5. 拼接 20 位湿度和温度原始值，再换算。

```c
humidity = raw_h * 100.0f / 1048576.0f;
temperature = raw_t * 200.0f / 1048576.0f - 50.0f;
```

输出范围要验证；读取间隔建议不少于 500 ms。通信失败时不要继续使用上一次未标记的数据。

## 五、从阻塞到状态机

入门可以“发送 → Delay → 接收”。进阶应拆为状态：

```text
IDLE → SEND_CMD → WAIT_SENSOR → START_RX → PARSE → IDLE
                      ↓超时/错误
                     RECOVER
```

每个状态快速返回，使用 `HAL_GetTick()` 判断时间。中断/DMA回调只改变状态和保存长度。

## 六、OLED 驱动分层

```text
业务界面 → 字符/图形API → 显存buffer → OLED刷新 → I2C发送
```

典型顺序：

```c
HAL_Delay(20);
OLED_Init();
OLED_NewFrame();
OLED_PrintString(0, 0, "STM32", &font16x16, OLED_COLOR_NORMAL);
OLED_ShowFrame();
```

- `OLED_NewFrame()`：清理/准备 RAM 中的帧缓冲。
- 绘图函数：只修改帧缓冲。
- `OLED_ShowFrame()`：把整帧通过 I²C 发到屏幕。

不要在每画一个字符后刷新整屏。固定刷新率 10–30 Hz 通常足够。

## 七、字模与中文

- 字库决定可显示字符；UTF-8 字符串不代表驱动自动支持中文。
- 中文通常需要取模并把点阵放进 `font.c`。
- 大数组建议声明 `const`，放在 Flash 而非 RAM。

## 八、故障定位

| 现象 | 检查 |
|---|---|
| 一直 NACK | 7/8 位地址、供电、上拉、地址冲突 |
| 总线 Busy | SDA 被拉低、从机中途复位、引脚模式错误 |
| OLED 有电不显示 | 控制器型号、地址、初始化序列、刷新函数 |
| 偶发错误 | 线太长、上拉过弱、速率过高、没有超时恢复 |

## 练习

1. 扫描 0x08–0x77，列出应答地址。
2. 读取 AHT20，并通过 UART 输出原始值与换算值。
3. OLED 每 200 ms 更新一次数值，但传感器每 1 s 采样一次。
4. 拔掉传感器，程序不死机并显示 `SENSOR ERROR`。

> [!note] SPI 补充
> Keysking 主线没有单独的硬件 SPI 章节。理解 I²C 后可补做 SPI：SCK/MOSI/MISO/CS，重点比较“寻址方式、全双工、速度、片选”。

资料：[AHT20例程](https://docs.keysking.com/docs/stm32/example/I2C_AHT20/) · [OLED例程](https://docs.keysking.com/docs/stm32/example/I2C_OLED/)
