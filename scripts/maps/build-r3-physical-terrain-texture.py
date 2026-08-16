#!/usr/bin/env python3
"""Build the self-hosted WP3.9B2 Europe physical-colour texture.

Source: Natural Earth II 1:50m land-cover shaded-relief with water.
Natural Earth is public-domain map data. The source raster remains upstream;
Future Conquest commits only the cropped/art-directed Europe presentation asset.

This script is intentionally NOT part of normal npm prebuild. It is a controlled
asset-refresh tool so GitHub Pages never depends on a third-party service or a
175 MB upstream raster during ordinary deployments.
"""

from __future__ import annotations

import argparse
import json
import math
from pathlib import Path

from PIL import Image, ImageEnhance, ImageFilter

SOURCE_WIDTH = 10_800
SOURCE_HEIGHT = 5_400
BOUNDS = (-30.0, 28.0, 55.0, 76.0)  # west, south, east, north
TARGET_WIDTH = 4096
TARGET_HEIGHT = round(TARGET_WIDTH * ((BOUNDS[3] - BOUNDS[1]) / (BOUNDS[2] - BOUNDS[0])))


def pixel_x(longitude: float, width: int) -> int:
    return round(((longitude + 180.0) / 360.0) * width)


def pixel_y(latitude: float, height: int) -> int:
    return round(((90.0 - latitude) / 180.0) * height)


def soft_noise(width: int, height: int) -> Image.Image:
    """Create deterministic low-amplitude texture without adding a dependency."""
    small_w = max(32, width // 64)
    small_h = max(24, height // 64)
    data = []
    for y in range(small_h):
        for x in range(small_w):
            value = (
                math.sin(x * 0.73 + y * 0.31)
                + math.sin(x * 0.19 - y * 0.67)
                + math.cos(x * 0.41 + y * 0.53)
            ) / 3.0
            data.append(round(128 + value * 24))
    noise = Image.new("L", (small_w, small_h))
    noise.putdata(data)
    return noise.resize((width, height), Image.Resampling.BICUBIC).filter(ImageFilter.GaussianBlur(7))


def art_direct(image: Image.Image) -> Image.Image:
    # Natural Earth II is intentionally soft. Push it toward the approved game
    # mock-up without turning it into raw/photographic satellite imagery.
    image = ImageEnhance.Color(image).enhance(1.34)
    image = ImageEnhance.Contrast(image).enhance(1.13)
    image = ImageEnhance.Brightness(image).enhance(1.035)
    image = ImageEnhance.Sharpness(image).enhance(1.22)

    # Add very subtle low-frequency material variation so selected/campaign
    # views do not collapse back into a smooth wash after upscaling.
    texture = soft_noise(*image.size)
    texture_rgb = Image.merge("RGB", (texture, texture, texture))
    return Image.blend(image, texture_rgb, 0.035)


def build(source: Path, output: Path, metadata: Path) -> None:
    with Image.open(source) as src:
        src.load()
        if src.width != SOURCE_WIDTH or src.height != SOURCE_HEIGHT:
            raise RuntimeError(
                f"Unexpected Natural Earth raster dimensions {src.width}x{src.height}; "
                f"expected {SOURCE_WIDTH}x{SOURCE_HEIGHT}."
            )
        west, south, east, north = BOUNDS
        crop_box = (
            pixel_x(west, src.width),
            pixel_y(north, src.height),
            pixel_x(east, src.width),
            pixel_y(south, src.height),
        )
        crop = src.convert("RGB").crop(crop_box)

    crop = crop.resize((TARGET_WIDTH, TARGET_HEIGHT), Image.Resampling.LANCZOS)
    crop = art_direct(crop)

    output.parent.mkdir(parents=True, exist_ok=True)
    crop.save(output, "WEBP", quality=88, method=6)

    metadata.parent.mkdir(parents=True, exist_ok=True)
    metadata.write_text(
        json.dumps(
            {
                "schemaVersion": 1,
                "id": "r3-wp3-9b2-natural-earth-physical-colour-v1",
                "source": "Natural Earth II 1:50m NE2_50M_LC_SR_W",
                "sourceRepository": "nvkelso/natural-earth-raster",
                "sourcePath": "50m_rasters/NE2_50M_LC_SR_W/NE2_50M_LC_SR_W.tif",
                "sourceLicense": "public domain",
                "bounds": list(BOUNDS),
                "dimensions": [TARGET_WIDTH, TARGET_HEIGHT],
                "format": "webp",
                "quality": 88,
                "normalBuildDependency": False,
                "purpose": "presentation-only stylised physical terrain colour beneath Copernicus DEM relief",
            },
            indent=2,
        )
        + "\n",
        encoding="utf-8",
    )

    print(f"Wrote {output} ({output.stat().st_size:,} bytes, {TARGET_WIDTH}x{TARGET_HEIGHT})")
    print(f"Wrote {metadata}")


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("source", type=Path)
    parser.add_argument("output", type=Path)
    parser.add_argument("metadata", type=Path)
    args = parser.parse_args()
    build(args.source, args.output, args.metadata)


if __name__ == "__main__":
    main()
