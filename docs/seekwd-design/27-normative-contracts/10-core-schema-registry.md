# 核心 Schema 注册表

> 状态：Normative Contract  
> 目的：为 TypeScript、Rust、SQLite、IPC 和扩展 SDK 提供唯一的跨组件类型名称与字段边界。

## Schema 生成规则

- 本文和本目录引用的正式 Schema 是协议源；语言实现必须由同一机器可读 Schema 生成或通过合同测试证明等价。
- 未知可选字段必须保留或忽略，未知枚举值必须进入 `unsupported` 处理，不得默认为成功或最低风险。
- 所有时间使用带时区的 RFC 3339，所有持续时间使用明确单位，所有摘要使用带算法前缀的内容摘要。
- `Id` 在对象类别内全局唯一；已经使用的 ID 不得复用。
- `Ref` 只表示稳定引用，不得内嵌可变对象或依赖显示名称解析。

## 基础类型与跨合同引用

以下类型是所有正式 Schema 共用的最小词汇。它们不是数据库表名；实现可以拆表，但对外序列化必须保持这些字段和枚举语义。

```text
Id          = string            // 不透明、不可复用的稳定标识
Timestamp   = RFC3339 string    // 必须带时区
Duration    = uint64 + unit     // 统一使用毫秒或明确的 ISO 8601 duration
Digest      = algorithm ":" hex
SemVer      = semantic version string
JsonValue   = null | boolean | number | string | JsonValue[] | JsonObject
JsonObject  = Map<string, JsonValue>

PrincipalRef {
  principalId: Id
  kind: user | agent | worker | extension | system | external
  displayName?: string
}

AggregateRef {
  aggregateType: workspace | goal | canvas | draft | revision | release |
    run | node_run | execution_handle | approval | artifact | patch | context
  aggregateId: Id
}

SchemaRef {
  schemaId: Id
  version: SemVer
  contentDigest: Digest
}

ResourceScope {
  resourceType: workspace | canvas | node | artifact | file | secret |
    environment | network | external_principal
  resourceId?: Id
  pathPattern?: string
  actions: string[]
}

SecretRef {
  secretId: Id
  version?: uint64
  purpose: string
  consumerScope: ResourceScope
}

CapabilityRef {
  capabilityId: Id
  versionConstraint: string
}
```

复杂的权限、执行环境和策略类型必须引用唯一事实源，不得在每个 Schema 中重新定义：

| 类型 | 唯一事实源 |
|---|---|
| `AuthorityRequirement`、`NetworkBoundary`、`DataExportBoundary`、`ExecutorClass` | [08-authority-and-execution-boundaries.md](08-authority-and-execution-boundaries.md) |
| `ExecutionRequirement`、`ExecutionContextVersionRef` | [08-authority-and-execution-boundaries.md](08-authority-and-execution-boundaries.md) |
| `AuthorityProfile` 及其文件、进程、网络、秘密、环境、委派、导出、审批绕过和后台策略 | [08-authority-and-execution-boundaries.md](08-authority-and-execution-boundaries.md) |
| `PolicyPatch` | [05-graph-patch-protocol.md](05-graph-patch-protocol.md) |
| `ApprovalRule`、`RepairPolicy` | [08-authority-and-execution-boundaries.md](08-authority-and-execution-boundaries.md) |
| `RetryPolicy` | [06-cross-canvas-delivery.md](06-cross-canvas-delivery.md) |
| `CancellationPolicy` | [06-cross-canvas-delivery.md](06-cross-canvas-delivery.md) |
| `DeliveryPolicy` | 本文“DeliveryPolicy”章节 |
| `BudgetLimit`、`BudgetUsage`、`BudgetSnapshot`、`AuthoritySnapshot` | [08-authority-and-execution-boundaries.md](08-authority-and-execution-boundaries.md) |
| `StructuredError`、`ReconciliationReport` | [04-unified-state-registry.md](04-unified-state-registry.md) 与 [07-side-effects-and-reconciliation.md](07-side-effects-and-reconciliation.md) |
| `EffectReceipt` | [07-side-effects-and-reconciliation.md](07-side-effects-and-reconciliation.md) |
| `ActionEffectProfile`、`IdempotencyBinding`、`CommitProtocol` | [07-side-effects-and-reconciliation.md](07-side-effects-and-reconciliation.md) |
| `TriggerSource` | [03-entrypoint-model.md](03-entrypoint-model.md) |
| `RetentionPolicy`、`NodeConformanceManifest` | [09-retention-and-node-governance.md](09-retention-and-node-governance.md) |
| `EventFilter`、`CommandEnvelope`、`EventEnvelope`、`ProjectionSnapshot` | [11-command-event-recovery.md](11-command-event-recovery.md) |

本表中的“引用”表示字段级合同引用，不表示实现可以省略这些类型。生成器或合同测试必须验证所有引用可解析。

```text
VersionRef =
  RevisionRef { canvasId, revisionId }
  | ReleaseRef { canvasId, releaseId, resolvedRevisionId }

DefinitionRef {
  definitionId: Id
  version: SemVer
  contentDigest: Digest
  source: builtin | extension | workspace | generated
}

CapabilityBinding {
  capabilityId: Id
  capabilityVersion: SemVer
  providerRef: PrincipalRef
  adapterRef?: DefinitionRef
  trustLevel: unverified | observed | verified | managed
  contractDigest: Digest
}

PortEndpoint {
  nodeId: Id
  portId: Id
}

ConditionExpression = {
  expressionVersion: SemVer
  ast: JsonObject
  inputSchemaRefs: SchemaRef[]
  outputType: boolean
}

ValueRef {
  valueId: Id
  schemaRef: SchemaRef
  storage: inline | artifact | secret | stream
  contentDigest?: Digest
  sensitivity: public | workspace | confidential | restricted
  lineageRef?: Id
}
```

`SecretRef` 是一种不允许解析为 UI 明文的特殊引用，不能伪装成普通 `ValueRef` 内联传输。

## GraphDocument

```text
GraphDocument {
  schemaVersion: SemVer
  nodes: NodeInstance[]
  edges: Edge[]
  entrypoints: CanvasEntrypoint[]
  defaultEntrypointId: Id
  triggers: TriggerBinding[]
  publicInterface: CanvasInterface
  graphPolicy: GraphPolicy
  presentation: GraphPresentation
}

NodeInstance {
  nodeId: Id
  definition: DefinitionRef
  config: JsonObject
  portBindings: PortBinding[]
  policyOverride?: PolicyPatch
  executionRequirement?: ExecutionRequirement
  enabled: boolean
  presentation: NodePresentation
}

Edge {
  edgeId: Id
  source: PortEndpoint
  target: PortEndpoint
  kind: data | control | event | error | compensation
  mapping?: MappingExpression
  condition?: ConditionExpression
  delivery: DeliveryPolicy
  cancellation?: CancellationPolicy
  enabled: boolean
}
```

```text
CanvasInterface {
  inputSchema: SchemaRef
  outputSchema: SchemaRef
  eventSchemas: SchemaRef[]
  compatibilityDigest: Digest
}

NodePresentation {
  position: { x: number, y: number }
  size?: { width: number, height: number }
  collapsed: boolean
  groupId?: Id
}

GraphPresentation {
  groups: JsonObject[]
  viewportHints?: JsonObject
}
```

Presentation 字段只提供布局提示。运行时、策略引擎和校验器不得从坐标、颜色、折叠或分组推断依赖和权限。

展示坐标、折叠和分组属于 `presentation`；不得通过展示字段改变运行依赖、权限或结果语义。

## PortBinding

```text
PortBinding {
  portId: Id
  direction: input | output
  source:
    edge | literal | value_ref | secret_ref | entrypoint_input |
    context | environment | human_input | unset
  value?: JsonValue
  valueRef?: ValueRef
  secretRef?: SecretRef
  expression?: MappingExpression
  required: boolean
  multiplicity: one | optional | many
}
```

同一输入端口的多来源行为必须由端口 `multiplicity` 和显式聚合表达式决定，禁止按事件到达顺序隐式选择最后一个值。

## MappingExpression

`MappingExpression` 使用受限、可解析、无副作用的表达式 AST，不接受任意 JavaScript、Shell、Python 或自然语言：

```text
MappingExpression =
  identity
  | select { path }
  | object { fields: Map<string, MappingExpression> }
  | array { items: MappingExpression[] }
  | coalesce { values: MappingExpression[] }
  | convert { targetSchema, input }
  | template { templateId, bindings }
  | function { functionRef, args }
```

`functionRef` 只能引用已注册的纯函数定义。表达式必须可静态检查输入输出 Schema、最大复杂度和敏感数据传播。

## DeliveryPolicy

```text
DeliveryPolicy {
  guarantee: at_most_once | at_least_once
  ordering: none | per_source | per_aggregate
  buffering: none | bounded
  maxBufferedItems?: uint32
  overflow: reject | drop_oldest | route_to_error
  deduplication: none | event_id | idempotency_key
  timeout?: Duration
  retry?: RetryPolicy
}
```

核心事件和跨画布调用必须使用 `at_least_once` 加去重。`at_most_once` 只允许用于允许丢失、无关键事实的观测流。

## GraphPolicy

```text
GraphPolicy {
  authorityCeiling: AuthorityRequirement
  allowedExecutionClasses: ExecutorClass[]
  networkBoundary: NetworkBoundary
  dataExportBoundary: DataExportBoundary
  budgetCeiling: BudgetLimit
  concurrencyLimit: uint32
  unattendedLimit: Duration
  approvalRules: ApprovalRule[]
  retentionPolicyRef?: Id
  repairPolicy: RepairPolicy
}
```

节点级策略只能在画布和 Workspace 上限内收紧。策略合并必须是可解释的交集运算，不允许后写覆盖前写。

## Run 与结果

```text
Run {
  runId: Id
  workspaceId: Id
  snapshotRef: Id
  rootRunId: Id
  parentRunId?: Id
  correlationId: Id
  status: RunStatus
  runVersion: uint64
  startedBy: PrincipalRef
  createdAt: Timestamp
  updatedAt: Timestamp
  terminalAt?: Timestamp
}

NodeResult {
  resultId: Id
  nodeRunId: Id
  attempt: uint32
  status: succeeded | failed | cancelled | expired | skipped | blocked | outcome_unknown | completed_after_cancel
  outputRefs: ValueRef[]
  artifactRefs: Id[]
  evidenceRefs: Id[]
  error?: StructuredError
  effectReceipt?: EffectReceipt
  completedAt: Timestamp
}
```

`RunStatus`、`NodeRunStatus` 和其他生命周期枚举只由 [04-unified-state-registry.md](04-unified-state-registry.md) 定义。`RunSnapshot` 只由 [02-identity-version-model.md](02-identity-version-model.md) 定义。`GraphOperation` 只由 [05-graph-patch-protocol.md](05-graph-patch-protocol.md) 定义。`CancellationPolicy` 只由 [06-cross-canvas-delivery.md](06-cross-canvas-delivery.md) 定义。

## 协议兼容性

- 对象必须携带 `schemaVersion` 或由其信封携带 `protocolVersion`。
- 读取方支持同一主版本内的向后兼容字段扩展。
- 删除字段、改变枚举语义、改变默认值或改变幂等范围属于主版本变更。
- 存储层可以规范化拆表，但对外序列化必须恢复为本文语义，不能把数据库内部状态泄漏成 SDK 合同。
