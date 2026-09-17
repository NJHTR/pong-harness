# 输入与输出节点

## `goal.start`

责任：把 GoalVersion 和调用方输入转换为图的公开入口。

输入：目标引用、调用参数、授权摘要、初始 Artifact。输出：公开输入端口值、运行上下文和目标摘要。

规则：不能在节点内修改目标成功标准；缺少必需输入时进入 `waiting_input`，不伪造默认值。

## `input.value`

责任：提供定义期或实例期配置值。值必须经过配置 Schema 校验，并在 NodeRun 输入快照中标记来源。

适用：常量、用户已确认的偏好、画布级参数。不能承载会随运行变化的隐式状态。

## `input.request`

责任：在运行中向人类或指定执行主体请求一个符合 Schema 的值。

必须声明：问题、输入 Schema、作用域、过期时间、取消后果、是否允许跳过以及提交后验证器。提交结果以正常 PortValue 和 Evidence 返回。

## `input.resource`

责任：接收 ArtifactRef、资源列表或资源定位结果，不负责读取超出授权范围的内容。

必须声明：接受的类型、大小上限、敏感度、是否物化内容以及缺失资源处理。

## `input.secret-reference`

责任：接收 SecretRef。节点只能在被授权的执行上下文解析秘密；输入快照、日志和 GraphPatch 只保存引用、摘要或指纹。

## `goal.output`

责任：将内部值映射到画布公开输出，并运行交付前的 Schema、完整性和权限检查。

输出：Output PortValue、ArtifactRef、DeliveryManifest 或结构化错误。

## 输出规则

输出节点不能默默丢弃未满足的必需输入。部分输出必须声明 `available`、`invalid`、`unknown` 和 `withheld` 等状态，并提供原因和证据。

## 输入优先级

```text
显式输入边
  -> 画布调用映射
  -> 节点实例配置
  -> 定义默认值
  -> 人工输入请求
  -> 缺失处理策略
```

任何默认值都不能覆盖显式用户输入或高优先级策略。

