# 统一状态注册表

> 状态：Normative Contract

## 设计原则

- 每类对象拥有自己的枚举，禁止把 Grant、ExecutionContext、ExecutionHandle、NodeRun 和 Run 状态混成一个 `status`。
- 等待状态是非终态；结果对象只在 Attempt 结束后生成。
- 重试创建新 Attempt，恢复创建状态转移，修复或重放可创建 RunBranch；不得把终态改回 `running`。
- `orphaned` 表示执行句柄失联且仍在对账，不是已确认失败。
- `outcome_unknown` 表示对账策略耗尽后仍无法确认外部副作用结果，是异常终态。
- 颜色、文案和图标是投影视图，不是协议状态。

## 通用状态分类

| 分类 | 含义 | 下游执行 |
|---|---|---|
| active | 系统仍在主动推进 | 否，除非边契约允许流式消费 |
| waiting | 等待明确条件，可恢复 | 否 |
| suspended | 人为或策略暂停 | 否 |
| reconciling | 正在确定真实外部结果 | 否 |
| terminal-success | 成功或按契约跳过 | 按边契约继续 |
| terminal-failure | 已确认失败、取消、过期或阻塞 | 按失败策略处理 |
| terminal-uncertain | 无法确认副作用结果 | 必须阻断有副作用下游并请求处置 |

## NodeRunStatus

| 状态 | 分类 | 可重试 | 可恢复 | 人工 | 允许下游 |
|---|---|---:|---:|---:|---|
| `created` | active | 否 | 是 | 否 | 否 |
| `queued` | active | 否 | 是 | 否 | 否 |
| `dispatching` | active | 否 | 是 | 否 | 否 |
| `running` | active | 否 | 是 | 否 | 仅显式流式边 |
| `streaming` | active | 否 | 是 | 否 | 仅显式流式边 |
| `waiting_input` | waiting | 否 | 是 | 是 | 否 |
| `waiting_dependency` | waiting | 否 | 是 | 视依赖而定 | 否 |
| `waiting_environment` | waiting | 否 | 是 | 可能 | 否 |
| `waiting_approval` | waiting | 否 | 是 | 是 | 否 |
| `paused` | suspended | 否 | 是 | 否 | 否 |
| `repairing` | active | 否 | 是 | 可能 | 否 |
| `verifying` | active | 否 | 是 | 可能 | 否 |
| `cancelling` | active | 否 | 是 | 否 | 否 |
| `cancel_pending` | reconciling | 否 | 是 | 可能 | 否 |
| `reconciling` | reconciling | 否 | 是 | 可能 | 否 |
| `orphaned` | reconciling | 否 | 是 | 可能 | 否 |
| `succeeded` | terminal-success | 新 Attempt | 否 | 否 | 成功边 |
| `skipped` | terminal-success | 新 Attempt | 否 | 否 | 依跳过策略 |
| `completed_after_cancel` | terminal-success | 新 Attempt | 否 | 是 | 默认阻断，人工确认后继续 |
| `failed` | terminal-failure | 新 Attempt | 否 | 可能 | 失败/修复边 |
| `cancelled` | terminal-failure | 新 Attempt | 否 | 否 | 取消边 |
| `expired` | terminal-failure | 新 Attempt | 否 | 可能 | 超时边 |
| `blocked` | terminal-failure | 条件变化后新 Attempt | 否 | 是 | 阻断边 |
| `outcome_unknown` | terminal-uncertain | 默认禁止 | 否 | 是 | 只允许对账/补偿/人工处置边 |

`completed_after_cancel` 表示取消请求已发出，但执行器随后证明动作已完成。它保留成功输出，但默认不能自动继续有副作用下游。

## RunStatus

```text
created
preparing
ready
running
waiting_input
waiting_dependency
waiting_environment
waiting_approval
paused
repairing
verifying
cancelling
cancel_pending
reconciling
succeeded
failed
cancelled
expired
blocked
completed_after_cancel
outcome_unknown
```

Run 状态是所有阻塞性 NodeRun、子 Run、验证和策略的聚合投影。Run 不使用 `orphaned`：任何孤儿 NodeRun 会将 Run 投影为 `reconciling`；只有对账耗尽才投影为 `outcome_unknown`。

`completed_after_cancel` 表示 Run 已收到取消请求，但至少一个决定最终结果的动作随后被证明完成，且不能诚实地把整体标记为 `cancelled`。父 Run 或调用方必须显式接受该终态；不得把它当作普通 `succeeded` 自动传播。

## 合法转移

下表列出协议允许的直接转移。未列出的转移一律非法；实现不得通过先写中间状态绕过前置条件。

### NodeRun

| From | Allowed direct targets |
|---|---|
| `created` | `queued`, `waiting_approval`, `waiting_environment`, `skipped`, `blocked`, `cancelled` |
| `queued` | `dispatching`, `paused`, `skipped`, `cancelling`, `blocked`, `expired` |
| `dispatching` | `running`, `streaming`, `waiting_environment`, `cancelling`, `failed`, `orphaned` |
| `running` | `streaming`, `waiting_input`, `waiting_dependency`, `waiting_environment`, `waiting_approval`, `paused`, `repairing`, `verifying`, `cancelling`, `reconciling`, `orphaned`, `succeeded`, `failed`, `expired` |
| `streaming` | `running`, `waiting_input`, `waiting_dependency`, `paused`, `verifying`, `cancelling`, `reconciling`, `orphaned`, `succeeded`, `failed`, `expired` |
| `waiting_input` | `queued`, `running`, `skipped`, `repairing`, `cancelling`, `expired`, `blocked` |
| `waiting_dependency` | `queued`, `running`, `skipped`, `repairing`, `cancelling`, `expired`, `blocked` |
| `waiting_environment` | `queued`, `waiting_approval`, `skipped`, `cancelling`, `expired`, `blocked` |
| `waiting_approval` | `queued`, `cancelling`, `expired`, `blocked` |
| `paused` | `queued`, `running`, `cancelling`, `expired` |
| `repairing` | `queued`, `verifying`, `waiting_input`, `waiting_dependency`, `waiting_environment`, `waiting_approval`, `cancelling`, `failed` |
| `verifying` | `succeeded`, `failed`, `repairing`, `waiting_input`, `cancelling` |
| `cancelling` | `cancelled`, `cancel_pending`, `completed_after_cancel`, `failed` |
| `cancel_pending` | `cancelled`, `completed_after_cancel`, `failed`, `reconciling`, `outcome_unknown` |
| `orphaned` | `reconciling` |
| `reconciling` | `running`, `streaming`, `succeeded`, `failed`, `cancelled`, `completed_after_cancel`, `outcome_unknown` |
| any terminal state | none; retry, repair or resolution creates a new Attempt or RunBranch |

从 `paused` 直接回到 `running` 只允许执行器证明原 ExecutionHandle 被暂停且仍可继续；否则必须回到 `queued` 并创建新 Attempt。`orphaned` 必须先进入 `reconciling`；恢复到活动状态时必须复用并证明同一外部 Handle，不能偷偷重新执行。

### Run

| From | Allowed direct targets |
|---|---|
| `created` | `preparing`, `cancelling`, `cancelled` |
| `preparing` | `ready`, any `waiting_*`, `blocked`, `failed`, `cancelling` |
| `ready` | `running`, `paused`, `cancelling`, `expired` |
| `running` | any `waiting_*`, `paused`, `repairing`, `verifying`, `cancelling`, `reconciling`, `succeeded`, `failed`, `blocked`, `expired` |
| any `waiting_*` | `running`, `paused`, `repairing`, `cancelling`, `blocked`, `expired` |
| `paused` | `ready`, `running`, `cancelling`, `expired` |
| `repairing` | `running`, any `waiting_*`, `verifying`, `failed`, `cancelling` |
| `verifying` | `succeeded`, `failed`, `repairing`, `waiting_input`, `cancelling` |
| `cancelling` | `cancelled`, `cancel_pending`, `completed_after_cancel`, `failed`, `reconciling` |
| `cancel_pending` | `cancelled`, `failed`, `reconciling`, `completed_after_cancel`, `outcome_unknown` |
| `reconciling` | `running`, `succeeded`, `failed`, `cancelled`, `completed_after_cancel`, `outcome_unknown` |
| any terminal state | none; retry, replay, repair or resolution creates a RunBranch |

## Run 聚合规则

Run 状态不是“挑一个最显眼的 NodeRun 状态”，而是根据未完成义务和风险计算。最低规则如下：

1. 任一决定性副作用为 `outcome_unknown` 且没有有效 Resolution 时，Run 必须为 `outcome_unknown`。
2. 存在 `orphaned`、正在对账的 Handle 或未确认取消时，Run 为 `reconciling` 或 `cancel_pending`，不得显示成功或失败。
3. 用户已请求取消时，`cancelling` / `cancel_pending` 优先于普通等待和运行状态。
4. `waiting_approval`、`waiting_input`、`waiting_environment`、`waiting_dependency` 只在对应条件阻止所有当前可推进路径时投影到 Run；否则 Run 仍为 `running`，并在 Attention 中展示局部等待。
5. `paused` 只表示 Run 级暂停命令已生效；单个节点暂停不自动把整个 Run 标为 `paused`。
6. `succeeded` 需要所有必需分支满足成功/允许跳过契约，且 Run 级验证通过。
7. 已确认但未被错误路径、补偿或修复消化的决定性失败使 Run 为 `failed`。
8. 已确认取消且没有决定性失败、未知结果或取消后完成事实时，Run 才能为 `cancelled`。
9. 取消后完成并影响最终输出或副作用的事实使 Run 为 `completed_after_cancel`；调用方必须显式处理。
10. 必需义务因期限耗尽而无法完成时为 `expired`；因策略、依赖或不可满足前置条件且没有可运行修复路径时为 `blocked`。

终态聚合按风险优先，不按完成时间覆盖：`outcome_unknown` > `completed_after_cancel` > `failed` > `expired` > `cancelled` > `blocked` > `succeeded`。如果失败策略已通过错误边、补偿或批准的默认值消化，对应局部终态不再作为决定性终态参与聚合。

## WaitRecord

```text
WaitRecord {
  waitId: Id
  runId: Id
  nodeRunId?: Id
  kind: input | dependency | environment | approval | timer | event
  resumeCondition: JsonObject
  cursor?: string
  deadline?: Timestamp
  cancellationPolicy: CancellationPolicy
  status: active | satisfied | expired | cancelled
  createdAt: Timestamp
  resolvedAt?: Timestamp
}
```

## ExecutionHandleStatus

```text
created -> submitted -> acknowledged -> active
active -> cancel_requested -> cancelled
active / cancel_requested -> completed | failed
submitted / acknowledged / active / cancel_requested -> lost -> reconciling
reconciling -> active | completed | failed | cancelled | outcome_unknown
```

`completed_after_cancel` 是 NodeRun 对 Handle 事实的解释，不是 Handle 自身状态。

## ApprovalRequestStatus 与 ApprovalGrantStatus

```text
ApprovalRequest:
created -> pending -> approved | denied | expired | withdrawn

ApprovalGrant:
issued -> active -> consumed | expired | revoked
```

Grant 的 `revoked` 不得直接复制为 NodeRun 状态。尚未开始的动作进入 `blocked` 或重新请求审批；运行中的动作根据可取消性进入 `cancelling` 或 `cancel_pending`。

## ExecutionContextStatus

```text
declared -> resolving -> preparing -> ready -> allocated -> in_use
allocated / in_use -> releasing -> released
resolving / preparing / ready / allocated / in_use -> unhealthy | expired | revoked
```

Context 的 `unhealthy / expired / revoked` 是终态。受影响 NodeRun 根据是否已越过副作用边界进入 `waiting_environment`、`cancelling`、`orphaned` 或 `reconciling`。

## GoalStatus

```text
draft -> clarified -> planned -> awaiting_authority -> ready -> running
running -> waiting_input | waiting_dependency | waiting_environment | waiting_approval
running / waiting_* -> paused | adapting | verifying | cancelling | reconciling | blocked | expired
adapting -> running | waiting_* | verifying | failed | blocked | cancelling
verifying -> succeeded | failed | adapting | waiting_input
cancelling -> cancelled | cancel_pending | completed_after_cancel | failed | reconciling
cancel_pending -> cancelled | completed_after_cancel | failed | reconciling | outcome_unknown
reconciling -> running | succeeded | failed | cancelled | completed_after_cancel | outcome_unknown
```

## NodeResult

`NodeResult` 只在 Attempt 终结时创建：

```text
NodeResultStatus =
  succeeded | failed | cancelled | expired | skipped |
  blocked | completed_after_cancel | outcome_unknown
```

等待信息使用 `WaitRecord`，不得生成 `status: waiting` 的 NodeResult。

## 最小转移约束

1. 所有转移必须包含 `eventId`、`objectVersion`、`occurredAt`、`principal`、`reasonCode`。
2. 终态不可原地恢复。
3. 进入等待必须持久化恢复条件、超时、游标和取消策略。
4. 进入 `outcome_unknown` 必须附带 `ReconciliationReport` 和允许的人工动作。
5. 下游只能依据状态加边契约推进，不能仅凭 UI 显示为绿色或日志文本包含 success。

## StructuredError

```text
StructuredError {
  code: string
  category: validation | policy | authority | environment | execution |
    timeout | cancellation | dependency | transport | conflict |
    unsupported | corruption | unknown
  message: string
  retryability: never | after_condition_change | safe_new_attempt |
    reconcile_first | manual_only
  fieldPath?: string
  resourceRef?: AggregateRef
  causeEventId?: Id
  detailRef?: Id
  safeMetadata: JsonObject
  occurredAt: Timestamp
}
```

`message` 和 `safeMetadata` 不得包含 Secret 明文、未授权文件内容或完整外部响应。大详情进入受策略保护的 Artifact。
