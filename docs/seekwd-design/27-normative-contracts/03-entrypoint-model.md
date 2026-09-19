# 画布入口、触发器与调用模型

> 状态：Normative Contract

## 核心决定

每个可执行 `CanvasRevision` 必须且只能有一个 `defaultEntrypointId`，同时可以拥有任意数量的命名入口和触发绑定。

默认入口表示“调用方没有显式指定入口时从哪里开始”，不表示画布只有一个入口，也不等于某个特殊类型的主节点。

## Schema

```text
CanvasEntrypoint {
  entrypointId: Id
  name: string
  targetNodeId: Id
  inputSchema: SchemaRef
  inputBindings: PortBinding[]
  outputContract?: SchemaRef
  invocationModes: manual | canvas_call | api | event | schedule | resume []
  manualInvocable: boolean
  reentrancy: reject | queue | allow
  concurrencyKey?: MappingExpression
  requiredAuthority?: AuthorityRequirement
  requiredContext?: ExecutionRequirement
  enabled: boolean
}

TriggerBinding {
  triggerId: Id
  kind: manual | event | schedule | webhook | canvas_signal | system
  source: TriggerSource
  targetEntrypointId: Id
  inputMapping: MappingExpression
  filter?: ConditionExpression
  deliveryPolicy: DeliveryPolicy
  enabled: boolean
}

TriggerSource {
  sourceType: event_bus | schedule | webhook | canvas | system
  sourceRef: AggregateRef | string
  schemaRef?: SchemaRef
}

GraphDocument {
  entrypoints: CanvasEntrypoint[]
  defaultEntrypointId: Id
  triggers: TriggerBinding[]
  ...
}
```

## 不变量

1. `defaultEntrypointId` 必须引用一个启用的入口。
2. 每个入口必须引用当前 Revision 内存在且启用的目标节点。
3. 入口的输入绑定必须满足目标节点的必填输入。
4. 入口名称在同一 Canvas 内唯一且稳定；重命名不改变 `entrypointId`。
5. 一个节点可以被多个入口指向；一个入口只拥有一个目标节点。
6. Trigger 不是入口本身。Trigger 将外部事实转换为一次对命名入口的调用。
7. 无 `manualInvocable` 入口的画布可以被事件驱动，但 Workbench 不显示普通 `Run` 按钮。
8. 未指定 `entrypointId` 的调用只能解析到默认入口；不得猜测最近使用入口或第一个触发节点。

## UI 语义

- Canvas 工具栏的 `Run` 使用默认入口，并且仅在默认入口允许 `manual` 调用、图已保存为 Revision、输入可满足且策略允许时启用。
- `Run from...` 展示所有可手动调用的命名入口。
- Inspector 提供 `Entrypoints & Triggers` 面板，显示入口名称、目标节点、调用方式、并发和权限要求。
- 节点上的“入口”徽标是引用关系，不创建特殊节点类别；同一个节点可显示多个入口徽标。
- 删除入口目标节点时，Patch 必须同时替换目标或删除入口；不能留下悬空入口。
- 删除默认入口前必须在同一个原子 Patch 中设置新的默认入口。

## 兼容迁移

旧字段 `primaryNodeId` 迁移为：

```text
entrypointId: generated stable id
name: "Default"
targetNodeId: primaryNodeId
invocationModes: [manual, canvas_call]
manualInvocable: true
defaultEntrypointId: entrypointId
```

迁移完成后不得继续把 `primaryNodeId` 写入新 Revision。UI 的 `setPrimaryNode` 命令替换为 `setDefaultEntrypointTarget`，但通常应编辑 Entrypoint 对象，而不是把节点变成特殊类型。

## 跨画布调用

调用方必须引用：

```text
targetCanvasRef
targetEntrypointId
versionConstraint
inputMapping
outputMapping
invocationMode: call_and_wait | fire_and_continue
```

发布时解析接口兼容性；运行时解析为精确 Release、Revision 和 Entrypoint，并写入 RunSnapshot。
