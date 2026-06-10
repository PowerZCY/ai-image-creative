# 用户提交题目与积分规则设计

## 目标

网站应该允许用户提交每日题目想法。

这个功能的目标：

- 增加社区参与感。
- 扩大每日题目的候选池。
- 奖励能贡献有效创意的用户。

这个功能建议直接做在网站里，而不是主要依赖邮件。

邮件可以保留为 support 或 partnership 入口，但题目提交需要和用户账号、积分、审核状态、候选题库绑定，站内功能更合适。

## 核心规则

用户可以通过两个阶段获得积分：

1. 提交有效题目后，获得少量积分。
2. 题目被采纳为每日题目后，获得大量积分。

关键原则：

> 积分奖励的是有效提交，不是每一次原始提交。

如果提交即奖励，一定会被刷。

## 用户侧规则文案

推荐英文站展示文案：

```text
Submit a daily theme idea

Share a creative theme that could inspire people to make AI images.

You can earn a small credit reward when your idea is accepted as a valid submission. If your idea is selected as a daily theme, you will receive a larger credit reward.

Submitted ideas may be edited, adapted, or combined before publication. Not every submitted idea will be shown publicly or selected.
```

短版：

```text
Valid theme ideas earn credits. Selected daily themes earn a bigger reward.
```

## 提交入口

建议入口：

- 首页今日题目附近：`Suggest a theme`
- Explore 页面：`Submit a theme idea`
- 用户中心：`My theme ideas`
- 每日题目详情页底部：`Got a theme idea?`

不要让它成为首页第一主按钮。首页主动作仍然应该是创作图片。

## MVP 提交表单

表单要短。

推荐字段：

```text
Theme idea
[ A scene you cannot explain having seen before ]

Why it works? optional
[ It forces people to use vague memory. ]

Trigger type
[ Vague memory / Perspective shift / Concept visualization / Rule mutation / Other ]

[Submit]
```

后续可加字段：

- Suggested SEO keywords.
- Example prompt ideas.
- Mood tags.
- Visual tags.
- Language.

## 给用户的题目质量提示

提交前展示简短引导。

好的题目应该：

- 迫使用户完成一个创意思维动作。
- 留出很多解释空间。
- 适合公开 SFW 网站。
- 不只是普通物体或风格。
- 不需要很长解释也能理解。

强题目例子：

- `A Scene You Cannot Explain Having Seen Before`
- `The Architecture of Loneliness`
- `A Kitchen Designed for Your Dog`
- `Show Silence`

弱题目例子：

- `future city`
- `a dragon`
- `beautiful girl`
- `cyberpunk street`

## 积分奖励规则

推荐 MVP 奖励：

```text
First valid theme submission: +20 credits
Each accepted valid theme submission: +5 to +10 credits, subject to limits
Theme selected as a daily theme: +300 credits
Editor's special pick: +500 credits
```

更简单的版本：

```text
Valid submission: +10 credits
Selected daily theme: +300 credits
```

推荐规则：

- 审核通过后才发积分。
- 不在原始提交时立即发积分。
- 用户首次有效提交给一次性奖励。
- 设置每日和每周奖励上限。

## 奖励限制

防止刷积分：

- 必须登录才能提交。
- 邮箱验证后才发积分。
- 每天最多提交 3-5 个。
- 每天最多 1 次有效提交奖励。
- 每周最多 3 次有效提交奖励。
- 重复题目不给奖励。
- 被拒绝题目不给奖励。
- 不安全或垃圾题目不给奖励。
- 多次低质量提交的用户降低提交额度。

## 提交状态

内部状态：

```text
submitted
under_review
accepted_to_pool
duplicate
rejected
selected
published
hidden
```

用户侧状态：

- `Under review`
- `Accepted`
- `Selected`
- `Not selected`
- `Duplicate`

不要向用户暴露过多内部审核细节。

## 审核流程

推荐流程：

```text
User submits theme idea
-> automatic review
-> manual review
-> accepted to candidate pool / duplicate / rejected
-> selected for publication if chosen
-> credits granted according to status
```

## 自动审核

自动审核检查：

- 是否为空或太短。
- 是否垃圾内容。
- 是否重复提交。
- 是否和已有题目高度相似。
- 是否包含不安全内容。
- 是否包含 hate、sexual、violent、exploitative 内容。
- 是否涉及 public figure / celebrity 风险。
- 是否涉及 copyrighted character / franchise 风险。
- 是否是低努力普通题。

低努力例子：

- `dragon`
- `future city`
- `anime girl`
- `cool robot`
- `beautiful landscape`

这些可以拒绝或标记为低质量，除非用户加入了很强的创意机制。

## 人工审核

人工审核看：

- 是否强迫用户完成认知动作。
- 是否足够开放。
- 是否容易理解。
- 是否适合 SFW 公共网站。
- 是否能支撑 prompt ideas。
- 是否能承接 SEO metadata。
- 是否区别于已有题目。
- 是否能被编辑成更强的每日题目。

审核操作：

- `Accept to pool`
- `Reject`
- `Mark duplicate`
- `Edit and accept`
- `Select for daily theme`
- `Request internal review`

## 编辑用户提交的题目

网站需要保留编辑、改写、合并用户提交题目的权利。

用户侧规则：

```text
Submitted ideas may be edited, adapted, or combined before publication.
```

这很重要，因为用户可能提交的是一个有潜力但未完成的想法。

例子：

用户提交：

```text
lonely building
```

编辑后：

```text
The Architecture of Loneliness
```

如果编辑后的题目明显来自用户想法，仍可给用户采纳奖励。

## 归因

MVP 不建议默认公开归因。

推荐：

- MVP 只做内部归因。
- 前台可以统一显示：`Inspired by a community suggestion`。
- 后续再允许公开用户名。

如果后续开放公开归因，用户应能选择：

- `Show my username`
- `Keep me anonymous`

更安全的初期文案：

```text
Inspired by a community suggestion
```

后续可选：

```text
Suggested by @username
```

## 公开展示策略

初期：

- 不公开展示所有用户提交题目。
- 只展示最终被选中的每日题目。
- 用户中心显示自己提交题目的状态。

原因：

- 避免垃圾内容可见。
- 避免用户互相抄题。
- 降低审核压力。
- 保证每日题目质量。
- 避免网站变成未审核 prompt board。

后期：

- 可以考虑 `Community Ideas` 页面。
- 只展示审核通过的候选题。
- 系统稳定后再考虑投票。

## 后期投票系统

MVP 不做投票。

后续可能流程：

1. 用户提交题目。
2. 题目通过审核。
3. 进入公开候选池。
4. 用户投票。
5. 高票题目再次由编辑审核。
6. 最终发布为每日题目。

投票只能作为参考，不应完全自动决定每日题目。

原因：

- 最受欢迎的不一定是最强题目。
- 投票容易被刷。
- 编辑仍要控制质量、安全和多样性。

投票防滥用：

- 只有审核通过题目可投票。
- 必须登录。
- 必须邮箱验证。
- 每个用户对每个题目只能投一次。
- 频率限制。
- 异常检测。
- 编辑最终决定。

## 积分发放时机

### 有效提交奖励

触发条件：

- 题目通过审核，进入候选池。

不触发：

- 原始提交。
- 重复题目。
- 被拒绝题目。
- 不安全题目。
- 垃圾题目。

### 采纳奖励

触发条件：

- 用户提交或编辑衍生出的题目被选为官方每日题目。

如果多个用户提交类似题目：

- MVP 建议奖励最早的有效提交。
- 后续可考虑拆分奖励给多个有意义贡献者。

## 防刷策略

潜在滥用：

- 为积分提交大量低质量题目。
- 小幅修改重复题目。
- 如果后续公开候选池，复制别人题目。
- 多账号刷积分。
- 用 AI 生成大量垃圾题。

对策：

- 登录限制。
- 邮箱验证。
- 提交频率限制。
- 审核通过后才奖励。
- 重复检测。
- 相似度检测。
- 账号年龄或信任分。
- 多次低质量用户降低奖励或额度。
- 高额采纳奖励必须人工确认。

## 数据结构

推荐字段：

```text
theme_submission_id
user_id
raw_title
raw_description
trigger_type
language
status
review_notes
auto_review_labels
duplicate_of_submission_id
accepted_theme_candidate_id
published_theme_id
credits_awarded_valid_submission
credits_awarded_selected
created_at
reviewed_at
selected_at
published_at
```

如果题目被编辑：

```text
edited_title
edited_brief
editor_id
edit_reason
```

## 后台审核队列

后台应展示：

- 用户提交题目。
- 用户解释。
- 用户历史。
- 自动审核标签。
- 疑似重复题目。
- 相似历史题目。
- 建议 trigger type。
- 建议 SEO support keywords。
- 审核操作。

操作：

- `Accept to pool`
- `Reject`
- `Mark duplicate`
- `Edit and accept`
- `Select for daily theme`

## MVP 范围

包含：

- 站内题目提交表单。
- 登录要求。
- 发积分前要求邮箱验证。
- 首次有效提交奖励。
- 有效提交奖励和限制。
- 采纳奖励。
- 自动审核。
- 人工审核队列。
- 用户侧状态列表。
- 内部归因。
- 初期不公开展示所有提交。

延后：

- 公开 `Community Ideas`。
- 公开投票。
- 默认公开归因。
- 题目评论。
- 贡献者排行榜。
- 全自动选题。

## 总结

这个功能应该做成站内功能，因为它需要结构化数据、审核状态、积分奖励、归因和防刷。

第一版应该私密且可控：

> 用户提交题目，有效题目给少量积分，被选为每日题目给大量积分。初期不公开所有提交，系统稳定后再考虑公开候选题和投票。
