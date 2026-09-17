# Seekwd / Pong Harness 参考系统架构

本目录定义一个本地优先、可安装、可离线恢复的参考架构。它规定逻辑和进程责任边界，不绑定某种 UI 框架、运行语言、数据库或打包工具；技术选型必须满足这里的契约，而不是反过来改写核心语义。

## 目标拓扑

```text
Seekwd Workbench
  人类可见的目标、画布、运行、证据、调试和设置界面
       <-> authenticated local IPC
Pong Host
  本机常驻或按需启动的控制平面与运行时宿主
       <-> internal service calls / durable event log
Pong Harness Core
  Goal, Graph, Runtime, Policy, Artifact, Memory, Audit services
       <-> executor / capability protocol
Execution Contexts and Extensions
  受控的能力实现、Agent、代码、适配器和外部连接
```

## 索引

| 文件 | 内容 |
| --- | --- |
| [01-architecture-principles.md](01-architecture-principles.md) | 参考架构目标、约束和不变量 |
| [02-logical-components.md](02-logical-components.md) | 逻辑组件、责任和依赖方向 |
| [03-process-topology.md](03-process-topology.md) | Workbench、Host、Core 与执行上下文的进程边界 |
| [04-local-host.md](04-local-host.md) | Pong Host 生命周期、身份、单实例和健康检查 |
| [05-workbench-client.md](05-workbench-client.md) | 前端状态、离线、订阅和 UI 与事实边界 |
| [06-ipc-and-session.md](06-ipc-and-session.md) | IPC、会话、认证、协议协商和断线恢复 |
| [07-persistence-layout.md](07-persistence-layout.md) | 本地数据、日志、Artifact、秘密和备份布局 |
| [08-execution-topology.md](08-execution-topology.md) | 执行上下文、队列、隔离和资源管理 |
| [09-extension-topology.md](09-extension-topology.md) | 扩展发现、安装、宿主、健康和兼容性 |
| [10-network-and-remote-boundaries.md](10-network-and-remote-boundaries.md) | 网络、远程连接、数据出境和失联语义 |
| [11-install-update-recovery.md](11-install-update-recovery.md) | 安装、升级、迁移、回滚和灾难恢复 |
| [12-operational-model.md](12-operational-model.md) | 日常运行、诊断、清理、支持和维护 |
| [13-architecture-decisions.md](13-architecture-decisions.md) | 必须遵守的架构决策与选型约束 |
| [14-technology-selection-criteria.md](14-technology-selection-criteria.md) | 后续技术选型的硬性评估标准 |

