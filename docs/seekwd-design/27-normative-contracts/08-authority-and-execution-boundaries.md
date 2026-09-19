# 权限与执行边界

> 状态：Normative Contract

## AuthorityProfile，不使用全权布尔值

## 正式引用类型

下列类型是 `GraphPolicy`、`Entrypoint`、`RunSnapshot` 和 `GraphPatch` 共用的协议类型。实现可以拆分存储，但序列化字段和枚举语义必须保持一致。

```text
AuthorityRequirement {
  filesystemActions: read | write | create | delete []
  processActions: execute | spawn | shell []
  networkActions: resolve | connect | listen | upload | download []
  secretRefs: Id[]
  environmentActions: use | create | install | update | delete []
  dataExport: none | workspace | external []
  minimumExecutorClass: ExecutorClass
}

ExecutionRequirement {
  executorClasses: ExecutorClass[]
  writableWorkspace: boolean
  networkRequired: boolean
  secretAccessRequired: boolean
  childProcessLimit?: uint32
  minimumCpuMillis?: uint64
  minimumMemoryBytes?: uint64
  maximumWallTime?: Duration
}

ExecutionContextVersionRef {
  contextId: Id
  version: uint64
  executorClass: ExecutorClass
  policyDigest: Digest
}

NetworkBoundary {
  mode: denied | allowlist | unrestricted
  destinations: string[]
  protocols: string[]
  maxResponseBytes?: uint64
}

DataExportBoundary {
  mode: denied | workspace_only | approved_targets | unrestricted
  allowedTargets: ResourceScope[]
  maxSensitivity: public | workspace | confidential | restricted
  redactionProfileId?: Id
}

ExecutorClass = LocalRestricted | ContainerIsolated | RemoteManaged |
  LocalUnrestricted | ExternalDelegated

BudgetLimit {
  maxDuration?: Duration
  maxCpuMillis?: uint64
  maxMemoryBytes?: uint64
  maxStorageBytes?: uint64
  maxNetworkBytes?: uint64
  maxExternalCalls?: uint32
  maxCostMinorUnits?: uint64
  maxConcurrency?: uint32
}

BudgetUsage {
  duration: Duration
  cpuMillis: uint64
  peakMemoryBytes: uint64
  storageBytes: uint64
  networkBytes: uint64
  externalCalls: uint32
  costMinorUnits: uint64
}

BudgetSnapshot {
  ceiling: BudgetLimit
  consumed: BudgetUsage
  reserved: BudgetUsage
  capturedAt: Timestamp
}

AuthoritySnapshot {
  profileId: Id
  normalizedScopes: ResourceScope[]
  executorClass: ExecutorClass
  networkBoundary: NetworkBoundary
  dataExportBoundary: DataExportBoundary
  budget: BudgetSnapshot
  expiresAt: Timestamp
  digest: Digest
}

ApprovalRule {
  ruleId: Id
  actionPatterns: string[]
  resourceTypes: string[]
  riskThreshold: low | medium | high | critical
  approverKinds: (user | system | delegated_admin)[]
  requiredCount: uint32
  expiresAfter?: Duration
}

RepairPolicy {
  allowed: boolean
  maxAttempts: uint32
  allowedSources: validation | environment | dependency | execution | agent []
  requireApprovalOnExpansion: boolean
  forbiddenChanges: string[]
}
```

UI 可以使用“Autonomous”作为易懂的模式名称，但协议中不得存在 `fullAccess: true`。实际授权必须展开为：

```text
AuthorityProfile {
  profileId: Id
  principal: PrincipalRef
  workspaceScopes: ResourceScope[]
  filesystem: FilesystemPolicy
  process: ProcessPolicy
  network: NetworkPolicy
  secrets: SecretPolicy
  environments: EnvironmentPolicy
  externalPrincipals: DelegationPolicy
  dataExport: DataExportPolicy
  approvalBypass: ApprovalBypassPolicy
  background: BackgroundExecutionPolicy
  budget: BudgetCeiling
  validFrom: Timestamp
  expiresAt: Timestamp
  revocable: true
}
```

上述策略字段的最小合同如下。实现可以增加收紧字段，但不得把任一策略省略后解释为允许：

```text
FilesystemPolicy {
  scopes: ResourceScope[]
  followSymlinks: never | within_scope | allowed
  allowWorkspaceEscape: boolean
  allowDeviceFiles: boolean
}

ProcessPolicy {
  executableDigests: Digest[]
  executablePatterns: string[]
  argvPatterns: string[]
  allowShell: boolean
  maxChildProcesses: uint32
  allowPrivilegeElevation: boolean
}

NetworkPolicy {
  boundary: NetworkBoundary
  allowDns: boolean
  allowRedirects: boolean
  maxRequestBytes?: uint64
}

SecretPolicy {
  allowedRefs: SecretRef[]
  allowExport: boolean
  maxUses?: uint32
}

EnvironmentPolicy {
  allowedContextRefs: ExecutionContextVersionRef[]
  allowCreate: boolean
  allowInstall: boolean
  allowUpdate: boolean
  allowDelete: boolean
}

DelegationPolicy {
  allowedPrincipals: PrincipalRef[]
  allowedActions: string[]
  maxDepth: uint32
}

DataExportPolicy {
  boundary: DataExportBoundary
  allowedArtifactKinds: string[]
  requireRedaction: boolean
}

ApprovalBypassPolicy {
  allowed: boolean
  actionPatterns: string[]
  maxDuration?: Duration
  requiresAudit: true
}

BackgroundExecutionPolicy {
  onWindowClosed: continue | pause | cancel
  onAppExit: continue_host | pause | cancel
  onScreenLocked: continue | pause_sensitive | pause_all
  onSleep: checkpoint
  onWake: reconcile_before_resume
  onUserChanged: pause
  maxUnattendedDuration: Duration
}

BudgetCeiling = BudgetLimit
```

`AuthorityProfile` 是可撤销的授权意图；真正绑定到一次 Run 的是不可变 `AuthoritySnapshot`。Profile 修改、撤销或过期不会改写历史 Snapshot，但会阻止尚未开始的动作并触发正在运行动作的取消/对账流程。

缺失字段一律默认拒绝。子画布、子 Agent、Worker 和外部工具只得到当前动作所需权限的交集，不继承整个 Profile。

## 权限维度

- 文件：规范化路径、读/写/创建/删除、是否跟随链接、工作区内外边界。
- 进程：可执行文件摘要或路径、参数模板、子进程数、提升权限和 shell 使用。
- 网络：域名/IP/端口/协议、DNS、入站监听、重定向和下载大小。
- 秘密：SecretRef、用途、目标主体、可使用次数和是否允许导出。
- 环境：可使用、创建、安装、更新、删除的环境和依赖来源。
- 外部主体：可委派对象、可见数据、可执行动作、返回结果信任等级。
- 数据导出：敏感度、目标边界、脱敏要求和允许 Artifact 类型。
- 后台：UI 关闭、锁屏、休眠、用户切换和应用升级时的策略。
- 预算：费用、时间、并发、CPU、内存、磁盘、令牌、网络和外部调用数。

## Agent 自动修复硬限制

Agent MAY 提议任意结构化 Patch，但 MUST NOT 自行批准权限扩大。以下变化形成 `AuthorityExpansion`：

- 扩大资源路径、网络或数据导出范围。
- 获取新的 SecretRef 或向新主体披露数据。
- 安装未知依赖、运行新二进制或启用 shell。
- 从受限环境切换到更弱隔离的环境。
- 增加预算、持续时间、并发或后台存活范围。
- 新增外部主体或不可逆副作用。
- 删除或弱化验证、审批、审计、补偿、超时和成功标准。

AuthorityExpansion 必须重新经过 Policy Engine，并在需要时生成与 Patch 摘要绑定的 ApprovalGrant。模型文本、父 Agent 指令或“全权模式”名称不能绕过此门。

## 第一种可开放执行配置：LocalRestricted

```text
LocalRestricted {
  processBoundary: dedicated worker process
  workspaceMount: read_only by default
  writableMounts: explicit temporary output directories only
  outsideWorkspace: denied
  network: denied
  secrets: none
  packageInstall: denied
  shell: denied unless executable + argv are explicitly declared
  childProcesses: denied by default, otherwise fixed maximum
  cpu / memory / wallTime / storage / output: hard limits
  cancellation: cooperative signal then forced termination
  effectJournal: required for writable actions
  cleanup: terminate process tree and remove temporary storage
}
```

操作系统能力有限时，产品必须明确显示“策略限制”与“系统级强隔离”的差异。仅靠应用层路径检查不得宣传为强沙箱。

## 执行器分级

| 级别 | 信任边界 | 默认开放 |
|---|---|---|
| `LocalRestricted` | 受控本地 Worker，最小文件/网络权限 | 是，完成隔离验证后 |
| `ContainerIsolated` | 容器文件系统、网络和资源策略 | 否，显式启用 |
| `RemoteManaged` | 受信远程 Worker，双向身份和心跳 | 否，显式配置 |
| `LocalUnrestricted` | 用户会话权限下的本地进程 | 否，逐次或有界授权 |
| `ExternalDelegated` | 外部主体执行，能力与取消语义协商 | 否，实验性 |

每种 Executor 必须声明可强制执行的策略、无法保证的限制、健康检测、取消级别、结果签名和恢复能力。调度器不得把需求分配到无法强制满足限制的 Executor。

## 后台生命周期

AuthorityProfile 必须明确：

```text
onWindowClosed: continue | pause | cancel
onAppExit: continue_host | pause | cancel
onScreenLocked: continue | pause_sensitive | pause_all
onSleep: checkpoint
onWake: reconcile_before_resume
onUserChanged: pause
maxUnattendedDuration: Duration
```

后台继续需要常驻 Host、可见状态入口和随时撤销能力。凭据到期、用户切换或 Policy 变化后不得静默继续。

## UI 要求

- 运行前展示有效作用域摘要，而不是只显示模式名称。
- 所有权限升级提示必须展示 before/after 差异、原因、持续时间、预算和撤销入口。
- 全局“Autonomous”偏好不能替代单个 Run 的 AuthoritySnapshot。
- 用户随时可以收紧权限；系统必须说明对正在运行、等待和未来动作的不同影响。
