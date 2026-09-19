# 端到端参考生命周期

> 状态：Provisional Contract  
> 用途：作为 Workbench、Host、Runtime、Worker、Policy 和 Artifact 的联合验收场景；字段以本目录其他 Normative Contract 为准。

## 场景

用户在 Workspace 中创建报告画布。画布接受主题和可选文件，执行受限处理，在缺少资料时等待人工补充，生成文档 Artifact，并支持暂停、应用重启、恢复和取消。

## 定义阶段

1. 创建 `CanvasIdentity` 和 `CanvasDraft`。
2. 在 Draft 中建立输入、处理、验证和输出节点。
3. 创建唯一默认入口 `Default`，并可创建命名入口 `RegenerateFromSources`。
4. Graph Service 校验端口、入口、权限上限、副作用和终止性。
5. 显式保存产生不可变 `CanvasRevision`；Draft 继续存在并指向该 Revision。
6. Debug Run 引用 Revision；正式运行前发布 `CanvasRelease`。

## 启动阶段

`StartRun` 必须提供精确 Revision 或 Release、Entrypoint、输入绑定、执行模式、AuthorityProfile 和幂等键。Host 解析并持久化 `RunSnapshot` 后才产生 `run.created`。

策略不满足时创建 `ApprovalRequest`，Run 进入 `waiting_approval`；批准后产生有界 `ApprovalGrant`，拒绝后按失败策略终止或返回编辑。

## 执行和等待

1. Runtime 只调度依赖满足且执行上下文可用的节点。
2. Worker 每次执行产生独立 Attempt 和 ExecutionHandle。
3. 资料不足时节点进入 `waiting_input`，持久化字段 Schema、上下文、截止时间和恢复动作。
4. 用户提交补充输入后产生新事实，原 Attempt 恢复或创建新 Attempt，不能改写旧输入记录。
5. 每个输出通过 `ValueRef` 或 Artifact 引用传递，并写入 Lineage。

## 暂停、关闭和恢复

- 暂停阻止新节点调度，并按节点能力请求活动动作检查点或暂停。
- Workbench 关闭不等于 Run 取消；行为由 AuthorityProfile 的后台策略决定。
- Host 重启后按 [11-command-event-recovery.md](11-command-event-recovery.md) 恢复等待、游标和外部句柄。
- 无法确认的外部动作先进入 `orphaned`/`reconciling`；耗尽对账后进入 `outcome_unknown`，高风险下游保持阻断。

## 取消

1. 用户提交幂等 Cancel 命令。
2. Run 进入 `cancelling`，停止调度新的普通节点。
3. 可确认取消的内部动作进入 `cancelled`。
4. 外部动作只在收到终态证据后确认；否则进入 `cancel_pending` 或 `reconciling`。
5. 已在取消后完成的动作记录为 `completed_after_cancel`，保留输出但默认不传播到副作用下游。

## 完成与交付

- 只有成功标准和验证节点通过后 Run 才能进入 `succeeded`。
- 文档输出登记为 Artifact，包含内容摘要、类型、敏感度、来源 NodeRun、输入 Lineage 和验证 Evidence。
- UI 展示结果、验证状态、权限使用、成本和可导出动作；通知不替代 Artifact 或 Run 事实。

## 联合验收断言

- 重复 `StartRun` 不创建第二个 Run 或第二条副作用链。
- Draft 后续编辑不改变已经创建的 RunSnapshot。
- 等待输入期间关闭并重启应用后仍可继续提交。
- 取消响应丢失后重试不会重复取消或误报成功。
- 事件重复、断线和快照重同步后 UI 与 Host 事实一致。
- Artifact 可以反查 Revision、NodeDefinitionVersion、Attempt、输入、权限和验证证据。
