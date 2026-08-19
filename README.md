# lhyzs

个人网站，使用 MkDocs Material 构建并部署到 GitHub Pages。

## 项目结构

```text
.github/       GitHub Pages 构建、校验和部署工作流
docs/          网站页面、笔记和浏览器资源
overrides/     MkDocs Material 模板覆盖与 404 页面
scripts/       内容同步、构建配置生成和站点校验工具
supabase/      数据库迁移、Edge Function 和邮件模板
tools/         独立的内容导入工具
local/         不提交的原始媒体与一次性本地工具
site/          MkDocs 构建产物，不提交
test-results/  浏览器测试、截图和临时预览，不提交
exports/       本地导出结果，不提交
.superdesign/  设计工具临时文件，不提交
mkdocs.yml     站点、导航和全局资源配置
```

网站发布资源统一放在 `docs/assets/`。高质量音频、图片原稿等仅用于制作的文件放在
`local/source-assets/`，包含个人路径或会话标识的脚本放在 `local/tools/`。不要让网页、
构建脚本或部署流程依赖 `local/` 中的文件。

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
