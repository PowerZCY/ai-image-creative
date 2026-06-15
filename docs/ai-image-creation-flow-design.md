# AI 图片创作流程设计

## 目标

图片创作体验要解决的核心问题是：

> 用户想生成 AI 图片，但经常不知道画什么，也不知道如何把模糊想法变成有效 prompt。

所以网站不应该只是一个 prompt 输入框，而应该结合：

- 每日创意主题。
- 轻量创作助手。
- prompt 生成和优化。
- 图片生成。
- inspiration-based creation。
- 图片编辑和提交。

核心体验：

> Free image generation -> get ideas when needed -> prompt generation -> image generation -> variation/editing -> optionally submit to a theme.

## 核心产品决策

创作助手和图片生成器应该放在同一个创作面板里。

不要拆成两个页面或两个流程。

用户心智应该是：

> 我在这里创作图片；如果需要灵感，助手帮我。

不应该是：

> 我必须先去和助手聊天，再到另一个地方生成图片。

## 模型分工

大多数图像模型主要负责根据 prompt 出图，不适合长时间聊创意。

产品应组合不同模型能力：

- Chat model：
  - 理解用户意图。
  - 提供创意方向。
  - 必要时做非常短的追问。
  - 把模糊想法改写成结构化 prompt。
  - 优化 prompt。
  - 生成 prompt variations。

- Image generation model：
  - 根据最终 prompt 和设置生成图片。

- Image editing model：
  - variations。
  - 局部编辑。
  - 去除物体。
  - 扩图。
  - 高清修复。
  - 使用 reference image。

## Unified Creation Panel

主创作区是一个统一面板，包含：

- prompt / idea 输入框。
- assistant actions。
- generation settings。
- `Generate` 按钮。
- 图片结果。
- 生成后操作。
- 可选的主题上下文。

助手是生成器里的内嵌创意层，不是独立聊天产品。

## 首页生成器

首页生成器不应该默认绑定今日题目。

原因：

- 首页需要承接 `AI Image Generator` 这类大词用户。
- 很多用户进入首页只是想生成任意图片。
- 如果默认绑定今日题目，会让通用生成需求感觉受限。
- 今日题目是差异化灵感入口，不应该成为首页生成器的强约束。

首页生成器默认应该是自由创作：

```text
AI Image Generator

Prompt
[ Describe anything you want to create...                  ]

Assistant
[ Get ideas about today's theme ] [ Improve prompt ]

Model
[ GPT Image ] [ Flux Pro ] [ Ideogram ] [ Recraft ] [ Stable Diffusion ]

Style
[ Auto ] [ Cinematic ] [ Realistic ] [ Anime ] [ Illustration ]

Aspect ratio
[ 1:1 ] [ 4:5 ] [ 9:16 ] [ 16:9 ]

Images
[ 1 ] [ 2 ] [ 4 ]

[ Generate ]
```

用户可以：

- 直接输入 prompt 并生成。
- 输入模糊想法后点 `Improve prompt`。
- 没灵感时点 `Get ideas about today's theme`，使用今日题目作为灵感来源。
- 直接选择具体模型名称。
- 调整 style、aspect ratio、image count。

首页可以在生成器旁边或下方展示今日题目卡片：

```text
Today's theme
Show Silence

[Get ideas about today's theme] [View today's theme]
```

但不要让首页生成器的默认 prompt、生成结果或提交流程强制绑定今日题目。

## 详情页生成器

每日题目详情页的生成器应该带有当前题目的上下文。

这里的目标是鼓励用户参与这个主题，所以按钮可以更明确：

```text
Create for this theme

Theme: The Architecture of Loneliness

[ Describe your interpretation...                         ]

Assistant
[ Get ideas about this theme ] [ Improve prompt ]

Model
[ GPT Image ] [ Flux Pro ] [ Ideogram ] [ Recraft ] [ Stable Diffusion ]

Style
[ Auto ] [ Cinematic ] [ Realistic ] [ Anime ] [ Illustration ]

Aspect ratio
[ 1:1 ] [ 4:5 ] [ 9:16 ] [ 16:9 ]

Images
[ 1 ] [ 2 ] [ 4 ]

[ Generate ]
```

但即使在详情页，也不要把题目原文硬塞进用户 prompt。

正确的绑定方式：

- `Get ideas about this theme` 基于当前题目生成方向。
- `Improve prompt` 会把用户想法与当前题目上下文结合。
- 生成结果记录当前 `theme_id` 和 `source_page = theme_detail`。
- 用户点击 `Submit to this theme` 后，才进入公开提交审核。
- 提交时检查 theme relevance。

错误做法：

```text
The theme is "Show Silence". Show Silence, show silence, silence...
```

更好的做法是把主题作为隐含约束：

```text
Theme:
Show Silence

User idea:
an empty dinner table after an argument

Generated prompt:
An empty dinner table in a dim apartment after an argument, untouched plates, two chairs slightly turned away from each other, heavy stillness in the air, muted colors, cinematic lighting, visual metaphor for silence
```

## 首页与详情页的差异

| 场景 | 默认生成模式 | 灵感按钮 | 是否默认提交到主题 |
| --- | --- | --- | --- |
| 首页 | 自由生成 | `Get ideas about today's theme` | 否 |
| 题目详情页 | 当前题目上下文生成 | `Get ideas about this theme` | 生成后可提交 |
| My Studio | 个人工作台自由生成 | `Get ideas from a theme` | 否 |
| Explore 图片详情 | 基于图片获得灵感 | `Use as inspiration` | 可回到原主题提交 |

首页强调通用生成能力，今日题目作为灵感入口。

详情页强调围绕当前题目的创作和提交。

## My Studio 工作台生成器

`My Studio` 不应该只是历史图库，也不需要强调“复用历史”。

它应该是登录用户的个人创作工作台：

> 用户可以在这里生成图片、查看自己的图片、继续编辑、提交作品、查看提交状态。

`My Studio` 里的生成器默认不绑定任何主题。

不要在生成器顶部放常驻的 Theme context selector。这样会让用户误以为每次生成前都必须先选主题。

更好的顺序是：

> 用户先点击 `Get ideas from a theme`，再选择一个主题。

推荐结构：

```text
My Studio

Create

Prompt
[ Describe anything you want to create... ]

Assistant
[ Improve prompt ] [ Ask assistant ] [ Get ideas from a theme ]

Model
[ GPT Image ] [ Flux Pro ] [ Ideogram ] [ Recraft ] [ Stable Diffusion ]

Style
[ Auto ] [ Cinematic ] [ Realistic ] [ Anime ] [ Illustration ]

Aspect ratio
[ 1:1 ] [ 4:5 ] [ 9:16 ] [ 16:9 ]

Images
[ 1 ] [ 2 ] [ 4 ]

[ Generate ]
```

`Get ideas from a theme` 流程：

1. 用户点击 `Get ideas from a theme`。
2. 系统打开主题选择器。
3. 用户选择 `Today's theme` 或任意历史主题。
4. Assistant 从该主题预置的 6 条 `starterIdeas` 中随机展示 3 条。
5. 用户点击某个方向的 `Use`。
6. 系统把方向改写成完整 prompt，并填入输入框。
7. 生成结果记录所选 `theme_id`，但不会自动提交。
8. 用户生成后仍需要点击 `Submit to this theme`。

主题灵感使用“预置 + AI 生成”的混合策略：

- 每个主题默认预置 6 条 `starterIdeas`，用于低成本、快速、稳定地给用户第一屏灵感。
- 用户点击 `Get ideas` 时，从 6 条预置 ideas 中随机展示 3 条。
- 如果用户反复点击 `Get ideas`，可以继续随机 3 条，但尽量避免和当前屏完全一样。
- 用户点击 `More ideas` 时，直接调用 AI 生成更多方向，不再继续分页展示剩余预置 ideas。
- AI 生成时带上当前主题、6 条预置 ideas、已展示过的 ideas，以及合并后的 avoid-cliche 列表，避免重复和俗套。
- 不需要告诉用户哪些 idea 是预置、哪些是 AI 生成；界面统一展示为 `Try one`。

主题创意配置可以保持简单：

```ts
type ThemeCreativeConfig = {
  starterIdeas: string[];
  themeAvoidCliches?: string[];
};

type GlobalCreativeConfig = {
  globalAvoidCliches: string[];
};
```

AI 生成更多 ideas 时合并：

```text
avoidCliches = globalAvoidCliches + themeAvoidCliches
```

`themeAvoidCliches` 不是每个主题都必须填，只在某个主题特别容易俗套或跑偏时填写。

主题选择器：

```text
Get ideas from a theme

[ Search themes... ]

Today's theme
- Show Silence

Recent themes
- The Architecture of Loneliness
- A Scene You Cannot Explain Having Seen Before

[Use theme]
```

用户没点 `Get ideas from a theme` 时：

- 生成结果没有 theme context。
- 不显示 `Submit to this theme`。
- 可以显示 `Submit to today's theme` 作为首页一致的默认投稿入口，或只在 My Studio 中让用户手动选择投稿。

用户通过 `Get ideas from a theme` 选择主题后：

- 显示当前主题名。
- Assistant 围绕该主题提供方向。
- 生成图片可以提交到该主题。

`My Studio` 下方是用户图片库和提交状态管理：

```text
Tabs:
[All] [Submitted]
```

每张图展示：

```text
[Image]

Model: Flux Pro
Generated: Jun 9, 2026
Theme: Show Silence / No theme
Status: Generated / Submitted / Approved / Rejected

[Edit] [Submit]
```

`Submitted` tab 内部再按 `Submitted` / `Approved` / `Rejected` 分组展示，而不是把审核结果做成顶层 tab。

更具体的 UI 是在 `Submitted` tab 下放二级切换：

```text
[Pending review] [Approved] [Rejected]
```

其中 `Pending review` 对应内部状态 `Submitted`。

`My Studio` 的重点不是营销和引导，而是个人创作管理。

命名上，`Studio` 比 `Create` 更适合作为导航页面名，因为这个页面不只是生成，还包括历史、提交状态和审核反馈。`Create` 更适合用作 Studio 页面里的生成器区块标题。

## 生成器里的创作助手如何体现

创作助手不要做成独立聊天页，而是体现在生成器里的 Assistant 区域。

它在 UI 上有三种状态：

1. 默认收起状态：只显示 1-2 个动作按钮。
2. 建议展开状态：点击后在 prompt 下方展开建议列表。
3. 细聊状态：用户需要时打开短聊天，但仍然以生成 prompt 为目标。

### 默认状态

首页：

```text
Prompt
[ Describe anything you want to create... ]

Assistant
[ Get ideas about today's theme ] [ Improve prompt ]
```

详情页：

```text
Prompt
[ Describe your interpretation... ]

Assistant
[ Get ideas about this theme ] [ Improve prompt ]
```

默认状态不展示大聊天框，不占用太多空间。

### 建议展开状态

用户点击 `Get ideas about today's theme` 或 `Get ideas about this theme` 后，Assistant 区域在 prompt 下方展开：

```text
Assistant
Try one:

1. A quiet subway platform where rain rises from the tracks
   [Use] [More like this]

2. A rooftop dinner under upward rain
   [Use] [More like this]

3. A child holding an umbrella as puddles fly into the clouds
   [Use] [More like this]

[More ideas] [Close]
```

点击 `Use`：

- 把该方向改写成完整 prompt。
- 填入 prompt 输入框。
- 保留用户可编辑。
- 不直接自动生成，仍由用户点击 `Generate`。

点击 `More like this`：

- 围绕当前方向再生成 3 个相近但不同的方向。

首页点击 `Get ideas about today's theme` 后，生成器仍然保持自由生成模式，只是 prompt 灵感来自今日题目。

详情页点击 `Get ideas about this theme` 后，生成结果会带上当前 `theme_id`，方便用户后续 `Submit to this theme`。

### Improve Prompt 状态

`Improve prompt` 具体做的是 prompt refinement，不是换题材，也不是聊天。

它改善：

- 画面主体。
- 场景细节。
- 构图。
- 光线。
- 色彩。
- 情绪。
- 与所选 style 的匹配。
- 与当前 theme context 的关系。

用户点击 `Improve prompt` 后，Assistant 不应该只静默替换 prompt，应该给用户一个可确认的改写结果：

```text
Assistant improved your prompt

Original:
a lonely room

Improved:
A quiet empty room with a single chair near a window, soft morning light, muted colors, subtle dust in the air, a feeling of waiting and absence, cinematic composition

[Replace prompt] [Append details] [Try another version]
```

这样用户能理解系统做了什么，也避免 prompt 被突然改掉。

保存规则：

- `Improve prompt` 的 input/output 保存为私有系统日志。
- 这个日志不是用户可见的产品功能。
- MVP 不做完整 prompt version history。
- MVP 暂不区分运营/管理员权限。
- 生成图片和提交作品使用的是最终 `Prompt used`。

推荐日志字段：

```text
prompt_version_id
generation_session_id
user_id
action_type = improve_prompt
input_prompt
output_prompt
theme_context_id
model
style
created_at
used_for_generation
```

原则：

> 中间过程是系统日志；最终 prompt 才是用户可见内容。

### 模型选择

模型选择直接展示具体模型名称，不使用 `Fast / Quality / Artistic` 这类抽象档位。

示例：

```text
Model
[ GPT Image ] [ Flux Pro ] [ Ideogram ] [ Recraft ] [ Stable Diffusion ]
```

规则：

- 默认选择一个推荐模型，例如 `GPT Image` 或当前成本/质量最合适的模型。
- 只展示已经实际接入的模型。
- 模型过多时，用横向按钮 + `More` 下拉。
- 每个模型可以有 tooltip，简短说明适合什么。

示例 tooltip：

- `GPT Image`: good for instruction following and general image generation.
- `Flux Pro`: good for high-quality realistic and artistic images.
- `Ideogram`: good for text rendering and poster-like images.
- `Recraft`: good for design-style images and vector-like visuals.
- `Stable Diffusion`: flexible open model family with many style options.

### 创作助手交互原则

好的助手行为：

- 给 3-6 个具体图像方向。
- 回复简短。
- 用按钮推动用户继续。
- 自动填充或更新 prompt。
- 建议 style、mood、composition、subject。
- 产出可直接放入 prompt 输入框的内容。

不好的行为：

- 问太多问题。
- 长篇解释 AI 概念。
- 每步都要求确认。
- 把用户困在聊天里。

### Ask Assistant

`Ask assistant` 第一版需要做，但它不能变成通用聊天。

它的定位是短对话式 prompt 构思器：

> 帮用户把说不清楚的想法变成可生成图片的 prompt。

适用场景：

- 用户有感觉，但没有画面。
- 用户想调整当前 prompt 的方向。
- 用户想围绕主题找一个更具体的解释。
- 用户想让结果更温暖、更怪、更安静、更不直白。
- 用户不想只点 preset，而是想描述自己的偏好。

入口放在 Assistant 区域里：

```text
Assistant
[ Get ideas about today's theme ] [ Improve prompt ] [ Ask assistant ]
```

详情页：

```text
Assistant
[ Get ideas about this theme ] [ Improve prompt ] [ Ask assistant ]
```

点击后在 prompt 下方展开一个短聊天框：

```text
Ask assistant

[ Tell the assistant what you want to create or change... ]

[Send]
```

示例：

```text
User:
I want something lonely and futuristic.

Assistant:
Choose a direction:

1. A lonely commuter under upward rain in a neon station
2. A rooftop city scene where rain rises into broken clouds
3. A child watching puddles empty into the sky

[Use 1] [Use 2] [Use 3] [More ideas]
```

助手输出必须回到生成器：

- 给 3-5 个方向。
- 每个方向都有 `Use`。
- 可以给 `More like this`。
- 可以给 `Rewrite as prompt`。
- 不自动生成图片，仍由用户点 `Generate`。

`Ask assistant` 和其他按钮的区别：

| 功能 | 用户输入 | 输出 |
| --- | --- | --- |
| `Get ideas about today's theme` | 不需要 | 基于今日主题的方向 |
| `Get ideas about this theme` | 不需要 | 基于当前主题的方向 |
| `Improve prompt` | 需要已有 prompt | 改写成更强 prompt |
| `Ask assistant` | 用户描述需求 | 方向、追问或可用 prompt |

如果用户需求足够明确，助手直接给方向或 prompt。只有在完全不清楚时，才允许问一个简短问题。

## Prompt 展示

Prompt 要可编辑，但不要吓到新手。

推荐：

- 主 prompt 输入框始终可见。
- 详细 prompt 控制折叠。

折叠项：

```text
Prompt details
```

展开字段：

- Positive prompt。
- Negative prompt。
- Style notes。
- Reference image。
- Seed。
- Aspect ratio。
- Model if relevant。

## 生成设置

MVP 设置要简单。

推荐控件：

- Model：
  - `GPT Image`
  - `Flux Pro`
  - `Ideogram`
  - `Recraft`
  - `Stable Diffusion`

- Style：
  - `Auto`
  - `Cinematic`
  - `Realistic`
  - `Anime`
  - `Illustration`

- Aspect ratio：
  - `1:1`
  - `4:5`
  - `9:16`
  - `16:9`

- Images：
  - `1`
  - `2`
  - `4`

高级参数放到折叠区。

## 生成后操作

图片生成后不要只给下载，也不要把一次生成拆成几个互不相关的单图卡片。

生成结果应该按 generation batch 展示。每次点击 `Generate` 生成一个结果行，最新生成排在最上方。

统一结果行：

```text
[Prompt / settings / reference summary]    [Image 1] [Image 2] [Image 3] [Image 4]
```

左侧展示：

- prompt 摘要。
- model。
- style。
- aspect ratio。
- created time。
- reference image 缩略图，如果有。

如果没有 reference image，不显示任何 reference 信息。主题信息作为提交和元数据使用，不在生成结果左侧显式展示。

右侧展示：

- 最多 4 张图片。
- 鼠标悬浮每张图片时，右上角出现操作区。
- 操作区包含 `Submit` / `Delete` / `Favorite` / `Download`。

首页和主题详情页的结果区使用同一套结果行样式，但只显示当前页面会话生成的结果。用户进入主题详情页后，每一次生成都追加到该页结果区，最新生成排在最上方，不只显示最近一次。结果区设定固定高度，超过后内部上下滚动，并提示用户完整历史可在 Studio 查看。

提示需要带直接跳转入口：

```text
These results are saved in Studio.
[Open Studio]
```

首页生成的图片会立即展示在首页结果区，同时也进入 Studio 历史。主题详情页生成的图片会立即展示在详情页结果区，同时也进入 Studio 历史。

其他可选操作：

- `Make variations`
- `Improve prompt`
- `Change style`
- `Change mood`
- `Edit image`
- `Upscale`
- `Use as reference`
- `Submit to this theme`
- `Submit to today's theme`
- `Create another interpretation`

产品要鼓励迭代和提交。

## 提交流程

用户可以把生成图片提交到某个主题下。

- 首页生成：默认自由生成，结果可以提交到今日主题或用户选择的主题。
- 详情页生成：默认关联当前主题，提交弹窗默认勾选当前主题。
- Studio 生成：默认自由生成；如果用户通过 `Get ideas from a theme` 选择了主题，本次创作上下文会记录该主题，提交弹窗默认勾选该主题。

提交入口应该放在每张生成图片上，而不是只放一个全局提交按钮。

原因：

- 一次可能生成 2-4 张图，用户只想提交其中一张。
- 每张图的质量和主题相关性不同。
- 每张图后续可能有不同编辑和 variation。

点击提交后打开轻量提交弹窗。

提交弹窗：

```text
Submit image

[Image preview]

English title *
[ A lonely figure under a red sun ]

Theme *
[ Theme selector ]

Creation note optional:
[ Share the idea, mood, or interpretation behind this image... ]

[Submit]
```

提交弹窗不展示 prompt。Prompt、negative prompt、model、style、aspect ratio、reference image 等生成元数据由系统随图片自动保存。

MVP 规则：

- `English title` 必填，用作公开图片标题和 alt 信息。
- `Theme` 必选。
- `Creation note` 可选，用来表达创作思路。
- 如果图片已经提交到某个主题下，不管是否通过，都提示用户换一张图片。

提交规则：

- 提交到每日主题的作品默认公开 prompt。
- MVP 不提供 `Show prompt` / `Hide prompt` 选择。
- `Creation note` 是公开的创作思路，用来说明用户如何理解这个主题。
- `Creation note` 可选，不要求用户填写。
- 审核通过后，图片、英文标题、creation note 和必要的图片元数据用于主题页展示。
- Ask assistant 对话和 Improve prompt 中间过程不公开。
- 中间过程作为系统日志保存，用于排障、审核、分析和复现。

提交时保存：

- Image。
- Theme ID。
- Prompt。
- Negative prompt if available。
- Style。
- Aspect ratio。
- Model。
- Images count。
- Seed if available。
- Reference image if used。
- Creation note if provided。
- Inspiration source if applicable。
- Tags。

这些数据用于：

- 主题 gallery。
- SEO 页面。
- inspiration-based creation。
- prompt discovery。
- 用户历史。
- 后续推荐系统。

## Inspiration-Based Creation

网站应该允许用户从别人提交的作品获得灵感继续创作，但 MVP 不要做成很重的 remix culture。

`Use as inspiration` 仍然有必要保留。

原因：

- `Copy prompt` 是复制。
- `Use prompt` 是把原 prompt 带入生成器。
- `Use as inspiration` 是让助手基于这张图生成差异化方向。

它解决的是“我喜欢这张图，但我不想照抄”的场景。

这个功能不是必经流程，也不应该比 `View prompt` 更重，但它能强化网站的核心价值：用户从同一主题下的作品获得启发，再创作出不同版本。

推荐前台命名：

- `Use as inspiration`
- `Use prompt`
- `Create similar`

第一版不要把 `Remix` 作为主按钮。目标是鼓励启发和变化，不是鼓励复制。

### 为什么需要

真实用户路径通常是：

1. 看到每日主题。
2. 自己没想法。
3. 看别人提交的图。
4. 被某张图启发。
5. 改 style、subject、mood 或 composition。
6. 生成并提交自己的版本。

这符合网站核心价值：same theme, many interpretations。

### MVP 流程

1. 用户点击主题 gallery 里的图片。
2. 用户查看图片详情和公开 prompt。
3. 用户点击 `Use as inspiration`。
4. 助手基于这张图生成几个不同方向。
5. 用户选择一个方向。
6. 创作面板打开，带入：
   - 同一个 theme。
   - 修改后的 prompt。
   - 可选相似设置。
   - 可选 source image metadata。
7. 用户生成新图。
8. 用户提交到同一主题。

示例：

```text
Inspired by this image:

1. Change the main subject
2. Change the mood
3. Change the composition
4. Change the visual style
5. Make a more surreal version

[Use 1] [Use 2] [Use 3] [Use 4] [Use 5]
```

### Use Prompt vs Create Similar

`Use prompt`：

- 把原公开 prompt 带入创作面板。
- 用户自己手动改。
- 适合高级用户。

`Create similar`：

- 由助手基于原 prompt 生成一个不同版本。
- 至少改变一个主要维度：
  - Subject。
  - Mood。
  - Composition。
  - Style。
  - Setting。
- 适合想借灵感但不想复制的用户。

### 数据保存

保存：

- `inspired_by_image_id`
- `source_prompt_id`
- `inspiration_type`
- `source_theme_id`

前台可轻量显示：

```text
Inspired by another creation from this theme
```

MVP 不做公开 remix graph，但数据先留。

### MVP 不做

暂缓：

- Public remix graph。
- Remix ranking。
- Multi-level remix chains。
- Similarity enforcement。
- Image-reference remix。
- Inpainting-based remix。
- 强社交归因 UI。

## Explore 模块

Explore 页面需要两个视图：

- `Themes`
- `Images`

默认是 `Themes`，因为网站核心资产是每日主题，不是普通图片瀑布流。

`Images` 用来快速看视觉灵感，但每张图必须明确显示属于哪个 theme。

## 首页近 3 天主题

首页展示今日主题和前 2 天主题。

目的：

- 快速解释每日挑战机制。
- 展示同一主题下不同人的理解。
- 引导用户创作或探索。

每个主题块包含：

- Date。
- Theme title。
- One-line theme brief。
- 3-6 张 selected images。
- Creation count。
- Creator count if available。
- `Create your version`。
- `View theme`。

排序：

1. Today：最大，重点引导创作。
2. Yesterday：展示优秀作品，重点引导浏览和 inspiration。
3. Two days ago：历史入口。

首页不要展示太多历史天数，历史内容放 Explore。

## Explore: Themes View

`Themes` 是 daily theme archive + inspiration library。

每个 theme card 包含：

- Date。
- Theme title。
- One-line brief。
- 4 张 selected images。
- Total submissions。
- Featured count。
- Popular tags。
- `View theme`。
- `Create from this theme`。

示例：

```text
Jun 08, 2026

A City Where the Rain Falls Upward

348 creations · 24 featured

[large image] [small image]
[small image] [small image]

Tags: cinematic, surreal, neon, lonely

[View theme] [Create from this theme]
```

MVP 控件：

- 默认展示全部 themes，不选中任何提交状态筛选。
- 在 `Themes` tab 下展示两个可取消筛选按钮：
  - `Submitted`：只看当前用户已经提交过图片的 themes。
  - `Not submitted yet`：只看当前用户还没有提交过图片的 themes。
- 再次点击已选中的提交状态筛选，取消筛选并回到全部 themes。
- 提交状态筛选只属于 `Themes` view；切到 `Images` view 时隐藏，不作用于图片流。

后续可加：

- `Most submitted`
- `Most inspired`
- `Featured`
- `This week`
- `This month`
- theme type filters：`Sci-fi`、`Fantasy`、`Portrait`、`Nature`、`Surreal`、`Product`
- mood filters：`Lonely`、`Dreamlike`、`Dark`、`Hopeful`、`Playful`

## Explore: Images View

`Images` 是 inspiration feed。

每张 image card 包含：

- Image。
- Theme title。
- Author。
- Style tags。
- Like count。
- Save count。
- `Use as inspiration`。
- `View prompt` if public。

筛选：

- Latest。
- Featured。
- Most liked。
- Most saved。
- Most used as inspiration。
- Style。
- Theme。

不要隐藏 theme context。差异化仍然是 same theme, different interpretations。

## 每日题目详情页

详情页是 SEO、创作、社区浏览的核心。

服务三类用户：

1. 想参与当前主题创作。
2. 想看别人作品找灵感。
3. 从搜索进来找 AI art prompt ideas。

推荐结构：

1. Theme header。
2. Creation panel。
3. Prompt ideas。
4. Featured images。
5. All submissions。
6. Related themes。

### Theme Header

包含：

- Date。
- Theme title。
- Short creative brief。
- Representative image 或 collage。
- Creation count。
- Creator count。
- Featured count。
- 主按钮：`Create your version`。
- 次按钮：`Explore submissions`。

示例：

```text
A City Where the Rain Falls Upward

Imagine a place where gravity forgot the rain. Create a scene that captures the strange beauty, loneliness, or chaos of a city under upward rain.

348 creations · 72 creators · 24 featured

[Create your version] [Explore submissions]
```

### Prompt Ideas

Prompt ideas 对 SEO 和新手启动都重要。

展示 3-6 条 starter prompts：

```text
Prompt ideas for this theme

1. A lonely commuter standing in a neon station where rain rises from the tracks...
2. A rooftop dinner under upward rain...
3. A child watching puddles float back into the sky...
```

每条 prompt 可点击 `Use`，送入创作面板。

### Featured Images

展示当前主题下最好且最多样的作品。

Tabs：

- `Featured`
- `Most liked`
- `Most used as inspiration`
- `Newest`

每张图展示：

- Image。
- Author。
- Style tags。
- Like count。
- Save count。
- Inspiration count if available。
- `Use as inspiration`。
- `View prompt`。
- `Copy prompt`。

图片卡片不要直接展示完整 prompt，避免卡片过重。

推荐卡片展示：

```text
[Image]

@author
Style tags: cinematic, surreal

[Like] [Save] [Use as inspiration]
[View prompt]
```

可以显示一行截断 prompt 预览：

```text
Prompt: A quiet empty room with a single chair near a window...
```

完整 prompt 放到 image detail modal。

### Image Detail Modal

点击图片后展示：

- Large image。
- Author。
- Theme。
- Prompt。
- Negative prompt if available。
- Style。
- Aspect ratio。
- Model if available。
- Seed if available。
- Creation note if provided。
- Inspired-by source if applicable。
- `Use as inspiration`。
- `Use prompt`。
- `Copy prompt`。
- `Like`。
- `Save`。

Prompt 展示规则：

- 提交到每日主题的作品默认公开 prompt。
- MVP 不提供隐藏 prompt 的选项。
- 公开 prompt 是网站学习、inspiration 和 SEO 的一部分。
- 如果未来支持隐藏 prompt，再加入 `Prompt hidden by creator` 状态。
- `Use prompt` 和 `Copy prompt` 默认可用。

Creation note 展示规则：

- `Creation note` 是公开的创作思路。
- 它用于解释用户如何理解主题，而不是私密备注。
- 字段可选。
- 展示位置在图片详情页，卡片上最多显示一行摘要。

复制功能：

```text
Prompt
A quiet empty room with a single chair near a window...

[Copy prompt] [Use prompt] [Use as inspiration]
```

按钮区别：

- `Copy prompt`：复制原 prompt 到剪贴板。
- `Use prompt`：把 prompt 带入生成器，用户可以编辑。
- `Use as inspiration`：不直接复制，助手生成不同方向。

默认推荐顺序：

1. `Use as inspiration`
2. `Use prompt`
3. `Copy prompt`

原因：网站应该鼓励启发式创作，而不是直接复制。

## 精选图片逻辑

Featured images 不能只按点赞选。

只按 likes 会偏向早提交、社交强、同质化漂亮图。

推荐分数：

```text
Featured Score =
theme relevance score
+ visual quality score
+ engagement score
+ diversity score
+ freshness score
- duplication penalty
- safety risk penalty
```

### Theme Relevance

图片必须明显回应当天主题。

信号：

- 包含主题核心元素。
- 表达主题情绪或概念。
- prompt 与主题相关。
- 不是 generic 或 off-topic。

### Visual Quality

信号：

- 主体清晰。
- 构图好。
- 光影好。
- 色彩好。
- 缩略图可读性强。
- 没有明显生成缺陷。

### Creative Diversity

Featured 要避免全是同一种解释。

保证多样性：

- Style。
- Composition。
- Subject。
- Mood。
- Color palette。
- Visual genre。

### Engagement

可用信号：

- Likes。
- Saves。
- Views。
- Detail opens。
- Shares。
- `Use as inspiration` count。

其中 `Use as inspiration` 很重要，因为它说明这张图能激发别人创作。

### Freshness

给新作品一定曝光机会，尤其是当天主题仍活跃时。

### Similarity Penalty

如果图片和已有 featured image 太像，降低入选概率。

这样允许用户借鉴，但精选区仍保持多样。

### Featured 来源

后台保留来源：

- `System Featured`
- `Editor's Pick`
- `Community Favorite`

前台可统一显示 `Featured`。

建议分布：

- 30% 高互动作品。
- 30% 系统判断高质量作品。
- 30% 多样性补充作品。
- 10% 新作品探索位。

## Like、Save、Comment、Reaction

MVP 应该做 likes。

推荐 MVP 行为：

- `Like`
- `Save`
- `Use as inspiration`
- `Use prompt`

不建议 MVP 做开放评论。

评论成本高：

- spam。
- abuse。
- 低质量互动。
- 举报。
- 通知。
- 删除和封禁。

如果想要轻反馈，可以先做 reaction tags：

- `Creative`
- `Beautiful`
- `Funny`
- `Surreal`
- `Great prompt`

评论后续从 image detail page 开始，不要一开始全站铺开。

## 审核与安全

网站应是 SFW-first，尤其是首页、Explore 和 Featured。

审核分层：

```text
User input
  -> text moderation
  -> prompt rewrite / block / allow

Reference image
  -> image moderation
  -> block / allow

Image generation
  -> generated image moderation
  -> show / hide / regenerate

Submission
  -> text + image + metadata moderation
  -> public / needs review / reject

Featured
  -> stricter quality + safety review
  -> featured / not featured
```

### 生成前审核

生成前审核：

- User prompt。
- Negative prompt。
- Assistant chat input。
- Reference image if uploaded。

处理：

- Safe：允许生成。
- Borderline：安全改写或要求用户调整。
- Unsafe：阻止并简短说明。

### 生成后审核

生成后继续审核图片：

- Safe：正常显示。
- Borderline：只给用户看或要求 regenerate。
- Unsafe：隐藏并说明。

### 提交审核

用户侧状态保持简单：

```text
Generated
Submitted
Approved
Rejected
```

`Withdrawn` 可以作为内部预留状态，用于特殊情况下下架已通过图片，但第一版不在普通用户界面展示。

自动审核检查：

- NSFW / sexual content。
- Violence / gore。
- Hate symbols。
- Minor-related risk。
- Public figure / celebrity risk if relevant。
- Copyrighted character risk if relevant。
- Spam / repeated uploads。
- Prompt risk。
- Image quality。
- Theme relevance。

审核图片和文本 metadata：

- Image。
- Prompt。
- Negative prompt。
- User note。
- Tags。

### 人工审核队列

后台显示：

- Image thumbnail。
- Large image preview。
- Theme。
- Prompt。
- Negative prompt。
- User。
- Auto-moderation labels。
- Risk score。
- Similarity signals。
- Engagement signals。

操作：

- `Approve`
- `Reject`
- `Hide`
- `Feature`
- `Remove from featured`
- `Ban user`
- `Mark as needs more review`

Featured 比 public submission 更严格。首页精选图 MVP 阶段最好人工确认。

## 桌面布局

首页桌面布局：

```text
------------------------------------------------------------
AI Image Generator
------------------------------------------------------------

Left: Creation panel                 Right: Result / inspiration panel

- Prompt / idea input                - Generated images
- Assistant actions                  - Loading state
- Today's theme idea button          - Quick preview of today's theme
- Model selector                     - View today's theme
- Style controls
- Aspect ratio
- Images
- Generate button
```

详情页桌面布局：

```text
------------------------------------------------------------
Theme header
------------------------------------------------------------

Left: Creation panel                 Right: Results panel

- Today's theme                      - Generated images
- Prompt / idea input                - Loading state
- Assistant suggestions              - Variations
- Model selector                     - Edit actions
- Style controls                     - Submit action
- Aspect ratio
- Images
- Generate button
```

两种场景使用同一套生成器组件，只是传入的 context 不同：

- 首页：`context = free_create`，可选 `today_theme` 用于灵感按钮。
- 详情页：`context = theme_detail`，当前 `theme_id` 用于助手和提交。

创作面板和结果面板应该像一个工作区。

## 移动端布局

首页移动端：

```text
AI Image Generator
Prompt / idea input
Assistant actions
Generation settings
Generate button
Generated images
Today's theme preview
Featured images from today's theme
Recent themes
```

详情页移动端：

```text
Theme header
Prompt / idea input
Assistant actions
Generation settings
Generate button
Generated images
Post-generation actions
Submitted images from others
```

不要让用户生成前在多个 tab 之间跳来跳去。

## 主要用户流程

### 首页用户自由生成

1. 用户打开首页。
2. 在 `AI Image Generator` 中输入 prompt 或想法。
3. 可选点击 `Improve prompt`。
4. 生成图片。
5. 下载、编辑、保存，或选择提交到某个主题。

### 首页用户没有想法

1. 用户打开首页。
2. 不知道画什么。
3. 点击 `Get ideas about today's theme`。
4. 助手基于今日题目返回多个方向。
5. 用户选择一个方向。
6. 自动生成 prompt。
7. 用户生成图片。
8. 可选进入今日题目详情页提交。

### 详情页用户参与主题

1. 用户打开某个每日题目详情页。
2. 点击 `Get ideas about this theme`，或直接输入自己的 interpretation。
3. 助手结合当前题目生成或优化 prompt。
4. 用户生成图片。
5. 用户点击 `Submit to this theme`。
6. 作品进入提交审核。

### 用户有模糊想法

1. 用户输入一句短想法。
2. 点 `Improve`。
3. 助手改写成完整 prompt。
4. 生成图片。
5. variation 或 submit。

### 用户已有 Prompt

1. 用户粘贴 prompt。
2. 直接生成。
3. 可选 `Improve prompt`。
4. 编辑、下载、保存，或提交到相关主题。

### 用户想从别人作品获得灵感

1. 用户浏览提交图片。
2. 点 `Use as inspiration`。
3. 助手给几个不同创作方向。
4. 用户选择方向。
5. 创作面板打开，带入修改后的 prompt。
6. 用户调整 style 或 mood。
7. 生成新图。
8. 提交到同一主题。

## MVP 范围

包含：

- 首页自由 `AI Image Generator`。
- 首页 `Get ideas about today's theme`。
- 详情页 `Get ideas about this theme`。
- Prompt / idea input。
- `Improve prompt`。
- `Ask assistant`。
- Concrete model selector。
- Basic style selector。
- Aspect ratio selector。
- Images selector。
- Generate button。
- Generated image grid。
- Per-image submit action。
- `Submit to this theme`。
- `Submit to today's theme`。
- Save prompt with submitted image。
- Submitted prompt is public by default。
- Optional public `Creation note`。
- `View prompt`。
- `Copy prompt`。
- 首页展示今日题目入口和前 2 天轻量入口。
- Explore `Themes` view。
- Explore `Images` view。
- Daily theme detail page。
- `My Studio` workspace。
- `My Studio` generator。
- `Get ideas from a theme` in My Studio。
- Theme picker opened from `Get ideas from a theme`。
- My Studio tabs: `All` / `Submitted`。
- Featured images。
- `Like`。
- `Save`。
- `Use as inspiration`。
- `Use prompt`。
- 生成前自动审核。
- 生成后自动审核。
- 提交审核状态。
- 人工审核队列。

延后：

- Full advanced prompt editor。
- Complex multi-turn chat。
- Regional inpainting。
- Full image editor。
- Model comparison。
- Public remix graph。
- Open comments。
- Remix ranking。
- Image-reference remix。
- Full community moderation tooling。
- Personalized recommendation system。

## 总结

创作助手不应该是独立目的地，而应该是图片生成面板里的内嵌创意层。

主体验应保持简单：

> Describe an idea, get help if needed, generate an image, improve it, and optionally submit it to a theme.

Explore 和详情页强化同一个循环：

> Browse a theme, see different interpretations, use an image as inspiration, create a different version, and submit it back to the theme.
