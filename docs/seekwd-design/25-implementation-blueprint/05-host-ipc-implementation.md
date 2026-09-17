# Host IPC 实现

## 通道

Workbench 与 Host 使用本机受保护通道。通道应支持请求响应、事件订阅、二进制或 Artifact 流、取消和断线恢复；具体传输可按操作系统适配。

## 命令封装

```text
CommandEnvelope {
  protocolVersion
  commandId
  commandType
  idempotencyKey
  principalSession
  expectedVersions
  correlationId
  payload
}
```

Host 先校验会话、Schema、版本和幂等，再交给 Application Service。客户端不能直接调用数据库或 Runtime 私有函数。

## 查询和快照

查询返回 `snapshotVersion` 和 `projectionCursor`。客户端使用 cursor 订阅增量；游标过期时 Host 返回 resync required，客户端重新获取范围快照。

## 事件流

```text
EventFrame {
  cursor
  eventId
  eventType / version
  correlationId
  payload
  terminal?: bool
}
```

事件流必须支持心跳、背压、确认和重新订阅。关键事件不能仅依赖内存广播。

## 流式 Artifact

大内容不通过长时间 IPC 直接搬运。Host 返回 ArtifactHandle，客户端按权限分段读取，支持范围、校验和取消。

## 错误

IPC 层只负责传输结构化错误；领域错误由 Core 生成，传输错误由 Gateway 生成，执行错误由 Executor Gateway 归一化。三者都带 requestId 和 correlationId。

