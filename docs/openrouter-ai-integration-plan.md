# OpenRouter AI 接入方案

## 目标范围

本文档记录 Monica Creator 接入 OpenRouter 的确定方案。

本次接入包含两类 AI 能力：

- 图片生成：通过 OpenRouter 的多个图片能力模型，根据用户 prompt 和可选参考图生成图片。
- Prompt 创意：通过 OpenRouter 的一个文本模型生成创意方向、改写 prompt、回答创作助理问题。

生成出来的图片必须先上传到 Cloudflare R2，再作为产品里的最终图片展示和保存。OpenRouter 返回的 URL、base64 或 data URL 都只视为临时 provider 输出，不能作为长期图片地址直接入库使用。


## 当前系统现状

`src/components/monica/creator-client.tsx` 当前是前端编排组件，职责包括：

- 管理 Creator UI 状态
- 上传参考图
- 创建 generation job
- 触发或轮询 job
- 展示生成结果
- 本地生成 assistant idea fallback

真正适合接 AI 的边界已经在服务端：

- `src/app/api/monica/generation/jobs/route.ts`：创建生成任务。
- `src/server/monica/services/generation.service.ts`：运行任务、处理安全检查、积分扣除、失败退款。
- `src/server/monica/ai/image-generation-provider.ts`：图片 provider 接口。
- `src/server/monica/ai/mock-image-generation-provider.ts`：当前 mock provider。
- `src/server/monica/repositories/generation.repository.ts`：写入 `generated_images`。
- `src/server/monica/storage/r2-storage.service.ts`：已有 R2 服务基础。
- `src/lib/r2-explorer-sdk.ts`：已有 R2 upload/share/download SDK。

结论：OpenRouter 只能放在服务端接入，不能在 `creator-client.tsx` 里直接调用，也不能把 OpenRouter API key 暴露给浏览器。

## SDK 选择

采用 OpenRouter Client SDK：

```bash
pnpm add @openrouter/sdk
```

不采用 Agent SDK。

采用 Client SDK 的原因：

- Client SDK 是 OpenRouter REST API 的轻量类型封装。
- 它已经提供 timeout、retry 配置、连接错误重试、类型化错误、request/response hook、debug logging 等基础网络能力。
- 它比 Agent SDK 更轻，适合当前确定性的 job pipeline。
- 可以减少自己手写 fetch retry、timeout、错误归一化的工作。

重要约束：

业务代码不要直接 import `@openrouter/sdk`。需要先封装一个项目自己的 server-only client：

```txt
src/server/monica/ai/openrouter-client.ts
```

后续 `generation.service.ts`、assistant service、image provider 都只调用这个 wrapper，不直接依赖 OpenRouter SDK。这样以后如果要替换 SDK、调整 retry 策略或换回 fetch，只改 wrapper。

## 为什么不用 Agent SDK

Agent SDK 用于 agentic workflow：多轮循环、自动 tool call、conversation state、stop condition、动态参数等。

当前 Monica 的图片生成主链路是确定性的业务流程：

```txt
用户输入 prompt
-> 创建 generation job
-> 扣积分
-> 调图片模型
-> 上传图片到 R2
-> 写 generated_images
-> 返回 job 结果
```

R2 上传、数据库写入、积分扣除、退款、安全检查都必须由服务端业务代码确定执行，不应该交给 agent 自主规划。

Agent SDK 以后可以用于更高级的创作工作流，例如自动生成一组主题图、比较多张输出、重新生成质量较差的结果、自动生成主题草稿等。但第一版真实 AI 接入不需要它。

## OpenRouter Client Wrapper

新增 server-only wrapper：

```txt
src/server/monica/ai/openrouter-client.ts
```

它负责：

- 读取 OpenRouter API key
- 配置 app attribution headers
- 配置 timeout 和 retry
- 归一化错误信息
- 管理模型 slug 映射
- 记录响应 metadata

不要把 wrapper 放进任何 client component 或 `NEXT_PUBLIC_*` 可见代码路径。

## 环境变量评估

你列出的变量中，有些可以采用，有些需要限制用途或改名。

| 变量名 | 结论 | 说明 |
| --- | --- | --- |
| `OPENROUTER_TIMEOUT_SECONDS` | 采用 | 推荐使用秒作为配置单位，wrapper 内转换为毫秒传给 SDK。比 `MONICA_OPENROUTER_TIMEOUT_MS` 更易读。 |
| `NEXT_PUBLIC_OPENROUTER_MODEL_NAME` | 不使用 | 不再采用该变量。前端模型展示由代码内 model options 或服务端返回的公开配置控制；真实模型 slug 只放服务端。 |
| `NEXT_PUBLIC_CHAT_CONTEXT_WINDOW_TURNS` | 不使用 | 第一版不是多轮 chat，不采用该变量。后续如做多轮 assistant，也应优先使用服务端变量控制上下文窗口。 |
| `OPENROUTER_MOCK_TYPE` | 采用现有枚举 | 用于控制 mock 响应形态，按现有数字枚举处理。 |
| `OPENROUTER_MOCK_TIMEOUT_SECONDS` | 可采用 | 用于 mock provider 或 mock client 的响应延迟。 |
| `OPENROUTER_MOCK_STREAM_CHUNK_DELAY_MS` | 暂不需要 | 当前图片生成和 prompt assistant 第一版不做 streaming。保留给以后流式文本 assistant。 |
| `OPENROUTER_MOCK_STREAM_CHUNK_SIZE` | 暂不需要 | 同上，第一版不做 streaming。 |

推荐第一版环境变量：

```env
OPENROUTER_API_KEY=
OPENROUTER_SITE_NAME=Monica AI
OPENROUTER_TIMEOUT_SECONDS=120

OPENROUTER_PROMPT_MODEL=openai/gpt-5.2
OPENROUTER_IMAGE_MODEL_MAP='{
  "gpt-image-2": "...",
  "nano-banana-2": "...",
  "nano-banana-pro": "...",
  "seedream-4.5": "..."
}'

OPENROUTER_MOCK_TYPE=0
OPENROUTER_MOCK_TIMEOUT_SECONDS=2
```

`OPENROUTER_MOCK_TYPE` 是唯一 mock 开关：

```txt
未设置或空值: 调用真实 OpenRouter
设置为 0-5: 图片生成和 assistant 都走 mock
```

`OPENROUTER_MOCK_TYPE` 使用现有枚举：

```txt
0: Normal
1: Loading
2: TimeOut
3: PartTimeout
4: PartAborted
5: PartInterrupted
```

第一版按这些数字枚举实现。图片生成 mock 和 assistant mock 都读取同一个变量，方便本地调试 loading、timeout、aborted、interrupted 等状态。图片 URL、base64、非法 JSON、空图片等更细粒度 mock 场景如后续测试需要，可以在不改变现有枚举的前提下增加独立测试 fixture 或扩展枚举。

## 模型配置

前端模型选项改为 4 个：

```txt
GPT Image 2
Nano Banana 2
Nano Banana Pro
Seedream 4.5
```

建议内部 model key 使用稳定小写值，展示 label 使用上面的名称：

```txt
gpt-image-2
nano-banana-2
nano-banana-pro
seedream-4.5
```

服务端通过 `OPENROUTER_IMAGE_MODEL_MAP` 映射到真实 OpenRouter model slug。这样可以在不改数据库结构的情况下替换具体模型。

真实 OpenRouter 模式下，生成请求必须传 `model`。如果 `OPENROUTER_MOCK_TYPE` 未设置且 API 请求缺少 `model`，服务端应直接返回 `model is required`。只有 mock 模式允许缺省为 `mock-image-model`。

文本 prompt 创意使用单独变量：

```txt
OPENROUTER_PROMPT_MODEL
```

注意：不使用 `NEXT_PUBLIC_OPENROUTER_MODEL_NAME` 控制服务端真实调用模型。

## 图片生成流程

新增真实图片 provider：

```txt
src/server/monica/ai/openrouter-image-generation-provider.ts
```

它实现现有接口：

```ts
ImageGenerationProvider.createGeneration(input)
```

目标流程：

```txt
creator-client.tsx
-> POST /api/monica/generation/jobs
-> generationService.createGenerationJob()
-> generationService.runGenerationJob()
-> prompt / reference image safety check
-> openrouterImageGenerationProvider.createGeneration()
-> OpenRouter Client SDK chat call
-> 解析 provider 图片输出
-> generated image safety check
-> 上传每张图片到 R2
-> generationRepository.completeSucceeded()
-> 前端轮询拿到 generated image URL
```

OpenRouter 图片能力模型按统一 chat completions 方式调用。参考图存在时，通过：

```txt
referenceImageService.createProviderAccessibleImageUrl()
```

拿到模型可访问的参考图 URL，然后在 message content 中加入 image input。

由于不同图片模型返回结构可能不同，provider 需要兼容多种输出：

- 直接图片 URL
- data URL
- base64 图片 payload
- assistant message 内结构化 image 字段

如果没有解析出任何可交付图片，provider 抛出明确错误：

```txt
Provider returned no deliverable images
```

前端只展示 `completeSucceeded()` 后返回的图片。此时图片已经完成：

- 通过 provider 返回
- 通过结果安全检查
- 上传到 R2
- 写入 `generated_images`
- 绑定 `imageId` 和 `jobId`

这样后续提交到主题、收藏、删除、下载等操作都有稳定记录可关联。

## R2 持久化

OpenRouter 输出必须先复制到 R2，job 才能标记为 succeeded。

扩展：

```txt
src/server/monica/storage/r2-storage.service.ts
```

新增类似方法：

```ts
uploadGeneratedImage(input: {
  storageKey: string;
  body: ArrayBuffer | Blob;
  contentType: string;
})
```

推荐生成图 key：

```txt
monica/generated-images/{jobId}/{index}.{ext}
```

示例：

```txt
monica/generated-images/2e1b2f5a-1b3e-4e5f-8f6d-1a2b3c4d5e6f/0.png
monica/generated-images/2e1b2f5a-1b3e-4e5f-8f6d-1a2b3c4d5e6f/1.png
```

R2 是对象存储，目录只是 object key 的前缀，不需要提前创建目录。上传 `monica/generated-images/...` 这样的 key 后，R2 控制台或 explorer 会按 `/` 展示出类似目录的层级。

命名规则：

- 固定前缀：`monica/generated-images/`
- 第二级：`jobId`
- 文件名：`providerImageIndex`
- 扩展名：根据真实 content type 判断，优先 `png`、`webp`、`jpg`

最终访问地址不手写、不拼接。上传成功后必须使用 R2 upload/share 返回的 view URL；如果没有返回可访问 URL，则视为该图片不可交付，job 失败并退款。这样可以避免保存一个用户无权限访问的构造地址。

provider 返回现有结构：

```ts
{
  provider: 'openrouter',
  providerJobId: responseId,
  images: [
    {
      index,
      storageKey,
      imageUrl,
      width,
      height,
      metadata: {
        provider: 'openrouter',
        model: resolvedModelSlug,
        modelKey: input.model,
        ratio: input.ratio,
        prompt: input.prompt,
        openrouterResponseId: responseId
      }
    }
  ]
}
```

`generationRepository.completeSucceeded()` 现有逻辑已经会写：

- `storageKey`
- `sourceImageUrl`
- `width`
- `height`
- `metadata`
- `providerImageIndex`

第一版不需要改数据库结构。


## Prompt Assistant 流程

当前 `creator-client.tsx` 的 assistant 是本地规则生成。真实 AI prompt assistance 应该迁移到服务端 API。

新增：

```txt
src/app/api/monica/assistant/prompt/route.ts
src/server/monica/services/assistant.service.ts
```

请求结构：

```ts
{
  mode: 'ideas' | 'improve' | 'ask';
  prompt?: string;
  userInput?: string;
  themeLabel?: string;
  themeId?: string;
  sourcePage?: string;
}
```

响应结构：

```ts
{
  message?: string;
  ideas?: Array<{
    idea: string;
    prompt: string;
  }>;
  improvedPrompt?: string;
  interactionId?: string;
}
```

服务端调用 `OPENROUTER_PROMPT_MODEL` 配置的 OpenRouter 文本模型。

模型必须被要求输出严格 JSON。服务端负责 parse 和 validate，再返回给前端。如果 JSON 解析失败或 OpenRouter 调用失败，前端可以回退到当前本地 fallback ideas。

assistant 交互记录写入：

```txt
src/server/monica/repositories/assistant-interaction.repository.ts
```

记录内容包括：

- input prompt
- output prompt
- generated ideas
- provider
- model
- request/response payload 摘要
- status
- error message

## Provider 选择

保留 mock，方便本地开发和测试。是否 mock 只由 `OPENROUTER_MOCK_TYPE` 决定。

```txt
OPENROUTER_MOCK_TYPE unset / empty -> openrouter
OPENROUTER_MOCK_TYPE=0..5 -> mock
```

assistant mock 已实现。`/api/monica/assistant/prompt` 在 mock 模式下不会调用 OpenRouter，会直接返回稳定的 ideas 或 improvedPrompt，并写入 `assistant_interactions`，其中 `provider = "mock"`、`model = "mock-assistant-model"`。

在 `generation.service.ts` 中不要直接 import mock provider，改为通过 factory 获取 provider：

```txt
src/server/monica/ai/image-generation-provider.factory.ts
```

`generation.service.ts` 只依赖 `ImageGenerationProvider` 接口。

## 多平台扩展能力

当前方案方便后续接入非 OpenRouter 平台，但需要保持边界清晰。

核心原则：

- `generation.service.ts` 不感知 OpenRouter、Replicate、fal、直连厂商等具体平台。
- 所有平台都实现统一的 `ImageGenerationProvider` 接口。
- 每个平台自己的鉴权、请求格式、轮询、输出解析、错误归一化都封装在自己的 provider 内。
- R2 上传最好由统一 storage service 完成，避免每个平台重复实现。
- 数据库中 `GeneratedImage.metadata.provider` 记录具体平台，便于排查和统计。

推荐目录形态：

```txt
src/server/monica/ai/image-generation-provider.ts
src/server/monica/ai/image-generation-provider.factory.ts
src/server/monica/ai/mock-image-generation-provider.ts
src/server/monica/ai/openrouter-client.ts
src/server/monica/ai/openrouter-image-generation-provider.ts
```

第一版只实现 OpenRouter，不新增 Replicate、fal、custom 等平台目录。后续如果平台增多，再按 provider 目录拆分即可。

统一 provider 返回值仍然是：

```ts
ImageGenerationProviderResult
```

这样 `generationRepository.completeSucceeded()`、R2 持久化、前端轮询和提交图片流程都不需要因为换平台而重写。

## 错误处理

`generation.service.ts` 已经具备 provider 失败后的业务处理：

- job 标记 failed
- 设置 `failureCode`
- 设置 `failureMessage`
- 退还积分

OpenRouter provider 需要把底层错误归一化为清晰信息：

- 缺少 API key
- 未知 model key
- OpenRouter timeout
- OpenRouter rate limit
- OpenRouter 5xx
- 模型响应结构异常
- 图片下载失败
- R2 上传失败

不要把完整 base64 图片写入日志或数据库 metadata。

## 审核策略

审核需要覆盖提示词、参考图和生成结果三类输入/输出。

现有代码已经有 `safetyService` 占位：

```txt
src/server/monica/services/safety.service.ts
```

当前它主要是轻量规则和 skipped 状态。真实 AI 接入时，应保留这个服务作为统一审核入口，后续可以逐步替换为更完整的审核 provider。

第一版审核链路：

```txt
用户 prompt
-> safetyService.checkGenerationRequest()
-> 参考图 safetyService.checkReferenceImages()
-> 调图片模型
-> safetyService.checkProviderResult()
-> 通过后上传 R2 和落库
```

Prompt 审核：

- 在扣费后、调用 provider 前执行。
- 如果 blocked，job 标记 blocked，积分退款。
- 审核内容至少包括 `prompt` 和 `negativePrompt`。
- prompt assistant 生成的 prompt 在真正用于生成图片时仍然要再次走 generation request 审核。

参考图审核：

- 上传参考图时已经通过 `referenceImageService.createReferenceImage()` 调用了 `checkReferenceImages()`。
- 生成图片前 `assertOwnedReferenceImage()` 会阻止已 failed 的参考图继续使用。
- 后续可以补充真实图片 moderation，不仅检查 MIME。

生成结果审核：

- provider 返回图片后，R2 上传前执行。
- 如果结果 blocked，job 标记 blocked，积分退款，不上传 R2 或删除临时对象。
- 第一版如果没有可用的图像审核 API，可以先依赖 provider policy，并在 `safetyResult` 里记录 `provider_policy_trusted_in_mvp`。
- 后续接入真实图片审核后，应把结果写入 `generated_images.safetyStatus` 和 `safetyResult`。

审核失败后的前端表现：

- job status 返回 `blocked`
- 展示 `failureMessage`
- 不返回可操作图片
- 不允许提交到主题或公开图库

注意：审核服务本身不应绑定 OpenRouter。它应该是独立能力，未来可接 OpenAI moderation、Cloudflare AI、Hive、Google Safety 或自建规则。

## 安全约束

必须遵守：

- 不把 `OPENROUTER_API_KEY` 暴露给浏览器。
- 不使用 `NEXT_PUBLIC_` 存任何 OpenRouter secret。
- 不使用 `NEXT_PUBLIC_` 控制服务端真实模型映射。
- 不把 provider URL 当作永久图片资产。
- 不在 metadata 或日志中保存完整 base64 图片。
- 所有 OpenRouter 调用放在 server-only 模块。
- 生成图的 R2 上传必须走服务端。

当前 `creator-client.tsx` 里的参考图上传使用了 `NEXT_PUBLIC_R2_BASE_URL`、`NEXT_PUBLIC_R2_BUCKET_NAME`、`NEXT_PUBLIC_R2_API_TOKEN`。这表示浏览器端可以读到这些 R2 配置，并直接调用 R2 explorer API 上传用户选择的参考图。生成图服务端上传也复用这三个现有变量，不再新增 `R2_BASE_URL`、`R2_BUCKET_NAME`、`R2_API_TOKEN`。

这和本次生成图上传是两件事：

- 参考图上传：目前已有实现，先不改。
- 生成图上传：必须由服务端完成，因为它发生在 OpenRouter provider 返回图片之后，且要和 job 状态、审核、积分退款、数据库落库保持一致。

后续可以单独优化参考图上传，例如改成服务端签名上传或服务端中转，减少浏览器端暴露 R2 token 的风险。但这不是本次 OpenRouter 接入的阻塞项。

## 实施顺序

1. 安装 `@openrouter/sdk`。
2. 新增 `openrouter-client.ts` server wrapper。
3. 新增环境变量解析和模型映射。
4. 扩展 `r2-storage.service.ts`，支持生成图上传。
5. 新增 `openrouter-image-generation-provider.ts`。
6. 新增 image provider factory，并让 `generation.service.ts` 通过 factory 获取 provider。
7. 明确 `safetyService` 在 prompt、参考图、生成结果三个阶段的调用点。
8. 新增 assistant service 和 `/api/monica/assistant/prompt`。
9. 更新 `creator-client.tsx` 的 assistant 行为：优先调新 API，失败时回退本地逻辑。
10. 验证 mock mode 仍然可用。
11. 验证 OpenRouter mode 能把图片写入 R2，再写入 `generated_images`。

## 测试计划

最小测试覆盖：

- model key 能映射到预期 OpenRouter slug
- 未知 model key 返回清晰错误
- 真实 OpenRouter 模式缺少 model 时返回 `model is required`
- mock 模式缺少 model 时允许使用 `mock-image-model`
- URL 图片输出能下载并上传到 R2
- base64/data URL 图片输出能上传到 R2
- provider 没有返回图片时 job failed 且积分退款
- prompt blocked 时 job blocked 且积分退款
- generated image blocked 时不上传 R2、不返回可操作图片、积分退款
- prompt assistant 返回合法 JSON 时能产出 ideas
- prompt assistant 返回非法 JSON 时能走受控错误或 fallback

手动验证：

- 文本 prompt 生成 1 张图
- 带参考图生成 1 张图
- 一次 job 生成多张图
- 确认生成图 URL 来自 R2 且能访问
- 确认 studio/explore/submission 仍然能使用 generated image record

## 实施前待确认

- 每个 UI model key 对应的准确 OpenRouter image model slug。
- 哪些图片模型支持参考图输入。
- 哪些图片模型原生支持 aspect ratio，哪些需要 prompt 里补充比例描述。
- SDK retry 是否需要显式包含 429 rate limit。
- 第一版 thumbnail 是否复用原图 URL，还是生成单独缩略图对象。
