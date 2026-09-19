# 合同状态矩阵

> 状态：Normative Contract

## 唯一事实源

| 领域 | 状态 | 唯一事实源 | 当前实现 |
|---|---|---|---|
| 身份与版本 | Normative | `02-identity-version-model.md` | 部分落地，旧 `CanvasVersion` 需迁移 |
| 入口与触发器 | Normative | `03-entrypoint-model.md` | UI 单主节点模型需迁移 |
| 生命周期状态 | Normative | `04-unified-state-registry.md` | 部分落地，枚举尚未统一 |
| GraphPatch / RunPatch | Normative | `05-graph-patch-protocol.md` | 只有类型骨架 |
| 跨画布投递 | Normative | `06-cross-canvas-delivery.md` | 未完整实现 |
| 副作用、取消、恢复 | Normative | `07-side-effects-and-reconciliation.md` | 未完整实现 |
| 权限与执行边界 | Normative | `08-authority-and-execution-boundaries.md` | Policy 骨架；真实执行器未完成 |
| 保留与节点治理 | Provisional | `09-retention-and-node-governance.md` | 未完整实现；默认值可配置 |
| 核心跨语言 Schema | Normative | `10-core-schema-registry.md` | 现有语言类型需迁移并增加生成校验 |
| 命令、事件与恢复 | Normative | `11-command-event-recovery.md` | 事件表有骨架；订阅、Inbox/Outbox 和重同步未完成 |
| 端到端参考生命周期 | Provisional | `12-reference-lifecycle.md` | 尚未完成联合验收 |
| UI 页面与交互覆盖 | Provisional | `../26-ui-system/02-information-architecture.md` | UI Lab 仅覆盖部分工作台 |
| Tauri / Rust / React 技术栈 | Experimental Proposal | `../25-implementation-blueprint/01-stack-decision.md` | 部分落地 |
| 当前代码能力 | Implementation Status | `../25-implementation-blueprint/15-current-implementation-status.md` | 按仓库事实持续更新 |

## 旧文档解释规则

| 旧概念 | 正式解释 |
|---|---|
| `CanvasVersion.status = draft` | 已废弃。Draft 不是不可变版本；使用 `CanvasDraft` |
| `CanvasVersion` | 在新合同中按语境映射为 `CanvasRevision`；只有已发布引用才是 `CanvasRelease` |
| `primaryNodeId` | 兼容字段，仅表示默认入口目标节点；不得代表全部入口 |
| “一个 Canvas 只有一个入口” | 已废弃。一个修订只有一个默认入口，同时允许多个命名入口和触发绑定 |
| `NodeResult.status = waiting` | 已废弃。等待是 `NodeRun.status`，不是最终结果 |
| `revoked` 作为 Run / NodeRun 状态 | 已废弃。`revoked` 属于 Grant 或 ExecutionContext；运行进入 `cancelling`、`cancel_pending` 或 `blocked` |
| `orphaned` 作为普通终态 | 已废弃。它是隔离中的异常非终态；对账耗尽后才进入 `outcome_unknown` |
| `GraphPatch.scope = run` | 已废弃。运行临时修改必须使用独立 `RunPatch` |

## 尚未冻结

以下项目不得在产品或 SDK 中宣称为稳定能力：

- 任意未知应用的可靠自动操作。
- 任意外部 Agent 的统一暂停、取消和结果验证。
- 无边界、无预算、无期限的“全权代理”。
- 跨机器副作用的强一致事务。
- 任意副作用的自动补偿。
- 自动把运行结果发布为可信 Skill。

这些能力可以实验，但必须以 capability flag 隔离，并在 UI 中明确标记 `Experimental`。
