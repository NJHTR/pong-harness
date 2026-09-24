# Seekwd / Pong Harness 交付任务与完成进度矩阵

> 文档类型：Product Delivery Roadmap / Work Breakdown Structure  
> 文档状态：Experimental Proposal  
> 原始估算日期：2026-09-20；第 2 节及下方任务表的百分比尚未逐条重估，不代表 2026-09-24 当前完成度。
> 仓库事实核对日期：2026-09-24（仅第 1.2 节及第 2.1 节）
> 适用分支：`dev`  
> 关联文档：[全系统 PRD](29-system-product-requirements.md) · [系统拆分与流程模型](31-system-decomposition-and-process-model.md) · [正式合同](27-normative-contracts/00-README.md) · [开放门禁](28-design-review/01-open-gate-matrix.md) · [当前实现状态](25-implementation-blueprint/15-current-implementation-status.md) · [需求证据台账](34-requirement-evidence-ledger.md)

## 1. 使用说明

本文将全系统拆成可排期的模块和单条任务，表格字段与项目管理表保持一致：

| 字段 | 含义 |
|---|---|
| 需求编号 | 稳定的功能/任务 ID，可用于 Issue、PR、测试用例和验收报告 |
| 一级功能 | 产品模块 |
| 二级功能 | 页面、服务或业务子模块 |
| 功能描述 | 本条任务必须交付的行为，不是泛泛的技术名词 |
| 符合比率 | 当前仓库代码对目标行为的实现比例；不把文档、类型或静态 Mock 单独算作正式实现 |
| 时间 | 相对排期周；`W0` 为合同冻结和项目准备周 |
| 负责人 | 角色代号，不代表已分配到具体个人 |
| 备注 | 依赖、验收口径、风险或当前证据 |

### 1.1 完成度口径

| 比率 | 含义 |
|---:|---|
| 0% | 尚无可运行代码或关键边界未设计 |
| 10% | 有页面占位、类型或接口草图，但不能完成闭环 |
| 25% | 有局部 Mock/骨架，可演示单一 happy path |
| 50% | 主要路径可运行，但没有持久化、权限、恢复或异常闭环 |
| 75% | 主路径和多数异常路径已实现，有自动化测试，仍缺生产级边界 |
| 90% | 具备完整实现和合同测试，缺少发布/性能/安全收尾 |
| 100% | 通过 Definition of Done、端到端、恢复和开放门禁验收 |

### 1.2 当前仓库基线（2026-09-24 复核）

- `apps/ui-lab`：React/Vite UI 设计验证应用，包含 Workbench、Canvas、节点、连接、Workspace 管理、Automations、Extensions、Settings、Files、Environments、Agents 和通知 Mock。
- `packages/seekwd-ui`：组件库，包含 WindowFrame、Sidebar、CanvasNode、Button、Dialog、Notification 等组件。
- `apps/ui-lab/src/mock`：内存 Mock API，已覆盖部分 Workspace、Canvas、Node、Edge、Run 和 Notification 命令。
- `apps/workbench` 已有独立 React/Vite 入口。默认 `localStorage` 模拟适配器，可通过 `VITE_HOST_URL` 接入 HTTP Host；图展示仍是固定视图，不能替代完整正式前端。
- Cargo workspace 只有 `pong-core` 和 `pong-host`。Host 有 SQLite 快照、幂等日志、快照更新事件游标和部分恢复测试；没有真实 Worker、Sandbox、Docker 或远程执行器，也没有完整 Event Store。
- UI Lab 中部分页面仍然直接使用 React local state，而不是完整 Mock API；这些完成度只计作演示完成，不计作生产闭环完成。

### 1.3 负责人角色

| 代号 | 角色 |
|---|---|
| PM | 产品经理 / 需求与范围 |
| UX | UX/UI 设计与交互规范 |
| FE | 正式产品前端工程、路由、状态、Host Adapter、功能模块和发布 |
| UI | UI 原型、交互规范、视觉系统和组件库 |
| BE | Host/API/持久化后端 |
| RT | Runtime/调度/状态机 |
| WK | Worker/Executor/执行环境 |
| AG | Agent/Planner/GraphPatch |
| SEC | 权限、策略、Secrets 和安全 |
| EXT | Extension/Node SDK |
| OPS | 备份、迁移、诊断和运行维护 |
| QA | 测试、验收和质量门禁 |

### 1.4 相对时间与阶段

| 阶段 | 周期 | 目标 |
|---|---|---|
| P0 Contract Freeze | W0–W1 | 冻结身份、版本、入口、状态、Patch 和权限合同 |
| P1 Persisted Core | W2–W4 | Host、SQLite、Command/Event、Workspace/Canvas/Graph 持久化 |
| P2 Runtime Core | W5–W8 | Run、NodeRun、调度、等待、暂停、取消和恢复 |
| P3 Workbench Integration | W9–W11 | 前端从 local state 切换到 Host 查询、命令和事件投影 |
| P4 Controlled Execution | W12–W15 | LocalRestricted、Artifact、Evidence、权限和对账 |
| P5 Agent & Extension Pilot | W16–W19 | Agent、GraphPatch、Extension、Automation 和跨画布试点 |
| P6 Hardening / Pilot Gate | W20–W24 | 安全、性能、迁移、备份、恢复和受邀用户验收 |

## 2. 进度总览（2026-09-20 历史估算）

以下百分比保留原始计划估算供对比，**不再作为当前进度或阶段出口依据**。未复核的单条任务表同理；当前已核对的代码证据见第 2.1 节。禁止把本节百分比汇总为一个“系统完成率”。

| 一级功能 | 设计覆盖 | 代码符合比率 | 当前状态 | 目标阶段 |
|---|---:|---:|---|---|
| 产品合同与架构 | 95% | 35% | 合同文档较完整，生产实现缺失 | P0–P1 |
| UI 原型与视觉系统 | 85% | 70% | UI Lab 可运行，主要交互和视觉已有，仍需补齐全状态验收 | P3 |
| UI 组件库 | 85% | 75% | `seekwd-ui` 已有核心组件，缺合同测试与完整视觉回归 | P3 |
| 正式产品前端基础设施 | 75% | 10% | 有设计与局部 Mock 思路，但没有独立生产应用、路由和 HostClient | P3 |
| 正式 Workbench 功能集成 | 85% | 15% | 原型页面较多，尚未通过 Query/Command/Event 接入真实领域事实 | P3–P5 |
| Workspace / Canvas / Graph | 90% | 45% | Mock CRUD 和图编辑可演示，正式持久化缺失 | P1–P3 |
| Version / Release | 95% | 15% | 规范完整，UI 和 Host 仅有局部骨架 | P1–P3 |
| Runtime / State Machine | 95% | 20% | 合同完整，真实 Worker/恢复未接入 | P2–P4 |
| Permission / Policy / Approval | 90% | 10% | 设计和类型有，审批闭环缺失 | P4–P5 |
| Artifact / Evidence / Lineage | 90% | 15% | 设计有，正式存储和导出缺失 | P4 |
| Agent / GraphPatch | 90% | 10% | 结构化提案设计有，模型和批准执行缺失 | P5 |
| Extension / Node SDK | 85% | 15% | Manifest/类型设计有，生命周期和沙箱缺失 | P5 |
| Automations / Triggers | 80% | 35% | UI Mock 有，调度器和持久化缺失 | P5 |
| Notification / Attention | 90% | 45% | Toast 队列已实现，持久中心缺失 | P3–P5 |
| Operations / Backup / Migration | 80% | 0% | 主要停留在设计 | P6 |
| 测试与开放门禁 | 85% | 20% | UI typecheck/build 有，合同/E2E/故障测试缺失 | 全阶段 |
| 系统流程与模块模型 | 90% | 35% | 已补充业务域、行为分类、数据流和状态图；需与合同测试和实现逐项对齐 | P0–P6 |

> 进度口径：CRUD 页面或 Mock 可用，不代表 Execute、Control、Validate、Approve、Observe、Recover、Reconcile、Audit 和 Govern 已完成。

### 2.1 已复核的代码事实（2026-09-24）

| 需求范围 | 已有证据 | 尚未达到的验收 |
|---|---|---|
| `P0-009`、`P0-010` | TS Host 类型、Rust 简化模型及本文稳定需求 ID 已存在；已核对条目见[证据台账](34-requirement-evidence-ledger.md) | 尚无跨语言 Schema 生成/合同测试；追踪只覆盖当前纵向切片，未覆盖全部需求及 Issue/PR |
| `HST-C-001`、`HST-C-002`、`HST-V-001` | Host 可启动，SQLite 快照写入失败回滚、异常数据拒绝启动，模拟 Run 重启恢复有局部实现 | 无单实例锁、WAL/迁移、Worker/Wait/Handle 恢复或完整崩溃演练 |
| `HST-R-001`、`HST-C-003`、`HST-C-004`、`HST-R-002` | 部分 Query/Command HTTP 路由、`StartRun` 幂等键、快照版本和快照更新事件游标 | 无认证/授权、完整 Command/Event Envelope、Outbox/Inbox、事件重放及游标过期重同步 |
| `WSP-*`、`CVS-*`、`DRF-*` | Workspace/Canvas 基础创建和改名、默认起点节点、简化 Revision 元数据可持久化 | 未做目录预检、CanvasDraft/Graph 持久化、不可变 Revision 内容、Release、影响分析与恢复 |
| `RUN-C-001`、`HST-V-001` | 默认入口 + 修订号 + 幂等键可启动模拟 Run，重启后定时完成 | 无输入、模式、Authority、Budget、RunSnapshot、NodeRun 或真实执行；模拟成功不能当作工作完成 |
| `FNT-ARCH-001`、`FNT-DATA-001`、`FNT-DATA-004` | 独立 Workbench 可构建；同一有限 HostClient 有本地模拟与 HTTP 适配器，HTTP 轮询快照更新 | 无桌面壳、错误边界、稳定游标持久化、事件去重、断线重同步或完整模块路由 |

已核对条目的提交、测试与未完成条件见[需求证据台账](34-requirement-evidence-ledger.md)；未列出的需求保持“未复核”，不沿用历史百分比作为完成声明。

## 3. P0：合同冻结与项目基线

| 需求编号 | 一级功能 | 二级功能 | 功能描述 | 符合比率 | 时间 | 负责人 | 备注 |
|---|---|---|---|---:|---|---|---|
| P0-001 | 合同治理 | 状态分离 | 为每份设计文档标记 Normative、Provisional、Experimental、Implementation Status 或 Informative。 | 100% | W0 | PM/BE | `27-normative-contracts` 已建立；需要持续维护矩阵。 |
| P0-002 | 合同治理 | 身份与版本 | 冻结 Workspace、CanvasIdentity、Draft、Revision、Release、RunSnapshot、RunBranch 的字段和可变性。 | 95% | W0 | PM/BE/RT | 规范已写；需要机器可读 Schema 和合同测试。 |
| P0-003 | 合同治理 | 入口模型 | 冻结唯一 Default Entrypoint、多个 Named Entrypoint 和 Trigger 的关系。 | 95% | W0 | PM/FE/RT | 旧 `primaryNodeId` 迁移仍需落地。 |
| P0-004 | 合同治理 | 状态机 | 为 Run、NodeRun、Attempt、Handle、Approval、Grant、Context 和 Goal 建立唯一枚举及合法转移表。 | 95% | W0 | RT/QA | 合同已有；实现必须拒绝非法转移。 |
| P0-005 | 合同治理 | GraphPatch | 冻结原子操作、前置条件、幂等、before-image、逆补丁和失败事务边界。 | 95% | W1 | AG/BE/SEC | 规范已有；服务端尚未实现。 |
| P0-006 | 合同治理 | RunPatch | 冻结运行中只可修改未来节点，禁止改写历史输入、输出、证据和审批。 | 95% | W1 | RT/AG/QA | 需要合同测试和 RunBranch 模型。 |
| P0-007 | 合同治理 | 权限边界 | 冻结默认 deny、AuthorityProfile、Budget、Network、Secret、Export 和后台运行边界。 | 90% | W1 | SEC/BE | 需补齐资源规范化算法和 Policy Decision Schema。 |
| P0-008 | 合同治理 | 事件恢复 | 冻结 CommandEnvelope、EventEnvelope、Cursor、Snapshot、Outbox/Inbox 和至少一次投递规则。 | 85% | W1 | BE/RT | 设计存在，代码和测试未落地。 |
| P0-009 | 项目基线 | 机器可读 Schema | 生成 TypeScript/Rust/SQLite/IPC 共用 Schema，禁止各模块自行猜字段。 | 10% | W1 | BE/QA | 当前只有文档和部分 TS 类型。 |
| P0-010 | 项目基线 | 需求追踪 | 将本文任务 ID 与 Issue、PR、测试、验收证据关联。 | 0% | W1 | PM/QA | 本文作为追踪源；需接入项目管理工具。 |
| P0-011 | 架构建模 | 系统平面 | 将 Experience、Control、Execution、Data、Intelligence、Governance 六个平面落实为职责边界和依赖图。 | 35% | W1 | PM/BE/RT/FE | 已有流程模型；需通过模块评审冻结。 |
| P0-012 | 架构建模 | 业务域与事实所有权 | 为 Workspace、Graph、Runtime、Policy、Execution、Artifact、Automation、Extension、Agent、Recovery 和 Projection 指定唯一事实所有者。 | 30% | W1 | PM/BE/RT/SEC | 已补充服务所有权表；需转成接口和合同测试。 |
| P0-013 | 架构建模 | 非 CRUD 行为 | 为 Execute、Control、Validate、Approve、Observe、Debug、Reconcile、Recover、Compensate、Schedule、Import/Export、Notify、Audit 和 Govern 建立需求与验收入口。 | 45% | W1 | PM/QA | 已有行为矩阵；各模块仍需补单条任务。 |
| P0-014 | 架构建模 | 流程图一致性 | 业务流程、用户操作流程、Command/Event 数据流和状态图必须与 Normative Contract 的字段和枚举一致。 | 25% | W1 | PM/RT/QA | Mermaid 图已建立，尚未自动校验。 |
| P0-015 | 架构建模 | Execute 行为 | 每类可执行对象明确启动输入、幂等键、前置条件、Attempt、Handle、结果和审计。 | 20% | W1 | RT/BE/QA | 依赖 StartRun 和 Worker 合同。 |
| P0-016 | 架构建模 | Control 行为 | 暂停、恢复、取消、接管和优先级调整均通过命令和合法状态转移实现。 | 20% | W1 | RT/FE/QA | 不能直接改状态字段。 |
| P0-017 | 架构建模 | Validate 行为 | Graph、Schema、Revision、Release、Extension、Artifact 和 Migration 都有结构化验证报告。 | 30% | W1 | BE/EXT/QA | 目前验证分散在文档和 UI。 |
| P0-018 | 架构建模 | Approve 行为 | 高风险动作统一使用 PolicyDecision、ApprovalRequest 和有界 ApprovalGrant。 | 35% | W1 | SEC/BE/QA | 默认 deny 和权限扩大重审是硬门。 |
| P0-019 | 架构建模 | Observe 行为 | Run、NodeRun、Host、Worker、Budget、Automation 和 Projection 提供版本化查询与事件订阅。 | 25% | W1 | FE/BE/RT | 依赖 Query Projection 和 Cursor。 |
| P0-020 | 架构建模 | Debug 行为 | 断点、输入覆盖、单节点重试、Trace、Replay 和 RunBranch 不修改历史 Snapshot。 | 15% | W2 | FE/RT/QA | 正式 Debug UI 尚未完成。 |
| P0-021 | 架构建模 | Reconcile 行为 | 外部句柄失联、响应丢失和取消未确认必须进入对账流程，不得直接重试。 | 25% | W2 | RT/WK/QA | 依赖 EffectReceipt 和 RecoveryCase。 |
| P0-022 | 架构建模 | Recover 行为 | Host、Projection、Run、Wait、Artifact、Backup 和 Migration 都定义恢复源、Checkpoint 和失败出口。 | 20% | W2 | BE/RT/OPS | 依赖事件日志和快照。 |
| P0-023 | 架构建模 | Compensate 行为 | 各类副作用声明可重试、幂等、需对账、人工处理、前向修复或不可补偿类别。 | 20% | W2 | RT/WK/SEC | 不允许假设所有动作可回滚。 |
| P0-024 | 架构建模 | Schedule/Trigger | Automation、Timer、Webhook、文件事件和跨 Canvas 调用统一使用 DeliveryRecord、去重和超时规则。 | 25% | W2 | RT/BE/FE | 依赖 Automation 和 Cross-Canvas 合同。 |
| P0-025 | 架构建模 | Import/Export | Workspace、Canvas、Artifact、Backup 和 Support Bundle 定义导入预检、导出审批、Digest 和审计。 | 15% | W2 | BE/SEC/OPS | 高风险数据出境必须可追踪。 |
| P0-026 | 架构建模 | Notify/Attend | Notification、Wait、Approval、Recovery 和 Budget Alert 定义投递、已读、确认、静音、过期和 Attention 聚合。 | 45% | W2 | FE/BE | Notification PRD 已有，持久中心待实现。 |
| P0-027 | 架构建模 | Audit | 高风险命令、策略决策、审批、导出、恢复、迁移和扩展操作形成不可篡改审计链。 | 25% | W2 | BE/SEC/QA | 应用日志不能代替 AuditEvent。 |
| P0-028 | 架构建模 | Govern | 合同状态、NodeDefinition、Extension、Retention、Migration 和开放级别均有版本、兼容性和门禁证据。 | 35% | W2 | PM/EXT/OPS/QA | 需接入正式合同状态矩阵。 |
| P0-029 | 技术选型 | Backend Stack | 冻结 Rust/Tokio、`pong-host`、Core/Runtime/Policy/Worker crate 边界和非 Host 语言使用范围。 | 85% | W1 | BE/RT/WK | 选型文档已完成；尚未创建 Rust Workspace。 |
| P0-030 | 技术选型 | Middleware Stack | 冻结 SQLite/WAL、Event Log、Outbox/Inbox、Projection、持久调度和不引入外部消息集群的首版边界。 | 85% | W1 | BE/RT/OPS | 首版不依赖 Redis/Kafka/NATS/Temporal。 |
| P0-031 | 技术选型 | IPC and Schema | 冻结 Named Pipe/UDS、类型化 JSON-RPC、JSON Schema 生成、Cursor、背压和 ArtifactHandle。 | 75% | W1 | BE/FE/SEC | 需要实现合同测试和跨平台适配。 |
| P0-032 | 技术选型 | Execution Isolation | 冻结 LocalRestricted 首版能力和 Docker/远程执行的后续适配边界。 | 60% | W2 | WK/SEC/RT | 平台沙箱实现尚未开始。 |
| P0-033 | 技术选型 | Local/Cloud Boundary | 冻结本地 Host 权威、选择性云同步、禁止上传数据和离线不阻塞核心功能的边界。 | 85% | W1 | PM/BE/SEC | 已补充数据放置矩阵；云服务未实现。 |

## 4. P1：应用门户与全局外壳

| 需求编号 | 一级功能 | 二级功能 | 功能描述 | 符合比率 | 时间 | 负责人 | 备注 |
|---|---|---|---|---:|---|---|---|
| PORTAL-C-001 | 系统门户 | Welcome | 首次启动展示创建/打开/恢复 Workspace 和最近记录。 | 15% | W2 | FE/UX | 当前没有独立 Welcome 页面。 |
| PORTAL-R-001 | 系统门户 | 全局状态 | 展示 Host 连接、后台 Run、审批、恢复、更新和迁移状态。 | 10% | W2 | FE/BE | UI 只有工作台局部状态。 |
| PORTAL-R-002 | 系统门户 | 全局搜索 | 可搜索 Workspace、Canvas、Node、Run、Artifact、Approval 和 Settings，并显示作用域。 | 0% | W3 | FE/BE | 需稳定 ID 深链接。 |
| PORTAL-C-002 | 系统门户 | New Workspace | 选择目录、预览权限和已存在配置，创建 Workspace 与默认 Canvas。 | 55% | W2 | FE | UI Lab 有对话框和本地状态；缺 Host 持久化。 |
| PORTAL-R-003 | 系统门户 | Recent | 展示最近打开的 Workspace/Canvas，支持搜索和固定。 | 45% | W2 | FE | 侧栏已有基础 Recent。 |
| PORTAL-U-001 | 系统门户 | 主题与外观 | Light/Dark、减少动效、减少透明度和字体适配设置可持久化。 | 55% | W3 | FE/UI | 当前主题主要是 React state。 |
| PORTAL-D-001 | 系统门户 | 清除最近 | 只删除本地导航记录，不删除业务对象和文件。 | 0% | W3 | FE/BE | 需明确本地设置存储。 |
| PORTAL-V-001 | 系统门户 | Offline Shell | Host 断开时保留最后确认快照，禁止伪装命令成功。 | 0% | W4 | FE/BE | 开放前 P0 门禁。 |

## 5. P1：Workspace 管理

| 需求编号 | 一级功能 | 二级功能 | 功能描述 | 符合比率 | 时间 | 负责人 | 备注 |
|---|---|---|---|---:|---|---|---|
| WSP-C-001 | Workspace | 创建 | 选择或创建本地目录，检查权限、符号链接、已有元数据和磁盘空间。 | 30% | W2 | FE/BE/SEC | UI 有路径选择 Mock；无真实路径预检。 |
| WSP-C-002 | Workspace | 初始化 | 创建 WorkspaceIdentity、默认 Policy、Retention、Settings 和默认 CanvasDraft。 | 20% | W2 | BE/SEC | Mock adapter 可创建简单 Workspace。 |
| WSP-R-001 | Workspace | 列表 | 分页、搜索、最近、固定、状态和恢复状态。 | 45% | W2 | FE/BE | local state + Mock API，缺持久投影。 |
| WSP-R-002 | Workspace | Overview | Canvas、活动 Run、待办、Artifact、环境、容量和健康摘要。 | 10% | W3 | FE | 页面缺失。 |
| WSP-R-003 | Workspace | 详情 | 目录、所有者、创建时间、Policy、Budget、Retention、Backup 和迁移状态。 | 10% | W3 | FE/BE | 设计已覆盖。 |
| WSP-U-001 | Workspace | 重命名 | 修改显示名，保持 workspaceId、路径和引用不变。 | 55% | W2 | FE/BE | UI local state 有，API 有 Mock。 |
| WSP-U-002 | Workspace | 配置 | 修改摘要、默认 Canvas、标签、默认 Policy 和 Budget。 | 10% | W4 | FE/BE/SEC | 需版本化配置。 |
| WSP-U-003 | Workspace | 目录迁移 | 检查活动 Run、锁、引用、权限和空间后迁移。 | 0% | W6 | BE/OPS | 高风险，必须 ImpactAnalysis。 |
| WSP-D-001 | Workspace | 归档 | 停止新建/运行，保留历史 Snapshot、Release、Audit 和 Lineage。 | 0% | W4 | BE/FE | 需生命周期事件。 |
| WSP-D-002 | Workspace | 删除 | 展示 Canvas、Run、Artifact、Automation、Secret、Environment 和跨 Workspace 引用。 | 20% | W4 | BE/SEC/FE | Mock 有简化删除，缺影响分析。 |
| WSP-D-003 | Workspace | 恢复 | 冷静期内恢复并重新检查目录、权限、Secret 和 Environment。 | 0% | W6 | BE/OPS | 依赖 Backup/Recovery。 |

## 6. P1：Canvas、Draft、Revision 与 Release

| 需求编号 | 一级功能 | 二级功能 | 功能描述 | 符合比率 | 时间 | 负责人 | 备注 |
|---|---|---|---|---:|---|---|---|
| CVS-C-001 | Canvas | 创建空白画布 | 创建 CanvasIdentity、CanvasDraft 和唯一 Default Entrypoint。 | 35% | W2 | FE/BE | UI 可创建名称；默认入口尚未按新合同建模。 |
| CVS-C-002 | Canvas | 模板创建 | 从 Template、Revision、RunBranch 或导入包创建新 Canvas。 | 0% | W7 | FE/BE/EXT | 需 Import/Template。 |
| CVS-R-001 | Canvas | 列表 | 展示名称、Draft、Revision、Release、入口、Trigger 和聚合运行状态。 | 50% | W2 | FE | 侧栏和 Mock 有基础列表。 |
| CVS-R-002 | Canvas | 详情 | 展示 Graph 摘要、版本、调用方、Automation、Run 和 Artifact。 | 15% | W3 | FE/BE | 详情页未建。 |
| CVS-U-001 | Canvas | 重命名 | 保持 canvasId、Run、Release 和调用引用不变。 | 55% | W2 | FE/BE | UI local state + Mock API。 |
| CVS-U-002 | Canvas | 归档/恢复 | 归档禁止新运行，可查看历史；恢复重新校验依赖。 | 0% | W5 | FE/BE | 缺生命周期实现。 |
| CVS-D-001 | Canvas | 删除预览 | 显示被调用入口、Automation、活动 Run、Artifact 和外部引用。 | 15% | W4 | FE/BE | 当前 DeleteImpact 很简化。 |
| CVS-D-002 | Canvas | 删除与恢复 | 逻辑删除、冷静期、恢复和不可恢复确认。 | 0% | W6 | BE/OPS | 依赖持久化和 Retention。 |
| DRF-C-001 | Canvas | Draft 分支 | 从指定 Revision 创建 Draft，支持多个并行 Draft。 | 10% | W3 | BE/FE | 合同已定义，仓库未实现。 |
| DRF-R-001 | Canvas | Draft 状态 | 显示 basedOnRevision、draftRevision、dirty、作者和校验。 | 15% | W3 | FE | 目前 CanvasPreview 没有正式版本状态。 |
| DRF-U-001 | Canvas | 草稿编辑 | 每个命令检查 expectedDraftRevision 并递增版本。 | 20% | W3 | BE/FE | UI 图编辑可用，未接版本命令。 |
| DRF-U-002 | Canvas | 冲突合并 | 对比本地/远端 Draft，支持保留本地、加载远端、逐项合并、另存。 | 0% | W6 | FE/BE/QA | P0 开放前要求。 |
| DRF-D-001 | Canvas | 放弃草稿 | 展示未提交命令、Patch 和影响，确认后删除 Draft。 | 0% | W5 | FE/BE | 不能直接丢 local state。 |
| REV-C-001 | Canvas | 保存 Revision | 将 Draft 完整图冻结为不可变 Revision，生成 Digest 和 Validation。 | 10% | W4 | BE/RT | 当前仓库没有持久 Host。 |
| REV-R-001 | Canvas | 版本历史 | 分页查看、比较、创建 Draft、查看来源 Patch。 | 0% | W5 | FE/BE | 页面缺失。 |
| REV-U-001 | Canvas | 版本修复 | 不允许改旧 Revision，修复必须创建新 Draft/Revision。 | 0% | W4 | BE/QA | 由服务端保证。 |
| REV-D-001 | Canvas | 版本归档 | 被 Release/Run 引用时只能归档元数据，不物理删除。 | 0% | W6 | BE/OPS | 依赖 Retention。 |
| RLS-C-001 | Canvas | 发布 Release | 指定 Channel、SemVer、Release Notes、兼容性和调用方影响。 | 0% | W6 | BE/FE/QA | Release Manager 页面缺失。 |
| RLS-R-001 | Canvas | Release 管理 | 查看稳定/预览/内部版本、调用方、状态和生命周期事件。 | 0% | W6 | FE/BE | 合同有，代码无。 |
| RLS-U-001 | Canvas | 弃用 | 追加 deprecated 事件，显示替代 Release 和迁移建议。 | 0% | W7 | BE/FE | 不改 Release 绑定。 |
| RLS-D-001 | Canvas | 撤回 | withdrawn 禁止新解析，历史 Run 继续可读。 | 0% | W7 | BE/SEC/QA | 需测试历史可追溯。 |

## 7. P1：节点、端口、边与图编辑

| 需求编号 | 一级功能 | 二级功能 | 功能描述 | 符合比率 | 时间 | 负责人 | 备注 |
|---|---|---|---|---:|---|---|---|
| NOD-C-001 | Canvas Graph | 添加节点 | 从 Node Library、复制、Template 或 Agent Patch 添加节点。 | 70% | W2 | FE/UI | UI 可添加 Mock 节点。 |
| NOD-C-002 | Canvas Graph | 节点初始化 | 绑定精确定义版本、默认配置、端口、权限和执行需求。 | 25% | W3 | BE/EXT | Mock 有简化 type/config。 |
| NOD-R-001 | Canvas Graph | 节点展示 | 展示语义图标、名称、定义版本、状态、入口标记和配置摘要。 | 75% | W2 | FE/UI | 组件和节点布局已完成。 |
| NOD-R-002 | Canvas Graph | 节点 Inspector | 查看完整配置、端口、权限、环境、验证、运行和血缘。 | 35% | W3 | FE | 有基础 Inspector，缺完整数据。 |
| NOD-U-001 | Canvas Graph | 节点配置 | 编辑名称、配置、启用状态、布局、策略收紧和断点。 | 45% | W3 | FE/BE | UI 交互部分存在，未接 GraphPatch。 |
| NOD-U-002 | Canvas Graph | 替换定义 | 展示配置/端口迁移、兼容性、权限和运行影响。 | 0% | W7 | EXT/BE/FE | 依赖 NodeDefinition。 |
| NOD-D-001 | Canvas Graph | 删除节点预览 | 展示入边、出边、入口、触发器、等待、调用和活动 Run 影响。 | 20% | W3 | FE/BE | 当前 DeleteImpact 不完整。 |
| NOD-D-002 | Canvas Graph | 删除节点执行 | 显式选择 remove edges/reconnect/reject 和活动 Run 处理。 | 10% | W5 | BE/RT | 只能通过 GraphPatch 原子执行。 |
| NOD-E-001 | Canvas Graph | 节点测试 | 在 Debug Context 中单独测试节点并保留结果、日志和 Evidence。 | 0% | W8 | FE/RT/WK | 页面和执行器缺失。 |
| PRT-C-001 | Canvas Graph | 端口生成 | 根据 Definition 生成固定/动态输入输出端口。 | 55% | W2 | FE/EXT | CanvasNode 已有端口展示；数据模型简化。 |
| PRT-R-001 | Canvas Graph | 端口详情 | 显示方向、Schema、必填、多重性、连接数和敏感度。 | 45% | W2 | FE/UI | 当前显示类型和连接点，缺完整 Schema。 |
| PRT-U-001 | Canvas Graph | 绑定端口 | 支持 Edge、Literal、ValueRef、SecretRef、Context、Environment、Human Input。 | 15% | W4 | FE/BE/SEC | UI 只覆盖连接演示。 |
| PRT-U-002 | Canvas Graph | 多值聚合 | 多来源端口必须显式配置 one/optional/many 和聚合表达式。 | 0% | W7 | RT/BE | 禁止隐式取最后值。 |
| PRT-D-001 | Canvas Graph | 解除绑定 | 删除绑定后重新验证必填输入、入口输入和下游。 | 15% | W4 | FE/BE | 连接删除 Mock 有，校验不足。 |
| EDG-C-001 | Canvas Graph | 创建连接 | 通过端口创建 data/control/event/error/compensation Edge。 | 70% | W2 | FE/UI | 已有连接 sockets 和边渲染。 |
| EDG-C-002 | Canvas Graph | 连接校验 | 校验方向、类型、基数、映射、循环、权限和调用关系。 | 40% | W3 | BE/RT | UI 基础图校验；正式服务缺失。 |
| EDG-R-001 | Canvas Graph | Edge Inspector | 查看源目标、Kind、Mapping、Condition、Delivery 和 Cancellation。 | 15% | W4 | FE/RT | 页面缺失。 |
| EDG-U-001 | Canvas Graph | 修改边 | 修改映射、条件、投递、取消和启用状态，重新验证整图。 | 10% | W5 | FE/BE/RT | 需 GraphPatch。 |
| EDG-D-001 | Canvas Graph | 删除边 | 展示依赖和下游不可达影响，保留历史 Lineage。 | 35% | W2 | FE/BE | UI 可断开，影响分析未完成。 |
| LAY-C-001 | Canvas Graph | 自动布局 | 提供安全自动布局，不改变图语义和端口绑定。 | 0% | W6 | FE | 当前只有固定演示坐标。 |
| LAY-U-001 | Canvas Graph | 画布视图 | 缩放、平移、适配、选择框、Minimap 和只读模式。 | 45% | W3 | FE/UI | 缩放/工具栏有；平移、Minimap 未完成。 |

## 8. P1：Entrypoint、Trigger 与 Automation

| 需求编号 | 一级功能 | 二级功能 | 功能描述 | 符合比率 | 时间 | 负责人 | 备注 |
|---|---|---|---|---:|---|---|---|
| ENT-C-001 | 入口管理 | Default Entrypoint | 每个可执行 Revision 恰好一个默认入口，目标节点和输入合法。 | 15% | W4 | BE/RT/FE | 当前 Mock 使用 `primaryNodeId`。 |
| ENT-C-002 | 入口管理 | Named Entrypoint | 创建多个命名入口，配置输入输出、调用模式、并发和权限。 | 0% | W6 | FE/BE/RT | 页面缺失。 |
| ENT-R-001 | 入口管理 | 入口列表 | 查看目标、调用方式、输入 Schema、并发、权限和启用状态。 | 0% | W6 | FE | 需 Entrypoint Inspector。 |
| ENT-U-001 | 入口管理 | 设默认入口 | 原子切换 Default，不能留下两个或零个默认入口。 | 20% | W3 | BE/FE | 当前 setPrimaryNode 不是正式模型。 |
| ENT-D-001 | 入口管理 | 删除入口 | 默认入口必须同时绑定新默认；其他入口删除前分析调用方。 | 0% | W6 | BE/QA | 需 GraphPatch。 |
| ENT-E-001 | 入口管理 | 测试入口 | 用结构化输入运行 Debug Run，不能绕过 Policy。 | 0% | W8 | FE/RT | 依赖 Run Launch。 |
| TRG-C-001 | 触发器 | Schedule | 创建定时 Trigger，指定时区、输入、重入和失败策略。 | 25% | W3 | FE | Automation UI 有 schedule 表单 Mock。 |
| TRG-C-002 | 触发器 | Event/Webhook | 创建事件/Webhook Trigger，配置过滤器、映射和 DeliveryPolicy。 | 0% | W8 | BE/RT/SEC | 外部注册和去重缺失。 |
| TRG-R-001 | 触发器 | 触发历史 | 查看最近触发、去重结果、子 Run、失败和通知。 | 0% | W9 | FE/BE | 页面缺失。 |
| TRG-U-001 | 触发器 | 启停修改 | 修改 Schedule、Filter、Mapping、Delivery 和启用状态。 | 25% | W3 | FE | local state，未持久化。 |
| TRG-D-001 | 触发器 | 删除注销 | 删除 Trigger 同步注销外部订阅，失败进入补偿 Job。 | 0% | W9 | BE/RT/OPS | 不能只删 UI 行。 |
| ATM-C-001 | Automations | 新建自动化 | 绑定精确 Release、Entrypoint、Input、Authority、Budget 和 Schedule。 | 35% | W3 | FE | UI 可创建 Mock Automation，缺真实绑定。 |
| ATM-R-001 | Automations | 列表详情 | 展示状态、Schedule、目标、Next Run、Last Run、失败和通知。 | 45% | W3 | FE | UI 已有基础页面。 |
| ATM-U-001 | Automations | 编辑启停 | 修改名称、Schedule、输入、目标和通知策略；变更重新校验。 | 40% | W3 | FE/BE | UI local state。 |
| ATM-D-001 | Automations | 删除 | 停止未来触发，保留历史 Run、Audit 和通知。 | 25% | W3 | FE/BE | UI 能删列表项，缺后台事实。 |
| ATM-E-001 | Automations | Run Now | 创建普通可审计 Run，不能绕过权限、预算、版本和幂等。 | 30% | W4 | FE/RT | UI 仅发通知，没有完整 StartRun 输入。 |
| ATM-E-002 | Automations | 重入策略 | 支持 reject/queue/allow，显示并发和队列状态。 | 0% | W8 | RT/FE | 依赖 Runtime Scheduler。 |

## 9. P2：版本校验与 GraphPatch

| 需求编号 | 一级功能 | 二级功能 | 功能描述 | 符合比率 | 时间 | 负责人 | 备注 |
|---|---|---|---|---:|---|---|---|
| VAL-C-001 | Graph Validation | 校验报告 | 对节点、端口、边、入口、循环、权限、环境和终止性生成报告。 | 35% | W3 | BE/RT | UI 有基础错误状态，缺正式 Report。 |
| VAL-R-001 | Graph Validation | 问题列表 | 按 Error/Warning/Info 显示规则、对象、位置、原因和修复建议。 | 20% | W4 | FE | 页面缺失。 |
| VAL-U-001 | Graph Validation | 处理 Warning | 允许有记录的豁免，Error 默认阻止运行/发布。 | 0% | W6 | FE/BE/SEC | 需 Audit。 |
| GPT-C-001 | GraphPatch | 提交 | 用户/Agent 针对精确 DraftRevision 提交带幂等键的原子 Patch。 | 10% | W5 | AG/BE | 只有文档协议。 |
| GPT-R-001 | GraphPatch | Diff Review | 展示逐项 Before/After、边/入口/调用影响、权限和预算差异。 | 0% | W7 | FE/AG/SEC | P0 开放门禁。 |
| GPT-U-001 | GraphPatch | 审批决定 | 批准、拒绝、要求修改；服务端重新计算风险和影响。 | 0% | W7 | SEC/BE | 不能信任 Agent 自报风险。 |
| GPT-D-001 | GraphPatch | 逆补丁 | 已应用 Patch 不能删除，撤销必须生成新的逆 Patch。 | 0% | W8 | BE/AG/QA | 需要 before-image。 |
| GPT-E-001 | GraphPatch | 原子应用 | 校验、策略、应用、DraftRevision 和 Event 必须在事务边界内完成。 | 0% | W8 | BE/QA | 失败不得部分应用。 |
| RPT-C-001 | RunPatch | 运行中修复提案 | 只允许修改未来节点，新增诊断/验证/等待/补偿/替代分支。 | 0% | W9 | RT/AG | 需 Checkpoint 和 RunBranch。 |
| RPT-E-001 | RunPatch | 安全边界 | 禁止改写历史 Attempt、删除审批/验证、扩大权限或伪造成功。 | 0% | W9 | RT/SEC/QA | 合同已定义，未实现。 |

## 10. P2：Host、持久化与命令事件

| 需求编号 | 一级功能 | 二级功能 | 功能描述 | 符合比率 | 时间 | 负责人 | 备注 |
|---|---|---|---|---:|---|---|---|
| HST-C-001 | Host | 单实例 Host | 启动、锁定、健康检查和安全关闭本地 Host。 | 0% | W2 | BE/OPS | 当前 checkout 无 Host 源码。 |
| HST-C-002 | Host | SQLite 初始化 | WAL、版本迁移、事务、外键、索引和恢复检查。 | 0% | W2 | BE/OPS | 文档声明与当前代码不一致，需以代码证据重建。 |
| HST-R-001 | Host | Query Router | 提供 Workspace、Canvas、Graph、Run、Artifact、Policy 和 Notification 查询。 | 10% | W3 | BE | 只有前端 Mock adapter。 |
| HST-C-003 | Host | Command Router | 认证、幂等、版本、权限、ImpactAnalysis 和 CommandReceipt。 | 0% | W3 | BE/SEC | 开放前阻塞。 |
| HST-C-004 | Host | Event Store | 追加 EventEnvelope、因果关联、序列和审计哈希。 | 0% | W3 | BE | 当前 UI Mock 事件不计正式实现。 |
| HST-R-002 | Host | Cursor Subscription | 至少一次投递、断线重连、快照重同步、乱序处理和去重。 | 0% | W4 | BE/FE | 当前只存在内存 subscribe。 |
| HST-U-001 | Host | Migration | 协议/数据库迁移前检查、备份、执行、验证和回滚。 | 0% | W4 | BE/OPS/QA | 页面和 Job 均缺失。 |
| HST-D-001 | Host | 清理 | 清理过期投影/缓存，不误删事实、审计和历史 Snapshot。 | 0% | W6 | BE/OPS | 依赖 Retention。 |
| HST-V-001 | Host | 崩溃恢复 | Host/Worker 崩溃后恢复未完成命令、Outbox/Inbox、WaitRecord 和 Handle。 | 0% | W8 | BE/RT/QA | P0 开放门禁。 |

### 10.1 选择性云数据服务

| 需求编号 | 一级功能 | 二级功能 | 功能描述 | 符合比率 | 时间 | 负责人 | 备注 |
|---|---|---|---|---:|---|---|---|
| CLD-ARCH-001 | Cloud Services | Local Authority | 本地 Pong Host 始终拥有 Workspace、Canvas、Run、Policy、Execution 和 Recovery 权威事实。 | 0% | W13 | BE/SEC | 云端不能进入本地运行关键路径。 |
| CLD-C-001 | Cloud Account | Account/Device | 可选账户、设备注册、撤销和 Entitlement；未登录仍能使用本地核心功能。 | 0% | W13 | BE/SEC | 不自动创建云账户。 |
| CLD-C-002 | Cloud Sync | Scope Consent | 按 Workspace 和数据类别开启同步/Backup，扩大范围需要再次确认。 | 0% | W13 | FE/BE/SEC | 登录不等于上传授权。 |
| CLD-R-001 | Cloud Sync | Sync Center | 展示 local_only、pending、syncing、synced、conflict、failed、paused、游标和待传大小。 | 0% | W14 | FE/BE | 需要独立 Cloud & Sync 页面。 |
| CLD-E-001 | Cloud Sync | Local Outbox/Inbox | 本地持久 Sync Outbox/Inbox、deviceId、cursor、Digest、至少一次投递和去重。 | 0% | W14 | BE | 与运行 Event Log 分区但可审计关联。 |
| CLD-E-002 | Cloud Sync | Immutable Merge | Revision/Release 按稳定 ID + Digest 去重，云端不能修改不可变内容。 | 0% | W14 | BE/QA | 同 Digest 不重复上传。 |
| CLD-E-003 | Cloud Sync | Draft Conflict | Draft 多设备冲突创建分支/三方合并，不使用静默 last-write-wins。 | 0% | W15 | FE/BE/QA | 草稿同步可晚于不可变版本同步。 |
| CLD-E-004 | Cloud Storage | Encrypted Artifact | Artifact 客户端加密、分块上传、Digest 校验、暂停恢复和保留策略。 | 0% | W15 | BE/SEC/OPS | S3-compatible Store 只保存密文对象。 |
| CLD-P-001 | Cloud Security | Upload Review | 敏感 Artifact、日志、Prompt、截图和文件上传前展示类型、大小、目标、加密和保留时间。 | 0% | W15 | FE/SEC | 逐项审批或明确规则。 |
| CLD-D-001 | Cloud Data | Independent Delete | 云端删除与本地删除分离，展示 Backup、Retention 和审计影响。 | 0% | W15 | FE/BE/OPS | 不做双向静默级联删除。 |
| CLD-U-001 | Cloud Device | Rebinding | 新设备重新绑定路径、Secret、Environment、AuthorityProfile；不复用旧设备 Grant。 | 0% | W16 | FE/BE/SEC | 本地资源边界必须重评估。 |
| CLD-SVC-001 | Cloud Services | API | 独立 Cloud API 提供 Account、Device、Entitlement、Catalog、Sync 和 Backup，不承载 Runtime。 | 0% | W13 | BE | 推荐 Rust/Axum + PostgreSQL。 |
| CLD-SVC-002 | Cloud Services | Catalog/Update | Extension Catalog、Templates、更新 Manifest 可缓存、签名和回滚。 | 0% | W14 | BE/EXT/OPS | 下载后仍做本地验证。 |
| CLD-A-001 | Cloud Audit | Audit | 登录、设备、范围、上传、下载、冲突、删除和导出在本地/云端形成关联审计。 | 0% | W15 | BE/SEC | 不记录 Secret 明文。 |
| CLD-V-001 | Cloud Quality | Offline/Failure | 验证断网、重复上传、分块中断、设备撤销、冲突、数据损坏和云端完全不可用。 | 0% | W17 | QA/BE | 云端故障不能阻止本地参考生命周期。 |

## 11. P2：Runtime、Run 与 NodeRun

| 需求编号 | 一级功能 | 二级功能 | 功能描述 | 符合比率 | 时间 | 负责人 | 备注 |
|---|---|---|---|---:|---|---|---|
| RUN-C-001 | Runtime | StartRun | 必须传 Release/Revision、Entrypoint、Input、Mode、Authority、Budget、Idempotency。 | 20% | W5 | RT/BE | Mock 仍是 `startRun(canvasId)`，不符合正式合同。 |
| RUN-C-002 | Runtime | RunSnapshot | 解析 Graph、Definition、Capability、Context、Policy、Grant 和输入引用后冻结 Snapshot。 | 0% | W5 | RT/BE | 规范有，代码缺失。 |
| RUN-R-001 | Runtime | Run Monitor | 展示状态、节点进度、等待、子 Run、成本、事件和验证。 | 30% | W9 | FE/RT | 当前 RunPanel 是静态/简化数据。 |
| RUN-R-002 | Runtime | Run History | 按 Canvas/Workspace 查询、比较、回放入口和终态。 | 35% | W9 | FE/BE | UI 有打开入口但缺完整 API。 |
| RUN-U-001 | Runtime | Pause/Resume | 暂停调度，按 Executor 能力处理活动 Handle，恢复不得伪造继续。 | 10% | W6 | RT/WK | Mock 有简单状态切换。 |
| RUN-U-002 | Runtime | Cancel | cancelling、cancel_pending、reconciling、cancelled 和 completed_after_cancel 语义完整。 | 10% | W7 | RT/WK/QA | Mock 直接 cancelled，不符合合同。 |
| RUN-E-001 | Runtime | Scheduler | 依赖完成驱动 NodeRun，支持 data/control/event/error/compensation 边。 | 10% | W6 | RT | 当前无生产 Runtime。 |
| RUN-E-002 | Runtime | Retry/Replay | Retry 创建新 Attempt；Replay/Repair 创建明确 RunBranch。 | 0% | W8 | RT | 不能覆盖历史结果。 |
| RUN-D-001 | Runtime | Retention | 归档 Run，按策略清理日志/临时 Artifact，保留 Snapshot/Evidence/Audit。 | 0% | W10 | RT/OPS | 依赖 Retention Policy。 |
| NRR-C-001 | Runtime | NodeRun/Attempt | 每个节点执行创建 NodeRun 和独立 Attempt。 | 10% | W6 | RT | Mock types 有 NodeRun，未由 Runtime 创建。 |
| NRR-R-001 | Runtime | NodeRun Detail | 展示输入、输出、Context、权限、日志、Evidence、Artifact 和重试链。 | 0% | W9 | FE/RT | 页面缺失。 |
| NRR-U-001 | Runtime | 状态转移 | 只允许统一状态机定义的转移，非法转移返回 StructuredError。 | 15% | W6 | RT/QA | 设计有，生产状态机缺失。 |
| NRR-E-001 | Runtime | Debugger | 断点、单步、调用栈、变量、子 Run 和 Checkpoint Branch。 | 0% | W11 | FE/RT | P1 试点功能。 |

## 12. P2：Wait、Human Input 与通知事实

| 需求编号 | 一级功能 | 二级功能 | 功能描述 | 符合比率 | 时间 | 负责人 | 备注 |
|---|---|---|---|---:|---|---|---|
| WAI-C-001 | Human Collaboration | WaitRecord | 等待输入、依赖、环境、审批、Timer/Event 时持久化恢复条件和 Deadline。 | 15% | W6 | RT/BE | 文档和 Mock inputRequests 有，非正式 WaitRecord。 |
| WAI-R-001 | Human Collaboration | Waiting 页面 | 展示字段 Schema、上下文、影响、截止时间和恢复/取消动作。 | 20% | W9 | FE | Canvas 内有基础等待展示。 |
| WAI-U-001 | Human Collaboration | 提交输入 | Schema、敏感度、权限校验后生成新 ValueRef，继续原流程或新 Attempt。 | 25% | W6 | FE/RT/SEC | UI 有结构化输入弹层，缺正式 ValueRef。 |
| WAI-E-001 | Human Collaboration | 超时处理 | 到期后按策略 default/fail/skip/manual，不静默继续。 | 0% | W8 | RT/QA | 需状态机合同测试。 |
| NOT-C-001 | Notifications | 领域通知 | 由 Event Projection 创建独立 NotificationItem、sourceRef、target 和 dedupeKey。 | 25% | W10 | BE/FE | UI Toast 有，正式 Projection 缺失。 |
| NOT-R-001 | Notifications | Toast Stack | 独立队列、最多 4 条、5/7/8 秒时长、错误和审批不自动关闭。 | 80% | W3 | FE/UI | 已实现并已推送。 |
| NOT-R-002 | Notifications | Notification Center | 查询历史、按 Workspace/类型/状态/时间过滤和打开目标。 | 0% | W10 | FE/BE | 仍缺持久中心。 |
| NOT-R-003 | Notifications | Attention Center | 聚合等待、审批、恢复、冲突、预算和权限事项。 | 0% | W11 | FE/BE/RT | 开放前 P0 表面。 |
| NOT-U-001 | Notifications | Read/Acknowledge | Read、Acknowledge、Dismiss Delivery 与 Resolve 来源事实严格分离。 | 10% | W10 | FE/BE | 当前只有 dismiss Toast。 |
| NOT-D-001 | Notifications | 清理 | 只清理已解决/已过期历史，未解决事项不得 Clear。 | 0% | W11 | BE/OPS | 依赖 Retention。 |
| NOT-E-001 | Notifications | 去重恢复 | Event 重放不重复创建；断线恢复不重复弹出已关闭普通 Toast。 | 0% | W10 | BE/FE/QA | 依赖事件游标。 |

## 13. P3：Workbench 页面和组件集成

本阶段必须区分“原型看起来完成”和“正式前端已经交付”。下表是从 UI Lab 向独立生产前端迁移的单条任务；UI Lab 的现有页面只能作为设计基准或 Mock 验收证据。

### 13.1 正式前端基础设施与集成任务

| 需求编号 | 一级功能 | 二级功能 | 功能描述 | 符合比率 | 时间 | 负责人 | 备注 |
|---|---|---|---|---:|---|---|---|
| FNT-ARCH-001 | 正式产品前端 | Production App Scaffold | 创建独立 `apps/workbench`（或等价正式应用），具备独立入口、构建、环境配置、错误边界和发布产物。 | 0% | W9 | FE | 当前只有 `apps/ui-lab`，不能计作正式应用。 |
| FNT-ARCH-002 | 正式产品前端 | Feature Boundaries | 按 Workspace、Canvas、Run、Approval、Recovery、Artifact、Environment、Extension、Automation、Settings 拆分模块。 | 5% | W9 | FE | 当前页面主要集中在 UI Lab。 |
| FNT-ARCH-003 | 正式产品前端 | UI Library Integration | 正式前端复用 `packages/seekwd-ui` 的 Token、Primitive、Node、Panel、Overlay 和 Notification，不复制组件实现。 | 70% | W9 | FE/UI | 组件库已有核心实现，尚未被正式应用消费。 |
| FNT-ROUTE-001 | 正式产品前端 | Typed Routes | 建立 Workspace、Canvas、Revision、Release、Run、NodeRun、Approval、Artifact、RecoveryCase 的类型化路由。 | 0% | W9 | FE | UI Lab 主要使用内存导航。 |
| FNT-ROUTE-002 | 正式产品前端 | Deep Link Restore | 刷新、重启和系统通知点击后恢复稳定 ID、Workspace 作用域和目标面板。 | 0% | W10 | FE | 依赖正式 Host 查询。 |
| FNT-DATA-001 | 正式产品前端 | HostClient Contract | 定义 Query/Command/Event 统一 `HostClient`，Mock Adapter 与 IPC/HTTP Adapter 实现同一 Schema。 | 25% | W9 | FE/BE | 有 UI Mock API，正式接口尚未冻结接入。 |
| FNT-DATA-002 | 正式产品前端 | Query Cache | 支持快照版本、游标、分页、筛选、失效、重新验证和字段投影。 | 0% | W10 | FE/BE | 当前列表数据不具备生产缓存语义。 |
| FNT-DATA-003 | 正式产品前端 | Command Store | 记录 commandId、expectedVersion、pending、accepted、approval_required、conflict、failed 和 completed。 | 10% | W10 | FE/BE | 当前仅有局部 Mock 操作状态。 |
| FNT-DATA-004 | 正式产品前端 | Event Subscription | 保存 Cursor，断线后执行 Snapshot Resync、增量恢复和 Event ID 去重。 | 5% | W10 | FE/BE/RT | 事件订阅尚未形成可运行闭环。 |
| FNT-STATE-001 | 正式产品前端 | State Separation | 分离 Domain Facts、Draft、Command、View、Debug 五类 Store。 | 15% | W9 | FE | UI Lab 仍有较多 React local state。 |
| FNT-STATE-002 | 正式产品前端 | Draft Conflict | 支持 Canvas Draft 自动保存、显式保存、版本冲突、三方合并、重新载入和放弃修改。 | 10% | W10 | FE/BE | 图编辑目前不具备服务端对账。 |
| FNT-STATE-003 | 正式产品前端 | Safe Local State | 仅持久化主题、布局、选区、缩放、筛选和最近导航，不持久化领域事实替代品。 | 5% | W9 | FE | 需要统一本地存储策略。 |
| FNT-FORM-001 | 正式产品前端 | Schema Forms | Workspace、Run、Policy、Approval、Automation 和 Settings 表单使用正式 Schema 校验。 | 10% | W10 | FE/BE | 当前多为页面级校验。 |
| FNT-AUTH-001 | 正式产品前端 | Permission-Aware UI | 根据 AuthorityProfile、Policy Decision、ApprovalGrant 和对象状态控制导航、按钮、字段及危险操作。 | 0% | W11 | FE/SEC | 目前无真实权限投影。 |
| FNT-ERR-001 | 正式产品前端 | Error Boundary | 统一处理 Host 崩溃、断网、权限不足、冲突、Schema 不兼容和恢复失败，并提供下一步动作。 | 0% | W10 | FE | 当前主要是局部提示。 |
| FNT-OFF-001 | 正式产品前端 | Offline/Stale | 明确显示 offline、stale、resync needed、last confirmed cursor 和未发送命令。 | 0% | W10 | FE/BE | 开放前必须通过断线验收。 |
| FNT-PAGE-001 | 正式产品前端 | Workspace Module | 将 Workspace 列表、详情、成员、策略、存储、备份和删除影响分析接入正式 Query/Command。 | 20% | W10 | FE | UI Lab 有展示和局部 Mock。 |
| FNT-PAGE-002 | 正式产品前端 | Canvas Module | 将 Canvas、Draft、Graph、Node、Port、Edge、Entrypoint、Validation 和 Inspector 接入正式状态分层。 | 25% | W10 | FE | 图编辑视觉基础已有，生产接入缺失。 |
| FNT-PAGE-003 | 正式产品前端 | Run Module | 提供 Run Launch、Monitor、History、NodeRun、日志、输入、Artifact 和状态原因。 | 10% | W11 | FE/RT | 当前 Run Panel 为演示级。 |
| FNT-PAGE-004 | 正式产品前端 | Approval/Recovery Module | 提供 Approval、Wait、RecoveryCase、Reconciliation、Compensation 和人工解决路径。 | 0% | W11 | FE/SEC/RT | 页面和命令均待建设。 |
| FNT-PAGE-005 | 正式产品前端 | Operations Modules | 将 Artifact、Environment、Extension、Automation、Files、Agents 和 Settings 页面接入真实适配器。 | 5% | W11 | FE/BE/EXT | 当前主要为 Mock 或静态页面。 |
| FNT-DESK-001 | 正式产品前端 | Desktop Shell | 建立 Tauri（或等价）桌面壳适配，隔离窗口、文件选择、系统通知和深链接。 | 0% | W12 | FE/BE | 当前无桌面 Host 壳实现。 |
| FNT-DESK-002 | 正式产品前端 | Native Adapters | 文件对话框、系统 Notification、剪贴板、外部链接和安全下载使用可替换适配器。 | 0% | W12 | FE | 不得在业务组件中直接调用平台 API。 |
| FNT-DESK-003 | 正式产品前端 | Background Lifecycle | 关闭窗口、锁屏、休眠和切换 Workspace 时正确显示后台 Run、未保存 Draft 和待审批状态。 | 0% | W12 | FE/RT | 依赖 Host 生命周期合同。 |
| FNT-I18N-001 | 正式产品前端 | Localization | 建立文案键、日期/数字/时区格式和中英文切换，错误码不得直接作为用户文案。 | 0% | W11 | FE/UX | UI 文案目前主要硬编码。 |
| FNT-A11Y-001 | 正式产品前端 | Accessibility | 正式前端通过键盘、焦点、语义标签、屏幕阅读器、缩放、高对比度和 reduced-motion 验收。 | 40% | W11 | FE/UI/QA | 组件有基础处理，页面尚未全面验收。 |
| FNT-PERF-001 | 正式产品前端 | Virtualization | Graph、Run Log、Artifact、Notification 和长列表支持虚拟化、分页、取消请求和内存预算。 | 5% | W12 | FE/QA | 当前数据规模为 Mock。 |
| FNT-TEST-001 | 正式产品前端 | Unit/Component | 为 Store、Adapter、路由守卫、表单、节点和关键页面建立自动化测试。 | 5% | W10 | FE/QA | 当前主要是 typecheck/build。 |
| FNT-TEST-002 | 正式产品前端 | Adapter Integration | 用 Mock Host 测试命令幂等、冲突、权限、事件乱序、断线和恢复。 | 0% | W11 | FE/BE/QA | 待 HostClient 冻结。 |
| FNT-TEST-003 | 正式产品前端 | Real Host E2E | 使用真实 Host 完成创建 Workspace、编辑 Draft、发布、运行、等待、恢复、取消和审计流程。 | 0% | W14 | FE/BE/RT/QA | 依赖 P1/P2。 |
| FNT-VIS-001 | 正式产品前端 | Visual Parity | 对比 UI Lab 和正式前端的 Light/Dark、响应式、弹层、通知、节点极端端口和滚动截图。 | 0% | W12 | FE/UI/QA | UI Lab 作为视觉基准，不作为产品替代。 |
| FNT-BUILD-001 | 正式产品前端 | Release Build | 生产构建注入版本和环境，支持 CSP、安全链接、崩溃诊断、更新、回滚和发布清单。 | 5% | W14 | FE/OPS/SEC | 当前只有 UI Lab 构建。 |
| FNT-OBS-001 | 正式产品前端 | Frontend Diagnostics | 记录性能、Adapter、渲染和恢复指标；日志默认脱敏且可关联 commandId/correlationId。 | 0% | W13 | FE/OPS | 依赖统一诊断规范。 |
| FNT-SEC-001 | 正式产品前端 | Frontend Security | 实施 CSP、外部链接白名单、HTML/Markdown 安全渲染、Secret/Token 脱敏和导出前再鉴权。 | 5% | W13 | FE/SEC | 生产前端必须独立验收。 |

### 13.2 Workbench 页面与 UI 组件任务

| 需求编号 | 一级功能 | 二级功能 | 功能描述 | 符合比率 | 时间 | 负责人 | 备注 |
|---|---|---|---|---:|---|---|---|
| FE-C-001 | Workbench | Shell | Titlebar、全局导航、Workspace 侧栏、Canvas、Inspector、Bottom Panel 分层稳定。 | 75% | W2 | FE/UI | UI Lab 已有工作台骨架。 |
| FE-R-001 | Workbench | Sidebar | Global actions、Workspaces、Recent、Settings 固定分区，中间内容可滚动。 | 80% | W2 | FE/UI | 已针对滚动和层级调整。 |
| FE-U-001 | Workbench | Workspace/Canvas 管理 | 重命名、删除、展开、收起、当前状态和节点预览。 | 65% | W2 | FE | UI local state + Mock，未接正式命令。 |
| WST-ARCH-001 | Workspace Tree | Tree Projection | 定义稳定 ID、层级、子项计数、运行聚合状态、Attention 和 Cursor 的 `WorkspaceTreeProjection`。 | 20% | W9 | FE/BE | Mock 有部分数据，没有正式 Projection。 |
| WST-R-001 | Workspace Tree | Layered Navigation | 展示 Workspace → Canvas → 按需 Node Preview，并区分 Files、Environments、Agents 等 Workspace 工具。 | 70% | W9 | FE/UI | 当前 WorkspaceNavigation 已可演示；其他 Workspace 子项仍硬编码。 |
| WST-R-002 | Workspace Tree | Selection & Deep Link | 以 workspaceId/canvasId/nodeId 选择和导航，支持刷新、重名对象和通知深链接恢复。 | 10% | W9 | FE | 当前大量操作仍按名称定位。 |
| WST-R-003 | Workspace Tree | Collapse/Recent | Workspaces、每个 Workspace、Canvas Node Preview 和 Recent 可独立收起，Settings 固定底部。 | 75% | W9 | FE/UI | 原型已实现主要折叠和滚动布局。 |
| WST-R-004 | Workspace Tree | Runtime Status | Canvas 显示正式 Run 聚合状态；Workspace 折叠时聚合子 Canvas，支持 reconciling/outcome_unknown。 | 45% | W10 | FE/RT | 原型只有 idle/running/waiting/error/success。 |
| WST-R-005 | Workspace Tree | Search & Scale | 搜索、固定、活动运行/待处理筛选，并对大型 Workspace/Canvas 集合增量加载或虚拟化。 | 5% | W10 | FE/BE | New Workspace 对话框有搜索，主树没有。 |
| WST-U-001 | Workspace Tree | Rename & Conflict | Workspace/Canvas/Node 使用稳定 ID 和 expectedVersion 重命名，显示冲突差异。 | 25% | W10 | FE/BE | 原型菜单存在，正式版本命令缺失。 |
| WST-U-002 | Workspace Tree | View State | 仅持久化展开、固定、排序、滚动和选择；运行、权限、Attention 来自 Host。 | 15% | W9 | FE | 当前展开主要是组件 local state。 |
| WST-U-003 | Workspace Tree | Move/Migrate | Canvas 跨 Workspace 移动走显式迁移、影响分析和审批，不以拖放静默完成。 | 0% | W11 | FE/BE/SEC | 尚未设计 UI 流程。 |
| WST-D-001 | Workspace Tree | Destructive Actions | 区分 Delete、Archive、Withdraw；执行前展示 Run、Trigger、Release、Artifact 和引用影响。 | 20% | W10 | FE/BE | 原型只有简化 DeleteImpact。 |
| WST-D-002 | Workspace Tree | Confirmed Removal | accepted 时显示 pending，等待事件确认后移除；失败、审批或冲突时保留位置和选择。 | 0% | W10 | FE/BE | 当前 local state 行为不能作为生产实现。 |
| WST-E-001 | Workspace Tree | Live Subscription | 多 Workspace 状态和 Attention 持续订阅，与 Notification/Attention/Run Monitor 使用同一 sourceRef。 | 10% | W10 | FE/BE/RT | 有 Mock 状态更新，无正式事件恢复。 |
| WST-E-002 | Workspace Tree | Offline/Resync | 断线标记 stale，Snapshot + Cursor 重同步后恢复实时状态，序列缺口不能显示为空树。 | 0% | W10 | FE/BE | 正式恢复链路缺失。 |
| WST-A11Y-001 | Workspace Tree | Keyboard & Screen Reader | 上下导航、左右展开、Enter 打开、菜单动作、焦点和 aria-expanded 完整可用。 | 50% | W10 | FE/UI/QA | 原型有 aria-expanded，但缺完整 Tree 键盘模型。 |
| WST-PERF-001 | Workspace Tree | Scale Test | 100 Workspace × 100 Canvas、实时状态更新和长名称下保持滚动与操作响应。 | 0% | W12 | FE/QA | 尚无规模测试。 |
| FE-C-002 | Canvas | Agent Composer | Draft 阶段选择 Workspace；Active 阶段锁定上下文；支持附件和结构化引用。 | 55% | W3 | FE/AG | 输入框和 workspace scope 已有，结构化 Agent 合同缺失。 |
| FE-R-002 | Canvas | Run Output | 展示日志、节点进度、Artifact、Approval、Input Request 和状态原因。 | 30% | W4 | FE/RT | 现有 RunPanel 简化。 |
| FE-C-003 | Canvas | Entrypoint Panel | Default/Named Entrypoint、Trigger、测试输入和调用方。 | 0% | W7 | FE/BE | 需先完成 API。 |
| FE-C-004 | Canvas | Validation Panel | 错误/警告摘要、定位、修复和运行阻断原因。 | 20% | W4 | FE/BE | 目前主要依赖节点状态。 |
| FE-C-005 | Canvas | Revision/Release | Draft 保存、Revision History、Diff、Publish、Deprecate、Withdraw。 | 0% | W8 | FE/BE | 页面缺失。 |
| FE-R-003 | Canvas | Cross-Canvas Trace | 父子 Run、Invocation、映射、投递、去重和取消传播。 | 0% | W11 | FE/RT | 页面缺失。 |
| UI-C-001 | Component Library | Primitive | Button、TextField、Switch、Checkbox、Menu、Dialog、Tooltip、Notification 有统一无障碍语义。 | 80% | W1 | UI/QA | 组件已较完整，需全面合同测试。 |
| UI-U-001 | Component Library | Motion | reduced-motion、进入/退出一致路径、可打断和不抖动。 | 65% | W2 | UI/UX | 基础 CSS 已有，需视觉回归。 |
| UI-R-001 | Component Library | Responsive | 320px–1440px 无横向溢出，Inspector/Bottom Panel 按断点转抽屉。 | 55% | W3 | UI/FE/QA | 部分已测试。 |
| UI-V-001 | Component Library | Visual Regression | Light/Dark/High Contrast/Reduced Transparency 截图和像素差异门禁。 | 0% | W4 | QA/UI | 需要 Playwright/截图基线。 |

## 14. P3：Artifact、Evidence、Lineage 与交付

| 需求编号 | 一级功能 | 二级功能 | 功能描述 | 符合比率 | 时间 | 负责人 | 备注 |
|---|---|---|---|---:|---|---|---|
| ART-C-001 | Artifact | 登记 | 节点、用户导入或系统生成内容登记 Artifact、Digest、类型、敏感度和来源。 | 10% | W7 | BE/RT | Mock Run 有简单 artifacts。 |
| ART-R-001 | Artifact | Browser | 按 Workspace/Run/Node/类型/敏感度查看、预览、搜索和血缘。 | 10% | W10 | FE/BE | Files 页面只是演示数据。 |
| ART-U-001 | Artifact | 新版本 | 内容变化创建新 ArtifactRevision，不覆盖历史文件事实。 | 0% | W8 | BE | 需存储和 Lineage。 |
| ART-D-001 | Artifact | 删除归档 | 检查 Run、Evidence、Skill、Release 和交付引用后按保留策略清理。 | 0% | W11 | BE/OPS | 依赖 Retention。 |
| ART-E-001 | Artifact | Export/Delivery | 导出、下载、复制、发送前执行 DataExportBoundary 和审批。 | 0% | W12 | FE/BE/SEC | 高风险功能。 |
| EVD-C-001 | Evidence | 生成 | Observation/Verification 产生不可变 Evidence，绑定 NodeRun、工具版本和时间。 | 0% | W8 | RT/BE | 设计有，代码无。 |
| EVD-R-001 | Evidence | 反查 | 从成功标准、Artifact、Run 和 Audit 反查 Evidence。 | 0% | W10 | FE/BE | 页面缺失。 |
| EVD-U-001 | Evidence | 纠正 | Evidence 不可修改，纠正通过新 Evidence + supersedes。 | 0% | W9 | BE/QA | 合同测试要求。 |
| LIN-R-001 | Lineage | 数据血缘 | 追踪输入、映射、节点输出、Artifact 消费方和敏感数据传播。 | 0% | W10 | RT/FE | 页面缺失。 |

## 15. P4：权限、Policy、Approval、Budget 与 Secrets

| 需求编号 | 一级功能 | 二级功能 | 功能描述 | 符合比率 | 时间 | 负责人 | 备注 |
|---|---|---|---|---:|---|---|---|
| POL-C-001 | Policy | AuthorityProfile | 从 Restricted 模板创建文件、进程、网络、Secret、环境、委派、导出和后台策略。 | 0% | W9 | SEC/BE | 只有设计。 |
| POL-R-001 | Policy | Policy 页面 | 展示规则继承、最终交集、allow/deny 原因和影响对象。 | 0% | W10 | FE/SEC | 页面缺失。 |
| POL-R-002 | Policy | Simulator | 输入 Node/Entrypoint/Resource/Profile，解释放行、拒绝和收紧路径。 | 0% | W11 | FE/SEC | 试点必需。 |
| POL-U-001 | Policy | Policy 版本 | 修改创建新版本；活动 Run 使用 PolicySnapshot，不被新策略改写。 | 0% | W9 | SEC/BE | 合同已定义。 |
| POL-D-001 | Policy | 归档 | 被引用 Policy 只能 Archive/Revoke。 | 0% | W10 | SEC/BE | 需影响分析。 |
| APR-C-001 | Approval | 请求 | 包含 Before/After、资源、调用链、期限、敏感度、预算和风险。 | 0% | W9 | SEC/BE | 页面缺失。 |
| APR-R-001 | Approval | Inbox | Global/Workspace/Run 筛选、详情、排序、期限和主操作。 | 0% | W10 | FE/SEC | P0 UI 缺口。 |
| APR-U-001 | Approval | 决策 | Allow once、Allow bounded、Deny、Request changes、Withdraw。 | 0% | W10 | FE/BE/SEC | 禁止 Allow all。 |
| APR-D-001 | Approval | 终态 | 不物理删除，使用 approved/denied/expired/withdrawn。 | 0% | W10 | BE | 审计保留。 |
| GRT-C-001 | Approval | Grant | 生成绑定资源、动作、期限、主体、预算和摘要的 Grant。 | 0% | W10 | SEC/BE | 设计有。 |
| GRT-D-001 | Approval | Revoke | 吊销 Grant，展示受影响 Run、NodeRun 和后续动作。 | 0% | W11 | SEC/RT | 状态不能简单复制为 NodeRun。 |
| BGT-C-001 | Budget | 创建 | Global/Workspace/Goal/Run/Agent Budget，配置硬上限和软告警。 | 0% | W9 | SEC/BE | 设计有，代码无。 |
| BGT-R-001 | Budget | Usage | 查看费用、Token、时间、并发、存储、网络和外部调用归因。 | 0% | W11 | FE/BE | 页面缺失。 |
| BGT-E-001 | Budget | 超限 | 接近上限告警，达到上限后等待、停止或审批，不能静默继续。 | 0% | W10 | RT/SEC | 需 Runtime 集成。 |
| SEC-C-001 | Secrets | 添加 | 添加 SecretRef、Purpose、ConsumerScope 和 Provider，不保存明文到普通 DB。 | 0% | W10 | SEC/BE | 设计有，代码无。 |
| SEC-R-001 | Secrets | 查看 | 只显示名称、版本、用途、消费者、到期和健康。 | 0% | W11 | FE/SEC | 禁止显示明文。 |
| SEC-U-001 | Secrets | Rotate | 新版本轮换，展示受影响绑定和测试结果。 | 0% | W12 | SEC/BE | 依赖 Provider。 |
| SEC-D-001 | Secrets | Revoke | 吊销 Secret，历史 Run 保留引用事实而非明文。 | 0% | W12 | SEC/BE/RT | 需运行中影响处理。 |

## 16. P4：受限执行器、Worker 与副作用恢复

| 需求编号 | 一级功能 | 二级功能 | 功能描述 | 符合比率 | 时间 | 负责人 | 备注 |
|---|---|---|---|---:|---|---|---|
| EXE-C-001 | Executor | LocalRestricted | 只读 Workspace、禁网络、禁止工作区外文件、CPU/Memory/Time/Output 限制。 | 0% | W12 | WK/SEC | 当前只有设计，不能宣称可安全执行。 |
| EXE-C-002 | Executor | 进程生命周期 | 创建、提交、启动、取消、超时、退出码和 stdout/stderr 限制。 | 0% | W12 | WK/RT | Worker Gateway 未实现。 |
| EXE-R-001 | Executor | Handle | 查询 ExecutionHandle、PID/Provider、租约、能力和最新心跳。 | 0% | W13 | WK/RT | 依赖 Host 持久化。 |
| EXE-U-001 | Executor | Cancel | 发出取消请求后区分已取消、待确认、执行完成和结果未知。 | 0% | W13 | WK/RT/QA | 不能把请求当事实。 |
| EXE-D-001 | Executor | Cleanup | 清理 Context、临时目录、进程、租约和输出，失败进入 BackgroundJob/Recovery。 | 0% | W14 | WK/OPS | 需幂等清理。 |
| EFF-C-001 | Side Effects | Effect Profile | 为纯计算、文件写入、SSH、浏览器、远程 API、删除定义重试/幂等/对账分类。 | 0% | W12 | RT/SEC | 必须冻结。 |
| EFF-R-001 | Side Effects | Effect Receipt | 记录 Intent、Handle、Receipt、幂等键、目标和证据。 | 0% | W13 | RT/BE | 设计有，代码无。 |
| EFF-E-001 | Side Effects | Reconciliation | 响应丢失进入 orphaned/reconciling，耗尽后 outcome_unknown。 | 0% | W14 | RT/WK/QA | P0 开放阻塞。 |
| EFF-E-002 | Side Effects | Compensation | 补偿/前向修复是新动作，不能伪造现实世界回滚。 | 0% | W15 | RT/SEC/AG | 需 Recovery Center。 |

## 17. P5：Artifact、Environment、Capability 与 Provider

| 需求编号 | 一级功能 | 二级功能 | 功能描述 | 符合比率 | 时间 | 负责人 | 备注 |
|---|---|---|---|---:|---|---|---|
| ENV-C-001 | Environments | 发现 | 扫描 LocalRestricted、Container、Remote 等环境及依赖。 | 15% | W3 | FE | UI 有环境卡片，不是真实扫描。 |
| ENV-R-001 | Environments | 列表详情 | 健康、依赖、使用者、限制、权限和最近执行。 | 25% | W3 | FE | 页面是 Mock。 |
| ENV-U-001 | Environments | 绑定升级 | 修改环境创建新版本，活动 Run 继续使用 Snapshot。 | 0% | W13 | BE/WK | 需 ExecutionContext。 |
| ENV-D-001 | Environments | 删除 | 展示活动 Context、Run、缓存和磁盘影响，清理失败进入 Job。 | 0% | W14 | BE/OPS/WK | 高风险。 |
| ENV-E-001 | Environments | Health Check | 最小权限测试环境和能力可用性。 | 0% | W13 | WK/SEC | 不能只显示 Active。 |
| CAP-C-001 | Capabilities | 注册 | Builtin/Extension/Workspace/Generated Capability 注册版本、Provider、Contract 和 Trust。 | 0% | W15 | EXT/AG | 只有设计。 |
| CAP-R-001 | Capabilities | Catalog | 搜索能力、来源、版本、适配器、权限、环境和健康。 | 0% | W15 | FE/EXT | 页面缺失。 |
| CAP-U-001 | Capabilities | 信任 | observed/verified/managed Trust 变更记录证据。 | 0% | W16 | SEC/EXT | 需审计。 |
| CAP-D-001 | Capabilities | 禁用 | 已引用版本 Disable/Deprecate，不破坏历史 Snapshot。 | 0% | W16 | EXT/BE | 依赖版本。 |
| PRV-C-001 | Providers | 连接 | 配置 Model/Service Endpoint、CredentialRef、数据边界和默认路由。 | 0% | W15 | SEC/AG | 当前 UI 无 Provider 页面。 |
| PRV-R-001 | Providers | 详情 | 能力、上下文限制、价格、健康和数据策略。 | 0% | W16 | FE/AG | 页面缺失。 |
| PRV-U-001 | Providers | 路由 | 修改模型、限额、默认值和允许 Workspace。 | 0% | W16 | FE/AG/SEC | 需 Budget 集成。 |
| PRV-D-001 | Providers | 断开 | 撤销凭据绑定，展示受影响 Agent、Automation 和 Run。 | 0% | W17 | SEC/BE | 需影响分析。 |
| PRV-E-001 | Providers | Agent Gateway | 本地构造经数据边界过滤的 ContextPacket，调用云端或本地模型并接收结构化提案。 | 0% | W16 | AG/SEC/BE | 云模型不直接连接 Worker。 |
| PRV-E-002 | Providers | Structured Output | Plan/GraphPatch/RunPatch/CommandRequest 通过 Schema、版本、Graph、Policy 和 Budget 校验。 | 0% | W16 | AG/BE/SEC | 自然语言只作解释。 |
| PRV-R-002 | Providers | Invocation Disclosure | 展示 Provider、Model、发送数据类别、Token/成本、保留策略和 AgentInvocation。 | 0% | W16 | FE/AG/SEC | 用户必须知道哪些数据离开本机。 |

## 18. P5：Extension 与 Node Definition

| 需求编号 | 一级功能 | 二级功能 | 功能描述 | 符合比率 | 时间 | 负责人 | 备注 |
|---|---|---|---|---:|---|---|---|
| EXT-C-001 | Extensions | 安装 | 预览来源、签名、Manifest、权限、执行器和依赖后安装。 | 35% | W3 | FE/EXT | UI 有 Install Mock。 |
| EXT-R-001 | Extensions | Catalog | 搜索、过滤、版本、Publisher、健康、更新和使用对象。 | 55% | W3 | FE | 页面已有基础目录。 |
| EXT-R-002 | Extensions | Permissions | 独立查看文件/网络/Secret/Environment/Process 权限和变化。 | 45% | W3 | FE/SEC | 入口和通知已有，缺真实 Manifest。 |
| EXT-U-001 | Extensions | 启停 | 禁用后新 Run 不得解析；活动 Run 按策略处理。 | 45% | W3 | FE/BE/RT | UI local state，缺 Runtime 影响。 |
| EXT-U-002 | Extensions | 更新 | Before/After Manifest、兼容性、迁移和调用方影响。 | 25% | W7 | EXT/SEC/FE | UI 只有按钮反馈。 |
| EXT-D-001 | Extensions | 卸载 | 显示 Canvas/Release/Automation/Environment/历史 Run 影响。 | 30% | W7 | EXT/BE | 当前 UI 直接更新状态。 |
| EXT-E-001 | Extensions | 健康检查 | 在受限 Context 中验证 Extension 和 Node Definition。 | 0% | W15 | EXT/WK/SEC | 依赖执行器。 |
| NDF-C-001 | Node Definitions | Studio | 创建 Schema、Config、Ports、Executor、Policy、副作用和测试夹具。 | 0% | W16 | EXT/FE | 页面缺失。 |
| NDF-R-001 | Node Definitions | Catalog | 版本、来源、兼容性、权限、副作用和合同测试状态。 | 20% | W16 | FE/EXT | 设计已有。 |
| NDF-U-001 | Node Definitions | 发布版本 | 内容变化发布新 SemVer，不覆盖旧版本。 | 0% | W17 | EXT/BE | 依赖 Release。 |
| NDF-D-001 | Node Definitions | 撤回 | 已引用 Definition 只能 Deprecate/Withdraw。 | 0% | W18 | EXT/BE/QA | 历史 Snapshot 可读。 |
| NDF-V-001 | Node Definitions | 合同测试 | 状态、取消、权限、幂等、Lineage、组合图和资源限制测试。 | 0% | W18 | EXT/QA | 标准库治理门禁。 |

## 19. P5：Agent、Context、Memory 与 Skill

| 需求编号 | 一级功能 | 二级功能 | 功能描述 | 符合比率 | 时间 | 负责人 | 备注 |
|---|---|---|---|---:|---|---|---|
| AGT-C-001 | Agent | Agent Connection | 连接 Agent，定义身份、协议、能力、Authority Ceiling、预算和取消。 | 0% | W16 | AG/SEC/FE | UI 只有单个 Agents Mock。 |
| AGT-R-001 | Agent | Agent 状态 | 健康、能力、当前任务、信任、预算和最近错误。 | 25% | W3 | FE | 页面是演示。 |
| AGT-U-001 | Agent | 限权 | 修改范围、预算、模型、并发和 Workspace 作用域。 | 0% | W16 | AG/SEC | 不允许隐式升权。 |
| AGT-D-001 | Agent | Revoke | 撤销 Agent 后禁止新委派，活动任务进入取消/恢复策略。 | 0% | W17 | AG/SEC/RT | 高风险。 |
| AGT-E-001 | Agent | 委派 | 结构化任务、父子 ID、输入/输出 Schema、取消和验证。 | 0% | W17 | AG/RT | 不能使用自然语言事实。 |
| AGT-E-002 | Agent | 探索 | 在权限、预算和环境上限内发现能力，结果可审计。 | 0% | W17 | AG/SEC | 需 Capability Service。 |
| AGT-E-003 | Agent | Prompt-to-Run | Composer 自然语言转换为 Goal、Plan、Canvas/GraphPatch、Revision、StartRun 和验证循环。 | 10% | W17 | AG/RT/FE | UI 有 Composer，正式 Agent Runtime 未实现。 |
| AGT-E-004 | Agent | Autonomous Loop | 在授权和预算内自动建图、运行、测试、调试、修复和重试，直到成功、阻塞或停止。 | 0% | W18 | AG/RT/WK | 每轮必须有结构化事实。 |
| AGT-P-001 | Agent | Escalation | 文件范围、网络、Secret、环境、预算、外部主体和不可逆副作用变化时暂停并请求审批。 | 0% | W18 | AG/SEC/RT | 禁止隐式升权。 |
| AGT-K-001 | Agent | Human Control | 用户可暂停、继续、修改目标、限制预算、接管和终止 AgentInvocation。 | 0% | W18 | AG/RT/FE | 终止 Agent 不等于外部动作已取消。 |
| AGT-O-001 | Agent | Invocation Trace | 保存 ContextRef、模型调用、提案、命令、Observation、Evidence、成本和停止原因。 | 0% | W18 | AG/BE/FE | 支持调试与审计。 |
| CTX-C-001 | Agent | Context Source | 添加 File、Web、Artifact、Memory、Run 或文本结构化引用。 | 35% | W3 | FE/AG | Composer scope/附件部分存在。 |
| CTX-R-001 | Agent | Context Manager | 来源、信任、新鲜度、敏感度、作用域和消费者。 | 0% | W16 | FE/AG | 页面缺失。 |
| CTX-U-001 | Agent | 裁剪 | 限制范围、刷新、固定版本和修改信任。 | 0% | W17 | AG/SEC | 需 Context Service。 |
| MEM-C-001 | Agent | Memory | 从成功验证 Run 提议 Memory，记录来源、敏感度和置信度。 | 0% | W18 | AG/BE | 只有设计。 |
| MEM-R-001 | Agent | Memory 查看 | 来源、消费者、置信、过期和数据边界。 | 0% | W18 | FE/AG | 页面缺失。 |
| SKL-C-001 | Agent | Skill 提升 | 脱敏、接口、权限、测试、回归样本后提升为 Skill。 | 0% | W19 | AG/SEC/QA | 不得自动提升。 |
| SKL-U-001 | Agent | Skill 版本 | 变更发布新版本，旧版本可追溯和撤回。 | 0% | W19 | AG/BE | 依赖 Node/Release。 |

## 20. P5：Cross-Canvas 与跨 Workspace

| 需求编号 | 一级功能 | 二级功能 | 功能描述 | 符合比率 | 时间 | 负责人 | 备注 |
|---|---|---|---|---:|---|---|---|
| XCV-C-001 | Canvas Composition | Call Node | 引用目标 Canvas/Release/Entrypoint，配置输入输出映射和版本约束。 | 0% | W8 | FE/RT | 设计有，UI/Runtime 无。 |
| XCV-C-002 | Canvas Composition | Call and Wait | 子 Run 完成前父 Run 等待，超时和取消传播有明确策略。 | 0% | W9 | RT/BE | 依赖投递语义。 |
| XCV-C-003 | Canvas Composition | Fire and Continue | 创建独立子 Run，父 Run 不等待但保留追踪和失败策略。 | 0% | W9 | RT/BE | 需 Ownership。 |
| XCV-R-001 | Canvas Composition | Trace | 父子 Run、Invocation、Delivery、去重、映射和状态。 | 0% | W11 | FE/RT | 页面缺失。 |
| XCV-U-001 | Canvas Composition | 目标更新 | 修改目标通过 GraphPatch，重新做接口/权限/循环检查。 | 0% | W10 | FE/BE/RT | 不允许直接改名称。 |
| XCV-D-001 | Canvas Composition | 删除保护 | 删除 Release/Entrypoint 前展示调用方，阻止悬空引用。 | 0% | W10 | BE/FE | 需 ImpactAnalysis。 |
| XCV-V-001 | Canvas Composition | 循环检测 | 静态检测直接循环，运行时限制动态深度、重复链和预算。 | 0% | W10 | RT/QA | P1 试点门禁。 |

## 21. P6：Recovery、Audit、Retention、Backup 与 Migration

| 需求编号 | 一级功能 | 二级功能 | 功能描述 | 符合比率 | 时间 | 负责人 | 备注 |
|---|---|---|---|---:|---|---|---|
| RCV-C-001 | Recovery | RecoveryCase | Handle lost、cancel_pending、orphaned、outcome_unknown 时自动创建。 | 0% | W14 | RT/BE | P0 开放阻塞。 |
| RCV-R-001 | Recovery | Recovery Center | 展示副作用、Handle、对账证据、风险、阻断下游和可行处置。 | 0% | W15 | FE/RT | 页面缺失。 |
| RCV-U-001 | Recovery | Resolution | 继续对账、声明结果、补偿、前向修复或终止，每项均追加事实。 | 0% | W15 | RT/SEC/FE | 不能改写原结果。 |
| RCV-D-001 | Recovery | 归档 | 未解决 Case 不可删除，解决后按审计策略归档。 | 0% | W16 | OPS/BE | 依赖 Retention。 |
| AUD-C-001 | Audit | 追加事件 | Command、Decision、Patch、Grant、导出、危险删除和状态转移追加审计。 | 0% | W3 | BE/SEC | 当前无正式 Audit Store。 |
| AUD-R-001 | Audit | Event Explorer | 游标、聚合、主体、对象、命令、事件和时间筛选。 | 0% | W11 | FE/BE | 页面缺失。 |
| AUD-R-002 | Audit | 导出 | 生成带 Schema、Digest、Lineage 和脱敏摘要的审计导出。 | 0% | W16 | FE/SEC/OPS | 依赖 Export Review。 |
| AUD-U-001 | Audit | 纠正 | 审计事件不可修改，纠正使用追加事件。 | 0% | W4 | BE/QA | 合同门禁。 |
| RET-C-001 | Operations | Retention | Workspace 级保留策略覆盖 Notification、Log、Artifact、Evidence、Run 和审计。 | 0% | W16 | OPS/BE | 设计有。 |
| RET-R-001 | Operations | Storage | 占用、保留、引用、GC 候选、加密和 Legal Hold。 | 0% | W17 | FE/OPS | 页面缺失。 |
| RET-E-001 | Operations | GC | Dry Run、确认、可恢复清理、失败重试和审计报告。 | 0% | W18 | OPS/BE/QA | 不能删除活动引用。 |
| BAK-C-001 | Operations | Backup | 加密备份 Workspace 配置、Revision、Artifact 元数据和 Secret Metadata。 | 0% | W18 | OPS/BE/SEC | 当前无实现。 |
| BAK-R-001 | Operations | Restore Point | 查看大小、范围、验证状态、版本和最近恢复点。 | 0% | W19 | FE/OPS | 页面缺失。 |
| BAK-E-001 | Operations | Restore | 预检版本、路径、冲突、权限、空间后恢复到新目录或 Workspace。 | 0% | W20 | OPS/BE/QA | 必须可演练。 |
| MIG-C-001 | Operations | MigrationJob | 版本、数据库、Canvas、Extension 和 Definition 迁移均使用可恢复 Job。 | 0% | W18 | BE/OPS | 当前无 Host。 |
| MIG-R-001 | Operations | Migration Center | 展示来源/目标版本、风险、阻塞、进度和失败对象。 | 0% | W19 | FE/OPS | 页面缺失。 |
| MIG-E-001 | Operations | Preflight/Rollback | 迁移前备份和预检，失败回滚到明确 Checkpoint。 | 0% | W20 | OPS/QA | 开放前门禁。 |
| DIA-C-001 | Operations | Support Bundle | 选择组件和时间，预览脱敏信息后生成诊断包。 | 0% | W19 | OPS/SEC | 不得自动上传。 |

### 21.1 分发、安装、更新与用户使用

| 需求编号 | 一级功能 | 二级功能 | 功能描述 | 符合比率 | 时间 | 负责人 | 备注 |
|---|---|---|---|---:|---|---|---|
| DST-ARCH-001 | Distribution | Desktop Bundle | 将 Workbench、Pong Host、LocalRestricted Worker、内置节点、迁移和默认策略打入签名桌面安装包。 | 0% | W14 | FE/BE/OPS | 当前只有 UI Lab Web 构建。 |
| DST-C-001 | Distribution | Installer | 提供 Windows 首版安装包，后续扩展 macOS/Linux；安装前校验签名、摘要、系统、权限和磁盘。 | 0% | W14 | OPS/FE/SEC | 需要正式桌面应用。 |
| DST-C-002 | Distribution | Initial Setup | 首次启动创建 Device Identity、应用数据目录、Host 租约、SQLite、迁移和默认 Restricted Policy。 | 0% | W14 | BE/OPS/SEC | 不创建云账户也可启动。 |
| DST-R-001 | Distribution | Release Manifest | 展示应用、Host、协议、Schema、迁移、Extension 兼容范围、摘要和变更说明。 | 0% | W15 | OPS/FE | 不能只依赖应用版本号。 |
| DST-U-001 | Distribution | Update Channels | Nightly/Beta/Stable/Enterprise 通道可切换并显示支持范围、迁移和回滚限制。 | 0% | W15 | OPS/FE | Stable 为默认。 |
| DST-U-002 | Distribution | Signed Update | 下载签名 Update Manifest 和 Bundle，验证后再安装；支持分批发布、暂停和撤回。 | 0% | W16 | OPS/SEC | 云端更新不可执行未签名包。 |
| DST-E-001 | Distribution | Preflight Update | 更新前检查活动 Run、Draft、RecoveryCase、磁盘、备份和迁移兼容性。 | 0% | W16 | OPS/RT/BE | 不得静默取消 Run。 |
| DST-E-002 | Distribution | Migrate and Recover | 安装后执行幂等迁移、Projection 重建、Host recovering 和健康检查；失败进入 repair/read-only。 | 0% | W16 | BE/OPS/QA | 数据迁移和代码回滚分开。 |
| DST-D-001 | Distribution | Uninstall | 卸载时明确保留/删除应用数据、Workspace、Artifact、Backup、Secret 引用和云端副本。 | 0% | W17 | OPS/FE/SEC | 不得误删用户目录。 |
| DST-C-003 | User Onboarding | Local-only | 无账户、断网和无云服务时完成创建 Workspace、建图、运行、Artifact 和恢复。 | 0% | W15 | FE/BE/RT/QA | 本地核心能力硬门。 |
| DST-C-004 | User Onboarding | Cloud AI | 用户连接云端模型后，通过 Local Agent Gateway 完成 Prompt、结构化提案、本地校验和 Run。 | 0% | W17 | FE/AG/BE/SEC | 云模型不能直接控制 Worker。 |
| DST-C-005 | User Onboarding | Sync/Backup | 用户按 Workspace/数据类型开启加密同步或备份，展示范围、大小、敏感度和保留策略。 | 0% | W17 | FE/BE/SEC | 登录不等于上传授权。 |
| DST-C-006 | User Onboarding | Team/Enterprise | 提供固定版本、离线安装、共享 Template/Release、设备管理和审计；实时多人编辑后置。 | 0% | W20 | PM/OPS/BE/SEC | 不把本地 Run 改成云端强依赖。 |
| DST-C-007 | Extensions | Developer Distribution | 提供 Extension SDK、隔离开发、合同测试、签名打包和公共/私有 Registry 发布。 | 0% | W18 | EXT/QA/OPS | 未签名扩展仅允许开发模式。 |
| DST-V-001 | Distribution | Supply Chain | 生成签名、SHA-256/BLAKE3、SBOM、provenance、依赖漏洞报告和可追溯构建。 | 0% | W15 | SEC/OPS/QA | Stable 发布硬门。 |
| DST-V-002 | Distribution | Recovery Drill | 演练升级中断、迁移失败、应用回滚、Host 崩溃、云端不可用和活动 Run 恢复。 | 0% | W18 | QA/OPS/BE/RT | 通过后才能进入 Pilot。 |

## 22. P6：测试与质量任务

| 需求编号 | 一级功能 | 二级功能 | 功能描述 | 符合比率 | 时间 | 负责人 | 备注 |
|---|---|---|---|---:|---|---|---|
| QA-C-001 | Quality | Schema Contract | TypeScript、Rust、SQLite、IPC Schema 的生成/等价合同测试。 | 0% | W1 | QA/BE | 当前只有 TS 类型和文档。 |
| QA-C-002 | Quality | State Contract | 所有正式状态合法转移和非法转移测试。 | 0% | W6 | QA/RT | 开放前必须完成。 |
| QA-C-003 | Quality | Graph Contract | 端口、边、循环、入口、映射、Patch 原子性和回滚测试。 | 20% | W5 | QA/BE/RT | UI 手工验证不计完整。 |
| QA-C-004 | Quality | Policy Contract | 默认 deny、路径规范化、网络、Secret、Budget 和权限升级测试。 | 0% | W12 | QA/SEC | P0 门禁。 |
| QA-C-005 | Quality | Recovery Contract | 断线、崩溃、重复命令、重复事件、游标过期、Handle 丢失和结果未知。 | 0% | W14 | QA/BE/RT/WK | 当前无正式执行器。 |
| QA-C-006 | Quality | Node Governance | 每个标准节点通过状态、取消、权限、幂等、Lineage 和组合图测试。 | 0% | W18 | QA/EXT | 标准库过大，必须分批治理。 |
| QA-U-001 | Quality | UI Component | 组件键盘、读屏、主题、Reduced Motion、响应式和截图回归。 | 35% | W4 | QA/UI | 已有 typecheck/build，缺自动截图门禁。 |
| QA-U-002 | Quality | UI Flow | Workspace/Canvas/Node/Run/Approval/Recovery/Notification 主流程。 | 20% | W11 | QA/FE | 当前主要是 UI Lab 手工检查。 |
| QA-E-001 | Quality | E2E Reference Lifecycle | 输入→节点→等待→Artifact→暂停→重启→恢复→取消→审计→验证完整重放。 | 0% | W20 | QA/RT/BE | 参考生命周期合同。 |
| QA-E-002 | Quality | Load | 千节点、千端口、万日志、千通知下的虚拟化、事件和筛选性能。 | 0% | W21 | QA/FE/RT | 依赖真实投影。 |
| QA-V-001 | Quality | Open Gate | 按开放门禁矩阵逐门提供实现证据、测试报告和已知限制。 | 10% | W22 | PM/QA | 当前仍 Internal Only。 |

## 23. 交付顺序与依赖

```text
P0 合同 / Schema / 追踪
  -> P1 Host / SQLite / Workspace / Canvas / Draft
  -> P1 Graph / Validation / Revision / Release
  -> P2 Runtime / State Machine / Scheduler
  -> P2 Worker / LocalRestricted / Artifact / Evidence
  -> P3 Workbench Host Integration / Run Monitor / Approval UI
  -> P4 Policy / Secrets / Budget / Recovery
  -> P5 Agent / GraphPatch / Extension / Capability
  -> P5 Automation / Cross-Canvas / Notification Center
  -> P6 Backup / Migration / Performance / Security / Pilot Gate
```

### 23.1 不可跳过的硬依赖

| 前置 | 后置 | 原因 |
|---|---|---|
| Identity/Version | Run | Run 必须冻结精确 Snapshot，不能只引用 Canvas 名称。 |
| Entrypoint | StartRun/Automation | 运行必须明确 Default 或 Named Entrypoint。 |
| State Registry | UI 状态/Notification | UI 不能自行解释 waiting、reconciling 和 outcome_unknown。 |
| GraphPatch | Agent 改图 | Agent 不得通过自然语言直接改 Draft。 |
| Authority/Policy | Worker/Extension/Agent | 没有权限边界不能开放执行器。 |
| Event/Cursor/Recovery | 长任务/后台运行 | 没有重连恢复不能宣称可靠状态。 |
| Artifact/Lineage | 导出/Skill | 没有来源和敏感度不能安全交付或复用。 |
| LocalRestricted | Pilot | 不能在没有受限执行器时开放任意任务。 |

## 24. 阶段出口条件

### P0 Exit

- 正式合同状态矩阵完成。
- 机器可读 Schema 可生成或有等价合同测试。
- 需求 ID、PR、测试和验收证据可追踪。
- 默认入口、状态机、GraphPatch、权限升级边界无未决冲突。

### P1 Exit

- Host 单实例可启动，SQLite 迁移可重复执行。
- Workspace、CanvasIdentity、Draft、Graph 命令可持久化。
- Command 幂等、版本冲突和 Event Store 可测试。
- Draft 可保存 Revision，但不可变性通过测试。

### P2 Exit

- StartRun 产生完整 RunSnapshot。
- Scheduler 能处理依赖、等待、暂停、恢复、取消和重试。
- NodeRun/Attempt 状态遵守统一状态机。
- Host 重启后能恢复等待和未完成内部动作。

### P3 Exit

- UI 不再把 local state 当领域事实。
- 独立正式前端应用已经可以构建并启动；主要页面使用 `HostClient` 的 Query/Command/Event，而不是只运行在 UI Lab 的内存 Mock 中。
- UI Lab、`seekwd-ui` 和正式前端的职责边界在代码目录、构建产物和测试报告中可验证。
- Canvas、Run、NodeRun、Artifact、Approval 和 Notification 使用 Query/Command/Event。
- 断线时不伪造成功，重连后快照和增量一致。
- Run Monitor、Validation、Revision/Release、Attention Center 有稳定入口。

### P4 Exit

- LocalRestricted 文件、网络、进程、资源和输出限制有实际强制证据。
- Permission/Approval/Grant/Budget 与 Runtime 联动。
- EffectReceipt、Reconciliation、RecoveryCase 可处理结果未知。
- Artifact/Evidence/Lineage 可追溯并遵守保留策略。

### P5 Exit

- Agent 只能提交结构化 Plan/GraphPatch/RunPatch。
- Extension 和 Node Definition 有签名、Manifest、权限和合同测试。
- Automation 和 Cross-Canvas 具备去重、超时、取消和循环规则。
- Notification Center/Attention Center 可持久查看和处理事项。

### P6 Exit

- 备份可恢复，迁移可回滚，诊断包可脱敏。
- 故障、恢复、重复事件、乱序、性能和安全测试通过。
- 开放门禁矩阵中的每项都有证据。
- 产品文案不得把 Internal Only/Pilot 功能宣称为 Open。

## 25. 风险与当前需要决策的事项

| 风险/决策 | 影响 | 决策要求 |
|---|---|---|
| 文档描述的 Rust/Host 与当前 checkout 不一致 | 会误报完成度和排期 | 先确认是否缺少未同步代码仓库；在确认前按 0% 生产实现统计。 |
| UI 原型被误当作正式前端 | App.tsx/local state 会继续膨胀，后端接入、路由、权限、恢复和发布被迫重写 | 保留独立 UI Lab；P3 必须创建正式前端并通过 HostClient、路由、事件恢复和 E2E 门禁。 |
| UI Lab 直接使用 local state | 后端接入时可能推翻交互 | P3 前统一通过 Mock API/Host Adapter。 |
| `primaryNodeId` 旧字段仍存在 | 多入口模型会被错误简化 | 先完成迁移为 `defaultEntrypointId`。 |
| Mock `startRun(canvasId)` 过于简单 | UI 契约与正式运行不一致 | P0 冻结 `StartRunInput`，再重写 Mock。 |
| DeleteImpact 过于简单 | 删除可能破坏引用和历史 | 先实现服务端 ImpactAnalysis。 |
| 没有真实执行器 | 无法验证取消、结果未知和权限边界 | LocalRestricted 是 Pilot 前硬门。 |
| 标准节点数量过大 | 测试和维护成本失控 | 每个节点绑定六类合同测试后才能标为可用。 |
| Attention Center 缺失 | 长任务和审批会丢失 | P3/P5 之间作为开放前 UI 硬门。 |

## 26. 负责人工作包汇总

| 负责人 | 主要工作包 | 关键出口 |
|---|---|---|
| PM | 范围、需求追踪、版本、开放声明和验收 | PRD/Issue/门禁一致 |
| UX | 页面 IA、对象上下文、异常路径、无障碍和响应式 | 页面闭环和设计验收 |
| FE | 独立正式应用、类型化路由、状态分层、HostClient、Workbench 功能模块、桌面壳和发布 | Query/Command/Event 驱动且真实 Host E2E 通过 |
| UI | UI Lab 原型、交互规范、Primitive、Node、Edge、Notification、主题和视觉基线 | 组件合同和视觉门禁，不代替正式前端 |
| BE | Host、SQLite、Command/Event、Projection、Identity/Version | 持久事实和恢复 |
| RT | Scheduler、State Machine、RunPatch、Cross-Canvas | 运行语义和状态合同 |
| WK | LocalRestricted、Executor、Handle、Cancel、Reconcile | 真实受控执行 |
| AG | Goal/Plan、Capability、GraphPatch、Repair、Memory/Skill | 结构化 Agent 闭环 |
| SEC | Authority、Policy、Approval、Grant、Secrets、Export | 默认 deny 和权限升级阻断 |
| EXT | Manifest、Node SDK、Definition、Capability、发布/撤回 | 扩展治理和合同测试 |
| OPS | Backup、Migration、Retention、Health、Diagnostics | 可恢复运行和发布支持 |
| QA | 合同、状态、故障、E2E、性能、安全和开放门禁 | 可复现证据 |

## 27. 进度更新规则

1. 每条任务必须链接至少一个代码变更、测试或设计决策。
2. 只有静态页面、类型、Mock 数据或文档不能把任务标为 75% 以上。
3. 进入 90% 前必须有自动化测试和异常路径证据。
4. 进入 100% 前必须通过对应阶段出口和开放门禁。
5. 发现实现与合同冲突时，先标记为 `blocked`，不得通过降低需求描述来提高完成度。
6. 新增实现先在[需求证据台账](34-requirement-evidence-ledger.md)记录需求 ID、合同、前置条件与验收用例；提交后回填提交哈希、测试结果和剩余缺口。旧条目的百分比未经复核不作为当前进度。

## 28. UI 原型到正式前端的迁移清单

| 步骤 | 必须交付 | 完成判定 |
|---|---|---|
| 1 | 冻结 UI Lab 页面、组件、交互状态、响应式和视觉截图 | UI/UX/PM 签署验收基线，异常状态也有截图或交互证据 |
| 2 | 抽取并稳定 `packages/seekwd-ui` | Primitive、Node、Panel、Overlay、Notification 有类型、无障碍和主题测试 |
| 3 | 创建正式 `apps/workbench` | 可独立安装、启动、构建和生成版本化产物 |
| 4 | 接入 Mock HostClient | Mock 与正式 Schema 一致，支持成功、冲突、审批、断线和恢复场景 |
| 5 | 迁移功能模块与类型化路由 | Workspace/Canvas/Run/Approval/Recovery 等页面不依赖 UI Lab 内存导航 |
| 6 | 切换 IPC/Host Adapter | 替换适配器不改变页面领域语义和命令输入结构 |
| 7 | 接入事件恢复和权限 | Cursor、Snapshot、增量事件、Policy、Approval 和 Error Boundary 可验证 |
| 8 | 完成真实 Host E2E 与视觉回归 | 通过端到端核心流程、断线恢复、权限矩阵和 UI Lab 对比 |
| 9 | 保留 UI Lab 作为设计试验台 | UI Lab 继续可运行，但发布说明明确它不是生产应用 |
6. 每周更新完成度、实际负责人、风险、依赖和下一步，不修改历史已验收记录。
7. 任务被拆分时保留原编号，并增加 `.1`、`.2` 子任务，禁止复用已发布编号。
