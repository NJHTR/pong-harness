# Agent 节点

## Agent 节点的最小定义

Agent 节点是带目标、上下文、能力范围、观察、决策和验证循环的执行单元。它不是一个只有提示词和文本输出的特殊节点。

```text
agent goal
context inputs
available capabilities
allowed graph mutations
authority scope
budget / deadline / step limit
success criteria
human interaction policy
```

## `agent.plan`

生成结构化 PlanProposal：子目标、依赖、能力需求、成功标准、风险、成本、未知项和替代方案。计划可以被人类或上层 Agent 部分接受。

## `agent.observe`

请求或整理声明范围内的观察，返回 Observation 和来源，不把推断直接伪装成事实。

## `agent.decide`

根据 Goal、Context、Policy 和 Evidence 输出结构化 DecisionRecord。低置信或高风险决策可以转为 Human Choice 或 Approval。

## `agent.execute`

在授权的子范围内运行 Agent 循环。每轮的动作必须经过 Policy 和 Executor Gateway，不能让模型直接调用宿主能力。

## `agent.delegate`

创建子 Invocation，把目标、输入、预算和权限收紧后交给另一个主体。父节点等待结构化结果和完成证据。

## `agent.verify`

选择或运行验证器，返回通过、失败或未知，并列出证据和限制。Agent 自己的判断不能替代独立验证器，除非定义明确允许。

## `agent.repair`

读取结构化错误和证据，生成 RepairProposal 或 GraphPatch。它不能直接删除验证、放宽权限或修改目标来制造成功。

## 自主循环保护

Agent 节点必须限制轮数、无进展次数、预算、并发、递归深度和重复动作。相同观察导致相同 Patch 时，应暂停并请求人类或上层 Agent。

