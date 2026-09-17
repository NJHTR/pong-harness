# 逻辑组件与责任

## Workbench Shell

责任：窗口、导航、布局、快捷操作、本地用户交互、草稿编辑、渲染订阅数据和发起命令。不能直接访问秘密、执行上下文私有文件或绕过 Host 运行节点。

## Local API Gateway

责任：本地客户端认证、协议协商、命令验证、查询、订阅、限流和会话恢复。它不承载领域规则，只将请求送往对应服务。

## Goal and Context Layer

责任：目标版本、约束、成功标准、Context Packet 和来源。不能直接操作画布或执行器。

## Planning and Capability Layer

责任：Plan、CapabilityNeed、CandidateSet、CapabilityBinding 和 CapabilityGap。它只能提出图和执行建议，不能绕过 Graph Service 或 Policy Service。

## Graph Layer

责任：CanvasDraft、CanvasVersion、GraphPatch、静态校验、复合节点和接口兼容性。不能更新运行状态。

## Runtime Layer

责任：Run、NodeRun、队列、状态机、检查点、恢复、跨画布编排和取消传播。它不理解领域业务内容，也不直接写 Artifact 内容。

## Execution Layer

责任：ExecutionContext、Executor Gateway、ExecutionHandle、流、取消和资源限制。执行器只返回结果和观察。

## Artifact and Evidence Layer

责任：Artifact revision、内容存储、血缘、Observation、Evidence 和 DeliveryManifest。它不决定是否放行目标。

## Policy and Audit Layer

责任：身份、权限、审批、预算、策略决策、撤销和不可篡改审计。任何带副作用的执行都必须经过这一层。

## Memory and Skill Layer

责任：记忆、技能、回归样本、版本、信任和退化处理。它不能把历史案例自动当作当前运行事实。

## Projection Layer

责任：搜索、列表、时间线、统计、通知和 UI 投影。投影可以重建，不能被其他组件当作事实来源。

