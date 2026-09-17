# 节点对象模型

## 定义、实例、运行三层

```text
NodeDefinition  节点类型和实现契约
NodeInstance    某个画布中的配置实例
NodeRun         某次执行的输入、输出、日志和状态
```

## 节点类型

- **Action Node**：执行一个边界清晰、可验证的动作。
- **Agent Node**：具有目标、上下文、工具权限和自我验证循环的 Agent。
- **Delegate Node**：将受限任务交给其他智能体、服务或执行单元。
- **Tool Node**：调用外部能力提供者的适配节点。
- **Code Node**：在选定执行上下文中运行可审计的代码或脚本。
- **Composite Node**：由内部节点图实现的可复用能力。
- **Canvas Call Node**：调用另一画布并按契约获取结果。
- **Human Node**：请求输入、审批、接管、确认或评价。
- **Trigger Node**：响应事件、定时器、文件变化、其他画布状态等。

## 节点契约

每个定义至少声明：

```text
id / version / description
input ports / output ports / control ports / event ports
configuration schema
implementation kind
environment requirements
permission requirements
timeout / retry / cache / idempotency policy
test cases and evidence
```

端口类型由数据契约定义，可表示标量、结构化对象、资源引用、流、控制信号和事件。大数据不直接塞进图定义，而通过 Artifact 引用传递。

## 节点的面向对象语义

```text
节点定义       类 Class
节点实例       对象 Object
配置字段       对象属性
输入端口       方法参数
输出端口       返回值
复合节点       封装对象 / 函数
节点派生       继承或复制并覆盖实现
节点版本       不可变类版本
节点运行       一次方法调用实例
```

支持 `compose`、`expand`、`extract`、`inline`、`split`、`fork`、`promote` 等图重构操作。

## 信任等级

```text
ephemeral          仅当前运行可用
experimental       已测试但证据不足
verified           通过声明测试
workspace-approved 用户在当前工作区批准
trusted-by-policy  符合组织策略
```
