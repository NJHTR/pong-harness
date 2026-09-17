# 图执行语义

## 图编译结果

运行前，Harness 将 CanvasVersion 编译为可调度计划：

```text
normalized nodes
resolved port bindings
resolved conditions
dependency index
event subscriptions
wait groups
failure and compensation paths
resource reservations
policy decisions
```

编译器发现无法解析的输入、端口、循环、权限或终止问题时，不生成可运行计划。

## 触发规则

节点可以由以下原因进入候选队列：

```text
all required data available
control predecessor reached a matching terminal state
event received and accepted
wait condition satisfied
manual start
retry or resume checkpoint
```

候选节点仍须通过权限、环境、预算、幂等和锁定检查。

## 节点终态

```text
queued
running
streaming
waiting_input
waiting_dependency
waiting_environment
waiting_approval
paused
repairing
succeeded
failed
cancelled
skipped
blocked
```

节点状态转换必须遵循定义的状态机；UI 不能自行制造状态。状态变化均产生事件和时间戳。

## 下游可达性

节点成功只会使符合条件的下游边变为可用。节点失败会根据错误策略触发错误边、补偿边或阻断下游；不能因为“还有别的路径”就默默吞掉失败。

## 人工执行

人工节点进入 `waiting_input` 或 `waiting_approval`，提交后产生与自动执行相同的 NodeResult、Observation、Evidence 和 Artifact。调度器不区分结果由人类还是机器产生，只区分主体和证据来源。

## 重试与重放

重试是同一逻辑节点的新 Attempt；重放是从检查点或历史输入重新创建运行分支。两者都要声明是否复用旧 Artifact、是否重新观察外部状态和是否可能重复副作用。

## 流和部分结果

流式节点可以产生部分结果，但只有完成信号和局部验证通过后才可满足必需输出。下游若声明支持增量输入，可以在流中运行；否则必须等待流结束。

## 终止性

每个 Run 必须最终到达成功、失败、取消、过期或明确等待状态。无限等待、无限循环、无上限重试和无人处理的孤儿子运行都属于编译或运行错误。

