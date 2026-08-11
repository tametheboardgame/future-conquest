#!/usr/bin/env python3
"""Build MapLibre Terrain-RGB tiles from public Copernicus DEM COGs.

The source COGs are read by HTTP range requests from the AWS Registry of Open
Data. No AWS account or Copernicus browser credential is required.

This is a build-time tool. Browser runtime must consume only the generated PNG
tiles/TileJSON, never the source COG endpoints.
"""
from __future__ import annotations

import argparse
import json
import math
from pathlib import Path
from typing import Iterable

import mercantile
import numpy as np
import requests
from PIL import Image
from rio_tiler.io import COGReader
from rio_tiler.mosaic import mosaic_reader

BUCKETS = {
    "glo30": {
        "base": "https://copernicus-dem-30m.s3.amazonaws.com",
        "resolution": "10",
        "dataset": "COP-DEM-GLO-30",
    },
    "glo90": {
        "base": "https://copernicus-dem-90m.s3.amazonaws.com",
        "resolution": "30",
        "dataset": "COP-DEM-GLO-90",
    },
}

DEFAULT_BOUNDS = (-5.8, 44.0, 14.8, 53.8)
USER_AGENT = "future-conquest-r3-terrain-builder/1.0"


def _degree_token(value: int, positive: str, negative: str, width: int) -> str:
    hemisphere = positive if value >= 0 else negative
    return f"{hemisphere}{abs(value):0{width}d}_00"


def source_prefix(dataset_key: str, lat: int, lon: int) -> str:
    resolution = BUCKETS[dataset_key]["resolution"]
    northing = _degree_token(lat, "N", "S", 2)
    easting = _degree_token(lon, "E", "W", 3)
    return f"Copernicus_DSM_COG_{resolution}_{northing}_{easting}_DEM"


def source_url(dataset_key: str, lat: int, lon: int) -> str:
    prefix = source_prefix(dataset_key, lat, lon)
    return f"{BUCKETS[dataset_key]['base']}/{prefix}/{prefix}.tif"


def load_tile_index(dataset_key: str) -> set[str]:
    url = f"{BUCKETS[dataset_key]['base']}/tileList.txt"
    response = requests.get(url, timeout=30, headers={"User-Agent": USER_AGENT})
    response.raise_for_status()
    return {line.strip().rstrip("/") for line in response.text.splitlines() if line.strip()}


def source_cells_for_bounds(bounds: mercantile.LngLatBbox) -> Iterable[tuple[int, int]]:
    west = max(-180.0, bounds.west)
    east = min(180.0, bounds.east)
    south = max(-90.0, bounds.south)
    north = min(90.0, bounds.north)

    lon_start = math.floor(west)
    lon_end = math.ceil(east) - 1
    lat_start = math.floor(south)
    lat_end = math.ceil(north) - 1
    for lat in range(lat_start, lat_end + 1):
        for lon in range(lon_start, lon_end + 1):
            yield lat, lon


def assets_for_tile(
    tile: mercantile.Tile,
    primary_key: str,
    fallback_key: str,
    indexes: dict[str, set[str]],
) -> tuple[list[str], str]:
    bounds = mercantile.bounds(tile)
    primary: list[str] = []
    needs_fallback = False

    for lat, lon in source_cells_for_bounds(bounds):
        primary_prefix = source_prefix(primary_key, lat, lon)
        fallback_prefix = source_prefix(fallback_key, lat, lon)
        if primary_prefix in indexes[primary_key]:
            primary.append(source_url(primary_key, lat, lon))
        elif fallback_prefix in indexes[fallback_key]:
            needs_fallback = True

    if needs_fallback:
        # Mixed-resolution mosaics are intentionally avoided. If even one 30m
        # source cell is unavailable, use the complete 90m set for this output
        # web tile so seams and interpolation stay predictable.
        fallback: list[str] = []
        for lat, lon in source_cells_for_bounds(bounds):
            prefix = source_prefix(fallback_key, lat, lon)
            if prefix in indexes[fallback_key]:
                fallback.append(source_url(fallback_key, lat, lon))
        return fallback, fallback_key

    return primary, primary_key


def read_asset_tile(asset: str, tile: mercantile.Tile):
    with COGReader(asset) as cog:
        return cog.tile(
            tile.x,
            tile.y,
            tile.z,
            tilesize=256,
            resampling_method="bilinear",
            reproject_method="bilinear",
        )


def read_dem_tile(assets: list[str], tile: mercantile.Tile) -> np.ndarray:
    if not assets:
        return np.zeros((256, 256), dtype=np.float32)

    image, _ = mosaic_reader(assets, read_asset_tile, tile=tile)
    data = image.data[0].astype(np.float32)
    mask = image.mask > 0
    return np.where(mask, data, 0.0)


def encode_mapbox_terrain_rgb(elevation: np.ndarray) -> np.ndarray:
    safe = np.nan_to_num(elevation, nan=0.0, posinf=0.0, neginf=0.0)
    safe = np.clip(safe, -10000.0, 1667721.5)
    encoded = np.rint((safe + 10000.0) * 10.0).astype(np.uint32)
    rgb = np.empty((safe.shape[0], safe.shape[1], 3), dtype=np.uint8)
    rgb[..., 0] = (encoded >> 16) & 255
    rgb[..., 1] = (encoded >> 8) & 255
    rgb[..., 2] = encoded & 255
    return rgb


def write_tile(path: Path, elevation: np.ndarray) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    Image.fromarray(encode_mapbox_terrain_rgb(elevation), mode="RGB").save(
        path,
        format="PNG",
        optimize=True,
    )


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--output", default="public/generated/r3-terrain")
    parser.add_argument("--bounds", nargs=4, type=float, default=DEFAULT_BOUNDS)
    parser.add_argument("--min-zoom", type=int, default=4)
    parser.add_argument("--max-zoom", type=int, default=7)
    parser.add_argument("--primary", choices=BUCKETS, default="glo30")
    parser.add_argument("--fallback", choices=BUCKETS, default="glo90")
    args = parser.parse_args()

    west, south, east, north = args.bounds
    if not (west < east and south < north):
        raise SystemExit("invalid --bounds ordering")
    if args.min_zoom < 0 or args.max_zoom < args.min_zoom:
        raise SystemExit("invalid zoom range")

    output = Path(args.output)
    output.mkdir(parents=True, exist_ok=True)

    indexes = {
        args.primary: load_tile_index(args.primary),
        args.fallback: load_tile_index(args.fallback),
    }
    stats = {
        "tiles": 0,
        "primaryTiles": 0,
        "fallbackTiles": 0,
        "seaOnlyTiles": 0,
        "minimumElevationMetres": None,
        "maximumElevationMetres": None,
    }

    for tile in mercantile.tiles(west, south, east, north, range(args.min_zoom, args.max_zoom + 1)):
        assets, dataset_key = assets_for_tile(tile, args.primary, args.fallback, indexes)
        elevation = read_dem_tile(assets, tile)
        if not assets:
            stats["seaOnlyTiles"] += 1
        elif dataset_key == args.primary:
            stats["primaryTiles"] += 1
        else:
            stats["fallbackTiles"] += 1

        local_min = float(np.min(elevation))
        local_max = float(np.max(elevation))
        stats["minimumElevationMetres"] = (
            local_min if stats["minimumElevationMetres"] is None
            else min(stats["minimumElevationMetres"], local_min)
        )
        stats["maximumElevationMetres"] = (
            local_max if stats["maximumElevationMetres"] is None
            else max(stats["maximumElevationMetres"], local_max)
        )
        stats["tiles"] += 1

        write_tile(output / "tiles" / str(tile.z) / str(tile.x) / f"{tile.y}.png", elevation)

    attribution = (
        "produced using Copernicus WorldDEM-30 © DLR e.V. 2010-2014 and "
        "© Airbus Defence and Space GmbH 2014-2018 provided under COPERNICUS "
        "by the European Union and ESA; all rights reserved"
    )
    tilejson = {
        "tilejson": "3.0.0",
        "name": "Future Conquest R3 Copernicus terrain prototype",
        "description": "Static Mapbox Terrain-RGB tiles derived at build time from public Copernicus DEM COGs.",
        "version": "1.0.0",
        "scheme": "xyz",
        "tiles": ["./tiles/{z}/{x}/{y}.png"],
        "minzoom": args.min_zoom,
        "maxzoom": args.max_zoom,
        "bounds": [west, south, east, north],
        "attribution": attribution,
        "futureConquest": {
            "source": "Copernicus DEM via AWS Registry of Open Data",
            "preferredDataset": BUCKETS[args.primary]["dataset"],
            "fallbackDataset": BUCKETS[args.fallback]["dataset"],
            "encoding": "mapbox-terrain-rgb",
            "stats": stats,
        },
    }
    (output / "tiles.json").write_text(json.dumps(tilejson, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(tilejson["futureConquest"], indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
