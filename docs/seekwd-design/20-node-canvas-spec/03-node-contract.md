# 节点契约

## 节点是什么

节点是图中最小的可调度责任单元。它必须可以描述：在什么条件下可执行、需要什么输入、会产生什么输出、在哪里执行、有哪些副作用、如何验证、失败后怎样处理。

节点不是 UI 卡片、提示词文本或一段任意代码的同义词。它们可以是这些内容的承载者，但必须先满足节点契约。

## NodeDefinitionVersion 必需字段

```text
identity              type id, version, namespace
responsibility         单一职责和非目标
ports                  端口集合
configuration schema   可配置字段和默认值
execution contract     执行、取消、重试和幂等语义
capability requirements 所需能力契约
environment requirements 执行上下文需求
authority requirements 权限需求
observability contract 日志、进度、证据和输出要求
verification contract  节点局部完成判定
failure contract       错误分类、补偿和恢复建议
presentation schema    可编辑字段和展示提示
migration metadata     与其他版本的兼容/迁移信息
```

## 单一职责规则

节点不要求只调用一次函数，但必须只承担一个可以独立验证和替换的责任。若一个节点同时包含不相关目标、不同权限边界、不同环境需求或不可区分的失败模式，应拆为多个节点或内部子图。

## 节点分类

分类用于运行语义和 UI，不用于限制扩展：

```text
primitive       基础控制、变换或动作
agent           可规划、观察、调用和验证的智能单元
delegate        把任务提交给另一执行主体
adapter         将外部能力包装为内部契约
code            运行用户或 Agent 提供的实现
composite       由内部图实现的节点
human           要求人类执行、判断或输入
trigger         把外部或内部事件变成图入口
verification    将标准和证据变成结论
```

一个定义可以带多个分类标签，但必须有一个主执行语义。

## NodeInstance

NodeInstance 由 CanvasVersion 拥有，包含：

```text
nodeInstanceId
definitionVersionRef
configuration values
port bindings and defaults
local policies
enabled / disabled state
failure handling override
display metadata reference
actor preference
```

实例配置只能覆盖定义明确允许覆盖的字段。实例不能新增未声明端口或绕过定义的权限要求。

## Actor Preference

节点可声明首选主体：`human`、`agent`、`collaborative` 或 `unspecified`。这是调度和 UI 的分工提示，不是安全授权；真正能否执行仍由能力、环境和权限决定。

## 节点结果

节点执行后只能以标准结果结束：

```text
success      输出满足节点局部契约
failure      执行或局部验证失败
waiting      等待输入、依赖、环境或审批
cancelled    取消已被确认
skipped      根据图规则明确跳过
blocked      前置失败或策略阻断
```

每种结果都必须产生结构化结果、状态原因和可追溯证据。

