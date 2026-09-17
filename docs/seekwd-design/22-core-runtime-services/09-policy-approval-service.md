# 策略与审批服务

## Policy Service 责任

根据主体、动作、资源、目标、节点、上下文、数据敏感度、风险、预算和时间评估 ActionRequest，并生成可追溯 Decision。

## Approval Service 责任

将需要人的 Decision 变成 ApprovalRequest，收集批准、拒绝、修改范围、过期和撤销，并产生绑定到具体动作的 ApprovalGrant。

## 审批生命周期

```text
requested -> presented -> approved / rejected / expired / cancelled
approved -> issued grant -> consumed / revoked / expired
```

审批请求必须告诉用户做什么、作用于什么资源、为什么需要、影响什么、多久有效以及拒绝后的路径。不能用笼统的“允许 Agent”代替具体动作。

## 动态补丁审批

GraphPatch 的审批摘要必须包含图差异、输入输出影响、权限变化、环境变化、预算影响和验证计划。批准只适用于摘要哈希一致的 Patch。

## 撤销

撤销影响尚未开始的动作；对已经发出的外部副作用，服务必须记录结果未知、补偿和人工处理状态。撤销不改写过去的授权决定。

