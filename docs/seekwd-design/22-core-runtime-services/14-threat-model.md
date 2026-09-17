# 威胁模型

## 资产

需要保护的资产包括用户数据、工作区资源、秘密、权限授予、运行控制权、Artifact、技能、审计记录、执行上下文和外部连接。

## 信任边界

```text
human input
agent output
external capability output
extension implementation
execution context
storage boundary
network boundary
UI client boundary
```

跨越任一边界都要验证身份、Schema、权限、完整性和敏感度。

## 主要威胁

- 注入：不可信内容试图改变策略、目标或执行路径。
- 越权：主体、节点或扩展尝试访问未授权资源。
- 混淆：展示名称或相似能力诱导选择错误对象。
- 重放：重复审批、事件或命令产生额外副作用。
- 伪造：伪造执行成功、观察证据或外部回调。
- 泄漏：日志、记忆、Artifact 或错误信息暴露敏感数据。
- 逃逸：执行上下文访问宿主未授予资源。
- 资源耗尽：循环、流、重试或 Agent 自主循环无界运行。
- 供应链：扩展、技能或适配器被篡改或行为退化。

## 最低防护

```text
strict schemas and provenance
least authority with expiring grants
signed or integrity-checked extensions
idempotency and replay protection
secrets by reference only
bounded execution and budgets
audit trails with tamper evidence
isolation between execution contexts
human approval for scope expansion
verification before success claims
```

## 安全测试

每个主要边界至少有拒绝测试、越权测试、重放测试、敏感数据测试和取消/撤销测试。安全规则失败必须默认阻断，而不是回退到更宽松路径。

