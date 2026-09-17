# 扩展体系

## 扩展类型

```text
Node Extension       提供一个或多个节点定义
Capability Extension 提供能力发现或绑定
Executor Extension   提供执行器
Agent Extension      提供 Agent 能力
Canvas Package       提供画布、复合节点和技能
Projection Extension 提供查询投影或 UI 面板
```

所有扩展都通过 Manifest 和协议接入，不能直接修改核心存储或注入 UI 全局状态。

## 安装状态

```text
discovered -> downloaded -> verified -> installed -> enabled
enabled -> disabled -> removed
verified -> rejected / quarantined
```

发现或下载不等于可信。安装前校验完整性、来源、版本、权限、依赖、兼容性和测试声明。

## 扩展宿主

扩展可以运行在 Host 内、隔离进程、隔离上下文或外部上下文；Manifest 必须声明宿主要求和故障影响范围。一个扩展崩溃不能直接终止 Host 或修改其他扩展状态。

## 依赖解析

扩展依赖节点、Schema、能力、执行上下文或其他扩展版本。解析结果固定到 GraphVersion 或 RunSnapshot；不能运行中悄悄升级依赖。

## 禁用和撤销

扩展被禁用后，新运行不能绑定它；活动 Run 按取消、等待、替代或完成当前不可中断操作处理。历史运行继续引用原版本和审计证据。

