# UI 缺口与交互闭环审查

> 状态：Provisional Contract  
> 范围：Workbench、Host 运维和安全敏感操作的 UI 覆盖。视觉样式不是本文件的重点；每个表面必须能连接到正式命令、查询和事实事件。

## 结论

页面清单已经覆盖了大多数领域对象，但“列出页面”不等于“设计完成”。当前最容易导致开放后混乱的缺口有四类：

1. 页面没有明确事实来源、命令、权限和恢复游标，容易退化为本地假状态。
2. 危险操作有确认框名称，但缺少服务端 ImpactAnalysis、审批、幂等和结果未知路径。
3. 大量运行和 Artifact 数据的分页、虚拟化、过期和敏感字段策略没有作为组件合同冻结。
4. 页面之间缺少稳定深链接和对象上下文，用户从通知、审批或错误进入时可能丢失 Workspace、Canvas、Run 作用域。

## P0：开放前必须可操作

| 表面/组件 | 必须显示 | 必须支持 | 不能接受的简化 |
|---|---|---|---|
| Workspace recovery | Host 实例、最后确认时间、未提交 Draft、未确认命令、迁移状态 | 恢复、只读打开、另存副本、放弃并审计 | 刷新后直接显示“已恢复” |
| Run launch sheet | Release/Revision、入口、输入 Schema、AuthoritySnapshot、预算、幂等键 | 预检、启动、审批、冲突和失败重试 | 必须调用 `startRun(StartRunInput)`；不得简化为 `startRun(canvasId)` |
| Command status | commandId、pending/accepted/approval/conflict/failed、关联事件 | 查看事实、重试同一幂等键、取消未处理命令 | 点击后立即变绿色 |
| Approval inbox | before/after 权限、资源、调用链、期限、数据敏感度和预算 | 有界批准、拒绝、撤销、查看影响 | 一个“Allow all”按钮 |
| Recovery center | effect、Handle、对账证据、禁止的下游动作 | 继续对账、声明结果、补偿、前向修复、终止 | 把 `outcome_unknown` 显示成普通失败 |
| GraphPatch review | 原子 diff、before-image、入口/边影响、权限/预算变化、验证计划 | 审批、拒绝、编辑、应用、逆补丁 | Agent 文本直接改图 |
| Offline / stale shell | 最后游标、快照时间、Host 连接状态、未发送命令 | 重连、重同步、冲突解决、只读浏览 | 离线时伪装命令已执行 |
| Release manager | Revision digest、兼容性、调用方、渠道、生命周期事件 | 发布、弃用、撤回、回滚和影响预览 | 修改已发布 Revision 内容 |

## P1：首个受邀试点必须覆盖

- **Entrypoint and trigger editor**：默认入口、命名入口、事件/定时/Webhook 过滤器、并发策略和测试事件；删除目标必须显示原子重绑定影响。
- **Port and edge inspector**：Schema、基数、聚合、映射 AST、投递保证、取消传播、连接数量和错误端口；多连接不能只用线条颜色表达。
- **Run monitor / debugger**：Run、NodeRun、Attempt、子 Run、检查点、变量引用、断点、调用栈和版本摘要；调试 Revision 必须明显区别于 Release。
- **Cross-canvas trace**：Invocation、deliveryId、去重结果、父子状态、输入输出映射、结果保留截止时间和取消传播。
- **NodeRun detail**：ExecutionContext、权限快照、日志 chunk、Evidence、Artifact、EffectIntent/Receipt、重试链和错误代码。
- **Artifact and data export review**：敏感度、Lineage、保留期、导出目标、脱敏预览和撤回；下载不能绕过数据导出策略。
- **Environment / execution context**：mount、网络、进程、资源限制、SecretRef、健康和失效原因；显示“应用层限制”与“操作系统强隔离”的差异。
- **Policy simulator**：给定 Node、入口、资源和 AuthorityProfile，解释 allow/deny、收紧路径和重新审批原因。
- **Host / system health**：Worker、数据库、事件日志、Outbox/Inbox、迁移和后台任务的健康；支持诊断包并预览脱敏结果。

## P2：可用性和运维完善

- Welcome、无 Workspace、路径权限预览、锁定目录和旧版本迁移。
- Goal / Plan Review，把自然语言目标、约束、成功标准、PlanCandidate 和 GraphPatch 提案分开。
- Extension / Node Definition Studio，包括 Manifest 权限、执行器能力、合同测试和版本撤回。
- Secrets、Budgets、Retention、Backup/Restore、Migration Center、Templates/Presets。
- Notification / Attention Center 的聚合、静音、免打扰、系统通知和跨 Workspace 过滤。

## 跨页面组件合同

### 对象上下文

所有详情、抽屉、通知和命令结果必须携带可重建的上下文：

```text
ObjectContext {
  workspaceId
  canvasId?
  revisionId?
  releaseId?
  runId?
  nodeRunId?
  aggregateSequence?
  projectionPosition?
}
```

深链接只能引用稳定 ID，不得依赖名称或当前选中项。上下文失效时必须进入 deleted、permission_denied、migration_required 或 resync_needed 状态之一。

### 大数据与过期

- Run、事件、日志、Artifact 和端口列表必须分页或虚拟化；UI 不得一次性渲染整个事件日志或千级端口。
- 每个列表显示查询游标、快照时间、是否有更多数据和刷新/重同步动作。
- 过期的 Artifact、Run 结果和事件游标显示过期原因以及可执行的重新运行、恢复或迁移动作。
- 敏感值默认只显示 Schema、摘要和引用；复制、展开、导出都要重新执行权限检查。

### 命令生命周期

所有有副作用的按钮、命令菜单和快捷键都必须统一呈现：

```text
idle -> pending -> accepted | approval_required | conflict | failed
accepted -> facts arriving -> completed | blocked | outcome_unknown
```

按钮禁用只能表示前置条件不满足；权限拒绝、冲突和 Host 离线必须仍然可见并给出下一步。Toast 只能提醒，不能承载唯一错误信息或恢复动作。

### 状态投影

颜色、图标、动画、文案、侧栏徽标和 Attention Center 必须来自同一投影版本。持续运行状态使用静态文本和可访问名称补充，`outcome_unknown`、`orphaned`、`cancel_pending` 等不能只用红/黄/绿圆点区分。

## 设计完成的判定

某个页面只有同时满足以下条件才算“已设计”：

1. 有唯一事实来源、查询模型和结构化命令。
2. 有成功、空、加载、部分、离线、权限拒绝、冲突、不兼容和恢复只读状态。
3. 有幂等键、命令状态、事件更新和断线重同步路径。
4. 危险操作有服务端 ImpactAnalysis、权限/预算差异和审计结果。
5. 从通知、错误、审批和深链接进入后仍保留完整对象上下文。
6. 有键盘、读屏、焦点、reduced-motion、窄屏和大数据量行为。

静态页面、Mock 数据、单次 Toast、仅有 TypeScript 类型或“刷新后看起来正确”都不能单独证明页面闭环完成。
