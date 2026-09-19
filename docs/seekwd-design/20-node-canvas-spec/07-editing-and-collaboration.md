# 编辑与协作语义

## 编辑对象

用户或 Agent 可编辑以下对象：

```text
canvas metadata
public interface
node instance
node configuration
port binding
edge and mapping
condition / wait / retry policy
verification rule
authority boundary
presentation metadata
```

每项编辑都通过命令或 GraphPatch 提交，不直接修改运行时对象。

## 编辑命令

基本命令包括：

```text
create / delete / duplicate node
connect / disconnect edge
update configuration
set input default
enable / disable node or edge
group / ungroup
split node
compose node group
expand composite
extract child canvas
inline child canvas
lock / unlock node
set breakpoint
restore version
```

命令要说明目标对象、前置版本、操作者、理由和影响范围。

## 人类和 Agent 同时编辑

画布草稿使用乐观并发，但发布和运行使用严格版本：

1. 每个 Patch 声明 `baseVersion`。
2. 若目标对象未被别人修改，可以自动合并。
3. 若同一节点、端口、边或接口冲突，保留两个 Patch 并要求解决。
4. 不允许用最后写入覆盖未提示的图语义冲突。
5. 解决冲突后更新 CanvasDraft，保存时形成新的 CanvasRevision。

## 锁定和保护

用户可以锁定节点、子图、端口、成功标准或权限边界。Agent 只能观察和提出修改，不能直接应用。锁定信息属于图策略，历史运行保留当时的锁定状态。

## 变更预览

任何影响运行的 Patch 都应展示：

```text
修改前后图差异
新增 / 删除 / 替换的节点和边
输入输出影响
权限与环境影响
可能受影响的运行分支
验证计划
```

## 构建主体与执行主体

构建主体和执行主体分别记录在 Canvas、NodeInstance 和 Run 上。人工编辑的节点可以由 Agent 执行，Agent 生成的节点可以由人类单步执行；交接使用独立的 ControlHandoff 记录。

## 草稿与运行

编辑器中的 CanvasDraft 只用于编辑、审阅和静态检查。“运行草稿”必须先保存成不可变 CanvasRevision，再启动显式调试运行。正式运行必须选择一个 CanvasRelease，不能让运行隐式读取用户正在编辑的草稿。
