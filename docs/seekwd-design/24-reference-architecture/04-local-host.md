# Pong Host

## 角色

Pong Host 是用户设备上的受控运行宿主，负责启动 Harness 服务、拥有工作区写入租约、管理本地身份、托管持久化、调度运行、管理扩展和提供 IPC。

## 生命周期

```text
not_installed
  -> installed
  -> starting
  -> recovering
  -> healthy
  -> draining
  -> stopped
  -> failed
```

`recovering` 时加载事实、执行迁移、验证锁、恢复事件投影、对账运行和清理过期会话。未进入 healthy 前不接受可能产生副作用的新命令。

## 本地身份

Host 生成设备身份和本地会话密钥；Workbench 使用受限、可撤销的 Session Token 连接。令牌绑定本机用户、Host 实例、客户端实例、有效期和最小权限，不通过固定端口或路径本身识别可信客户端。

## 写入租约

Host 启动时申请工作区写入租约，记录 owner、进程、心跳和过期时间。异常退出后新 Host 必须等待租约过期或完成安全接管，不能直接删除锁文件并假设没有旧进程。

## 健康

健康检查区分：进程存活、存储可写、事件投影延迟、调度器活动、Artifact 可读、策略可用和扩展状态。UI 应显示降级原因，而不是只显示一个绿色状态。

