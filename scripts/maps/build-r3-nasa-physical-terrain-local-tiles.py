#!/usr/bin/env python3
"""Author WP3.9B3 local-detail raster tiles from NASA Blue Marble 500 m imagery.

This is deliberately a local-zoom LOD, not another continent-sized texture.
WP3.9B2's tiny broad image remains suitable beneath theatre/campaign views;
these 512px Web Mercator tiles add genuine 500 m source detail from zoom 7 up.
Normal game builds never contact NASA.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import math
from pathlib import Path

import numpy as np
from PIL import Image, ImageEnhance

SOURCE_SIZE = 21600
TILE_SIZE = 512
ZOOM = 7
BOUNDS = (-30.0, 28.0, 55.0, 76.0)
WEBP_QUALITY = 72

# Each trusted NASA 500 m authoring tile is exactly 21600 x 21600.
Image.MAX_IMAGE_PIXELS = SOURCE_SIZE * SOURCE_SIZE


def lon_to_tile_x(lon: float, zoom: int) -> float:
    return (lon + 180.0) / 360.0 * (2 ** zoom)


def lat_to_tile_y(lat: float, zoom: int) -> float:
    rad = math.radians(lat)
    return (1.0 - math.asinh(math.tan(rad)) / math.pi) / 2.0 * (2 ** zoom)


def tile_lon(x: float, zoom: int) -> float:
    return x / (2 ** zoom) * 360.0 - 180.0


def tile_lat(y: float, zoom: int) -> float:
    return math.degrees(math.atan(math.sinh(math.pi * (1.0 - 2.0 * y / (2 ** zoom)))))


def source_x(lon: float, eastern: bool) -> float:
    if eastern:
        return lon / 90.0 * SOURCE_SIZE
    return (lon + 90.0) / 90.0 * SOURCE_SIZE


def source_y(lat: float) -> float:
    return (90.0 - lat) / 90.0 * SOURCE_SIZE


def tile_ranges() -> tuple[range, range]:
    west, south, east, north = BOUNDS
    xmin = math.floor(lon_to_tile_x(west, ZOOM))
    xmax = math.floor(lon_to_tile_x(math.nextafter(east, -math.inf), ZOOM))
    ymin = math.floor(lat_to_tile_y(north, ZOOM))
    ymax = math.floor(lat_to_tile_y(math.nextafter(south, math.inf), ZOOM))
    return range(xmin, xmax + 1), range(ymin, ymax + 1)


def build_mesh(x: int, y: int, eastern: bool) -> list[tuple[tuple[int, int, int, int], tuple[float, ...]]]:
    # Web Mercator latitude is nonlinear. Mapping 32 horizontal strips keeps
    # projection error well below a source pixel at this zoom while allowing
    # Pillow to resample directly from the trusted 500 m JPEG in C.
    strips = 32
    lon_left = tile_lon(x, ZOOM)
    lon_right = tile_lon(x + 1, ZOOM)
    sx_left = source_x(lon_left, eastern)
    sx_right = source_x(lon_right, eastern)
    mesh = []
    for index in range(strips):
        py0 = round(index * TILE_SIZE / strips)
        py1 = round((index + 1) * TILE_SIZE / strips)
        wy0 = y + py0 / TILE_SIZE
        wy1 = y + py1 / TILE_SIZE
        sy0 = source_y(tile_lat(wy0, ZOOM))
        sy1 = source_y(tile_lat(wy1, ZOOM))
        mesh.append(((0, py0, TILE_SIZE, py1), (
            sx_left, sy0,
            sx_right, sy0,
            sx_right, sy1,
            sx_left, sy1,
        )))
    return mesh


def art_direct(image: Image.Image) -> Image.Image:
    # Global/per-pixel transforms only: no per-tile blur/sharpen kernels, so
    # adjacent tiles cannot acquire processing seams.
    image = ImageEnhance.Brightness(image).enhance(1.08)
    image = ImageEnhance.Color(image).enhance(1.34)
    image = ImageEnhance.Contrast(image).enhance(1.16)

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
    water_weight = (water * 0.70)[:, :, None]
    pixels = pixels * (1.0 - water_weight) + water_target * water_weight

    vegetation = np.clip((green - red * 0.72) * 2.0 + (green - blue) * 0.7, 0.0, 1.0)
    vegetation *= (1.0 - water)
    vegetation_target = np.stack((
        np.full_like(red, 0.19),
        np.full_like(red, 0.39),
        np.full_like(red, 0.12),
    ), axis=2)
    # Keep the blend light so real farmland/woodland texture survives.
    veg_weight = (vegetation * 0.10)[:, :, None]
    pixels = pixels * (1.0 - veg_weight) + vegetation_target * veg_weight

    return Image.fromarray((np.clip(pixels, 0.0, 1.0) * 255.0).astype(np.uint8), 'RGB')


def generate_for_source(source_path: Path, output_dir: Path, eastern: bool, xs: range, ys: range) -> list[Path]:
    side = 'east' if eastern else 'west'
    with Image.open(source_path) as source:
        source.load()
        if source.size != (SOURCE_SIZE, SOURCE_SIZE):
            raise RuntimeError(f'Unexpected NASA {side} tile dimensions {source.size}.')
        source = source.convert('RGB')
        outputs: list[Path] = []
        for x in xs:
            if eastern != (x >= 2 ** (ZOOM - 1)):
                continue
            for y in ys:
                tile = source.transform(
                    (TILE_SIZE, TILE_SIZE),
                    Image.Transform.MESH,
                    build_mesh(x, y, eastern),
                    resample=Image.Resampling.BICUBIC,
                )
                tile = art_direct(tile)
                path = output_dir / str(ZOOM) / str(x) / f'{y}.webp'
                path.parent.mkdir(parents=True, exist_ok=True)
                tile.save(path, 'WEBP', quality=WEBP_QUALITY, method=4)
                outputs.append(path)
        return outputs


def write_manifest(output_dir: Path, files: list[Path], manifest_path: Path) -> None:
    files = sorted(files, key=lambda path: path.as_posix())
    digest = hashlib.sha256()
    total_bytes = 0
    maximum_bytes = 0
    for path in files:
        payload = path.read_bytes()
        relative = path.relative_to(output_dir).as_posix()
        digest.update(relative.encode('utf-8'))
        digest.update(b'\0')
        digest.update(payload)
        total_bytes += len(payload)
        maximum_bytes = max(maximum_bytes, len(payload))

    xs, ys = tile_ranges()
    manifest = {
        'schemaVersion': 1,
        'id': 'r3-wp3-9b3-nasa-blue-marble-500m-local-z7-v1',
        'source': 'NASA Blue Marble: Next Generation, June 2004, 500 m tiled distribution',
        'sourceTiles': ['B1', 'C1'],
        'sourceResolution': '500 m/pixel',
        'projection': 'Web Mercator XYZ',
        'bounds': list(BOUNDS),
        'tileSize': TILE_SIZE,
        'minzoom': ZOOM,
        'maxzoom': ZOOM,
        'format': 'webp',
        'quality': WEBP_QUALITY,
        'xRange': [xs.start, xs.stop - 1],
        'yRange': [ys.start, ys.stop - 1],
        'tileCount': len(files),
        'totalBytes': total_bytes,
        'averageBytes': round(total_bytes / len(files), 2),
        'maximumBytes': maximum_bytes,
        'contentSha256': digest.hexdigest(),
        'normalBuildDependency': False,
        'purpose': 'local-zoom physical colour detail above the WP3.9B2 broad physical colour base',
    }
    manifest_path.parent.mkdir(parents=True, exist_ok=True)
    manifest_path.write_text(json.dumps(manifest, indent=2) + '\n', encoding='utf-8')
    print(json.dumps(manifest, indent=2))


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument('west_source', type=Path, help='NASA June 500 m B1 JPEG')
    parser.add_argument('east_source', type=Path, help='NASA June 500 m C1 JPEG')
    parser.add_argument('output_dir', type=Path)
    parser.add_argument('manifest', type=Path)
    args = parser.parse_args()

    xs, ys = tile_ranges()
    expected = len(xs) * len(ys)
    args.output_dir.mkdir(parents=True, exist_ok=True)
    west = generate_for_source(args.west_source, args.output_dir, False, xs, ys)
    east = generate_for_source(args.east_source, args.output_dir, True, xs, ys)
    files = west + east
    if len(files) != expected:
        raise RuntimeError(f'Expected {expected} Europe tiles, generated {len(files)}.')
    write_manifest(args.output_dir, files, args.manifest)


if __name__ == '__main__':
    main()
