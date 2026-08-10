# 评论与排行榜安全配置

这套方案把匿名写入收口到 `public-submit` Edge Function。浏览器不能再直接写评论或成绩；服务端会验证 Turnstile、执行原子限流、过滤昵称，并校验游戏赛局与理论最高里程。

## 1. 创建 Cloudflare Turnstile

在 Cloudflare 控制台创建 Turnstile 小组件，生产域名填写：

```text
lhyzs-hub.github.io
```

保存公开的 Site Key 和私密的 Secret Key。Secret Key 不能放入 GitHub 仓库变量或网站代码。

## 2. 配置 GitHub Pages 公钥

在 GitHub 仓库 `Settings → Secrets and variables → Actions → Variables` 新增：

```text
TURNSTILE_SITE_KEY=<Cloudflare Site Key>
```

也可以在已登录 GitHub CLI 的终端执行：

```powershell
gh variable set TURNSTILE_SITE_KEY --body '<Cloudflare Site Key>'
```

## 3. 应用数据库迁移

在 Supabase Dashboard 的 SQL Editor 中完整运行：

```text
supabase/migrations/20260810062000_harden_public_submissions.sql
```

迁移会撤销 `anon` / `authenticated` 对评论和排行榜的直接 `INSERT` 权限。完成 Edge Function 部署前不要单独执行此步骤，否则网站会暂时进入只读状态。

## 4. 部署 Edge Function

安装并登录 Supabase CLI 后执行：

```powershell
npx supabase login
npx supabase link --project-ref mdgkqgkeqyqzmeztmioi
Copy-Item 'supabase/.env.example' 'supabase/.env.production.local'
```

编辑 `supabase/.env.production.local`，填入 Turnstile Secret Key，并生成独立的限流盐：

```powershell
$securitySalt = [Convert]::ToHexString([Security.Cryptography.RandomNumberGenerator]::GetBytes(32)).ToLower()
$securitySalt
```

把输出写入 `RATE_LIMIT_SALT`。随后上传密钥并部署：

```powershell
npx supabase secrets set --env-file 'supabase/.env.production.local' --project-ref mdgkqgkeqyqzmeztmioi
npx supabase functions deploy public-submit --use-api --project-ref mdgkqgkeqyqzmeztmioi
```

`supabase/.env.production.local` 已被 Git 忽略，不要提交它。

## 5. 评论隐藏与删除

在 Supabase Dashboard 的 Table Editor 打开 `site_comments`：

- 隐藏：把目标评论的 `is_visible` 改为 `false`。
- 恢复：把 `is_visible` 改为 `true`。
- 删除：直接删除该行。

也可以在 SQL Editor 使用后台函数：

```sql
select public.moderate_site_comment(评论ID, 'hide', 'spam');
select public.moderate_site_comment(评论ID, 'show');
select public.moderate_site_comment(评论ID, 'delete');
```

隐藏后，公开 RLS 会立即阻止访客读取该评论。

## 6. 排行榜异常记录处理

新的成绩必须同时满足：

- 来自服务器签发且未使用的一次性赛局 ID；
- 赛局未过期，且提交者 IP 指纹一致；
- 分数不超过按实际经过时间计算的理论上限；
- Turnstile 验证有效且未被重复使用；
- 通过每 10 分钟 5 次的服务端限流。

这能拦截直接改分、超速分数、重复赛局和批量提交。由于小游戏仍运行在访客浏览器中，服务端无法证明每一次操作过程，因此只能检测明显异常，不能在纯静态网站上做到竞技游戏级的完全防作弊。

如需手动下榜，在 `game_scores` 中把 `is_visible` 改为 `false`，或把 `review_status` 改为 `flagged` / `rejected`。

## 默认限流

| 操作 | 限制 |
| --- | --- |
| 评论 | 每个 IP 指纹每 10 分钟 3 条 |
| 成绩 | 每个 IP 指纹每 10 分钟 5 次 |
| 开局凭证 | 每个 IP 指纹每 10 分钟 20 次 |

数据库只保存使用独立盐生成的 SHA-256 指纹，不保存原始 IP。昵称默认拦截冒充站长、管理员、官方身份及少量明显辱骂词；可通过 `BLOCKED_NICKNAME_TERMS` 追加以英文逗号分隔的词条。
