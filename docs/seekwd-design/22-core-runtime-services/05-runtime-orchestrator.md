# 运行编排服务

## 创建运行

`startRun` 的最小步骤：

```text
resolve exact GoalVersion and CanvasRevision/CanvasRelease
resolve NodeDefinitionVersions
resolve capability bindings and execution contexts
evaluate policy and obtain grants
materialize input Artifact revisions
compile scheduling plan
append RunCreated and initial NodeQueued events
```

任何一步无法完成，都不产生部分可执行 Run；可保留预备失败记录供诊断。

## 调度循环

```text
consume runtime events
recompute affected dependency set
identify ready nodes
apply concurrency, budget and authority guards
allocate context
dispatch to Executor Gateway
persist state event before and after external side effect boundary
```

调度器只响应事实事件和明确策略，不根据 UI 文案或模型自然语言猜测节点状态。

## 等待

等待是可持久化状态。每个 WaitRecord 包含等待对象、恢复条件、超时、取消语义、订阅游标和恢复节点。恢复后验证等待对象的版本与新鲜度。

## 运行分支

重放、从检查点恢复、修复或用户选择替代路径时创建 Run Branch。分支引用父 Run 和共享 Artifact，但拥有自己的图快照、状态事件和验证报告。

## 结束

Run 结束前编排器要求 Verification Service 生成完整报告，并检查是否仍有活动或孤儿子运行。完成后写入 DeliveryManifest、终态事件和资源清理计划。
