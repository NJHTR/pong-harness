# 端口与值规范

## 端口不是装饰性连接点

端口是可静态检查、可运行时验证的交换契约。边只能连接端口，节点之间不能通过隐式全局变量、名称猜测或界面位置传递关键数据。

## PortDefinition

```text
portId                定义版本内稳定 ID
label                 可本地化展示名称
direction             input / output
kind                  data / control / event / stream / error
valueSchema           数据契约
required              是否必须有值
cardinality           one / many
availability          required at start / optional / late-bound
defaultValue          可选默认值或默认值生成器
mergePolicy           多输入如何合并
sensitivityPolicy     可接受和传播的敏感等级
description
```

端口的 `portId` 不使用显示名称生成。改变文案、语言或视觉位置不会改变连线含义。

## 五类端口

### Data

传递类型化值或 Artifact 引用。Data Port 有 schema、基数、默认值和数据血缘。

### Control

表达执行上的成功、失败、取消、跳过或显式分支。Control Edge 不携带业务数据，避免“通过空字符串暗示失败”等隐式协议。

### Event

表达事实已经发生，例如状态变化、外部回调、产物出现或人工提交。事件有类型、时间、来源、有效期和去重键。

### Stream

表达增量值。Stream 必须声明分块 Schema、完成信号、背压策略、缓存策略和订阅是否可重放。

### Error

传递结构化故障对象，供错误处理、补偿或诊断节点消费。没有连接的 Error Port 仍会使运行记录失败，但不一定导致整个图失败。

## 值模型

```text
Scalar             原子值
StructuredValue    有 Schema 的对象或集合
ArtifactReference  指向版本化资源
SecretReference    只可在授权上下文中解析的秘密引用
StreamReference    指向可消费流
EventEnvelope      事件载荷和元数据
Absent             明确的“没有值”，区别于 null 和未到达
```

所有运行时值带 `ValueEnvelope`：

```text
schema version
value or reference
provenance
createdAt
freshness
sensitivity
integrity checksum when applicable
```

## 类型兼容性

连接合法当且仅当：

1. 方向是 output -> input。
2. kind 兼容，或存在明确适配器。
3. 源 Schema 可赋值给目标 Schema，或存在经批准转换。
4. 基数、敏感度和可用时机兼容。
5. 目标没有被不允许的多源值覆盖。

`any` 不能作为逃避类型检查的默认类型；只有显式标记为动态输入的端口可以接受任意值，且必须在运行时验证。

## 多输入和缺失值

输入端口有明确定义的 merge policy：

```text
single          只能有一个有效来源
all             收集全部来源，等待全部可用
first           首个有效来源到达后触发
latest          保留最近版本
append          追加成有序集合
reduce          使用定义声明的聚合器
manual          由人类或 Agent 在节点内选择
```

没有值、值为 null、值为空和上游尚未完成是不同状态。节点不能将它们混为一谈。

## 端口绑定

输入的值来源按优先级解析：

```text
显式边绑定
  -> 调用方输入映射
  -> 节点实例局部值
  -> 定义默认值
  -> 缺失值处理
```

解析结果和实际采用来源必须记录在 NodeRun 输入快照中。

