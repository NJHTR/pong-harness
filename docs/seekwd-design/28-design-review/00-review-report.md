# Seekwd / Pong Harness 设计审查报告

> 审查范围：`docs/seekwd-design` 全部设计文档，重点覆盖身份与版本、入口、状态机、GraphPatch、跨画布运行、执行环境、权限恢复，以及 Workbench UI。  
> 审查结论：当前适合受限内部验证、UI 与核心运行时联调、标准节点合同测试；不适合对普通用户宣称“可执行任意未知任务的完整 Agent”。
> 开放门禁：按 [01-open-gate-matrix.md](01-open-gate-matrix.md) 逐项提交真实验收证据；Mock、静态 UI 和类型骨架不计为实现完成。

## 1. 总体判断

产品方向成立：本地优先的 Agent Workbench，以 Workspace 作为资源与权限边界，以 Canvas 作为可版本化图，以 Node 作为最小调度责任单元，同时支持人类、Agent 和混合控制。

此前真正的风险不是理念缺失，而是跨层合同容易漂移：旧文档把提案写成确定规范，单一主入口无法覆盖事件触发，状态在不同服务中使用不同枚举，运行图修改缺少完整原子协议，Draft 与可执行版本的边界模糊，UI 也没有覆盖审批、恢复、发布、权限和证据等关键操作路径。

本轮已建立 `27-normative-contracts` 作为正式合同层，并把 UI 信息架构单独整理到 `26-ui-system/02-information-architecture.md`；UI 的交互闭环和未覆盖元素进一步列在 [02-ui-gap-analysis.md](02-ui-gap-analysis.md)。这些改动解决了“应该怎么解释”的问题，但不等于代码已经实现。

## 2. 已解决并冻结的基础合同

### 2.1 规范状态分层

正式合同现在明确区分：

- `Normative Contract`：跨组件必须遵守，可作为 SDK/API 依据。
- `Provisional Contract`：方向确定但字段仍可能变化，仅限内部实验。
- `Experimental Proposal`：候选方案，不承诺兼容。
- `Implementation Status`：当前代码事实，不定义目标协议。
- `Informative`：背景和解释，不能单独作为协议依据。

旧文档未显式标注的内容按 Informative 处理，冲突时以 `27-normative-contracts` 为准。

### 2.2 版本边界

```text
CanvasIdentity  ->  CanvasDraft  ->  CanvasRevision  ->  CanvasRelease
                                      \-> Debug Run
```

- Draft 可变，只能编辑、校验和保存。
- Revision 不可变，是调试运行的最小稳定引用。
- Release 是对外调用和正式运行的稳定引用。
- 正式运行不得隐式读取当前 Draft。
- RunSnapshot 固化实际 Revision/Release、Entrypoint、Goal、策略、授权和输入引用。

### 2.3 入口模型

- 每个 Revision 必须且只能有一个 `defaultEntrypointId`。
- 可以有多个命名入口，以及多个事件、定时、Webhook、父画布调用触发器。
- Trigger 将外部事实转换为入口调用，不等同于 Entrypoint。
- `primaryNodeId` 只作为旧数据迁移字段，不能继续作为全系统入口语义。

### 2.4 状态模型

统一状态注册表已经区分运行、节点运行、执行句柄、审批、授权、执行上下文和目标状态，并明确每个状态的终态性、重试、恢复、人工处理和下游传播。

特别冻结：

- `orphaned` 是执行句柄仍需对账的异常非终态。
- `outcome_unknown` 是对账耗尽后的异常终态。
- `waiting_*` 属于 Run/NodeRun 等等待记录，不属于 NodeResult。
- `completed_after_cancel` 保留事实输出，但默认阻断后续副作用。
- `revoked` 属于 Grant/ExecutionContext，不直接复制为 Run/NodeRun 状态。

### 2.5 图补丁与运行补丁

GraphPatch 现在具有版本前置条件、原子操作、逆操作、before-image、影响分析、验证计划、权限/预算变化、审批绑定和幂等键。RunPatch 只调整尚未执行的计划，不得改写历史事实，也不得绕过 GraphPolicy。

任何导致权限、环境、网络、秘密、预算、外部主体或不可逆副作用扩大 的修复，都必须重新评估或审批。

### 2.6 跨画布与副作用

- 跨画布至少一次投递，使用 `invocationId`、`deliveryId`、幂等键和消费者去重。
- 支持 Call and Wait、Fire and Continue，以及父子 Run 恢复和循环检测。
- 动作必须声明 `safe_to_retry`、`idempotent`、`reconciliation_required` 或 `manual_only` 等 Effect Profile。
- 取消请求不等于动作已取消；结果未知必须进入对账或人工处置，不能直接继续下游副作用。

## 3. 仍然存在的高风险实现缺口

这些问题已经有设计方向，但尚未具备可开放的实现能力。

| 风险 | 当前状态 | 开放前验收 |
|---|---|---|
| Host 命令与事件 | 命令服务和事件表有骨架，路由、幂等信封、游标订阅、断线重同步未完整接入 | 断线、重放、重复命令和投影重建测试通过 |
| Runtime 调度 | 图编译和状态类型已有，暂停、取消、等待、恢复协调器未完整 | 端到端跑完等待输入、暂停、重启、恢复、取消 |
| Worker 执行器 | 尚无真实本地进程、沙箱、Docker、远程执行器 | 至少完成 LocalRestricted，并通过资源/文件/网络/取消测试 |
| Agent Runtime | 只有结构化提案类型，模型、能力发现、Patch 审批和修复闭环未接入 | Agent 只能通过结构化命令和 GraphPatch 操作，无法直接改事实 |
| 恢复与对账 | 合同已定义，外部句柄查询和补偿执行未完成 | 模拟响应丢失、重复副作用、超时和人工声明结果 |
| 权限与秘密 | AuthorityProfile 有定义，真实资源规范化、Grant 绑定、秘密存储未完整 | 默认 deny、扩大权限重新审批、日志无明文秘密 |
| 跨画布 | 语义已定义，投递、去重、结果过期、取消传播尚未全面实现 | 父子 Run 断线和重复事件测试通过 |
| 发布与迁移 | Revision/Release 合同已定义，Release Manager、兼容性检查和撤回未实现 | 调用方固定 Release，发布、弃用、回滚可审计 |

## 4. UI 仍需补齐或明确的页面

`26-ui-system/02-information-architecture.md` 已列出大部分缺失表面。页面级优先级、跨页面上下文、大数据和命令闭环见 [02-ui-gap-analysis.md](02-ui-gap-analysis.md)。以下是最容易被遗漏、但会直接影响可用性的补充审查结果。

### 4.1 首次使用和生命周期

- Welcome / No Workspace：首次启动、最近工作区失效、目录不可访问、恢复上次会话。
- Workspace Create / Open：路径规范化、权限预览、锁定/占用、迁移旧目录、取消回滚。
- Workspace Overview：活跃 Run、等待事项、错误、环境健康、最近产物和配额摘要。
- Workspace Archive / Delete：删除前影响分析、导出、保留审计和恢复窗口。

### 4.2 图定义与发布

- Entrypoints & Triggers：默认入口、命名入口、事件过滤、测试触发和禁用状态。
- Graph Validation：结构错误、类型错误、入口错误、策略错误、循环、未绑定环境和不可恢复副作用。
- Save / Revision History：Draft 保存、不可变 Revision、Diff、恢复为 Draft、版本标签。
- Release Manager：版本号、兼容性、调用方、渠道、弃用、撤回和迁移提示。
- GraphPatch Review：Agent 提案的结构 diff、权限/预算变化、验证计划和审批动作。
- Port & Edge Inspector：类型、基数、条件、映射、投递策略、连接计数和跨画布引用。

### 4.3 运行、等待和恢复

- Run Launch Sheet：Revision/Release、入口、输入绑定、执行模式、AuthorityProfile、预算、幂等键。
- Run Monitor：节点进度、子 Run、等待、成本、事件和人工介入。
- NodeRun Detail：Attempt、输入输出、日志、环境、Evidence、错误、重试链和副作用状态。
- Waiting Input：字段 schema、上下文、截止时间、跳过/取消及输入验证。
- Approval Inbox：动作摘要、资源范围、授权期限、调用链、一次性/有界授权、拒绝原因。
- Recovery Center：`orphaned`、`cancel_pending`、`outcome_unknown` 的对账、声明、补偿和前向修复。
- Cross-Canvas Trace：父子 Run、Invocation、值映射、去重和取消传播。
- Run History / Compare：不同 Run 的输入、版本、策略、差异、结果和证据对比。

### 4.4 资源、扩展和运维

- Artifact Browser：Artifact、Evidence、Lineage、敏感度、导出和删除。
- Environments / Execution Context：环境发现、安装、健康、绑定、mount、网络、资源限制和清理。
- Agents & Connections：身份、能力声明、信任、健康、凭据和撤销。
- Extensions：Manifest、来源、权限、版本、沙箱、升级和卸载影响。
- Policy & Authority、Secrets、Usage & Budgets：策略模拟、秘密轮换、成本归因和限制。
- Audit & Event Explorer：命令、事件、审批、补丁、游标、完整性摘要和导出。
- Retention & Storage：配额、保留覆盖、GC dry-run、加密状态和迁移。
- Host / System Health：Host、Worker、数据库、更新、后台任务、诊断包和重连。
- Notification Center / Attention Center：通知持久化、静音、聚合、免打扰和行动入口。

## 5. UI 设计上仍需避免的错误

1. **把状态图标当成事实本身**：图标、颜色和 Toast 必须来自同一状态投影；关闭通知不等于处理问题。
2. **把 Draft 当成可运行对象**：运行面板必须明确显示 Revision/Release 和 Debug/Release 模式。
3. **把 Run History 变成全局导航**：单画布记录归属于 Canvas；跨画布链路用 Trace 追踪，不污染全局侧栏。
4. **把删除当成简单 UI 动作**：Workspace、Canvas、Node 删除必须先取服务端 ImpactAnalysis，列出调用方、活动 Run、边、等待和不可逆影响。
5. **把端口无限堆在节点上**：节点尺寸稳定，端口超过阈值进入分组和虚拟列表，完整信息在 Inspector。
6. **只设计成功路径**：每个命令必须覆盖 pending、approval_required、conflict、failed；每个 Run 必须覆盖等待、暂停、取消待确认、恢复和结果未知。
7. **让 Agent 直接写数据库或自然语言改图**：Agent 只能提交结构化命令、GraphPatch 或 RunPatch，所有变更可预览、校验、审批和审计。
8. **将权限做成开关**：UI 需要展示资源范围、网络、秘密、预算、时限和后台策略，不能只显示“全权模式”。
9. **让离线状态看起来像成功**：Host 断开时禁止伪装命令已接受，恢复后必须通过快照和游标重同步。
10. **忽略键盘和减少动效**：复杂画布必须支持键盘导航、焦点可见、语义标签、reduced-motion 和不依赖颜色的状态表达。

## 6. 开放边界

### 现在可以宣称

- 节点/端口/边的图模型和静态校验骨架。
- Draft、Revision、Release、入口和状态的正式设计合同。
- 结构化 GraphPatch、RunPatch、权限和副作用的协议设计。
- UI Lab 中的画布编辑、组件和 Mock 数据适配器。
- 受限内部验证和运行时联调。

### 现在不能宣称

- 任意未知桌面应用的可靠自动操作。
- 已具备完整本地、沙箱、Docker 或远程执行能力。
- 无审批全权代理。
- 任意外部 Agent 的统一取消、身份和结果验证。
- 跨机器强一致恢复。
- 任意不可逆副作用的自动补偿。
- “设计文档已完成”即等同于“产品已可开放”。

## 7. 设计冻结验收清单

开放前必须至少完成以下可验证场景：

1. 创建 Workspace，生成 Draft，保存 Revision，发布 Release，并从默认/命名入口分别运行。
2. Agent 提交 GraphPatch，系统展示结构 diff、权限/预算变化，拒绝越权 patch，并可回滚已应用 patch。
3. Run 经过输入等待、人工审批、暂停、应用重启、恢复、取消和审计。
4. 子画布至少一次投递重复到达，父 Run 正确去重；子 Run 结果已完成但父进程断线时可恢复。
5. 本地受限执行器拒绝工作区外文件、网络、秘密和依赖安装，并能取消受控进程。
6. 外部句柄响应丢失时进入 `orphaned`/`reconciling`，对账耗尽后进入 `outcome_unknown`，不得自动执行高风险下游。
7. 删除被引用的 Node、Canvas、Workspace 时展示完整影响并生成可审计命令。
8. Host 断线、事件丢失、重复事件和快照重同步后，UI 投影与事实一致。
9. 所有默认节点通过状态、取消、幂等、权限、Artifact 血缘和组合图合同测试。
10. 普通用户在 UI 中可以找到每个等待、审批、错误、恢复和产物处理入口，不需要阅读协议文档才能继续工作。

## 8. 结论

Seekwd / Pong Harness 现在应被定位为“设计合同已进入可冻结阶段、实现仍处于受限验证阶段”的本地 Agent Workbench。下一步不是继续无边界增加节点或 UI，而是按本报告的验收场景把 Host、Runtime、Worker、事件恢复和审批闭环逐项落地；每完成一项都同步更新 `15-current-implementation-status.md`，不得用 Mock 页面或类型定义替代真实能力。
