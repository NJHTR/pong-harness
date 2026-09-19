# 目标、规划与能力选择服务

## Goal Service

职责：接收 GoalRequest，保存原话，产生 GoalVersion，管理约束、假设、成功标准、父子目标和生命周期。Goal Service 不决定如何执行，也不调用执行器。

关键命令：

```text
submitGoal
clarifyGoal
updateGoal
addConstraint
setSuccessCriterion
cancelGoal
archiveGoal
```

## Planning Service

职责：从 GoalVersion 和 Context Packet 生成多个 PlanCandidate，说明子目标、依赖、风险、能力需求、验证点和待决问题。

Planner 的输出必须是结构化 Plan，不是只能展示给用户的一段自然语言。每项任务有稳定 Task ID，方便后续编译、拒绝、替换和比较。

## Capability Service

职责：将 Task 的 CapabilityNeed 匹配到 CandidateSet，静态过滤不兼容候选，执行低风险探测，并生成 CapabilityBinding。无候选时创建 CapabilityGap。

选择记录包含：候选列表、拒绝原因、评分维度、最终选择、信任证据、备用选择和重选条件。

## 建图协议

Planner 不直接创建运行。流程是：

```text
GoalVersion
  -> PlanCandidate
  -> CapabilityBinding proposals
  -> GraphDraft proposal
  -> Graph static validation
  -> policy / human decision
  -> CanvasDraft / GraphPatch or RunPatch
  -> Runtime start
```

这保证用户可以在“目标理解”“计划”“图结构”“执行”四个层次分别介入。
