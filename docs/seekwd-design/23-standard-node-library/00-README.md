# Pong Harness 标准节点库

标准节点库是 Pong Harness 的最小运行时语言。它不是业务节点市场，也不是某个领域的工具集合；它提供任何目标都可能需要的控制、数据、人工协作、Agent 协作、验证和运行管理原语。

## 标准节点的边界

标准节点必须满足：

- 语义稳定，不依赖某个具体行业。
- 输入、输出和失败方式可以定义。
- 能被 Graph Service 静态校验。
- 能被 Runtime Scheduler 统一调度。
- 能被人类和 Agent 创建、编辑、调试和复用。
- 能在没有具体外部工具时以受控实现运行。

领域能力、外部服务和用户自定义实现通过扩展协议接入，不直接修改标准节点语义。

## 节点分类

| 文档 | 节点族 |
| --- | --- |
| [01-catalog.md](01-catalog.md) | 完整目录、ID 规则和必需能力 |
| [02-input-output.md](02-input-output.md) | 输入、输出、人工输入和 Artifact |
| [03-data-state.md](03-data-state.md) | 常量、变量、状态、映射和转换 |
| [04-control-flow.md](04-control-flow.md) | 顺序、条件、分支、合并和终止 |
| [05-loop-and-iteration.md](05-loop-and-iteration.md) | 循环、迭代、批处理和收敛 |
| [06-wait-event-trigger.md](06-wait-event-trigger.md) | 等待、事件、触发和超时 |
| [07-human-collaboration.md](07-human-collaboration.md) | 输入、审批、选择、审查和接管 |
| [08-agent-nodes.md](08-agent-nodes.md) | Agent、规划、观察、验证和委派 |
| [09-capability-and-context.md](09-capability-and-context.md) | 能力解析、环境选择、上下文和资源 |
| [10-composite-and-canvas.md](10-composite-and-canvas.md) | 复合节点、画布调用和图变更 |
| [11-verification-and-quality.md](11-verification-and-quality.md) | 断言、检查、评估和质量门 |
| [12-error-retry-compensation.md](12-error-retry-compensation.md) | 错误、重试、降级和补偿 |
| [13-cache-checkpoint.md](13-cache-checkpoint.md) | 缓存、检查点、恢复和幂等 |
| [14-observe-log-debug.md](14-observe-log-debug.md) | 日志、观察、断点和调试控制 |
| [15-node-manifest-schema.md](15-node-manifest-schema.md) | 标准节点 Manifest 和 Schema |
| [16-standard-library-rules.md](16-standard-library-rules.md) | 标准节点的开发、兼容和验收规则 |

## 标准节点的统一结构

```text
NodeDefinitionVersion
  identity
  responsibility / non-goals
  input / output / control / event ports
  configuration schema
  execution semantics
  verification semantics
  error semantics
  policy and environment requirements
  observability contract
  compatibility and migration
```

