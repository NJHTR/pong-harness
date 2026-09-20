# Seekwd / Pong Harness 全系统产品需求文档

> 文档类型：System Product Requirements Document  
> 文档状态：Experimental Proposal  
> 产品范围：Seekwd Workbench、Pong Host、Pong Harness Runtime、Pong Agent、Worker、Extension SDK  
> 目标阶段：完整产品设计、内部验证、受邀试点规划  
> 最后更新：2026-09-20  
> 规范优先级：本文描述产品需求；跨组件身份、版本、状态、权限和执行合同以 [27-normative-contracts](27-normative-contracts/00-README.md) 为准。

## 1. 文档目的

本文将 Seekwd 整个系统拆分为可实施、可验收的产品需求，并明确每一类对象需要哪些：

- **Create：增**，创建对象、版本、绑定、运行或记录。
- **Read：查**，列表、详情、搜索、比较、追踪和导出摘要。
- **Update：改**，编辑可变对象、产生新版本、变更状态或调整绑定。
- **Delete：删**，删除、归档、撤回、吊销、失效或垃圾回收。
- **Execute：执行**，运行、暂停、恢复、取消、重试、调试和补偿。
- **Review：审查**，验证、审批、影响分析、对账和审计。

CRUD 不是完整功能分类。系统还必须单独覆盖 Control、Validate、Approve、Observe、Debug、Reconcile、Recover、Compensate、Schedule、Import/Export、Notify/Attend、Audit 和 Govern。完整系统边界、模块责任与流程图见 [31-system-decomposition-and-process-model.md](31-system-decomposition-and-process-model.md)。

本文不是简单功能愿望清单。每条需求都有稳定编号，可被产品、设计、前端、Host、Runtime、测试和发布门禁共同引用。

## 2. 产品定义

Seekwd 是一个本地优先的 Agent 工作台。用户可以描述目标、组织 Workspace、编辑 Canvas 节点图、选择执行入口、运行和调试流程、审批敏感动作、观察结果、处理异常、复用成功经验，并通过 Extensions、Capabilities、Agents 和 Execution Context 扩展系统能力。

```text
User
  -> Seekwd Workbench
      -> Workspace
          -> Goal / Plan
          -> Canvas Identity
              -> Canvas Draft
              -> Canvas Revision
              -> Canvas Release
              -> Entrypoints / Triggers
              -> Nodes / Ports / Edges
          -> Run / NodeRun / Attempt
          -> Artifact / Evidence / Value / Lineage
          -> Policy / Approval / Recovery
          -> Environment / Capability / Agent / Extension
  -> Pong Host
      -> Runtime / Worker / Executor / Projection / Audit
```

## 3. 设计与实现原则

### 3.1 单一事实源

- UI 不得通过本地 Toast、按钮颜色或文本推测领域事实。
- 所有写操作必须转换为结构化 Command。
- 所有执行结果必须由持久化 Event 和 Query Model 反馈。
- Projection 可以重建，不得作为事实拥有者。

### 3.2 命令不等于完成

```text
idle
  -> pending
  -> accepted | approval_required | conflict | failed
accepted
  -> facts_arriving
  -> completed | blocked | outcome_unknown
```

按钮显示 `accepted` 只表示 Host 接受命令，不代表外部动作已经完成。

### 3.3 不可变对象不允许原地修改

以下对象禁止普通 Update：

- CanvasRevision
- CanvasRelease 的版本绑定
- RunSnapshot
- NodeResult
- Evidence
- AuditEvent
- 已提交 GraphPatch 内容

需要变化时必须创建新版本、追加生命周期事件、创建 RunBranch、逆补丁或 Resolution。

### 3.4 删除默认是可恢复或可审计操作

- Workspace、CanvasIdentity、Artifact 等默认逻辑删除或归档。
- Release 使用 deprecated / withdrawn，不修改历史绑定。
- ApprovalGrant 使用 revoked。
- Secret 使用 revoked / rotated，不恢复旧明文。
- Extension 使用 disabled / uninstalled，但保留历史 Manifest 引用。
- 被 Run、Lineage、Audit、Release 或 Evidence 引用的对象不得物理删除。

### 3.5 危险操作必须先影响分析

删除、权限扩大、网络开放、数据导出、环境安装、跨 Workspace 调用、Extension 更新、Release 撤回等操作必须由服务端返回 `ImpactAnalysis`，前端不得根据当前列表自行猜测影响。

## 4. 用户角色

| 角色 | 主要权限 |
|---|---|
| Workspace Owner | 管理 Workspace、策略、成员、Canvas、Secrets 和删除操作 |
| Builder | 创建和编辑 Goal、CanvasDraft、节点、入口和测试运行 |
| Operator | 启动、暂停、恢复、取消 Run，处理等待和恢复 |
| Approver | 审批权限、预算、导出、外部调用和危险动作 |
| Auditor | 只读查看 Audit、Evidence、Lineage、Policy Decision 和历史版本 |
| Extension Developer | 开发、测试、发布 Node Definition 和 Extension |
| Agent Principal | 在 AuthorityProfile 限制内提出 Plan、GraphPatch、RunPatch 和命令 |
| Worker Principal | 执行已授权 NodeAttempt，不拥有产品配置权限 |
| System Principal | 恢复、迁移、保留、投影和后台维护 |

## 5. 全局页面结构

```text
Application Shell
  Welcome / Recovery
  Global Search / Command Palette
  New Workspace
  Automations
  Extensions
  Notification / Attention Center
  Host Health / Background Jobs
  Settings

Workspace Shell
  Overview
  Goals / Plans
  Canvases
  Files / Context Sources
  Artifacts
  Environments
  Agents / Capabilities
  Policies / Secrets / Budgets
  Audit / Retention / Backup

Canvas Workbench
  Graph
  Node / Port / Edge Inspector
  Entrypoints / Triggers
  Validation
  Revision / Release
  Run Launch / Monitor / History
  Debugger / Dataflow / Cross-Canvas Trace
  Agent Composer
```

### 5.1 UI 原型、组件库与正式前端的边界

Seekwd 的界面交付必须拆成三个相互关联但不能互相替代的层级：

| 层级 | 当前载体 | 责任 | 不承担的责任 |
|---|---|---|---|
| UI Design / Interactive Prototype | `apps/ui-lab` | 验证信息架构、视觉语言、交互流程、组件状态、响应式行为和 Mock 场景；作为可执行设计规范 | 不作为生产应用，不拥有真实领域事实，不直接代表后端已接入 |
| UI Component Library | `packages/seekwd-ui` | 提供设计 Token、Primitive、Canvas Node、Panel、Overlay、Notification 等可复用组件及其无障碍、主题和视觉合同 | 不负责产品路由、业务编排、Host 连接、权限判断和领域状态 |
| Production Frontend | `apps/workbench` 或最终确认的等价应用 | 根据已验收 UI 搭建真实产品前端，负责路由、功能模块、查询/命令/事件适配、权限、恢复、桌面生命周期、测试和发布 | 不直接访问 SQLite、Worker、Executor 或任意内部存储，不复制 Mock 事实作为生产事实 |

当前仓库中的 `apps/ui-lab` 必须继续保留为 UI 原型和视觉回归基准；它不能通过改名被视为正式前端。正式前端必须建立独立应用入口，并复用 `@seekwd/ui`，而不是把原型中的单体页面直接当作最终架构。

### 5.2 正式前端总体架构

推荐的代码边界如下，最终目录名可以调整，但职责不可合并：

```text
apps/ui-lab                 可交互 UI 原型与组件展示
apps/workbench              正式产品前端
apps/workbench/src-tauri    桌面壳与 Host IPC 适配（采用 Tauri 时）
packages/seekwd-ui          设计系统与通用组件
packages/seekwd-client      由正式 Schema 生成的 Query/Command/Event 客户端
packages/seekwd-features    可选的跨入口功能模块，不存储领域事实
```

正式前端按 Workspace、Canvas、Run、Approval、Recovery、Artifact、Environment、Extension、Settings 等功能域拆分。页面只组合功能模块；模块通过统一 `HostClient` 使用 Query、Command 和 Event，不得在组件中直接调用数据库、文件系统或 Worker 内部接口。

### 5.3 正式前端状态分层

正式前端必须至少区分以下状态，禁止混装在一个全局 Store 或大型 React 组件中：

| 状态层 | 内容 | 权威性与生命周期 |
|---|---|---|
| Domain Facts | Workspace、Canvas、Run、Approval、Artifact 等 Host 查询投影 | 只读缓存；以 Host 的版本、游标和快照为准 |
| Draft Store | 尚未提交的 CanvasDraft 编辑、表单输入和 GraphPatch 草案 | 本地可变；提交后通过命令回执与新投影对账 |
| Command Store | pending、accepted、approval_required、conflict、failed、completed | 记录每个命令生命周期，不等同于领域事实 |
| View Store | 当前选区、缩放、面板、筛选、展开状态和菜单 | 纯 UI 状态，可按安全规则本地持久化 |
| Debug Store | 当前调试 Run、断点、输入覆盖、数据流定位 | 绑定明确 Run/Revision；不得写回历史事实 |

图渲染层必须通过 `domain graph -> renderer graph` 适配；用户拖拽、连接、删除和编辑操作必须转换为类型化 `GraphCommand` 或 `GraphPatch`，不能直接修改 Host 投影对象。

### 5.4 UI 到正式前端的交付流程

1. 在 UI Lab 中冻结页面结构、交互状态、组件合同和验收截图。
2. 将稳定的通用控件抽取到 `packages/seekwd-ui`，补齐主题、无障碍和组件测试。
3. 创建独立正式前端应用与类型化路由，不复制 UI Lab 的单体 `App.tsx` 结构。
4. 先接入与正式合同一致的 Mock `HostClient`，覆盖成功、冲突、审批、断线和恢复场景。
5. 按功能域迁移页面，并建立 Domain/Draft/Command/View/Debug 状态分层。
6. 使用同一接口将 Mock Adapter 替换为 IPC/Host Adapter，不修改领域语义。
7. 接入事件订阅、游标恢复、快照重同步、权限和结构化错误处理。
8. 使用端到端测试和视觉回归比较正式前端与 UI Lab 的行为及视觉结果。
9. UI Lab 在产品发布后仍作为设计探索和组件验收环境保留。

## 6. 对象生命周期与 CRUD 总览

| 领域对象 | 增 | 查 | 改 | 删/撤回 | 额外动作 |
|---|---:|---:|---:|---:|---|
| Workspace | 是 | 是 | 是 | 逻辑删除 | 打开、关闭、恢复、备份 |
| Goal / GoalVersion | 是 | 是 | 新版本 | 归档 | 澄清、规划、终止 |
| CanvasIdentity | 是 | 是 | 是 | 归档/逻辑删除 | 导入、导出 |
| CanvasDraft | 是 | 是 | 是 | 放弃 | 保存 Revision、解决冲突 |
| CanvasRevision | 是 | 是 | 否 | 归档引用 | 比较、验证、创建 Draft |
| CanvasRelease | 是 | 是 | 否 | deprecated/withdrawn | 发布、兼容检查 |
| NodeInstance | 是 | 是 | 是 | Patch 删除 | 测试、替换定义、禁用 |
| PortBinding | 是 | 是 | 是 | 解除绑定 | Schema 检查、追踪值 |
| Edge | 是 | 是 | 是 | Patch 删除 | 映射、投递、条件检查 |
| Entrypoint | 是 | 是 | 是 | 非默认可删 | 设默认、测试调用 |
| Trigger | 是 | 是 | 是 | 是 | 启停、测试事件 |
| GraphPatch | 是 | 是 | 否 | superseded | 预览、审批、应用、逆补丁 |
| RunPatch | 是 | 是 | 否 | rejected/superseded | 应用、提升为 GraphPatch |
| Run | 是 | 是 | 状态事件 | 保留/归档 | 暂停、恢复、取消、重试 |
| NodeRun / Attempt | Runtime 创建 | 是 | 状态事件 | 保留 | 重试、诊断、对账 |
| WaitRecord | Runtime 创建 | 是 | 满足/过期 | 取消 | 提交输入、恢复 |
| ApprovalRequest | 是 | 是 | 决策事件 | withdraw | 批准、拒绝、过期 |
| ApprovalGrant | 决策产生 | 是 | 否 | revoke | consume、expire |
| RecoveryCase | 系统创建 | 是 | Resolution 追加 | 归档 | 对账、补偿、声明结果 |
| Artifact | 是 | 是 | 新 Revision/元数据 | 策略删除 | 预览、导出、交付 |
| Evidence | 是 | 是 | 否 | 按审计保留 | 验证、关联 |
| ValueRef / Lineage | Runtime 创建 | 是 | 否 | 按保留策略 | 追踪、脱敏、导出 |
| File / Context Source | 导入/引用 | 是 | 是 | 移除引用 | 授权、刷新、固定版本 |
| Environment | 是/发现 | 是 | 是 | 释放/删除 | 扫描、测试、绑定 |
| ExecutionContext | 是 | 是 | 收紧/生命周期 | release | 分配、停止、清理 |
| AuthorityProfile | 是 | 是 | 新版本 | revoke/archive | 模拟、绑定 |
| Policy | 是 | 是 | 新版本 | archive | 评估、解释 |
| SecretRef | 是 | 元数据可查 | rotate | revoke | 测试、绑定，不显示明文 |
| Capability | 发现/注册 | 是 | 新版本/信任 | disable | 探测、绑定、验证 |
| Agent Connection | 是 | 是 | 是 | revoke | 测试、委派、限权 |
| Provider / Model | 是 | 是 | 是 | disable | 测试、路由、设默认 |
| Extension | 安装 | 是 | 更新/启停 | 卸载 | 权限审查、健康检查 |
| NodeDefinition | 是 | 是 | 新版本 | deprecate/withdraw | 测试、发布 |
| Automation | 是 | 是 | 是 | 是 | 启停、Run Now、历史 |
| Memory / Skill | 是 | 是 | 新版本 | archive/revoke | 提升、回归、发布 |
| Notification | 系统创建 | 是 | read/ack | dismiss resolved | 打开目标、静音 |
| AuditEvent | 系统追加 | 是 | 否 | 否 | 筛选、导出、验证 |
| Budget | 是 | 是 | 是 | reset/archive | 归因、告警、审批 |
| Template / Preset | 是 | 是 | 新版本 | archive/delete | 复制、发布、应用 |
| Backup | 是 | 是 | 否 | 按保留删除 | 验证、恢复、导出 |
| MigrationJob | 是 | 是 | 状态事件 | 归档 | 预检、执行、回滚 |
| BackgroundJob | 系统创建 | 是 | 优先级/状态 | cancel | 暂停、恢复、重试 |
| Settings | 初始创建 | 是 | 是 | reset | 导入、导出 |

### 6.1 本地数据与云端数据边界

Seekwd 是本地优先桌面应用。Workspace、Canvas、Run、NodeRun、Worker、权限和恢复的权威事实必须在本地 Host；云端只承载用户明确选择的账户、Catalog、更新、同步和加密备份服务。

| 数据 | 默认位置 | 是否允许云端 | 关键要求 |
|---|---|---|---|
| Workspace 文件、路径、Draft、Run、NodeRun | 本地 Host/Workspace | 默认不允许 | 断网仍可使用；上传前逐项确认 |
| Canvas Revision/Release | 本地 Host | 可选同步 | 以 ID、版本和 Digest 去重，冲突创建分支 |
| Artifact/Evidence/日志/截图 | 本地 Artifact Store | 逐项可选 | 显示敏感度、大小、目标和保留时间 |
| Secret、Token、SSH Key、ExecutionHandle | 本地 OS Secret Store/Host | 禁止 | 云端不能成为本地执行前提 |
| 账户、设备、Entitlement、更新 Manifest | 本地缓存 + 云端 | 允许 | 云端不可用不应阻止本地核心功能 |
| 公共 Extension/Node Catalog、Template | 本地缓存 + 云端 | 允许 | 安装前仍须本地签名、兼容性和权限检查 |
| Telemetry/Crash Bundle | 本地生成 | 独立 opt-in | 默认脱敏，不包含工作区内容 |

云同步必须拥有独立的 Sync Outbox/Inbox、设备身份、游标、冲突记录、暂停和重试状态；登录账户不能等价为“允许上传所有 Workspace 数据”。

### 6.2 全系统行为总览（CRUD 之外）

| 行为 | 是否独立建模 | 适用对象 | 必须产生/读取的事实 | 不能用什么替代 |
|---|---|---|---|---|
| Execute | 是 | Run、NodeRun、Automation、Migration、Backup | Command、Attempt、Handle、Event、Result | 不能用按钮点击或页面动画替代 |
| Control | 是 | Run、NodeRun、Automation、BackgroundJob、窗口会话 | Pause/Resume/Cancel/Takeover 命令和状态事件 | 不能直接改状态字段 |
| Validate | 是 | Graph、Revision、Release、Schema、Extension、Artifact | ValidationReport、Issue、CompatibilityReport | 不能只依赖前端表单校验 |
| Approve | 是 | Policy、ApprovalRequest、Export、Release、跨 Workspace 调用 | PolicyDecision、ApprovalGrant、审计事件 | 不能用角色名称或前端隐藏按钮替代 |
| Observe | 是 | Run、NodeRun、Worker、Host、Budget、Automation | Query Projection、Log、Metric、Cursor | 不能把日志文本当状态事实 |
| Debug | 是 | Revision、Run、NodeRun、GraphPatch | Debug Session、Breakpoint、RunBranch、Trace | 不能修改历史 RunSnapshot |
| Reconcile | 是 | ExecutionHandle、EffectReceipt、跨画布投递、Backup | ReconciliationReport、Resolution、Evidence | 不能把无响应直接归为失败或取消 |
| Recover | 是 | Host、Projection、Run、Wait、Artifact、Migration | Snapshot、Checkpoint、RecoveryCase、恢复事件 | 不能清空数据库或强制刷新页面解决 |
| Compensate | 是 | 外部副作用、Artifact 交付、跨系统动作 | Compensation Attempt、EffectReceipt、审批和审计 | 不能承诺所有动作可回滚 |
| Schedule/Trigger | 是 | Automation、Trigger、WaitRecord、Event | DeliveryRecord、去重键、Run 引用 | 不能把 Cron 文本当成调度事实 |
| Import/Export | 是 | Workspace、Canvas、Artifact、Backup、Support Bundle | ImportJob、ExportReview、Digest、审计 | 不能绕过权限直接读写文件 |
| Notify/Attend | 是 | Notification、Wait、Approval、Recovery、Budget | Delivery、Read/Ack、Attention 状态 | 不能用短暂 Toast 代替待处理事项 |
| Audit | 是 | 所有高风险命令、权限决策、导出、恢复和迁移 | 不可篡改 AuditEvent、因果链和主体 | 不能依赖应用日志或截图 |
| Govern | 是 | Contract、Extension、NodeDefinition、Retention、Migration | 状态矩阵、兼容报告、版本和门禁证据 | 不能把提案文档当正式合同 |

### 6.3 模块拆分的完成判定

一个模块只有同时满足以下条件，才可标记为“已完成”，而不是仅完成 CRUD：

1. 有明确事实所有者和禁止越权写入的边界。
2. 有 Create/Read/Update/Delete 或明确说明不适用的生命周期定义。
3. 有 Execute、Control、Validate、Approve、Observe、Recover 中适用的行为。
4. 有 Query、Command、Event 和 Projection 的接口追踪。
5. 有权限、幂等、并发、失败、恢复和审计验收场景。
6. 有正式前端页面、空态、加载态、离线态、冲突态、无权限态和结果未知态。
7. 有最少一个端到端流程和至少一个故障恢复流程。

模块和系统流程图、数据流、状态图及所有权矩阵见 [31-system-decomposition-and-process-model.md](31-system-decomposition-and-process-model.md)。

## 7. 全局应用与会话需求

| ID | 类型 | 需求 |
|---|---|---|
| APP-C-001 | Create | 首次启动必须创建本地应用配置、设备 ID 和默认安全策略，不自动创建云账户。 |
| APP-C-002 | Create | 用户可以打开新的 Workbench 窗口，并显式选择是否复用当前 Workspace 会话。 |
| APP-R-001 | Read | Welcome 页面必须列出最近、固定、需要恢复和迁移失败的 Workspace。 |
| APP-R-002 | Read | 全局状态区必须展示 Host 连接、后台 Run、待审批、待恢复和更新状态。 |
| APP-R-003 | Read | 应用必须显示最后一次确认的事件游标和快照时间，用于区分实时与陈旧状态。 |
| APP-U-001 | Update | 用户可以固定、取消固定和重新排序最近 Workspace，不改变 Workspace 事实。 |
| APP-U-002 | Update | 用户可以切换主题、语言、减少动态效果和减少透明度，所有窗口同步更新。 |
| APP-D-001 | Delete | 清除最近列表只删除本地导航记录，不删除 Workspace 或文件。 |
| APP-E-001 | Execute | 关闭 Workbench 窗口不得默认取消后台 Run；必须根据 AuthorityProfile 显示明确结果。 |
| APP-V-001 | Review | Host 断开、崩溃或重启时，应用进入 stale/offline 状态，不得继续显示命令成功。 |

### 7.1 选择性云服务与同步需求

| ID | 类型 | 需求 |
|---|---|---|
| CLD-C-001 | Create | 用户可以选择创建/登录云账户，但不登录也必须能够创建 Workspace、编辑 Canvas 和运行本地任务。 |
| CLD-C-002 | Create | 用户必须按 Workspace 和数据类别显式开启同步或加密备份；系统不得提供含糊的“全部上传”默认选项。 |
| CLD-R-001 | Read | Cloud & Sync 页面展示账户、设备、套餐、每个 Workspace 的同步范围、最近游标、待上传大小、冲突和错误。 |
| CLD-R-002 | Read | 每个对象必须显示 local only、pending、syncing、synced、conflict、failed 或 paused，且同步状态不冒充业务保存状态。 |
| CLD-U-001 | Update | 用户可以随时暂停、恢复或收窄同步范围；扩大到新的数据类别必须再次确认数据边界。 |
| CLD-U-002 | Update | 新设备下载 Canvas/Artifact 后必须重新绑定本地路径、Secret、Environment 和 AuthorityProfile，不继承其他设备的本地 Grant。 |
| CLD-D-001 | Delete | 删除云端副本不得默认删除本地对象；删除本地对象也不得在未说明保留策略时自动擦除云端 Backup。 |
| CLD-D-002 | Delete | 用户可以撤销设备、删除云端 Workspace 副本和申请账户数据删除；Audit/账务依法保留部分必须明确说明。 |
| CLD-E-001 | Execute | 本地 Host 使用独立 Sync Outbox/Inbox、对象版本、Digest、deviceId 和 cursor 执行至少一次同步与去重。 |
| CLD-E-002 | Execute | 云端不可用时同步进入 pending/failed，但本地 Query、Command、Run、Worker 和 Recovery 不得被阻塞。 |
| CLD-E-003 | Execute | 不可变 Revision/Release 按 ID + Digest 合并；可变 Draft 冲突必须创建分支或请求用户合并，禁止 last-write-wins 静默覆盖。 |
| CLD-E-004 | Execute | Artifact 上传使用客户端加密、分块、校验、暂停、恢复和明确保留期限；云端不得获取 Secret 明文。 |
| CLD-P-001 | Approve | 上传敏感 Artifact、日志、Prompt、截图、Evidence 或工作区文件前必须展示数据类型、大小、目标、加密和保留时间。 |
| CLD-A-001 | Audit | 登录、设备注册、同步范围变化、上传、下载、冲突解决、云端删除和导出均写入本地审计；云服务保存对应安全审计。 |
| CLD-V-001 | Review | 必须测试断网、重复上传、分块中断、设备撤销、云端回滚、时钟偏差、冲突和云端数据损坏。 |
| CLD-V-002 | Review | 必须证明云服务完全不可用时，本地参考生命周期仍能完成并恢复。 |

### 7.2 分发、安装、更新与用户使用需求

| ID | 类型 | 需求 |
|---|---|---|
| DST-C-001 | Create | 官方安装包必须同时交付 Workbench、Pong Host、LocalRestricted Worker、内置节点、协议 Schema、迁移和默认安全策略。 |
| DST-C-002 | Create | 新机器不安装 Node.js、Rust、Docker、PostgreSQL 或消息中间件也能安装并启动 Stable。 |
| DST-C-003 | Create | 首次启动必须创建设备身份、应用数据目录、Host 会话、SQLite、迁移记录和 Restricted AuthorityProfile。 |
| DST-R-001 | Read | About/Diagnostics 必须显示 Workbench、Host、协议、Schema、数据库迁移、Worker 和 Extension 版本。 |
| DST-R-002 | Read | 更新页面显示签名、摘要、Release Channel、变更、已知限制、迁移、Extension 兼容和回滚边界。 |
| DST-U-001 | Update | 支持 Nightly、Beta、Stable 和 Enterprise Channel；Stable 默认，切换到实验通道必须确认风险。 |
| DST-U-002 | Update | 更新前检查活动 Run、未提交 Draft、RecoveryCase、备份、空间和迁移兼容性，并选择完成、暂停或延后。 |
| DST-U-003 | Update | 更新后 Host 先进入 recovering，完成迁移、Projection 检查和外部 Handle 对账后才能接收新的高风险动作。 |
| DST-D-001 | Delete | 卸载必须分别询问应用数据、Workspace、Artifact、Backup、Secret 引用和云端副本；不得默认级联删除用户目录。 |
| DST-E-001 | Execute | Update Manifest、安装包和增量包必须签名；验证失败、摘要不一致或证书异常时禁止安装。 |
| DST-E-002 | Execute | 应用代码回滚、数据库恢复、Schema 前向兼容和活动 Run 恢复必须是不同操作，不能用“回滚版本”一个按钮混淆。 |
| DST-V-001 | Review | Stable 发布必须生成 SBOM、provenance、漏洞报告、签名和可复现的构建来源。 |
| DST-V-002 | Review | 必须完成全新安装、覆盖升级、升级中断、迁移失败、只读恢复、卸载保留和离线安装测试。 |
| DST-V-003 | Review | 无账户、断网、云端 AI 不可用和云同步不可用时，本地核心生命周期必须保持可用。 |
| DST-V-004 | Review | 企业模式必须支持固定版本、离线安装、禁用云同步、私有 Extension Registry 和集中更新策略。 |

## 8. Workspace 需求

### 8.1 Create

| ID | 需求 |
|---|---|
| WSP-C-001 | 用户必须通过 `New Workspace` 选择或创建本地目录。 |
| WSP-C-002 | 创建前必须预览目录访问范围、读写权限、符号链接和工作区外路径风险。 |
| WSP-C-003 | 创建时必须生成稳定 `workspaceId`，名称不能作为身份。 |
| WSP-C-004 | 创建成功后默认创建一个 CanvasIdentity 和可编辑 CanvasDraft。 |
| WSP-C-005 | 如果目录已有 Seekwd 元数据，必须提供 Open、Import、Repair 或 Cancel，不得覆盖。 |
| WSP-C-006 | 支持从 Template 创建 Workspace，但必须重新绑定路径、Secrets、Environment 和权限。 |

### 8.2 Read

| ID | 需求 |
|---|---|
| WSP-R-001 | 查询全部可访问 Workspace，支持分页、搜索、最近和固定筛选。 |
| WSP-R-002 | Workspace Overview 展示 Canvas、活动 Run、Attention、Artifact、环境和健康摘要。 |
| WSP-R-003 | Workspace 详情显示目录、创建者、更新时间、策略、存储、备份和迁移状态。 |
| WSP-R-004 | 支持查看跨 Workspace 调用、授权和数据导出关系。 |
| WSP-R-005 | 支持只读打开损坏、旧版本或权限不足的 Workspace，并说明限制。 |

### 8.3 Update

| ID | 需求 |
|---|---|
| WSP-U-001 | 用户可以重命名 Workspace，所有 UI 引用按 ID 更新，路径不随名称变化。 |
| WSP-U-002 | 用户可以修改摘要、图标、标签和默认 Canvas。 |
| WSP-U-003 | 用户可以收紧或申请扩大 Workspace 权限；扩大必须重新审批。 |
| WSP-U-004 | 用户可以变更默认 AuthorityProfile、Budget、Retention 和 Backup Policy。 |
| WSP-U-005 | 用户可以迁移 Workspace 目录；迁移前必须检查活动 Run、锁、引用和磁盘空间。 |

### 8.4 Delete / Archive

| ID | 需求 |
|---|---|
| WSP-D-001 | 删除前必须返回 Canvas、Run、Artifact、Automation、SecretRef、Environment 和跨 Workspace 引用影响。 |
| WSP-D-002 | 存在活动 Run、未处理 RecoveryCase 或未完成导出时默认禁止删除。 |
| WSP-D-003 | 删除采用逻辑删除和可配置冷静期，物理文件删除必须单独确认。 |
| WSP-D-004 | 删除不能破坏历史 Audit、RunSnapshot、Release 和 Lineage；必要时进行脱敏保留。 |
| WSP-D-005 | 恢复逻辑删除 Workspace 时必须重新校验目录、权限、Secrets 和环境。 |

### 8.5 Workspace Tree（侧边目录）

Workspace Tree 是正式 Workbench 左侧的主要对象导航，不是一个静态目录，也不能只通过 Workspace 名称驱动。它的层级为：

```text
Workspaces
  Workspace
    Canvas
      Node preview（仅当前/按需加载）
    Files
    Environments
    Agents / Capabilities
Recent
Settings（固定底部，不参与中间区域滚动）
```

#### Create / Add

| ID | 需求 |
|---|---|
| WST-C-001 | 全局 `New Workspace` 必须打开目录选择、权限预览和创建流程；创建成功后按服务端返回的 `workspaceId` 插入树并打开默认 Canvas。 |
| WST-C-002 | Workspace 行提供 `New Canvas`，创建时必须带当前 `workspaceId`；成功后按返回的 `canvasId` 导航，失败时保留当前选择。 |
| WST-C-003 | 从 Template、Import 或 Agent 提案创建的 Workspace/Canvas 必须通过同一树投影进入，不能由页面私自追加名称字符串。 |

#### Read / Navigate

| ID | 需求 |
|---|---|
| WST-R-001 | 树数据必须由版本化 `WorkspaceTreeProjection` 提供，至少包含稳定 ID、显示名称、生命周期、权限摘要、子项计数、运行聚合状态、Attention 数量和投影游标。 |
| WST-R-002 | Workspace → Canvas → Node Preview 必须使用稳定 ID；重名 Workspace、Canvas 或 Node 不得导致选择、重命名、删除或深链接定位错误。 |
| WST-R-003 | `Workspaces`、每个 Workspace、当前 Canvas 的 Node Preview 和 `Recent` 均可独立展开/收起，并具备 `aria-expanded`、键盘操作和可见焦点。 |
| WST-R-004 | 当前 Canvas 是树中唯一使用主选中背景的对象；Workspace 仅表达展开、当前作用域和聚合状态，不能与 Canvas 同时呈现同级选中。 |
| WST-R-005 | Canvas 行右侧展示 idle、running、waiting、error、success、reconciling 和 outcome_unknown 的语义图标与可访问文本；Workspace 折叠时按正式优先级聚合子 Canvas 状态。 |
| WST-R-006 | 当前 Canvas 可按需展开 Node Preview，展示节点名称、类型、运行状态和默认入口标识；它仅用于导航和预览，不替代 Graph 或 Inspector。 |
| WST-R-007 | `Recent` 必须由最近打开事实或本地导航记录生成，条目包含 Workspace 上下文；存在同名 Canvas 时必须能区分来源。 |
| WST-R-008 | Tree 必须支持搜索 Workspace 和 Canvas、固定、最近、活动运行和需要处理筛选；搜索结果保留层级上下文。 |
| WST-R-009 | 首次加载、局部加载、空树、离线缓存、陈旧快照、无权限、对象已删除、序列缺口和重同步必须有不同状态，不能全部显示为空。 |
| WST-R-010 | Workspace/Canvas 数量较大时必须使用分页、增量展开或虚拟化；折叠 Workspace 不加载完整 Node 列表和历史运行。 |

#### Update / Organize

| ID | 需求 |
|---|---|
| WST-U-001 | Workspace、Canvas 和允许编辑的 Node 可从就近菜单重命名；提交 `expectedVersion`，冲突时显示当前值和待提交值，不得按名称查找对象。 |
| WST-U-002 | 展开状态、固定项、滚动位置和最近导航属于 View State，可本地保存；运行状态、权限和 Attention 不得作为本地事实持久化。 |
| WST-U-003 | 用户可以固定、取消固定和在允许的范围内排序 Workspace/Recent；排序只改变个人导航偏好，不修改 Workspace 业务身份。 |
| WST-U-004 | Canvas 在 Workspace 间移动必须是显式迁移命令，先检查 Files、Secrets、Environment、Automation、Release 和跨 Canvas 引用，不能通过拖动树节点静默完成。 |
| WST-U-005 | 设置默认入口必须进入 Entrypoint 编辑流程；树中的 Node Preview 不能直接用旧 `primaryNodeId` 覆盖多入口合同。 |

#### Delete / Archive

| ID | 需求 |
|---|---|
| WST-D-001 | Workspace/Canvas/Node 的 Delete、Archive、Withdraw 必须是不同菜单动作，并根据对象生命周期只显示合法动作。 |
| WST-D-002 | 删除前从 Host 获取 `ImpactAnalysis`，展示活动 Run、Entrypoint、Trigger、Edge、Wait、Release、Automation、Artifact、Lineage 和跨 Canvas/Workspace 引用。 |
| WST-D-003 | 删除成功必须等待事件投影确认后从树移除；命令 accepted 阶段显示 pending，不得立即删除本地行并假装完成。 |
| WST-D-004 | 删除失败、审批要求或版本冲突时保留节点位置、展开状态和选择，并提供打开阻塞对象的入口。 |
| WST-D-005 | 当前选中对象被其他窗口删除或归档时，树显示 Deleted/Archived 状态并导航到最近有效父级，不得崩溃或选择同名对象。 |

#### Execute / Observe / Recover

| ID | 需求 |
|---|---|
| WST-E-001 | 点击 Canvas 导航到稳定 Canvas 路由；点击状态图标打开该 Canvas 的 Run/Attention 摘要，而不是直接启动运行。 |
| WST-E-002 | 多 Workspace 同时运行时，树必须持续订阅状态和 Attention 增量；用户不需要停留在运行 Canvas 才能发现失败、等待和完成。 |
| WST-E-003 | Notification、Attention Center、Workspace Tree 和 Run Monitor 必须消费同一事实投影和 `sourceRef`，不得形成互相矛盾的状态。 |
| WST-E-004 | 事件断线时冻结最后确认状态并标记 stale；完成 Snapshot + Cursor 重同步后再恢复实时图标。 |
| WST-E-005 | 树的命令、选择和展开操作必须支持键盘；上下移动、左右展开、Enter 打开、菜单键/快捷键打开动作菜单，不能依赖悬停。 |

#### 验收要求

| ID | 需求 |
|---|---|
| WST-V-001 | 使用至少 100 个 Workspace、每个 100 个 Canvas 和活动状态更新进行性能测试，滚动、展开和状态更新不得阻塞 Canvas 操作。 |
| WST-V-002 | 使用 Workspace/Canvas/Node 重名、超长名称、Unicode、只读权限、离线、删除竞争和版本冲突进行验收。 |
| WST-V-003 | 通过键盘、屏幕阅读器、200% 缩放、窄窗口覆盖层、Light/Dark/高对比度和 reduced-motion 验收。 |
| WST-V-004 | UI Lab 负责视觉和交互基线；正式前端必须通过 HostClient、路由恢复、事件重同步和真实命令 E2E，不能只复用原型 local state。 |

## 9. Goal 与 Plan 需求

### 9.1 Goal CRUD

| ID | 类型 | 需求 |
|---|---|---|
| GOL-C-001 | Create | 用户可以从 Agent Composer 或 Goal Center 创建 Goal，必须明确 Workspace 和作用域。 |
| GOL-C-002 | Create | Goal 必须记录原始请求、约束、成功标准、预算、期限和来源引用。 |
| GOL-R-001 | Read | Goal Center 展示 Goal 状态、版本、子目标、关联 Canvas/Run 和待决问题。 |
| GOL-R-002 | Read | 用户可以比较任意两个 GoalVersion 的需求、约束和成功标准差异。 |
| GOL-U-001 | Update | 修改 Goal 必须创建新的 GoalVersion，不覆盖已用于 RunSnapshot 的版本。 |
| GOL-U-002 | Update | 用户可以澄清、拆分、合并、暂停、恢复和终止 Goal。 |
| GOL-D-001 | Delete | 未执行 Draft Goal 可删除；已关联 Plan/Run 的 Goal 只能归档。 |

### 9.2 Plan CRUD

| ID | 类型 | 需求 |
|---|---|---|
| PLN-C-001 | Create | Agent 或用户可以为 GoalVersion 创建一个或多个 PlanCandidate。 |
| PLN-C-002 | Create | Plan 必须列出步骤、能力、权限、预算、风险、验证和待确认问题。 |
| PLN-R-001 | Read | Plan Review 支持并排比较候选计划和能力缺口。 |
| PLN-R-002 | Read | 用户可以追踪 Plan 步骤到 Canvas、Node、Capability 和验证点。 |
| PLN-U-001 | Update | 编辑已提议 Plan 必须创建新候选版本或结构化 Patch。 |
| PLN-U-002 | Update | 批准 Plan 只授权进入建图流程，不自动批准其权限请求。 |
| PLN-D-001 | Delete | 未采用 Plan 可以丢弃；已采用 Plan 保留为审计来源。 |

## 10. Canvas Identity 与 Draft 需求

### 10.1 CanvasIdentity

| ID | 类型 | 需求 |
|---|---|---|
| CVS-C-001 | Create | 用户可以在当前 Workspace 创建 CanvasIdentity，并自动创建初始 Draft。 |
| CVS-C-002 | Create | 支持从空白、Template、已有 Revision、RunBranch 或导入包创建 Canvas。 |
| CVS-R-001 | Read | Workspace 下列出 Canvas 名称、生命周期、Draft 状态、最新 Release 和运行聚合状态。 |
| CVS-R-002 | Read | Canvas Overview 展示 Entrypoint、Trigger、Revision、Release、Run 和依赖摘要。 |
| CVS-U-001 | Update | 用户可以重命名和修改 Canvas 摘要，不改变 `canvasId`。 |
| CVS-U-002 | Update | 用户可以归档和恢复 CanvasIdentity。 |
| CVS-D-001 | Delete | 删除前必须分析其他 Canvas 调用、Automation、Release、Run 和 Artifact 引用。 |
| CVS-D-002 | Delete | 有历史运行或发布的 Canvas 只能逻辑删除；历史 Snapshot 必须可读取。 |

### 10.2 CanvasDraft

| ID | 类型 | 需求 |
|---|---|---|
| DRF-C-001 | Create | 用户可以从指定 Revision 创建新的 Draft；同一 Canvas 可有多个 Draft。 |
| DRF-C-002 | Create | 冲突解决、恢复副本和个人分支必须创建独立 Draft。 |
| DRF-R-001 | Read | 打开 Draft 时显示 basedOnRevision、draftRevision、dirty、validation 和编辑者。 |
| DRF-R-002 | Read | 支持查看未保存命令、GraphPatch 和当前 Revision 差异。 |
| DRF-U-001 | Update | 所有图编辑命令必须检查 expectedDraftRevision 并递增版本。 |
| DRF-U-002 | Update | 自动保存只保存 Draft 命令日志，不自动制造正式 Revision。 |
| DRF-U-003 | Update | 冲突时支持保留本地、加载远端、逐项合并或另存 Draft。 |
| DRF-D-001 | Delete | 放弃 Draft 必须提示未保存操作、未应用 Patch 和依赖该 Draft 的 Debug 配置。 |
| DRF-D-002 | Delete | 已保存 Revision 不受 Draft 删除影响。 |

## 11. Revision 与 Release 需求

### 11.1 CanvasRevision

| ID | 类型 | 需求 |
|---|---|---|
| REV-C-001 | Create | 用户显式保存、运行草稿、创建检查点或发布前必须生成不可变 Revision。 |
| REV-C-002 | Create | Revision 必须包含完整 GraphDocument、Digest、父 Revision、验证和兼容 Manifest。 |
| REV-R-001 | Read | Revision History 支持分页、筛选、比较、查看作者和来源 Patch。 |
| REV-R-002 | Read | 任意历史 Revision 必须以只读方式打开，并能创建新 Draft。 |
| REV-R-003 | Read | 支持查看图、Schema、Entrypoint、Policy 和 Definition 版本差异。 |
| REV-U-001 | Update | 禁止修改 Revision 内容；修复必须基于它创建新 Draft/Revision。 |
| REV-D-001 | Delete | 被 Release、RunSnapshot、Skill 或 Audit 引用的 Revision 不得物理删除。 |
| REV-D-002 | Delete | 无引用 Revision 可按 Retention 归档，但 Digest 和最小元数据必须保留。 |

### 11.2 CanvasRelease

| ID | 类型 | 需求 |
|---|---|---|
| RLS-C-001 | Create | 用户可以将已验证 Revision 发布到 stable、preview 或 internal Channel。 |
| RLS-C-002 | Create | 发布必须指定 SemVer、Release Notes、接口兼容结论和调用方影响。 |
| RLS-R-001 | Read | Release Manager 展示版本、Channel、Revision、调用方、状态和发布时间。 |
| RLS-R-002 | Read | 支持比较 Release 接口、权限、定义和兼容性差异。 |
| RLS-U-001 | Update | Release 内容和绑定不可修改；只能追加 active/deprecated/withdrawn 生命周期事件。 |
| RLS-U-002 | Update | Deprecated 必须提供替代版本和迁移建议。 |
| RLS-D-001 | Delete | Withdrawn 禁止新解析，但不得破坏历史 Run。 |
| RLS-D-002 | Delete | Release ID 和版本号不得复用。 |

## 12. Node、Port 与 Edge 需求

### 12.1 NodeInstance

| ID | 类型 | 需求 |
|---|---|---|
| NOD-C-001 | Create | 用户可以从 Node Library、Template、Agent GraphPatch 或复制粘贴创建节点。 |
| NOD-C-002 | Create | 创建必须选择精确 NodeDefinitionVersion，并检查所需权限和 ExecutionRequirement。 |
| NOD-R-001 | Read | 节点展示名称、语义图标、定义版本、状态、入口引用和关键配置摘要。 |
| NOD-R-002 | Read | Inspector 展示完整配置、端口、权限、环境、验证、运行和 Lineage。 |
| NOD-U-001 | Update | 用户可以修改名称、配置、绑定、启用状态、策略收紧和展示位置。 |
| NOD-U-002 | Update | 替换 Definition 必须提供配置/端口迁移预览和兼容性检查。 |
| NOD-U-003 | Update | Agent 修改节点必须提交 GraphPatch，不能直接改变 Draft。 |
| NOD-D-001 | Delete | 删除前必须展示入边、出边、Entrypoint、Trigger、等待和外部引用。 |
| NOD-D-002 | Delete | 删除必须显式选择 EdgeDisposition 和外部引用处理方式。 |
| NOD-D-003 | Delete | 删除只影响未来 Revision，不修改活动 RunSnapshot。 |
| NOD-E-001 | Execute | 用户可以单独测试可测试节点，测试使用隔离 Debug Context 并保留结果。 |

### 12.2 PortBinding

| ID | 类型 | 需求 |
|---|---|---|
| PRT-C-001 | Create | 节点创建时按 Definition 生成端口；动态端口必须由结构化命令新增。 |
| PRT-R-001 | Read | 端口显示方向、类型、必填、多重性、连接数量和敏感度摘要。 |
| PRT-R-002 | Read | 1–8 个端口直接展示，更多端口分组；数百端口在 Inspector 虚拟化。 |
| PRT-U-001 | Update | 输入可绑定 Edge、Literal、ValueRef、SecretRef、Context、Environment 或 Human Input。 |
| PRT-U-002 | Update | 多来源端口必须显式配置聚合表达式，不按到达顺序隐式选值。 |
| PRT-D-001 | Delete | 解除端口绑定必须重新验证节点必填输入和 Entrypoint 输入映射。 |

### 12.3 Edge

| ID | 类型 | 需求 |
|---|---|---|
| EDG-C-001 | Create | 用户通过连接端口创建 data/control/event/error/compensation Edge。 |
| EDG-C-002 | Create | 创建时校验方向、Schema、基数、循环、Mapping 和权限传播。 |
| EDG-R-001 | Read | Edge Inspector 展示源/目标、Kind、Mapping、Condition、Delivery 和 Cancellation。 |
| EDG-R-002 | Read | 支持追踪历史 Run 中通过 Edge 传递的 ValueRef 摘要。 |
| EDG-U-001 | Update | 用户可更新 Mapping、Condition、Delivery、Cancellation 和 Enabled。 |
| EDG-U-002 | Update | 任意更新必须重新执行整条 Edge 校验和循环分析。 |
| EDG-D-001 | Delete | 删除 Edge 前展示依赖、等待和下游不可达影响。 |
| EDG-D-002 | Delete | 删除不会删除历史 ValueRef、Lineage 或 RunSnapshot。 |

## 13. Entrypoint 与 Trigger 需求

### 13.1 Entrypoint

| ID | 类型 | 需求 |
|---|---|---|
| ENT-C-001 | Create | 每个可执行 Revision 必须且只能有一个 Default Entrypoint。 |
| ENT-C-002 | Create | 用户可以创建多个 Named Entrypoint，并配置输入、输出、调用模式和并发。 |
| ENT-R-001 | Read | Entrypoint 面板展示目标节点、输入绑定、Invocation Modes、Authority 和 Context。 |
| ENT-R-002 | Read | `Run from...` 只列出启用且 manualInvocable 的入口。 |
| ENT-U-001 | Update | 用户可重命名、切换目标、修改绑定、权限、并发和启用状态。 |
| ENT-U-002 | Update | 用户可将任意合法入口设为 Default，操作必须原子。 |
| ENT-D-001 | Delete | 默认入口不能单独删除，必须在同一 Patch 中设置新默认入口。 |
| ENT-D-002 | Delete | 删除入口前必须分析 Trigger、Automation、API 和 Canvas Call 调用方。 |
| ENT-E-001 | Execute | 用户可以用 Schema 合法的测试输入调用入口，结果标记为 Debug。 |

### 13.2 Trigger

| ID | 类型 | 需求 |
|---|---|---|
| TRG-C-001 | Create | 支持 schedule、event、webhook、canvas_signal 和 system Trigger。 |
| TRG-C-002 | Create | 创建必须配置目标 Entrypoint、Input Mapping、Filter 和 DeliveryPolicy。 |
| TRG-R-001 | Read | Trigger 列表显示来源、目标、状态、最近触发、失败和重复投递摘要。 |
| TRG-U-001 | Update | 用户可以启停、修改 Schedule/Filter/Mapping/DeliveryPolicy。 |
| TRG-U-002 | Update | 外部 Webhook 注册失败时 Trigger 不得显示为 Active。 |
| TRG-D-001 | Delete | 删除 Trigger 必须注销外部绑定并处理活动订阅；失败进入补偿流程。 |
| TRG-E-001 | Execute | 支持发送测试事件，测试必须标记来源且不伪装真实外部事件。 |

## 14. Graph Validation、GraphPatch 与 RunPatch

### 14.1 Graph Validation

| ID | 类型 | 需求 |
|---|---|---|
| VAL-C-001 | Create | 每次关键编辑、保存、运行和发布必须生成 Validation Report。 |
| VAL-R-001 | Read | 报告按 error/warning/info 展示对象、规则、位置和修复建议。 |
| VAL-R-002 | Read | 用户可以从问题列表定位 Node、Port、Edge、Entrypoint 或 Policy。 |
| VAL-U-001 | Update | 豁免 Warning 必须记录主体、理由和范围；Error 默认不可豁免。 |
| VAL-D-001 | Delete | 历史 Revision 对应报告按 Revision 保留，不随最新验证覆盖。 |

### 14.2 GraphPatch

| ID | 类型 | 需求 |
|---|---|---|
| GPT-C-001 | Create | 用户、Agent 或系统可以针对精确 DraftRevision 提交 GraphPatch。 |
| GPT-C-002 | Create | Patch 必须包含原子 Operation、原因、风险、权限/预算差异、验证和幂等键。 |
| GPT-R-001 | Read | GraphPatch Review 展示逐项 Before/After、影响对象、外部引用和不可逆效果。 |
| GPT-R-002 | Read | 支持按 Patch、Operation、Principal、Draft 和 Decision 查询。 |
| GPT-U-001 | Update | 已提交 Patch 内容不可修改；编辑行为创建新 Patch 并 supersede 旧 Patch。 |
| GPT-U-002 | Update | 用户可以批准、拒绝或要求修改；服务端重新计算风险和权限。 |
| GPT-D-001 | Delete | Patch 不物理删除；撤销已应用 Patch 使用新的逆 GraphPatch。 |
| GPT-E-001 | Execute | Patch 必须原子应用，任何 Operation 失败不得产生部分 Draft。 |
| GPT-E-002 | Execute | DraftRevision 冲突必须返回结构化差异，不自动重放高风险 Patch。 |

### 14.3 RunPatch

| ID | 类型 | 需求 |
|---|---|---|
| RPT-C-001 | Create | 用户或 Agent 可针对未开始节点和明确 Checkpoint 提交 RunPatch。 |
| RPT-R-001 | Read | Review 必须展示未来节点变化、RunBranch、权限/预算变化和验证计划。 |
| RPT-U-001 | Update | 修改提案必须创建新 RunPatch，不覆盖旧提案。 |
| RPT-D-001 | Delete | 已应用 RunPatch 不可删除；可创建新 Branch 或补偿 Patch。 |
| RPT-E-001 | Execute | RunPatch 不得修改已完成 Attempt、删除验证或扩大权限而不审批。 |
| RPT-E-002 | Execute | 经验证的 RunPatch 可另行提升为 GraphPatch，但审批和审计不得复用。 |

## 15. Run 启动与运行需求

### 15.1 Start Run

| ID | 类型 | 需求 |
|---|---|---|
| RUN-C-001 | Create | StartRun 必须引用精确 Release 或 Debug Revision。 |
| RUN-C-002 | Create | 必须指定 Entrypoint、输入、Execution Mode、Authority、Budget 和 Idempotency Key。 |
| RUN-C-003 | Create | 启动前必须执行 Schema、Policy、Environment、Secret、Budget 和 Compatibility 预检。 |
| RUN-C-004 | Create | 策略不足时创建 ApprovalRequest 并进入 waiting_approval，不得静默失败。 |
| RUN-C-005 | Create | 成功启动前必须持久化不可变 RunSnapshot。 |

### 15.2 Read Run

| ID | 需求 |
|---|---|
| RUN-R-001 | Run Monitor 展示状态、入口、Snapshot、节点进度、等待、子 Run、成本和关键事件。 |
| RUN-R-002 | Run History 支持按 Canvas、Entrypoint、Trigger、状态、时间和主体筛选。 |
| RUN-R-003 | 支持比较两个 Run 的 Snapshot、输入、Definition、输出、成本和验证结果。 |
| RUN-R-004 | Run Detail 必须显示 Debug/Release 标识，禁止混淆。 |
| RUN-R-005 | 支持查看父子 Run、correlationId 和 Cross-Canvas Trace。 |

### 15.3 Update / Execute Run

| ID | 需求 |
|---|---|
| RUN-U-001 | 用户可以暂停 Run；暂停必须阻止新节点调度并说明活动动作处理方式。 |
| RUN-U-002 | 用户可以恢复 Run；终态 Run 不得原地恢复。 |
| RUN-U-003 | 用户可以请求取消；UI 必须区分 cancelling、cancel_pending 和 cancelled。 |
| RUN-U-004 | 用户可以 Retry、Replay、Repair 或 Branch；每次创建新 Attempt 或 RunBranch。 |
| RUN-U-005 | 用户可以调整未消耗 Budget，但扩大需要重新 Policy 评估。 |
| RUN-U-006 | 用户可以接管等待输入或需要人工操作的节点，接管必须记录 Principal。 |

### 15.4 Delete / Retention

| ID | 需求 |
|---|---|
| RUN-D-001 | Run 不提供普通物理删除；用户可以归档或根据 Retention 清理大体积日志/临时 Artifact。 |
| RUN-D-002 | 删除展示数据前必须保留 Snapshot、终态、关键 Evidence、Effect Receipt 和 Audit。 |
| RUN-D-003 | 受审计、审批、恢复或外部副作用约束的 Run 不得提前清理。 |

## 16. NodeRun、Attempt 与 Debugger

| ID | 类型 | 需求 |
|---|---|---|
| NRR-C-001 | Create | Runtime 为每次节点执行创建 NodeRun，并为每次尝试创建独立 Attempt。 |
| NRR-R-001 | Read | NodeRun Detail 展示输入、输出、Definition、Context、权限、日志、Evidence 和重试链。 |
| NRR-R-002 | Read | Attempt 详情必须显示 ExecutionHandle、开始/结束时间、错误和副作用凭证。 |
| NRR-U-001 | Update | 状态只能按正式状态机事件转移，非法转移必须被拒绝。 |
| NRR-D-001 | Delete | NodeRun 和 Attempt 不物理删除，只按保留策略清理非关键大数据。 |
| NRR-E-001 | Execute | Retry 必须创建新 Attempt，不改写旧 Result。 |
| NRR-E-002 | Execute | Debugger 支持 Breakpoint、Continue、Step Into、Step Over 和从 Checkpoint Branch。 |
| NRR-E-003 | Execute | Debug 操作不得改变 Release 或历史 RunSnapshot。 |
| NRR-V-001 | Review | `outcome_unknown` 必须阻断副作用下游并打开 RecoveryCase。 |

## 17. WaitRecord 与人工输入

| ID | 类型 | 需求 |
|---|---|---|
| WAI-C-001 | Create | Runtime 在等待输入、依赖、环境、审批、Timer 或 Event 时创建 WaitRecord。 |
| WAI-R-001 | Read | Waiting 页面显示所需字段、上下文、Deadline、影响、恢复和取消策略。 |
| WAI-U-001 | Update | 用户提交输入必须创建新的结构化 ValueRef，不改写原始输入。 |
| WAI-U-002 | Update | WaitRecord 只能转为 satisfied、expired 或 cancelled。 |
| WAI-D-001 | Delete | 活动 WaitRecord 不可删除；取消必须产生状态事件。 |
| WAI-E-001 | Execute | 提交输入前执行 Schema、敏感度和权限检查。 |
| WAI-E-002 | Execute | Deadline 到期后按 Policy 选择默认值、失败、跳过或人工处理，不静默继续。 |

## 18. Approval、Grant 与 Policy Decision

### 18.1 ApprovalRequest

| ID | 类型 | 需求 |
|---|---|---|
| APR-C-001 | Create | 策略要求时创建 ApprovalRequest，包含 Before/After、资源、调用链、期限和风险。 |
| APR-R-001 | Read | Approval Inbox 支持 Global、Workspace、Run 和 Principal 筛选。 |
| APR-R-002 | Read | 详情显示最小授权、备选收紧方案、不可逆影响和数据敏感度。 |
| APR-U-001 | Update | Approver 可以允许一次、允许有界范围、拒绝或要求修改。 |
| APR-U-002 | Update | 请求方可以 Withdraw 未决请求。 |
| APR-D-001 | Delete | ApprovalRequest 不删除，终态为 approved/denied/expired/withdrawn。 |
| APR-E-001 | Execute | 禁止批量批准不同资源和风险的请求。 |

### 18.2 ApprovalGrant

| ID | 类型 | 需求 |
|---|---|---|
| GRT-C-001 | Create | Approved Request 产生绑定精确资源、动作、期限、主体和摘要的 Grant。 |
| GRT-R-001 | Read | 用户可以查看 Grant 的范围、来源、使用次数、消费者和到期。 |
| GRT-U-001 | Update | Grant 不允许扩大；扩大必须创建新 ApprovalRequest。 |
| GRT-D-001 | Delete | Owner/Approver 可以 Revoke Grant，并查看受影响 Run。 |
| GRT-E-001 | Execute | Grant consume、expire 和 revoke 必须产生审计事件。 |

### 18.3 Policy

| ID | 类型 | 需求 |
|---|---|---|
| PLC-C-001 | Create | 用户可以创建 Workspace Policy 和 AuthorityProfile 版本。 |
| PLC-R-001 | Read | Policy 页面展示规则、继承、最终交集和 deny 原因。 |
| PLC-R-002 | Read | Policy Simulator 可输入 Node、Entrypoint、Resource 和 Profile 查看 Decision。 |
| PLC-U-001 | Update | 修改 Policy 创建新版本；活动 Run 继续使用 Snapshot。 |
| PLC-D-001 | Delete | 被引用 Policy 只能 Archive，不能删除历史。 |

## 19. Recovery 与副作用需求

| ID | 类型 | 需求 |
|---|---|---|
| RCV-C-001 | Create | ExecutionHandle lost、cancel_pending、orphaned 或 outcome_unknown 时创建 RecoveryCase。 |
| RCV-R-001 | Read | Recovery Center 展示动作、资源、Handle、证据、对账尝试、风险和被阻断下游。 |
| RCV-U-001 | Update | 用户可以继续对账、声明已成功/失败、请求补偿或前向修复。 |
| RCV-U-002 | Update | 每个 Resolution 必须记录依据、Principal、Evidence 和影响。 |
| RCV-D-001 | Delete | 未解决 RecoveryCase 不可删除；解决后可归档但保留审计。 |
| RCV-E-001 | Execute | 高风险副作用在 outcome_unknown 时默认禁止自动重试。 |
| RCV-E-002 | Execute | 补偿是新的受控动作，不得伪装成回滚已经发生的现实世界事实。 |
| RCV-V-001 | Review | 系统必须区分 idempotent、safe_to_retry、needs_reconciliation、manual_only、forward_repair_only 和 non_compensable。 |

## 20. Cross-Canvas 调用需求

| ID | 类型 | 需求 |
|---|---|---|
| XCV-C-001 | Create | Canvas Call 必须引用目标 Canvas、Entrypoint、Version Constraint 和 Input/Output Mapping。 |
| XCV-C-002 | Create | 支持 call_and_wait 与 fire_and_continue，并明确 Ownership。 |
| XCV-R-001 | Read | Cross-Canvas Trace 展示 Parent/Child Run、Invocation、Delivery、映射和状态。 |
| XCV-R-002 | Read | 支持从父节点跳转子 Run，从子 Run 返回调用点。 |
| XCV-U-001 | Update | 修改调用目标必须通过 GraphPatch 和兼容性检查。 |
| XCV-D-001 | Delete | 删除被调用 Entrypoint/Release 前必须展示所有调用方并阻止悬空引用。 |
| XCV-E-001 | Execute | 至少一次投递必须用 deliveryId/idempotencyKey 去重，只创建一个子 Run。 |
| XCV-E-002 | Execute | 父 Run 断线后必须从持久 Invocation 恢复等待结果。 |
| XCV-E-003 | Execute | 跨 Workspace 调用必须经过目标 Workspace 权限和数据导出审批。 |
| XCV-V-001 | Review | 静态检测直接循环，运行时限制动态调用深度、重复链和预算。 |

## 21. Artifact、Evidence、Value 与 Lineage

### 21.1 Artifact

| ID | 类型 | 需求 |
|---|---|---|
| ART-C-001 | Create | 节点、用户导入或系统生成内容时登记 Artifact，不只保存裸文件路径。 |
| ART-C-002 | Create | Artifact 必须包含类型、Digest、敏感度、来源、Retention 和存储引用。 |
| ART-R-001 | Read | Artifact Browser 支持 Workspace、Run、Node、类型、敏感度和时间筛选。 |
| ART-R-002 | Read | 详情展示预览、Revision、Lineage、Evidence、消费者和导出历史。 |
| ART-U-001 | Update | 内容变化创建新 ArtifactRevision；元数据修改保留审计。 |
| ART-D-001 | Delete | 删除前展示 Run、Release、Evidence、Skill 和外部交付引用。 |
| ART-D-002 | Delete | 仍被引用的 Artifact 不得物理删除，可转为受限/归档。 |
| ART-E-001 | Execute | 下载、复制、发送和导出必须经过 Data Export Policy。 |

### 21.2 Evidence

| ID | 类型 | 需求 |
|---|---|---|
| EVD-C-001 | Create | Observation/Verification 产生 Evidence，记录来源、时间、方法和 Digest。 |
| EVD-R-001 | Read | 用户可以从验证结论反查 Evidence、NodeRun、输入和工具版本。 |
| EVD-U-001 | Update | Evidence 内容不可修改；纠正必须创建新 Evidence 并声明 supersedes。 |
| EVD-D-001 | Delete | 审计和成功结论引用的 Evidence 按政策保留，不允许普通删除。 |

### 21.3 ValueRef / Lineage

| ID | 类型 | 需求 |
|---|---|---|
| VALR-C-001 | Create | Runtime 对端口值创建 ValueRef，并记录 Schema、Storage、Sensitivity 和 Lineage。 |
| VALR-R-001 | Read | Dataflow Inspector 展示映射前后摘要、生产者、消费者和敏感传播。 |
| VALR-U-001 | Update | ValueRef 不修改；转换产生新 ValueRef 和 Lineage Edge。 |
| VALR-D-001 | Delete | 值内容按 Retention 清理时保留最小 Digest、Schema 和 Lineage 元数据。 |

## 22. Files、Context 与数据来源

### 22.1 Files

| ID | 类型 | 需求 |
|---|---|---|
| FIL-C-001 | Create | 用户可以在授权 Workspace 内创建文件或目录，默认禁止工作区外写入。 |
| FIL-R-001 | Read | Files 页面展示目录、变化、引用、锁、敏感度和权限状态。 |
| FIL-U-001 | Update | 重命名、移动和编辑必须更新引用或返回影响冲突。 |
| FIL-D-001 | Delete | 删除文件前检查 Artifact、Context、Node 和活动 Run 引用。 |
| FIL-D-002 | Delete | 高风险删除优先进入可恢复 Trash；永久删除单独确认。 |
| FIL-E-001 | Execute | 文件写入节点使用临时文件 + 原子提交或幂等键。 |

### 22.2 Context Source

| ID | 类型 | 需求 |
|---|---|---|
| CTX-C-001 | Create | 用户可以添加文件、网页、Artifact、记忆、Run 或手工文本为 Context Source。 |
| CTX-R-001 | Read | Context Manager 展示来源、信任、新鲜度、敏感度、作用域和消费者。 |
| CTX-U-001 | Update | 用户可以限制范围、刷新来源、固定版本和修改信任标记。 |
| CTX-D-001 | Delete | 移除 Context 只解除未来引用，不改写历史 RunSnapshot。 |
| CTX-E-001 | Execute | Agent Composer 附件必须创建结构化引用，不能只把路径拼入 Prompt。 |

## 23. Environment 与 Execution Context

### 23.1 Environment

| ID | 类型 | 需求 |
|---|---|---|
| ENV-C-001 | Create | 用户可以发现、创建或导入 LocalRestricted、Container、Remote 等环境定义。 |
| ENV-C-002 | Create | 安装依赖必须明确来源、版本、网络、磁盘、脚本和审批。 |
| ENV-R-001 | Read | Environments 页面展示类型、健康、依赖、使用者、权限和最近执行。 |
| ENV-R-002 | Read | 支持扫描环境并比较期望与实际依赖。 |
| ENV-U-001 | Update | 用户可以刷新、修复、升级、重命名和修改资源限制。 |
| ENV-U-002 | Update | 已绑定活动 Run 的环境变化不得修改 RunSnapshot。 |
| ENV-D-001 | Delete | 删除前展示活动 Context、Run、缓存、依赖和磁盘影响。 |
| ENV-D-002 | Delete | 环境删除失败必须进入清理 Job，不显示已删除。 |
| ENV-E-001 | Execute | 提供 Health Check 和最小权限 Test Run。 |

### 23.2 ExecutionContext

| ID | 类型 | 需求 |
|---|---|---|
| EXC-C-001 | Create | Runtime 根据版本化 Environment 和 Authority 创建 ExecutionContext。 |
| EXC-R-001 | Read | 详情展示 Mount、Network、Limits、SecretRef、Process、Health 和租约。 |
| EXC-U-001 | Update | 活动 Context 只允许收紧或生命周期变化；扩大创建新版本并审批。 |
| EXC-D-001 | Delete | Context 使用 release/released，不直接删除活动资源。 |
| EXC-E-001 | Execute | 用户可以 Stop、Quarantine、Cleanup 和 Reconcile Context。 |

## 24. Authority、Budget 与 Secret

### 24.1 AuthorityProfile

| ID | 类型 | 需求 |
|---|---|---|
| AUT-C-001 | Create | 用户可以从 Restricted 模板创建 AuthorityProfile。 |
| AUT-R-001 | Read | 页面分维度展示 filesystem/process/network/secret/environment/delegation/export/background。 |
| AUT-U-001 | Update | 修改创建新版本；权限扩大必须重新审批和影响分析。 |
| AUT-D-001 | Delete | 被 RunSnapshot 引用的 Profile 只能 Archive/Revoke。 |
| AUT-V-001 | Review | 禁止使用单一 `fullAccess: true` 代替结构化权限。 |

### 24.2 Budget

| ID | 类型 | 需求 |
|---|---|---|
| BGT-C-001 | Create | 用户可以创建 Global、Workspace、Goal、Run 和 Agent Budget。 |
| BGT-R-001 | Read | Usage 页面展示费用、时间、Token、并发、存储、网络和外部调用归因。 |
| BGT-U-001 | Update | 用户可以收紧上限；扩大需要策略评估和可能的审批。 |
| BGT-D-001 | Delete | 活动对象的 Budget 不能删除，只能替换或终止对象。 |
| BGT-E-001 | Execute | 达到阈值时告警，达到硬上限时按策略等待、停止或审批。 |

### 24.3 SecretRef

| ID | 类型 | 需求 |
|---|---|---|
| SEC-C-001 | Create | 用户可以添加 Secret，并指定 Purpose、Consumer Scope 和存储 Provider。 |
| SEC-R-001 | Read | UI 只显示名称、版本、用途、消费者、到期和健康，不显示明文。 |
| SEC-U-001 | Update | 修改 Secret 必须 Rotate 新版本，并显示受影响绑定。 |
| SEC-D-001 | Delete | 用户可以 Revoke Secret；历史 Run 只保留 Ref 和使用事实。 |
| SEC-E-001 | Execute | 提供连接测试，但日志和错误不得泄露 Secret。 |

## 25. Capability、Provider 与 Agent

### 25.1 Capability

| ID | 类型 | 需求 |
|---|---|---|
| CAP-C-001 | Create | 系统可以从 Builtin、Extension、Workspace 或 Agent 探索注册 Capability。 |
| CAP-R-001 | Read | Catalog 展示版本、Provider、Trust、Contract、权限、环境和健康。 |
| CAP-U-001 | Update | Capability 变化创建新版本；Trust Level 变化必须记录证据。 |
| CAP-D-001 | Delete | 已引用版本只能 Disable/Deprecate，不破坏历史 Snapshot。 |
| CAP-E-001 | Execute | 支持安全探测、合同测试和最小权限验证。 |

### 25.2 Model / Provider

| ID | 类型 | 需求 |
|---|---|---|
| PRV-C-001 | Create | 用户可以连接模型或服务 Provider，配置 Endpoint、Credential Ref 和数据边界。 |
| PRV-R-001 | Read | 页面展示模型、能力、Context 限制、价格、健康和数据策略。 |
| PRV-U-001 | Update | 用户可修改路由、限额、默认模型和允许的 Workspace。 |
| PRV-D-001 | Delete | 断开 Provider 必须撤销凭据绑定并展示受影响 Agent/Automation。 |
| PRV-E-001 | Execute | 提供脱敏连接测试和模型能力探测。 |
| PRV-E-002 | Execute | 云端或本地模型只能通过 Provider Gateway 接收按 Workspace、AuthorityProfile 和 Data Export Boundary 过滤的 ContextPacket。 |
| PRV-E-003 | Execute | 模型返回的 Plan、GraphPatch、RunPatch 和 CommandRequest 必须通过 Schema、版本、Graph、Policy 和 Budget 校验后才能进入 Host。 |
| PRV-R-002 | Read | 每次模型调用必须显示 Provider、Model、发送的数据类别、Token/成本、数据保留策略和关联 AgentInvocation。 |
| PRV-P-001 | Approve | 首次向 Provider 发送文件内容、日志、Prompt Trace、Artifact 或敏感上下文前，必须按策略明确授权；授权不得自动扩大到其他 Workspace。 |

### 25.3 Agent Connection

| ID | 类型 | 需求 |
|---|---|---|
| AGT-C-001 | Create | 用户可以连接内部或外部 Agent，定义身份、能力、协议和 Authority Ceiling。 |
| AGT-R-001 | Read | Agents 页面展示在线、信任、能力、当前任务、预算和最近错误。 |
| AGT-U-001 | Update | 用户可以启停、限权、调整预算和 Workspace 范围。 |
| AGT-D-001 | Delete | Revoke Agent 必须终止新委派，并处理活动任务和凭据。 |
| AGT-E-001 | Execute | 委派必须创建结构化任务、相关 ID、取消策略和验证要求。 |
| AGT-V-001 | Review | 外部 Agent 返回自然语言不能直接成为系统事实或 Graph 修改。 |
| AGT-E-002 | Execute | 用户可以在 Composer 中用自然语言请求完整任务；本地 Agent Runtime 将其转换为 Goal、Plan、GraphPatch、Revision、StartRun 和验证循环。 |
| AGT-E-003 | Execute | 在 AuthorityProfile、Budget 和成功标准允许时，Agent 可以自动执行建图、运行、测试、读取失败、调试、修复和重试，无需用户逐节点确认。 |
| AGT-E-004 | Execute | 权限扩大、工作区外路径、网络、Secret、环境安装、外部主体、不可逆副作用或成功标准变化必须暂停自动循环并请求审批。 |
| AGT-O-001 | Observe | Agent 每轮必须保存结构化 InvocationEvent、使用的 ContextRef、模型调用、提案、命令回执、Observation、Evidence、成本和停止原因。 |
| AGT-K-001 | Control | 用户可以随时暂停、继续、修改目标、限制预算、接管或终止 AgentInvocation；终止 Agent 不等于外部动作已取消。 |

## 26. Extension 与 Node Definition

### 26.1 Extension

| ID | 类型 | 需求 |
|---|---|---|
| EXT-C-001 | Create | 用户可以从受信来源安装 Extension，并预览 Manifest、签名、权限和执行器。 |
| EXT-R-001 | Read | Extensions 页面展示版本、Publisher、权限、健康、更新和使用对象。 |
| EXT-R-002 | Read | `View permissions`、文档和诊断是独立操作，不覆盖彼此通知。 |
| EXT-U-001 | Update | 用户可以启停 Extension；禁用后新 Run 不得解析其 Definition。 |
| EXT-U-002 | Update | 更新前比较 Manifest、权限、Schema、迁移和调用方兼容性。 |
| EXT-D-001 | Delete | 卸载前展示 Canvas、Release、Automation、Environment 和历史 Snapshot 影响。 |
| EXT-D-002 | Delete | 历史 Run 所需 Manifest/Definition 摘要必须保留。 |
| EXT-E-001 | Execute | Extension 健康检查和测试在受限 Context 中执行。 |

### 26.2 NodeDefinition

| ID | 类型 | 需求 |
|---|---|---|
| NDF-C-001 | Create | Node Definition Studio 支持创建 Schema、Ports、Config、Executor、权限和测试夹具。 |
| NDF-R-001 | Read | Catalog 展示版本、来源、兼容性、权限、副作用和合同测试状态。 |
| NDF-U-001 | Update | Definition 内容变化必须发布新 SemVer 版本。 |
| NDF-U-002 | Update | Breaking Change 必须提供迁移器或明确阻止自动升级。 |
| NDF-D-001 | Delete | 已引用 Definition 只能 Deprecate/Withdraw，不物理删除。 |
| NDF-E-001 | Execute | 发布前必须通过状态、取消、权限、幂等、Lineage 和组合图测试。 |

## 27. Automation 需求

| ID | 类型 | 需求 |
|---|---|---|
| ATM-C-001 | Create | 用户可以创建 Schedule/Event Automation，指定 Release、Entrypoint、输入、Authority 和 Budget。 |
| ATM-C-002 | Create | 创建前必须预览下一次运行、时区、并发、重叠和失败策略。 |
| ATM-R-001 | Read | Automation 页面展示状态、Schedule、目标、Next Run、Last Run 和失败摘要。 |
| ATM-R-002 | Read | 支持查看每次触发、去重、Run 和通知历史。 |
| ATM-U-001 | Update | 用户可以修改名称、Schedule、输入、目标、启用状态和通知策略。 |
| ATM-U-002 | Update | 修改目标 Release/Entrypoint 必须重新兼容和权限检查。 |
| ATM-D-001 | Delete | 删除停止未来触发，不删除历史 Run。 |
| ATM-E-001 | Execute | `Run Now` 创建普通可审计 Run，不能绕过 Authority 和 Budget。 |
| ATM-E-002 | Execute | 重叠策略支持 reject/queue/allow，并在 UI 明确展示。 |

## 28. Memory 与 Skill 需求

| ID | 类型 | 需求 |
|---|---|---|
| MEM-C-001 | Create | 系统可以从验证成功的 Run 提议 Memory，必须记录来源和敏感度。 |
| MEM-R-001 | Read | Memory 页面展示内容摘要、来源、置信、消费者和过期。 |
| MEM-U-001 | Update | 修改 Memory 创建新版本，保留 supersedes 关系。 |
| MEM-D-001 | Delete | 用户可以 Archive/Delete 非审计 Memory，并查看使用影响。 |
| SKL-C-001 | Create | Memory 提升为 Skill 前必须脱敏、定义接口、权限、测试和回归样本。 |
| SKL-R-001 | Read | Skill 页面展示版本、能力、权限、评测、来源和适用范围。 |
| SKL-U-001 | Update | Skill 变化发布新版本，不覆盖旧版本。 |
| SKL-D-001 | Delete | 已发布 Skill 使用 Deprecate/Withdraw；历史 Run 可追溯。 |
| SKL-E-001 | Execute | Skill 发布和自动应用必须经过回归、权限和数据边界检查。 |

## 29. Notification 与 Attention Center

详细要求见 [Notification & Attention Center PRD](26-ui-system/03-notification-attention-center-prd.md)。全系统最低要求如下：

| ID | 类型 | 需求 |
|---|---|---|
| NOT-C-001 | Create | 每条领域通知使用独立 notificationId，不允许新内容覆盖旧消息。 |
| NOT-R-001 | Read | Notification Center 支持类型、严重度、Workspace、状态和时间筛选。 |
| NOT-U-001 | Update | 用户可 Read、Acknowledge、Mute 或 Dismiss Delivery，不能直接 Resolve 来源事实。 |
| NOT-D-001 | Delete | 未解决 Action Required 不得 Clear；已解决历史按 Retention 清理。 |
| NOT-E-001 | Execute | Toast 独立计时、最多显示 4 条，普通 5 秒、完成 7 秒、权限 8 秒。 |
| NOT-E-002 | Execute | Error、Approval、Recovery 默认不自动关闭。 |
| NOT-E-003 | Execute | 关闭 Toast 不清除 Approval、WaitRecord、Run Error 或 RecoveryCase。 |

## 30. Audit 与 Event Explorer

| ID | 类型 | 需求 |
|---|---|---|
| AUD-C-001 | Create | 所有 Command、Decision、Patch、状态转移、Grant、导出和危险操作追加 AuditEvent。 |
| AUD-R-001 | Read | Event Explorer 支持按游标、聚合、主体、对象、命令、事件和时间筛选。 |
| AUD-R-002 | Read | 用户可以从 Audit 跳转关联 Command、Event、Run、Patch、Approval 和 Artifact。 |
| AUD-R-003 | Read | 导出包含 Schema Version、Digest、Lineage 和脱敏预览。 |
| AUD-U-001 | Update | AuditEvent 不允许修改；纠正通过追加 Correction Event。 |
| AUD-D-001 | Delete | 审计记录按合规 Retention 管理，普通用户不能删除。 |
| AUD-V-001 | Review | 提供链完整性和投影重建验证。 |

## 31. Search 与 Command Palette

| ID | 类型 | 需求 |
|---|---|---|
| SRC-R-001 | Read | 全局搜索支持 Workspace、Goal、Canvas、Node、Run、Artifact、Approval 和 Setting。 |
| SRC-R-002 | Read | 同名对象必须显示类型、Workspace、状态和稳定 ID 摘要。 |
| SRC-R-003 | Read | 搜索遵守权限，不泄露无权对象名称和摘要。 |
| CMD-C-001 | Create | Command Palette 只能构造结构化 Command，并显示作用域和影响。 |
| CMD-E-001 | Execute | 危险命令必须进入确认/审批，不得因快捷键绕过。 |
| CMD-R-001 | Read | 用户可查看最近命令和结果，但历史不能包含 Secret 明文。 |

## 32. Template、Preset 与导入导出

### 32.1 Template / Preset

| ID | 类型 | 需求 |
|---|---|---|
| TPL-C-001 | Create | 用户可以从 Canvas Revision 创建 Template，剥离 Workspace 特定 Secret 和路径。 |
| TPL-R-001 | Read | Template Catalog 展示版本、依赖、权限、兼容性和来源。 |
| TPL-U-001 | Update | 修改 Template 创建新版本；Preset 可更新默认输入和 Authority 引用。 |
| TPL-D-001 | Delete | 私有未引用 Template 可删除；已发布版本只能 Archive/Withdraw。 |
| TPL-E-001 | Execute | 应用 Template 时重新解析 Definition、Capability、Environment 和 Secret。 |

### 32.2 Import / Export

| ID | 类型 | 需求 |
|---|---|---|
| IMP-C-001 | Create | 导入前解析 Manifest、Schema、版本、依赖、签名和冲突，不直接写入。 |
| IMP-R-001 | Read | 用户可以预览将创建/覆盖/跳过的对象和权限需求。 |
| IMP-E-001 | Execute | 导入采用事务或可恢复 Job，失败不得留下半导入活动对象。 |
| EXP-C-001 | Create | 导出必须选择范围、格式、目标、敏感数据、Retention 和加密。 |
| EXP-R-001 | Read | Data Export Review 展示即将离开 Workspace/设备的数据和脱敏结果。 |
| EXP-E-001 | Execute | 导出受 DataExportBoundary 和 Approval 约束，并记录交付 Receipt。 |
| EXP-D-001 | Delete | 用户可以撤回仍可撤回的共享交付；已下载事实不能伪装成已撤回。 |

## 33. Settings 需求

| ID | 类型 | 需求 |
|---|---|---|
| SET-C-001 | Create | 首次运行创建带版本号的默认 Settings。 |
| SET-R-001 | Read | Settings 页面分 General、Notifications、Execution、Privacy、Models、Updates、Shortcuts。 |
| SET-U-001 | Update | 修改立即或明确保存生效，并显示 Global/Workspace 继承来源。 |
| SET-U-002 | Update | 涉及执行、隐私、遥测、系统通知和后台运行的设置必须说明影响。 |
| SET-D-001 | Delete | Reset 恢复默认值，不删除 Workspace 领域数据。 |
| SET-E-001 | Execute | 支持导入/导出非敏感设置，Secret 和设备凭据不得导出。 |

## 34. Host Health 与 Background Jobs

### 34.1 Host/System Health

| ID | 类型 | 需求 |
|---|---|---|
| HST-R-001 | Read | Health 页面展示 Host、Worker、数据库、事件日志、投影、更新和磁盘状态。 |
| HST-R-002 | Read | 每项显示最近心跳、版本、错误、影响对象和建议动作。 |
| HST-U-001 | Update | 用户可以重连、重启受控组件、切换只读恢复和调整日志级别。 |
| HST-E-001 | Execute | 生成 Support Bundle 前必须预览脱敏内容和范围。 |
| HST-D-001 | Delete | 清理缓存/日志前返回影响和可恢复性，不清理审计关键数据。 |

### 34.2 BackgroundJob

| ID | 类型 | 需求 |
|---|---|---|
| JOB-C-001 | Create | 备份、迁移、扫描、安装、GC、索引和导出使用 BackgroundJob。 |
| JOB-R-001 | Read | Task Queue 展示类型、范围、进度、优先级、资源、重试和暂停原因。 |
| JOB-U-001 | Update | 用户可在允许时调整优先级、暂停、恢复和重试。 |
| JOB-D-001 | Delete | Cancel 必须区分 requested、confirmed 和 outcome_unknown。 |
| JOB-E-001 | Execute | 重启后 Job 必须从持久 Checkpoint 恢复或进入 Recovery。 |

## 35. Retention、Backup 与 Migration

### 35.1 Retention / Storage

| ID | 类型 | 需求 |
|---|---|---|
| RET-C-001 | Create | 用户可以创建 Workspace 级 Retention Policy。 |
| RET-R-001 | Read | Storage 页面展示对象类型占用、保留期、引用和 GC 候选。 |
| RET-U-001 | Update | 修改 Policy 先 Dry Run，展示将删除/归档的数据。 |
| RET-D-001 | Delete | 执行 GC 必须跳过活动引用、审计保留和 Legal Hold。 |
| RET-E-001 | Execute | GC 产生可审计报告和失败重试 Job。 |

### 35.2 Backup / Restore

| ID | 类型 | 需求 |
|---|---|---|
| BAK-C-001 | Create | 用户可以创建加密 Backup，选择 Workspace、配置、Artifacts 和 Secrets Metadata。 |
| BAK-R-001 | Read | Backup 页面展示时间、范围、大小、加密、版本和验证状态。 |
| BAK-U-001 | Update | Backup 内容不可修改；策略和 Schedule 可修改。 |
| BAK-D-001 | Delete | 删除 Backup 前确认最后恢复点和保留策略。 |
| BAK-E-001 | Execute | Restore 必须先预检版本、路径、冲突、权限和磁盘空间。 |
| BAK-V-001 | Review | 定期验证 Backup 可读取，不只显示文件存在。 |

### 35.3 Migration

| ID | 类型 | 需求 |
|---|---|---|
| MIG-C-001 | Create | 协议、数据库、Canvas、Extension 或 Definition 变化创建 MigrationJob。 |
| MIG-R-001 | Read | Migration Center 展示来源/目标版本、对象、风险、进度和阻塞。 |
| MIG-U-001 | Update | 用户可以继续、重试、跳过非关键项或进入只读模式。 |
| MIG-D-001 | Delete | Migration 记录不删除；失败可回滚到明确 Checkpoint。 |
| MIG-E-001 | Execute | 迁移前 Backup 和 Preflight 必须通过；失败不能静默转换后继续运行。 |

## 36. Diagnostics 与 Support Bundle

| ID | 类型 | 需求 |
|---|---|---|
| DIA-C-001 | Create | 用户可以生成诊断包，选择时间、Workspace、组件和日志级别。 |
| DIA-R-001 | Read | 生成前预览包含的系统信息、事件摘要、路径和脱敏结果。 |
| DIA-U-001 | Update | 用户可以移除单个文件或字段后重新生成。 |
| DIA-D-001 | Delete | 临时诊断包按短期 Retention 自动删除，支持手动清理。 |
| DIA-E-001 | Execute | 导出诊断包必须经过 Data Export Review，不自动上传。 |

## 37. 正式产品前端需求

本节专门约束“按照 UI 原型搭建真正前端”的工程交付。它与 UI Lab 的视觉完成度分开验收；UI 原型完成不能抵扣本节的生产实现。

### 37.1 应用、路由与功能模块

| ID | 类型 | 需求 |
|---|---|---|
| FNT-C-001 | Create | 创建独立的正式前端应用入口（推荐 `apps/workbench`），拥有独立构建、环境配置、错误边界和发布产物。 |
| FNT-C-002 | Create | 按 Workspace、Canvas、Run、Approval、Recovery、Artifact、Environment、Extension、Automation、Settings 拆分功能模块；页面不得继续依赖单体 UI Lab `App.tsx`。 |
| FNT-R-001 | Read | 使用类型化路由和稳定 ID 深链接，至少支持 Workspace、Canvas、Revision、Release、Run、NodeRun、Approval、Artifact 和 RecoveryCase；刷新或重新打开窗口后必须恢复目标上下文。 |
| FNT-R-002 | Read | 路由解析必须检查对象是否存在、是否可访问、是否已归档、是否属于当前 Workspace，并为不存在、无权限和版本过期分别显示状态。 |
| FNT-U-001 | Update | 页面标题、面包屑、侧栏选中项和返回路径随路由同步更新，不得只依赖 React 内存状态。 |
| FNT-D-001 | Delete | 清除本地路由缓存、筛选和最近记录时不得删除 Host 中的领域对象；退出 Workspace 必须先处理未提交 Draft。 |

### 37.2 Host/API、查询与命令

| ID | 类型 | 需求 |
|---|---|---|
| FNT-E-001 | Execute | 正式前端必须通过统一 `HostClient` 调用 Query、Command、Event；不得直接访问 SQLite、文件系统、Worker、Executor 或内部 IPC 实现。 |
| FNT-E-002 | Execute | Mock Adapter 与真实 IPC/HTTP/Host Adapter 必须实现同一接口和 Schema；`startRun` 至少包含 Revision/Release、Entrypoint、GoalVersion、输入、ExecutionContext、AuthorityContext 和幂等键。 |
| FNT-R-003 | Read | Query 支持快照版本、事件游标、分页/游标、筛选、排序和字段投影；列表滚动不得把全量历史一次性加载到 DOM。 |
| FNT-U-002 | Update | 所有写操作使用带 `commandId`、`causationId`、`expectedVersion` 和幂等键的结构化 Command，并显示 pending、accepted、approval_required、conflict、failed 或 completed。 |
| FNT-R-004 | Read | 命令回执只能说明 Host 是否接受命令；最终状态必须等待 Event/Query 投影确认，禁止用按钮成功动画冒充运行成功。 |
| FNT-D-002 | Delete | 取消、删除、归档和撤回操作必须使用服务端 `ImpactAnalysis` 和权限结果；前端不得依据当前列表自行推断依赖。 |

### 37.3 状态、草稿与图编辑

| ID | 类型 | 需求 |
|---|---|---|
| FNT-U-003 | Update | 按 Domain Facts、Draft、Command、View、Debug 五层保存状态；领域事实不得写入任意组件 local state。 |
| FNT-U-004 | Update | Canvas 图编辑在本地 Draft 中进行，支持脏状态、自动保存、显式保存、版本冲突、重新载入、三方合并和放弃本地修改。 |
| FNT-U-005 | Update | 节点拖拽、端口连接、删除、批量移动和属性编辑必须转换为类型化 GraphCommand/GraphPatch，并展示验证结果和影响范围。 |
| FNT-R-005 | Read | Graph Renderer 只消费 Renderer Graph 投影；必须支持大量节点、端口、边、折叠分组、虚拟化和缩放，不因极端连接数破坏布局。 |
| FNT-D-003 | Delete | 删除节点、边、Entrypoint、Trigger 或 Canvas 前显示引用、运行、等待、子画布调用和权限影响；存在阻塞引用时禁止静默删除。 |
| FNT-E-003 | Execute | 保存 Draft、创建 Revision、发布 Release、撤回 Release 和应用 GraphPatch 必须显示命令生命周期及最终 Host 结果。 |

### 37.4 运行、事件与恢复

| ID | 类型 | 需求 |
|---|---|---|
| FNT-E-004 | Execute | Run Launch 必须选择可运行的 Release 或明确的 Debug Revision、Entrypoint、输入、权限上下文和执行模式；无默认入口或验证错误时禁止启动。 |
| FNT-R-006 | Read | Run Monitor 展示 Run、NodeRun、Attempt、状态原因、日志、Artifact、Approval、Wait、Recovery 和跨画布调用，并区分实时、陈旧和未知结果。 |
| FNT-E-005 | Execute | 前端启动事件订阅并保存最后确认的 Cursor；断线后进入 stale/offline 状态，重连时先快照重同步再应用增量事件，并按 Event ID 去重。 |
| FNT-U-006 | Update | 用户可以暂停、恢复、取消、重试、对账和提交人工输入；界面根据状态机禁用非法动作，并标识取消待确认、结果未知和需要人工处理。 |
| FNT-R-007 | Read | Recovery 页面提供 EffectReceipt、Reconciliation、Compensation、ManualResolution 和审计时间线，不把 `outcome_unknown` 显示为普通失败。 |
| FNT-D-004 | Delete | 关闭窗口、清除本地缓存或删除通知不得取消后台 Run、删除事件游标或抹除审计事实。 |

### 37.5 权限、错误、桌面和质量

| ID | 类型 | 需求 |
|---|---|---|
| FNT-R-008 | Read | 导航、按钮、表单字段和危险操作根据 AuthorityProfile、Policy Decision、ApprovalGrant 和对象状态显示 allow、deny、approval required 或 unavailable 原因。 |
| FNT-E-006 | Execute | 所有页面具备统一 Error Boundary 和结构化错误视图，覆盖网络断开、权限不足、版本冲突、Schema 不兼容、Host 崩溃和恢复失败，并提供可执行下一步。 |
| FNT-U-007 | Update | 表单使用正式 Schema 驱动校验，区分客户端格式错误与服务端业务拒绝；错误必须定位到字段、节点、边或命令。 |
| FNT-C-003 | Create | 建立桌面壳适配层（采用 Tauri 时为 `src-tauri`），提供窗口、文件选择、系统通知、深链接和后台生命周期接口。 |
| FNT-E-007 | Execute | 用户关闭窗口、锁屏、休眠或切换 Workspace 时，前端必须显示后台 Run 策略、未保存 Draft 和待审批事项，不得隐式改变执行策略。 |
| FNT-U-008 | Update | 支持语言、主题、减少动效、减少透明度、键盘快捷键和高对比度；设置变化不改变领域语义。 |
| FNT-V-001 | Review | 正式前端必须有单元、组件、Adapter 集成、事件恢复、权限矩阵和真实 Host E2E 测试；UI Lab 手工演示不能作为唯一证据。 |
| FNT-V-002 | Review | 建立 UI Lab 与正式前端的视觉回归基线，覆盖 Light/Dark/高对比度、320px–1440px、滚动、弹层、节点极端连接数和通知层级。 |
| FNT-V-003 | Review | 通过键盘操作、焦点可见性、语义标签、屏幕阅读器、缩放和 reduced-motion 验收。 |
| FNT-V-004 | Review | 对图、日志、Artifact、通知和长列表做性能预算、虚拟化、取消请求和内存泄漏测试。 |
| FNT-V-005 | Review | 生产构建、版本注入、CSP/安全链接、敏感字段脱敏、崩溃诊断、更新/回滚和发布清单必须自动化。 |

## 38. 通用页面状态需求

每一个列表、详情、抽屉和 Inspector 都必须实现：

| ID | 状态 | 需求 |
|---|---|---|
| UST-001 | Loading | 保留稳定布局，显示正在加载的作用域和快照。 |
| UST-002 | Empty | 说明缺少哪类事实，并提供当前权限允许的首个动作。 |
| UST-003 | Partial | 明确哪些区域不可用，不把部分数据表现为完整。 |
| UST-004 | Offline | 显示最后确认时间和游标，区分缓存事实与未发送命令。 |
| UST-005 | Permission denied | 显示被拒资源、原因和最小权限申请路径。 |
| UST-006 | Conflict | 展示对象版本和可合并差异，不自动覆盖。 |
| UST-007 | Unsupported | 显示协议、Extension、Definition 或 Executor 不兼容及升级路径。 |
| UST-008 | Corrupt | 进入只读恢复，提供 Backup、Migration 和 Diagnostics。 |
| UST-009 | Deleted | 展示删除时间、主体、可恢复性和替代入口。 |
| UST-010 | Resync needed | 暂停危险操作，重新加载 Snapshot 和增量游标。 |

## 39. 通用 CRUD 交互要求

### Create

| ID | 需求 |
|---|---|
| CRUD-C-001 | 表单必须说明对象作用域、默认值、权限、预算和将创建的关联对象。 |
| CRUD-C-002 | 提交必须使用幂等键，重复点击不得重复创建。 |
| CRUD-C-003 | 创建成功后使用服务端返回 ID 导航，不依赖名称查询。 |
| CRUD-C-004 | 创建失败保留用户输入，并展示字段错误和重试条件。 |

### Read

| ID | 需求 |
|---|---|
| CRUD-R-001 | 列表支持分页/虚拟化、筛选、排序、搜索和刷新。 |
| CRUD-R-002 | 展示快照时间、是否有更多数据和当前作用域。 |
| CRUD-R-003 | 敏感字段默认摘要，展开、复制和导出重新鉴权。 |
| CRUD-R-004 | 详情提供稳定 URL/对象上下文，不依赖当前侧边栏选择。 |

### Update

| ID | 需求 |
|---|---|
| CRUD-U-001 | 更新携带 expectedVersion，版本冲突返回结构化差异。 |
| CRUD-U-002 | 高风险更新先展示 Before/After、AuthorityDelta、BudgetDelta 和影响。 |
| CRUD-U-003 | Accepted 不等于完成；UI 订阅事实事件更新最终结果。 |
| CRUD-U-004 | 不可变对象的 Update 必须被转换为新版本或追加事件。 |

### Delete

| ID | 需求 |
|---|---|
| CRUD-D-001 | 删除按钮必须准确说明是 Archive、Revoke、Withdraw、Trash 还是 Permanent Delete。 |
| CRUD-D-002 | 删除前从服务端获取 ImpactAnalysis。 |
| CRUD-D-003 | 删除确认显示引用、活动运行、不可逆影响和恢复期限。 |
| CRUD-D-004 | 删除命令幂等，断线后可以查询真实结果。 |
| CRUD-D-005 | 删除失败或结果未知进入 Recovery，不得从 UI 列表直接消失。 |

## 40. 全局非功能需求

### 40.1 安全

| ID | 需求 |
|---|---|
| NFR-SEC-001 | 默认 deny，所有资源路径、网络目标和主体必须规范化后评估。 |
| NFR-SEC-002 | Agent 不得隐式扩大文件、网络、Secret、环境、预算或外部主体权限。 |
| NFR-SEC-003 | Secret、敏感 Value、完整外部响应不得进入普通日志和通知。 |
| NFR-SEC-004 | 数据离开 Workspace 或设备前必须经过 DataExportBoundary。 |
| NFR-SEC-005 | 每个危险动作必须可追溯 Principal、Command、Decision、Grant 和 Event。 |

### 40.2 可靠性与恢复

| ID | 需求 |
|---|---|
| NFR-REL-001 | Command、Event、Outbox、Inbox 和 Projection 支持幂等与至少一次投递。 |
| NFR-REL-002 | Workbench 断线重连支持 Cursor、Snapshot 和增量重同步。 |
| NFR-REL-003 | Host/Worker 崩溃后恢复 WaitRecord、Run、Handle 和 BackgroundJob。 |
| NFR-REL-004 | 外部副作用响应丢失必须先对账，不自动重试高风险动作。 |
| NFR-REL-005 | 所有终态不可原地恢复；重试和修复创建新 Attempt/Branch。 |

### 40.3 性能

| ID | 需求 |
|---|---|
| NFR-PERF-001 | 1000 节点图使用虚拟化、分层细节和增量布局。 |
| NFR-PERF-002 | 1000 端口节点不无限增高，完整列表进入虚拟化 Inspector。 |
| NFR-PERF-003 | 日志、Event、Artifact、Run 和 Notification 必须分页或流式加载。 |
| NFR-PERF-004 | 高频进度更新合并渲染，不阻塞主线程交互。 |
| NFR-PERF-005 | 普通点击在本地 UI 100ms 内提供 pending 反馈。 |

### 40.4 可访问性

| ID | 需求 |
|---|---|
| NFR-A11Y-001 | 全部核心流程支持键盘和读屏。 |
| NFR-A11Y-002 | 状态使用图标、文本和可访问名称，不只依赖颜色。 |
| NFR-A11Y-003 | 支持 200% 文本缩放，无重叠和横向溢出。 |
| NFR-A11Y-004 | 遵守 reduced-motion、reduced-transparency 和高对比度。 |
| NFR-A11Y-005 | 动态更新不得无故抢夺焦点。 |

### 40.5 隐私

| ID | 需求 |
|---|---|
| NFR-PRI-001 | 遥测默认关闭或显式选择，不记录内容数据。 |
| NFR-PRI-002 | 产品指标仅记录类型、状态、耗时区间和匿名技术信息。 |
| NFR-PRI-003 | Support Bundle、Export 和系统通知使用脱敏预览。 |

## 41. 端到端核心流程验收

### 41.1 新建并运行

1. 创建 Workspace 并选择目录。
2. 自动创建 CanvasIdentity 和 Draft。
3. 创建 Goal、Plan、Node、Edge 和 Default Entrypoint。
4. Graph Validation 通过。
5. 保存不可变 Revision。
6. Debug Run 使用 Revision。
7. 发布 Release。
8. StartRun 选择 Release、Entrypoint、Input、Authority 和 Budget。
9. 创建 RunSnapshot。
10. 执行 NodeRun/Attempt。
11. 生成 Artifact、Evidence 和 Lineage。
12. Verification 通过后 Run succeeded。
13. Notification 提醒完成，Run History 和 Artifact Browser 可追溯。

### 41.2 等待与恢复

1. NodeRun 进入 waiting_input。
2. 创建 WaitRecord 和 Action Required Notification。
3. 用户关闭应用。
4. Host 保留 Run 或按后台策略暂停。
5. 重新打开后通过 Snapshot/Cursor 恢复。
6. 用户提交结构化输入。
7. WaitRecord satisfied，Run 继续。

### 41.3 取消与结果未知

1. 用户提交 CancelRun。
2. Run 进入 cancelling。
3. 外部 Handle 失联，进入 cancel_pending/reconciling。
4. 创建 RecoveryCase。
5. 对账耗尽后进入 outcome_unknown。
6. 阻断副作用下游。
7. 用户查看证据并执行 Resolution/Compensation/Forward Repair。
8. Audit 保留完整链路。

### 41.4 Agent 修图

1. 用户向 Composer 提出变更。
2. Agent 读取结构化 Context。
3. Agent 提交 GraphPatch。
4. 系统计算 Impact、AuthorityDelta 和 BudgetDelta。
5. 用户在 Review 中批准或修改。
6. Patch 原子应用到 Draft。
7. Validation 通过并保存新 Revision。
8. 历史 Revision 和活动 Run 不被修改。

## 42. 开放阶段

### Internal Only

- Workspace、CanvasDraft、Revision、基础节点编辑。
- Mock/Restricted Run。
- 人工输入和审批节点。
- GraphPatch 人工确认。
- Notification、Run History 和基础 Artifact。

### Pilot

- LocalRestricted 真实执行器。
- 完整状态机、事件恢复和 Attention Center。
- Approval、Recovery、Environment、Policy 和 Audit。
- 受控 Extensions、Automations、Agents 和跨 Canvas 调用。

### Open

- 所有 P0/P1 页面形成命令—事件—恢复闭环。
- 安全、故障、恢复、迁移、备份和大数据验收通过。
- 能力标签和 README 与开放门禁矩阵一致。

## 43. 总体验收标准

系统只有满足以下要求才可认为达到完整产品设计：

1. 本文每个领域对象都有明确 Create、Read、Update、Delete/Archive 和权限边界。
2. 不可变对象没有被普通 CRUD 误实现为原地修改。
3. 所有危险删除和权限扩大都有服务端 ImpactAnalysis。
4. 所有执行命令都有幂等、状态、事件、断线和结果未知路径。
5. Workspace、Canvas、Run、NodeRun、Artifact、Approval 和 Recovery 可以稳定深链接。
6. UI 页面覆盖 Loading、Empty、Partial、Offline、Permission、Conflict、Unsupported、Corrupt 和 Resync。
7. Agent 只能提出结构化 Plan/Patch/Command，不能用自然语言直接改写事实。
8. Notification 不替代领域状态，Toast 关闭不删除待办事实。
9. Audit、Evidence、Lineage 和 RunSnapshot 可以还原关键决策与执行链。
10. 受限执行、权限审批、取消对账、事件恢复和数据导出通过端到端测试。
