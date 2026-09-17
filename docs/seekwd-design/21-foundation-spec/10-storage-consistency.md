# 存储与一致性

## 数据类别

```text
definition data      节点、能力、画布和 Schema 定义
runtime data         Run、NodeRun、状态、队列和检查点
content data         Artifact 和日志内容
index data           搜索、投影、统计和 UI 视图
secret data          凭据引用和加密材料
audit data           不可篡改的审计事件
```

不同类别可以使用不同存储，但必须定义事实来源和恢复方式。

## 事实与投影

关键版本、状态转移、权限决定和 Artifact 引用是事实；列表、计数、搜索和时间线是可重建投影。投影落后时 UI 应显示同步状态，不得把过期投影当作最新事实。

## 原子操作

以下关系必须原子提交或具有可恢复提交日志：

```text
NodeRun terminal state + output reference
GraphPatch decision + new graph version
Approval decision + grant state
Checkpoint + run state
Artifact revision + lineage record
```

## 幂等写入

所有外部重试可能触发的写入都使用幂等键。重复消息、重复回调和客户端重发不能生成重复产物、重复审批或互相矛盾的终态。

## 一致性级别

```text
strong              权限、版本、终态和引用关系
read-your-writes    当前用户刚提交的草稿和操作
eventual            搜索、统计、聚合时间线
```

必须在 API 和 UI 中标明延迟一致的数据，不要让用户误以为搜索结果就是事实来源。

## 恢复

恢复顺序：加载事实、验证版本和授权、重建状态投影、检查外部句柄、恢复队列、重新观察可能过期的外部状态。恢复不能直接从 UI 缓存继续。

