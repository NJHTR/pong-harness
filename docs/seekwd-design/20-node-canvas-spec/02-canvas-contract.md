# 画布契约

## 画布是什么

画布是一个可调用的、可组合的图模块。它不是只供人拖拽的页面，也不是只能从头顺序运行的流程。画布应能独立定义输入、输出、事件、权限边界、环境需求、内部图和版本。

```text
CanvasContract
  identity
  metadata
  public interface
  internal graph
  execution policy
  authority policy
  lifecycle policy
  compatibility policy
```

## 身份与元数据

```text
canvasId             永久且全局唯一
namespace            所属工作区或包
name                 人类可读名称
summary              目标和责任边界
owner                所有者或维护主体
tags                 分类和检索标签
visibility           私有、工作区、共享或发布
createdAt/updatedAt
```

`name` 可以改变，`canvasId` 不可改变。名称不是引用依据；所有调用引用 canvasId 和版本兼容范围。

## 公开接口

公开接口是其他画布、人类和 Agent 可以依赖的唯一边界：

```text
inputs               输入端口定义
outputs              输出端口定义
events               可订阅事件定义
entrypoints          手动、调用、触发等入口定义
completion contract  成功、失败、取消和部分完成的输出语义
```

每个入口声明是否可重入、是否允许并发运行、是否需要特定权限或环境。外部调用方不得依赖内部节点 ID、节点位置或内部临时 Artifact。

## 内部图

内部图由 NodeInstance、GraphEdge、局部变量、局部事件和图策略构成。画布可以包含复合节点，从而形成嵌套图；嵌套不能改变公开接口的稳定性。

## 画布级策略

```text
max parallelism
default timeout
budget ceilings
retry defaults
logging and retention
default execution context selection
default authority mode
failure propagation
event retention
```

节点级策略可以更严格，但不能放宽画布级或系统级策略。

## 画布状态

```text
draft       可编辑，不能作为稳定依赖运行
validated   静态校验通过
published   不可变，可被其他画布依赖
deprecated  仍可读取，新的调用不建议使用
archived    不再正常使用，历史运行保留
deleted     逻辑删除，只有满足引用清理后才可物理删除
```

## 画布作为函数与画布作为空间

画布有两种同等重要的视角：

- **函数视角**：输入、输出、前置条件、后置条件、版本和副作用。
- **空间视角**：用户组织、理解、编辑、调试和比较图的可视化工作面。

函数视角决定运行语义，空间视角服务人类理解；两者必须能互相映射，但不能混用。

