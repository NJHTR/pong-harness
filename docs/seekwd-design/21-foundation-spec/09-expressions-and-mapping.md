# 表达式与映射

## 用途

表达式用于条件判定、端口映射、字段选择、聚合和有限的值转换。表达式不是通用脚本执行器。

## 表达式上下文

求值上下文只包含声明的只读值：

```text
current node inputs
declared predecessor outputs
event envelope
goal variables explicitly exported
loop state
policy-provided constants
```

不得读取任意文件、环境变量、网络、全局状态或秘密。

## 安全操作集

允许的操作包括字段选择、比较、布尔运算、有限集合映射、长度和存在性判断、受限字符串处理以及声明的纯转换。循环、递归、动态代码、未限制的正则和高成本运算需要独立节点。

## 结果

```text
ExpressionResult
  value
  result schema
  evaluated inputs
  expression version
  warnings
  error if evaluation failed
```

条件求值失败不能默认为 false；应进入错误路径或人工决策，避免把系统错误误当成业务分支。

## 映射的血缘

每个输出字段记录源端口、源值版本、转换表达式和转换版本。这样用户可以解释一个节点输入是如何由前置结果得到的。

