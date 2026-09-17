# 观测与可追溯性

## 三类运行信号

```text
Log       人和开发者阅读的离散诊断信息
Metric    可聚合的数量和耗时
Trace     一次目标运行跨节点、画布和执行单元的因果链
```

三者共享 `goalId`、`runId`、`nodeRunId`、`correlationId` 和 `causationId`，但不能用日志字符串替代结构化事件。

## 必须记录的事件

```text
goal accepted / normalized / changed
plan created / selected / rejected
capability discovered / bound / replaced
graph created / patched / published
node queued / started / waiting / finished
permission requested / granted / denied / revoked
artifact created / referenced / delivered / deleted
verification started / passed / failed
control handed off
run paused / resumed / cancelled / recovered
```

## 敏感数据

日志和追踪默认只记录摘要、哈希、字段路径和引用。秘密、完整用户输入、未授权资源内容和外部响应原文必须经过策略过滤。脱敏之后仍要保证足够的调试关联性。

## 观测查询

用户至少可以按目标、画布、运行、节点、Artifact、能力、主体、权限和错误查询。查询结果显示事实时间、观察时间、是否过期以及是否来自重放。

## 可用性与成本

运行时记录排队时间、执行时间、等待时间、重试次数、资源消耗、外部调用次数和产物大小。指标用于控制预算和发现退化，不用于替代验证器。

