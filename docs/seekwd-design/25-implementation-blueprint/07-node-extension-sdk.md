# 节点与扩展 SDK

## SDK 内容

```text
Manifest builder
Schema registration
Port and Event definitions
Execution handler interface
Observation / Evidence helpers
Artifact read / write helpers
Policy request helper
Cancellation and progress helpers
Contract test harness
```

## 扩展开发流程

```text
定义 NodeManifest
  -> 定义 Schema 和端口
  -> 实现 prepare / start / collect / cancel
  -> 声明上下文和权限
  -> 编写契约测试
  -> 本地隔离运行
  -> 安装为 disabled
  -> 验证、审查、启用
```

## SDK 禁止事项

- 不提供直接写核心数据库的 API。
- 不提供无边界读取宿主环境的 API。
- 不允许扩展伪造 NodeResult 或审批结果。
- 不允许扩展把日志文本作为控制信号。
- 不允许扩展在未声明的线程或进程中继续副作用。

## 多语言

核心 SDK 可以提供不同语言的薄封装，但最终都输出同一 Manifest、Command、Event、ExecutionHandle 和 NodeResult。语言差异不能改变节点语义。

## 兼容性

SDK 版本与协议版本分开管理。扩展声明支持的协议范围；Host 可以拒绝不兼容扩展，或以只读发现模式加载。

