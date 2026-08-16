#!/usr/bin/env python3
"""Build WP3.9B3 high-resolution physical terrain colour from NASA Blue Marble NG.

WP3.9B2 proved the physical-colour direction but used NASA's 5400x2700
8 km/pixel global composite and a 640px-wide runtime texture. At normal/local
campaign zoom that broad colour layer can become visibly soft beside the much
sharper Copernicus relief.

This authoring tool uses NASA's 21600x10800 2 km/pixel June 2004 global
composite and produces a 2048px-wide Web Mercator-corrected Europe texture.
Normal game builds remain offline and consume only the committed deterministic
asset chunks produced from this tool.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import math
from pathlib import Path

import numpy as np
from PIL import Image, ImageEnhance, ImageFilter

SOURCE_WIDTH = 21600
SOURCE_HEIGHT = 10800
BOUNDS = (-30.0, 28.0, 55.0, 76.0)
TARGET_WIDTH = 2048
OUTPUT_QUALITY = 78


def mercator_y(latitude: float) -> float:
    latitude = max(-85.05112878, min(85.05112878, latitude))
    radians = math.radians(latitude)
    return math.log(math.tan(math.pi / 4.0 + radians / 2.0))


def output_height() -> int:
    west, south, east, north = BOUNDS
    return round(
        TARGET_WIDTH
        * (mercator_y(north) - mercator_y(south))
        / math.radians(east - west)
    )


TARGET_HEIGHT = output_height()


def pixel_x(longitude: float, width: int) -> int:
    return round(((longitude + 180.0) / 360.0) * width)


def pixel_y(latitude: float, height: int) -> int:
    return round(((90.0 - latitude) / 180.0) * height)


def art_direct(image: Image.Image) -> Image.Image:
    # Preserve materially more local land-cover detail than WP3.9B2 while
    # keeping the same approved green/brown/blue strategic-map direction.
    image = ImageEnhance.Brightness(image).enhance(1.10)
    image = ImageEnhance.Color(image).enhance(1.38)
    image = ImageEnhance.Contrast(image).enhance(1.18)
    image = ImageEnhance.Sharpness(image).enhance(1.30)

    pixels = np.asarray(image.convert('RGB'), dtype=np.float32) / 255.0
    red = pixels[:, :, 0]
    green = pixels[:, :, 1]
    blue = pixels[:, :, 2]
    luminance = 0.2126 * red + 0.7152 * green + 0.0722 * blue

    water = np.clip((blue - red) * 3.0 + (0.22 - luminance) * 3.5, 0.0, 1.0)
    water_target = np.stack((
        np.full_like(red, 0.035),
        np.full_like(red, 0.25),
        np.full_like(red, 0.39),
    ), axis=2)
    water_weight = (water * 0.72)[:, :, None]
    pixels = pixels * (1.0 - water_weight) + water_target * water_weight

    vegetation = np.clip((green - red * 0.72) * 2.0 + (green - blue) * 0.7, 0.0, 1.0)
    vegetation *= (1.0 - water)
    vegetation_target = np.stack((
        np.full_like(red, 0.19),
        np.full_like(red, 0.39),
        np.full_like(red, 0.12),
    ), axis=2)
    # Slightly less homogenising green blend than B2 so real cultivated and
    # woodland variation survives at local zoom.
    veg_weight = (vegetation * 0.14)[:, :, None]
    pixels = pixels * (1.0 - veg_weight) + vegetation_target * veg_weight

    result = Image.fromarray((np.clip(pixels, 0.0, 1.0) * 255.0).astype(np.uint8), 'RGB')
    return result.filter(ImageFilter.UnsharpMask(radius=0.9, percent=135, threshold=2))


def warp_to_web_mercator(image: Image.Image) -> Image.Image:
    source = np.asarray(image.convert('RGB'), dtype=np.float32)
    source_height = source.shape[0]
    _west, south, _east, north = BOUNDS
    north_y = mercator_y(north)
    south_y = mercator_y(south)
    destination_fraction = np.linspace(0.0, 1.0, TARGET_HEIGHT, dtype=np.float64)
    projected_y = north_y + destination_fraction * (south_y - north_y)
    latitude = np.degrees(np.arctan(np.sinh(projected_y)))
    source_y = (north - latitude) / (north - south) * (source_height - 1)
    lower = np.floor(source_y).astype(np.int32)
    upper = np.minimum(lower + 1, source_height - 1)
    weight = (source_y - lower).astype(np.float32)[:, None, None]
    warped = source[lower] * (1.0 - weight) + source[upper] * weight
    return Image.fromarray(np.clip(warped, 0, 255).astype(np.uint8), 'RGB')


def build(source: Path, output: Path, metadata: Path) -> None:
    with Image.open(source) as src:
        src.load()
        if src.size != (SOURCE_WIDTH, SOURCE_HEIGHT):
            raise RuntimeError(f'Unexpected NASA source dimensions {src.size}.')
        west, south, east, north = BOUNDS
        crop = src.convert('RGB').crop((
            pixel_x(west, src.width),
            pixel_y(north, src.height),
            pixel_x(east, src.width),
            pixel_y(south, src.height),
        ))

    # Downsample genuine 2 km/pixel source detail rather than upscaling B2.
    crop = crop.resize((TARGET_WIDTH, round(TARGET_WIDTH * 48 / 85)), Image.Resampling.LANCZOS)
    crop = art_direct(crop)
    crop = warp_to_web_mercator(crop)

    output.parent.mkdir(parents=True, exist_ok=True)
    crop.save(output, 'WEBP', quality=OUTPUT_QUALITY, method=6)
    payload = output.read_bytes()
    sha256 = hashlib.sha256(payload).hexdigest()

    metadata.write_text(json.dumps({
        'schemaVersion': 7,
        'id': 'r3-wp3-9b3-nasa-blue-marble-june-hires-v1',
        'source': 'NASA Blue Marble: Next Generation, June 2004 base map',
        'sourceUrl': 'https://assets.science.nasa.gov/content/dam/science/esd/eo/images/bmng/bmng-base/june/world.200406.3x21600x10800.jpg',
        'sourceResolution': '2 km/pixel global distribution image derived from MODIS composites',
        'sourceProjection': 'equirectangular',
        'deliveryProjection': 'Web Mercator latitude-warped image source',
        'bounds': list(BOUNDS),
        'dimensions': [TARGET_WIDTH, TARGET_HEIGHT],
        'format': 'webp',
        'quality': OUTPUT_QUALITY,
        'runtimeBytes': len(payload),
        'sha256': sha256,
        'normalBuildDependency': False,
        'purpose': 'presentation-only high-resolution satellite-derived physical colour beneath Copernicus DEM relief',
    }, indent=2) + '\n', encoding='utf-8')
    print(
        f'Wrote {output} ({len(payload):,} bytes, {TARGET_WIDTH}x{TARGET_HEIGHT}, '
        f'sha256 {sha256[:12]}…)'
    )


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument('source', type=Path)
    parser.add_argument('output', type=Path)
    parser.add_argument('metadata', type=Path)
    args = parser.parse_args()
    build(args.source, args.output, args.metadata)


if __name__ == '__main__':
    main()
