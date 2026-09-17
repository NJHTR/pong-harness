# 类型与 Schema

## 值的统一表示

Pong Harness 中的值必须可序列化、可校验、可追溯：

```text
Scalar             字符串、数字、布尔、时间、枚举
Structured         有 Schema 的对象、数组、映射
ArtifactRef        大内容、文件、目录或外部资源的引用
SecretRef          只能在授权上下文解析的秘密引用
StreamRef          增量数据流引用
EventEnvelope      带来源和时间的事件
Null               明确的空值
Absent             没有产生值
```

`Null`、`Absent`、空集合和上游未完成必须分开表达。

## Schema

每个输入、输出、配置、事件和 Artifact 元数据都声明 Schema：

```text
schemaId
schemaVersion
kind
fields / items
required fields
constraints
security labels
compatibility rules
```

Schema 本身也要版本化；改变必填字段、类型、枚举含义或安全标签通常属于不兼容变更。

## 兼容性

源 Schema 可以赋值给目标 Schema，当且仅当：

1. 所有目标必填字段都能从源得到或有明确默认值。
2. 类型转换是定义过的、有限的、可审计的转换。
3. 枚举和约束不会扩大到目标不能接受的范围。
4. 敏感等级不低于目标要求。
5. 内容大小、基数、时机和流语义兼容。

自动转换仅允许无歧义转换。需要业务推理的转换必须成为独立节点。

## 运行时校验

Schema 校验分为：

```text
shape validation       结构和字段
domain validation       领域约束
resource validation     大小、数量、引用和权限
freshness validation    结果是否过期
integrity validation    校验和、签名或内容一致性
```

校验失败必须返回字段路径、实际值摘要、期望约束和可修复性，不能只返回“invalid input”。

## 配置 Schema

节点配置字段必须声明：是否必填、默认值、可编辑主体、敏感性、可热更新性、变更是否需要重新验证以及会影响哪些下游节点。秘密只能使用 SecretRef，不能把明文写入 CanvasVersion、日志或 GraphPatch。

## 动态类型

动态值可以用于未知能力探索，但必须携带运行时 Schema、来源和验证器。动态类型不能穿过正式画布接口而不被收窄，否则接口无法静态检查。

