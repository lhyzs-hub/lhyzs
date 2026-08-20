"""Convert published site images to compact, browser-native formats."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

from PIL import Image, ImageOps


ROOT = Path(__file__).resolve().parents[1]
IMAGE_DIR = ROOT / "docs" / "assets" / "images"
DAILY_DATA = ROOT / "docs" / "daily" / "qzone.json"
DAILY_MANIFEST = ROOT / "docs" / "daily" / "photo-manifest.json"

STATIC_WEBP_ASSETS = (
    (IMAGE_DIR / "game" / "winter-day-background.png", 86, False),
    (IMAGE_DIR / "game" / "winter-night-cave-background.png", 86, False),
    (IMAGE_DIR / "game" / "daisy-run-spritesheet-v2.png", None, True),
    (IMAGE_DIR / "game" / "yuumi-winter-spritesheet-v2.png", None, True),
    (IMAGE_DIR / "search-easter-egg-beauty.jpg", 86, False),
)


def ensure_managed(path: Path) -> Path:
    resolved = path.resolve()
    resolved.relative_to(IMAGE_DIR.resolve())
    return resolved


def save_webp(source: Path, quality: int | None, lossless: bool) -> Path:
    source = ensure_managed(source)
    destination = source.with_suffix(".webp")
    if not source.exists():
        if destination.exists():
            return destination
        raise FileNotFoundError(source)

    temporary = destination.with_suffix(".webp.tmp")
    with Image.open(source) as raw_image:
        image = ImageOps.exif_transpose(raw_image)
        if image.mode not in {"RGB", "RGBA"}:
            image = image.convert("RGBA" if "transparency" in image.info else "RGB")
        options: dict[str, int | bool] = {"method": 6, "lossless": lossless}
        if quality is not None:
            options["quality"] = quality
        image.save(temporary, format="WEBP", **options)

    if temporary.stat().st_size >= source.stat().st_size:
        temporary.unlink()
        raise RuntimeError(f"Optimized asset is not smaller: {source}")
    temporary.replace(destination)
    source.unlink()
    return destination


def resize_png(source: Path, maximum: tuple[int, int]) -> int:
    source = ensure_managed(source)
    with Image.open(source) as raw_image:
        image = ImageOps.exif_transpose(raw_image)
        if image.width <= maximum[0] and image.height <= maximum[1]:
            return 0
        image.thumbnail(maximum, Image.Resampling.LANCZOS)
        temporary = source.with_suffix(".optimized.png")
        image.save(temporary, format="PNG", optimize=True)
    before = source.stat().st_size
    if temporary.stat().st_size >= before:
        temporary.unlink()
        return 0
    temporary.replace(source)
    return before - source.stat().st_size


def remove_duplicate_avatar() -> int:
    avatar = IMAGE_DIR / "avatar.png"
    duplicate = IMAGE_DIR / "d1609270be1c4a31a6a48a975ffbaeea.jpg"
    if not duplicate.exists():
        return 0
    avatar_hash = hashlib.sha256(avatar.read_bytes()).digest()
    duplicate_hash = hashlib.sha256(duplicate.read_bytes()).digest()
    if avatar_hash != duplicate_hash:
        raise RuntimeError("The legacy avatar copy is no longer identical; refusing to remove it.")
    size = duplicate.stat().st_size
    duplicate.unlink()
    return size


def convert_daily_images() -> tuple[int, int, dict[str, str]]:
    payload = json.loads(DAILY_DATA.read_text(encoding="utf-8"))
    image_urls = {
        image_url
        for entry in payload.get("entries", [])
        for image_url in entry.get("images", [])
        if image_url and not image_url.startswith(("http://", "https://"))
    }
    replacements: dict[str, str] = {}
    before = after = 0

    for image_url in sorted(image_urls):
        source = (DAILY_DATA.parent / image_url).resolve()
        source.relative_to((IMAGE_DIR / "daily" / "qzone").resolve())
        if source.suffix.lower() == ".webp":
            continue
        source_size = source.stat().st_size
        destination = save_webp(source, quality=82, lossless=False)
        destination_url = image_url.rsplit(".", 1)[0] + ".webp"
        replacements[image_url] = destination_url
        before += source_size
        after += destination.stat().st_size

    if replacements:
        for entry in payload.get("entries", []):
            entry["images"] = [replacements.get(url, url) for url in entry.get("images", [])]
        DAILY_DATA.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

        manifest = json.loads(DAILY_MANIFEST.read_text(encoding="utf-8"))
        updated_manifest = {replacements.get(url, url): metadata for url, metadata in manifest.items()}
        DAILY_MANIFEST.write_text(
            json.dumps(updated_manifest, ensure_ascii=False, indent=2) + "\n",
            encoding="utf-8",
        )

    return before, after, replacements


def main() -> None:
    saved = remove_duplicate_avatar()
    saved += resize_png(IMAGE_DIR / "avatar.png", (256, 294))
    saved += resize_png(IMAGE_DIR / "theme-moon-skill.png", (64, 64))

    daily_before, daily_after, replacements = convert_daily_images()
    saved += daily_before - daily_after

    converted_static = 0
    for source, quality, lossless in STATIC_WEBP_ASSETS:
        if not source.exists() and source.with_suffix(".webp").exists():
            continue
        before = source.stat().st_size
        destination = save_webp(source, quality=quality, lossless=lossless)
        saved += before - destination.stat().st_size
        converted_static += 1

    print(
        f"Media optimized: {len(replacements)} daily images, {converted_static} static images, "
        f"{saved / 1024 / 1024:.2f} MiB saved."
    )


if __name__ == "__main__":
    main()
