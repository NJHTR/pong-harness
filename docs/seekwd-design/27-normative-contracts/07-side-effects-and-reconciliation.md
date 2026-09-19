# 副作用、取消与对账合同

> 状态：Normative Contract

## ActionEffectProfile

每个可执行节点定义版本必须声明，而不是由运行时猜测：

```text
ActionEffectProfile {
  effect: pure | local_mutation | external_mutation | destructive
  retryClass: safe_to_retry | idempotent | reconciliation_required | manual_only
  compensation: none | automatic | manual | best_effort
  recovery: retry | reconcile_then_retry | forward_repair_only | non_compensable
  idempotencyBinding?: IdempotencyBinding
  commitProtocol?: CommitProtocol
  reconciliationCapability?: CapabilityRef
  irreversiblePoint?: string
}
```

```text
IdempotencyBinding {
  keyFields: string[]
  scope: invocation | run | workspace | external_system
  stableAcrossAttempts: boolean
  collisionAction: reject | return_original_result
}

CommitProtocol {
  kind: none | temp_then_commit | prepare_commit | external_transaction
  commitMarker?: string
  recoveryProbeRequired: boolean
}
```

`non_compensable` 是 recovery 属性，不应与幂等性混为同一个枚举。一个动作可能幂等但不可补偿，也可能不可安全重试但可通过对账确认。

## 分类规则

| 类别 | 示例性质 | 丢失响应后的默认处理 |
|---|---|---|
| `safe_to_retry` | 纯计算、只读查询 | 新 Attempt 可直接重试 |
| `idempotent` | 有服务端幂等键的创建/更新 | 使用相同键重放并读取原结果 |
| `reconciliation_required` | 可能已写入文件或远程部署 | 先查询真实状态，禁止直接重试 |
| `manual_only` | 无可验证接口的不可逆操作 | 停止下游，请求人类确认 |

## 副作用边界

Executor 必须在调用外部副作用前持久化 `EffectIntent`，在收到可验证结果后持久化 `EffectReceipt`：

```text
EffectIntent {
  effectId
  runId / nodeRunId / attempt
  normalizedTarget
  actionDigest
  idempotencyKey?
  authoritySnapshotRef
  createdAt
}

EffectReceipt {
  effectId
  outcome: committed | rejected | cancelled | unknown
  externalReference?
  evidenceRefs[]
  observedAt
}
```

Intent 已存在但 Receipt 缺失时，恢复流程必须进入对账，不能假设动作未执行。

## 文件写入建议合同

- 可行时写入同目录临时文件、fsync、再原子 rename。
- overwrite/delete 必须记录目标规范化路径、原内容摘要和备份策略。
- 工作区外写入、删除或不可恢复覆盖必须单独审批。
- 仅记录“命令返回 0”不能证明预期文件内容正确，必须由验证器产生 Evidence。

## 取消和超时

```text
request cancel
 -> persist cancel request
 -> executor acknowledges or remains unreachable
 -> wait for terminal fact until cancel deadline
 -> reconcile if unconfirmed
 -> cancelled | completed_after_cancel | failed | outcome_unknown
```

- 超时首先是取消触发器，不是立即失败。
- `cancel_pending` 表示已请求但尚未确认。
- 动作在取消请求后完成，NodeRun 进入 `completed_after_cancel`；输出保留，后续由策略或人类决定。
- 无法确认且对账未耗尽时为 `orphaned/reconciling`；耗尽后为 `outcome_unknown`。

## ReconciliationPlan

```text
ReconciliationPlan {
  planId
  effectId
  probes[]
  maxAttempts
  backoff
  deadline
  successEvidenceRule
  absenceEvidenceRule
  ambiguousDisposition: wait | human | outcome_unknown
}
```

```text
ReconciliationReport {
  reportId: Id
  effectId: Id
  attempts: {
    attempt: uint32
    probeRef: Id
    result: confirmed_committed | confirmed_absent | ambiguous | unavailable
    evidenceRefs: Id[]
    observedAt: Timestamp
  }[]
  exhausted: boolean
  conclusion: committed | absent | unresolved
  generatedAt: Timestamp
}
```

对账探针默认只读并使用不高于原动作的权限。探针需要新网络、秘密或文件范围时必须重新策略评估。

## outcome_unknown 的可操作语义

进入该状态必须同时提供：

- 已尝试的对账步骤和证据。
- 可能已经发生的副作用清单。
- 禁止自动执行的下游范围。
- 可选动作：继续对账、声明已完成、声明未完成、执行补偿、创建前向修复、终止 Run。
- 每个人工声明的主体、理由、证据和时间。

人工声明不会抹去 `outcome_unknown` 历史；它创建新的 Resolution 事实和 RunBranch。

## 补偿

- 补偿是独立 NodeRun，拥有自己的权限、状态、证据和失败处理。
- 补偿成功不等于原动作未发生。
- 达到不可逆点后禁止假装回滚；只能前向修复、隔离影响或人工处理。
- 自动补偿不得使用比原动作更宽的 AuthoritySnapshot，除非重新审批。
