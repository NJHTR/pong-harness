# Pong Harness 正式合同层

> 状态：Normative Contract  
> 适用范围：Workbench、Pong Host、Harness、Agent、Worker、扩展 SDK 和持久化实现。  
> 优先级：本目录高于其他设计说明；发生冲突时，以本目录为准并修正文档，不允许由实现方自行选择解释。

## 为什么需要这一层

早期设计文档同时承担了产品讨论、方案探索、正式协议和实现进度记录，导致同一概念可能同时存在已确认、提案和骨架实现三种语义。本目录只保存跨组件必须一致的合同，不保存界面草图、技术选型偏好或实现进度。

## 规范词

- `MUST`：所有实现必须遵守。
- `MUST NOT`：所有实现必须禁止。
- `SHOULD`：除非有记录在案的兼容原因，否则必须遵守。
- `MAY`：允许但不是必需。

中文正文中的“必须、不得、应当、可以”分别对应上述语义。

## 文档状态

| 状态 | 含义 | 可否作为 SDK / API 依据 |
|---|---|---|
| `Normative Contract` | 已冻结的跨组件合同；修改需要兼容性评审和迁移说明 | 可以 |
| `Provisional Contract` | 方向确定但字段或边界仍可能变化 | 仅限内部实验 |
| `Experimental Proposal` | 用于验证的候选方案，不承诺兼容 | 不可以 |
| `Implementation Status` | 描述当前代码事实，不定义目标协议 | 不可以 |
| `Informative` | 背景、解释、示例和设计理由 | 不可以 |

未显式标注且未列入 [01-contract-status-matrix.md](01-contract-status-matrix.md) 的旧文档一律按 `Informative` 处理。

## 合同与受控提案

1. [01-contract-status-matrix.md](01-contract-status-matrix.md)：合同状态与唯一事实源。
2. [02-identity-version-model.md](02-identity-version-model.md)：身份、草稿、修订、发布和运行快照。
3. [03-entrypoint-model.md](03-entrypoint-model.md)：默认入口、命名入口、触发器与跨画布调用。
4. [04-unified-state-registry.md](04-unified-state-registry.md)：统一状态枚举、转移和 UI 语义。
5. [05-graph-patch-protocol.md](05-graph-patch-protocol.md)：GraphPatch、RunPatch 和原子操作。
6. [06-cross-canvas-delivery.md](06-cross-canvas-delivery.md)：跨画布投递、去重、等待、取消与循环控制。
7. [07-side-effects-and-reconciliation.md](07-side-effects-and-reconciliation.md)：副作用分类、取消、超时、对账与补偿。
8. [08-authority-and-execution-boundaries.md](08-authority-and-execution-boundaries.md)：执行上下文、全权代理和权限升级边界。
9. [09-retention-and-node-governance.md](09-retention-and-node-governance.md)：Artifact、日志、记忆和标准节点治理。
10. [10-core-schema-registry.md](10-core-schema-registry.md)：跨语言核心 Schema、引用和兼容性。
11. [11-command-event-recovery.md](11-command-event-recovery.md)：命令信封、事件、游标、投影与崩溃恢复。
12. [12-reference-lifecycle.md](12-reference-lifecycle.md)：端到端联合验收生命周期。

开放级别和实现证据由 [../28-design-review/01-open-gate-matrix.md](../28-design-review/01-open-gate-matrix.md) 管理。该矩阵的门禁规则属于正式合同；“当前实现事实”和“当前级别”属于实现状态，不会反向改变本目录合同。

## 变更规则

正式合同变更必须同时提供：

- 变更原因和威胁模型影响。
- Schema / enum / command / event 的兼容性结论。
- 存储迁移和历史运行读取策略。
- Workbench、Host、Worker、Agent 与扩展 SDK 的影响清单。
- 至少一个合同测试或可验证验收场景。

破坏性变更必须提升协议主版本。新增可忽略字段、状态展示元数据或向后兼容操作可以提升次版本。
