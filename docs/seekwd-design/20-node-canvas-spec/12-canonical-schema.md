# 规范化数据结构

> 兼容说明：本文是早期概念 Schema。跨组件实现必须以 [../27-normative-contracts/](../27-normative-contracts/00-README.md) 为准。本文中的 `CanvasVersion`、`RunStatus`、`GraphOperation` 等未完整定义名称不得直接作为 SDK 合同。

以下是框架无关的概念 Schema。字段名称用于统一沟通，最终实现可以映射为数据库表、TypeScript 类型或其他持久化结构。

## CanvasVersion（旧名，兼容映射）

```text
CanvasVersion {
  canvasId: Id
  version: Version
  status: legacy_alias_only
  publicInputs: PortDefinition[]
  publicOutputs: PortDefinition[]
  publicEvents: EventDefinition[]
  nodes: NodeInstance[]
  edges: Edge[]
  policies: GraphPolicy
  parentVersion?: VersionRef
  createdBy: PrincipalRef
  createdAt: Timestamp
}
```

新实现使用 `CanvasDraft`、`CanvasRevision`、`CanvasRelease`，映射规则见 [02-identity-version-model.md](../27-normative-contracts/02-identity-version-model.md)。

## NodeInstance

```text
NodeInstance {
  nodeId: Id
  definition: DefinitionRef
  configuration: JsonObject
  portBindings: PortBinding[]
  localPolicy?: NodePolicy
  actorPreference?: human | agent | collaborative | unspecified
  enabled: boolean
  presentation?: PresentationRef
}
```

## Edge

```text
Edge {
  edgeId: Id
  source: PortRef
  target: PortRef
  kind: data | control | condition | event | wait | error | compensation
  mapping?: MappingExpression
  condition?: ConditionExpression
  delivery?: DeliveryPolicy
  timeout?: Duration
  cancellation?: CancellationPolicy
  enabled: boolean
}
```

## Run（字段摘要，状态以统一注册表为准）

```text
Run {
  runId: Id
  goalVersion: VersionRef
  canvasVersion: VersionRef
  snapshot: RunSnapshot
  status: RunStatus
  parentRunId?: Id
  correlationId: Id
  startedAt?: Timestamp
  endedAt?: Timestamp
  checkpoint?: CheckpointRef
}
```

## NodeResult（等待不属于结果状态）

```text
NodeResult {
  status: succeeded | failed | cancelled | expired | skipped | blocked | completed_after_cancel | outcome_unknown
  outputs: PortValue[]
  events: EventEnvelope[]
  observations: ObservationRef[]
  evidence: EvidenceRef[]
  artifacts: ArtifactRef[]
  error?: StructuredError
  actor: PrincipalRef
  attempt: number
}
```

## GraphPatch（字段摘要，操作协议见正式合同）

```text
GraphPatch（早期示意，已由正式合同取代） {
  patchId: Id
  baseVersion: VersionRef
  scope: canvas | subgraph | run
  operations: GraphOperation[]
  reason: string
  riskLevel: RiskLevel
  validationPlan: ValidationPlan
  requestedBy: PrincipalRef
  decision?: ApprovalDecision
}
```

上述 `scope` 和操作集合仅用于解释历史设计，不能作为实现合同。新的图修改必须使用 `27-normative-contracts/05-graph-patch-protocol.md` 定义的 `GraphPatch`；运行期间修改必须使用独立 `RunPatch`，不得以 `scope: run` 复用 GraphPatch。
