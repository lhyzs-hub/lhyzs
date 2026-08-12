"""Generate lightweight daily-photo previews and their dimension manifest."""

from __future__ import annotations

import json
from pathlib import Path

from PIL import Image, ImageOps


ROOT = Path(__file__).resolve().parents[1]
DATA_FILE = ROOT / "docs" / "daily" / "qzone.json"
DAILY_IMAGE_DIR = ROOT / "docs" / "assets" / "images" / "daily"
THUMBNAIL_DIR = DAILY_IMAGE_DIR / "thumbs"
MANIFEST_FILE = ROOT / "docs" / "daily" / "photo-manifest.json"
MAX_EDGE = 720
WEBP_QUALITY = 76


def thumbnail_url(relative_source: Path) -> str:
    return f"../assets/images/daily/thumbs/{relative_source.with_suffix('.webp').as_posix()}"


def main() -> None:
    payload = json.loads(DATA_FILE.read_text(encoding="utf-8"))
    image_urls = {
        image_url
        for entry in payload.get("entries", [])
        for image_url in entry.get("images", [])
        if image_url and not image_url.startswith(("http://", "https://"))
    }
    manifest: dict[str, dict[str, int | str]] = {}
    generated = 0
    reused = 0

    for image_url in sorted(image_urls):
        source = (DATA_FILE.parent / image_url).resolve()
        try:
            relative_source = source.relative_to(DAILY_IMAGE_DIR)
        except ValueError as error:
            raise RuntimeError(f"Daily image is outside the managed directory: {image_url}") from error
        if not source.is_file():
            raise FileNotFoundError(f"Missing daily image: {source}")

        destination = THUMBNAIL_DIR / relative_source.with_suffix(".webp")
        destination.parent.mkdir(parents=True, exist_ok=True)

        with Image.open(source) as raw_image:
            image = ImageOps.exif_transpose(raw_image)
            original_width, original_height = image.size
            preview = image.copy()
            preview.thumbnail((MAX_EDGE, MAX_EDGE), Image.Resampling.LANCZOS)
            preview_width, preview_height = preview.size

            if not destination.exists() or destination.stat().st_mtime < source.stat().st_mtime:
                if preview.mode not in {"RGB", "RGBA"}:
                    preview = preview.convert("RGBA" if "transparency" in preview.info else "RGB")
                preview.save(destination, format="WEBP", quality=WEBP_QUALITY, method=6)
                generated += 1
            else:
                reused += 1

        manifest[image_url] = {
            "thumbnail": thumbnail_url(relative_source),
            "width": original_width,
            "height": original_height,
            "thumbnail_width": preview_width,
            "thumbnail_height": preview_height,
        }

    MANIFEST_FILE.write_text(
        json.dumps(manifest, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )
    print(
        f"Daily thumbnails ready: {generated} generated, {reused} reused, "
        f"{len(manifest)} manifest entries."
    )


if __name__ == "__main__":
    main()
