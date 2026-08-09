#!/usr/bin/env python3
"""将 Obsidian 笔记库同步到 MkDocs，并转换双链、附件和文章导航。"""

from __future__ import annotations

import html
import os
import posixpath
import re
import shutil
import sys
import unicodedata
from collections import defaultdict
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

    write_directory_index(STAGING_ROOT, "笔记")


def replace_notes_tree() -> None:
    if NOTES_ROOT.exists():
        shutil.rmtree(NOTES_ROOT)
    STAGING_ROOT.replace(NOTES_ROOT)


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
