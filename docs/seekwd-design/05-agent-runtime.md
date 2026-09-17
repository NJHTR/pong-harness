# Pong Agent 运行时

## 运行循环

```text
读取目标与上下文
  -> 观察当前环境和已有 Artifact
  -> 生成计划或 Graph Patch
  -> 静态校验端口、权限、环境和循环
  -> 执行下一批节点
  -> 观察结果和证据
  -> 验证完成条件
  -> 继续、修复、委派或请求用户
```

## 动态建图

Agent 可以：

- 创建已有节点实例。
- 修改节点配置和执行者。
- 新增或删除连接。
- 创建复合节点和子画布。
- 生成代码节点、工具适配器或 Agent 委派节点。
- 创建环境检查、安装和等待节点。
- 创建跨画布触发器和数据绑定。

所有变化通过结构化 `GraphPatch` 表达，包含前置图版本、变更内容、影响范围、风险和验证计划。运行时先绑定到本次 Run；验证后才可发布为新画布版本。

## Agent 节点

Agent 节点至少有：

```text
goal
context inputs
allowed tools and agents
allowed graph mutations
environment and permission scope
budget / timeout / max steps
success criteria
```

Agent 节点的内部执行默认折叠，但必须能够展开为观察、工具调用、验证和修复节点。

## 失败和修复

遇到失败时，Agent 可按顺序：

1. 读取错误、输入、环境和最近节点输出。
2. 判断是输入错误、代码错误、环境错误、权限错误、工具错误还是计划错误。
3. 生成修复补丁或替代执行路径。
4. 低风险范围内自动应用，高风险操作进入审批。
5. 只重跑受影响的节点和下游分支。
6. 把修复结果记录为证据和候选技能。

