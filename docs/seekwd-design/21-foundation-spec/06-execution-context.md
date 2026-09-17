# 执行上下文

## 定义

执行上下文是节点实际运行时获得的隔离边界、资源和工具集合。它不是某个语言环境的同义词，也不是简单的“本机 / 远程”枚举。

```text
ExecutionContext
  contextId / contextVersion
  owner and scope
  filesystem mounts
  process boundary
  network policy
  available capabilities
  dependency set
  secret bindings
  cpu / memory / time / storage limits
  isolation level
  cleanup policy
  health state
```

## 上下文能力

节点声明需求，调度器匹配上下文：

```text
required capabilities
required value types
required dependency versions
required resource limits
required isolation level
required data locality
required network policy
```

上下文只能提供被授予的能力。节点不能通过读取环境变量、全局目录或未声明服务来扩大实际可用范围。

## 生命周期

```text
declared -> resolving -> preparing -> ready
ready -> allocated -> running -> releasing -> released
preparing / running -> unhealthy / expired / revoked
```

环境准备、依赖安装、资源分配和清理都是可观测的操作，可以成为等待或审批节点的原因。

## 资源限制

至少要限制运行时长、并发数、内存、CPU、磁盘、输出大小、网络连接、子进程数量和外部调用次数。超过限制进入结构化 `quota` 错误或等待，而不是无限扩大资源。

## 数据边界

输入 Artifact 通过显式挂载或引用进入上下文；输出必须写回指定 Artifact Store。临时目录、缓存和进程状态按照清理策略销毁或归档。

## 外部上下文

当节点委派到另一个执行上下文时，父上下文只传递声明的输入、策略、预算和取消信号。子上下文的内部状态不自动暴露，结果通过统一 NodeResult 返回。

