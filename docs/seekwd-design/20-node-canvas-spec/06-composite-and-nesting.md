# 复合节点、嵌套与模块边界

## 复合节点的定义

复合节点是一个 NodeDefinitionVersion，其实现由一个 CanvasRelease（开发时可引用明确的 CanvasRevision）完成。它在外部表现为普通节点，在内部表现为一张完整画布。

```text
Composite Node Interface
  input ports   <-> child canvas public inputs
  output ports  <-> child canvas public outputs
  event ports   <-> child canvas public events
```

复合节点不能通过隐式访问父图内部状态；所有输入、输出和事件都必须经过接口映射。

## 封装等级

```text
opaque       调用方只看接口和运行摘要
inspectable  调用方可查看内部图和运行轨迹
editable     调用方可复制或派生内部图后编辑
inlineable   调用方可把内部图展开进当前图
```

可见性与可执行权限无关。即使内部图不可见，运行记录也必须可提供足够的状态、证据和错误摘要。

## Extract：从节点组提取画布

提取过程：

1. 选择一组连通节点。
2. 计算从组外进入的输入边，形成子画布公开输入。
3. 计算从组内流向组外的输出边，形成公开输出。
4. 计算跨边界事件和错误路径。
5. 复制或移动内部节点到新 CanvasDraft。
6. 在父图中用 Composite Node 替换原节点组。
7. 运行接口兼容校验并记录来源关系。

提取不能悄悄丢弃错误处理、等待、控制边或权限策略。

## Inline：内联复合节点

内联将特定 Composite NodeInstance 的子图复制到父图，并把接口映射转换为边。内联产生新的 CanvasDraft，保存后形成新的 CanvasRevision；不能修改原复合节点定义或其他调用方。

## Expand：运行时细化

高层节点可以在运行中展开为子图，但只能通过 GraphPatch：

```text
原节点状态
展开原因
子图版本或新建草稿
输入映射
输出兼容承诺
替换范围
历史关联
```

若原节点已经有不可逆副作用，展开前必须明确该副作用如何保留、补偿或作为子图的已完成检查点。

## 递归和深度

允许递归调用的画布必须明确递归入口、终止条件、最大深度、预算继承和取消策略。没有这些声明的递归调用视为静态循环并拒绝发布。

## 私有状态

子图局部状态默认私有，只有公开输出、显式事件和已授权的观察摘要可以穿越边界。这样内部实现可以重构，同时保持父图的接口兼容。
