# 技术栈决策

## 桌面壳：Tauri 2

选择原因：安装包体积较小、原生窗口和系统能力接入直接、Rust Host 可以与桌面应用同一产品交付、适合本地优先和多进程 worker。

边界：Tauri 只负责桌面壳和安全桥接，不负责目标、图、运行或权限语义。所有业务状态仍由 Pong Host 管理。

## 前端：React + TypeScript + Vite

选择原因：适合复杂 IDE 式界面、节点图编辑器、面板布局和大规模组件复用；TypeScript 类型可以从规范 Schema 生成或共享。

边界：前端只维护 view state、draft buffer 和事实投影，不成为持久化事实来源。

## 图渲染：React Flow-compatible renderer

选择原因：支持端口、边、拖拽、自定义节点、嵌套编辑和增量更新；图语义仍使用 Pong Harness 自己的 Graph Schema，渲染器只是适配层。

要求：不得把渲染器的 Node、Edge 类型直接作为领域模型；必须有 Graph Adapter 做双向转换和校验。

## Host：Rust + Tokio

选择原因：适合本地常驻进程、并发调度、取消、文件和进程边界、资源管理、跨平台打包和故障恢复。Tokio 只提供异步执行，不拥有领域语义。

## 存储：SQLite + WAL

选择原因：单机安装简单、事务和条件写入成熟、支持离线和备份；WAL 适合 Host 读写与 Workbench 查询投影并行。

边界：大 Artifact 不放入主表；SQLite 保存元数据、版本、事件、血缘和索引，内容保存于 Artifact Store。

## 协议：内部类型化消息，扩展 JSON-RPC + JSON Schema

内部命令和事件使用共享 Schema 编码；外部扩展使用可被多语言实现的 JSON-RPC 风格消息和 JSON Schema Manifest。协议版本、错误、流、取消、能力协商必须显式。

## 为什么不把 Node.js 作为 Host

Node.js 适合扩展和节点实现，但本地主控需要更强的进程、资源、取消、文件和升级控制。Node.js 可以作为 worker 或扩展运行时，不作为 Pong Host 的唯一可信边界。

