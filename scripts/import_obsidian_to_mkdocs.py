#!/usr/bin/env python3
"""将 Obsidian 笔记库同步到 MkDocs，并转换双链、附件和文章导航。"""

from __future__ import annotations

import argparse
import html
import json
import math
import os
import posixpath
import re
import shutil
import sys
import unicodedata
from collections import defaultdict
from datetime import datetime
from pathlib import Path, PurePosixPath


PROJECT_ROOT = Path(__file__).resolve().parents[1]
SRC = Path(os.environ.get("OBSIDIAN_VAULT", "D:/obsidian/repositiries/note"))
DOCS_ROOT = PROJECT_ROOT / "docs"
NOTES_ROOT = DOCS_ROOT / "notes"
STAGING_ROOT = DOCS_ROOT / ".notes-import-staging"
MANIFEST_NAME = "content-manifest.json"

SKIPPED_SUFFIXES = {".base"}
SKIPPED_DIRS = {".obsidian", ".trash", "音乐学习", "运动"}
SKIPPED_NOTE_NAMES = {"电路设计索引.md", "知识库首页.md", "迁移记录.md"}
SKIPPED_NOTE_STEMS = {Path(name).stem for name in SKIPPED_NOTE_NAMES}
SKIPPED_WIKILINK_PATTERN = re.compile(
    r"!?\[\[(?:"
    + "|".join(re.escape(name) for name in sorted(SKIPPED_NOTE_STEMS))
    + r")(?:[#|][^\]]*)?\]\]"
)
WIKILINK_PATTERN = re.compile(r"(!?)\[\[([^\[\]\n]+)\]\]")
CALLOUT_START_PATTERN = re.compile(
    r"^(?P<indent>\s*)>\s*\[!(?P<kind>[A-Za-z-]+)\][+-]?\s*(?P<title>.*)$"
)
CALLOUT_BODY_PATTERN = re.compile(r"^(?P<indent>\s*)>\s?(?P<body>.*)$")
ATX_HEADING_PATTERN = re.compile(r"^(#{1,6})\s+(.+?)\s*#*\s*$")
FENCE_PATTERN = re.compile(r"^\s*(`{3,}|~{3,})")
NAV_START = "<!-- lhyzs-note-nav:start -->"
NAV_END = "<!-- lhyzs-note-nav:end -->"
NAV_PATTERN = re.compile(
    rf"\n*{re.escape(NAV_START)}.*?{re.escape(NAV_END)}\n*",
    re.DOTALL,
)
CALLOUT_KIND_MAP = {
    "summary": "abstract",
    "important": "warning",
}


def fail(message: str) -> None:
    print(message, file=sys.stderr)
    raise SystemExit(1)


def validate_paths() -> None:
    if not SRC.is_dir():
        fail(f"源目录不存在：{SRC}")

    docs_resolved = DOCS_ROOT.resolve()
    notes_resolved = NOTES_ROOT.resolve(strict=False)
    staging_resolved = STAGING_ROOT.resolve(strict=False)

    if notes_resolved.parent != docs_resolved:
        fail(f"拒绝操作非 docs 直属的目录：{notes_resolved}")
    if staging_resolved.parent != docs_resolved:
        fail(f"拒绝操作非 docs 直属的临时目录：{staging_resolved}")


def should_copy(path: Path) -> bool:
    relative = path.relative_to(SRC)
    if any(part.startswith(".") or part in SKIPPED_DIRS for part in relative.parts):
        return False
    if path.suffix.lower() == ".md" and path.name in SKIPPED_NOTE_NAMES:
        return False
    return path.suffix.lower() not in SKIPPED_SUFFIXES


def clean_skipped_wikilinks(markdown: str) -> str:
    """从网站副本移除指向未发布管理页面的 Obsidian 双链。"""
    cleaned_lines: list[str] = []
    for line in markdown.splitlines():
        cleaned = SKIPPED_WIKILINK_PATTERN.sub("", line)
        cleaned = re.sub(r"\s*·\s*·\s*", " · ", cleaned)
        cleaned = re.sub(r"^([>\s]*)(?:·\s*)+", r"\1", cleaned)
        cleaned = re.sub(r"\s*·\s*$", "", cleaned).rstrip()
        if cleaned.strip() in {"-", "*", "+"}:
            continue
        cleaned_lines.append(cleaned)

    result = "\n".join(cleaned_lines)
    if markdown.endswith("\n"):
        result += "\n"
    return result


def normalize_vault_path(value: str) -> str:
    normalized = posixpath.normpath(value.strip().replace("\\", "/").lstrip("/"))
    return "" if normalized == "." else normalized


def note_key(path: Path | PurePosixPath | str) -> str:
    value = normalize_vault_path(PurePosixPath(path).as_posix())
    if value.casefold().endswith(".md"):
        value = value[:-3]
    return value.casefold()


def asset_key(path: Path | PurePosixPath | str) -> str:
    return normalize_vault_path(PurePosixPath(path).as_posix()).casefold()


def clean_heading_text(value: str) -> str:
    value = html.unescape(value.strip())
    value = re.sub(r"!\[([^\]]*)\]\([^)]*\)", r"\1", value)
    value = re.sub(r"\[([^\]]+)\]\([^)]*\)", r"\1", value)
    value = re.sub(r"<[^>]+>", "", value)
    value = re.sub(r"[`*_~]", "", value)
    return re.sub(r"\s+", " ", value).strip()


def heading_lookup_key(value: str) -> str:
    return re.sub(r"\s+", " ", value.strip()).casefold()


def mkdocs_slug(value: str) -> str:
    """复刻 Python-Markdown toc 的默认 ASCII 标题 slug。"""
    ascii_value = unicodedata.normalize("NFKD", value).encode("ascii", "ignore").decode("ascii")
    ascii_value = re.sub(r"[^\w\s-]", "", ascii_value).strip().lower()
    return re.sub(r"[-\s]+", "-", ascii_value)


def unique_anchor(anchor: str, used: set[str]) -> str:
    while not anchor or anchor in used:
        match = re.match(r"^(.*)_([0-9]+)$", anchor)
        anchor = f"{match.group(1)}_{int(match.group(2)) + 1}" if match else f"{anchor}_1"
    used.add(anchor)
    return anchor


def build_heading_index(note_paths: list[Path]) -> dict[Path, dict[str, str]]:
    index: dict[Path, dict[str, str]] = {}
    for relative in note_paths:
        source = (SRC / relative).read_text(encoding="utf-8")
        headings: dict[str, str] = {}
        used: set[str] = set()
        fence: str | None = None

        for line in source.splitlines():
            fence_match = FENCE_PATTERN.match(line)
            if fence_match:
                marker = fence_match.group(1)[0]
                fence = None if fence == marker else marker if fence is None else fence
                continue
            if fence:
                continue

            heading_match = ATX_HEADING_PATTERN.match(line)
            if not heading_match:
                continue
            heading = clean_heading_text(heading_match.group(2))
            anchor = unique_anchor(mkdocs_slug(heading), used)
            headings.setdefault(heading_lookup_key(heading), anchor)
        index[relative] = headings
    return index


def build_vault_index() -> tuple[
    list[Path],
    list[Path],
    dict[str, Path],
    dict[str, list[Path]],
    dict[str, Path],
    dict[str, list[Path]],
]:
    files = sorted(path for path in SRC.rglob("*") if path.is_file() and should_copy(path))
    note_paths = [path.relative_to(SRC) for path in files if path.suffix.lower() == ".md"]
    asset_paths = [path.relative_to(SRC) for path in files if path.suffix.lower() != ".md"]

    notes_exact = {note_key(path): path for path in note_paths}
    notes_by_stem: dict[str, list[Path]] = defaultdict(list)
    for path in note_paths:
        notes_by_stem[path.stem.casefold()].append(path)

    assets_exact = {asset_key(path): path for path in asset_paths}
    assets_by_name: dict[str, list[Path]] = defaultdict(list)
    for path in asset_paths:
        assets_by_name[path.name.casefold()].append(path)

    return note_paths, asset_paths, notes_exact, notes_by_stem, assets_exact, assets_by_name


def choose_candidate(candidates: list[Path], current: Path) -> Path | None:
    if len(candidates) == 1:
        return candidates[0]
    local = [candidate for candidate in candidates if candidate.parent == current.parent]
    return local[0] if len(local) == 1 else None


def resolve_note(
    target: str,
    current: Path,
    notes_exact: dict[str, Path],
    notes_by_stem: dict[str, list[Path]],
) -> Path | None:
    normalized = normalize_vault_path(target)
    root_match = notes_exact.get(note_key(normalized))
    if root_match:
        return root_match

    local_path = normalize_vault_path((PurePosixPath(current.parent.as_posix()) / normalized).as_posix())
    local_match = notes_exact.get(note_key(local_path))
    if local_match:
        return local_match

    stem = PurePosixPath(normalized).stem.casefold()
    return choose_candidate(notes_by_stem.get(stem, []), current)


def resolve_asset(
    target: str,
    current: Path,
    assets_exact: dict[str, Path],
    assets_by_name: dict[str, list[Path]],
) -> Path | None:
    normalized = normalize_vault_path(target)
    root_match = assets_exact.get(asset_key(normalized))
    if root_match:
        return root_match

    local_path = normalize_vault_path((PurePosixPath(current.parent.as_posix()) / normalized).as_posix())
    local_match = assets_exact.get(asset_key(local_path))
    if local_match:
        return local_match

    return choose_candidate(assets_by_name.get(PurePosixPath(normalized).name.casefold(), []), current)


def relative_link(current: Path, target: Path) -> str:
    path = os.path.relpath(target, current.parent).replace(os.sep, "/")
    return path.replace("%", "%25").replace(" ", "%20").replace("(", "%28").replace(")", "%29")


def link_label(value: str) -> str:
    return value.replace("\\", "\\\\").replace("]", "\\]")


def convert_wikilinks(
    markdown: str,
    current: Path,
    notes_exact: dict[str, Path],
    notes_by_stem: dict[str, list[Path]],
    assets_exact: dict[str, Path],
    assets_by_name: dict[str, list[Path]],
    heading_index: dict[Path, dict[str, str]],
    stats: dict[str, int],
    unresolved: list[str],
) -> str:
    def replace(match: re.Match[str]) -> str:
        original = match.group(0)
        embed = bool(match.group(1))
        body = match.group(2).strip()
        target_and_heading, alias = (body.split("|", 1) + [""])[:2]
        target, heading = (target_and_heading.split("#", 1) + [""])[:2]
        target = target.strip()
        heading = heading.strip()
        alias = alias.strip()

        if embed:
            asset = resolve_asset(target, current, assets_exact, assets_by_name)
            if not asset:
                unresolved.append(f"{current.as_posix()}: {original}")
                stats["unresolved"] += 1
                return original
            alt = alias if alias and not alias.isdigit() else asset.stem
            stats["embeds"] += 1
            return f"![{link_label(alt)}]({relative_link(current, asset)})"

        note = current if not target else resolve_note(target, current, notes_exact, notes_by_stem)
        if note:
            href = "" if not target else relative_link(current, note)
            if heading:
                anchor = heading_index.get(note, {}).get(heading_lookup_key(heading))
                if not anchor:
                    anchor = mkdocs_slug(clean_heading_text(heading))
                href += f"#{anchor}"
                stats["anchors"] += 1
            label = alias or (heading if not target and heading else Path(target).stem or heading)
            stats["notes"] += 1
            return f"[{link_label(label)}]({href})"

        asset = resolve_asset(target, current, assets_exact, assets_by_name)
        if asset:
            label = alias or asset.name
            stats["assets"] += 1
            return f"[{link_label(label)}]({relative_link(current, asset)})"

        unresolved.append(f"{current.as_posix()}: {original}")
        stats["unresolved"] += 1
        return original

    return WIKILINK_PATTERN.sub(replace, markdown)


def convert_obsidian_callouts(markdown: str, stats: dict[str, int]) -> str:
    """将 Obsidian 的 > [!type] Callout 转为 MkDocs admonition。"""
    lines = markdown.splitlines()
    converted: list[str] = []
    index = 0

    while index < len(lines):
        start = CALLOUT_START_PATTERN.match(lines[index])
        if not start:
            converted.append(lines[index])
            index += 1
            continue

        indent = start.group("indent")
        kind = CALLOUT_KIND_MAP.get(start.group("kind").casefold(), start.group("kind").casefold())
        title = start.group("title").strip()
        escaped_title = title.replace('"', '\\"')
        declaration = f'{indent}!!! {kind}'
        if escaped_title:
            declaration += f' "{escaped_title}"'
        converted.append(declaration)
        index += 1

        body_found = False
        while index < len(lines):
            body = CALLOUT_BODY_PATTERN.match(lines[index])
            if not body:
                break
            body_text = body.group("body")
            converted.append(f"{indent}    {body_text}" if body_text else "")
            body_found = True
            index += 1

        if not body_found:
            converted.append(f'{indent}    <span aria-hidden="true"></span>')
        stats["callouts"] += 1

    result = "\n".join(converted)
    return result + ("\n" if markdown.endswith("\n") else "")


def copy_vault() -> tuple[list[Path], int, dict[str, int], list[str]]:
    if STAGING_ROOT.exists():
        shutil.rmtree(STAGING_ROOT)
    STAGING_ROOT.mkdir(parents=True)

    (
        note_paths,
        asset_paths,
        notes_exact,
        notes_by_stem,
        assets_exact,
        assets_by_name,
    ) = build_vault_index()
    heading_index = build_heading_index(note_paths)
    stats = {
        "notes": 0,
        "anchors": 0,
        "embeds": 0,
        "assets": 0,
        "callouts": 0,
        "unresolved": 0,
    }
    unresolved: list[str] = []

    for relative in [*note_paths, *asset_paths]:
        source = SRC / relative
        target = STAGING_ROOT / relative
        target.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(source, target)

    for relative in note_paths:
        target = STAGING_ROOT / relative
        original = target.read_text(encoding="utf-8")
        cleaned = clean_skipped_wikilinks(original)
        converted = convert_wikilinks(
            cleaned,
            relative,
            notes_exact,
            notes_by_stem,
            assets_exact,
            assets_by_name,
            heading_index,
            stats,
            unresolved,
        )
        converted = convert_obsidian_callouts(converted, stats)
        target.write_text(converted, encoding="utf-8")

    return note_paths, len(asset_paths), stats, unresolved


def extract_note_title(path: Path) -> str:
    for line in path.read_text(encoding="utf-8").splitlines():
        match = ATX_HEADING_PATTERN.match(line)
        if match and len(match.group(1)) == 1:
            return clean_heading_text(match.group(2))
    return path.stem


def generate_note_navigation(note_paths: list[Path]) -> None:
    grouped: dict[Path, list[Path]] = defaultdict(list)
    for relative in note_paths:
        grouped[relative.parent].append(relative)

    for siblings in grouped.values():
        siblings.sort(key=lambda path: path.name.casefold())
        if len(siblings) < 2:
            continue
        titles = {path: extract_note_title(STAGING_ROOT / path) for path in siblings}

        for index, current in enumerate(siblings):
            links: list[str] = []
            if index > 0:
                previous = siblings[index - 1]
                links.append(
                    f"← 上一篇：[{link_label(titles[previous])}]({relative_link(current, previous)})"
                )
            if index + 1 < len(siblings):
                following = siblings[index + 1]
                links.append(
                    f"下一篇：[{link_label(titles[following])}]({relative_link(current, following)}) →"
                )

            path = STAGING_ROOT / current
            content = NAV_PATTERN.sub("\n", path.read_text(encoding="utf-8")).rstrip()
            navigation = (
                f"\n\n{NAV_START}\n---\n> {' · '.join(links)}\n{NAV_END}\n"
            )
            path.write_text(content + navigation, encoding="utf-8")


def visible_subdirectories(directory: Path) -> list[Path]:
    return sorted(
        child
        for child in directory.iterdir()
        if child.is_dir()
        and child.name.lower() != "attachments"
        and any(child.rglob("*.md"))
    )


def write_directory_index(directory: Path, title: str) -> None:
    markdown_files = sorted(
        path for path in directory.glob("*.md") if path.name.lower() != "index.md"
    )
    subdirectories = visible_subdirectories(directory)
    lines = [f"# {title}", ""]

    if subdirectories:
        lines.extend(["## 分类", ""])
        for child in subdirectories:
            note_count = sum(
                1 for note in child.rglob("*.md") if note.name.lower() != "index.md"
            )
            lines.append(f"- [{child.name}]({child.name}/index.md) · {note_count} 篇")
        lines.append("")

    if markdown_files:
        section_title = "创业启程" if title == "大学课程学习" else "笔记"
        lines.extend([f"## {section_title}", ""])
        for note in markdown_files:
            lines.append(f"- [{note.stem}]({note.name})")
        lines.append("")

    if not subdirectories and not markdown_files:
        lines.extend(["暂无笔记。", ""])

    (directory / "index.md").write_text("\n".join(lines), encoding="utf-8")


def parse_frontmatter(markdown: str) -> tuple[dict[str, str], list[str], str]:
    if not markdown.startswith("---\n"):
        return {}, [], markdown
    boundary = markdown.find("\n---\n", 4)
    if boundary < 0:
        return {}, [], markdown

    fields: dict[str, str] = {}
    tags: list[str] = []
    active_list = ""
    for line in markdown[4:boundary].splitlines():
        key_match = re.match(r"^([A-Za-z][\w-]*):\s*(.*)$", line)
        if key_match:
            key, value = key_match.groups()
            active_list = key if not value else ""
            if value:
                fields[key] = value.strip().strip("\"'")
            continue
        item_match = re.match(r"^\s+-\s+(.+?)\s*$", line)
        if active_list == "tags" and item_match:
            tags.append(item_match.group(1).strip().strip("\"'"))
    return fields, tags, markdown[boundary + 5 :]


def estimate_reading_minutes(markdown: str) -> int:
    text = re.sub(r"```.*?```|~~~.*?~~~", " ", markdown, flags=re.DOTALL)
    text = re.sub(r"!\[[^]]*]\([^)]*\)", " ", text)
    text = re.sub(r"\[([^]]+)]\([^)]*\)", r"\1", text)
    text = re.sub(r"<[^>]+>", " ", text)
    chinese = len(re.findall(r"[\u3400-\u4dbf\u4e00-\u9fff]", text))
    latin = len(re.findall(r"\b[A-Za-z0-9][A-Za-z0-9_+-]*\b", text))
    return max(1, math.ceil((chinese + latin * 2) / 400))


def collect_note_catalog(note_paths: list[Path]) -> list[dict[str, object]]:
    catalog: list[dict[str, object]] = []
    for relative in note_paths:
        markdown = (STAGING_ROOT / relative).read_text(encoding="utf-8")
        fields, tags, body = parse_frontmatter(markdown)
        updated = fields.get("updated") or fields.get("created")
        if not updated or not re.fullmatch(r"\d{4}-\d{2}-\d{2}", updated):
            updated = datetime.fromtimestamp((STAGING_ROOT / relative).stat().st_mtime).strftime("%Y-%m-%d")
        title = fields.get("title") or extract_note_title(STAGING_ROOT / relative)
        category = relative.parts[0] if len(relative.parts) > 1 else "未分类"
        if len(relative.parts) > 2:
            subgroup = relative.parts[1]
            subgroup_href = f"{category}/{subgroup}/"
        elif category == "大学课程学习" and "创业启程" in title:
            subgroup = "创业启程"
            subgroup_href = f"{relative.with_suffix('').as_posix()}/"
        else:
            subgroup = "未分类"
            subgroup_href = f"{relative.with_suffix('').as_posix()}/"

        catalog.append(
            {
                "path": relative,
                "title": title,
                "category": category,
                "subgroup": subgroup,
                "subgroup_href": subgroup_href,
                "updated": updated,
                "minutes": estimate_reading_minutes(body),
                "tags": tags,
            }
        )
    return catalog


def note_web_href(relative: Path) -> str:
    return f"{relative.with_suffix('').as_posix()}/"


def render_note_row(note: dict[str, object], recent: bool = False) -> str:
    title = html.escape(str(note["title"]))
    category = html.escape(str(note["category"]))
    subgroup = html.escape(str(note["subgroup"]))
    updated = html.escape(str(note["updated"]))
    tags = " ".join(str(tag) for tag in note["tags"])
    search_text = html.escape(f"{title} {category} {subgroup} {tags}".casefold(), quote=True)
    attributes = "" if recent else (
        f' data-note-entry data-category="{category}" data-search="{search_text}"'
    )
    return (
        f'<a class="note-row" href="{html.escape(note_web_href(note["path"]), quote=True)}"{attributes}>'
        '<span class="note-row__main">'
        f'<strong>{title}</strong><small>{category} · {subgroup}</small>'
        '</span><span class="note-row__meta">'
        f'<time datetime="{updated}">{updated.replace("-", ".")}</time>'
        f'<small>{int(note["minutes"])} 分钟</small></span>'
        '<span class="note-row__arrow" aria-hidden="true">→</span></a>'
    )


def write_notes_index(note_paths: list[Path]) -> list[dict[str, object]]:
    catalog = collect_note_catalog(note_paths)
    preferred_categories = ["工科学习", "大学课程学习", "运动"]
    available_categories = {str(note["category"]) for note in catalog}
    category_order = [category for category in preferred_categories if category in available_categories]
    category_order.extend(
        sorted(available_categories - set(category_order), key=str.casefold)
    )
    order = {category: index for index, category in enumerate(category_order)}
    catalog.sort(key=lambda note: (order.get(str(note["category"]), 99), str(note["title"]).casefold()))
    recent = sorted(
        catalog,
        key=lambda note: (str(note["updated"]), str(note["title"]).casefold()),
        reverse=True,
    )[:5]

    category_groups: list[str] = []
    subgroup_total = 0
    for index, category in enumerate(category_order, 1):
        notes = [note for note in catalog if note["category"] == category]
        if not notes:
            continue
        subgroups: dict[str, dict[str, object]] = {}
        for note in notes:
            subgroup = str(note["subgroup"])
            if subgroup not in subgroups:
                subgroups[subgroup] = {"count": 0, "href": str(note["subgroup_href"])}
            subgroups[subgroup]["count"] = int(subgroups[subgroup]["count"]) + 1
        subgroup_total += len(subgroups)
        subgroup_rows = []
        for subgroup, details in sorted(subgroups.items(), key=lambda item: item[0].casefold()):
            href = str(details["href"])
            count = int(details["count"])
            subgroup_rows.append(
                f'<li><a href="{html.escape(href, quote=True)}">{html.escape(subgroup)}</a>'
                f'<span>{count} 篇</span></li>'
            )
        category_groups.append(
            '<article class="note-group">'
            f'<a class="note-group__title" href="{html.escape(category, quote=True)}/">'
            f'<span><small>{index:02d}</small><strong>{html.escape(category)}</strong></span>'
            f'<b>{len(notes)} 篇</b><i aria-hidden="true">→</i></a>'
            f'<ul>{"".join(subgroup_rows)}</ul></article>'
        )

    filter_buttons = ['<button class="is-active" type="button" data-note-filter="all" aria-pressed="true">全部</button>']
    for category in category_order:
        count = sum(1 for note in catalog if note["category"] == category)
        if count:
            filter_buttons.append(
                f'<button type="button" data-note-filter="{html.escape(category, quote=True)}" '
                f'aria-pressed="false">{html.escape(category)} <span>{count}</span></button>'
            )

    latest = max((str(note["updated"]) for note in catalog), default="—")
    lines = [
        '<section class="note-index" data-notes-hub>',
        '  <header class="note-index__header">',
        '    <div><p>个人知识库</p><h1>笔记</h1><span>课程复习与工程实践，按主题整理。</span></div>',
        '    <div class="note-index__summary">',
        f'      <span><b>{len(catalog)}</b> 篇笔记</span><i></i>',
        f'      <span><b>{subgroup_total}</b> 个分类</span><i></i>',
        f'      <span>更新于 <time datetime="{html.escape(latest)}">{html.escape(latest).replace("-", ".")}</time></span>',
        '    </div>',
        '  </header>',
        '  <div class="note-index__overview">',
        '    <section class="note-index__section" aria-labelledby="note-categories-title">',
        '      <header><h2 id="note-categories-title">分类</h2><span>按主题进入</span></header>',
        f'      <div class="note-index__groups">{"".join(category_groups)}</div>',
        '    </section>',
        '    <section class="note-index__section" aria-labelledby="note-recent-title">',
        '      <header><h2 id="note-recent-title">最近更新</h2><span>最新 5 篇</span></header>',
        f'      <div class="note-index__recent">{"".join(render_note_row(note, True) for note in recent)}</div>',
        '    </section>',
        '  </div>',
        '  <section class="note-index__section note-index__library" aria-labelledby="note-library-title">',
        '    <header><h2 id="note-library-title">全部笔记</h2><span><b data-note-count>' + str(len(catalog)) + '</b> 篇</span></header>',
        '    <div class="note-index__tools">',
        '      <label><span class="sr-only">搜索笔记</span><input type="search" data-note-search placeholder="搜索标题、分类或标签" autocomplete="off"></label>',
        f'      <div class="note-index__filters" aria-label="按分类筛选">{"".join(filter_buttons)}</div>',
        '      <label class="note-index__sort"><span>排序</span><select data-note-sort aria-label="笔记排序方式"><option value="updated">最近更新</option><option value="title">标题</option><option value="duration">阅读时长</option></select></label>',
        '    </div>',
        f'    <div class="note-index__list">{"".join(render_note_row(note) for note in catalog)}</div>',
        '    <div class="note-index__more" data-note-pagination hidden><button type="button" data-note-more><span>继续加载</span><small data-note-range>已显示 10 / ' + str(len(catalog)) + '</small></button></div>',
        '    <p class="note-index__empty" data-note-empty hidden>没有找到匹配的笔记。</p>',
        '  </section>',
        '</section>',
        '',
    ]
    (STAGING_ROOT / "index.md").write_text("\n".join(lines), encoding="utf-8")
    return catalog


def write_content_manifest(catalog: list[dict[str, object]]) -> None:
    categories: dict[str, int] = defaultdict(int)
    for note in catalog:
        categories[str(note["category"])] += 1
    payload = {
        "version": 1,
        "note_count": len(catalog),
        "latest_updated": max((str(note["updated"]) for note in catalog), default=None),
        "categories": dict(sorted(categories.items())),
        "notes": [
            {
                "path": note["path"].as_posix(),
                "title": note["title"],
                "category": note["category"],
                "subgroup": note["subgroup"],
                "updated": note["updated"],
                "reading_minutes": note["minutes"],
                "tags": note["tags"],
            }
            for note in sorted(catalog, key=lambda item: item["path"].as_posix().casefold())
        ],
    }
    (STAGING_ROOT / MANIFEST_NAME).write_text(
        json.dumps(payload, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )


def generate_indexes() -> list[dict[str, object]]:
    for directory in sorted(
        (path for path in STAGING_ROOT.rglob("*") if path.is_dir()),
        key=lambda path: len(path.parts),
        reverse=True,
    ):
        if directory.name.lower() == "attachments":
            continue
        if any(directory.rglob("*.md")):
            write_directory_index(directory, directory.name)

    note_paths = sorted(
        path.relative_to(STAGING_ROOT)
        for path in STAGING_ROOT.rglob("*.md")
        if path.name.lower() != "index.md"
    )
    catalog = write_notes_index(note_paths)
    write_content_manifest(catalog)
    return catalog


def replace_notes_tree() -> None:
    if NOTES_ROOT.exists():
        shutil.rmtree(NOTES_ROOT)
    try:
        STAGING_ROOT.replace(NOTES_ROOT)
    except PermissionError:
        shutil.copytree(STAGING_ROOT, NOTES_ROOT)
        shutil.rmtree(STAGING_ROOT)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="同步 Obsidian 笔记到 MkDocs。")
    parser.add_argument(
        "--source",
        type=Path,
        default=SRC,
        help="Obsidian 仓库目录（默认读取 OBSIDIAN_VAULT 或本机默认路径）。",
    )
    parser.add_argument(
        "--docs-root",
        type=Path,
        default=DOCS_ROOT,
        help="MkDocs docs 目录。",
    )
    return parser.parse_args()


def configure_paths(source: Path, docs_root: Path) -> None:
    global SRC, DOCS_ROOT, NOTES_ROOT, STAGING_ROOT
    SRC = source.expanduser().resolve()
    DOCS_ROOT = docs_root.expanduser().resolve()
    NOTES_ROOT = DOCS_ROOT / "notes"
    STAGING_ROOT = DOCS_ROOT / ".notes-import-staging"


def main() -> None:
    args = parse_args()
    configure_paths(args.source, args.docs_root)
    validate_paths()
    note_paths, asset_count, stats, unresolved = copy_vault()
    generate_note_navigation(note_paths)
    catalog = generate_indexes()

    if unresolved:
        print("以下 Obsidian 链接无法解析：", file=sys.stderr)
        for item in unresolved:
            print(f"- {item}", file=sys.stderr)
        fail("导入已停止；原网站笔记未被替换。")

    replace_notes_tree()
    print(f"同步完成：{len(note_paths)} 篇笔记，{asset_count} 个附件。")
    print(
        "已转换："
        f"{stats['notes']} 个笔记链接，"
        f"{stats['anchors']} 个标题锚点，"
        f"{stats['embeds']} 个图片嵌入，"
        f"{stats['assets']} 个附件链接，"
        f"{stats['callouts']} 个提示框。"
    )
    print(f"目标目录：{NOTES_ROOT}")
    print(
        f"内容清单：{len(catalog)} 篇，"
        f"最近更新 {max((str(note['updated']) for note in catalog), default='—')}。"
    )


if __name__ == "__main__":
    main()
