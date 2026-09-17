# 主体与权限主体

## Principal

任何能创建、修改、请求、批准、执行或提交结果的对象都是 Principal：

```text
Human             人类用户
Agent             具有目标和策略的智能体
Node              当前图中的执行责任
Service           受控服务
ExternalUnit      外部执行单元
System            Harness 内核
```

主体身份与主体能力分开。一个 Agent 可以被授权使用某个能力，但不能因此继承创建者的全部权限。

## 委托链

```text
root principal
  -> delegated principal
      -> execution principal
```

每次委托都声明目的、作用域、有效期、可再委托性、预算和撤销方式。子主体不能扩大父主体的资源范围或有效期。

## 控制主体

每个 Goal、Canvas、NodeInstance、Run 和 NodeRun 都记录：

```text
createdBy
modifiedBy
approvedBy
executedBy
verifiedBy
```

这些字段可以指向不同主体；不能用一个 `owner` 字段代替所有责任关系。

## 主体交接

交接需要保存检查点、待决策、输入输出和完成标准。接收主体必须确认上下文；交接失败时回到原主体或进入人工处理，不把未确认的部分当作完成。

## 责任边界

Agent 可以建议和执行被授权动作；Harness 负责强制策略；人类负责授予或撤销授权并处理无法自动判定的决策。系统应记录“谁决定”和“谁执行”，即使二者是同一个主体。

