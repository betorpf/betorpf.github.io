#!/usr/bin/env python3
"""Update (or check) the CSP script-src hashes of inline <script> blocks in HTML pages."""

from __future__ import annotations

import argparse
import base64
import hashlib
import re
import sys
from pathlib import Path


HTML_COMMENT = re.compile(r"<!--.*?-->", re.S)
INLINE_SCRIPT = re.compile(r"<script>(.*?)</script>", re.S)
SCRIPT_SRC = re.compile(r"(Content-Security-Policy\" content=\"[^\"]*?script-src )[^;\"]*")


def script_hashes(html: str) -> str:
    # O parser HTML normaliza CRLF para LF antes de calcular o hash, então ele vale para os dois finais de linha.
    sources = [body.replace("\r\n", "\n") for body in INLINE_SCRIPT.findall(HTML_COMMENT.sub("", html))]
    return " ".join(
        "'sha256-" + base64.b64encode(hashlib.sha256(src.encode("utf-8")).digest()).decode() + "'"
        for src in sources
    )


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("files", nargs="+", type=Path)
    parser.add_argument("--check", action="store_true", help="only report pages whose hashes are out of date")
    args = parser.parse_args()

    stale = []
    for path in args.files:
        html = path.read_text(encoding="utf-8")
        hashes = script_hashes(html)
        if not hashes or not SCRIPT_SRC.search(html):
            print(f"{path}: no inline script or CSP script-src found", file=sys.stderr)
            return 2
        updated = SCRIPT_SRC.sub(lambda m: m.group(1) + hashes, html, count=1)
        if updated == html:
            print(f"{path}: ok")
            continue
        stale.append(path)
        if args.check:
            print(f"{path}: CSP hash out of date")
        else:
            path.write_bytes(updated.encode("utf-8"))
            print(f"{path}: updated")

    return 1 if args.check and stale else 0


if __name__ == "__main__":
    raise SystemExit(main())
