# lhyzs

个人网站，使用 MkDocs Material 构建并部署到 GitHub Pages。

## 本地预览

```powershell
python -m pip install mkdocs-material==9.6.21
python -m mkdocs serve
```

## 同步 Obsidian 笔记

```powershell
python scripts/content_pipeline.py sync
```

该命令会同步 Obsidian 双链和附件，并自动更新笔记分类、篇数、最近更新、阅读时长、上一篇／下一篇和内容清单。源仓库不在默认位置时使用：

```powershell
python scripts/content_pipeline.py sync --source "D:\你的\Obsidian仓库"
```

只检查已生成内容、失效链接和缺失附件：

```powershell
python scripts/content_pipeline.py check
```

GitHub Pages 部署时还会在构建后校验 `sitemap.xml`，内容清单或站内链接过期时会停止发布。

## 评论服务

评论数据存储在 Supabase。将 `SUPABASE_URL` 与 `SUPABASE_PUBLISHABLE_KEY` 配置为 GitHub 仓库变量，并在 Supabase 中应用 `supabase/migrations/` 下的迁移。
