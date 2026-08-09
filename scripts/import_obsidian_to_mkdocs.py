#!/usr/bin/env python3
"""将 Obsidian 笔记库同步到 MkDocs，保留分类目录和附件相对路径。"""

from __future__ import annotations

import shutil
import sys
import re
from pathlib import Path


SRC = Path("D:/obsidian/repositiries/note")
DOCS_ROOT = Path("D:/个人网站/docs")
NOTES_ROOT = DOCS_ROOT / "notes"
STAGING_ROOT = DOCS_ROOT / ".notes-import-staging"

SKIPPED_SUFFIXES = {".base"}
SKIPPED_DIRS = {".obsidian", ".trash"}
SKIPPED_NOTE_NAMES = {"电路设计索引.md", "知识库首页.md", "迁移记录.md"}
SKIPPED_NOTE_STEMS = {Path(name).stem for name in SKIPPED_NOTE_NAMES}
SKIPPED_WIKILINK_PATTERN = re.compile(
    r"\[\[(?:"
    + "|".join(re.escape(name) for name in sorted(SKIPPED_NOTE_STEMS))
    + r")(?:[#|][^\]]*)?\]\]"
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


def remove_skipped_wikilinks(markdown_file: Path) -> None:
    """从网站副本移除指向未发布管理页的 Obsidian 双链。"""
    original = markdown_file.read_text(encoding="utf-8")
    cleaned_lines: list[str] = []

    for line in original.splitlines():
        cleaned = SKIPPED_WIKILINK_PATTERN.sub("", line)
        cleaned = re.sub(r"\s*·\s*·\s*", " · ", cleaned)
        cleaned = re.sub(r"^([>\s]*)(?:·\s*)+", r"\1", cleaned)
        cleaned = re.sub(r"\s*·\s*$", "", cleaned).rstrip()
        if cleaned.strip() in {"-", "*", "+"}:
            continue
        cleaned_lines.append(cleaned)

    cleaned_text = "\n".join(cleaned_lines)
    if original.endswith("\n"):
        cleaned_text += "\n"
    markdown_file.write_text(cleaned_text, encoding="utf-8")


def copy_vault() -> tuple[int, int]:
    if STAGING_ROOT.exists():
        shutil.rmtree(STAGING_ROOT)
    STAGING_ROOT.mkdir(parents=True)

    notes = 0
    assets = 0

    for source_file in sorted(path for path in SRC.rglob("*") if path.is_file()):
        if not should_copy(source_file):
            continue

        relative = source_file.relative_to(SRC)
        target = STAGING_ROOT / relative
        target.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(source_file, target)

        if source_file.suffix.lower() == ".md":
            remove_skipped_wikilinks(target)
            notes += 1
        else:
            assets += 1

    return notes, assets


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
    notes, assets = copy_vault()
    generate_indexes()
    replace_notes_tree()
    print(f"同步完成：{notes} 篇笔记，{assets} 个附件。")
    print(f"目标目录：{NOTES_ROOT}")


if __name__ == "__main__":
    main()
