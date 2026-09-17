# IPC 与会话

## 连接层目标

Workbench 与 Host 的连接需要双向请求、事件订阅、流式输出、取消、断线恢复和版本协商。传输方式可以变化，但语义必须保持一致。

## 握手

```text
ClientHello
  client id / version
  user and workspace intent
  supported protocol versions
  supported event versions

HostHello
  host id / version
  accepted protocol version
  session scope
  feature capabilities
  current cursor / snapshot token
```

握手成功后才允许发送命令。能力协商只说明可用功能，不代表调用方已经获得权限。

## 会话

```text
Session
  sessionId
  principal
  clientInstance
  workspace scope
  granted actions
  issuedAt / expiresAt
  last heartbeat
  revoked state
```

会话过期、Host 重启、用户锁屏或工作区切换时，旧命令不能继续执行；长期 Run 使用独立 Run 权限和句柄。

## 请求响应

响应分为同步结果和异步 Handle：

```text
accepted        命令已入事实日志
completed       事务已完成
pending         等待审批、输入或长操作
rejected        未通过版本、Schema 或权限
conflict        版本冲突
```

## 流式通道

流事件带序号、cursor、关联 ID 和结束原因。客户端可以从最近确认 cursor 恢复；无法恢复的流必须以 `stream_incomplete` 结束，不伪造完整输出。

## 断线语义

断线不会自动取消 Run。客户端可以在重连后查询并决定继续订阅、暂停或取消。命令重发依赖幂等键，不能靠 UI 禁用按钮防止重复。

