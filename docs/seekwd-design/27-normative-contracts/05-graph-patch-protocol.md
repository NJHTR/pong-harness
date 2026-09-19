# GraphPatch 与 RunPatch 协议

> 状态：Normative Contract

## 边界

- `GraphPatch` 修改 `CanvasDraft`，成功后可保存为新的 `CanvasRevision`；它不修改历史 Revision 或活动 RunSnapshot。
- `RunPatch` 只修改某个 Run 的未来执行计划，产生新的 `RunBranch` 和 Snapshot；它不自动回写 CanvasDraft。
- 经验证的 RunPatch 可以被用户或 Agent 另行提议为 GraphPatch，但两者审批、身份和审计记录不得复用。

## GraphPatch 信封

```text
GraphPatch {
  patchId: Id
  protocolVersion: SemVer
  targetDraftId: Id
  expectedDraftRevision: uint64
  baseRevisionId?: Id
  operations: GraphOperation[]
  reason: string
  requestedBy: PrincipalRef
  createdAt: Timestamp
  riskAssessment: RiskAssessment
  authorityDelta: AuthorityDelta
  budgetDelta: BudgetDelta
  impactAnalysis?: ImpactAnalysis
  validationPlan: ValidationPlan
  approvalBinding?: ApprovalBinding
  idempotencyKey: string
}
```

Patch 本身不是授权。服务端必须根据规范化后的实际差异重新计算 `riskAssessment`、`authorityDelta`、`budgetDelta` 和影响范围，不能信任提议者自报结果。

## Patch 评估类型

```text
RiskAssessment {
  level: low | medium | high | critical
  reasons: string[]
  irreversible: boolean
  requiresApproval: boolean
}

AuthorityDelta {
  added: ResourceScope[]
  removed: ResourceScope[]
  changedDimensions: filesystem | process | network | secret | environment |
    external_principal | data_export | background []
}

BudgetDelta {
  duration?: { before?: Duration, after?: Duration }
  concurrency?: { before?: uint32, after?: uint32 }
  storageBytes?: { before?: uint64, after?: uint64 }
  networkBytes?: { before?: uint64, after?: uint64 }
  externalCalls?: { before?: uint32, after?: uint32 }
  costMinorUnits?: { before?: uint64, after?: uint64 }
}

ImpactAnalysis {
  affectedNodeIds: Id[]
  affectedEdgeIds: Id[]
  affectedEntrypointIds: Id[]
  activeRunIds: Id[]
  externalReferenceCount: uint32
  irreversibleEffects: string[]
  generatedAt: Timestamp
}

ValidationPlan {
  validatorVersion: SemVer
  checks: string[]
  requiredEvidence: string[]
  canRunDebug: boolean
}

ApprovalBinding {
  approvalRequestId: Id
  patchDigest: Digest
  expiresAt: Timestamp
}

PolicyPatch {
  authorityCeiling?: AuthorityRequirement
  executionClasses?: ExecutorClass[]
  networkBoundary?: NetworkBoundary
  dataExportBoundary?: DataExportBoundary
  budgetCeiling?: BudgetLimit
  approvalRules?: ApprovalRule[]
  repairPolicy?: RepairPolicy
}
```

## 原子 GraphOperation

所有操作包含 `operationId`、`kind`、`preconditions` 和对应 payload。

| kind | 主要 payload | 必须检查 | 可逆性 |
|---|---|---|---|
| `node.add` | 完整 NodeInstance | ID 唯一、Definition 存在、权限可满足 | 删除未引用节点 |
| `node.remove` | nodeId、显式 edgeDisposition | 节点存在、引用/活动 Run 影响已确认 | 用 before-image 恢复 |
| `node.replace_definition` | nodeId、新 DefinitionRef、迁移计划 | 配置和端口迁移通过 | 有旧定义和配置时可逆 |
| `node.update_config` | nodeId、JSON Patch、字段摘要 | Schema、敏感字段、热更新规则 | 用 before-image 逆补丁 |
| `node.update_bindings` | nodeId、完整 PortBinding 差异 | 端口存在、来源唯一、Schema 和敏感度传播合法 | 用 before-image 恢复 |
| `node.set_enabled` | nodeId、enabled | 入口、必经路径和下游影响 | 反向布尔操作 |
| `node.update_policy` | nodeId、Policy Patch | 只能收紧或重新审批 | 有旧 Policy 时可逆 |
| `node.update_presentation` | nodeId、Presentation Patch | 不得改变运行语义 | 可逆 |
| `edge.add` | 完整 Edge | 端口兼容、基数、循环、映射合法 | `edge.remove` |
| `edge.remove` | edgeId | Edge 存在、依赖和等待影响已确认 | 用 before-image 恢复 |
| `edge.update` | edgeId、允许字段 Patch | 重新执行完整边校验 | 用 before-image 逆补丁 |
| `entrypoint.add` | 完整 Entrypoint | 名称、目标、输入绑定合法 | 删除非默认入口 |
| `entrypoint.update` | entrypointId、Patch | 目标、调用模式、权限重新校验 | 用 before-image 逆补丁 |
| `entrypoint.remove` | entrypointId | 不能单独删除默认入口；调用方影响已确认 | 用 before-image 恢复 |
| `entrypoint.set_default` | entrypointId | 入口存在、启用且可作为默认入口 | 恢复旧 default ID |
| `trigger.add` | 完整 TriggerBinding | 来源、目标入口、投递策略合法 | `trigger.remove` |
| `trigger.update` | triggerId、Patch | 重新校验映射、权限和投递 | 用 before-image 逆补丁 |
| `trigger.remove` | triggerId | 等待订阅和外部注册影响已确认 | 用 before-image 恢复 |
| `interface.update` | 输入/输出/事件差异 | 兼容性、调用方和映射检查 | 有 before-image 时可逆 |
| `graph.update_policy` | GraphPolicy Patch | 不得越过上级 Policy | 有旧 Policy 时可逆 |
| `graph.update_metadata` | Metadata Patch | 字段白名单 | 可逆 |

复合操作如 `extractComposite`、`inlineComposite`、`deleteNodeCascade` 不是协议原语。客户端可以提供宏命令，但提交时必须展开为上述操作序列，才能进行逐项影响分析和回滚。

```text
GraphOperation {
  operationId: Id
  kind: string
  targetRef?: AggregateRef
  preconditions: Precondition[]
  payload: JsonObject
  beforeImageDigest?: Digest
}

GraphPatchDecision {
  patchId: Id
  status: proposed | validation_failed | approval_required | approved |
    rejected | applying | applied | failed | superseded
  normalizedPatchDigest: Digest
  evaluatedRisk: RiskAssessment
  evaluatedAuthorityDelta: AuthorityDelta
  evaluatedBudgetDelta: BudgetDelta
  decidedBy: PrincipalRef
  decidedAt: Timestamp
  reasonCode: string
}

PatchApplicationResult {
  patchId: Id
  resultingDraftRevision?: uint64
  resultingGraphDigest?: Digest
  operationResults: {
    operationId: Id
    status: applied | rejected | not_applied
    error?: StructuredError
  }[]
}
```

`GraphPatch` 是提案内容，`GraphPatchDecision` 和 `PatchApplicationResult` 是追加事实。不得通过修改原 Patch 的 `decision` 字段覆盖审批历史。

## 前置条件

```text
Precondition =
  object_exists
  object_absent
  object_version_equals
  field_digest_equals
  graph_digest_equals
  no_active_reference
  interface_compatible
  policy_decision_equals
  approval_grant_valid
```

所有 Patch 必须检查 `expectedDraftRevision`。对关键删除、接口、策略和定义替换，还必须检查目标字段摘要，避免仅凭 Draft 版本掩盖细粒度冲突。

## 应用事务

```text
receive
 -> authenticate principal
 -> deduplicate by idempotencyKey
 -> load exact draft revision
 -> normalize operations and resources
 -> evaluate preconditions
 -> calculate impact / authority / budget delta
 -> evaluate policy and approval binding
 -> apply to isolated working copy
 -> validate whole graph
 -> persist Patch + updated draftRevision + audit event atomically
 -> emit committed event
```

GraphPatch 的提交结果是更新后的 `CanvasDraft`，不是自动产生的不可变 `CanvasRevision`。需要运行、发布或显式保存时，必须再执行 `SaveDraftAsRevision`，该命令把某个明确的 Draft 内容摘要冻结为 Revision。客户端可以使用宏命令 `apply_patch_and_save_revision`，但服务端仍必须记录两个可审计的阶段和对应摘要。

任一步失败都不得暴露半应用 Draft。失败返回每个 Operation 的结构化结果和整图校验错误，但不得通过“跳过失败操作”隐式部分成功。

## 幂等、冲突与回滚

- 同一主体、目标 Draft、`idempotencyKey` 和 Patch 摘要相同的重复请求返回原结果。
- 相同 key 但摘要不同必须返回 `IDEMPOTENCY_CONFLICT`。
- `expectedDraftRevision` 不匹配返回 `REVISION_CONFLICT`，包含当前版本和冲突对象摘要；系统不得自动重放高风险 Patch。
- 提交前回滚通过丢弃工作副本完成。
- 已提交 Patch 的“撤销”是一个新的 GraphPatch，使用服务端保存的 before-image 生成逆操作；历史 Patch 不被删除。
- 若外部注册（例如 webhook）是 Patch 的附带效果，必须使用 outbox/Saga。注册状态属于独立 IntegrationBinding 投影；注册失败时对应 Trigger 不得发布或启用，并提供重试或补偿 Patch，不能伪装成原子数据库事务。

## 删除语义

`node.remove` 必须显式选择：

```text
edgeDisposition: reject_if_connected | remove_incident_edges | reconnect_with_mapping
activeRunDisposition: unaffected_history_only | require_new_run_branch
externalReferenceDisposition: reject | replace_in_same_patch
```

删除不得影响既有 RunSnapshot。若有活动 Run 仍引用该节点，普通 GraphPatch 只影响未来 Revision；需要改变活动 Run 时必须单独提交 RunPatch。

## RunPatch

```text
RunPatch {
  runPatchId: Id
  targetRunId: Id
  parentSnapshotId: Id
  expectedRunVersion: uint64
  affectedFutureNodeIds: Id[]
  operations: RestrictedRunOperation[]
  checkpointRef: Id
  reason: string
  validationPlan: ValidationPlan
  authorityDelta: AuthorityDelta
  budgetDelta: BudgetDelta
  requestedBy: PrincipalRef
  idempotencyKey: string
}
```

```text
RestrictedRunOperation =
  future_node.update_config
  | future_node.update_binding
  | future_node.disable
  | future_node.add_diagnostic
  | future_node.add_verification
  | future_node.add_wait
  | future_node.add_compensation
  | future_node.add_replacement_branch
```

每个运行操作同样包含稳定 `operationId`、目标未来节点、前置 Run 版本、payload 和 before-image。运行时新增节点只能使用已解析且获授权的 Definition/Capability；新增未知实现必须先走 GraphPatch 或独立能力注册与审批流程。

RunPatch 只能：

- 修改尚未开始的节点配置或绑定。
- 新增诊断、验证、等待、补偿或替代分支。
- 禁用尚未开始且非必需的节点。
- 从检查点创建明确的新 RunBranch。

RunPatch 不得：

- 改写已完成 Attempt 的输入、输出、定义或证据。
- 把已发生的副作用标成未发生。
- 删除审批、验证、审计或成功标准以制造成功。
- 在没有重新审批时扩大权限、网络、秘密、执行位置、预算或数据范围。
- 修改父 Run 的历史事件。

## 权限升级硬门

出现下列任一差异时，旧 ApprovalGrant 自动失效，并必须重新策略评估：

- 文件、Workspace、网络或数据导出范围扩大。
- 新增秘密、外部主体、远程目标或执行上下文。
- 安装/删除依赖或切换隔离等级。
- 成本、时间、并发、存储或外部调用预算增加。
- 新增不可逆或无法对账的副作用。
- 删除/弱化审批、验证、补偿、审计或终止条件。

Agent 可以提出这些变化，但不得自行批准。
