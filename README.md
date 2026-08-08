# lhyzs

个人网站，使用 MkDocs Material 构建并部署到 GitHub Pages。

## 本地预览

```powershell
python -m pip install mkdocs-material==9.6.21
python -m mkdocs serve
```

## 同步 Obsidian 笔记

```powershell
python scripts/import_obsidian_to_mkdocs.py
```

## 评论服务

评论数据存储在 Supabase。将 `SUPABASE_URL` 与 `SUPABASE_PUBLISHABLE_KEY` 配置为 GitHub 仓库变量，并在 Supabase 中应用 `supabase/migrations/` 下的迁移。
