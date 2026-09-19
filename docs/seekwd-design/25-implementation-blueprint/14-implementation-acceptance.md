# 实现蓝图验收

## 可运行核心

- Host 可创建并持久化 Goal、CanvasDraft/CanvasRevision、Run 和 NodeRun。
- 标准节点 Manifest 可注册、校验并在图中实例化。
- Runtime 可正确推进数据、控制、等待和错误边。
- Run 可暂停、恢复、取消，并在 Host 重启后对账。

## Workbench

- 用户可创建和编辑草稿画布，看到静态错误和版本差异。
- 用户可运行画布、查看节点状态、输入输出、证据、日志和 Artifact。
- 用户可在节点级接管、交还 Agent、批准 Patch 和重放调试。

## Agent

- Agent 只能提交结构化计划、动作和 Patch。
- 所有 Agent 动作经过 Schema、Graph 和 Policy 检查。
- Agent 可因能力缺口、验证失败或预算耗尽进入等待、修复或人工协作。

## 安全与恢复

- 秘密不进入普通持久化和日志。
- 扩展和 Worker 不能绕过资源与权限边界。
- 中断、重复消息和外部结果未知不会导致重复副作用。

## 可演化性

- 能够添加新的节点、扩展、执行器和画布包而不改动 Core 领域模型。
- 能够升级 Host、Schema、节点和扩展，同时保留历史 Run 的可读性和可追溯性。
