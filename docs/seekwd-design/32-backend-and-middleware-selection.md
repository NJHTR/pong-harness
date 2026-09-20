# Seekwd / Pong Harness 后端与中间件选型

> 文档类型：Technology Selection / Architecture Decision  
> 文档状态：Provisional Contract  
> 最后更新：2026-09-20  
> 适用阶段：Internal Validation、Pilot 之前的正式实现准备  
> 关联文档：[系统拆分与流程模型](31-system-decomposition-and-process-model.md)、[技术栈决策](25-implementation-blueprint/01-stack-decision.md)、[Host IPC 实现](25-implementation-blueprint/05-host-ipc-implementation.md)

## 1. 选型结论

### 1.1 产品部署模型：本地权威，选择性云服务

Seekwd 是桌面应用，不是由云端 API 驱动的 SaaS。系统必须区分两个后端边界：

```text
Local Application Backend
  pong-host + SQLite + Artifact Store + Runtime + Worker
  拥有 Workspace、Canvas、Run、Policy、Execution 和恢复事实

Optional Cloud Data Services
  Account/Entitlement + Catalog/Update + Opt-in Sync/Encrypted Backup
  只保存用户明确允许上传的数据和云服务自身事实
```

核心原则：

1. 本地 `pong-host` 是运行和工作数据的权威来源。
2. 云端数据服务不参与本地 Run 调度、NodeRun 状态、Worker 控制、权限判断、取消和恢复关键路径；云端 AI 模型可以通过本地 Agent Gateway 提出结构化 Plan、GraphPatch、RunPatch 和 CommandRequest，再由本地 Host 校验、授权和执行。
3. 未登录、断网、云服务故障或订阅过期时，本地创建、编辑、运行、恢复和查看历史仍可工作。
4. 云同步默认关闭，按 Workspace 和数据类别显式开启；“登录账户”不等于允许上传工作区数据。
5. 云端副本不能覆盖本地未提交 Draft；所有同步都使用版本、设备、Digest、游标和冲突记录。
6. Secret 明文、OS 凭据、ExecutionHandle 和本地权限 Grant 不上传云端。

#### 1.1.1 数据放置矩阵

| 数据类别 | 本地 | 云端默认 | 云端可选 | 规则 |
|---|---:|---:|---:|---|
| Workspace 文件和目录内容 | 必须 | 禁止 | 明确选择的加密备份/附件 | 不能因创建 Workspace 自动上传 |
| CanvasIdentity、Revision、Release | 必须 | 禁止 | Workspace 开启同步后 | 不可变对象按 ID + Digest 去重 |
| CanvasDraft | 必须 | 禁止 | 单独开启草稿同步 | 多设备冲突创建分支，不自动覆盖 |
| RunSnapshot、Run、NodeRun、Attempt | 必须 | 禁止 | 仅明确选择的历史备份/协作摘要 | 云端不调度、不改变运行状态 |
| 日志、Prompt、模型 Trace | 必须/按保留 | 禁止 | 明确选择且脱敏 | 默认视为敏感数据 |
| Artifact、Evidence、截图 | 必须 | 禁止 | 逐项上传、交付或加密备份 | 上传前显示大小、敏感度和目标 |
| Secret 明文、Token、SSH Key | OS Secret Store | 禁止 | 禁止 | 云端最多保存不可逆引用元数据 |
| 本地路径、ExecutionHandle、进程 ID | 必须 | 禁止 | 禁止 | 对其他设备没有合法语义 |
| AuthorityProfile/Policy | 必须 | 禁止 | 可同步模板，不同步本地 Grant | 新设备必须重新绑定资源并评估 |
| ApprovalGrant | 必须 | 禁止 | 禁止直接复用 | 与设备、资源、期限和 AuthoritySnapshot 绑定 |
| 用户账户、设备注册、订阅/License | 可缓存 | 云端权威 | 是 | 不得成为本地数据解密的唯一条件 |
| 应用更新 Manifest | 可缓存 | 云端权威 | 是 | 必须签名并可回滚 |
| 公共 Extension/Node Catalog | 可缓存 | 云端权威 | 是 | 安装后仍需本地完整性和权限检查 |
| Templates/公共 Skills | 可缓存 | 云端权威 | 是 | 导入本地后进入 Draft 和隔离验证 |
| 设置 | 本地权威 | 禁止 | 只同步非敏感偏好 | 权限和安全设置不自动跨设备扩大 |
| Telemetry/崩溃报告 | 本地生成 | 禁止 | 独立 opt-in | 上传前脱敏，不包含工作区内容 |

#### 1.1.2 云端代码与部署边界

云服务不放入 `pong-host`，建议独立目录：

```text
services/
  seekwd-cloud-api/          账户、设备、Entitlement、同步、Catalog API
  seekwd-cloud-worker/       加密备份、邮件/推送、清理和异步同步任务
crates/
  seekwd-cloud-contract/     本地 Host 与云服务共享的 Sync DTO/协议
  seekwd-sync/               本地同步客户端、Outbox/Inbox、冲突和加密
```

云端初期推荐 `Rust + Axum + PostgreSQL + S3-compatible Object Storage`。它与本地 Host 使用 HTTPS，长同步可使用 WebSocket/SSE，但云端不可通过该连接直接控制本地 Worker。云端初期同样使用 PostgreSQL Transactional Outbox，不需要 Kafka/Redis；规模证明需要后再增加。

#### 1.1.3 云端 AI 与本地执行的边界

云端 AI Provider 与“云端数据服务”不是同一个角色。云端模型可以参与目标理解、规划、建图、调试决策和下一步动作选择，但它不持有本机执行句柄。标准链路为：

```text
User Prompt
  -> Local Agent Composer
  -> pong-agent builds a policy-filtered ContextPacket
  -> Provider Gateway calls cloud/local model
  -> model returns structured Plan / GraphPatch / CommandRequest
  -> local Schema + Graph + Policy validation
  -> local Approval when required
  -> pong-host applies patch or accepts StartRun
  -> pong-runtime schedules local NodeRuns
  -> Worker executes and records Observation/Evidence
  -> pong-agent sends permitted result summary to model for next step
```

因此用户输入“帮我完成惠州项目后端开发”可以形成完整自动循环：澄清目标、扫描允许的项目上下文、创建 Canvas 和节点、保存 Revision、启动 Run、运行测试、读取结构化失败、提交 RunPatch/GraphPatch、再次运行并验证成功标准。对用户而言可以是一条连续任务，但内部每一步仍经过本地 Host。

“云端不能直接控制 Worker”的准确含义是：模型响应不能携带一段未经校验的自然语言或任意代码就获得本机权限。模型可以请求本地动作；本地 Host 必须将请求转换为带主体、作用域、版本、幂等键、权限快照、预算和审计的 Command。已授权的低风险循环可以自动执行，高风险或权限扩大动作进入 Approval。

### 1.2 首版推荐

| 层 | 推荐 | 结论 |
|---|---|---|
| 后端语言 | Rust stable | 作为 Pong Host、Core、Runtime、Policy、Worker 和受限执行器的主要实现语言 |
| 异步运行时 | Tokio | 任务调度、取消、超时、心跳、流和后台生命周期 |
| Host 入口 | `pong-host` 独立进程 | 可信控制平面、持久化、IPC、恢复和服务组合的唯一入口 |
| 桌面桥接 | Tauri 2 + 薄 Rust Adapter | 只负责窗口、系统能力和连接 Host，不拥有业务事实 |
| 本地 IPC | Windows Named Pipe / Unix Domain Socket + 类型化 JSON-RPC 2.0 | 本地优先、可断线恢复、跨语言易调试；不开放公网端口 |
| 事实存储 | SQLite + WAL | 单用户本地事务、离线、备份、迁移和条件写入 |
| 数据访问 | `sqlx` SQLite Adapter + 单写入协调器 | SQL 明确、迁移可控、避免过早引入 ORM；Projection 可读并发，事实写入串行化 |
| 事件基础 | SQLite Event Log + Transactional Outbox/Inbox | 先保证可靠性和恢复，不引入 Kafka/NATS |
| Artifact | 文件系统内容寻址存储 + SQLite 元数据 | 大内容与事实元数据分离，临时文件提交和 Digest 校验 |
| 任务调度 | Runtime 自有持久调度器 + Tokio | NodeRun、WaitRecord、Automation 和 Recovery 状态持久化在 SQLite |
| 图算法 | `petgraph` 或等价受测图库，仅作算法层 | 图领域不变量仍由 `pong-core` 校验 |
| Schema | JSON Schema 作为传输合同来源，生成 TypeScript/Rust 类型 | 避免前后端和扩展 SDK 猜字段 |
| 扩展协议 | JSON-RPC 2.0 + JSON Schema over stdio/local socket | 扩展隔离、跨语言、版本协商和健康检查 |
| 日志 | `tracing` + JSON subscriber | 结构化日志、correlationId、commandId、eventId 和脱敏 |
| 秘密 | OS Keychain/Credential Manager + SecretRef | SQLite 只保存引用和元数据，不保存明文 |
| 加密摘要 | BLAKE3 或等价现代摘要 | Artifact、事件载荷、导出包和备份完整性 |
| 压缩 | zstd，按 Artifact/备份策略启用 | 不在主事务中压缩大文件；先写、校验、再发布 |
| 测试 | cargo test/nextest、proptest、Playwright、合同和故障测试 | 状态机、幂等、恢复和跨语言协议优先 |

### 1.3 不在首版引入

- 不把微服务作为本地产品的默认部署形态。
- 不使用 Kafka、RabbitMQ、NATS、Redis Streams 作为首版事实事件源。
- 不使用 Temporal、Airflow、Quartz 等外部工作流引擎替代自己的 Run/NodeRun 合同。
- 不要求 Docker 才能运行 LocalRestricted；Docker 是后续更强隔离适配器。
- 不把 Node.js 作为 Host 的可信控制平面；Node.js 只能作为扩展/Worker 运行时之一。
- 不把 Postgres、S3 和 Kubernetes 作为本地单用户版的硬依赖；多机/团队版再增加适配器。

## 2. 为什么后端选择 Rust

### 2.1 与 Seekwd 的实际风险匹配

Seekwd 后端不是普通 CRUD API，核心困难是：

1. 长时间运行任务和后台运行不能依赖前端窗口存活。
2. 取消不是瞬时布尔值，需要 `cancelling`、`cancel_pending`、`reconciling` 和 `outcome_unknown`。
3. Worker、文件、进程、网络和执行上下文需要明确资源边界。
4. Host 崩溃后必须恢复 Event、Outbox、WaitRecord 和外部句柄。
5. 本地应用需要较小的运行时依赖和跨平台打包。

Rust 的类型系统、所有权、枚举、错误处理和进程/资源控制更适合把这些边界变成可检查的代码。Tokio 提供并发和取消机制，但不拥有业务语义；业务状态仍由 `pong-core` 和 `pong-runtime` 控制。

### 2.2 为什么不把 TypeScript/Node 作为 Host

Node.js 适合前端生态、Extension 和部分 Agent 适配，但不作为唯一可信 Host，原因是：

- 本地进程、子进程、句柄和资源限制需要更多平台桥接。
- 取消和崩溃恢复容易被 Promise/进程生命周期误解为已完成。
- 本地打包和多进程权限边界较弱，容易把 UI/Host/Worker 混在一起。
- 仍可使用 Node.js，但应限定为 Extension Worker、Provider Adapter 或开发工具，并通过 JSON-RPC/Worker Contract 接入。

Python 同样可以用于离线 Agent/数据节点，但不作为长期驻留 Host 或权限边界。

## 3. 后端内部模块和依赖方向

```text
pong-host
  -> pong-core
  -> pong-runtime
  -> pong-policy
  -> pong-artifact
  -> pong-agent
  -> pong-extension
  -> pong-storage-sqlite
  -> pong-worker

pong-runtime -> Core traits + Policy + Artifact + Executor Gateway
pong-worker -> protocol + executor adapters
pong-storage-sqlite -> Core repository/event/projection traits
pong-executor-local -> Worker protocol + platform sandbox adapter
```

### 3.1 模块责任

| 模块 | 拥有的事实/职责 | 不允许做的事 |
|---|---|---|
| `pong-core` | 领域类型、聚合、不变量、Command/Event DTO、错误分类 | 不访问数据库、网络、文件系统或线程 |
| `pong-host` | 进程生命周期、认证、IPC、依赖注入、迁移、健康、优雅关闭 | 不把 IPC handler 写成业务逻辑仓库 |
| `pong-runtime` | Graph 编译、Scheduler、Run、NodeRun、Attempt、Wait、Cancel、Recovery | 不绕过 Policy 或直接修改 Projection |
| `pong-policy` | Authority、Policy、Approval、Grant、Budget、SecretRef 决策 | 不执行动作、不修改 Graph |
| `pong-artifact` | Artifact、Evidence、ValueRef、Lineage、Retention 和内容提交 | 不把大内容塞进 SQLite 事实表 |
| `pong-agent` | Goal/Plan、探索、结构化提案、GraphPatch/RunPatch | 不直接执行自然语言或隐式升权 |
| `pong-extension` | Manifest、签名/完整性、兼容性、健康、启停、撤回 | 不直接读核心数据库或注入全局 UI 状态 |
| `pong-worker` | Worker 会话、心跳、流、取消、资源使用、结果收集 | 不拥有 Goal、Canvas、权限事实 |
| `pong-storage-sqlite` | SQLite 事务、Event Log、Outbox/Inbox、Projection、迁移 | 不改变 Core 的状态语义 |
| `pong-executor-local` | LocalRestricted 文件/网络/进程/资源限制 | 不自行扩大 AuthorityProfile |

## 4. IPC、协议与 Schema 选型

### 4.1 Workbench 到 Host

首版采用本机受保护通道：

```text
Windows: Named Pipe
macOS/Linux: Unix Domain Socket
Envelope: JSON-RPC 2.0-like typed request/response/event frames
Schema: JSON Schema source of truth
```

必须支持：

- `CommandEnvelope`、`QueryRequest`、`SubscriptionRequest` 和结构化 `Error`。
- requestId、commandId、correlationId、causationId、idempotencyKey。
- Snapshot version、projection cursor、事件批次、心跳、背压和重新订阅。
- 取消请求与服务端明确的取消状态，不把连接断开当作取消完成。
- ArtifactHandle 分段读取、范围校验、权限检查和取消。

不建议首版让前端通过 `localhost:port` 直接访问 Host：端口占用、来源伪造、跨平台防火墙和本机其他进程访问都会增加安全面。未来需要远程 Host 时，再增加独立的远程传输适配器。

### 4.2 Host 内部调用

Host 内部各模块优先使用 Rust trait、结构化对象和同一进程调用；不要为了“服务化”而在本机内部再套 HTTP。只有以下边界使用协议：

- Workbench ↔ Host。
- Host ↔ 隔离 Worker/Executor。
- Host ↔ Extension/Provider/External Agent。
- 未来 Host ↔ Remote Host。

### 4.3 Schema 策略

```text
protocol-schema/*.json       命令、事件、错误、分页、游标、Envelope
graph-schema/*.json          Canvas、Node、Port、Edge、Entrypoint、Patch
extension-schema/*.json      Manifest、权限、能力、健康和版本
```

Schema 生成 TypeScript 传输类型和 Rust DTO；Rust Core 的领域类型仍需自己定义并执行不变量校验。生成类型不是领域校验的替代品。

## 5. 存储、中间件和一致性

### 5.1 SQLite + WAL

SQLite 适合当前阶段，因为所有事实都在本机、需要事务、可离线、可备份且不需要网络数据库。配置要求：

- WAL 模式、外键、busy timeout、可靠同步策略和数据库版本迁移。
- 事实表、追加 Event Log、Outbox/Inbox、Projection 和 Migration 表分离。
- 条件写入必须带 expected aggregate version。
- 单写入协调器处理跨聚合写事务，避免多个任务随机争抢 SQLite 写锁。
- Projection 可删除重建；Event Log、不可变版本、Audit 和活动 Run 不可被清理任务误删。

`sqlx` 负责查询、事务和迁移；复杂领域约束不得交给 ORM 自动推断。若经过压力测试发现 async SQLite 连接池无法满足一致性，则改为 `rusqlite` 专用 Storage Actor，但上层 Repository 接口不变。

### 5.2 Event Log、Outbox/Inbox 和 Projection

首版中间件不是独立消息集群，而是 SQLite 内的持久组件：

```text
Command Handler
  -> SQLite transaction: facts + Event Log + Outbox
  -> Outbox dispatcher
  -> Projection / Notification / Audit consumers
  -> Inbox dedup + Projection checkpoint
```

这样可以保证“事实已经提交但事件没有发送”的崩溃窗口可恢复。内存 broadcast 只能作为低延迟提示，不能作为唯一事件来源。

### 5.3 调度与定时任务

Automation、Timer、WaitRecord 和 Retry 都进入持久表，由 `pong-runtime` 定期扫描到期项并使用租约抢占。Tokio timer 只负责唤醒，不负责事实持久化。

每个调度项必须有：scheduleId、dueAt、leaseOwner、leaseUntil、attempt、idempotencyKey、deadline、policySnapshotRef 和状态。应用关闭后，Host 恢复扫描；不能把定时任务存在前端 setTimeout 中。

### 5.4 缓存

- Projection Query Cache：可用进程内 `moka` 或自有有界缓存，必须带 snapshotVersion/cursor。
- Draft/View Cache：前端独立管理，不作为领域事实。
- Artifact Content Cache：按 Digest、大小、敏感度和 Retention 管理。
- 不引入 Redis 作为首版必需依赖；Redis 只能作为未来多 Host/远程部署的可替换缓存或队列。

## 6. 执行器和隔离中间件

### 6.1 LocalRestricted（首个真实执行器）

首版只开放明确受限的本地执行配置：

- 工作区内只读或显式临时写入目录。
- 默认禁止网络和工作区外路径。
- CPU、内存、运行时间、输出大小和并发限制。
- 子进程默认禁止或必须声明并重新评估。
- Windows 使用 Job Object 等价物；macOS/Linux 使用平台沙箱/资源限制适配器。
- 心跳、检查点、取消、退出码、信号和结果未知必须进入统一 Worker Contract。

Docker/容器属于后续隔离级别，不能因为安装了 Docker 就宣称所有节点安全。

### 6.2 Extension/Node Worker

扩展使用独立进程或 stdio JSON-RPC。Manifest 必须声明：

- NodeDefinition 和版本。
- 文件、网络、Secret、进程、环境和 Artifact 权限。
- 输入输出 Schema、取消能力、幂等和副作用分类。
- 最大时间、输出和资源预算。
- 宿主要求、依赖、签名/完整性和兼容协议版本。

扩展崩溃只能导致对应 NodeRun/Capability 失败、等待或恢复，不得拖垮 Host。

## 7. 安全、秘密和可观测性中间件

| 能力 | 首版建议 | 说明 |
|---|---|---|
| 本地会话 | 随机 Session Token + 哈希存储 + Host instance binding | 不把固定端口或路径当作认证 |
| Secret | OS Credential Manager/Keychain，Rust `keyring` 等价适配 | SQLite 只保存 SecretRef |
| 摘要 | BLAKE3 | Artifact、事件 payload、备份和导出完整性 |
| 日志 | `tracing`、JSON、脱敏 Layer | 每条日志关联 commandId/correlationId/eventId |
| 指标 | 本地聚合计数和耗时；未来 OpenTelemetry | 不把用户内容作为默认 telemetry |
| 崩溃 | Rust panic hook、Host/Worker crash report、脱敏 Support Bundle | 不能上传秘密和工作区内容 |
| 限流 | Host 命令/订阅/Artifact 流按会话和预算限制 | 防止一个窗口耗尽本地资源 |
| 内容安全 | Markdown/HTML 安全渲染、外部链接白名单、导出重新鉴权 | 前端和 Host 双重检查 |

首版不需要 Prometheus、Grafana、ELK 或 Jaeger 才能运行；但日志字段、关联 ID 和指标接口必须从第一天设计好，以便后续接入。

## 8. 候选方案比较

### 8.1 后端语言

| 候选 | 优点 | 主要问题 | 结论 |
|---|---|---|---|
| Rust | 资源/进程边界、可靠并发、跨平台打包、强类型状态机 | 学习和开发成本较高 | 首选 Host/Core/Runtime/Worker |
| TypeScript/Node | 前端生态、扩展快、Agent SDK 丰富 | 资源隔离、长期进程和本地安全边界需要大量补强 | Extension/Provider 可用，不做唯一 Host |
| Go | 部署简单、并发成熟 | 与 Tauri/Rust 和细粒度本地执行边界需要额外进程桥接 | 远程服务版可评估，首版不选 |
| Python | AI/数据生态强 | 长驻 Host、资源限制和分发不适合作为可信核心 | Agent/数据节点 Worker 可用 |

### 8.2 消息与工作流中间件

| 候选 | 优点 | 首版问题 | 结论 |
|---|---|---|---|
| SQLite Event Log + Outbox | 本地事务、可备份、可恢复、无需额外服务 | 单机吞吐有限 | 首版首选 |
| Redis Streams | 简单、实时、生态成熟 | 额外服务、事实与数据库双写、一致性复杂 | 暂不引入 |
| NATS JetStream | 轻量事件和远程部署 | 本地安装、事件事实备份和事务边界更复杂 | 多 Host 再评估 |
| Kafka | 高吞吐、长保留 | 对单机产品过重，运维成本高 | 不选首版 |
| Temporal | 工作流恢复能力强 | 会替换自定义 Run/NodeRun 语义，部署复杂，副作用合同仍需自己定义 | 暂不选；未来远程编排再评估 |

### 8.3 数据库

| 候选 | 优点 | 首版问题 | 结论 |
|---|---|---|---|
| SQLite | 本地优先、事务、备份、零配置 | 单写入吞吐和多机并发有限 | 首版首选 |
| PostgreSQL | 并发、JSON、查询和团队部署强 | 本地安装和离线复杂 | 未来 Server/Team Adapter |
| DuckDB | 分析查询强 | 不适合作为并发事务事实库 | Artifact/分析旁路可评估 |
| RocksDB | KV 性能高 | 查询、迁移、审计和关系投影成本高 | 不选事实库 |

## 9. 分阶段演进

### Phase A：本地内部验证

```text
React Workbench -> Tauri/IPC -> pong-host
                             -> SQLite/WAL
                             -> Runtime + LocalRestricted Worker
                             -> File Artifact Store
```

不需要 Redis、Kafka、Postgres、Docker 或远程调度器。

### Phase B：可选云数据服务

```text
Local pong-host
  -> encrypted Sync Outbox
  -> HTTPS Sync API
  -> PostgreSQL metadata
  -> S3-compatible encrypted object storage
```

- 首先提供账户、设备、Entitlement、更新 Manifest、Extension Catalog。
- 再提供用户显式开启的 Canvas 不可变版本同步和加密 Backup。
- Draft 同步、多人协作和运行历史同步在冲突合同冻结后再开放。
- 云服务失败不能阻止本地工作；同步状态显示 `local_only / pending / syncing / synced / conflict / failed / paused`。

### Phase C：受邀 Pilot

- 增加 Docker/更强 Sandbox Executor。
- 增加明确授权的云 Artifact 交付或加密 Backup；本地 SQLite 仍是执行事实库。
- 增加 OpenTelemetry Exporter，但本地运行不依赖 Collector。
- 增加远程 Host/Agent 的显式连接和审批边界。

### Phase D：团队/多机部署

- `pong-host` 仍保持领域合同，但可以拆成 API、Scheduler、Worker Gateway 和 Projection 服务。
- Event Log 可迁移到 Postgres + NATS JetStream/Kafka，但必须保持 EventEnvelope、Cursor、幂等和恢复语义。
- 云端共享 Artifact 可使用 S3-compatible Object Store，但本地执行产生的未上传 Artifact 继续保存在本机。
- 分布式部署前必须重新评估租约、跨机取消、网络分区和结果未知。

## 10. 选型验收门槛

技术选型不能只通过“能启动”验收。首版必须证明：

1. Host 崩溃后 Event Log、Outbox、WaitRecord 和活动 Run 可恢复。
2. 同一 Command 的幂等重试不重复创建 Run 或外部副作用。
3. Event 重复、乱序、游标过期和 Snapshot 重同步可测试。
4. SQLite 写入冲突、迁移失败和备份恢复有故障测试。
5. LocalRestricted 能真实限制路径、网络、进程、资源和输出。
6. Worker 失联进入 `orphaned/reconciling`，不能自动重复副作用。
7. Extension 崩溃不会终止 Host，权限扩大需要重新 Policy/Approval。
8. Workbench 只能通过 HostClient 访问 Query/Command/Event。
9. 所有关键日志有 correlationId，敏感字段和工作区内容默认脱敏。
10. 更换传输、数据库或队列实现时，Core 领域合同和前端语义不改变。

## 11. 当前决策与保留项

当前冻结到“实现方向”而不是所有依赖版本：

- Rust + Tokio + SQLite/WAL + SQLite Event Log/Outbox 是首版默认组合。
- Named Pipe/UDS + 类型化 JSON-RPC 是首版本地 IPC 方向。
- `sqlx` 是默认 SQLite Adapter；Storage Actor 是压力测试后的替代方案。
- Redis、Kafka、NATS、Temporal、Postgres、Docker 和 Kubernetes 都是后续可插拔能力，不是首版前置依赖。
- 如果实际安全测试证明平台 LocalRestricted 不足，必须先收紧开放边界，不能用更换消息中间件掩盖执行隔离问题。
