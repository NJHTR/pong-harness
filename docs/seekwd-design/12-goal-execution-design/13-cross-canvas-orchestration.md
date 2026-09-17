# 跨画布编排

## 画布接口

每张可被调用的画布都公开稳定接口：

```text
CanvasInterface
  input schema
  output schema
  event schema
  required capabilities
  authority requirements
  timeout and cancellation semantics
  version compatibility
```

调用方只依赖接口和版本，不读取目标画布的内部节点。

## 关系类型

```text
Call and Wait       调用后等待输出
Fire and Continue   触发后继续，不等待
Event Subscription  订阅目标事件
Data Binding        将结果映射到目标输入
Barrier / Join      等待多个运行汇聚
Compensation        目标失败时执行补偿路径
```

## 运行关联

跨画布运行至少携带：

```text
correlationId
parentRunId
sourceCanvasVersion
targetCanvasVersion
inputMapping
outputMapping
timeout
retry policy
cancel propagation
idempotency key
```

## 等待和恢复

父画布等待子画布时进入 `waiting_dependency`，但不会丢失检查点。子画布成功、失败、取消、超时或需要人工输入时，都要产生可消费事件。父画布根据契约决定继续、修复、替代或结束。

## 循环控制

系统必须检测跨画布的静态循环。需要循环的业务只能通过显式循环或事件反馈关系表达，并设置最大次数、截止时间和退出条件。

