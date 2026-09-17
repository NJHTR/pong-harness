# 概念层次

## 为什么必须分层

一个“节点”可能同时被理解为节点类型、画布中的卡片和一次运行。将它们混在一起会导致：修改配置破坏历史、运行状态污染定义、复制节点出现 ID 冲突，以及无法安全复用。Pong Harness 必须严格区分以下层次。

```text
Definition Layer     定义某种能力的稳定契约
Version Layer        定义或图在某一时间的不可变版本
Composition Layer    在某个画布版本中组合节点和边
Runtime Layer        某个图版本的一次执行及其状态
Presentation Layer   节点在编辑器中的位置、折叠和展示偏好
```

## 画布层次

```text
CanvasIdentity       画布的稳定身份
CanvasVersion        某一不可变的画布内容版本
CanvasDraft          可编辑但尚未冻结的工作副本
CanvasRun            一个 CanvasVersion 的一次执行
```

`CanvasIdentity` 不存放可变图内容。`CanvasVersion` 引用全部节点定义版本、配置、边、公开接口和策略。`CanvasRun` 不能被后续草稿或发布改写。

## 节点层次

```text
NodeDefinition       节点类别的接口和实现契约
NodeDefinitionVersion 某个不可变节点定义版本
NodeInstance          某画布版本中的节点实例
NodeRun               某次 CanvasRun 中该实例的一次执行
```

一个 NodeDefinitionVersion 可以被很多画布复用；一个 NodeInstance 在一个 CanvasVersion 中只能出现一次；一个 NodeInstance 在重试、循环或多次调用中可以产生多个 NodeRun Attempt。

## 端口层次

```text
PortDefinition        节点类型声明的端口
PortBinding           节点实例中端口的映射、默认值和局部覆盖
PortValue             运行时某端口的一次已物化值或流引用
```

端口 ID 必须由定义版本稳定给出。展示名称可以修改，但端口 ID 不能因为文案变动而变化。

## 图与展示分离

图语义只包括节点、端口、边、接口、策略和版本。节点坐标、分组颜色、折叠状态、缩放、面板宽度和个人筛选条件属于 Presentation Layer；它们可以独立保存，不能影响调度结果。

## 运行快照原则

启动运行时，Harness 创建 `RunSnapshot`：

```text
GoalVersion
CanvasVersion
NodeDefinitionVersions
resolved configuration
selected capability bindings
policy version
authority decisions
input Artifact revisions
```

任何后续编辑只会生成新版本或 RunPatch，绝不改变这个快照。

