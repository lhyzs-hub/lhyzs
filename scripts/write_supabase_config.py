#!/usr/bin/env python3
"""Generate the public browser config used by the static comments client."""

from __future__ import annotations

import json
import os
from pathlib import Path


OUTPUT = Path(__file__).resolve().parents[1] / "docs/assets/javascripts/supabase-config.js"


def main() -> None:
    url = os.environ.get("SUPABASE_URL", "").strip().rstrip("/")
    key = os.environ.get("SUPABASE_PUBLISHABLE_KEY", "").strip()
    config = {"url": url, "publishableKey": key}
    OUTPUT.write_text(
        "window.LHYZS_SUPABASE = Object.freeze(" + json.dumps(config) + ");\n",
        encoding="utf-8",
    )
    print(f"Wrote public Supabase config: url={'set' if url else 'missing'}, key={'set' if key else 'missing'}")


if __name__ == "__main__":
    main()
