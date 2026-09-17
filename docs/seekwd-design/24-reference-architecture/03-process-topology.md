# 进程拓扑

## 必需进程角色

### Seekwd Workbench Process

运行用户界面和本地交互逻辑。可存在多个窗口，但它们共享同一用户身份和 Host Session。崩溃或关闭不会自动取消持久化运行，除非用户选择取消。

### Pong Host Process

运行本地控制平面、持久化服务、调度器、策略入口和扩展管理。它是用户设备上 Pong Harness 的可信协调边界。

### Execution Process or Context

承载具体 NodeRun。它可以与 Host 同进程，也可以隔离为独立进程、容器、远程上下文或由外部能力管理。Host 永远通过 Executor Contract 与其通信。

### Optional Background Worker

对于长期、可恢复或资源受限的工作，可由 Host 创建后台工作者。后台工作者不持有 UI 状态，所有进度通过 Runtime Event 写回 Host。

## 通信规则

```text
Workbench <-> Host: authenticated local IPC
Host <-> Execution Context: Executor protocol
Host <-> Extension: extension protocol
Host <-> Remote Boundary: explicit authenticated transport
```

任意执行上下文不能直接连接 Workbench，也不能直接读取其他执行上下文的私有状态。

## 单实例原则

每个用户工作区在同一设备上默认只由一个 Host 实例拥有写入租约。第二个 Workbench 连接已有 Host；第二个 Host 只能只读、接管或等待，不能同时修改同一事实存储。

## 崩溃隔离

Workbench 崩溃不会终止 Host；单个执行器崩溃不会终止 Runtime；Host 崩溃不会让执行器继续失控，恢复后必须对账或取消。进程隔离是保护边界，不是唯一安全机制。

