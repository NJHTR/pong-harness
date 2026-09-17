# Workbench 客户端

## 客户端职责

Workbench 展示目标、画布、节点、运行、日志、Artifact、审批、环境和记忆，并通过 Command API 发起操作、通过订阅获得状态。它不决定节点是否成功，也不直接修改运行事实。

## 客户端状态分层

```text
server facts       Host 返回的目标、图、运行和权限事实
local draft        尚未提交的图编辑
view state         选中节点、缩放、布局、筛选、面板状态
optimistic state   等待 Host 确认的命令结果
offline queue      离线时暂存的可重放命令
```

这些状态不能混用。刷新页面、关闭窗口和切换画布不应丢失已提交事实；未提交草稿必须明确显示保存状态。

## 命令发送

每个命令携带 `commandId`、幂等键、目标版本和主体。客户端先显示 pending，再依据 Host 的事实事件更新成功、冲突、审批或失败状态。

## 订阅和断线

订阅以 cursor 读取事件。断线后先恢复快照，再从 cursor 补事件；若 cursor 过期，客户端丢弃旧投影并重新拉取完整范围。不能把“最后一个收到的 UI 状态”当成事实。

## 本地草稿

草稿可以离线编辑，但发布、正式运行、权限变更和跨画布调用需要 Host 在线确认。草稿冲突显示对象级差异，不能用整张 JSON 覆盖他人修改。

## 交互层级

```text
Goal view       目标、成功标准、整体进度和交付
Canvas view     节点图、接口、版本和差异
Node view       输入输出、配置、环境、权限和历史
Run view        状态、队列、日志、证据、补丁和调试
Artifact view   内容、血缘、权限、版本和交付
```

任何复杂节点都允许从 Node view 进入内部 Canvas view，再返回父图和父 Run。

