# 记忆与技能服务

## Memory Service

负责记录可复用事实、用户偏好、工作区规则、运行经验和失败案例。每条记忆有作用域、来源、可信度、创建时间、更新时间和失效条件。

## Skill Registry

技能是通过契约和验证包装过的能力或复合图，而不是一段未经验证的历史聊天。技能版本包含：

```text
input / output contracts
preconditions
implementation reference
verification suite
known limitations
trust level
scope and owner
```

## 提升流程

```text
Run or Run Branch
  -> candidate extraction
  -> sensitive data removal
  -> interface abstraction
  -> regression sample generation
  -> repeatability test
  -> human / policy review
  -> SkillVersion publish
```

## 检索

记忆检索必须按当前主体和资源范围过滤，并区分事实、假设、建议和历史案例。检索结果可帮助规划，但不能绕过当前目标的验证和授权。

## 退化与回滚

技能质量下降、外部契约变化或安全问题出现时，停止新调用并回滚到上一个版本。已有运行保留原技能版本和结果。

