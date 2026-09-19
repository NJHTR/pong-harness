# 服务地图

## 服务与事实来源

| 服务 | 负责事实 | 不负责 |
| --- | --- | --- |
| Identity Service | 主体身份、会话、设备关联 | 授权决策本身 |
| Goal Service | Goal、GoalVersion、约束、成功标准 | 节点调度 |
| Context Service | Context Packet、来源、裁剪和新鲜度 | 持久化任意外部内容 |
| Capability Service | CapabilityDescriptor、候选、绑定和信任 | 直接执行能力 |
| Graph Service | CanvasDraft、CanvasRevision、CanvasRelease、GraphPatch | Run 状态 |
| Runtime Service | Run、NodeRun、队列、检查点、状态事件 | 改写图版本 |
| Executor Gateway | 执行句柄、流、取消和 NodeResult | 授权放行 |
| Artifact Service | Artifact、revision、血缘、存储引用 | 判定目标成功 |
| Observation Service | Observation、Evidence、时间与来源 | 执行节点 |
| Verification Service | 成功标准、报告和结论 | 修改原始证据 |
| Policy Service | 策略、Decision、ApprovalGrant、撤销 | 运行调度顺序 |
| Memory Service | 记忆、技能、发布与回归样本 | 当前运行事实 |
| Projection Service | UI 列表、搜索、时间线、统计 | 作为事实来源 |
| Audit Service | 追加式审计记录与证明 | 业务状态投影 |

## 依赖方向

```text
Goal / Capability / Graph
  -> Policy
  -> Runtime
      -> Executor
      -> Artifact / Observation
          -> Verification
              -> Runtime terminal decision
```

Planner 是 Application Component：它可以请求 Goal、Context、Capability 和 Graph 服务，但不拥有其中任一事实。Agent 也遵守相同规则。

## 事务边界

一个服务只在自己拥有的事实边界内做强一致写入；跨服务通过包含因果关联的事件和可恢复工作流协调。禁止一个服务直接写另一个服务的数据表来“省一次调用”。

## 同进程实现

首个版本可以把服务实现为同一进程内的模块，但要保持：独立接口、独立事务、显式事件和禁止跨模块私有状态访问。未来拆分进程时不应改变领域语义。
