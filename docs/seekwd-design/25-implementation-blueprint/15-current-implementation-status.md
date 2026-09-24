# 当前实现状态

> 状态：Implementation Status
> 代码核对日期：2026-09-24；以当前仓库源码为准，不把旧版蓝图或 UI Mock 当作运行能力。

这份文档记录设计蓝图已经落到代码的部分，避免把“有设计”误认为“已实现”。状态分为：

- **已落地**：仓库中有实现和自动化测试。
- **骨架**：边界、类型或接口已经存在，但还没有接入生产执行器。
- **待实现**：设计已有明确要求，代码尚未开始。

## 已落地

- Cargo workspace 目前包含 `pong-core`、`pong-host`；Core 只有简化的 Workspace、Canvas、CanvasNode、CanvasRevision、Run、Notification 模型。
- Host 提供本机 HTTP 的 Workspace/Canvas 创建与改名、默认入口设置、保存简化 Revision、启动/查询模拟 Run、快照与游标查询；开发接口要求启动 token、固定 Host authority 和显式允许的 Origin，Workbench 通过 Vite 同源开发代理连接。Host 按数据库路径持有跨平台独占实例锁，并使用 Ctrl+C 优雅关闭。
- Host 使用 SQLite 单行序列化快照、幂等命令日志和 `projection.snapshot.updated` 事件记录；事务失败会回滚内存并返回错误，重启拒绝错误快照和不一致日志。
- `StartRun` 的默认入口、修订号和幂等键已校验；模拟运行中的 Run 重启后会继续定时完成。Host 当前有持久化失败和恢复路径的单元测试。
- `apps/workbench` 是独立的 React/Vite 入口，复用部分 `seekwd-ui` 样式，可选连接 HTTP Host；默认 `localStorage` 适配器不是权威 Host。
- `apps/ui-lab` 保留为较完整的视觉和 Mock 交互试验台，不是正式前端的已交付业务功能。

## 骨架与未完成

- Host 只有轮询快照更新事件，没有正式 EventEnvelope、Outbox/Inbox、投影重建、游标过期处理或完整 Command Router。
- CanvasRevision 当前只有元数据，不保存不可变 Graph；尚无 CanvasDraft、CanvasRelease、RunSnapshot、GraphPatch/RunPatch 服务。
- Workbench 的图是固定展示，缺持久的节点/端口/边编辑、类型化路由、断线状态和冲突恢复；HTTP 客户端轮询但没有完整重同步协议。
- 无 `pong-runtime`、`pong-policy`、`pong-worker`、`pong-artifact`、`pong-agent` crate；没有 NodeRun 调度、真实执行器、审批、Artifact 和证据闭环。
- 无 Tauri 桌面壳和安装包；Host 当前只有开发用 Bearer token/Origin 边界，尚无本机用户绑定 Session、受保护 IPC、桌面启动编排和完整崩溃健康恢复，仍不能承载任意本地执行。Vite 代理不是正式发行安全边界。

## 下一执行顺序

1. 将需求 ID、代码、测试和开放门禁建立可追踪关系；完成机器可读 Schema/跨语言合同测试。
2. 先实现安全的本地 Host 连接边界，再完善 CanvasDraft、不可变 Revision、Graph 命令及版本冲突。
3. 实现正式 Command/Event、游标恢复和 RunSnapshot；再增加 Runtime、NodeRun 状态机和内部调度。
4. 在 Policy、权限和审批边界可验证后，增加 LocalRestricted Worker、Artifact 和 Evidence。
5. 将正式 Workbench 的业务页面接到 Host，再扩展 Agent、Extension、Automation 和桌面发行。

开放前的实现状态还必须对照 `../28-design-review/00-review-report.md` 的验收场景和
`../27-normative-contracts/11-command-event-recovery.md` 的恢复合同更新；类型骨架、Mock
事件或 UI 投影不得单独标记为已实现。
