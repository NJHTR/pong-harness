# 目标生命周期

## 状态

```text
received              已接收原始目标
normalizing           正在提炼目标和约束
needs_clarification   缺少影响执行的关键信息
decomposing           正在拆解目标
discovering           正在寻找或构造能力
planned               已生成候选计划
awaiting_authority    等待权限或审批
ready                 已满足运行前条件
running               至少一个节点正在运行
waiting_input         等待用户输入
waiting_dependency    等待其他运行或外部结果
waiting_environment   等待可用执行上下文
paused                用户或策略暂停
repairing             正在分析并应用修复
verifying             正在验证结果
succeeded             所有阻塞性标准通过
failed                无法继续且没有可行修复
cancelled             被用户或父运行取消
expired               超过截止时间或授权有效期
superseded            被新目标版本替代
```

## 关键转移

```text
received -> normalizing -> decomposing -> discovering -> planned
planned -> awaiting_authority -> ready -> running
running -> waiting_input / waiting_dependency / waiting_environment
waiting_* -> running
running -> verifying -> succeeded
running -> repairing -> running
running -> paused -> running
running -> failed / cancelled / expired
```

每次转移都写入事件，事件包含触发者、原因、相关节点、图版本、权限上下文和时间。UI 显示的是事件计算出的状态，不允许只改一个前端布尔值。

## 暂停语义

暂停必须保存检查点：

- 已完成节点的输出引用。
- 正在运行节点的取消或恢复句柄。
- 等待中的依赖、输入和审批。
- 调度队列和重试计数。
- 当前目标、图和权限版本。

暂停不等于取消。恢复时只能从有效检查点继续；外部状态可能已经变化的节点必须重新验证或重新运行。

## 完成和失败

`succeeded` 只能由验证器根据全部阻塞性成功标准产生。节点全部结束不代表目标成功。`failed` 也不能只因为一个节点失败产生；系统必须先完成诊断，确认没有重试、替代能力、人工输入或修复路径。

