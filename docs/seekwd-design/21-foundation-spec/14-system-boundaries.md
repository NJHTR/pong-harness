# 系统边界与依赖方向

## 依赖方向

```text
UI / API
  -> Application Services
      -> Goal / Graph / Runtime / Artifact / Memory Services
          -> Policy and Audit
              -> Storage and Execution Adapters
```

Planner 可以调用 Goal、Context、Capability 和 Graph 服务，但不能直接写数据库或绕过 Policy。Executor 可以运行节点，但不能修改目标和画布版本。UI 可以发起命令和读取投影，但不能成为事实来源。

## 禁止耦合

- 节点实现不得读取 UI 状态决定执行语义。
- UI 不得通过改变颜色或本地布尔值伪造节点状态。
- Agent 不得直接修改持久化图，必须提交 GraphPatch。
- 执行器不得自行授予权限、选择未声明资源或写入秘密。
- Artifact 内容存储不得隐式决定节点是否成功。
- 搜索、缓存和统计投影不得覆盖事实事件。
- 外部适配器不得让供应方协议泄漏到核心 Graph Schema。

## 事实来源

```text
目标版本      Goal Service
画布版本      Graph Service
运行状态      Runtime Event Log
授权决定      Policy / Approval Store
产物内容      Artifact Store
搜索和列表    Rebuildable Projection
```

## 边界内外

Pong Harness 负责目标、图、调度、权限、证据、产物和恢复。具体能力可以在 Harness 内部或外部，只要通过扩展协议接入。Harness 不假设外部能力可靠，也不把外部系统的内部状态当作自己的事实。

## 变更原则

当新增能力或执行位置时，优先新增适配器和契约；只有当它改变目标、图、运行、权限或证据的共性语义时，才修改核心规范。这样系统可以扩展，而不需要每接入一个新能力就改动调度器核心。

