# Pong Harness 基础规范

节点和画布规范定义了图语言；本目录继续定义图语言依赖的基础语义。目标是让同一个词在 Planner、Graph Service、Scheduler、Executor、UI、存储和审计中只有一种含义。

## 基础层级

```text
标识与时间
  -> 类型与 Schema
  -> 事件与消息
  -> 状态机
  -> 错误与结果
  -> 执行上下文
  -> 主体与策略
  -> 表达式与映射
  -> 存储与一致性
  -> 扩展与协议
  -> 观测与测试
```

## 索引

| 文件 | 内容 |
| --- | --- |
| [01-terms-identities-time.md](01-terms-identities-time.md) | 术语、身份、引用、时间和关联 ID |
| [02-types-and-schema.md](02-types-and-schema.md) | 值类型、Schema、兼容性和校验 |
| [03-events-and-messages.md](03-events-and-messages.md) | 事件信封、投递、顺序、重放和去重 |
| [04-state-machines.md](04-state-machines.md) | 目标、图、节点和运行状态机 |
| [05-errors-and-results.md](05-errors-and-results.md) | 错误、结果、重试和部分成功 |
| [06-execution-context.md](06-execution-context.md) | 执行上下文、资源、进程、网络和秘密 |
| [07-principals-and-authority.md](07-principals-and-authority.md) | 人类、Agent、节点和权限主体 |
| [08-policy-engine.md](08-policy-engine.md) | 策略规则、决策、审批和撤销 |
| [09-expressions-and-mapping.md](09-expressions-and-mapping.md) | 条件、映射、求值和安全边界 |
| [10-storage-consistency.md](10-storage-consistency.md) | 持久化、事务、一致性和恢复 |
| [11-extension-protocol.md](11-extension-protocol.md) | 节点、能力、执行器和画布扩展协议 |
| [12-observability.md](12-observability.md) | 日志、指标、追踪、审计和脱敏 |
| [13-testing-contracts.md](13-testing-contracts.md) | 契约测试、属性测试、回归和故障演练 |
| [14-system-boundaries.md](14-system-boundaries.md) | 模块边界、依赖方向和禁止耦合 |

## 使用规则

基础规范中的定义优先于界面文案、单个节点实现和 Agent 的临时解释。若实现需要违反基础规则，应先新增决策记录和迁移策略，而不是在局部代码中创造例外。

