# Repository Guidelines

## Project Structure & Module Organization

This repository builds a MkDocs Material site. Author content lives in `docs/`: pages are Markdown, shared browser code is under `docs/assets/javascripts/`, styles are under `docs/assets/stylesheets/`, and media is grouped in `docs/assets/images/` and `docs/assets/audio/`. Theme overrides live in `overrides/`. Content-import and validation utilities are in `scripts/`. Supabase SQL migrations and the `public-submit` Edge Function are in `supabase/`. GitHub Pages automation is defined in `.github/workflows/deploy.yml`.

All UI and content changes in `docs/` or `overrides/` must follow the persistent design system in `docs/AGENTS.md`.

Treat `site/`, `test-results/`, `exports/`, and `.superdesign/` as generated or temporary output; do not commit them.

## Build, Test, and Development Commands

```powershell
python -m pip install mkdocs-material==9.6.21
python -m mkdocs serve
python -m mkdocs build --strict
python scripts/content_pipeline.py check --site-dir site
python scripts/check_page_assets.py --site-dir site
```

`mkdocs serve` starts a local preview. The strict build catches broken configuration and Markdown warnings. The two Python checks validate generated content, internal links, the sitemap, and page-specific asset loading. To import the Obsidian vault and regenerate note metadata, run `python scripts/content_pipeline.py sync`; review its broad content changes before committing.

## Coding Style & Naming Conventions

Use four spaces in Python and two spaces in HTML, CSS, JavaScript, TypeScript, and YAML. Follow existing browser-script conventions: vanilla JavaScript, scoped IIFEs, `const` by default, camelCase identifiers, and kebab-case asset filenames such as `home-secret-track.js`. Keep page-specific assets separate and register them in `overrides/main.html` and `scripts/check_page_assets.py`. Name Supabase migrations `YYYYMMDDHHMMSS_description.sql`.

## Testing Guidelines

There is no standalone unit-test suite. Before every submission, run the strict build and both validation scripts. For visual or interactive changes, test desktop and mobile widths, keyboard interaction, console errors, and offline/service-worker behavior where relevant. Include screenshots for visible changes.

## Commit & Pull Request Guidelines

Recent history uses short, imperative summaries in Chinese or English, for example `加入海克斯机巧工坊小游戏` or `optimize note navigation`. Keep each commit focused. Pull requests should explain the user-facing outcome, list verification commands, link relevant issues, and attach before/after screenshots for UI work. Call out database migrations, Edge Function deployments, or cache-version changes explicitly.

## Deployment Workflow

After every completed repository modification, run the required validation commands, stage only the files that belong to the current task, commit them, and push to GitHub. For changes deployed through GitHub Pages, monitor `.github/workflows/deploy.yml` until the build and deployment jobs succeed; do not report the modification as complete while it remains only local or the deployment is still pending. If pushing or deployment is blocked, report the blocker explicitly. Preserve unrelated local and untracked files throughout this workflow.

## Security & Configuration

Never commit Supabase secrets, Turnstile secret keys, database passwords, or local `.env` files. `scripts/write_supabase_config.py` generates the public browser configuration from CI variables; only publish the intended Supabase URL, publishable key, and Turnstile site key. Preserve unrelated local and untracked user files.
