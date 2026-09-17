# 策略引擎

## 策略评估输入

策略引擎评估一个具体的 `ActionRequest`：

```text
principal
action
resource
goal / canvas / node / run
execution context
data sensitivity
risk level
current budget
time and expiry
prior approvals
```

## 决策

```text
allow
deny
require_approval
allow_with_conditions
defer
```

决策必须返回原因、匹配的规则、条件、有效期和可重试性。`allow_with_conditions` 的条件要在执行器侧再次检查，不能只显示在 UI。

## 规则优先级

```text
system safety
organization policy
workspace policy
goal policy
canvas policy
node policy
user delegation
```

更具体的规则只能收紧权限，不能放宽更高层规则。显式拒绝优先于允许；缺少规则时默认保守处理。

## 审批令牌

审批不是一个全局布尔值，而是带绑定的 `ApprovalGrant`：

```text
grantId
requestId
principal
action
resource scope
configuration digest
graph / node / run reference
issuedAt / expiresAt
single-use or bounded-use
revocation state
```

执行器必须验证令牌绑定，客户端自报“已批准”不能作为授权依据。

## 策略变化

策略更新只影响尚未执行的动作，已完成动作保留原决策。正在运行的动作按可取消性和风险策略处理，必要时进入 `revoked` 或 `cancel_pending`。

