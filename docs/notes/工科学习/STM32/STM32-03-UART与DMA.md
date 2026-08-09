---
title: STM32 UART 与 DMA
created: 2026-08-07
updated: 2026-08-07
tags:
  - 领域/嵌入式
  - 主题/STM32
  - 外设/UART
  - 外设/DMA
  - 类型/学习笔记
  - 难度/进阶
---

# STM32 UART 与 DMA

> 上一篇：[[STM32-02-GPIO与外部中断]] · 下一篇：[[STM32-04-I2C与OLED]] · 速查：[[STM32-HAL函数速查]]

对应第 8–11 集及 DMA、循环缓冲区补充篇。

## 一、通信模型

| 项目 | 发送端输出 | 接收端输入 |
|---|---|---|
| 物理线 | TX | RX |
| 参数 | 波特率、数据位、校验位、停止位 | 必须一致 |
| 数据 | 字节流，无天然“消息边界” | 需要协议判断一帧结束 |

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

## 四、循环缓冲区

DMA/中断负责“把字节拿进来”，循环缓冲区负责“暂存”，解析器负责“识别消息”。三层不要混在一个回调里。

```text
UART硬件 → ISR/DMA → ring buffer → 帧解析器 → 命令队列 → 业务逻辑
```

核心状态：`head` 写入位置、`tail` 读取位置。满时必须明确策略：丢新数据、覆盖旧数据或报错。

## 五、一个简单可靠的文本协议

```text
LED,1\n
MOTOR,500,-500\n
```

收到 `\n` 才解析；检查字段数、范围和超时。二进制协议可使用 `帧头 + 长度 + 命令 + 数据 + CRC`，不要只靠固定帧尾。

## 六、printf 重定向

```c
int _write(int file, char *ptr, int len)
{
  HAL_UART_Transmit(&huart2, (uint8_t *)ptr, len, HAL_MAX_DELAY);
  return len;
}
```

`printf("%.2f")` 会显著增加固件体积；CMake 工程若要浮点格式化，需要在链接选项中启用对应 newlib-nano float printf 选项。资源紧张时发送定点整数。

## 七、故障定位

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
