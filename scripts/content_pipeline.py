#!/usr/bin/env python3
"""一键同步并校验网站内容元数据、链接、附件与 sitemap。"""

from __future__ import annotations

import argparse
import html
import json
import re
import subprocess
import sys
import urllib.parse
import xml.etree.ElementTree as ET
from pathlib import Path, PurePosixPath


ROOT = Path(__file__).resolve().parents[1]
DOCS_ROOT = ROOT / "docs"
NOTES_ROOT = DOCS_ROOT / "notes"
MANIFEST_FILE = NOTES_ROOT / "content-manifest.json"
INDEX_FILE = NOTES_ROOT / "index.md"
WIKILINK_PATTERN = re.compile(r"!?\[\[[^\]\n]+\]\]")
MARKDOWN_LINK_PATTERN = re.compile(r"!?\[[^\]]*\]\((?P<target><[^>]+>|[^)\s]+)")
HTML_ASSET_PATTERN = re.compile(r"(?:src|href)=[\"'](?P<target>[^\"']+)[\"']", re.IGNORECASE)
NAV_START = "<!-- lhyzs-note-nav:start -->"


class ValidationError(RuntimeError):
    pass


def note_files() -> list[Path]:
    return sorted(
        path
        for path in NOTES_ROOT.rglob("*.md")
        if path.name.casefold() != "index.md"
    )


def strip_frontmatter(markdown: str) -> str:
    if not markdown.startswith("---\n"):
        return markdown
    boundary = markdown.find("\n---\n", 4)
    return markdown if boundary < 0 else markdown[boundary + 5 :]


def estimate_reading_minutes(markdown: str) -> int:
    import math

    text = re.sub(r"```.*?```|~~~.*?~~~", " ", strip_frontmatter(markdown), flags=re.DOTALL)
    text = re.sub(r"!\[[^]]*]\([^)]*\)", " ", text)
    text = re.sub(r"\[([^]]+)]\([^)]*\)", r"\1", text)
    text = re.sub(r"<[^>]+>", " ", text)
    chinese = len(re.findall(r"[\u3400-\u4dbf\u4e00-\u9fff]", text))
    latin = len(re.findall(r"\b[A-Za-z0-9][A-Za-z0-9_+-]*\b", text))
    return max(1, math.ceil((chinese + latin * 2) / 400))


def normalize_link_target(raw_target: str) -> str:
    target = html.unescape(raw_target.strip().strip("<>"))
    return urllib.parse.unquote(target.split("#", 1)[0].split("?", 1)[0])


def resolve_local_target(source: Path, raw_target: str) -> Path | None:
    target = normalize_link_target(raw_target)
    if not target or target.startswith(("#", "//")):
        return None
    parsed = urllib.parse.urlparse(target)
    if parsed.scheme or target.startswith(("mailto:", "tel:", "data:", "javascript:")):
        return None
    if target.startswith("/"):
        site_path = target.removeprefix("/lhyzs/").lstrip("/")
        candidate = DOCS_ROOT / site_path
    else:
        candidate = source.parent / target
    if target.endswith("/"):
        candidate /= "index.md"
    return candidate.resolve(strict=False)


def validate_links(files: list[Path], errors: list[str]) -> int:
    checked = 0
    docs_resolved = DOCS_ROOT.resolve()
    for source in files:
        markdown = source.read_text(encoding="utf-8")
        for match in [*MARKDOWN_LINK_PATTERN.finditer(markdown), *HTML_ASSET_PATTERN.finditer(markdown)]:
            raw_target = match.group("target")
            candidate = resolve_local_target(source, raw_target)
            if candidate is None:
                continue
            checked += 1
            try:
                candidate.relative_to(docs_resolved)
            except ValueError:
                errors.append(f"{source.relative_to(ROOT)}: 链接越出 docs 目录：{raw_target}")
                continue
            if candidate.is_file():
                continue
            if candidate.name.casefold() == "index.md":
                source_page = candidate.parent.with_suffix(".md")
                if source_page.is_file():
                    continue
            if candidate.suffix.casefold() == ".md":
                alternate = candidate.with_suffix("") / "index.md"
                if alternate.is_file():
                    continue
            errors.append(f"{source.relative_to(ROOT)}: 缺失链接或附件：{raw_target}")
    return checked


def validate_manifest(files: list[Path], errors: list[str]) -> dict[str, object]:
    if not MANIFEST_FILE.is_file():
        raise ValidationError(f"缺少内容清单：{MANIFEST_FILE.relative_to(ROOT)}，请先运行 sync。")
    manifest = json.loads(MANIFEST_FILE.read_text(encoding="utf-8"))
    entries = manifest.get("notes", [])
    expected_paths = {path.relative_to(NOTES_ROOT).as_posix() for path in files}
    manifest_paths = {str(entry.get("path", "")) for entry in entries}
    if manifest.get("note_count") != len(files):
        errors.append(f"内容清单笔记数为 {manifest.get('note_count')}，实际为 {len(files)}")
    if manifest_paths != expected_paths:
        missing = sorted(expected_paths - manifest_paths)
        stale = sorted(manifest_paths - expected_paths)
        if missing:
            errors.append("内容清单缺少：" + "、".join(missing))
        if stale:
            errors.append("内容清单仍包含已删除笔记：" + "、".join(stale))

    by_path = {str(entry.get("path")): entry for entry in entries}
    for path in files:
        relative = path.relative_to(NOTES_ROOT).as_posix()
        entry = by_path.get(relative)
        if not entry:
            continue
        minutes = estimate_reading_minutes(path.read_text(encoding="utf-8"))
        if entry.get("reading_minutes") != minutes:
            errors.append(
                f"{path.relative_to(ROOT)}: 阅读时长已过期，清单 {entry.get('reading_minutes')} 分钟，实际 {minutes} 分钟"
            )
        if NAV_START not in path.read_text(encoding="utf-8"):
            siblings = [item for item in files if item.parent == path.parent]
            if len(siblings) > 1:
                errors.append(f"{path.relative_to(ROOT)}: 缺少自动上一篇/下一篇导航")
    return manifest


def validate_index(manifest: dict[str, object], errors: list[str]) -> None:
    if not INDEX_FILE.is_file():
        errors.append("缺少笔记首页 docs/notes/index.md")
        return
    index = INDEX_FILE.read_text(encoding="utf-8")
    count = int(manifest.get("note_count", 0))
    latest = str(manifest.get("latest_updated") or "—")
    if f"<b>{count}</b> 篇笔记" not in index:
        errors.append("笔记首页的总篇数已过期")
    if latest != "—" and latest.replace("-", ".") not in index:
        errors.append("笔记首页的最近更新时间已过期")
    for entry in manifest.get("notes", []):
        href = f"{PurePosixPath(str(entry['path'])).with_suffix('').as_posix()}/"
        if f'href="{href}"' not in index:
            errors.append(f"笔记首页缺少条目：{entry['path']}")


def validate_sitemap(site_dir: Path, files: list[Path], errors: list[str]) -> int:
    sitemap = site_dir / "sitemap.xml"
    if not sitemap.is_file():
        errors.append("构建结果缺少 sitemap.xml")
        return 0
    root = ET.parse(sitemap).getroot()
    namespace = {"sm": "http://www.sitemaps.org/schemas/sitemap/0.9"}
    urls = {
        urllib.parse.unquote(node.text or "")
        for node in root.findall("sm:url/sm:loc", namespace)
    }
    expected = {
        "https://lhyzs-hub.github.io/lhyzs/notes/"
        + path.relative_to(NOTES_ROOT).with_suffix("").as_posix()
        + "/"
        for path in files
    }
    missing = sorted(expected - urls)
    if missing:
        errors.append(f"sitemap 缺少 {len(missing)} 篇笔记：" + "、".join(missing[:5]))
    return len(urls)


def run_check(site_dir: Path | None = None) -> None:
    files = note_files()
    errors: list[str] = []
    wikilinks = [
        f"{path.relative_to(ROOT)}: {match.group(0)}"
        for path in files
        for match in WIKILINK_PATTERN.finditer(path.read_text(encoding="utf-8"))
    ]
    if wikilinks:
        errors.extend("未转换 Obsidian 语法：" + item for item in wikilinks)
    manifest = validate_manifest(files, errors)
    validate_index(manifest, errors)
    link_count = validate_links([INDEX_FILE, *files], errors)
    sitemap_count = validate_sitemap(site_dir, files, errors) if site_dir else 0
    if errors:
        print("内容校验失败：", file=sys.stderr)
        for error in errors:
            print(f"- {error}", file=sys.stderr)
        raise SystemExit(1)
    suffix = f"，sitemap {sitemap_count} 个页面" if site_dir else ""
    print(f"内容校验通过：{len(files)} 篇笔记，{link_count} 个本地链接/附件{suffix}。")


def run_sync(source: Path) -> None:
    command = [
        sys.executable,
        str(ROOT / "scripts" / "import_obsidian_to_mkdocs.py"),
        "--source",
        str(source),
        "--docs-root",
        str(DOCS_ROOT),
    ]
    subprocess.run(command, cwd=ROOT, check=True)
    run_check()


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    subparsers = parser.add_subparsers(dest="command", required=True)
    sync = subparsers.add_parser("sync", help="同步 Obsidian，并更新所有派生内容。")
    sync.add_argument(
        "--source",
        type=Path,
        default=Path("D:/obsidian/repositiries/note"),
        help="Obsidian 仓库路径。",
    )
    check = subparsers.add_parser("check", help="校验已生成的内容。")
    check.add_argument("--site-dir", type=Path, help="可选：MkDocs 构建目录，用于校验 sitemap。")
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    if args.command == "sync":
        run_sync(args.source.expanduser().resolve())
    else:
        run_check(args.site_dir.expanduser().resolve() if args.site_dir else None)


if __name__ == "__main__":
    main()
