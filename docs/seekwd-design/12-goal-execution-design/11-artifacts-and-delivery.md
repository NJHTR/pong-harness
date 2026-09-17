# 产物与交付

## Artifact 模型

```text
Artifact
  id / type / schema
  location or content reference
  size / checksum
  createdBy nodeRunId
  source lineage
  sensitivity
  retention policy
  access scope
  status
```

节点之间传递 Artifact 引用，而不是在图定义中复制大内容。小型结构化值也应保留来源和版本。

## 血缘

每个产物记录：输入产物、节点定义版本、配置摘要、执行上下文、验证结果和派生关系。用户应能从最终交付物反查到目标、图、节点、输入和证据。

## 交付检查

交付节点负责：

- 检查所有必需产物存在且可读。
- 检查格式、大小、完整性和权限。
- 过滤不应外发的内容。
- 打包结果、摘要、证据和未解决问题。
- 写入交付清单和有效期。

## 生命周期

产物状态包括临时、已验证、已交付、已归档、已过期和已删除。清理不能删除仍被运行、版本、技能或审计引用的产物；删除前要处理引用关系。

