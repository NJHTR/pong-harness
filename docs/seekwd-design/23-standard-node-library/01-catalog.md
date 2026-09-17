# 标准节点目录

以下 ID 是语义 ID，不要求实现语言或 UI 名称一致。每个节点必须有稳定的定义版本。

## 目标和输入

```text
goal.start                 创建目标运行入口
goal.output                声明目标交付出口
input.value                提供静态或配置值
input.request              请求运行时输入
input.resource             接收 Artifact 或资源引用
input.secret-reference     接收受策略保护的秘密引用
```

## 数据与状态

```text
data.constant              创建常量
data.compose               按 Schema 组装结构化值
data.select                读取字段或集合片段
data.transform             执行声明的纯转换
data.map                   对有限集合执行映射
data.filter                按纯条件过滤集合
state.set                  写入声明作用域内的状态
state.get                  读取声明作用域内的状态
state.reduce                按聚合器汇总结果
resource.reserve            预留受限运行资源
```

## 控制流

```text
control.sequence           显式表达先后
control.condition          求值并输出决策
control.switch             多路径路由
control.join               等待多个输入汇聚
control.race               接受首个满足条件的结果
control.merge              合并多条控制或数据路径
control.stop               按规则结束分支或运行
control.noop               明确占位，不产生副作用
```

## 迭代和等待

```text
loop.for-each              对有限集合迭代
loop.while                 按显式条件循环
loop.batch                 按批次处理集合
loop.retry-until           在上限内反复尝试直到标准通过
wait.input                 等待输入
wait.dependency            等待其他运行或节点
wait.timer                 等待时间条件
wait.event                 等待事件
trigger.start              将外部事实转换为运行入口
trigger.event              订阅事件并触发分支
```

## 人类与 Agent

```text
human.input                请求文本、值或资源
human.choice               请求方案选择
human.approval             请求具体动作审批
human.review               请求查看结果或变更
human.takeover             请求或开始人工接管
human.feedback             收集结构化反馈
agent.plan                 生成计划候选
agent.observe              生成观察或检索结果
agent.decide               根据约束做结构化决策
agent.execute              在授权范围内自主执行子任务
agent.delegate             委派给另一执行主体
agent.verify               提出或执行验证
agent.repair               生成修复方案或 GraphPatch
```

## 能力和画布

```text
capability.discover        发现满足契约的能力
capability.resolve         选择并绑定能力版本
capability.construct       构造待验证的新能力
context.build              组装执行上下文
context.observe            刷新上下文观察
canvas.call                调用其他画布并按契约返回
canvas.trigger             启动其他画布
canvas.wait                等待画布事件或结果
canvas.patch               提出或应用运行时图变更
composite.expand           展开复合节点
composite.compose          将节点组封装为复合节点
```

## 质量和运行管理

```text
verify.assert              断言结构或状态
verify.evaluate            评估内容或质量标准
verify.gate                阻断或放行下游
verify.compare             比较候选、版本或基线
verify.human-confirm       将特定标准交给人类确认
error.catch                捕获指定错误路径
error.raise                产生结构化错误
retry.run                  按策略重试
fallback.select            选择受约束的替代路径
compensation.run           执行补偿路径
cache.read                 读取可复用结果
cache.write                保存可复用结果
checkpoint.create          创建恢复点
checkpoint.restore         从恢复点继续
observe.log                写入结构化日志
observe.capture            保存运行观察
debug.breakpoint           在条件满足时暂停
debug.inspect              检查运行而不改变事实
debug.replay               从历史输入重放
run.cancel                 请求取消运行
run.complete               明确结束当前目标或子图
```

## 目录规则

标准目录只包含跨领域的最小原语。任何新增节点都必须回答：已有节点为什么不能组合实现、它的公共语义是什么、输入输出如何验证、失败如何处理、是否会成为新的隐式全局状态。
