"""Import Qzone posts and album photos into docs/daily/qzone.json.

Authentication uses QQ's QR-code flow. Cookies remain in memory and are never
written to disk. Run from the repository root after installing qzone-api.
"""

from __future__ import annotations

import asyncio
import html
import json
import mimetypes
import re
import sys
from collections import defaultdict
from datetime import datetime, timedelta, timezone
from pathlib import Path
from urllib.parse import urlparse


ROOT = Path(__file__).resolve().parents[1]
VENDOR = ROOT / ".superdesign" / "tmp" / "qzone-api-lib"
sys.path.insert(0, str(VENDOR))
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

import requests  # type: ignore  # noqa: E402
from qzone_api import QzoneApi, QzoneLogin  # type: ignore  # noqa: E402
from qzone_api.utils import bkn  # type: ignore  # noqa: E402
from qzone_api.utils.html_parser import (  # type: ignore  # noqa: E402
    clean_escaped_html,
    parse_callback_data,
    parse_feed_data,
)


TARGET_QQ = 3178287074
CHINA_TZ = timezone(timedelta(hours=8))
CUTOFF = datetime(2025, 8, 15, tzinfo=CHINA_TZ)
OUTPUT = ROOT / "docs" / "daily" / "qzone.json"
MEDIA_ROOT = ROOT / "docs" / "assets" / "images" / "daily" / "qzone"
QR_ROOT = ROOT / ".superdesign" / "tmp" / "qzone-login"


def timestamp_of(value: object) -> int:
    if value is None or value == "":
        return 0
    if isinstance(value, (int, float)):
        number = int(value)
        return number // 1000 if number > 10_000_000_000 else number
    text = str(value).strip()
    if text.isdigit():
        return timestamp_of(int(text))
    for pattern in ("%Y-%m-%d %H:%M:%S", "%Y-%m-%d %H:%M", "%Y-%m-%d"):
        try:
            return int(datetime.strptime(text, pattern).replace(tzinfo=CHINA_TZ).timestamp())
        except ValueError:
            continue
    return 0


def clean_text(value: object) -> str:
    text = html.unescape(str(value or ""))
    text = re.sub(r"<[^>]+>", "", text)
    text = re.sub(r"\s+", " ", text).strip()
    return text.encode("utf-8", "replace").decode("utf-8")


def cookie_header(cookies: dict[str, str]) -> str:
    return "; ".join(f"{key}={value}" for key, value in cookies.items())


def file_extension(url: str, content_type: str) -> str:
    suffix = Path(urlparse(url).path).suffix.lower()
    if suffix in {".jpg", ".jpeg", ".png", ".gif", ".webp"}:
        return ".jpg" if suffix == ".jpeg" else suffix
    guessed = mimetypes.guess_extension(content_type.split(";", 1)[0].strip())
    return guessed if guessed in {".jpg", ".png", ".gif", ".webp"} else ".jpg"


def download_image(url: str, stamp: int, index: int, cookies: str) -> str | None:
    if not url:
        return None
    if url.startswith("//"):
        url = f"https:{url}"
    day = datetime.fromtimestamp(stamp, CHINA_TZ).strftime("%Y-%m-%d")
    target_dir = MEDIA_ROOT / day
    target_dir.mkdir(parents=True, exist_ok=True)
    try:
        response = requests.get(
            url,
            headers={
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
                "Referer": "https://user.qzone.qq.com/",
                "Cookie": cookies,
            },
            timeout=30,
        )
        response.raise_for_status()
        suffix = file_extension(url, response.headers.get("Content-Type", ""))
        name = f"{stamp}-{index:02d}{suffix}"
        path = target_dir / name
        if not path.exists():
            path.write_bytes(response.content)
        return f"../assets/images/daily/qzone/{day}/{name}"
    except Exception as exc:  # noqa: BLE001
        print(f"IMAGE_FAILED {url}: {exc}", flush=True)
        return None


async def fetch_posts(api: QzoneApi, token: int, cookies: str) -> list[dict]:
    posts: list[dict] = []
    cutoff_stamp = int(CUTOFF.timestamp())
    for pos in range(0, 1000, 20):
        content = await api.fetch_messages_raw(TARGET_QQ, token, cookies, pos=pos, num=20)
        raw_data = parse_callback_data(clean_escaped_html(content or "")) or {}
        raw_batch = raw_data.get("msglist") or []

        def is_self_only(item: dict) -> bool:
            try:
                if int(item.get("ugc_right") or item.get("ugcright") or 0) == 64:
                    return True
            except (TypeError, ValueError):
                pass
            try:
                if int(item.get("rightType") or item.get("right_type") or 0) == 4:
                    return True
            except (TypeError, ValueError):
                pass
            if item.get("secret") in {1, "1", True} or item.get("private") in {1, "1", True}:
                return True
            visibility_text = " ".join(str(item.get(key) or "") for key in ("right_name", "visible_name", "permission"))
            return "仅自己" in visibility_text or "私密" in visibility_text

        visible_raw = [item for item in raw_batch if not is_self_only(item)]
        payload = parse_feed_data({"msglist": visible_raw})
        batch = (payload or {}).get("data") or []
        if not batch:
            if raw_batch:
                continue
            break
        posts.extend(item for item in batch if timestamp_of(item.get("timestamp")) >= cutoff_stamp)
        stamps = [timestamp_of(item.get("timestamp")) for item in batch]
        print(f"POSTS page={pos // 20 + 1} fetched={len(batch)} kept={len(posts)}", flush=True)
        if stamps and min(stamps) < cutoff_stamp:
            break
    return posts


async def fetch_album_photos(
    api: QzoneApi,
    login_qq: int,
    token: int,
    cookies: str,
) -> list[dict]:
    cutoff_stamp = int(CUTOFF.timestamp())
    album_payload = await api.list_albums(TARGET_QQ, login_qq, token, cookies, page=0, count=100)
    albums = (album_payload or {}).get("albums") or []
    photos: list[dict] = []
    for album in albums:
        if int(album.get("rights") or 0) != 1 or album.get("is_locked"):
            print(f"ALBUM_SKIPPED_PRIVATE {clean_text(album.get('name'))}", flush=True)
            continue
        total = int(album.get("photo_count") or 0)
        for page in range(0, max(total, 1), 100):
            payload = await api.list_album_photos(
                TARGET_QQ,
                login_qq,
                str(album.get("id") or ""),
                token,
                cookies,
                page=page,
                count=100,
            )
            batch = (payload or {}).get("photos") or []
            for photo in batch:
                stamp = timestamp_of(photo.get("uploadtime"))
                if stamp >= cutoff_stamp:
                    photo["timestamp"] = stamp
                    photo["album"] = clean_text(album.get("name"))
                    photos.append(photo)
            if len(batch) < 100:
                break
        print(f"ALBUM {clean_text(album.get('name'))} kept={len(photos)}", flush=True)
    return photos


def assemble(posts: list[dict], photos: list[dict], cookies: str) -> list[dict]:
    entries: list[dict] = []
    seen_urls: set[str] = set()

    for post in posts:
        stamp = timestamp_of(post.get("timestamp"))
        images = []
        for index, image in enumerate(post.get("images") or [], start=1):
            url = str(image.get("url") or image.get("origin_url") or "")
            if not url or url in seen_urls:
                continue
            seen_urls.add(url)
            local = download_image(url, stamp, index, cookies)
            if local:
                images.append(local)
        entries.append(
            {
                "id": f"qzone-post-{post.get('cur_key') or stamp}",
                "type": "说说",
                "timestamp": stamp,
                "date": datetime.fromtimestamp(stamp, CHINA_TZ).isoformat(),
                "content": clean_text(post.get("content")),
                "images": images,
                "source": "QQ空间",
            }
        )

    grouped_photos: dict[tuple[str, int], list[dict]] = defaultdict(list)
    for photo in photos:
        stamp = timestamp_of(photo.get("timestamp") or photo.get("uploadtime"))
        day_stamp = int(datetime.fromtimestamp(stamp, CHINA_TZ).replace(hour=12, minute=0, second=0).timestamp())
        grouped_photos[(str(photo.get("album") or "QQ空间相册"), day_stamp)].append(photo)

    for (album, stamp), batch in grouped_photos.items():
        images = []
        descriptions = []
        for index, photo in enumerate(batch, start=1):
            url = str(photo.get("origin_url") or photo.get("url") or "")
            if not url or url in seen_urls:
                continue
            seen_urls.add(url)
            local = download_image(url, stamp, index, cookies)
            if local:
                images.append(local)
            description = clean_text(photo.get("desc") or photo.get("name"))
            if description:
                descriptions.append(description)
        if images:
            entries.append(
                {
                    "id": f"qzone-album-{stamp}-{abs(hash(album))}",
                    "type": "相册",
                    "timestamp": stamp,
                    "date": datetime.fromtimestamp(stamp, CHINA_TZ).isoformat(),
                    "content": " · ".join(dict.fromkeys(descriptions)) or album,
                    "album": album,
                    "images": images,
                    "source": "QQ空间",
                }
            )

    return sorted(entries, key=lambda item: item["timestamp"], reverse=True)


async def main() -> None:
    QR_ROOT.mkdir(parents=True, exist_ok=True)
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    MEDIA_ROOT.mkdir(parents=True, exist_ok=True)

    if "--dom-stdin" in sys.argv:
        envelope = json.loads(sys.stdin.read())
        raw_cookies = envelope.get("cookies") or {}
        cookies = cookie_header(raw_cookies)
        entries = []
        cutoff_stamp = int(CUTOFF.timestamp())
        for item in envelope.get("entries") or []:
            stamp = timestamp_of(item.get("timestamp"))
            privacy = clean_text(item.get("privacy"))
            if stamp < cutoff_stamp or "仅自己" in privacy or "私密" in privacy:
                continue
            images = []
            for index, url in enumerate(dict.fromkeys(item.get("images") or []), start=1):
                local = download_image(str(url), stamp, index, cookies)
                if local:
                    images.append(local)
            entries.append({
                "id": f"qzone-feed-{clean_text(item.get('id')) or stamp}",
                "type": "说说",
                "timestamp": stamp,
                "date": datetime.fromtimestamp(stamp, CHINA_TZ).isoformat(),
                "content": clean_text(item.get("content")),
                "images": images,
                "source": "QQ空间",
            })
        if OUTPUT.exists():
            try:
                existing = json.loads(OUTPUT.read_text(encoding="utf-8")).get("entries") or []
            except (json.JSONDecodeError, OSError):
                existing = []
            merged = {str(item.get("id")): item for item in existing}
            merged.update({str(item.get("id")): item for item in entries})
            entries = list(merged.values())
        entries.sort(key=lambda item: item["timestamp"], reverse=True)
        payload = {
            "source": f"https://user.qzone.qq.com/{TARGET_QQ}/main",
            "cutoff": CUTOFF.isoformat(),
            "generated_at": datetime.now(CHINA_TZ).isoformat(),
            "entries": entries,
        }
        OUTPUT.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")
        print(f"IMPORT_DONE entries={len(entries)} output={OUTPUT}", flush=True)
        return
    elif "--cookies-stdin" in sys.argv:
        raw_cookies = json.loads(sys.stdin.read())
        print("LOGIN_OK source=browser-memory", flush=True)
    else:
        login = QzoneLogin()
        login.qr_handler.temp_path = str(QR_ROOT)
        print(f"QR_READY_PATH={QR_ROOT / 'QR.png'}", flush=True)
        result = await login.login(timeout=300)
        if result.get("code") != 0:
            raise RuntimeError(f"QQ login failed: {result.get('msg')}")
        raw_cookies = result["cookies"]

    cookies = cookie_header(raw_cookies)
    login_qq_match = re.search(r"\d+", str(raw_cookies.get("uin") or ""))
    login_qq = int(login_qq_match.group()) if login_qq_match else TARGET_QQ
    token = bkn(raw_cookies.get("p_skey") or raw_cookies.get("skey") or "")
    print(f"LOGIN_OK qq={login_qq}", flush=True)

    api = QzoneApi()
    posts = await fetch_posts(api, token, cookies)
    photos = await fetch_album_photos(api, login_qq, token, cookies)
    entries = assemble(posts, photos, cookies)

    payload = {
        "source": f"https://user.qzone.qq.com/{TARGET_QQ}/main",
        "cutoff": CUTOFF.isoformat(),
        "generated_at": datetime.now(CHINA_TZ).isoformat(),
        "entries": entries,
    }
    OUTPUT.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"IMPORT_DONE entries={len(entries)} output={OUTPUT}", flush=True)


if __name__ == "__main__":
    asyncio.run(main())
