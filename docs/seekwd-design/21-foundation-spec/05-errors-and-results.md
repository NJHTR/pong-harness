# 错误与结果

## StructuredError

```text
StructuredError
  code
  category
  message
  safeMessage
  retryability
  severity
  source
  node / run reference
  cause chain
  observed inputs summary
  suggested actions
  evidence references
  occurredAt
```

`message` 可以用于内部诊断，`safeMessage` 用于用户界面。秘密、完整输入和外部响应原文不能无过滤地进入用户消息。

## 错误分类

```text
validation       输入或配置不满足契约
authority        权限、审批或身份不足
environment      执行上下文不满足
dependency       前置或外部依赖失败
transient        可能暂时恢复
implementation   节点实现错误
conflict         版本、锁或并发冲突
quota            时间、成本、存储或并发受限
cancelled        用户或父运行取消
expired          超时、截止期或授权过期
verification     结果没有达到标准
unknown          原因尚未确定
```

## 重试语义

重试策略由节点定义、图策略和错误结果共同决定：

```text
never
immediate
exponential backoff
retry after observation
retry after repair
manual only
```

每次重试记录原因、等待时间、输入是否变化、环境是否变化和副作用风险。不可重试错误不能通过增加次数强行重试。

## 结果模型

```text
NodeResult
  terminal status
  output values
  output Artifact refs
  observations
  evidence
  warnings
  errors
  side effect summary
  actor and execution context
```

节点可以“部分成功”，但必须声明哪些输出可用、哪些输出无效以及下游是否允许继续。部分成功不是全局成功。

## 原因链

错误可以有多个嵌套原因，但必须形成无环链。每层保留来源和是否已经处理；修复 Agent 读取的是结构化原因和证据，不依赖猜测错误字符串。

