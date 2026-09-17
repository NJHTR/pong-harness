# 图服务

## 职责

Graph Service 管理画布草稿、节点实例、边、公开接口、Presentation Metadata、静态校验、GraphPatch、版本发布和兼容性。它不运行节点。

## 核心操作

```text
createCanvasDraft
applyGraphPatch
validateDraft
publishCanvasVersion
forkCanvasVersion
compareVersions
extractComposite
inlineComposite
resolveCanvasReference
```

## Patch 应用

Patch 按原子操作顺序应用，但最终以整图校验作为提交门槛。若 Patch 中间态短暂不合法可以存在于内存事务中，不得持久化为可运行草稿。

## 静态校验输出

```text
errors          阻止发布或运行
warnings        允许继续但必须展示
impact analysis 受影响节点、接口和调用方
fix suggestions 结构化修复建议
```

## 运行时补丁

RunPatch 不能修改已经执行成功且存在不可逆副作用的节点语义。它可以新增诊断、补偿、等待、替代分支或未执行节点；任何影响历史输出解释的改动必须创建新 Run Branch。

