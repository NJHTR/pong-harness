# 跨画布投递与恢复

> 状态：Normative Contract

## 调用身份

每次跨画布调用具有稳定 `invocationId`，每次投递尝试具有不同 `deliveryId`：

```text
CanvasInvocation {
  invocationId: Id
  correlationId: Id
  parentRunId: Id
  parentNodeRunId: Id
  sourceSnapshotId: Id
  targetCanvasId: Id
  targetReleaseOrRevisionRef: VersionRef
  targetEntrypointId: Id
  mode: call_and_wait | fire_and_continue
  inputRefs: ValueRef[]
  inputMappingDigest: Digest
  idempotencyKey: string
  deadline?: Timestamp
  resultRetentionUntil: Timestamp
  failurePolicy: FailurePolicy
  cancellationPolicy: CancellationPolicy
  createdAt: Timestamp
}
```

```text
FailurePolicy =
  fail_parent
  | route_to_error_port
  | retry_child
  | request_repair
  | wait_for_human
  | continue_with_default
```

`continue_with_default` 必须在 Revision 中声明类型正确的默认值和风险说明；未声明失败策略默认 `fail_parent`。

父子关系使用 `invocationId`，不得仅靠事件时间或自然语言名称关联。

## 投递保证

```text
RetryPolicy {
  maxAttempts: uint32
  backoff: fixed | exponential | decorrelated
  initialDelay: Duration
  maxDelay: Duration
  retryOn: string[]
  preserveIdempotencyKey: boolean
}
```

`DeliveryPolicy` 的唯一字段定义在 [10-core-schema-registry.md](10-core-schema-registry.md)。跨画布调用和运行事实事件必须使用 `at_least_once`，并配置 `event_id` 或 `idempotency_key` 去重。`at_most_once` 只允许用于可丢失的观测流。

- Harness 内部事件采用至少一次投递。
- 消费方以 `(consumerId, eventId)` 去重；创建子 Run 额外以 `(targetEntrypointId, idempotencyKey)` 去重。
- 同一 Invocation 的重复请求必须返回原 `childRunId`，不得创建第二个外部副作用链。
- 事件处理、消费游标和产生的新事实使用同一数据库事务或 inbox/outbox 模式提交。
- 事件可乱序到达；投影按每个聚合的单调 `aggregateSequence` 应用，发现缺口时暂停投影并请求快照重同步。

## Call and Wait

1. 父 NodeRun 持久化 Invocation 和 WaitRecord 后才能投递子调用。
2. 子 Run 创建成功后回写稳定 `childRunId`。
3. 父进程断线或重启时，从 Invocation、WaitRecord 和事件游标恢复，不重新创建子 Run。
4. 子 Run 终结后，结果存入 Result Inbox；父 Run 即使暂时离线也能重新消费。
5. 父 Run 消费结果后写入 `resultConsumedAt`，重复完成事件只返回既有消费结果。

## Fire and Continue

- “继续”只表示父运行不等待输出，不表示子运行不受审计或策略管理。
- 必须声明所有权：`detached`、`workspace_owned` 或 `parent_owned`。
- `parent_owned` 默认传播取消；`workspace_owned` 和 `detached` 必须有独立预算、保留、通知和清理策略。
- Fire 模式不能提供同步输出映射；需要结果时使用事件订阅或持久化 Artifact 引用。

## 结果保留与过期

- 子结果的保留期不得短于父 WaitRecord 的 deadline 加恢复宽限期。
- 父尚未消费时不得垃圾回收结果 Artifact。
- 结果过期不是普通失败。父 NodeRun 进入 `blocked`，并提供重新运行子画布、人工提供替代值或终止三个结构化动作。

## 失败策略

策略在 Revision 中显式声明。没有声明时默认 `fail_parent`；系统不得由 Agent 在运行中猜测。

## 取消传播

```text
CancellationPolicy {
  propagation: none | request_child | require_child_terminal
  timeout: Duration
  onUnconfirmed: wait | reconcile | detach_with_approval
}
```

父取消不等于子已取消。只有收到子终态事实后父才能确定取消；否则进入 `cancel_pending` 或 `reconciling`。已经进入不可逆点的子运行按副作用合同进行前向修复或人工处置。

## 跨 Workspace 权限

- 调用方权限不自动传给目标 Workspace。
- Policy Engine 计算源主体、源 Workspace、目标 Workspace、入口需求、数据敏感度和数据导出方向的权限交集。
- ApprovalGrant 绑定两个 Workspace、精确入口、Revision/Release、数据范围、调用次数和期限。
- 子 Run 使用派生 AuthoritySnapshot，只包含完成目标入口所需的最小权限。

## 循环控制

发布时构建 Canvas/Entrypoint 调用图并拒绝未声明循环。允许的循环必须声明：

```text
recursionGroupId
maxDepth
maxInvocations
deadline
budgetCeiling
progressMeasure
terminationCondition
```

运行时每次调用携带 `InvocationPath` 和累计预算。超过深度、次数、期限、预算或进度不前时进入 `blocked` 或 `failed`，不得继续递归。

事件反馈回路同样受循环规则约束；改变事件名称或通过第三张画布转发不能绕过检测。
