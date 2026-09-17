# 人类与 Agent 控制模式

## 设计结论

人类和 Agent 都是可创建、可修改、可审查、可执行的操作主体。控制模式描述“当前由谁负责哪一类动作”，不描述产品的不同版本或不同系统。

## 两个独立维度

### 构建控制

决定谁创建或修改目标、画布、节点、连接、配置、成功标准和错误路径：

```text
human          人类直接编辑
agent          Agent 根据目标自动编辑
collaborative  人类提供方向，Agent 提议和实现，人类确认关键变化
```

### 执行控制

决定谁推进节点、提供输入、处理分支、执行动作、验证结果和修复失败：

```text
human          人类逐个执行或提交结果
agent          Agent 自动推进
collaborative  Agent 执行低风险步骤，人类处理决策和高风险步骤
```

两个维度可以自由组合：

| 构建 | 执行 | 适用方式 |
| --- | --- | --- |
| human | human | 完全手工设计和调试 |
| human | agent | 人类搭建框架，Agent 执行 |
| agent | human | Agent 建议完整方案，人类逐步验证 |
| agent | agent | 目标驱动的自动规划和执行 |
| collaborative | collaborative | 人类和 Agent 按节点、阶段和风险共同工作 |

## 控制粒度

模式可以设置在：

```text
整个目标
一张画布
一个子画布
一个节点
一个节点操作
一个决策点
一次重试或修复
```

更具体的设置覆盖更宽泛的默认设置，但不能绕过系统安全策略和用户明确的禁止项。

## 交接协议

任何主体交接都生成 `ControlHandoff`：

```text
ControlHandoff
  runId
  graphVersion
  scope                 交接的节点或子图
  fromPrincipal
  toPrincipal
  checkpointId
  currentInputs
  pendingDecisions
  expectedEvidence
  authorityScope
  expiration
  reason
```

交接前必须保存检查点；接收主体必须确认输入、目标、权限和完成条件。交接后的结果沿用同一运行链，但明确记录由谁产生。

## 人工执行节点

人工执行必须是完整节点，而不是调度器里的特殊空白：

```text
输入说明
操作范围
完成条件
需要提交的结果或证据
可选的超时、取消和转交
```

人工提交后，验证器按普通节点处理；失败可以退回人类、交给 Agent 修复或重新规划。

## Agent 代理边界

Agent 可以提出计划、创建节点、修改配置、执行、验证和修复，但每项能力都受当前控制模式、权限、预算、环境和信任等级约束。Agent 不能通过切换控制模式扩大自身权限。

## 用户操作

用户始终可以：

```text
暂停当前主体
接管节点或子图
将控制交还 Agent
锁定节点不允许 Agent 修改
批准或拒绝单个变更
从检查点回到上一个主体
以人工结果替代某次执行
```

锁定、接管和替代都进入 Graph Patch、Run Event 和 Audit Event，不能只保存在前端状态。

## 完成判定

无论由谁执行，目标都必须经过同一套成功标准和验证器。人工完成不能天然代表成功，Agent 完成也不能天然代表成功；区别只在执行主体和证据来源。

