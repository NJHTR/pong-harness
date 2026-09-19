# 开放门禁矩阵

> 门禁规则状态：Normative Contract  
> “当前实现事实 / 当前级别”列状态：Implementation Status（审查日期：2026-09-19）
> 
> 本表定义“可以开放到哪一级”的证据门槛。合同文件存在、TypeScript 类型存在、Mock Toast、静态页面或刷新后看起来正常，都不能单独作为完成证据。

## 开放级别

| 级别 | 含义 |
|---|---|
| `blocked` | 设计或实现存在阻塞缺口，不得进入真实运行验证。 |
| `internal-only` | 允许开发者和合同测试使用，必须在受控数据和明确权限下运行。 |
| `pilot` | 允许少量受邀用户使用，能力、执行器和数据范围必须显式限制。 |
| `open` | 经过故障、恢复、安全和可用性验收，可对普通用户提供该能力。 |

## 门禁

| 门禁 | 唯一合同 | 当前实现事实 | 必须提供的验收证据 | 当前级别 |
|---|---|---|---|---|
| 身份与版本 | `27-normative-contracts/02-identity-version-model.md` | Draft/Revision/Release 已有设计，旧 `CanvasVersion` 仍在迁移 | 保存 Draft、生成不可变 Revision、发布/撤回 Release；RunSnapshot 可独立读取历史版本 | `internal-only` |
| 入口与触发器 | `27-normative-contracts/03-entrypoint-model.md` | 默认入口和命名入口已定义，旧 UI 主节点语义需迁移 | 默认、命名、事件、定时、Webhook、父画布调用分别运行；入口删除和重绑定保持原子 | `internal-only` |
| 统一状态机 | `27-normative-contracts/04-unified-state-registry.md` | 枚举合同已定义，跨服务实现未统一 | 非法转移被拒；等待、暂停、取消、孤儿、结果未知均可恢复或审计；UI 与事件一致 | `blocked` |
| GraphPatch / RunPatch | `27-normative-contracts/05-graph-patch-protocol.md` | 只有部分类型和服务骨架 | 原子应用、版本冲突、幂等重试、逆补丁、影响分析、运行中节点边界测试通过 | `blocked` |
| 跨画布投递 | `27-normative-contracts/06-cross-canvas-delivery.md` | 调用字段已设计，投递和 Inbox 未完整落地 | 重复投递只创建一个子 Run；父进程断线可恢复；结果过期和循环有明确处置 | `blocked` |
| 副作用与对账 | `27-normative-contracts/07-side-effects-and-reconciliation.md` | Effect Profile 和对账模型已定义，真实探针未完成 | 响应丢失进入 `orphaned/reconciling`；对账耗尽进入 `outcome_unknown`；不得重复高风险副作用 | `blocked` |
| AuthorityProfile | `27-normative-contracts/08-authority-and-execution-boundaries.md` | 权限维度和升级规则已定义，资源规范化/Grant 绑定未完整 | 默认 deny；路径、网络、秘密、预算扩大重新审批；撤销影响可观察 | `blocked` |
| LocalRestricted | `27-normative-contracts/08-authority-and-execution-boundaries.md` | 受限执行配置有设计，真实强制边界未完成 | 工作区外文件、网络、安装、未声明子进程被拒；CPU/内存/时间/输出和取消测试通过 | `blocked` |
| 命令、事件、恢复 | `27-normative-contracts/11-command-event-recovery.md` | 信封和恢复流程已定义，Host 订阅/投影仍为骨架 | 重复命令、断线、乱序、游标过期、快照重同步和 Host 崩溃测试通过 | `blocked` |
| 端到端生命周期 | `27-normative-contracts/12-reference-lifecycle.md` | 流程已写，执行闭环未完成 | 输入、节点执行、人工等待、审批、暂停、重启、恢复、取消、审计、验证全部可重放 | `blocked` |
| Release Manager | `27-normative-contracts/02-identity-version-model.md` | 页面和模型待实现 | 调用方固定 Release；兼容性检查、弃用、撤回和历史 Run 读取可审计 | `internal-only` |
| Approval Inbox | `26-ui-system/02-information-architecture.md` | UI 入口缺失 | 请求显示资源、调用链、期限和 before/after；批准/拒绝/撤销产生事实事件 | `blocked` |
| Recovery Center | `26-ui-system/02-information-architecture.md` | UI 入口缺失 | 可处理 `cancel_pending`、`orphaned`、`outcome_unknown`，每个动作创建 Resolution/RunBranch | `blocked` |
| Cross-Canvas Trace | `26-ui-system/02-information-architecture.md` | UI 入口缺失 | 父子 Run、Invocation、映射、去重和取消传播与事件日志一致 | `internal-only` |
| Audit / Event Explorer | `27-normative-contracts/11-command-event-recovery.md` | UI 入口缺失 | 可按游标、聚合、主体和命令筛选；导出带摘要、Schema 版本和 Lineage | `internal-only` |
| Environment / Execution Context | `27-normative-contracts/08-authority-and-execution-boundaries.md` | UI 和真实环境管理未完成 | 显示 mount、网络、限制、秘密引用和健康；上下文失效不会静默继续 | `blocked` |
| Artifact / Evidence | `27-normative-contracts/09-retention-and-node-governance.md` | 结构已定义，保留和导出 UI 未完成 | Artifact 不早于引用回收；敏感导出需审批；Evidence 可追溯到 NodeRun | `internal-only` |
| Notification / Attention | `26-ui-system/02-information-architecture.md` | 有 Toast/Mock，持久中心未完成 | Toast 关闭不清除事实；等待、审批、恢复、失败聚合并可定位到处理入口 | `internal-only` |
| 标准节点治理 | `27-normative-contracts/09-retention-and-node-governance.md` | Catalog 较大，统一测试未完成 | 每个节点通过状态、取消、权限、幂等、血缘、组合图合同测试 | `blocked` |
| UI 交互闭环 | `26-ui-system/02-information-architecture.md`、`28-design-review/02-ui-gap-analysis.md` | 页面清单完整度较高，但多数危险路径、离线恢复和大数据行为尚未实现 | P0 表面全部接入真实命令/事件/权限/重同步；P1 表面完成受邀试点验收 | `blocked` |

## 不得作为完成证据

- 只存在文档、类型、Mock 数据或静态 UI。
- Toast 显示“完成”但没有对应的持久化事件和可查询事实。
- 刷新页面后状态看似恢复，但没有游标、快照摘要和重放证据。
- Agent 返回自然语言说明“已修改”，但没有结构化 GraphPatch/RunPatch。
- 只测成功路径，没有覆盖权限拒绝、冲突、取消待确认、结果未知和恢复失败。
- 只在单机内存中演示，未验证 Host 崩溃、Worker 失联、重复事件和外部响应丢失。

## 开放声明规则

产品、README、发布说明和 UI 能力标签必须引用本表级别。能力升级必须同时更新实现状态、合同测试证据和本表，不得以“设计已完成”替代“运行能力已完成”。
