---
title: STM32 I2C 与 OLED
created: 2026-08-07
updated: 2026-08-15
tags:
  - 领域/嵌入式
  - 主题/STM32
  - 外设/I2C
  - 模块/OLED
  - 类型/学习笔记
  - 难度/进阶
---

# STM32 I2C 与 OLED

> 上一篇：[STM32-03-UART与DMA](STM32-03-UART与DMA.md) · 下一篇：[STM32-05-时钟树与定时器](STM32-05-时钟树与定时器.md) · 速查：[STM32-HAL函数速查](STM32-HAL函数速查.md)

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

## 四、I²C 函数参数详解

### 1. 主机发送与接收

```c
HAL_StatusTypeDef HAL_I2C_Master_Transmit(
    I2C_HandleTypeDef *hi2c,
    uint16_t DevAddress,
    uint8_t *pData,
    uint16_t Size,
    uint32_t Timeout);

HAL_StatusTypeDef HAL_I2C_Master_Receive(
    I2C_HandleTypeDef *hi2c,
    uint16_t DevAddress,
    uint8_t *pData,
    uint16_t Size,
    uint32_t Timeout);
```

| 参数 | 含义 | 示例/易错点 |
|---|---|---|
| `hi2c` | I²C 外设句柄地址 | `&hi2c1`、`&hi2c2` |
| `DevAddress` | HAL 使用的从机地址参数 | 常传 `7位地址 << 1`，AHT20 为 `0x38 << 1`；不要重复左移 |
| `pData` | 发送数据或接收数组的首地址 | 接收缓冲区必须可写且容量足够 |
| `Size` | 要传输的字节数 | 不是数组元素最大下标；命令数组可用 `sizeof(cmd)` |
| `Timeout` | 最长阻塞时间，单位通常为毫秒 | 超时不代表设备一定损坏，也可能是地址、上拉或总线状态错误 |
| 返回值 | `HAL_OK/BUSY/TIMEOUT/ERROR` | 每次通信都应检查，失败时不要解析旧缓冲区 |

### 2. 读取设备内部寄存器

```c
HAL_StatusTypeDef HAL_I2C_Mem_Read(
    I2C_HandleTypeDef *hi2c,
    uint16_t DevAddress,
    uint16_t MemAddress,
    uint16_t MemAddSize,
    uint8_t *pData,
    uint16_t Size,
    uint32_t Timeout);
```

| 参数 | 含义 |
|---|---|
| `hi2c` | I²C 句柄，如 `&hi2c1` |
| `DevAddress` | 左移后的设备地址，例如 `0x68 << 1` |
| `MemAddress` | 从机内部寄存器地址，例如状态寄存器 `0x71` |
| `MemAddSize` | 寄存器地址宽度：`I2C_MEMADD_SIZE_8BIT` 或 `I2C_MEMADD_SIZE_16BIT` |
| `pData` | 接收数据缓冲区 |
| `Size` | 要读取的数据字节数 |
| `Timeout` | 阻塞超时毫秒数 |
| 返回值 | HAL 状态；真正数据写入 `pData` |

写设备内部寄存器的完整原型为：

```c
HAL_StatusTypeDef HAL_I2C_Mem_Write(
    I2C_HandleTypeDef *hi2c,
    uint16_t DevAddress,
    uint16_t MemAddress,
    uint16_t MemAddSize,
    uint8_t *pData,
    uint16_t Size,
    uint32_t Timeout);
```

参数顺序和读取函数相同，但 `pData` 是待写数据的首地址，缓冲区内容不会由该函数填写。`MemAddress` 是芯片内部寄存器编号，`DevAddress` 是总线上选择芯片的地址，两者不要混淆。

### 3. 探测设备是否应答

```c
HAL_StatusTypeDef HAL_I2C_IsDeviceReady(
    I2C_HandleTypeDef *hi2c,
    uint16_t DevAddress,
    uint32_t Trials,
    uint32_t Timeout);
```

| 参数 | 含义 |
|---|---|
| `hi2c` | I²C 句柄 |
| `DevAddress` | 左移后的设备地址 |
| `Trials` | 最多尝试发送地址的次数，不是扫描地址数量 |
| `Timeout` | 每次等待的超时设置 |
| 返回值 | `HAL_OK` 表示设备应答；其他状态表示本次探测失败 |

## 五、AHT20 读取流程

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

## 六、从阻塞到状态机

入门可以“发送 → Delay → 接收”。进阶应拆为状态：

```text
IDLE → SEND_CMD → WAIT_SENSOR → START_RX → PARSE → IDLE
                      ↓超时/错误
                     RECOVER
```

每个状态快速返回，使用 `HAL_GetTick()` 判断时间。中断/DMA回调只改变状态和保存长度。

## 七、OLED 驱动分层

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

以教程驱动常见的 `OLED_PrintString()` 为例：

| 参数 | 含义 |
|---|---|
| 第 1 个参数 `x` | 字符串左上角横坐标，单位由驱动定义，通常是像素 |
| 第 2 个参数 `y` | 字符串左上角纵坐标 |
| 第 3 个参数 `str` | 以 `\0` 结尾的字符串地址 |
| 第 4 个参数 `font` | 字体/字模结构体地址，如 `&font16x16` |
| 第 5 个参数 `color` | 正常、反色等绘制模式，如 `OLED_COLOR_NORMAL` |

自定义 OLED 库的函数原型并非 STM32 HAL 标准，不同仓库可能改变参数顺序，使用时应以对应头文件声明为准。

- `OLED_NewFrame()`：清理/准备 RAM 中的帧缓冲。
- 绘图函数：只修改帧缓冲。
- `OLED_ShowFrame()`：把整帧通过 I²C 发到屏幕。

不要在每画一个字符后刷新整屏。固定刷新率 10–30 Hz 通常足够。

## 八、字模与中文

- 字库决定可显示字符；UTF-8 字符串不代表驱动自动支持中文。
- 中文通常需要取模并把点阵放进 `font.c`。
- 大数组建议声明 `const`，放在 Flash 而非 RAM。

## 九、故障定位

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

!!! note "SPI 补充"
    Keysking 主线没有单独的硬件 SPI 章节。理解 I²C 后可补做 SPI：SCK/MOSI/MISO/CS，重点比较“寻址方式、全双工、速度、片选”。

资料：[AHT20例程](https://docs.keysking.com/docs/stm32/example/I2C_AHT20/) · [OLED例程](https://docs.keysking.com/docs/stm32/example/I2C_OLED/)

<!-- lhyzs-note-nav:start -->
---
> ← 上一篇：[STM32 UART 与 DMA](STM32-03-UART与DMA.md) · 下一篇：[STM32 时钟树与定时器](STM32-05-时钟树与定时器.md) →
<!-- lhyzs-note-nav:end -->
