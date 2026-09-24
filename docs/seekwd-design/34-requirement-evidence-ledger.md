# 需求到实现证据台账

> 状态：Implementation Status
> 基线：2026-09-24，`dev` 分支 `b7d5d75`；只覆盖已核对的纵向切片，不代表全系统需求均已复核。

本台账连接 [全系统 PRD](29-system-product-requirements.md)、[任务矩阵](30-delivery-roadmap-and-progress-matrix.md)、代码、测试和[开放门禁](28-design-review/01-open-gate-matrix.md)。需求编号的完整行为以任务矩阵及 Normative Contract 为准；下表中的“有代码”只说明局部证据，**不是需求已验收**。

## 证据规则

每个后续交付按下列顺序记录：

1. 先确定稳定需求 ID、规范合同、前置依赖和当前状态；没有对应条目先补矩阵，不用笼统的 `Host work` 代替。
2. 写明本次最小行为、输入/输出、拒绝与异常路径、数据与权限边界、自动化测试名。
3. 一个提交只覆盖一个可独立验证的主题；提交说明带需求 ID，或在本台账建立提交到 ID 的映射。跨多个 ID 时列出主 ID 与附属 ID。
4. 验证命令、结果和源码路径进台账；运行 `pnpm check:requirements` 校验 ID 存在、唯一，并查看追踪覆盖数。文档、Mock、编译成功和人工截图必须标为各自的证据类型，不能充当领域合同测试。
5. 只有满足需求全部验收条件、异常路径和对应阶段/开放门禁，才能将状态改为“已验收”；失败或缺证据维持“部分实现 / 未开始 / 阻塞”。
6. 已推送的历史提交只做追溯映射，不修改历史记录，也不追认不存在的测试或 PR。没有创建 PR 时明确写“无 PR”。

状态词：`部分实现` 表示有可定位代码但未通过完整验收；`仅设计/Mock` 不算生产实现；`阻塞` 表示后置需求不得据此开放。百分比留在矩阵的历史估算区，当前进度以本台账的证据和缺口为准。

## 已核对需求

路径均相对仓库根目录；本轮历史提交尚无 PR。测试名位于 `crates/pong-host/src/main.rs` 的 `tests` 模块，`cargo test --workspace` 可运行。未列测试名的行尚无该需求的自动化验收证据。

| 需求 ID | 实现与提交证据 | 自动化证据 | 当前判断 / 完整验收缺口 |
|---|---|---|---|
| `P0-009` | `packages/protocol-schema/host-wire.schema.json`、生成器与 `src/host-wire.generated.ts`；Rust serde 位于 `crates/pong-core/src/lib.rs` 和 `crates/pong-host/src/main.rs`；`752a18e` | `pnpm --filter @seekwd/protocol-schema test`（3 个共享样本/负例测试）；`cargo test --workspace`（13 个 Host 测试，含 `host_snapshot_matches_shared_wire_fixture`、`host_event_error_and_request_match_shared_wire_fixtures`、`http_snapshot_events_and_error_match_shared_wire_fixtures`）；`cargo fmt --all -- --check`、`pnpm -r typecheck`、`pnpm -r build`、`pnpm check:requirements`、`git diff --check` 通过（2026-09-24） | **部分实现**；当前 Host HTTP 切片已有单一 JSON Schema 生成 TS 类型、Rust serde/HTTP 跨语言样本验证，修正 `null`/请求路径边界。完整领域、Rust/SQLite/IPC 生成、版本兼容、JSON extractor 错误归一化及安全整数边界尚未完成。详见 `packages/protocol-schema/README.md`。 |
| `P0-010` | 本台账与矩阵稳定 ID；基线校准 `b7d5d75`；`scripts/check-requirement-ledger.mjs` | `pnpm check:requirements` 仅校验 ID 存在与唯一并报告覆盖数 | **部分实现**；历史提交开始回填，仍无逐项 Issue/PR、测试结果归档或全需求证据覆盖。 |
| `P0-029` | `Cargo.toml`、`crates/pong-core`、`crates/pong-host` (`d0d75fb`) | `cargo check --workspace` | **部分实现**；已选择并创建本地 Rust 核心，但 Runtime/Policy/Worker 等 crate 尚不存在。 |
| `HST-C-001` | 本机监听与健康查询 (`d0d75fb`)；启动凭据、固定 Host/Origin、Bearer 检查及 Workbench 开发代理 (`97b1897`)；按数据库路径的跨平台独占锁与 Ctrl+C 优雅关闭（本次提交待填） | `local_security_configuration_fails_closed`、`local_host_rejects_unauthenticated_foreign_origin_and_wrong_authority`、`instance_lock_is_exclusive_and_released_on_drop`、`instance_lock_is_scoped_to_the_database_path`、`http_snapshot_events_and_error_match_shared_wire_fixtures`；本机联调：直连无 token `401`、代理快照 `200`、外部 Origin 写入 `403`、允许来源预检通过；`cargo test --workspace` 17 个测试通过 | **部分实现**；开发 token/代理/锁/关闭边界已建立，但不等于本机用户绑定 Session 或正式 IPC。仍缺凭据轮换/撤销、桌面启动编排、崩溃后健康演练和正式进程生命周期合同。 |
| `HST-C-002` | SQLite 快照和事务 (`d1844f7`)，失败回滚 (`82b08e8`)，启动拒绝坏数据 (`f18faf8`) | `failed_persist_does_not_advance_snapshot_version`、`failed_candidate_persist_restores_store`、`invalid_snapshot_does_not_become_an_empty_store`、`missing_snapshot_table_is_not_treated_as_an_empty_store`、`snapshot_and_event_cursor_must_agree` | **部分实现**；缺 WAL 配置、迁移版本、数据库备份/回滚、索引/外键与故障演练。 |
| `HST-R-001` | `crates/pong-host/src/main.rs` 的 Workspace、Canvas、Run 和整体快照查询 (`5ea6683`) | 无 Query Router 合同测试 | **部分实现**；Graph、Artifact、Policy、Notification 的正式查询、分页和筛选未实现。 |
| `HST-C-003` | `StartRun` 修订冲突与幂等键 (`6489bf5`)，结构化错误 (`f7813d4`)，落盘失败回滚 (`82b08e8`)；传输层开发认证 (`97b1897`) | `failed_candidate_persist_restores_store`、`valid_snapshot_and_command_journal_recover_together`、`local_host_rejects_unauthenticated_foreign_origin_and_wrong_authority` | **部分实现**；传输 token 不等于主体身份或领域授权。多数写命令仍无 CommandEnvelope/幂等键，也缺 Policy、ImpactAnalysis、CommandReceipt。 |
| `HST-C-004` | `host_events` 保存快照更新标记与游标 (`2f399fd`) | `snapshot_and_event_cursor_must_agree` | **部分实现**；这不是领域 Event Store，无聚合序列、因果关系、Payload Digest、Outbox 或审计哈希。 |
| `HST-R-002` | `/api/events` 与 HTTP 客户端轮询 (`2f399fd`、`0b26e04`) | 无断线/重复/乱序合同测试 | **部分实现**；客户端不持久游标，未实现游标过期、去重和原子快照重同步。 |
| `HST-V-001` | 模拟 Run 重启后重新定时 (`fcf52bb`)，启动日志一致性校验 (`f18faf8`) | `legacy_snapshot_without_event_cursor_still_recovers`、`orphaned_command_journal_rejects_startup`、`mismatched_command_journal_rejects_startup`；无进程重启 E2E | **部分实现**；不能恢复 Worker、Wait、Handle、Outbox/Inbox 或外部副作用。 |
| `WSP-C-001` | Host 创建简化 Workspace (`5ea6683`) | 无路径预检测试 | **部分实现**；未检查真实目录、权限、符号链接和磁盘空间。 |
| `WSP-U-001` | Host 重命名保留 ID/路径 (`5ea6683`) | 无重命名与引用合同测试 | **部分实现**；正式 Workbench 未提供对应入口，缺引用/冲突测试。 |
| `CVS-C-001` | Host 创建 Canvas 和 `trigger.start` 节点 (`0919ff8`) | 无唯一默认入口合同测试 | **部分实现**；没有 CanvasDraft、Graph 和完整 Entrypoint 模型。 |
| `CVS-U-001` | Host 原地更新 Canvas 显示名 (`5ea6683`)；Workbench 有入口 (`acb09c0`) | 无历史 Run/Release 引用测试 | **部分实现**；尚无 Release 和跨画布引用验证。 |
| `REV-C-001` | Host 保存 Revision 编号和元数据 (`5ea6683`) | 无不可变 Graph/Digest 合同测试 | **部分实现**；未冻结 Draft 图、定义引用、校验报告或 Digest；不能作为真实运行输入。 |
| `RUN-C-001` | 默认入口、修订号、幂等键的模拟 `StartRun` (`6489bf5`、`fcf52bb`) | 仅持久化/日志恢复单元测试；无完整 StartRun E2E | **部分实现**；无 Release/Debug Revision 精确引用、输入、Mode、Authority、Budget、RunSnapshot 或节点执行。 |
| `FNT-ARCH-001` | `apps/workbench` 独立入口和构建 (`acb09c0`) | `pnpm -r typecheck`、`pnpm -r build` | **部分实现**；尚无发布配置、错误边界、桌面壳和生产级页面结构。 |
| `FNT-DATA-001` | `packages/seekwd-client/src/index.ts` 的 `HostClient`、本地与 HTTP 适配器 (`5b5ee83`、`0b26e04`) | typecheck；无适配器合同测试 | **部分实现**；协议字段缺完整 Command/Query/Event 信封，本地适配器使用 `localStorage`。 |
| `FNT-DATA-004` | HTTP 轮询后重新获取快照 (`0b26e04`、`2f399fd`) | 无断线恢复/去重 E2E | **部分实现**；无持久 Cursor、Gap 检测、Event ID 去重及离线事实隔离。 |

## 下一条可执行链

1. `P0-009`：当前 HTTP 纵向切片已有 Schema/TS 生成和共享 Rust/HTTP 合同测试；继续补版本兼容策略、完整领域与 IPC/SQLite 边界，不宣称整体完成。
2. `HST-C-001` / `P0-007`：开发 HTTP 已有 token、Host/Origin、按数据库路径单实例锁和 Ctrl+C 关闭；继续完成受保护 IPC、用户/客户端 Session、凭据轮换、桌面启动与崩溃恢复，领域 Policy 仍独立于传输认证。在此之前不允许接真实 Worker。
3. `CVS-C-001`、`DRF-U-001`、`REV-C-001`：持久 Graph Draft、预期版本冲突、不可变 Revision 内容和测试。
4. `HST-C-003`、`HST-C-004`、`HST-R-002`：命令信封、事实事件、断线恢复，再推进真实 `RUN-C-001`/RunSnapshot。

每完成一个增量，在对应行增加提交、测试和异常路径证据；开放等级只能依据门禁矩阵的完整验收调整。
