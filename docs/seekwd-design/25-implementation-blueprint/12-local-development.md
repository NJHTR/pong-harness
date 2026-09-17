# 本地开发与诊断

## 开发模式

```text
desktop dev       启动 Workbench 和 Host，使用开发数据目录
host only         启动 Host、IPC 和测试客户端
worker sandbox    单独启动 worker，注入固定 ExecutionEnvelope
extension dev     加载未签名但隔离的本地扩展
replay dev        从脱敏 Run Snapshot 重放
```

开发数据目录与真实用户数据目录隔离，测试不会扫描或写入用户工作区以外资源。

## 诊断模式

Host 提供只读诊断命令：版本、迁移、租约、健康、队列、运行、扩展、Artifact 引用、策略和事件游标。高风险修复命令必须经过同一 Policy 流程。

## 可重复调试

每个 Bug 报告至少包含：目标/画布/运行引用、软件版本、协议版本、平台、节点版本、错误摘要、事件范围和脱敏的最小输入。不能要求用户导出全部秘密或整个工作区。

## Fixture

测试 Fixture 使用人工构造或脱敏过的 Goal、Graph、Artifact、Run Event 和外部回执。Fixture 必须声明是否允许副作用和是否可用于回归。

