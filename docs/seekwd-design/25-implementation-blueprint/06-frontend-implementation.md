# 前端实现

## 状态分层

```text
domain facts       Host 查询与订阅的只读投影
draft store        当前画布未提交编辑
command store      pending / conflict / failure 的命令状态
view store         选区、布局、面板、缩放、筛选
debug store        当前调试 Run、断点和输入覆盖
```

Zustand 适合 view 和 draft 状态；事实投影必须有 cursor、版本和重同步机制，不能仅依赖客户端 store 永久保存。

## Graph Adapter

领域 Graph Schema 与渲染器节点模型之间使用适配层：

```text
domain graph -> renderer graph
renderer interaction -> typed GraphCommand / GraphPatch
```

拖拽、连线、删除和配置更新都先变成领域命令，再进行端口、版本和策略校验。

## 画布界面层级

```text
Workspace shell
  -> Goal navigator
  -> Canvas tabs / tree
  -> Canvas editor
  -> Node inspector
  -> Run / evidence / artifact panels
  -> Approval / human takeover surfaces
```

复杂节点支持进入内部图，但保留父图面包屑、父 Run 和输入输出映射。

## 乐观编辑

草稿编辑可本地乐观更新；提交失败时显示对象级冲突和 Patch 差异。不能用重新拉取整图覆盖本地未提交内容。

## 可访问性和性能

节点图支持键盘创建连接、聚焦端口、读取错误和切换主体。大型图使用视口渲染、局部更新和事件过滤；调试日志和流输出不能阻塞画布交互。

