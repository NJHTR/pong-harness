# 规范化数据结构

以下是框架无关的概念 Schema。字段名称用于统一沟通，最终实现可以映射为数据库表、TypeScript 类型或其他持久化结构。

## CanvasVersion

```text
CanvasVersion {
  canvasId: Id
  version: Version
  status: draft | validated | published | deprecated | archived
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

## Run

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

## NodeResult

```text
NodeResult {
  status: success | failure | waiting | cancelled | skipped | blocked
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

## GraphPatch

```text
GraphPatch {
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

