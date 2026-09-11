#!/usr/bin/env python3
"""Fail when a versioned image contains EXIF GPS location metadata."""

from __future__ import annotations

import argparse
import struct
import subprocess
import tempfile
from pathlib import Path


IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png", ".tif", ".tiff", ".webp", ".avif"}
GPS_IFD_TAG = 0x8825
TEXT_GPS_MARKERS = (b"gpslatitude", b"gpslongitude", b"gpsposition", b"exif:gps")


def tiff_has_gps(data: bytes) -> bool:
    if len(data) < 8 or data[:2] not in (b"II", b"MM"):
        return False

    byte_order = "<" if data[:2] == b"II" else ">"
    try:
        if struct.unpack_from(f"{byte_order}H", data, 2)[0] != 42:
            return False
        ifd_offset = struct.unpack_from(f"{byte_order}I", data, 4)[0]
        if ifd_offset + 2 > len(data):
            return False
        entry_count = struct.unpack_from(f"{byte_order}H", data, ifd_offset)[0]
        entries_start = ifd_offset + 2
        for index in range(entry_count):
            entry_offset = entries_start + index * 12
            if entry_offset + 12 > len(data):
                return False
            tag = struct.unpack_from(f"{byte_order}H", data, entry_offset)[0]
            if tag == GPS_IFD_TAG:
                return True
    except struct.error:
        return False
    return False


def jpeg_exif_blocks(data: bytes):
    if not data.startswith(b"\xff\xd8"):
        return

    offset = 2
    while offset + 4 <= len(data):
        if data[offset] != 0xFF:
            offset += 1
            continue
        marker = data[offset + 1]
        offset += 2
        if marker in (0xD8, 0xD9) or 0xD0 <= marker <= 0xD7:
            continue
        if marker == 0xDA:
            return
        segment_length = struct.unpack_from(">H", data, offset)[0]
        if segment_length < 2 or offset + segment_length > len(data):
            return
        segment = data[offset + 2 : offset + segment_length]
        if marker == 0xE1 and segment.startswith(b"Exif\x00\x00"):
            yield segment[6:]
        offset += segment_length


def image_has_gps(path: Path) -> bool:
    data = path.read_bytes()
    lowered = data.lower()
    if any(marker in lowered for marker in TEXT_GPS_MARKERS):
        return True

    suffix = path.suffix.lower()
    if suffix in {".jpg", ".jpeg"}:
        return any(tiff_has_gps(block) for block in jpeg_exif_blocks(data))
    if suffix in {".tif", ".tiff"}:
        return tiff_has_gps(data)
    if suffix == ".png":
        offset = 8
        while offset + 12 <= len(data):
            length = struct.unpack_from(">I", data, offset)[0]
            chunk_type = data[offset + 4 : offset + 8]
            chunk_data = data[offset + 8 : offset + 8 + length]
            if chunk_type == b"eXIf" and tiff_has_gps(chunk_data):
                return True
            offset += length + 12
    return False


def tracked_images(root: Path) -> list[Path]:
    result = subprocess.run(
        ["git", "ls-files", "-z"],
        cwd=root,
        check=True,
        capture_output=True,
    )
    paths = result.stdout.decode("utf-8").split("\0")
    return [root / item for item in paths if item and Path(item).suffix.lower() in IMAGE_EXTENSIONS]


def build_test_jpeg() -> bytes:
    # Minimal JPEG envelope containing a little-endian TIFF IFD with GPSInfo.
    tiff = b"II" + struct.pack("<H", 42) + struct.pack("<I", 8)
    tiff += struct.pack("<H", 1)
    tiff += struct.pack("<HHII", GPS_IFD_TAG, 4, 1, 26)
    tiff += struct.pack("<I", 0)
    payload = b"Exif\x00\x00" + tiff
    return b"\xff\xd8\xff\xe1" + struct.pack(">H", len(payload) + 2) + payload + b"\xff\xd9"


def run_self_test() -> int:
    with tempfile.TemporaryDirectory() as temp_dir:
        test_path = Path(temp_dir) / "gps-test.jpg"
        test_path.write_bytes(build_test_jpeg())
        if not image_has_gps(test_path):
            print("ERRO: a imagem de teste com GPS não foi detectada.")
            return 1
    print("Autoteste concluído: metadados GPS foram detectados.")
    return 0


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("paths", nargs="*", type=Path)
    parser.add_argument("--self-test", action="store_true")
    args = parser.parse_args()

    if args.self_test:
        return run_self_test()

    root = Path(__file__).resolve().parents[1]
    images = args.paths or tracked_images(root)
    flagged = [path for path in images if path.exists() and image_has_gps(path)]

    if flagged:
        print("ERRO: metadados de localização encontrados:")
        for path in flagged:
            print(f"- {path.relative_to(root) if path.is_relative_to(root) else path}")
        return 1

    print(f"OK: {len(images)} imagens verificadas; nenhum GPS encontrado.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
