# 扩展协议

## 扩展原则

核心运行时只依赖契约，不依赖扩展的实现语言、进程位置、供应方或交互方式。扩展必须能被发现、校验、授权、启动、取消、观测和升级。

## CapabilityDescriptor

```text
CapabilityDescriptor
  capabilityId / version
  responsibility / non-goals
  input schemas
  output schemas
  event schemas
  execution modes
  context requirements
  authority requirements
  quality and cost declarations
  streaming / cancellation support
  health and discovery metadata
  trust and verification references
```

## Executor Contract

```text
prepare(envelope) -> PreparedExecution
start(prepared) -> ExecutionHandle
poll(handle) -> ExecutionSnapshot
stream(handle) -> OutputStream
cancel(handle) -> CancellationResult
collect(handle) -> NodeResult
release(handle) -> ReleaseResult
```

执行器必须对未知输入、重复启动、取消竞态、超时、部分输出和外部不可用返回结构化结果。

## Agent Contract

Agent 也是扩展能力，但额外声明：

```text
goal intake schema
context requirements
available tools or capabilities
allowed graph mutations
planning / observation / verification behavior
budget and step limits
delegation behavior
human interaction behavior
```

Agent 不得通过自然语言返回隐式 GraphPatch；图变化必须使用结构化协议。

## Adapter Contract

适配器把外部对象映射为 CapabilityDescriptor、ExecutionHandle、Observation 和 Artifact。适配器要声明外部状态可观测程度、凭据要求、结果可靠性、取消限制和版本兼容范围。

## 发现与健康

扩展发现只产生候选，不自动获得执行权限。健康检查应区分可发现、可连接、可执行、可验证和已授权；其中任一状态都不能替代其他状态。

## 协议演进

扩展协议必须支持能力协商、版本范围、未知字段处理、兼容失败和迁移。缺少取消或流能力的扩展仍可接入，但调度器必须在 UI 和策略中明确其限制。

