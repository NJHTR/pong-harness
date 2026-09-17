# 命令与查询契约

## Command

命令表示请求改变事实：

```text
CommandEnvelope
  commandId
  commandType / version
  issuedBy
  issuedAt
  idempotencyKey
  target refs
  expectedVersion?
  payload
  authority context
  correlationId / causationId
```

命令处理结果只能是：接受并已提交、拒绝、需要审批、版本冲突、异步已受理。不能返回“看起来成功”但没有事实写入的结果。

## 幂等

同一个 `idempotencyKey` 在相同主体、命令类型、目标和有效期内只能产生一次有副作用结果。重复请求返回原结果或明确的冲突，不能再次创建 Run、Artifact、审批或 GraphPatch。

## 并发控制

修改 GoalVersion、CanvasDraft、Policy 或锁定对象的命令必须带 `expectedVersion`。不匹配时返回结构化冲突：当前版本、冲突字段、对方变更摘要和可重试建议。

## Query

查询不改变事实，至少声明：

```text
requester
scope
consistency requirement
pagination / cursor
projection freshness
redaction policy
```

查询返回的数据必须标明它是事实、投影、缓存还是历史快照，并包含读取时间和数据版本。

## 长操作

耗时命令先创建 Operation 或 Run，再返回 Handle；客户端通过订阅或查询获得状态。HTTP 连接或 UI 生命周期不能成为长操作的唯一宿主。

## 错误响应

所有服务使用统一 StructuredError，携带 `requestId`、`correlationId`、安全消息和可重试性。禁止把内部异常堆栈、秘密或未脱敏输入作为 API 响应。

