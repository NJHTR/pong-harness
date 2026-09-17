# Agent 协议

## Agent 的位置

Agent 是受控的规划和执行主体，不是能够直接触碰所有内部服务的超级用户。Agent 通过 Command、Query、Capability 和 Executor 契约与 Harness 交互。

## Agent Invocation

```text
AgentInvocation
  invocationId
  agent capability version
  goal / task reference
  context packet reference
  allowed capability refs
  allowed graph operations
  authority summary
  budget and deadline
  expected deliverables
  cancellation handle
```

## Agent 输出通道

Agent 可以输出：

```text
observation proposal
plan proposal
capability need
capability selection proposal
graph patch proposal
action request
human request
verification proposal
structured final result
```

Agent 的文本解释只是辅助展示；任何会改变系统状态的内容都必须在上述结构化通道中出现。

## 计划协议

PlanProposal 必须列出目标、子目标、依赖、成功标准、已知与未知、假设、能力需求、风险、估算成本、替代方案和下一步。Harness 或人类可以接受、部分接受、修改或拒绝。

## 观察协议

Agent 不能把推理当作 Observation。它提交的观察必须带来源引用；推理结论应作为 Claim，等待验证器确认或标记为不确定。

## 自主循环

Agent 可以在授予的步骤和预算内重复：观察、计划、请求动作、评估结果和修复。每一轮都写入 Invocation Event；超出预算、连续无进展、重复补丁或策略冲突时自动暂停并请求人类或上层 Agent。

## Agent 之间的委派

委派使用子 Invocation，继承但收紧父调用的目标、权限、预算和取消语义。父 Agent 只能消费子 Agent 的结构化结果、观察、证据和 Artifact，不能假设子 Agent 的内部推理或私有状态。

