# 状态机

## 状态机规则

每个生命周期对象都要定义：

```text
states
terminal states
allowed transitions
transition trigger
guard conditions
side effects
timeout behavior
recovery behavior
```

状态变化是离散事件，不允许多个组件直接写同一个状态字段。

## NodeRun 状态机

```text
created -> queued -> running
running -> streaming
streaming -> running
running -> waiting_input / waiting_dependency / waiting_environment / waiting_approval
waiting_* -> queued / running / cancelled / expired
running -> paused -> queued
running -> repairing -> queued / failed
running -> succeeded / failed / cancelled / skipped / blocked
```

终态不可逆。重试创建新的 Attempt 或新的 NodeRun 分支，不把 `failed` 直接改成 `running`。

## Run 状态机

```text
created -> preparing -> ready -> running
running -> waiting_* / paused / repairing / verifying
verifying -> succeeded / failed / repairing / waiting_input
running -> cancelling -> cancelled
running -> failed / expired
```

Run 只有在所有阻塞性节点和目标验证通过后才可以 `succeeded`。非阻塞分支的失败必须出现在结果摘要中。

## Canvas 状态机

```text
draft -> validating -> validated -> published
validated -> draft
published -> deprecated -> archived
draft / validated -> deleted
```

`published` 版本不可编辑；编辑发布画布必须创建 Draft。删除是逻辑状态，受到引用和活动运行保护。

## Goal 状态机

目标状态见 [目标生命周期](../12-goal-execution-design/02-goal-lifecycle.md)，但状态机的通用规则仍适用于目标：等待不等于失败，暂停不等于取消，成功必须由验证器产生。

## 并发转移

同一对象的状态转移使用版本号或条件写入：只有读取版本仍然匹配时才允许提交。冲突提交必须重新读取并重新决策，不能最后写入覆盖。

## 超时

超时不是简单地把状态改为失败。系统要先发出取消请求，等待执行器确认；无法确认时进入 `cancel_pending` 或孤儿检测流程，并记录可能仍有外部副作用。

