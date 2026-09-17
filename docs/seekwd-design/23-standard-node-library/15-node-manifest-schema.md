# 标准节点 Manifest

## 最小 Manifest

```text
NodeManifest {
  typeId: string
  version: Version
  category: NodeCategory
  responsibility: string
  nonGoals: string[]
  ports: PortDefinition[]
  configurationSchema: SchemaRef
  execution: ExecutionContract
  verification: VerificationContract
  errors: ErrorContract
  contextRequirements: ContextRequirement[]
  authorityRequirements: AuthorityRequirement[]
  observability: ObservabilityContract
  cachePolicy: CachePolicy
  retryPolicy: RetryPolicy
  presentation: PresentationSchema
  compatibility: CompatibilityDeclaration
}
```

## ExecutionContract

```text
ExecutionContract {
  primaryActor: human | agent | executor | unspecified
  sideEffect: none | declared | unknown
  idempotency: required | supported | unsupported
  cancellation: supported | best_effort | unsupported
  streaming: none | input | output | bidirectional
  timeout: required | optional | forbidden
  completionConditions: ConditionRef[]
}
```

## ErrorContract

定义可能错误类别、每类默认严重度、是否可重试、推荐错误端口、补偿可能性、用户可见消息模板和敏感数据规则。

## PresentationSchema

定义检查器需要展示的字段、分组、编辑权限、帮助信息、端口标签、折叠摘要和运行状态摘要。它不能定义调度逻辑。

## Manifest 校验

任何标准或扩展节点发布前，系统校验 Manifest 完整性、端口唯一性、Schema 可解析性、执行/权限声明、错误处理、版本兼容性和测试引用。

