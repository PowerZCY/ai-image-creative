# R2 图片转存 TODO

## 背景

当前 OpenRouter 图片生成接入采用同步一段式流程：

```txt
OpenRouter 生成图片
-> 服务端下载或 decode 图片
-> 生成结果审核
-> 上传到 Cloudflare R2
-> 写入 GeneratedImage
-> GenerationJob 标记 succeeded
-> 前端展示图片
```

也就是说，前端看到图片时，图片已经完成 R2 转存，并且 `GeneratedImage` 已经拥有正式 `imageId`、`jobId`、`sourceImageUrl`、`storageKey` 等可用字段。

## 未来可能改为两步异步方案

后续如果要优化用户等待时间，可以改为两步方案：

```txt
第一步：
OpenRouter 生成图片
-> 先创建/更新 GeneratedImage
   - imageId 有
   - sourceImageUrl 先保存 provider 原始图片 URL
   - storageKey 暂无
-> GenerationJob 标记 succeeded
-> 前端展示图片

第二步：
后台异步任务下载 provider 原始图片
-> 上传到 R2
-> 更新 GeneratedImage.storageKey / cdnImagePrefix / metadata
```

关键点：两步方案也必须先写入 `GeneratedImage`，不能只在前端展示无记录的临时 URL。业务操作应始终关联 `imageId`，而不是直接依赖图片 URL。

## 是否需要改数据库表

大概率不需要。

当前字段已经可以支持两步方案：

- `GeneratedImage.imageId`：业务稳定主键，提交、删除、公开等操作都关联它。
- `GeneratedImage.sourceImageUrl`：可先保存 AI provider 原始 URL。
- `GeneratedImage.storageKey`：R2 上传完成后写入 object key。
- `GeneratedImage.cdnImagePrefix`：需要 CDN 前缀时写入。
- `GeneratedImage.metadata`：可记录 provider、R2 migration 状态、迁移错误、原始响应摘要等。

两步方案和当前一步方案的差异主要是后端流程时序，不是数据模型差异。

## URL 解析规则需要决策

当前展示 URL 是从 `GeneratedImage` 派生出来的。未来两步迁移完成后，需要明确 URL 优先级。

可选策略：

1. 迁移完成后把 `sourceImageUrl` 更新为 R2 view URL。
2. 迁移完成后清空 `sourceImageUrl`，让 `storageKey` + CDN/R2 配置接管。
3. 调整 URL 解析规则：如果 `storageKey` 存在，优先使用 R2/CDN；否则使用 `sourceImageUrl`。

当前建议后续采用第 3 种规则，因为它更符合“业务关联 imageId，URL 是派生展示字段”的模型。

## 当前不做的事

- 不在当前版本改成两步异步转存。
- 不新增图片迁移表。
- 不让前端展示没有 `GeneratedImage.imageId` 的临时 provider 图片。
- 不依赖前端保存 provider URL 和 R2 URL 的切换状态。

## 后续实现任务

如果决定切换为两步方案，后端需要做：

1. OpenRouter provider 返回图片 URL/base64 后，先创建 `GeneratedImage`。
2. `GeneratedImage.sourceImageUrl` 保存 provider 可访问 URL，或先将 base64 临时写入可下载位置。
3. `GenerationJob` 在 `GeneratedImage` 创建后即可标记 succeeded。
4. 新增异步 R2 migration 任务。
5. migration 成功后更新 `storageKey`、`cdnImagePrefix`、`metadata`。
6. migration 失败时记录错误到 `metadata`，不影响已存在的 `imageId`。
7. 统一调整 `buildStoredImageUrl()` 或 repository 映射逻辑，确保 URL 优先级符合最终决策。
