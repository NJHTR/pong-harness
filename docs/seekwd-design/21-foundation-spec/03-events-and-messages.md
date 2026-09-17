# 事件与消息

## EventEnvelope

```text
EventEnvelope
  eventId
  eventType
  eventVersion
  producer
  subject
  correlationId
  causationId
  occurredAt
  observedAt
  sequence?
  payload
  payloadSchema
  delivery metadata
  sensitivity
```

事件载荷只描述事实，不携带“请忽略系统策略”之类的控制指令。控制行为由订阅方根据自身策略决定。

## 事件类别

```text
domain event       业务或目标状态事实
runtime event      节点、运行、队列和检查点事实
observation event  对外部状态的观察
authority event    授权、审批、撤销和过期
graph event        版本、补丁、连接和接口变化
```

## 投递语义

默认采用至少一次投递。消费者必须使用 `eventId` 或声明的去重键幂等处理。只有经过明确实现和测试，才能声明至多一次或恰好一次。

每个订阅声明：

```text
filter
accepted event versions
ordering scope
ack deadline
retry policy
dead-letter policy
replay policy
```

## 顺序

事件只在声明的 ordering scope 内保证顺序，例如同一 NodeRun、同一 Run 或同一资源。不同 scope 的事件不得假设全局顺序。

## 重放

重放事件用于恢复、调试或重新计算投影，不默认重新执行有副作用的动作。事件处理器必须区分 `replay` 和 `live` 模式，并在重放时禁止外部副作用或使用隔离写入。

## 事件与状态

状态是事件的投影结果。关键状态转移必须由事件驱动并可重建；缓存可以加速，但不能成为唯一事实来源。事件缺失、重复、乱序和延迟都是正常故障，需要由消费者处理。

## 事件版本

兼容新增字段可以在同一主版本中进行；删除字段、改变语义或改变必填条件需要新事件版本和迁移期。生产消费者必须拒绝无法理解的关键事件，而不是静默忽略。

