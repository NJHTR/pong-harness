# Pong Harness 核心运行时服务规范

本目录将前面的领域定义落实为协作服务。这里的“服务”是责任边界，不要求一开始部署为独立进程；早期可以在同一 Host 内实现，但接口和事实来源必须保持分离。

## 总体请求路径

```text
用户或 Agent Command
  -> Command Gateway
  -> Authorization
  -> Domain Service
  -> Transaction / Event Append
  -> Projection Update
  -> Runtime Scheduler or Human Gateway
  -> Executor Gateway
  -> Observation / Artifact / Verification
  -> Run Event
```

## 文档索引

| 文件 | 内容 |
| --- | --- |
| [01-service-map.md](01-service-map.md) | 服务职责、事实来源和依赖方向 |
| [02-command-query-contract.md](02-command-query-contract.md) | 命令、查询、幂等和响应模型 |
| [03-goal-and-planning-service.md](03-goal-and-planning-service.md) | 目标、规划、能力选择和建图职责 |
| [04-graph-service.md](04-graph-service.md) | 图草稿、版本、校验和补丁服务 |
| [05-runtime-orchestrator.md](05-runtime-orchestrator.md) | 运行创建、调度、节点执行和恢复 |
| [06-executor-gateway.md](06-executor-gateway.md) | 执行器、句柄、取消、流和结果收集 |
| [07-artifact-service.md](07-artifact-service.md) | Artifact、血缘、访问、保留和交付 |
| [08-observation-verification-service.md](08-observation-verification-service.md) | 证据、验证和结论服务 |
| [09-policy-approval-service.md](09-policy-approval-service.md) | 授权、审批、撤销和策略执行 |
| [10-memory-skill-service.md](10-memory-skill-service.md) | 记忆、技能候选、验证和发布 |
| [11-agent-protocol.md](11-agent-protocol.md) | Agent 的输入、输出、计划、补丁和交接 |
| [12-recovery-and-compensation.md](12-recovery-and-compensation.md) | 崩溃恢复、孤儿执行、补偿和一致性 |
| [13-api-and-subscription-surface.md](13-api-and-subscription-surface.md) | UI、Host、扩展的 API 与订阅边界 |
| [14-threat-model.md](14-threat-model.md) | 信任边界、攻击面和最低防护要求 |
| [15-definition-of-done.md](15-definition-of-done.md) | 每个核心能力的完成定义 |

