# Seekwd / Pong Harness 项目方案

> 本目录是 Seekwd 的持续设计文档。Seekwd 是用户工作台名称，Pong Agent 是智能体核心，Pong Harness 是节点、画布、环境、权限和运行时平台。

## 文档规则

讨论记录和架构决策可以使用“已确认、提案、待确认”，但它们不自动成为跨组件协议。所有可作为 SDK / API 依据的内容必须使用下文正式合同状态，并登记到 `27-normative-contracts/01-contract-status-matrix.md`。

每次讨论后：

1. 将稳定结论写入对应主题文档。
2. 在 `09-decisions.md` 记录关键决策和原因。
3. 将未解决问题放入 `10-open-questions.md`。
4. 涉及架构变化时更新本索引。

## 正式合同优先级

`27-normative-contracts/` 是跨组件协议的唯一规范入口。它将内容区分为：

- **Normative Contract**：前端、Host、Runtime、Worker、Agent 和扩展必须遵守。
- **Provisional Contract**：方向已确定，但字段或默认值仍可能调整，仅限内部验证。
- **Experimental Proposal**：候选方案，不承诺兼容。
- **Implementation Status**：当前代码事实，不定义目标协议。
- **Informative**：背景和解释。

发生冲突时必须以 `27-normative-contracts` 为准，并提交迁移说明；实现方不得根据旧文档自行选择解释。开始开发或开放前，先阅读 [27-normative-contracts/00-README.md](27-normative-contracts/00-README.md)。

## 文档索引

| 文件 | 内容 |
| --- | --- |
| [01-product-vision.md](01-product-vision.md) | 产品定位、边界和核心原则 |
| [02-capability-model.md](02-capability-model.md) | 像人一样工作的能力模型 |
| [03-node-object-model.md](03-node-object-model.md) | 节点、节点定义、实例、运行和版本 |
| [04-canvas-composition.md](04-canvas-composition.md) | 画布、子画布、复合节点和跨画布关系 |
| [05-agent-runtime.md](05-agent-runtime.md) | 规划、探索、执行、验证、修复和动态建图 |
| [06-exploration-delegation.md](06-exploration-delegation.md) | 未知应用、工具、Agent 的发现和委派 |
| [07-environment-permission.md](07-environment-permission.md) | 本地、沙箱、Docker、远程、权限和审批 |
| [08-debugging-memory-observability.md](08-debugging-memory-observability.md) | 调试、重放、证据、记忆和技能沉淀 |
| [09-decisions.md](09-decisions.md) | 已确认的架构决策记录 |
| [10-open-questions.md](10-open-questions.md) | 需要继续讨论的设计问题 |
| [11-discussion-log.md](11-discussion-log.md) | 方案演进记录 |
| [12-goal-execution-design](12-goal-execution-design/00-README.md) | 从抽象目标到可执行系统的详细设计 |
| [19-control-modes.md](12-goal-execution-design/19-control-modes.md) | 人类与 Agent 的构建、执行和交接模式 |
| [20-node-canvas-spec](20-node-canvas-spec/00-README.md) | 节点与画布的正式规范 |
| [21-foundation-spec](21-foundation-spec/00-README.md) | 标识、类型、事件、状态、策略和扩展等基础规范 |
| [22-core-runtime-services](22-core-runtime-services/00-README.md) | 核心服务、Agent 协议、恢复和安全规范 |
| [23-standard-node-library](23-standard-node-library/00-README.md) | 标准节点库、原语与治理规则 |
| [24-reference-architecture](24-reference-architecture/00-README.md) | 本地优先的 Workbench、Host、Core 与扩展参考架构 |
| [25-implementation-blueprint](25-implementation-blueprint/00-README.md) | 技术栈、仓库结构、实现顺序与验收标准 |
| [26-ui-system](26-ui-system/00-README.md) | macOS 风格、设计令牌、组件边界与工作台交互基线 |
| [27-normative-contracts](27-normative-contracts/00-README.md) | 正式合同状态、版本、入口、状态机、GraphPatch、恢复、权限与治理 |
| [28-design-review](28-design-review/00-review-report.md) | 基础合同、实现缺口、UI 覆盖、交互闭环和开放边界审查报告 |

## 当前一句话定义

Seekwd 是一个本地优先的 Agent 工作台：用户用自然语言描述目标，Pong Agent 可以探索未知环境、发现或创建能力，将行动组织成可编辑的节点图，调用其他 Agent 和外部工具，在多个画布之间协作执行，并让用户随时观察、调试、暂停、批准、接管和复用成功经验。
