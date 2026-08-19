---
title: STM32 UART 与 DMA
created: 2026-08-07
updated: 2026-08-15
tags:
  - 领域/嵌入式
  - 主题/STM32
  - 外设/UART
  - 外设/DMA
  - 类型/学习笔记
  - 难度/进阶
---

# STM32 UART 与 DMA

> 上一篇：[STM32-02-GPIO与外部中断](STM32-02-GPIO与外部中断.md) · 下一篇：[STM32-04-I2C与OLED](STM32-04-I2C与OLED.md) · 速查：[STM32-HAL函数速查](STM32-HAL函数速查.md)

对应第 8–11 集及 DMA、循环缓冲区补充篇。

## 一、通信模型

| 项目  | 发送端输出           | 接收端输入      |
| --- | --------------- | ---------- |
| 物理线 | TX              | RX         |
| 参数  | 波特率、数据位、校验位、停止位 | 必须一致       |
| 数据  | 字节流，无天然“消息边界”   | 需要协议判断一帧结束 |

最少连接 `TX→RX`、`RX←TX`、`GND↔GND`。TTL 串口不是 RS-232 电平。

## 二、CubeMX

1. `USARTx → Asynchronous`。
2. 常用 `115200, 8 data bits, no parity, 1 stop bit`。
3. 中断模式：NVIC 打开 USART global interrupt。
4. DMA 模式：为 RX/TX 添加 DMA 请求；通常 RX 设 Normal 或 Circular，按程序设计选择。

## 三、三种收发方式

### 轮询：最容易验证

```c
uint8_t tx[] = "hello\r\n";
HAL_UART_Transmit(&huart2, tx, sizeof(tx) - 1, 100);
HAL_UART_Receive(&huart2, rx, 1, 1000);
```

调用返回时传输已经完成或超时。适合启动测试，不适合长期等待输入。

### 中断：CPU 不必等待

```c
HAL_UART_Receive_IT(&huart2, &rx_byte, 1);

void HAL_UART_RxCpltCallback(UART_HandleTypeDef *huart)
{
  if (huart == &huart2) {
    ring_put_isr(rx_byte);
    HAL_UART_Receive_IT(&huart2, &rx_byte, 1); // 重新武装
  }
}
```

回调只表示“本次指定长度接收完成”。忘记再次调用，之后就收不到数据。

### DMA + 空闲线：不定长数据首选

```c
HAL_UARTEx_ReceiveToIdle_DMA(&huart2, rx_dma, sizeof(rx_dma));
__HAL_DMA_DISABLE_IT(huart2.hdmarx, DMA_IT_HT); // 不需要半传输事件时

void HAL_UARTEx_RxEventCallback(UART_HandleTypeDef *huart, uint16_t Size)
{
  if (huart == &huart2) {
    rx_event_length = Size;
    rx_event_ready = 1;
    HAL_UARTEx_ReceiveToIdle_DMA(&huart2, rx_dma, sizeof(rx_dma));
  }
}
```

不同 HAL 包对 DMA Normal/Circular 和回调触发行为可能不同，调试时先打印 `Size` 并查当前 F1 HAL 文档。

## 四、UART 函数参数详解

### 1. 轮询发送与接收

```c
HAL_StatusTypeDef HAL_UART_Transmit(
    UART_HandleTypeDef *huart,
    const uint8_t *pData,
    uint16_t Size,
    uint32_t Timeout);

HAL_StatusTypeDef HAL_UART_Receive(
    UART_HandleTypeDef *huart,
    uint8_t *pData,
    uint16_t Size,
    uint32_t Timeout);
```

| 参数 | 含义 | 示例/易错点 |
|---|---|---|
| `huart` | 串口句柄地址，包含实例、配置和运行状态 | `&huart1`、`&huart2`；不要把 USART1 的数据传给 `&huart2` |
| `pData` | 发送缓冲区首地址或接收缓冲区首地址 | 字符串要转为 `uint8_t *`；接收区必须可写 |
| `Size` | 要收发的**字节数** | 数组用 `sizeof(buf)`；字符串常用 `strlen()` 或 `sizeof(tx)-1` 去掉结尾 `\0` |
| `Timeout` | 最长阻塞时间，单位通常为毫秒 | `100`、`1000`；`HAL_MAX_DELAY` 可能永久等待 |
| 返回值 | `HAL_OK`、`HAL_BUSY`、`HAL_TIMEOUT` 或 `HAL_ERROR` | 返回 `HAL_OK` 才表示本次轮询传输完成 |

### 2. 中断收发

```c
HAL_StatusTypeDef HAL_UART_Receive_IT(
    UART_HandleTypeDef *huart,
    uint8_t *pData,
    uint16_t Size);
```

`huart`、`pData`、`Size` 与轮询模式相同，但没有 `Timeout`。返回 `HAL_OK` 只表示“成功启动接收”，真正收满 `Size` 个字节后才调用：

```c
void HAL_UART_RxCpltCallback(UART_HandleTypeDef *huart);
```

回调参数 `huart` 指明哪个串口完成接收，应先判断 `if (huart == &huart2)`。异步操作完成前，`pData` 指向的缓冲区必须一直存在，不能使用已经退出函数的局部数组。

其余常用异步接口的完整原型如下：

```c
HAL_StatusTypeDef HAL_UART_Transmit_IT(
    UART_HandleTypeDef *huart,
    const uint8_t *pData,
    uint16_t Size);

HAL_StatusTypeDef HAL_UART_Transmit_DMA(
    UART_HandleTypeDef *huart,
    const uint8_t *pData,
    uint16_t Size);

HAL_StatusTypeDef HAL_UART_Receive_DMA(
    UART_HandleTypeDef *huart,
    uint8_t *pData,
    uint16_t Size);

void HAL_UART_TxCpltCallback(UART_HandleTypeDef *huart);
```

| 参数/返回值 | 含义 |
|---|---|
| `huart` | 要操作或刚完成传输的串口句柄地址 |
| `pData` | 发送源缓冲区或接收目标缓冲区的首地址 |
| `Size` | 要发送或接收的字节数；不是数组最大下标，也不自动包含字符串结尾 `\0` |
| 启动函数返回值 | `HAL_OK` 仅表示异步任务启动成功；`HAL_BUSY` 常表示上一次同方向传输还未结束 |
| `HAL_UART_TxCpltCallback()` 的 `huart` | 指明哪个串口发送完成；多个串口共用回调时必须判断句柄 |

中断与 DMA 版本都没有 `Timeout` 参数。传输完成前不要修改发送区，也不要读取尚未接收完成的接收区；缓冲区不能是已经离开作用域的局部数组。

### 3. DMA + 空闲线接收

```c
HAL_StatusTypeDef HAL_UARTEx_ReceiveToIdle_DMA(
    UART_HandleTypeDef *huart,
    uint8_t *pData,
    uint16_t Size);

void HAL_UARTEx_RxEventCallback(
    UART_HandleTypeDef *huart,
    uint16_t Size);
```

| 参数 | 含义 |
|---|---|
| `huart` | 使用哪个 UART，以及通过 `huart->hdmarx` 关联哪条接收 DMA |
| `pData` | DMA 要写入的接收数组首地址；应为全局、静态或其他长期有效内存 |
| 启动函数的 `Size` | 整个 DMA 接收缓冲区容量，单位为字节 |
| 回调的 `Size` | 当前事件对应的缓冲区写入位置/接收长度；Normal 模式常可直接理解为从数组开头收到的字节数 |

Circular 模式下，回调 `Size` 不是永远从 0 开始的“本次新增长度”，应保存上次位置，分别处理未回绕和回绕区间。

### 4. 关闭 DMA 传输过半中断

```c
__HAL_DMA_DISABLE_IT(huart2.hdmarx, DMA_IT_HT);
```

| 参数              | 含义                                  |
| --------------- | ----------------------------------- |
| `huart2.hdmarx` | UART2 接收方向关联的 DMA 句柄指针              |
| `DMA_IT_HT`     | Half Transfer，半传输中断标志；关闭它不会关闭传输完成中断 |

调用前必须确保 CubeMX 已为 RX 配置 DMA，`hdmarx` 不是空指针。

## 五、循环缓冲区

DMA/中断负责“把字节拿进来”，循环缓冲区负责“暂存”，解析器负责“识别消息”。三层不要混在一个回调里。

```text
UART硬件 → ISR/DMA → ring buffer → 帧解析器 → 命令队列 → 业务逻辑
```

核心状态：`head` 写入位置、`tail` 读取位置。满时必须明确策略：丢新数据、覆盖旧数据或报错。

## 六、一个简单可靠的文本协议

```text
LED,1\n
MOTOR,500,-500\n
```

收到 `\n` 才解析；检查字段数、范围和超时。二进制协议可使用 `帧头 + 长度 + 命令 + 数据 + CRC`，不要只靠固定帧尾。

## 七、printf 重定向

```c
int _write(int file, char *ptr, int len)
{
  HAL_UART_Transmit(&huart2, (uint8_t *)ptr, len, HAL_MAX_DELAY);
  return len;
}
```

| 参数/返回值 | 含义 |
|---|---|
| `file` | C 库传入的文件描述符，常见 `stdout/stderr`；简单串口重定向中可暂不使用 |
| `ptr` | `printf` 已格式化好的字符数据首地址 |
| `len` | 需要发送的字节数，不保证字符串以 `\0` 结尾 |
| 返回值 | 实际写出的字节数；若发送失败，应根据工程策略返回错误或已发送数量，而不是始终假装成功 |

`printf("%.2f")` 会显著增加固件体积；CMake 工程若要浮点格式化，需要在链接选项中启用对应 newlib-nano float printf 选项。资源紧张时发送定点整数。

## 八、故障定位

| 现象 | 原因 |
|---|---|
| 全是乱码 | 波特率或时钟错误、参数不一致 |
| 完全收不到 | TX/RX 未交叉、未共地、未重新启动接收 |
| 偶尔丢包 | 回调太慢、缓冲区太小、没有流控/协议 |
| DMA 只收一次 | Normal 模式完成后未重新启动 |
| 黏包/拆包 | UART 是字节流，解析器错误，不是硬件故障 |

## 练习与验收

- [ ] 轮询发送 `hello`
- [ ] 中断逐字节回显
- [ ] DMA+IDLE 接收任意长度
- [ ] 循环缓冲区解析 `LED,0/1`
- [ ] 连续发送 1000 条命令，无死机且能统计错误帧

资料：[UART轮询例程](https://docs.keysking.com/docs/stm32/example/UART_RGB/) · [UART中断例程](https://docs.keysking.com/docs/stm32/example/UART_RGB_IT/) · [循环缓冲区例程](https://docs.keysking.com/docs/stm32/example/UART_COMMAND/)

<!-- lhyzs-note-nav:start -->
---
> ← 上一篇：[STM32 GPIO 与外部中断](STM32-02-GPIO与外部中断.md) · 下一篇：[STM32 I2C 与 OLED](STM32-04-I2C与OLED.md) →
<!-- lhyzs-note-nav:end -->
