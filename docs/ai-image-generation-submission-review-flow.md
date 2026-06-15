# AI 图片生成、提交与审核流程

## 范围

本文档定义 Home、Theme Detail 和 Studio 中的生成结果体验，以及图片提交、审核状态和基于主题的创意生成。

本文档补充 `docs/ai-image-creation-flow-design.md`。如果旧文档描述的是单张图片结果卡片、提交弹窗中可见的 prompt 字段，或将面向用户的 `Published` 作为主要审核通过状态，则应以本文档作为更新后的设计。

## 入口

### Home

Home 是一个免费的 AI 图片生成器。

- 生成不强制绑定到每日主题。
- 生成的图片会立即出现在 Home 的结果区域。
- 同一批生成图片也会保存到 Studio 历史记录。
- Home 的结果区域只展示当前 Home 页面会话中生成的图片。
- 应提供一个简短提示，告诉用户完整历史记录可在 Studio 中查看。

Home 可以提供 `Submit to today's theme`，但提交时仍需要用户在弹窗中确认目标主题。

### Theme Detail

Theme Detail 用于围绕当前主题进行创作。

- 生成器会把当前主题作为上下文。
- 不应把主题标题硬塞进用户的 prompt 中。
- 生成的图片会立即出现在 Theme Detail 的结果区域。
- 同一批生成图片也会保存到 Studio 历史记录。
- Theme Detail 的结果区域展示用户进入该页面后生成的所有图片，最新批次显示在顶部。
- 提交时默认选择当前主题。

### Studio

Studio 是用户完整的创意工作区。

- 包含生成器。
- 展示完整生成历史。
- 展示已提交图片和审核状态。
- 应清晰区分未提交、已提交、已通过和已拒绝的图片。

Studio 不全局绑定到某个主题。如果用户通过 `Get ideas from a theme` 选择了一个主题，该主题只会成为下一批生成的当前创作上下文，直到用户更改或清除它。

命名：保留 `Studio` 作为导航/页面名称，因为该页面包含创作、历史记录、提交和审核反馈。在 Studio 内部使用 `Create` 作为生成器区块标题。

## 生成结果布局

三个界面统一使用相同的生成批次布局。

每次生成请求都会创建一行批次：

```text
[Prompt / settings / reference summary]    [Image 1] [Image 2] [Image 3] [Image 4]
```

左侧：

- Prompt 摘要。
- 模型。
- 风格。
- 宽高比。
- 创建时间。
- 参考图缩略图，如有。

如果没有 reference image，不显示任何参考图信息。主题上下文不在批次左侧显式展示。

右侧：

- 最多 4 张图片。
- 最新生成批次显示在顶部。
- 每张图片右上角有悬停操作：
  - Submit。
  - Delete。
  - Favorite。
  - Download。

Home 和 Theme Detail 应使用固定高度的结果区域。如果批次数量超出可显示范围，结果区域应垂直滚动。Studio 可以使用整页历史视图。

## 提交弹窗

提交以单张图片为单位，而不是以批次为单位。

弹窗中不应显示 prompt。prompt 会作为系统元数据自动随提交图片保存。

推荐弹窗：

```text
Submit image

[Image preview]

English title *
[ A lonely figure under a red sun ]

Theme *
[ Theme selector ]

Creation note optional
[ Share the idea, mood, or interpretation behind this image... ]

[Submit]
```

字段：

- `English title` 必填，用作公开图片标题和 alt 文本。
- `Theme` 必填。
- `Creation note` 可选，代表用户的创作思考。

默认主题选择：

- Home：今日主题，除非用户选择其他主题。
- Theme Detail：当前主题。
- Studio 在 `Get ideas from a theme` 之后：已选择的主题。
- Studio 无主题上下文：用户必须先选择主题才能提交。

重复提交规则：

- 如果一张图片已经提交到任何主题，且不属于特殊的内部撤回场景，则不允许再次提交。
- 显示一条简短消息，提示用户选择另一张图片。

## 面向用户的提交状态

保持面向用户的状态简单：

- `Generated`：未提交。
- `Submitted`：已提交，等待审核。
- `Approved`：审核通过。
- `Rejected`：审核拒绝。

暂时不要在普通用户 UI 中暴露 `Withdrawn`。它可以作为内部状态，或作为未来特殊下架场景的状态保留。

Studio 应提供 `Submitted` 标签页，并让用户能够轻松区分已通过和已拒绝的图片。被拒绝的图片应显示审核备注。

Studio 不需要顶层 `Generated` 标签页，因为 `All` 已经覆盖生成历史。`Approved` 和 `Rejected` 应显示在 `Submitted` 下，而不是作为顶层标签页。

`Submitted` 应包含二级标签页：

```text
[Pending review] [Approved] [Rejected]
```

`Pending review` 映射到内部 submitted 状态。

## 管理员审核

管理员有专用的图片提交队列。

审核卡片字段：

- 图片预览。
- 英文标题。
- 主题。
- 用户。
- 创作说明。
- Prompt 元数据，如对内容审核有帮助。
- 当前状态。
- 审核备注。

操作：

- `Approve`。
- `Reject`。

后续可选操作：

- Hide。
- Feature。
- Remove from featured。
- Ban user。

大多数已提交图片预计会被通过。拒绝时应包含清晰的审核备注。

## 从主题获取创意

使用混合策略：先展示预设初始创意，再按需生成 AI 创意。

### 为什么使用混合策略

预设创意：

- 成本几乎为零。
- 即时返回。
- 保持质量和主题匹配度稳定。
- 适合高流量主题页面。

AI 生成创意：

- 避免灵感耗尽。
- 可以响应用户当前 prompt 或偏好。
- 用户点击 `More ideas` 时提供更发散、更个性化的方向。

### 主题创意配置

每个主题可以包含：

```ts
type ThemeCreativeConfig = {
  // Default target: 6 preset ideas per theme.
  starterIdeas: string[];
  themeAvoidCliches?: string[];
};
```

全局配置：

```ts
type GlobalCreativeConfig = {
  globalAvoidCliches: string[];
};
```

向 AI 请求更多创意时：

```text
avoidCliches = globalAvoidCliches + themeAvoidCliches
```

### 行为

1. 用户点击 `Get ideas about today's theme`、`Get ideas about this theme` 或 `Get ideas from a theme`。
2. 从所选主题的 6 条 `starterIdeas` 中随机展示 3 条。
3. 如果用户再次点击 `Get ideas`，继续随机展示 3 条，但尽量避免和当前屏完全一样。
4. 如果用户点击 `More ideas`，直接调用 AI 生成 3 条新创意。
5. AI 生成应带上当前主题、6 条预设创意、已展示过的创意，并使用合并后的 avoid-cliche 列表。

不要暴露某条创意来自预设内容还是 AI。UI 可以只显示 `Try one` 并提供 `More ideas`。

## 最小演示要求

演示应展示：

- 使用生成批次行，而不是孤立的单张图片卡片。
- Home 和 Theme Detail 的本地结果区域，以及 Studio 历史提示和直接 `Open Studio` 操作。
- Studio 顶层标签页：`All` 和 `Submitted`。
- Submitted 二级标签页：`Pending review`、`Approved` 和 `Rejected`。
- 提交弹窗包含图片预览、English title、主题选择器和 Creation note。
- 管理员 Image submissions 队列，包含 Approve 和 Reject 操作。
- `Get ideas from a theme` 先展示预设创意，并使用 `More ideas` 作为展开操作。
