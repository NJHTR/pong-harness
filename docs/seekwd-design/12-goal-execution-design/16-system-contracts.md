# 子系统边界与系统契约

## 子系统

```text
Goal Service          目标规范化、版本和成功标准
Context Service       上下文组装、来源、过滤和新鲜度
Planner               拆解、能力需求和候选计划
Capability Registry   能力描述、发现、匹配和信任
Graph Service         图定义、版本、补丁和静态校验
Runtime Scheduler     队列、依赖、并发、检查点和恢复
Executor Layer        在受控上下文运行节点实现
Observation Service   观察、证据、状态和事件
Verification Service  成功标准和质量判定
Human Gateway         输入、审批、接管和反馈
Artifact Service      产物、血缘、权限和保留
Memory Service        记忆、技能、检索和发布
Policy / Audit        权限、审批、审计和治理
```

## 关键接口

```text
submitGoal(GoalRequest) -> GoalVersion
decomposeGoal(GoalVersion) -> Plan
discoverCapability(CapabilityNeed) -> CandidateSet
compilePlan(Plan) -> GraphVersion
applyPatch(GraphPatch) -> GraphVersion or RunPatch
startRun(GraphVersion, Input) -> RunHandle
observe(RunHandle) -> ObservationSet
verify(RunHandle) -> VerificationReport
pause / resume / cancel(RunHandle)
deliver(RunHandle) -> DeliveryManifest
promote(RunHandle or GraphVersion) -> SkillVersion
```

## 全局契约

1. 所有外部输入必须带来源和作用域。
2. 所有节点运行必须关联目标、图版本和权限上下文。
3. 所有副作用动作必须可取消、可审计或明确声明不可取消。
4. 所有等待必须有恢复条件、超时和取消语义。
5. 所有成功结论必须有验证报告。
6. 所有动态图变化必须可预览、可回滚、可追溯。
7. 所有跨画布调用必须能关联父子运行。
8. 所有共享能力必须有版本、信任等级和适用范围。

## 可观测性要求

系统至少提供目标、画布、节点、执行上下文、Artifact、权限和证据六类索引，让用户能从任一最终结果追溯完整过程，也能从任一失败节点找到受影响的目标和交付物。

