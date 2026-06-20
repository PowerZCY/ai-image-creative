# Monica 原始设计差异分析与修改计划

## 背景

本文对照以下原始需求与原型，整理当前 Monica 网站逻辑、流程和 UI 结构中不符合设计的地方，并给出后续修改计划。

原始依据：

- `docs/ai-image-creation-flow-design.md`
- `docs/ai-image-generation-submission-review-flow.md`
- `docs/theme-submission-management-flow.md`
- `docs/index.html`

当前实现参考：

- `src/mdx/blog/monica-spec.mdx`
- `src/mdx/blog/monica-backend-design.mdx`
- `src/mdx/blog/monica-data-sequences.mdx`
- `src/mdx/blog/monica-development-plan.mdx`
- `src/mdx/blog/monica-frontend-design.mdx`
- `src/mdx/blog/monica-model-relationships.mdx`
- 当前 `src/components/monica`、`src/app/api/monica`、`src/server/monica` 实现

## 是否需要区分前后端修改

需要区分。

原因是这些问题不是单纯 UI 偏差，很多点涉及数据状态、接口语义、业务校验和后台管理流程。如果只改前端，会出现 UI 看起来符合原型，但数据写入、审核状态、重复提交规则、来源页面、主题管理字段仍然不符合原始设计的问题。

建议按四类拆分：

- 前端/UI：页面结构、组件交互、弹窗、结果布局、tabs、按钮和可见状态。
- 后端/API：接口入参、业务校验、状态流转、重复提交规则、sourcePage、title 必填等。
- 数据模型/管理字段：主题 SEO 字段、generator ideas、featured images、theme readiness、奖励记录等。
- 产品流程/验收：Home、Theme Detail、Studio、Explore、Submit a theme、Admin 的端到端流程。

## 差异清单

### 1. 创作面板缺少 Assistant 层

原始设计要求 Home、Theme Detail、Studio 的生成器都有内嵌 Assistant，包含：

- `Get ideas about today's theme`
- `Get ideas about this theme`
- `Get ideas from a theme`
- `Improve prompt`
- `Ask assistant`
- Assistant 输出区

当前 `MonicaCreator` 只有 prompt、negative prompt、模型、风格、比例、图片数量、参考图和 Generate，没有 Assistant action 或输出区。

影响：

- 用户无法从每日主题或当前主题获取创意。
- 模糊想法无法被改写成完整 prompt。
- 当前体验退化成普通 prompt 输入框，不符合原始核心产品决策。

### 2. 缺少 starterIdeas 随机展示 3 条与 More ideas 流程

原始设计要求每个主题有 6 条预置 `starterIdeas`，点击 Get ideas 时随机展示 3 条，点击 `More ideas` 时再调用 AI 生成更多。

当前主题详情页只是把 `promptTexts` 静态展示出来，没有 `Try one`、`Use`、`More ideas`、`More like this`。

影响：

- 主题灵感流程没有落地。
- 用户无法一键把方向改写成 prompt。
- 无法区分低成本预置灵感和 AI 扩展灵感。

### 3. 缺少 Improve prompt 确认流程

原始设计要求 Improve prompt 后展示：

- Original prompt
- Improved prompt
- `Replace prompt`
- `Append details`
- `Try another version`

当前没有 Improve prompt 功能。

影响：

- 用户无法确认系统改写内容。
- 也无法避免 prompt 被静默替换的问题。

### 4. 模型选项不符合原始产品文案

原始设计要求展示具体模型名称：

- GPT Image
- Flux Pro
- Ideogram
- Recraft
- Stable Diffusion

当前模型选项是 `mock-image-model` 和 `openrouter-default`。

影响：

- 用户看到的是技术/占位模型，而不是可理解的产品模型。
- 不符合“直接展示具体模型名称”的要求。

### 5. 图片比例缺少 9:16

原始设计要求比例为：

- 1:1
- 4:5
- 9:16
- 16:9

当前只有 1:1、4:5、16:9。

### 6. Negative prompt 默认常驻

原始设计建议主 prompt 始终可见，negative prompt、style notes、reference image、seed 等放入 `Prompt details` 折叠区。

当前 negative prompt 常驻在主面板。

影响：

- 新手首屏负担更重。
- 与原型中“主 prompt 简洁，详细设置折叠”的方向不一致。

### 7. 生成结果不是批次行布局

原始设计要求 Home、Theme Detail、Studio 统一使用生成批次行：

```text
[Prompt / settings / reference summary]    [Image 1] [Image 2] [Image 3] [Image 4]
```

当前结果区只展示当前 job 的图片 grid，没有左侧 prompt/settings/reference summary。

影响：

- 用户无法快速知道每批图片对应的 prompt 和设置。
- 不符合 demo 的核心结果布局。

### 8. Home 和 Theme Detail 只保留当前 job

原始设计要求：

- Home 展示当前 Home 页面会话中生成的图片。
- Theme Detail 展示用户进入该页面后生成的所有图片。
- 最新批次在顶部。

当前每次生成前会清空当前 job，旧结果被覆盖。

影响：

- 无法形成本地会话结果列表。
- 用户无法比较多个批次。

### 9. 结果图片缺少悬停操作

原始设计要求每张生成图右上角有：

- Submit
- Delete
- Favorite
- Download

当前结果图片没有这些操作。

影响：

- Home 和 Theme Detail 生成后无法直接投稿。
- 用户缺少下载、收藏、删除等基础资产操作。

### 10. Home 和 Theme Detail 结果区没有固定高度与滚动

原始设计要求 Home 和 Theme Detail 使用固定高度结果区域，超出后垂直滚动。Studio 可以使用整页历史。

当前结果区是普通 grid，没有固定高度滚动容器。

### 11. Theme Detail 使用 MonicaCreator 时 sourcePage 写错

Theme Detail 通过以下方式复用 `MonicaCreator`：

```tsx
<MonicaCreator copy={creatorCopy} themeId={dbTheme.id} />
```

`MonicaCreator` 会带上 `themeId`，但生成请求里 `sourcePage` 被硬编码为 `home`。

原始设计要求 Theme Detail 生成记录保存：

```text
theme_id = 当前主题
source_page = theme_detail
```

当前实际效果是：

```text
theme_id = 当前主题
source_page = home
```

影响：

- 后续统计、投稿默认主题、来源追踪、推荐和风控都会把 Theme Detail 的生成误判为 Home 来源。
- 如果 Studio 未来复用同一组件，也会继续写错来源。

### 12. Home 和 Theme Detail 缺少提交弹窗入口

原始设计要求：

- Home 可提供 `Submit to today's theme`。
- Theme Detail 生成后可 `Submit to this theme`。
- 提交以单张图片为单位。

当前提交弹窗只在 Studio 图片列表中存在，生成结果面板没有提交入口。

### 13. English title 没有强制必填

原始提交弹窗要求 `English title *` 必填，用作公开图片标题和 alt 文本。

当前前端只校验 `themeId`，后端还会用 creation note 或 `Untitled image` 兜底。

影响：

- 公开图片可能缺少合格英文标题。
- SEO 和 alt 文本质量不可控。

### 14. 重复提交规则不符合用户体验要求

原始设计要求一张图片已经提交到任何主题后，不允许再次提交，并提示用户选择另一张图片。

当前后端发现已有 submission 时直接返回 existing，前端不会明确提示重复提交。

影响：

- 用户可能误以为重复提交成功。
- 审核数据语义不清晰。

### 15. Studio 缺少创作面板

原始设计要求 Studio 是个人创作工作台，包含：

- Create 生成器
- Get ideas from a theme
- 个人生成历史
- 投稿状态

当前 Studio 只有图片列表和提交弹窗，没有生成器。

影响：

- Studio 退化成历史图库。
- 不符合“用户可以在 Studio 生成图片、继续编辑、提交作品、查看提交状态”的定位。

### 16. Studio 缺少 Get ideas from a theme 流程

原始设计要求用户点击 `Get ideas from a theme` 后：

1. 打开主题选择器。
2. 选择 Today's theme 或历史主题。
3. 展示该主题 3 条 starter ideas。
4. 用户点击 Use 后改写成 prompt。
5. 生成结果记录所选 theme_id，但不自动提交。

当前 Studio 只是加载 themes 给提交弹窗使用，没有主题灵感选择器。

### 17. Studio 顶层 tabs 不符合设计

原始设计要求顶层只有：

- All
- Submitted

Submitted 下再有二级 tabs：

- Pending review
- Approved
- Rejected

当前顶层包含：

- All
- Generated
- Submitted
- Approved
- Rejected

影响：

- 用户侧状态复杂化。
- `Generated` 不应该作为顶层 tab，因为 All 已覆盖生成历史。

### 18. Studio 暴露 Locked / Editable

原始用户侧状态保持简单：

- Generated
- Submitted
- Approved
- Rejected

当前 Studio 显示 `Locked` / `Editable`，并提供 lock state 筛选。

影响：

- 把内部资产锁定状态暴露给普通用户。
- 与原始“用户侧状态简单”的原则不符。

### 19. Explore 主题卡不应有 Create from this theme

原始主题管理文档要求 Explore 主题卡只展示主题预览和 `View theme`，不提供直接创作入口。用户应先进入主题详情页理解主题。

当前 Explore 主题卡有 `Create from theme`，并跳回首页。

影响：

- 绕过 Theme Detail 的主题解释和上下文创作面板。
- 跳回 Home 后也没有携带主题上下文。

### 20. Explore 主题卡不应展示 tags

原始要求 Explore 主题卡不展示 tags，只展示：

- 3 张精选图
- Theme
- Brief
- 统计信息
- View theme

当前主题卡展示 tags。

### 21. Explore 图片详情缺少关键动作

原始设计要求图片详情包含：

- Use as inspiration
- Use prompt
- Copy prompt
- Like
- Save

当前弹窗只有 Copy prompt，而且复制的是 creation note 或 title，不是实际 prompt。

影响：

- 浏览图片无法转化为再次创作。
- `Copy prompt` 语义不准确。

### 22. Theme Detail Gallery 仍是占位

原始要求 Theme Detail 展示主题作品 Gallery，并支持 Featured、Most liked、Newest。

当前只是展示占位文案。

### 23. 用户主题提交状态暴露 Published

原始用户侧状态只有：

- Under review
- Accepted
- Not selected

当前 Submit a theme 页面 filter 暴露了 `Published`。

影响：

- 用户侧看到过多内部运营状态。
- 与“简单审核状态”不一致。

### 24. 用户主题提交记录展示信息不完整

原始要求每条记录展示：

- Theme name
- Theme details
- Why are you submitting this theme
- Submitted date
- Status
- Notes

当前只展示 title、details 和 reviewFlow，没有明确展示 submitted date，也没有直接展示 submit reason。

### 25. 存在额外的用户侧 Theme workspace

原始设计是独立 `Submit a theme` 页面，用户提交后不能编辑，只能查看审核状态。

当前存在 `/themes/my` Theme workspace，支持 draft、createDraft、submitDraft，并暴露 Draft、Selected、Published、Duplicate 等状态。

影响：

- 主题提交流程比原始设计复杂。
- 用户可能误以为可以长期维护主题草稿或进入主题管理流程。

### 26. `/admin/themes` 重定向到用户侧 `/themes/my`

原始设计要求 Admin / Themes 是管理员主题管理模块。

当前 `/admin/themes` redirect 到 `/themes/my`。

影响：

- 管理员主题管理路由归属错误。
- 用户侧和管理员侧职责混淆。

### 27. Admin 用户主题审核缺少 Edit and accept

原始要求 User submissions 操作包含：

- Accept as theme
- Edit and accept
- Reject

当前只有 Accept、Reject，接受后再 Schedule theme。

影响：

- 管理员无法在接受时直接编辑成正式主题。
- 审核和正式主题创建动作被拆得不符合原始流程。

### 28. Admin 主题管理出现 Published 状态路径

原始 MVP 主题状态只需要：

- Draft
- Scheduled

是否已经发布由 publish date 和当前日期判断，不需要 `Published` 状态。

当前 Admin 有 `Publish` 操作，并支持 `scheduled | published`。

### 29. Manage themes 缺少 Required Fields 摘要

原始要求列表显示字段完成度摘要，例如：

- Content ok
- Missing SEO
- Missing ideas
- Featured 2/3

当前只显示 source、publish date、featured 数量。

影响：

- 管理员无法快速判断主题是否 ready。
- 不符合“补齐字段、发布日期、精选图片后才能前台展示”的管理流程。

### 30. Manage themes 字段不完整

原始 Edit fields 要支持：

- Theme
- Brief
- Theme note
- SEO title
- Meta description
- Tags
- SEO keywords
- Generator ideas
- Image SEO notes

当前只有：

- Title
- Publish date
- Brief
- Theme note
- Cover image URL
- Generator ideas
- Tags

### 31. Admin 缺少 New theme

原始要求管理员可以直接创建主题。

当前 Manage themes 只能编辑已有主题，没有 `New theme` 入口。

### 32. Admin 缺少 Submit images 到主题

原始要求 Manage themes 行级操作包含 `Submit images`，管理员从站内已生成图片中选择图片并提交到当前主题。

当前没有该操作。

### 33. Featured images 选择方式不符合设计

原始要求从该主题自己的 image pool 中选择精选图，弹窗展示缩略图、作者、图片标题、说明和是否精选。

当前是手动输入 `Featured PublicImage numeric IDs, one per line`。

影响：

- 管理员必须知道内部 ID。
- 无法保证所选图片来自当前主题图片池。

### 34. 图片审核 Reject 缺少备注输入

原始要求拒绝时应包含清晰审核备注。

当前 Image submissions 只有 Approve / Reject 按钮，没有备注输入。

影响：

- 被拒绝用户无法看到有效原因。
- 不符合审核反馈要求。

### 35. Home 仍接大量营销型区块

原始方向强调 Home 是免费 AI 图片生成器，首屏直接可创作，工具优先。

当前 Home 在生成器和今日主题后继续接 Usage、Features、Tips、FAQ、SeoContent、CTA。

影响：

- 这不一定是功能错误，但会削弱工具型首页体验。
- 后续需要判断 SEO 内容和工具体验的权重。

### 36. Home 缺少 Studio 历史提示和 Open Studio 操作

原始要求 Home 结果区域只展示当前会话，同时提示完整历史在 Studio，并提供 `Open Studio`。

当前 Home 结果区没有这类提示或入口。

## 数据表修改方案

本节记录已经确认的表字段设计。目标是支持：

- 正确记录生成来源页面。
- 持久化 Assistant 行为日志。
- 支持图片 prompt 复用和图片 inspiration 行为追踪。
- 支持管理员直接把站内生成图发布到某个主题。
- 支持主题精选图按顺序管理。

### 总体结论

需要新增或调整：

- `generation_jobs` 增加 `source_page`。
- 新增 `assistant_interactions`。
- `themes.generator_ideas` 从字符串数组调整为 JSON，用于存储预置 idea + prompt。
- `public_images` 增加 `source_type` 和 `created_by`。
- 新增 `theme_featured_images`。

不需要新增：

- 不新增 `theme_images`。因为当前业务规则是一张公开图片只能属于一个主题，`public_images.theme_id` 已经可以表达主题图片池。
- 不新增复杂 session 状态表。Assistant 行为通过 `session_id` 串联即可，session 只定义开始，不维护结束状态。

### generation_jobs 增加 source_page

用途：

- 记录一次生成任务来自哪个页面或入口。
- 修复 Theme Detail 复用 `MonicaCreator` 时 `sourcePage` 被硬编码为 `home` 的问题。
- 支持后续统计、默认投稿主题、推荐和风控。

建议字段：

```prisma
sourcePage String? @map("source_page") @db.VarChar(50)
```

字段说明：

| 字段 | 类型 | 是否必填 | 注释 |
| --- | --- | --- | --- |
| `sourcePage` | `String?` | 否 | 生成任务来源页面。建议值：`home`、`theme_detail`、`studio`、`explore_image_detail`、`theme_gallery`。老数据可为空。 |

### themes 调整 generator_ideas

用途：

- 支持每个主题预置 6 条 starter ideas。
- 每条 starter idea 同时包含短想法和完整 prompt。
- `Get ideas` 从该字段随机取 3 条展示，用户点击 Use 时直接使用对应 prompt。
- 避免再做“idea 到 prompt”的二次改写，降低出错概率。

当前问题：

- 当前 `Theme.generatorIdeas` 是 `String[]`，只能存字符串。
- 原始流程现在已明确：Get ideas 返回的不是单纯短 idea，而是 `idea + prompt`。
- 因此 `generator_ideas` 需要升级为 JSON 结构。

建议字段：

```prisma
generatorIdeas Json? @default("[]") @map("generator_ideas")
```

字段说明：

| 字段 | 类型 | 是否必填 | 注释 |
| --- | --- | --- | --- |
| `generatorIdeas` | `Json?` | 否 | 主题预置灵感数组。每个元素只包含展示给用户的 `idea` 和点击 Use 后填入生成器的完整 `prompt`。 |

推荐 JSON 结构：

```json
[
  {
    "idea": "An empty dinner table after an argument",
    "prompt": "An empty dinner table in a dim apartment after an argument, untouched plates, two chairs slightly turned away from each other, heavy stillness in the air, muted colors, cinematic lighting, visual metaphor for silence"
  }
]
```

子字段说明：

| 字段 | 类型 | 是否必填 | 注释 |
| --- | --- | --- | --- |
| `idea` | `string` | 是 | 展示给用户的短创意方向，应该简短、可读、有画面感。 |
| `prompt` | `string` | 是 | 点击 Use 后直接填入 prompt 输入框的完整 prompt。不再调用 AI 做二次改写。 |

说明：

- `generator_ideas` 中不存 `id`、`tags`、`styleHint`、`avoidNotes` 等扩展字段，保持管理员录入简单。
- Assistant API 返回给前端时不需要为 idea 生成 ID。
- 用户点击 Use 或 More like this 时，前端记录并提交 `selectedIdeaIndex` 和完整 `selectedIdea` 对象即可。

迁移建议：

- 旧数据如果是 `String[]`，迁移时可以转换为：

```json
[
  {
    "idea": "旧字符串内容",
    "prompt": "旧字符串内容"
  }
]
```

- 后续由管理员在 Manage themes 的 Edit fields 中补齐更好的 `idea` 和 `prompt`。
- `Theme.avoidCliches` 可以继续保留为 `String[]`，用于主题级避免俗套词。
- `Theme.seoTitle`、`seoMetaDescription`、`seoKeywords`、`imageSeoNotes` 已存在，不需要新增字段，只需要补齐管理 UI。

### assistant_interactions

用途：

- 持久化所有 Assistant 相关行为。
- 记录 `Get ideas`、`More ideas`、`Improve prompt`、`Ask assistant`、`More like this`、`Use idea prompt`、图片 `Use prompt`、图片 `Use as inspiration`。
- 通过 `sessionId` 串联同一次大入口行为下的多步操作。

核心设计原则：

- 每次用户触发一个大入口，创建新的 `sessionId`。
- 大入口包括：
  - 点击 `Get ideas`。
  - 点击 `Improve prompt`。
  - 点击 `Ask assistant`。
  - 点击图片的 `Use as inspiration`。
  - 点击图片的 `Use image prompt`。
- 同一个大入口里的后续动作继续使用同一个 `sessionId`。
- 不维护复杂 session 结束状态。后续分析时按同一个 `sessionId` 下最后一条 interaction 的时间判断是否结束。
- `parentInteractionId` 可选，用于表达某一步基于哪一次上游结果继续，比如 `more_like_this` 基于哪次返回的 idea。

建议 Prisma model：

```prisma
model AssistantInteraction {
  id                  BigInt    @id @default(autoincrement())
  interactionId       String    @unique @default(dbgenerated("gen_random_uuid()")) @map("interaction_id") @db.Uuid
  sessionId           String    @default(dbgenerated("gen_random_uuid()")) @map("session_id") @db.Uuid

  userId              String?   @map("user_id") @db.Uuid
  rootActionType      String    @map("root_action_type") @db.VarChar(50)
  actionType          String    @map("action_type") @db.VarChar(50)
  parentInteractionId String?   @map("parent_interaction_id") @db.Uuid

  sourcePage          String?   @map("source_page") @db.VarChar(50)
  themeId             BigInt?   @map("theme_id")
  imageId             String?   @map("image_id") @db.Uuid
  publicImageId       String?   @map("public_image_id") @db.Uuid
  generationJobId     String?   @map("generation_job_id") @db.Uuid

  userInput           String?   @map("user_input") @db.Text
  inputPrompt         String?   @map("input_prompt") @db.Text
  outputPrompt        String?   @map("output_prompt") @db.Text

  ideas               Json?
  selectedIdeaIndex   Int?      @map("selected_idea_index")
  selectedIdea        Json?     @map("selected_idea")

  requestPayload      Json?     @map("request_payload")
  responsePayload     Json?     @map("response_payload")

  provider            String?   @db.VarChar(100)
  model               String?   @db.VarChar(100)
  status              String    @default("succeeded") @db.VarChar(50)
  errorMessage        String?   @map("error_message") @db.Text

  usedForGeneration   Boolean   @default(false) @map("used_for_generation")

  createdAt           DateTime? @default(now()) @map("created_at") @db.Timestamptz(6)

  @@index([sessionId, createdAt], map: "idx_assistant_interactions_session_created_at")
  @@index([userId, createdAt], map: "idx_assistant_interactions_user_created_at")
  @@index([themeId, createdAt], map: "idx_assistant_interactions_theme_created_at")
  @@index([rootActionType, actionType, createdAt], map: "idx_assistant_interactions_action_created_at")
  @@map("assistant_interactions")
  @@schema("monica_ai")
}
```

字段说明：

| 字段 | 类型 | 是否必填 | 注释 |
| --- | --- | --- | --- |
| `id` | `BigInt` | 是 | 数据库自增主键，仅内部使用。 |
| `interactionId` | `String UUID` | 是 | 单次 Assistant 行为的业务 ID，可安全返回给前端。用于后续 `parentInteractionId` 关联。 |
| `sessionId` | `String UUID` | 是 | 一次大入口行为的会话 ID。点击 `Get ideas`、`Improve prompt`、`Ask assistant`、图片 `Use as inspiration`、图片 `Use image prompt` 时创建新的 `sessionId`。后续 More ideas、More like this、Use idea prompt 等继续沿用。 |
| `userId` | `String UUID?` | 否 | 用户 ID。登录用户填写；匿名用户可为空或后续按匿名体系补充。 |
| `rootActionType` | `String` | 是 | 大入口类型。建议值：`get_ideas`、`improve_prompt`、`ask_assistant`、`image_inspiration`。 |
| `actionType` | `String` | 是 | 具体动作类型。建议值：`get_preset_ideas`、`more_ideas`、`improve_prompt`、`ask_assistant`、`more_like_this`、`use_idea_prompt`、`use_image_prompt`、`use_as_inspiration`。 |
| `parentInteractionId` | `String UUID?` | 否 | 父级 interaction。用于记录某次动作基于哪一次上游结果，例如 `more_like_this` 基于哪次返回的 idea。MVP 可选传。 |
| `sourcePage` | `String?` | 否 | 行为发生的页面。建议值：`home`、`theme_detail`、`studio`、`explore_image_detail`、`theme_gallery`。 |
| `themeId` | `BigInt?` | 否 | 相关主题 ID。主题详情页、从主题获取灵感、带主题上下文的 Ask assistant 时填写。 |
| `imageId` | `String UUID?` | 否 | 相关私有生成图片 ID。来自 Studio 私有图片的 `Use image prompt` 或 `Use as inspiration` 时填写；公共图片如能拿到底层生成图也可以同时填写。 |
| `publicImageId` | `String UUID?` | 否 | 相关公开图片 ID。来自 Explore、Theme Gallery、公开图片详情的图片 prompt 复用或 inspiration 时填写。 |
| `generationJobId` | `String UUID?` | 否 | 如果该次 Assistant 结果最终被用于生成图片，记录对应生成任务 ID。 |
| `userInput` | `String?` | 否 | 用户在 Assistant 中输入的自然语言，例如 Ask assistant 的提问。 |
| `inputPrompt` | `String?` | 否 | 输入 prompt。主要用于 `improve_prompt`，也可用于基于当前 prompt 的 More ideas。 |
| `outputPrompt` | `String?` | 否 | 输出或最终使用的 prompt。`improve_prompt` 记录改写结果；`use_idea_prompt` 和 `use_image_prompt` 记录填入生成器的 prompt。 |
| `ideas` | `Json?` | 否 | Assistant 返回的方向数组。每个 item 只需要包含 `idea` 和完整 `prompt`。Get ideas 直接返回 idea + prompt，点击 Use 时直接使用 prompt，不再做 idea 到 prompt 的二次改写。 |
| `selectedIdeaIndex` | `Int?` | 否 | 用户选中的 idea 在上一次返回数组中的位置。用于 `use_idea_prompt`、`more_like_this` 等基于某条 idea 的动作。 |
| `selectedIdea` | `Json?` | 否 | 用户选中的完整 idea 对象，通常包含 `idea` 和 `prompt`。相比只存 index，更方便后续审计和排查。 |
| `requestPayload` | `Json?` | 否 | 请求上下文快照，例如主题信息、已展示 ideas、avoid cliches、当前 prompt、图片上下文等。用于排查和分析。 |
| `responsePayload` | `Json?` | 否 | Provider 或规则引擎返回的原始结构化结果。可与 `ideas`、`outputPrompt` 部分重复，但保留原始响应便于排查。 |
| `provider` | `String?` | 否 | 内容来源。建议值：`preset`、`openai`、`openrouter`、`mock`、`system`。预置 ideas 使用 `preset`。 |
| `model` | `String?` | 否 | 调用的文本模型名称。预置 ideas 可为空。 |
| `status` | `String` | 是 | 本次 interaction 状态。建议值：`succeeded`、`failed`、`blocked`。 |
| `errorMessage` | `String?` | 否 | 失败或拦截原因。仅 `failed` 或 `blocked` 时填写。 |
| `usedForGeneration` | `Boolean` | 是 | 标记本次输出是否最终被用于生成图片。通常在用户点击 Generate 后回填或新增关联记录。 |
| `createdAt` | `DateTime?` | 否 | 创建时间。 |

`rootActionType` 取值说明：

| 值 | 含义 |
| --- | --- |
| `get_ideas` | 用户点击生成器内的 Get ideas 入口。包括首页今日主题、主题详情当前主题、Studio 选主题获取灵感。 |
| `improve_prompt` | 用户点击 Improve prompt。 |
| `ask_assistant` | 用户打开短对话式 Assistant。 |
| `image_inspiration` | 用户从图片出发继续创作，包括图片 `Use image prompt` 和 `Use as inspiration`。图片来源可以是公开图片，也可以是 Studio 私有图片。 |

`actionType` 取值说明：

| 值 | 含义 |
| --- | --- |
| `get_preset_ideas` | 从主题预置 ideas 中返回 3 条，每条包含 idea 和完整 prompt。 |
| `more_ideas` | 用户点击 More ideas 后调用 AI 或 mock 生成更多 ideas，每条包含 idea 和完整 prompt。 |
| `improve_prompt` | 改写用户已有 prompt，并返回可确认的新 prompt。 |
| `ask_assistant` | 用户发起或继续 Ask assistant，Assistant 返回方向或 prompt。 |
| `more_like_this` | 基于某条 idea 或 prompt 生成相似方向。可出现在 `get_ideas`、`ask_assistant` 或 `image_inspiration` session 下。 |
| `use_idea_prompt` | 用户使用 Assistant 返回的某条 idea 对应的完整 prompt。用于生成器内 Get ideas 或 Ask assistant 的结果。 |
| `use_image_prompt` | 用户直接复用某张图片的 prompt。图片可以来自公开图片或自己的私有图片。 |
| `use_as_inspiration` | 用户以某张图片为灵感，让 Assistant 基于图片或其 prompt 生成新方向。 |

典型记录示例：

```text
Get ideas:
sessionId = S1
rootActionType = get_ideas
actionType = get_preset_ideas
ideas = [{ idea, prompt }, ...]

用户使用某条 idea:
sessionId = S1
rootActionType = get_ideas
actionType = use_idea_prompt
selectedIdeaIndex = 0
selectedIdea = { idea, prompt }
outputPrompt = selectedIdea.prompt

Ask assistant 后 More like this:
sessionId = S2
rootActionType = ask_assistant
actionType = more_like_this
parentInteractionId = 上一次 ask_assistant 的 interactionId
selectedIdeaIndex = 1
selectedIdea = { idea, prompt }
ideas = [{ idea, prompt }, ...]

从 Studio 私有图片复用 prompt:
sessionId = S3
rootActionType = image_inspiration
actionType = use_image_prompt
imageId = GeneratedImage.imageId
outputPrompt = 图片对应 prompt

从公开图片 Use as inspiration:
sessionId = S4
rootActionType = image_inspiration
actionType = use_as_inspiration
publicImageId = PublicImage.publicImageId
ideas = [{ idea, prompt }, ...]
```

### public_images 增加来源字段

用途：

- 支持管理员直接把站内生成图片发布到某个主题，不走普通用户投稿审核流程。
- 区分公开图片来自用户投稿审核通过，还是管理员直接添加。
- 当前业务规则是一张公开图片只能属于一个主题，因此直接使用 `public_images.theme_id` 表示图片所属主题，不新增 `theme_images`。

建议字段：

```prisma
sourceType String  @default("user_submission") @map("source_type") @db.VarChar(50)
createdBy  String? @map("created_by") @db.Uuid
```

字段说明：

| 字段 | 类型 | 是否必填 | 注释 |
| --- | --- | --- | --- |
| `sourceType` | `String` | 是 | 公开图片来源。建议值：`user_submission`、`admin_direct`、`admin_generated`。用户投稿审核通过创建 PublicImage 时为 `user_submission`；管理员直接选择站内生成图加入主题时为 `admin_direct`；管理员生成后加入主题时可用 `admin_generated`。 |
| `createdBy` | `String UUID?` | 否 | 创建该公开图片记录的操作者。用户投稿审核通过时可填审核管理员 ID 或为空；管理员直接添加时填管理员用户 ID。 |

相关流程：

```text
普通用户投稿:
GeneratedImage -> ImageSubmission(status=submitted) -> Admin approve -> PublicImage(themeId, sourceType=user_submission)

管理员直接加图:
GeneratedImage -> PublicImage(themeId, sourceType=admin_direct, createdBy=adminUserId)
```

说明：

- 保留 `publicImageId`。它是公开资源 ID，用于公开详情、点赞、收藏、分享和外部引用。
- `imageId` 仍然指向底层私有生成资产。
- 公开资源和私有生成资产生命周期不同，因此不建议用 `imageId` 替代 `publicImageId`。

### theme_featured_images

用途：

- 管理每个主题的精选图片。
- 当前只有一种精选用途，不需要 `slotType`。
- 精选图片必须从当前主题的 `public_images` 中选择。
- 通过 `position` 控制 3 张精选图的展示顺序。

建议 Prisma model：

```prisma
model ThemeFeaturedImage {
  id            BigInt    @id @default(autoincrement())
  themeId       BigInt    @map("theme_id")
  publicImageId BigInt    @map("public_image_id")
  position      Int       @default(0)
  createdBy     String?   @map("created_by") @db.Uuid
  createdAt     DateTime? @default(now()) @map("created_at") @db.Timestamptz(6)
  deleted       Int       @default(0)

  @@unique([themeId, position], map: "theme_featured_images_theme_position_key")
  @@unique([themeId, publicImageId], map: "theme_featured_images_theme_public_key")
  @@index([themeId, position], map: "idx_theme_featured_images_theme_position")
  @@map("theme_featured_images")
  @@schema("monica_ai")
}
```

字段说明：

| 字段 | 类型 | 是否必填 | 注释 |
| --- | --- | --- | --- |
| `id` | `BigInt` | 是 | 数据库自增主键。 |
| `themeId` | `BigInt` | 是 | 主题 ID。表示这条精选图属于哪个主题。 |
| `publicImageId` | `BigInt` | 是 | `PublicImage.id`。注意这里使用数据库数字主键，便于约束和 join；对外展示仍使用 `PublicImage.publicImageId`。 |
| `position` | `Int` | 是 | 精选图展示顺序。建议使用 1、2、3。Explore 主题卡按该字段排序。 |
| `createdBy` | `String UUID?` | 否 | 设置精选图的管理员用户 ID。 |
| `createdAt` | `DateTime?` | 否 | 设置精选图的时间。 |
| `deleted` | `Int` | 是 | 软删除标记。0 表示有效，1 表示删除。 |

约束说明：

- `@@unique([themeId, position])`：同一个主题下同一个位置只能有一张精选图。
- `@@unique([themeId, publicImageId])`：同一张公开图不能在同一个主题下重复精选。
- 业务层还需要校验：`PublicImage.themeId` 必须等于 `ThemeFeaturedImage.themeId`，确保精选图来自当前主题图片池。

查询规则：

```text
候选图片 = public_images where theme_id = 当前主题 and deleted = 0
精选图片 = theme_featured_images where theme_id = 当前主题 and deleted = 0 order by position asc
```

替代关系：

- 新逻辑不再依赖 `Theme.featuredImageIds` 数组。
- Phase 0 迁移时将旧 `Theme.featuredImageIds` 数据写入 `theme_featured_images`，随后删除 `themes.featured_image_ids` 字段。

## 修改计划

### Phase 0：数据表 SQL 与 Prisma schema 先行

目标：先补齐后续功能依赖的数据结构，避免 Phase 1 之后出现 UI 已完成但数据无法正确落库的问题。

执行约束：

- 当前项目还未上线，`database` 和 Prisma 都是测试阶段表结构。
- 不按线上历史数据迁移流程处理。
- 所有需要更改的表和字段，都要新建 SQL 文件放到 `database/` 下。
- `database/` 下的 SQL 是后续拿到 Supabase 执行的准入文件。
- SQL 文件执行成功后，再同步更新 `prisma/schema.prisma`。
- 如果选择重建测试库，可以直接更新建表 SQL；如果选择在现有测试库上变更，则新增 alter SQL 文件。无论哪种方式，都要保证 `database/` 下有明确可执行的 SQL。

建议新增 SQL 文件：

```text
database/update-monica-ai-schema-for-original-flow.sql
```

数据库：

- `generation_jobs` 增加 `source_page` 字段。
- `themes.generator_ideas` 从 `String[]` 调整为 `Json`。
- 新增 `assistant_interactions` 表。
- `public_images` 增加 `source_type`、`created_by` 字段。
- 新增 `theme_featured_images` 表。

数据迁移：

测试数据处理：

- 当前未上线，不要求兼容正式历史数据。
- 如果现有测试库里已有 `themes.generator_ideas` 字符串数组测试数据，可以转换为 JSON 数组：

```json
[
  {
    "idea": "旧字符串内容",
    "prompt": "旧字符串内容"
  }
]
```

- 旧 `generation_jobs.source_page` 允许为空，不强行回填。
- 旧 `public_images.source_type` 默认设为 `user_submission`。
- 如果测试数据中的旧 `Theme.featuredImageIds` 中已有数据，可以迁移到 `theme_featured_images`：
  - 数组顺序映射为 `position = index + 1`。
  - `publicImageId` 使用对应 `PublicImage.id`。
  - 迁移完成后删除旧 `themes.featured_image_ids` 字段，后续只使用 `theme_featured_images`。

后端/API：

- 新建 `database/update-monica-ai-schema-for-original-flow.sql`，包含所有 Supabase 需要执行的表结构变更。
- 更新 Prisma schema。
- 更新 Theme repository 中 `generatorIdeas` 的读写类型。
- 更新 Admin theme edit API，支持编辑 JSON 结构的 `generatorIdeas`。
- 更新 PublicImage 创建逻辑，写入 `sourceType` 和 `createdBy`。
- 增加 Theme featured images 的 repository/service 基础方法。
- 增加 Assistant interaction 的 repository/service 基础方法。

验收：

- 新 SQL 文件能在 Supabase 测试库执行成功。
- Prisma schema 与 Supabase 表结构一致。
- 测试主题 generator ideas 能以 `{ idea, prompt }` 结构读写。
- Admin 读取主题时能拿到结构化 generator ideas。
- 创建公开图片时能写入来源字段。
- 可以为主题写入 3 条 featured image 记录，并按 position 读取。

### Phase 1：先修正核心生成与结果体验

目标：让 Home 和 Theme Detail 的生成主流程符合原始设计。

前端：

- 将 `MonicaCreator` 改造成可配置的通用 Creation Panel。
- 增加 `sourcePage` prop，支持 `home`、`theme_detail`、`studio`。
- 增加页面模式文案：
  - Home：自由生成。
  - Theme Detail：Create for this theme。
  - Studio：Create。
- 增加 Assistant action 区：
  - Get ideas。
  - Improve prompt。
  - Ask assistant。
- 增加 Assistant 输出区：
  - Try one。
  - Use。
  - More ideas。
  - Close。
- 增加批次行结果布局。
- Home / Theme Detail 维护本页面会话批次数组，而不是单个 job。
- 给结果图片增加 Submit、Delete、Favorite、Download 操作入口。
- Home 结果区增加 Open Studio 提示。

后端/API：

- 生成接口接收并保存正确 `sourcePage`。
- 增加 Assistant API 或临时 mock API：
  - get ideas。
  - improve prompt。
  - ask assistant。
- 主题 ideas 接口先返回预置 starter ideas，More ideas 再走 AI 或 mock。

验收：

- Home 生成不绑定主题。
- Theme Detail 生成带 themeId 和 `sourcePage=theme_detail`。
- 连续生成多个批次时，最新批次在顶部。
- 点击 Get ideas 后不会自动生成，只填充或建议 prompt。

### Phase 2：补齐提交弹窗与投稿规则

目标：统一 Home、Theme Detail、Studio 的单图提交体验。

前端：

- 抽出公共 Submit Image Dialog。
- 弹窗字段固定为：
  - Image preview。
  - English title *。
  - Theme *。
  - Creation note optional。
- Home 默认主题为 today's theme，但弹窗中可确认或更换。
- Theme Detail 默认当前主题。
- Studio 有主题上下文时默认所选主题，否则必须选择主题。
- 已提交图片显示明确不可重复提交提示。

后端/API：

- `title` 改为必填，空值返回 400。
- 重复提交返回明确业务错误，不直接静默返回 existing。
- 保持 prompt 作为 metadata 保存，不在提交弹窗展示。
- 审核拒绝时支持 review note。

验收：

- 空 English title 不能提交。
- 同一张图片再次提交时显示“已提交，请选择另一张图片”。
- 提交后 Studio 能看到 Submitted / Pending review。

### Phase 3：重构 Studio

目标：让 Studio 从历史图库变成个人创作工作台。

前端：

- Studio 顶部增加 Create 生成器。
- Studio 生成器默认不绑定主题。
- 增加 `Get ideas from a theme` 主题选择器。
- 选择主题后展示当前创作上下文，但不自动提交。
- 顶层 tabs 改为：
  - All
  - Submitted
- Submitted 下增加二级 tabs：
  - Pending review
  - Approved
  - Rejected
- 移除普通用户可见的 Locked / Editable 和 lock filter。

后端/API：

- Studio 搜索接口支持 Submitted 二级状态筛选。
- 保持内部 locked 字段，但不作为普通用户 UI 状态暴露。

验收：

- Studio 可直接生成图片。
- Studio 选择主题获取灵感后生成，图片带 themeId，但仍需用户手动提交。
- Approved / Rejected 不再是顶层 tab。

### Phase 4：修正 Explore 与 Theme Detail Gallery

目标：让浏览体验符合“先进详情，再创作”的设计。

前端：

- Explore 主题卡移除 tags。
- Explore 主题卡移除 `Create from this theme`。
- 主题卡保留 `View theme`。
- Explore 图片详情补齐：
  - Use as inspiration。
  - Use prompt。
  - Copy prompt。
  - Like。
  - Save。
- Theme Detail Gallery 接入真实公开图片数据。
- Gallery 支持 Featured、Most liked、Newest。

后端/API：

- Public image detail 返回 prompt metadata 或可用 prompt 字段。
- Explore image search 返回 theme、author、like/save 状态。
- Theme gallery API 支持排序。

验收：

- Explore theme card 不直接创建图片。
- 从图片详情点击 Use as inspiration 能回到创作流程。
- Theme Detail 展示已审核通过的作品。

### Phase 5：修正用户主题提交流程

目标：让 Submit a theme 保持文本提案入口，不混入管理和草稿工作台。

前端：

- Submit a theme 页面只保留：
  - Theme name。
  - Theme details。
  - Why are you submitting this theme? optional。
  - My theme ideas。
- 用户侧状态只展示：
  - Under review。
  - Accepted。
  - Not selected。
- 每条记录展示：
  - 原始 Theme name。
  - 原始 Theme details。
  - Why。
  - Submitted date。
  - Status。
  - Notes。
- 移除或隐藏 `/themes/my` Theme workspace，或改为重定向到 `/submit-theme`。

后端/API：

- 用户侧查询接口映射内部状态到简单状态。
- 保留内部 reviewFlow，但前端只展示合适的 Notes。
- 首次提交 +20 credits 和接受 +300 credits 的记录需要稳定写入 Notes/reviewFlow。

验收：

- 普通用户不看到 Draft、Selected、Published、Duplicate。
- 提交后不能进入复杂草稿编辑流程。

### Phase 6：重构 Admin Themes 管理

目标：让 Admin 的主题审核、正式主题管理、主题图片和精选图管理符合原始流程。

前端：

- `/admin/themes` 不再重定向到用户侧页面。
- Admin 下保留 Themes 模块：
  - User submissions。
  - Manage themes。
- User submissions 操作改为：
  - Accept as theme。
  - Edit and accept。
  - Reject。
- Manage themes 增加：
  - New theme。
  - Edit fields。
  - Set publish date。
  - Submit images。
  - Featured images。
  - Preview。
- Manage themes 列表显示 Required Fields 摘要：
  - Content ok / Missing content。
  - SEO ok / Missing SEO。
  - Ideas ok / Missing ideas。
  - Featured 3/3。
- Edit fields 补齐：
  - Theme。
  - Brief。
  - Theme note。
  - SEO title。
  - Meta description。
  - Tags。
  - SEO keywords。
  - Generator ideas。
  - Image SEO notes。
- Featured images 改为从当前主题 image pool 中选择，不再手动输入 ID。
- Image submissions Reject 增加备注输入。

后端/API：

- 新增管理员直接创建主题接口。
- 支持 Edit and accept：接受用户提交时可编辑正式主题字段。
- 主题状态收敛为 Draft / Scheduled，发布展示由 publishDate 判断。
- 增加 theme readiness 计算。
- 增加管理员 Submit images to theme 接口。
- Featured images 接口校验所选 public images 属于当前 theme image pool。
- 图片审核 Reject 保存 review note。

验收：

- 管理员可从用户提交创建正式主题。
- 管理员可直接创建主题。
- 主题只有字段完整、publish date 设置、featured images 满 3 张后才 ready。
- 精选图只能从该主题已有图片池选择。

### Phase 7：首页工具体验整理

目标：减少 Home 的营销感，强化免费 AI 图片生成器入口。

前端：

- 保留首屏可用生成器。
- 今日主题作为旁边或下方灵感入口，不强制绑定生成器。
- 根据 SEO 需求评估 Usage、Features、Tips、FAQ、SeoContent、CTA 的位置和折叠方式。

验收：

- 用户进入 Home 不需要理解主题就可以自由生成。
- 今日主题只作为灵感入口。
- Home 结果区有本地结果和 Open Studio 提示。

## 推荐执行顺序

优先级建议：

1. Phase 0：数据表与迁移先行。
2. Phase 1：Creation Panel、Assistant、批次结果、sourcePage。
3. Phase 2：提交弹窗与投稿规则。
4. Phase 3：Studio 工作台。
5. Phase 4：Explore 与 Theme Detail Gallery。
6. Phase 5：用户主题提交。
7. Phase 6：Admin Themes 管理。
8. Phase 7：首页体验整理。

理由：

- 数据表是后续 Assistant 日志、sourcePage、结构化 generator ideas、管理员直接加图和精选图管理的前置依赖，必须先做。
- 创作和生成是主链路，应该最先修。
- 投稿依赖生成结果，所以第二步修。
- Studio 依赖生成和投稿状态，所以第三步修。
- Explore 和 Gallery 是浏览转创作链路，放在核心闭环后。
- 主题提交和 Admin 管理涉及更多后台字段和状态，可分阶段推进。

## 验收总清单

- Home 默认自由生成，不强制绑定今日主题。
- 数据表已完成迁移，`generation_jobs.source_page`、`assistant_interactions`、结构化 `themes.generator_ideas`、`public_images.source_type/created_by`、`theme_featured_images` 可用。
- Theme Detail 使用当前主题作为隐含上下文，但不硬塞主题标题进 prompt。
- Studio 默认自由生成，只有用户选择主题后才带主题上下文。
- Assistant 是生成器内嵌层，不是独立聊天页。
- Get ideas 默认展示 3 条主题 starter ideas。
- More ideas 才调用 AI 或 AI mock。
- Improve prompt 有用户确认步骤。
- 生成结果按批次行展示。
- Home 和 Theme Detail 展示本页面会话内多个批次。
- Studio 展示完整历史。
- 提交以单张图片为单位。
- 提交弹窗不展示 prompt。
- English title 必填。
- 重复提交明确禁止并提示。
- 用户侧投稿状态只有 Generated、Submitted、Approved、Rejected。
- Studio 顶层 tabs 只有 All、Submitted。
- Submitted 下有 Pending review、Approved、Rejected。
- Explore 主题卡不展示 tags，不提供直接创建按钮。
- Theme Detail Gallery 接真实公开作品。
- Submit a theme 只提交文本主题想法。
- 用户侧主题提案状态只有 Under review、Accepted、Not selected。
- Admin 主题模块包含 User submissions 和 Manage themes。
- Admin 可直接创建主题。
- Manage themes 有字段完整度摘要。
- Featured images 只能从当前主题图片池选择。

## 当前遗留项

截至 Phase 0 - Phase 7 的 MVP 闭环实现后，核心页面结构、数据模型、投稿规则、Studio、Explore、Theme Detail Gallery、Submit theme、Admin themes 和首页工具体验已经完成一轮改造。以下项目属于后续增强或完整链路补齐，不阻塞当前 MVP 类型检查通过，但会影响生产级分析、运营和权限完整性。

### 1. Assistant interaction 完整日志回写

当前状态：

- `assistant_interactions` 表已在 SQL 和 Prisma schema 中新增。
- `assistant-interaction.repository.ts` 已提供底层写入能力：
  - `create(input)`：创建一条 Assistant 行为日志。
  - `markUsedForGeneration(interactionId, generationJobId)`：标记某条 Assistant 输出最终用于生成。
- 前端 `MonicaCreator` 的 Assistant 行为目前主要是本地 mock / 本地规则逻辑。

遗留工作：

- 新增 Assistant API，例如：
  - `POST /api/monica/assistant/actions`
  - 或按动作拆分为 `get-ideas`、`improve-prompt`、`ask`、`use-idea`。
- API 内部调用 `assistantInteractionRepository.create(...)` 写入日志。
- 前端 Assistant 按钮改为调用 API，而不是只在本地生成结果。
- 需要记录的动作包括：
  - `get_preset_ideas`
  - `more_ideas`
  - `improve_prompt`
  - `ask_assistant`
  - `use_idea_prompt`
  - `use_image_prompt`
  - `use_as_inspiration`
  - `more_like_this`
- 用户点击 `Generate` 时，如果 prompt 来自某条 Assistant interaction，需要回传 `interactionId` 并调用 `markUsedForGeneration(...)`。

验收标准：

- 每次 Assistant 入口点击都会在 `assistant_interactions` 中产生记录。
- 同一次 Assistant 入口下的后续动作复用同一个 `sessionId`。
- 使用某条 idea 或 improved prompt 生成图片后，该 interaction 被标记为 `usedForGeneration = true`，并关联 `generationJobId`。

### 2. Assistant AI 接入

当前状态：

- `Get ideas`、`More ideas`、`Improve prompt`、`Ask assistant` 已有可用前端交互。
- 结果主要来自主题预置 ideas、本地 fallback ideas 和本地 prompt 拼接规则。

遗留工作：

- 接入真实文本 AI provider，用于：
  - `more_ideas`
  - `improve_prompt`
  - `ask_assistant`
  - `more_like_this`
- 保留 preset ideas 的低成本路径：首次 `Get ideas` 优先从主题 `generatorIdeas` 随机取 3 条，不必调用 AI。
- AI 返回结构应统一为 `{ idea, prompt }`，避免前端再次做非结构化解析。
- API 需要保存 `requestPayload`、`responsePayload`、`provider`、`model`、`status`、`errorMessage`。

验收标准：

- `Get ideas` 使用主题预置 ideas。
- `More ideas` 和 `Improve prompt` 可通过真实 AI 返回结构化结果。
- AI 调用失败时前端有明确错误提示，并写入 failed interaction 日志。

### 3. 图片 inspiration 链路日志

当前状态：

- Explore 图片详情已补齐 `Use as inspiration`、`Use prompt`、`Copy prompt`、Like、Save。
- `Use prompt` / `Use as inspiration` 当前主要通过 localStorage 把 prompt 带回首页生成器。

遗留工作：

- 从公开图片详情点击 `Use prompt` 时写入 `assistant_interactions`：
  - `rootActionType = image_inspiration`
  - `actionType = use_image_prompt`
  - `publicImageId`
  - `outputPrompt`
- 从公开图片详情点击 `Use as inspiration` 时写入：
  - `rootActionType = image_inspiration`
  - `actionType = use_as_inspiration`
  - `publicImageId`
  - AI 生成的 ideas 或 prompt。
- 如果后续基于该 inspiration 生成图片，需要关联 `generationJobId`。

验收标准：

- Explore / Theme Gallery 中的图片复用行为可以在 `assistant_interactions` 表中追踪。
- 后续能分析哪些公开图片带来了二次创作。

### 4. Admin 权限与角色校验

当前状态：

- Admin API 复用现有 `requireAuthWithUser()`。
- 当前实现重点是补齐管理功能和流程，没有新增独立 admin role 校验。

遗留工作：

- 明确项目现有角色/权限模型。
- 为 `/api/monica/admin/*` 和 `/admin/themes` 增加管理员角色校验。
- 非管理员访问时返回 403 或跳转到合适页面。

验收标准：

- 普通登录用户不能访问 Admin themes 页面。
- 普通登录用户不能调用 Admin API。

### 5. 人工端到端验收

当前状态：

- 已通过 `pnpm exec tsc --noEmit`。
- 尚未完成浏览器端逐流程人工验收。

遗留工作：

- 启动本地开发服务后逐项验证：
  - Home 自由生成、批次结果、Open Studio、Submit image。
  - Theme Detail 带 `sourcePage=theme_detail` 生成并提交到当前主题。
  - Studio 创建、选择主题获取灵感、Submitted 二级状态。
  - Explore 图片详情的 prompt 复用和 inspiration。
  - Submit a theme 用户侧状态映射。
  - Admin User submissions、Edit and accept、Manage themes、Featured images、Submit images、Image reject note。
- 根据浏览器实际效果修正布局、空状态、错误提示和交互细节。

验收标准：

- 关键用户路径在浏览器中可以完整走通。
- 后台数据库记录与页面行为一致。
- 没有明显移动端文字溢出、按钮重叠或结果区布局问题。
