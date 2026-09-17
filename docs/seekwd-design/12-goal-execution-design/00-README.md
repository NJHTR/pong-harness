# 目标执行系统详细设计

本目录把 Seekwd 的抽象目标拆成可实现的内部系统。这里的“目标 A”只是通用占位符，不代表某个行业、应用或工具。

## 目标 A 的完整链路

```text
接收目标
  -> 规范化目标和约束
  -> 建立上下文与权限边界
  -> 拆解交付物、子目标和任务
  -> 发现或构造所需能力
  -> 编译为版本化节点图
  -> 静态校验与授权检查
  -> 调度节点和跨画布依赖
  -> 采集观察结果和证据
  -> 验证完成条件
  -> 遇到问题时诊断、修复或请求用户
  -> 交付结果
  -> 记录经验并沉淀能力
```

构建和执行都支持三种主体关系：人类主导、Agent 主导、人机协作。两者彼此独立，可以组合成不同运行方式。

## 文档索引

| 文件 | 主题 |
| --- | --- |
| [01-goal-model.md](01-goal-model.md) | 目标对象、成功标准和目标图 |
| [02-goal-lifecycle.md](02-goal-lifecycle.md) | 目标生命周期、状态与转移 |
| [03-context-and-constraints.md](03-context-and-constraints.md) | 上下文、约束、作用域和新鲜度 |
| [04-goal-decomposition.md](04-goal-decomposition.md) | 目标拆解方法、粒度和依赖 |
| [05-capability-discovery.md](05-capability-discovery.md) | 能力发现、匹配、构造和信任 |
| [06-plan-to-graph.md](06-plan-to-graph.md) | 计划编译为节点图和 Graph Patch |
| [07-runtime-scheduler.md](07-runtime-scheduler.md) | 调度、并发、检查点和恢复 |
| [08-observation-and-verification.md](08-observation-and-verification.md) | 观察、证据、验证和完成判定 |
| [09-adaptation-and-repair.md](09-adaptation-and-repair.md) | 失败诊断、动态修复和替代路径 |
| [10-human-collaboration.md](10-human-collaboration.md) | 提问、审批、接管、暂停和恢复 |
| [11-artifacts-and-delivery.md](11-artifacts-and-delivery.md) | 产物、血缘、交付和清理 |
| [12-memory-and-learning.md](12-memory-and-learning.md) | 运行记忆、工作区记忆和技能沉淀 |
| [13-cross-canvas-orchestration.md](13-cross-canvas-orchestration.md) | 跨画布调用、事件、等待和关联 |
| [14-security-and-governance.md](14-security-and-governance.md) | 权限、策略、信任和审计 |
| [15-goal-a-runbook.md](15-goal-a-runbook.md) | 一个抽象目标 A 的全流程推演 |
| [16-system-contracts.md](16-system-contracts.md) | 子系统边界、数据契约和验收不变量 |
| [17-core-data-model.md](17-core-data-model.md) | 核心持久化实体、关系和索引 |
| [18-implementation-breakdown.md](18-implementation-breakdown.md) | 从目标 A 到可开发系统的模块拆解 |
| [19-control-modes.md](19-control-modes.md) | 人类与 Agent 的构建、执行和交接模式 |

## 术语约定

```text
Goal        用户希望最终实现的结果
Objective   可验证的中间结果
Task        可交给执行单元的一项工作
Action      对环境产生变化的具体动作
Capability  能完成某类动作或任务的能力
Plan        对目标的候选实现方案
Graph       可执行的节点和关系
Run         某个版本图的一次运行
Artifact    需要保存、传递或交付的资源
Evidence    支持结论的可复核证据
```
