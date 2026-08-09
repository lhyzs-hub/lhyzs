#!/usr/bin/env python3
"""将 Obsidian 笔记库同步到 MkDocs，并转换双链、附件和文章导航。"""

from __future__ import annotations

import html
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


SRC = Path("D:/obsidian/repositiries/note")
DOCS_ROOT = Path("D:/个人网站/docs")
NOTES_ROOT = DOCS_ROOT / "notes"
STAGING_ROOT = DOCS_ROOT / ".notes-import-staging"

SKIPPED_SUFFIXES = {".base"}
SKIPPED_DIRS = {".obsidian", ".trash"}
SKIPPED_NOTE_NAMES = {"电路设计索引.md", "知识库首页.md", "迁移记录.md"}
SKIPPED_NOTE_STEMS = {Path(name).stem for name in SKIPPED_NOTE_NAMES}
SKIPPED_WIKILINK_PATTERN = re.compile(
    r"!?\[\[(?:"
    + "|".join(re.escape(name) for name in sorted(SKIPPED_NOTE_STEMS))
    + r")(?:[#|][^\]]*)?\]\]"
)
WIKILINK_PATTERN = re.compile(r"(!?)\[\[([^\[\]\n]+)\]\]")
ATX_HEADING_PATTERN = re.compile(r"^(#{1,6})\s+(.+?)\s*#*\s*$")
FENCE_PATTERN = re.compile(r"^\s*(`{3,}|~{3,})")
NAV_START = "<!-- lhyzs-note-nav:start -->"
NAV_END = "<!-- lhyzs-note-nav:end -->"
NAV_PATTERN = re.compile(
    rf"\n*{re.escape(NAV_START)}.*?{re.escape(NAV_END)}\n*",
    re.DOTALL,
)


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
    stats = {"notes": 0, "anchors": 0, "embeds": 0, "assets": 0, "unresolved": 0}
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
        lines.extend(["## 笔记", ""])
        for note in markdown_files:
            lines.append(f"- [{note.stem}]({note.name})")
        lines.append("")

    if not subdirectories and not markdown_files:
        lines.extend(["暂无笔记。", ""])

    (directory / "index.md").write_text("\n".join(lines), encoding="utf-8")


def parse_frontmatter(markdown: str) -> tuple[dict[str, str], list[str], str]:
    """读取首页需要的少量 YAML 字段，不引入额外依赖。"""
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


def note_reading_minutes(markdown: str) -> int:
    """以中文 400 字/分钟估算，代码块不计入正文阅读时长。"""
    text = re.sub(r"```.*?```|~~~.*?~~~", " ", markdown, flags=re.DOTALL)
    text = re.sub(r"!\[[^]]*]\([^)]*\)", " ", text)
    text = re.sub(r"\[([^]]+)]\([^)]*\)", r"\1", text)
    text = re.sub(r"<[^>]+>", " ", text)
    cjk_count = len(re.findall(r"[\u3400-\u4dbf\u4e00-\u9fff]", text))
    latin_count = len(re.findall(r"\b[A-Za-z0-9][A-Za-z0-9_+-]*\b", text))
    return max(1, math.ceil((cjk_count + latin_count * 2) / 400))


def collect_note_catalog(note_paths: list[Path]) -> list[dict[str, object]]:
    catalog: list[dict[str, object]] = []
    for relative in note_paths:
        markdown = (STAGING_ROOT / relative).read_text(encoding="utf-8")
        fields, tags, body = parse_frontmatter(markdown)
        title = fields.get("title") or extract_note_title(STAGING_ROOT / relative)
        updated = fields.get("updated") or fields.get("created")
        if not updated or not re.fullmatch(r"\d{4}-\d{2}-\d{2}", updated):
            timestamp = (STAGING_ROOT / relative).stat().st_mtime
            updated = datetime.fromtimestamp(timestamp).strftime("%Y-%m-%d")

        parts = relative.parts
        category = parts[0] if len(parts) > 1 else "未分类"
        subgroup = parts[1] if len(parts) > 2 else "直属笔记"
        catalog.append(
            {
                "path": relative,
                "title": title,
                "updated": updated,
                "minutes": note_reading_minutes(body),
                "category": category,
                "subgroup": subgroup,
                "tags": tags,
            }
        )
    return catalog


def note_web_href(relative: Path) -> str:
    return f"{relative.with_suffix('').as_posix()}/"


def render_note_entry(note: dict[str, object], featured: bool = False) -> str:
    title = html.escape(str(note["title"]))
    href = html.escape(note_web_href(note["path"]), quote=True)
    category = html.escape(str(note["category"]))
    subgroup = html.escape(str(note["subgroup"]))
    updated = html.escape(str(note["updated"]))
    minutes = int(note["minutes"])
    tags = " ".join(str(tag) for tag in note["tags"])
    searchable = html.escape(f"{title} {category} {subgroup} {tags}".casefold(), quote=True)
    class_name = "notes-entry notes-entry--featured" if featured else "notes-entry"
    return (
        f'<a class="{class_name}" href="{href}" data-note-entry '
        f'data-category="{category}" data-search="{searchable}">'
        '<span class="notes-entry__marker" aria-hidden="true"></span>'
        '<span class="notes-entry__body">'
        f'<strong>{title}</strong><span>{category} / {subgroup}</span>'
        '</span>'
        '<span class="notes-entry__meta">'
        f'<time datetime="{updated}">{updated.replace("-", ".")}</time>'
        f'<span>{minutes} min</span>'
        '</span><span class="notes-entry__arrow" aria-hidden="true">↗</span></a>'
    )


def write_notes_hub_index(note_paths: list[Path]) -> None:
    catalog = collect_note_catalog(note_paths)
    catalog.sort(key=lambda note: (str(note["category"]), str(note["title"]).casefold()))
    recent = sorted(
        catalog,
        key=lambda note: (str(note["updated"]), str(note["title"]).casefold()),
        reverse=True,
    )[:5]

    category_order = ["工科学习", "大学课程学习"]
    category_copy = {
        "工科学习": ("ENGINEERING", "电子、机械、控制与计算机视觉"),
        "大学课程学习": ("COURSEWORK", "课程复习、试卷整理与知识归档"),
    }
    category_cards: list[str] = []
    for number, category in enumerate(category_order, 1):
        category_notes = [note for note in catalog if note["category"] == category]
        if not category_notes:
            continue
        subgroup_counts: dict[str, int] = defaultdict(int)
        for note in category_notes:
            subgroup_counts[str(note["subgroup"])] += 1
        english, description = category_copy[category]
        subgroup_links: list[str] = []
        for subgroup, count in sorted(subgroup_counts.items(), key=lambda item: item[0].casefold()):
            subgroup_href = f"{category}/" if subgroup == "直属笔记" else f"{category}/{subgroup}/"
            subgroup_links.append(
                f'<a href="{html.escape(subgroup_href, quote=True)}">'
                f'<span>{html.escape(subgroup)}</span><b>{count:02d}</b></a>'
            )
        category_cards.append(
            '<article class="notes-domain">'
            '<header><span class="notes-domain__number">'
            f'{number:02d}</span><span>{english}</span><b>{len(category_notes):02d} 篇</b></header>'
            f'<h2>{html.escape(category)}</h2><p>{html.escape(description)}</p>'
            f'<div class="notes-domain__subgroups">{"".join(subgroup_links)}</div>'
            f'<a class="notes-domain__enter" href="{html.escape(category, quote=True)}/">进入分类 <span>→</span></a>'
            '</article>'
        )

    category_buttons = ['<button type="button" class="is-active" data-note-filter="all" aria-pressed="true">全部</button>']
    for category in category_order:
        count = sum(1 for note in catalog if note["category"] == category)
        if count:
            category_buttons.append(
                f'<button type="button" data-note-filter="{html.escape(category, quote=True)}" '
                f'aria-pressed="false">{html.escape(category)} <span>{count}</span></button>'
            )

    latest_date = max((str(note["updated"]) for note in catalog), default="—")
    subcategory_count = len({(str(note["category"]), str(note["subgroup"])) for note in catalog})
    lines = [
        '<section class="notes-hub" data-notes-hub>',
        '  <header class="notes-hub__hero">',
        '    <div>',
        '      <p class="notes-hub__eyebrow"><i aria-hidden="true"></i> KNOWLEDGE ARCHIVE</p>',
        '      <h1>笔记</h1>',
        '      <p class="notes-hub__intro">把课程与工程实践整理成可检索、可继续生长的个人知识库。</p>',
        '    </div>',
        '    <dl class="notes-hub__stats">',
        f'      <div><dt>文档</dt><dd>{len(catalog):02d}</dd></div>',
        f'      <div><dt>子分类</dt><dd>{subcategory_count:02d}</dd></div>',
        f'      <div><dt>最近更新</dt><dd>{html.escape(latest_date).replace("-", ".")}</dd></div>',
        '    </dl>',
        '  </header>',
        '  <div class="notes-hub__rule" aria-hidden="true"><span></span></div>',
        '  <section class="notes-hub__section" aria-labelledby="notes-domains-title">',
        '    <div class="notes-hub__section-head"><div><span>01 / DOMAINS</span><h2 id="notes-domains-title">知识领域</h2></div><p>按学习场景进入</p></div>',
        f'    <div class="notes-domains">{"".join(category_cards)}</div>',
        '  </section>',
        '  <section class="notes-hub__section" aria-labelledby="notes-recent-title">',
        '    <div class="notes-hub__section-head"><div><span>02 / RECENT</span><h2 id="notes-recent-title">最近更新</h2></div><p>最新整理的 5 篇内容</p></div>',
        f'    <div class="notes-recent">{"".join(render_note_entry(note, True) for note in recent)}</div>',
        '  </section>',
        '  <section class="notes-hub__section notes-library" aria-labelledby="notes-library-title">',
        '    <div class="notes-hub__section-head"><div><span>03 / INDEX</span><h2 id="notes-library-title">全部笔记</h2></div><p><span data-note-count>' + str(len(catalog)) + '</span> 篇可见</p></div>',
        '    <div class="notes-library__tools">',
        '      <label class="notes-library__search"><span aria-hidden="true"></span><span class="sr-only">搜索笔记</span><input type="search" data-note-search placeholder="搜索标题、分类或标签" autocomplete="off"></label>',
        f'      <div class="notes-library__filters" aria-label="按领域筛选">{"".join(category_buttons)}</div>',
        '    </div>',
        f'    <div class="notes-library__list">{"".join(render_note_entry(note) for note in catalog)}</div>',
        '    <p class="notes-library__empty" data-note-empty hidden>没有匹配的笔记，换个关键词试试。</p>',
        '  </section>',
        '</section>',
        '',
    ]
    (STAGING_ROOT / "index.md").write_text("\n".join(lines), encoding="utf-8")


def generate_indexes() -> None:
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
    write_notes_hub_index(note_paths)


def replace_notes_tree() -> None:
    if NOTES_ROOT.exists():
        shutil.rmtree(NOTES_ROOT)
    try:
        STAGING_ROOT.replace(NOTES_ROOT)
    except PermissionError:
        # Windows 上 mkdocs serve 可能持有 docs 目录句柄，导致目录改名失败；
        # 此时回退到同盘复制，完整发布后再清理临时目录。
        shutil.copytree(STAGING_ROOT, NOTES_ROOT)
        shutil.rmtree(STAGING_ROOT)


def main() -> None:
    validate_paths()
    note_paths, asset_count, stats, unresolved = copy_vault()
    generate_note_navigation(note_paths)
    generate_indexes()

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
        f"{stats['assets']} 个附件链接。"
    )
    print(f"目标目录：{NOTES_ROOT}")


if __name__ == "__main__":
    main()
