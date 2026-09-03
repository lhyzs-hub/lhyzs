---
title: PID 控制实战笔记
created: 2026-07-25
updated: 2026-07-30
tags:
  - 领域/自动控制
  - 主题/PID
  - 主题/电机控制
  - 类型/实践笔记
  - 难度/入门
aliases:
  - PID控制
  - PID调参
---

# PID 控制实战笔记

!!! abstract "这篇笔记解决什么问题"
    用单片机读取传感器或编码器反馈，通过 PID 计算 PWM 输出，让电机速度、位置或温度更快、更稳地跟随目标值。

![pid-control-loop-v2](../adobe%20illustrator/attachments/diagrams/pid-control-loop-v2.png)

## 最小闭环

```mermaid
flowchart LR
    A["目标值"] --> B["计算误差"]
    B --> C["PID 计算"]
    C --> D["PWM / 驱动器"]
    D --> E["直流电机"]
    E --> F["编码器测速"]
    F --> B
```

!!! warning "电机不能直接接单片机引脚"
    单片机只输出逻辑信号或 PWM，实际电机电流必须经过 MOSFET、H 桥或电机驱动模块。单片机、驱动器和编码器需要共地。

## P、I、D 各自负责什么

| 分量 | 直观作用 | 过小时 | 过大时 |
|---|---|---|---|
| `P` 比例 | 看到当前误差就立即纠正 | 响应慢、跟不上目标 | 振荡、超调 |
| `I` 积分 | 累积历史误差，消除长期偏差 | 目标值附近仍有静差 | 积分饱和、恢复慢 |
| `D` 微分 | 根据变化趋势提前刹车 | 抑制超调能力弱 | 放大噪声、输出抖动 |

实操时一般先调 `P`，再加少量 `I`，最后根据需要加入 `D`。

## 直流电机速度环接线

| 模块 | 连接要点 |
|---|---|
| 编码器 A/B 相 | 接支持中断的数字引脚 |
| PWM | 接电机驱动器的使能或 PWM 引脚 |
| DIR | 接驱动器方向引脚 |
| 电机电源 | 单独供电，电压和电流满足电机要求 |
| GND | 单片机、驱动器、电源负极必须共地 |

编码器脉冲适合在中断中只做计数，速度计算和 PID 更新放在固定周期任务中完成。不要在中断里打印串口或执行复杂计算。

## 可复用 PID 代码

```cpp
struct PID {
  float kp = 1.0f;
  float ki = 0.0f;
  float kd = 0.0f;

  float integral = 0.0f;
  float lastMeasurement = 0.0f;
  float outMin = 0.0f;
  float outMax = 255.0f;
  float integralLimit = 100.0f;

  float update(float setpoint, float measurement, float dt) {
    if (dt <= 0.0f) return 0.0f;

    float error = setpoint - measurement;
    integral += error * dt;
    integral = constrain(integral, -integralLimit, integralLimit);

    // 对测量值求微分，减少目标值突变造成的微分冲击
    float derivative = (measurement - lastMeasurement) / dt;
    lastMeasurement = measurement;

    float output = kp * error + ki * integral - kd * derivative;
    return constrain(output, outMin, outMax);
  }
};
```

固定 10 ms 更新一次：

```cpp
PID speedPID;
unsigned long lastPidUs = 0;
const unsigned long PID_PERIOD_US = 10000;

void loop() {
  unsigned long now = micros();

  if (now - lastPidUs >= PID_PERIOD_US) {
    float dt = (now - lastPidUs) / 1000000.0f;
    lastPidUs = now;

    float speedRpm = readMotorSpeedRpm();
    float pwm = speedPID.update(targetRpm, speedRpm, dt);
    analogWrite(PWM_PIN, (int)pwm);
  }

  // 其他任务可以继续运行，不被 delay() 阻塞
}
```

## 手动调参顺序

1. 把 `ki`、`kd` 设为 `0`。
2. 缓慢增大 `kp`，直到响应足够快但还没有持续振荡。
3. 若仍存在长期偏差，逐步增加 `ki`。
4. 若超调明显，加入少量 `kd`。
5. 每次只改一个参数，并记录目标曲线、实测曲线和输出。
6. 换负载、换速度后再次验证，不要只在一个工况下调参。

!!! tip "调参记录表"

    | `Kp` | `Ki` | `Kd` | 上升时间 | 超调 | 稳态误差 | 备注 |
    |---:|---:|---:|---:|---:|---:|---|
    |  |  |  |  |  |  |  |

## 常见故障

- **速度一直为 0**：检查编码器供电、共地、中断引脚和每圈脉冲数。
- **一启动就满速**：反馈方向可能反了，误差越调越大。
- **低速抖动**：减小 `Kp/Kd`，检查编码器分辨率、摩擦和采样周期。
- **长时间饱和后恢复很慢**：限制积分，或输出饱和时暂停继续积分。
- **参数偶尔有效**：确认 PID 周期稳定，避免用大量 `delay()` 阻塞主循环。
- **PWM 有输出但电机不转**：检查驱动器使能、电机电源和电流限制。

## 相关笔记

- [步进电机笔记](步进电机笔记.md)
- [半小时学完单片机基础](../STM32/半小时学完单片机基础.md#ba-5-pwm-0-1-0666)
- [半小时学完单片机基础](../STM32/半小时学完单片机基础.md#ba-8-irq)

<!-- lhyzs-note-nav:start -->
---
> 下一篇：[机械任务与项目推进笔记](机械任务笔记.md) →
<!-- lhyzs-note-nav:end -->
