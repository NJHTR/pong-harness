# 从目标 A 到可开发系统的模块拆解

本文件回答“实现目标执行系统究竟需要哪些东西”。模块按依赖顺序组织，但最终系统需要全部具备。

## I. 目标层

### I-1 Goal Intake

责任：保存用户原话，创建 Goal，提炼目标、交付物、约束、偏好、假设和成功标准。

输入：自然语言、附件、已有上下文、用户设置。

输出：GoalVersion、澄清请求或可进入拆解的目标包。

验收：原话不可丢失；推测与用户明确要求可区分；缺少关键条件时不擅自启动高风险执行。

### I-2 Goal Versioning

责任：管理目标及其版本、差异、父子目标和替代关系。

验收：历史运行永远能回到当时的目标版本；变更成功标准会生成新版本。

## II. 认知层

### II-1 Context Assembly

责任：将目标、资源、限制、记忆、前置产物和策略裁剪为节点可用 Context Packet。

验收：上下文有来源和作用域；敏感数据不越权注入；过期信息可被识别。

### II-2 Planner

责任：把目标拆成 Objective 和 Task，生成候选 Plan，解释选择与不确定性。

验收：每个任务有输入、输出、完成条件和失败策略；计划可被审阅，不是不可解释文本。

### II-3 Capability Resolver

责任：根据 CapabilityNeed 找到、比较、探测、组合或构造能力。

验收：选择结果满足数据、环境、权限和信任条件；无候选时生成 CapabilityGap，而非伪造可执行节点。

## III. 图层

### III-1 Graph Compiler

责任：将 Plan 编译为 CanvasVersion、节点、端口和边。

验收：图通过端口、循环、终止、预算、权限和环境静态校验。

### III-2 Graph Mutation Engine

责任：创建、验证、预览、应用和回滚 GraphPatch。

验收：运行中任何图变更都可以找到原因、发起者、影响范围和前后版本。

### III-3 Canvas Module System

责任：支持画布接口、复合节点、内部子图、版本依赖、导入导出和跨画布调用。

验收：调用方仅依赖公开接口；内部重构不破坏兼容调用。

## IV. 运行层

### IV-1 Scheduler

责任：根据依赖计算就绪节点，分配队列、并发、预算、重试、等待和取消。

验收：并行根节点能并发；会合节点等待正确前置；取消和失败正确传播；不会无限重试。

### IV-2 Executor Gateway

责任：向任意实现类型提供统一执行包络、流输出、取消、错误和结果契约。

验收：执行器不能扩大权限；所有副作用都可审计；不支持取消的执行器必须明确声明。

### IV-3 Environment Resolver

责任：将节点需求匹配到执行上下文，处理不可用、准备、绑定、刷新和失效。

验收：环境缺失明确进入等待或修复路径；节点不会在错误上下文中悄悄执行。

### IV-4 Checkpoint and Recovery

责任：持久化状态、外部句柄和产物引用，支持暂停、重启和恢复。

验收：恢复不会重复未知副作用；过期授权和外部状态会重新验证。

## V. 质量层

### V-1 Observation and Evidence

责任：统一记录观察、状态、日志、外部回执和来源。

验收：任何结论可追溯证据；证据有时间、完整性和新鲜度。

### V-2 Verification Engine

责任：执行成功标准、质量门、验证报告和失败差距说明。

验收：节点结束不等于目标成功；成功必须对应阻塞性标准的通过报告。

### V-3 Repair Engine

责任：失败分类、原因假设、补丁生成、替代路径和受影响分支重跑。

验收：修复不能删除成功标准来伪造完成；修复过程自身可审计。

## VI. 人机协作层

### VI-1 Human Gateway

责任：输入、选择、审批、审查、接管、反馈和模式切换。

验收：每个请求可定位到目标、节点和影响范围；响应后能准确恢复等待节点。

### VI-2 Workbench UI

责任：呈现目标、画布、节点、输出、证据、日志、审批、版本和调试控制。

验收：用户可以从最终结果追溯过程，也可以从失败节点定位受影响交付物；复杂内部过程可以折叠但不能不可见。

## VII. 资产与记忆层

### VII-1 Artifact Service

责任：存储资源、版本、血缘、访问控制、保留和清理。

验收：大型内容不复制到图；产物删除不破坏仍被引用的运行或技能。

### VII-2 Memory and Skill Registry

责任：管理运行、工作区、用户记忆以及技能候选、验证、发布和回滚。

验收：记忆可管理；技能带版本、测试和适用范围；学习不绕过安全策略。

## VIII. 治理层

### VIII-1 Policy Engine

责任：评估权限、预算、风险、网络、数据和环境规则。

验收：授权绑定到具体动作与资源；策略改变能影响未执行节点。

### VIII-2 Audit Service

责任：记录可审计事件、决策、审批、变更、调用和数据引用。

验收：可以按目标、运行、产物、能力或权限反查；敏感数据按策略脱敏。

## 依赖关系

```text
Goal + Context
  -> Planner + Capability Resolver
  -> Graph Compiler + Policy Engine
  -> Scheduler + Executor Gateway + Environment Resolver
  -> Observation + Artifact + Verification
  -> Repair or Delivery
  -> Memory / Skill Registry
```

没有 GoalVersion、GraphVersion、Run、NodeRun、Artifact、Evidence、PermissionDecision 这七个核心实体，系统不能满足可追溯、可调试和可恢复要求。

