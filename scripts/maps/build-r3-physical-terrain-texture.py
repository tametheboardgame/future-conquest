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
from pathlib import Path

import numpy as np
from PIL import Image, ImageEnhance

SOURCE_WIDTH = 10_800
SOURCE_HEIGHT = 5_400
BOUNDS = (-30.0, 28.0, 55.0, 76.0)  # west, south, east, north
TARGET_WIDTH = 2048
TARGET_HEIGHT = round(TARGET_WIDTH * ((BOUNDS[3] - BOUNDS[1]) / (BOUNDS[2] - BOUNDS[0])))
OUTPUT_QUALITY = 82


def pixel_x(longitude: float, width: int) -> int:
    return round(((longitude + 180.0) / 360.0) * width)


def pixel_y(latitude: float, height: int) -> int:
    return round(((90.0 - latitude) / 180.0) * height)


def gaussian_region(
    longitude: np.ndarray,
    latitude: np.ndarray,
    centre_lon: float,
    centre_lat: float,
    spread_lon: float,
    spread_lat: float,
    weight: float = 1.0,
) -> np.ndarray:
    return weight * np.exp(
        -0.5
        * (
            ((longitude - centre_lon) / spread_lon) ** 2
            + ((latitude - centre_lat) / spread_lat) ** 2
        )
    )


def art_direct(image: Image.Image) -> Image.Image:
    """Push the idealised source toward the approved satellite/board-game target."""
    pixels = np.asarray(image.convert("RGB"), dtype=np.float32) / 255.0
    height, width, _ = pixels.shape

    west, south, east, north = BOUNDS
    lon_values = np.linspace(west, east, width, endpoint=False, dtype=np.float32)
    lat_values = np.linspace(north, south, height, endpoint=False, dtype=np.float32)
    longitude, latitude = np.meshgrid(lon_values, lat_values)

    red = pixels[:, :, 0]
    green = pixels[:, :, 1]
    blue = pixels[:, :, 2]
    luminance = 0.2126 * red + 0.7152 * green + 0.0722 * blue

    # Source colours are intentionally soft. Increase material separation and
    # darken the whole map before applying targeted land/water treatment.
    mean = pixels.mean(axis=2, keepdims=True)
    pixels = mean + (pixels - mean) * 1.42
    pixels = (pixels - 0.5) * 1.16 + 0.5
    pixels *= 0.82

    # Natural Earth water is visually useful but too bright/cyan for the game.
    # Detect it from source colour, then pull it toward a deeper slate/ocean blue.
    water_mask = np.clip((blue - (red + green) / 2.0) * 4.0 + 0.45, 0.0, 1.0)
    land_mask = 1.0 - water_mask
    water_target = np.stack(
        (
            np.full_like(red, 0.055),
            np.full_like(red, 0.24),
            np.full_like(red, 0.34),
        ),
        axis=2,
    )
    water_weight = water_mask[:, :, None] * 0.55
    pixels = pixels * (1.0 - water_weight) + water_target * water_weight

    # Add broad wooded identities in recognisable European forest belts. These
    # soft masks are visual direction only, not gameplay or land-cover authority.
    forest = np.zeros((height, width), dtype=np.float32)
    for region in (
        (5.5, 49.7, 2.4, 1.4, 1.00),   # Ardennes / western Germany
        (8.2, 48.2, 1.0, 1.5, 1.10),   # Black Forest
        (7.1, 48.1, 0.8, 1.2, 0.80),   # Vosges
        (12.7, 49.0, 1.5, 1.3, 0.90),  # Bavarian / Bohemian forest
        (3.0, 45.3, 2.0, 1.8, 0.65),   # Massif Central wooded uplands
        (14.8, 47.5, 2.5, 1.0, 0.75),  # eastern Alpine foothills
        (10.0, 53.0, 3.2, 1.3, 0.45),  # north German mixed woodland
        (17.0, 50.2, 3.0, 1.8, 0.60),  # central/eastern European forests
    ):
        forest += gaussian_region(longitude, latitude, *region)
    forest = np.clip(forest, 0.0, 1.0) * land_mask
    forest_target = np.stack(
        (
            np.full_like(red, 0.10),
            np.full_like(red, 0.30),
            np.full_like(red, 0.13),
        ),
        axis=2,
    )
    forest_weight = forest[:, :, None] * 0.28
    pixels = pixels * (1.0 - forest_weight) + forest_target * forest_weight

    # Give cultivated lowlands visible warm/cool patch variation. This is a
    # low-frequency cartographic texture, not a political or territory mask.
    field_pattern = (
        np.sin(longitude * 3.1)
        + np.sin(latitude * 5.7)
        + np.sin((longitude + latitude) * 4.3)
    ) / 3.0
    field_pattern = (field_pattern + 1.0) / 2.0

    alpine = np.exp(
        -0.5 * ((latitude - (46.3 + 0.05 * (longitude - 8.0))) / 1.15) ** 2
    ) * np.exp(-0.5 * ((longitude - 10.0) / 5.0) ** 2)
    lowland = (
        np.clip((55.0 - latitude) / 8.0, 0.0, 1.0)
        * np.clip((latitude - 42.0) / 6.0, 0.0, 1.0)
        * land_mask
        * (1.0 - np.clip(alpine, 0.0, 1.0))
    )
    warm = (field_pattern - 0.5) * 0.10 * lowland
    pixels[:, :, 0] += warm * 1.10
    pixels[:, :, 1] += warm * 0.45
    pixels[:, :, 2] -= warm * 0.20

    # Strengthen high Alpine/Pyrenean rock and restrained snow from the source's
    # own bright high-relief pixels so mountains no longer read as green hills.
    pyrenees = gaussian_region(longitude, latitude, 1.0, 42.8, 2.0, 0.7, 0.8)
    mountain_mask = np.clip(alpine + pyrenees, 0.0, 1.0) * land_mask
    snow = np.clip((luminance - 0.62) * 3.5, 0.0, 1.0) * mountain_mask
    snow_target = np.stack(
        (
            np.full_like(red, 0.92),
            np.full_like(red, 0.92),
            np.full_like(red, 0.88),
        ),
        axis=2,
    )
    snow_weight = snow[:, :, None] * 0.60
    pixels = pixels * (1.0 - snow_weight) + snow_target * snow_weight

    rock = mountain_mask * (1.0 - snow) * 0.28
    rock_target = np.stack(
        (
            np.full_like(red, 0.34),
            np.full_like(red, 0.32),
            np.full_like(red, 0.28),
        ),
        axis=2,
    )
    rock_weight = rock[:, :, None]
    pixels = pixels * (1.0 - rock_weight) + rock_target * rock_weight

    result = Image.fromarray((np.clip(pixels, 0.0, 1.0) * 255.0).astype(np.uint8), "RGB")
    return ImageEnhance.Sharpness(result).enhance(1.15)


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
    crop.save(output, "WEBP", quality=OUTPUT_QUALITY, method=6)

    metadata.parent.mkdir(parents=True, exist_ok=True)
    metadata.write_text(
        json.dumps(
            {
                "schemaVersion": 2,
                "id": "r3-wp3-9b2-natural-earth-physical-colour-v1",
                "source": "Natural Earth II 1:50m NE2_50M_LC_SR_W",
                "sourceRepository": "nvkelso/natural-earth-raster",
                "sourcePath": "50m_rasters/NE2_50M_LC_SR_W/NE2_50M_LC_SR_W.tif",
                "sourceLicense": "public domain",
                "bounds": list(BOUNDS),
                "dimensions": [TARGET_WIDTH, TARGET_HEIGHT],
                "format": "webp",
                "quality": OUTPUT_QUALITY,
                "normalBuildDependency": False,
                "artDirection": {
                    "water": "deeper slate/ocean blue",
                    "lowlands": "stronger natural green with warm cultivated variation",
                    "woodland": "soft regional dark-green forest belts",
                    "mountains": "stronger stone with restrained source-derived snow highlights",
                },
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
