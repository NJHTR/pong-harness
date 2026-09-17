# Rust Host 与 Core 边界

## `pong-core`

包含：Goal、Canvas、Node、Port、Edge、Run、ArtifactRef、Evidence、Policy Decision、GraphPatch、错误和版本值对象。

不包含：文件系统写入、线程、网络、UI、模型调用和具体数据库。

## `pong-runtime`

包含：图编译、就绪队列、依赖、状态机、检查点、重试、取消、父子 Run 和恢复协调。通过 trait 调用 Executor、Artifact、Policy 和 Event Store。

## `pong-policy`

包含：ActionRequest、规则匹配、审批、Grant、撤销和策略版本。它不执行动作，也不修改图。

## `pong-artifact`

包含：Artifact 元数据、revision、血缘、内容寻址、权限检查和保留策略。具体磁盘路径封装在 Storage Adapter 中。

## `pong-agent`

包含：Agent Invocation、Context Packet、PlanProposal、CapabilityNeed、GraphPatch Proposal 和结构化交互。模型供应方和传输方式在 Model / Agent Adapter 中。

## `pong-extension`

包含：Manifest 解析、版本、能力发现、安装状态、健康、隔离和生命周期。扩展代码不能直接依赖 Runtime 内部模块。

## `pong-host`

负责启动、依赖注入、IPC、会话、单实例租约、迁移、日志初始化、配置和优雅关闭。它将各个 crate 组合成可运行宿主。

## `pong-worker`

负责子进程执行协议、心跳、流、取消、资源限制和结果收集。它不拥有目标或画布事实。

