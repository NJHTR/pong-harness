# 身份与版本模型

> 状态：Normative Contract

## 对象分层

```text
CanvasIdentity
  逻辑身份、所属 Workspace、名称和生命周期元数据

CanvasDraft
  可变编辑工作副本；通过 draftRevision 做乐观并发控制

CanvasRevision
  一次保存产生的不可变完整图；内容可校验、比较、调试和引用

CanvasRelease
  将某个 CanvasRevision 发布到稳定渠道的不可变发布记录

RunSnapshot
  一次 Run 实际解析后的全量不可变执行快照

RunBranch
  从既有 Run 的检查点、修复或重放派生的新执行分支
```

## 正式 Schema

```text
CanvasIdentity {
  canvasId: Id
  workspaceId: Id
  name: string
  summary?: string
  lifecycle: active | archived | deleted
  createdAt: Timestamp
  updatedAt: Timestamp
}

CanvasDraft {
  draftId: Id
  canvasId: Id
  basedOnRevisionId?: Id
  draftRevision: uint64
  graph: GraphDocument
  validation: ValidationSummary
  dirty: boolean
  updatedBy: PrincipalRef
  updatedAt: Timestamp
}

CanvasRevision {
  revisionId: Id
  canvasId: Id
  revisionNumber: uint64
  contentDigest: Digest
  parentRevisionIds: Id[]
  graph: GraphDocument
  validation: ValidationReportRef
  compatibility: CompatibilityManifest
  createdBy: PrincipalRef
  createdAt: Timestamp
}

CanvasRelease {
  releaseId: Id
  canvasId: Id
  revisionId: Id
  channel: stable | preview | internal
  version: SemVer
  releaseNotes?: string
  publishedBy: PrincipalRef
  publishedAt: Timestamp
}

CanvasReleaseLifecycle {
  releaseId: Id
  status: active | deprecated | withdrawn
  sequence: uint64
  reason?: string
  changedBy: PrincipalRef
  changedAt: Timestamp
}
```

## 可变性和运行规则

- `CanvasDraft` 是唯一允许原地编辑的图对象。每个成功命令必须递增 `draftRevision`。
- `CanvasRevision` 内容永远不可变。再次保存必须产生新的 `revisionId`。
- `validated` 是 Revision 的验证结论，不是可变生命周期状态。
- `CanvasRelease` 不复制图内容，只冻结 Revision、发布通道、版本、兼容承诺和对外可调用身份。相同 `releaseId` 或 `(canvasId, channel, version)` 永远不得重新指向另一 Revision。
- Release 的弃用和撤回是追加的生命周期事件，并投影为 `CanvasReleaseLifecycle`；它不修改 Release 的版本绑定。`deprecated` 允许按策略继续解析但必须告警，`withdrawn` 禁止新的解析。
- 正式运行必须引用 `CanvasRelease`，并解析到精确 `revisionId`。
- 调试运行可以引用 `CanvasRevision`，但必须携带 `DebugExecutionSpec`，在 UI、事件和审计中标记为 debug；不得被外部稳定调用方依赖。
- `CanvasDraft` 不得直接执行。用户点击“运行草稿”时，系统必须先保存为新的 Revision，再创建 Debug Run。

## 保存与发布

```text
edit draft
  -> save
  -> immutable CanvasRevision
  -> validate
  -> optional debug run
  -> publish
  -> CanvasRelease
```

自动保存可以只保存 Draft 命令日志，不得悄悄制造大量正式 Revision。用户显式保存、运行草稿、创建检查点、发布，或通过 `apply_patch_and_save_revision` 宏命令应用 GraphPatch 时才产生 Revision；宏命令内部仍记录 Patch 应用和 Revision 保存两个阶段。

同一 Canvas 可以存在多个 Draft，用于个人编辑、冲突分支或恢复副本。每个 Draft 拥有独立 `draftId` 和单调递增的 `draftRevision`；GraphPatch 必须锁定其中一个 Draft。保存操作只冻结命令接受时的 Draft 内容；保存期间发生的新命令仍留在 Draft 中并保持 `dirty: true`。

## 验证与调试规格

```text
ValidationSummary {
  status: unknown | valid | invalid | warnings
  errorCount: uint32
  warningCount: uint32
  reportRef?: ValidationReportRef
}

ValidationReportRef {
  reportId: Id
  graphDigest: Digest
  validatorVersion: SemVer
}

CompatibilityManifest {
  publicInterfaceDigest: Digest
  compatibleWithReleaseIds: Id[]
  breakingChanges: string[]
}

DebugExecutionSpec {
  revisionId: Id
  breakpoints: Id[]
  allowRunPatch: boolean
  evidenceRetention: Duration
}
```

## RunSnapshot

```text
RunSnapshot {
  snapshotId: Id
  canvasId: Id
  revisionId: Id
  releaseId?: Id
  goalVersionRef?: VersionRef
  entrypointId: Id
  graphDigest: Digest
  resolvedNodeDefinitions: DefinitionRef[]
  resolvedCapabilities: CapabilityBinding[]
  resolvedExecutionContexts: ExecutionContextVersionRef[]
  policySnapshotRef: Id
  approvalGrantRefs: Id[]
  inputValueRefs: ValueRef[]
  budget: BudgetSnapshot
  authority: AuthoritySnapshot
  createdAt: Timestamp
}
```

Run 创建后，后续 Draft、Revision、Release、Policy 或能力升级不得修改这个 Snapshot。需要变化时创建 `RunBranch`。

```text
RunBranch {
  runBranchId: Id
  runId: Id
  parentSnapshotId: Id
  parentCheckpointRef: Id
  branchSnapshotId: Id
  source: retry | replay | repair | manual_resolution | run_patch
  createdBy: PrincipalRef
  createdAt: Timestamp
}
```

## 删除语义

- Identity、Revision、Release 和 Snapshot 默认逻辑删除或归档。
- 被运行、发布、审计、Skill、外部调用或 Lineage 引用的对象不得物理删除。
- 撤回 Release 只禁止新的解析；历史 Run 仍能读取原 Revision 和 Snapshot。
