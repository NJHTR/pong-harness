# 当前实现状态

这份文档记录设计蓝图已经落到代码的部分，避免把“有设计”误认为“已实现”。状态分为：

- **已落地**：仓库中有实现和自动化测试。
- **骨架**：边界、类型或接口已经存在，但还没有接入生产执行器。
- **待实现**：设计已有明确要求，代码尚未开始。

## 已落地

- Rust Cargo workspace 与明确的 Core、Runtime、Policy、Artifact、Agent、Extension、Worker、Host crate 边界。
- `pong-core` 的 Canvas、Node、Port、Edge 模型和数据/控制/事件路由校验。
- `pong-runtime` 的 Run/NodeRun 状态转换和图编译、依赖就绪队列、环路拒绝。
- `pong-host` 的 SQLite WAL 初始化、幂等迁移、画布版本表、事件日志游标和内存数据库测试。
- Policy、Artifact、Agent GraphPatch、Extension Manifest 与 Worker Executor 的结构化契约骨架。
- `graph-schema`、`protocol-schema`、`node-sdk` TypeScript 共享类型包。
- React + Vite Workbench：节点选择、添加、删除、配置、连接和图校验；浏览器预览明确标识为内存草稿。
- Tauri 2 Workbench：保存版本与创建 Run 调用本地 SQLite Host；无安装包的 Windows 桌面构建已验证。
- 保存的 CanvasVersion 可编译为依赖计划并创建 Run 快照与 `run.created` 事件；未保存版本不能启动 Run。
- 标准 `human-input` 节点会创建持久化 `waiting_input` NodeRun；Tauri Workbench 提供结构化输入弹层，提交后写入节点结果和审计事件。

## 骨架

- Host 已提供最小 Canvas/Run 命令服务；事件订阅、幂等命令信封、版本冲突投影和恢复协调仍待接入。
- Workbench 已有 Tauri HostClient 适配层；查询快照、断线重连和增量投影仍待接入。
- Worker 只有统一 Executor Gateway 契约，尚未提供本地进程、沙箱、Docker 或远程执行器。
- Agent 只有结构化提案类型，尚未接入模型供应方、能力发现、Patch 审批和修复闭环。

## 下一执行顺序

1. 为 Host 增加 Command Router、Canvas Service、Run Service 和事件订阅协议。
2. 为 Runtime 增加由依赖完成驱动的 NodeRun 调度、取消、暂停、等待与恢复协调器。
3. 为 Workbench 增加运行面板、输入等待、Artifact/证据查看，以及事件流投影。
4. 增加本地 Worker 与受控执行上下文，再接入外部扩展和 Agent。
5. 扩展 Tauri 2 发行配置，接入用户授权、环境管理、升级与安装包验收。
