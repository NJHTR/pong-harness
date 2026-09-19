# 保留策略与标准节点治理

> 状态：Provisional Contract  
> 字段和安全下限已确定；默认时长可在产品验证后调整。

## RetentionPolicy

每个 Workspace 必须拥有可查询的保留策略，具体对象可以收紧但不能绕过法务或系统级下限。

```text
RetentionPolicy {
  runEvents: Duration | forever
  auditEvents: Duration | forever
  logs: Duration
  transientArtifacts: Duration
  durableArtifacts: Duration | forever
  evidence: Duration | forever
  screenshotsAndRecordings: Duration
  checkpoints: Duration
  memories: Duration | forever
  tombstones: Duration
  maxLogBytesPerNodeRun: uint64
  maxArtifactBytesPerRun: uint64
  compression: CompressionPolicy
  encryption: EncryptionPolicy
  secureDelete: best_effort | platform_managed
}
```

```text
CompressionPolicy = none | gzip | zstd

EncryptionPolicy {
  atRest: required | platform_managed | optional
  keyRef?: SecretRef
  perWorkspace: boolean
}

Tombstone {
  aggregateRef: AggregateRef
  deletedAt: Timestamp
  purgeAfter?: Timestamp
  retainedBecause: string[]
}
```

## 默认行为

- Run Event、GraphPatch、审批和权限审计默认长期保留，直到 Workspace 明确删除且审计保留期满足。
- 临时 Artifact 和缓存采用引用计数加保留期；被 RunSnapshot、Evidence、Lineage、Release 或 Skill 引用时不得回收。
- 日志达到大小上限后按 chunk 截断或归档，并写入 `log.truncated` 事实；不得静默丢失。
- Screenshot、录屏和页面快照默认视为潜在敏感数据，使用更短保留期并支持逐项删除。
- 删除 Workspace 创建 Tombstone 和异步清理计划；跨 Workspace 引用、活动 Run、Legal Hold 或导出任务会阻止物理删除。
- 所有本地持久数据应支持静态加密；Secret 明文不得进入日志、Patch、Artifact 元数据或记忆。

## 导出和删除

- 导出必须经过与目标、数据敏感度和 Artifact 类型匹配的策略评估。
- 审计导出包含 Schema 版本、摘要和 Lineage，便于独立验证。
- 用户删除只影响其有权删除的内容；不可删除的审计必须明确原因和到期时间。
- 垃圾回收是可观察作业，具有 dry-run、候选清单、执行结果和失败重试。

## Memory 到 Skill 的门槛

成功运行不会自动成为可信 Skill。提升前必须完成：

1. 移除或参数化 Workspace 路径、身份、秘密和私人数据。
2. 固化输入输出 Schema、权限需求、环境需求和副作用合同。
3. 在隔离测试数据上进行回归、失败、取消和安全测试。
4. 记录来源 Run、验证报告、适用边界和已知失败模式。
5. 由有发布权限的主体批准并创建不可变版本。

## StandardNodeDefinition 合同

每个标准节点版本必须附带：

```text
NodeConformanceManifest {
  definitionRef: DefinitionRef
  inputSchemaRefs: SchemaRef[]
  outputSchemaRefs: SchemaRef[]
  stateContractDigest: Digest
  cancellationContractDigest: Digest
  actionEffectProfile: ActionEffectProfile
  authorityRequirement: AuthorityRequirement
  idempotencyBinding?: IdempotencyBinding
  artifactLineageContract: JsonObject
  compatibilityPolicy: JsonObject
  testSuiteRef: Id
}
```

## 必需合同测试

- Schema、端口基数、映射和错误端口测试。
- 每个允许状态转移和非法转移测试。
- 排队前、运行中、副作用前后取消测试。
- 权限拒绝、授权到期、Grant 绑定和升级重评估测试。
- 幂等命令、重复事件、重试和崩溃恢复测试。
- Artifact 完整性、Lineage、敏感字段和保留测试。
- 复合节点、跨画布、循环、并发和预算测试。
- 旧 DefinitionVersion 的兼容读取和迁移测试。

未通过合同测试的节点只能进入 `experimental` catalog，不得标记为标准节点。Catalog 数量不是成熟度指标；语义一致性优先于覆盖面。
