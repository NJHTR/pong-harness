# Artifact 服务

## 责任

Artifact Service 管理结果、输入资源、日志内容、观察材料、调试夹具和交付包的版本、访问和生命周期。它不判定目标是否成功。

## 写入流程

```text
reserve artifact
  -> write content or receive external reference
  -> compute integrity metadata
  -> commit revision
  -> append lineage
  -> publish reference to NodeRun
```

未提交的资源不能被下游视为正式输出。写入中断时进入 abandoned 或 recoverable 状态，不覆盖已有 revision。

## 血缘

每个 revision 引用产生它的 NodeRun、输入 revision、节点定义版本、配置摘要、执行上下文和验证结果。派生资源不会复制全部上游内容，只保存关系。

## 访问

Artifact 访问必须再次经过 Policy Service，不能因为用户能查看运行记录就自动能下载所有内容。预览、下载、挂载、外发和删除是不同动作。

## 保留

保留策略按目标、运行、调试、交付、技能和审计引用计算。清理前执行引用检查；过期后可以冻结、归档或删除，但审计所需的摘要和指纹必须保留。

