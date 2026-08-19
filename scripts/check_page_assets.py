#!/usr/bin/env python3
"""Validate that generated pages only load the CSS and JavaScript they need."""

from __future__ import annotations

import argparse
from collections import Counter
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import urlparse


CSS_BUNDLES = {
    "core.css",
    "home.css",
    "friends.css",
    "notes.css",
    "not-found.css",
    "comments.css",
    "play.css",
    "workshop.css",
    "daily.css",
    "store.css",
    "admin-comments.css",
}

JS_BUNDLES = {
    "site-v4.js",
    "notes-hub.js",
    "supabase-config.js",
    "admin-auth.js",
    "security.js",
    "daily.js",
    "comments.js",
    "admin-comments.js",
    "game-loader.js",
    "workshop.js",
    "not-found-game-v3.js",
}

GLOBAL_JS = {"site-v4.js", "supabase-config.js", "admin-auth.js"}
MAX_PAGE_CSS_BYTES = 60 * 1024
MAX_PAGE_JS_BYTES = 60 * 1024


class AssetParser(HTMLParser):
    def __init__(self) -> None:
        super().__init__()
        self.stylesheets: set[str] = set()
        self.scripts: set[str] = set()

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        values = dict(attrs)
        if tag == "link" and "stylesheet" in (values.get("rel") or "").split():
            self.stylesheets.add(Path(urlparse(values.get("href") or "").path).name)
        elif tag == "script" and values.get("src"):
            self.scripts.add(Path(urlparse(values["src"]).path).name)


def page_kind(relative: Path) -> str:
    parts = relative.parts
    if relative.as_posix() == "index.html":
        return "home"
    if relative.as_posix() == "404.html":
        return "not-found"
    if parts[:2] == ("notes", "index.html"):
        return "notes"
    if parts and parts[0] == "notes":
        return "note"
    if parts[:2] == ("daily", "index.html"):
        return "daily"
    if parts[:2] == ("play", "index.html"):
        return "play"
    if parts[:3] == ("play", "workshop", "index.html"):
        return "workshop"
    if parts[:2] == ("store", "index.html"):
        return "store"
    if parts[:2] == ("friends", "index.html"):
        return "friends"
    if parts[:3] == ("admin", "comments", "index.html"):
        return "admin-comments"
    return "core"


def expected_assets(kind: str) -> tuple[set[str], set[str]]:
    if kind == "not-found":
        return {"not-found.css"}, {"not-found-game-v3.js"}
    css = {"core.css"}
    scripts = set(GLOBAL_JS)
    if kind == "home":
        css.add("home.css")
    elif kind == "notes":
        css.add("notes.css")
        scripts.add("notes-hub.js")
    elif kind == "note":
        css.add("comments.css")
        scripts.update({"security.js", "comments.js"})
    elif kind == "daily":
        css.update({"daily.css", "comments.css"})
        scripts.update({"security.js", "daily.js", "comments.js"})
    elif kind == "play":
        css.add("play.css")
        scripts.update({"security.js", "game-loader.js"})
    elif kind == "workshop":
        css.add("workshop.css")
        scripts.update({"security.js", "workshop.js"})
    elif kind == "store":
        css.add("store.css")
    elif kind == "friends":
        css.add("friends.css")
    elif kind == "admin-comments":
        css.add("admin-comments.css")
        scripts.add("admin-comments.js")
    return css, scripts


def bundle_bytes(site_dir: Path, folder: str, names: set[str]) -> int:
    total = 0
    for name in names:
        asset = site_dir / "assets" / folder / name
        if not asset.is_file():
            raise FileNotFoundError(f"Missing generated asset: {asset}")
        total += asset.stat().st_size
    return total


def validate(site_dir: Path) -> None:
    html_files = sorted(site_dir.rglob("*.html"))
    if not html_files:
        raise RuntimeError(f"No generated HTML found below {site_dir}")

    failures: list[str] = []
    kinds: Counter[str] = Counter()
    maxima = {"css": (0, ""), "js": (0, "")}

    for html_file in html_files:
        relative = html_file.relative_to(site_dir)
        kind = page_kind(relative)
        kinds[kind] += 1
        parser = AssetParser()
        parser.feed(html_file.read_text(encoding="utf-8"))
        actual_css = parser.stylesheets & CSS_BUNDLES
        actual_js = parser.scripts & JS_BUNDLES
        expected_css, expected_js = expected_assets(kind)

        if actual_css != expected_css:
            failures.append(
                f"{relative}: CSS expected {sorted(expected_css)}, got {sorted(actual_css)}"
            )
        if actual_js != expected_js:
            failures.append(
                f"{relative}: JS expected {sorted(expected_js)}, got {sorted(actual_js)}"
            )

        try:
            css_bytes = bundle_bytes(site_dir, "stylesheets", actual_css)
            js_bytes = bundle_bytes(site_dir, "javascripts", actual_js)
        except FileNotFoundError as error:
            failures.append(str(error))
            continue

        if css_bytes > maxima["css"][0]:
            maxima["css"] = (css_bytes, relative.as_posix())
        if js_bytes > maxima["js"][0]:
            maxima["js"] = (js_bytes, relative.as_posix())
        if css_bytes > MAX_PAGE_CSS_BYTES:
            failures.append(f"{relative}: custom CSS is {css_bytes} bytes (budget {MAX_PAGE_CSS_BYTES})")
        if js_bytes > MAX_PAGE_JS_BYTES:
            failures.append(f"{relative}: local custom JS is {js_bytes} bytes (budget {MAX_PAGE_JS_BYTES})")

    if (site_dir / "assets" / "stylesheets" / "theme-v2.css").exists():
        failures.append("Legacy monolithic theme-v2.css is still present in the generated site")

    if failures:
        raise RuntimeError("Page asset validation failed:\n- " + "\n- ".join(failures))

    kind_summary = ", ".join(f"{name}={count}" for name, count in sorted(kinds.items()))
    print(f"Page assets OK: {len(html_files)} HTML pages ({kind_summary})")
    print(f"Largest custom CSS payload: {maxima['css'][0]} bytes ({maxima['css'][1]})")
    print(f"Largest local custom JS payload: {maxima['js'][0]} bytes ({maxima['js'][1]})")


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--site-dir", type=Path, default=Path("site"))
    args = parser.parse_args()
    validate(args.site_dir.resolve())


if __name__ == "__main__":
    main()
