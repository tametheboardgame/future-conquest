export interface SpatialGridPoint {
  x: number;
  y: number;
}

/**
 * Small deterministic screen-space spatial index used by hot interaction paths.
 * Buckets preserve insertion order, so callers retain their existing priority
 * and tie-break semantics while avoiding an all-pairs scan.
 */
export class DeterministicSpatialGrid<T extends SpatialGridPoint> {
  readonly cellSize: number;
  private readonly buckets = new Map<string, T[]>();

  constructor(cellSize: number) {
    if (!Number.isFinite(cellSize) || cellSize <= 0) {
      throw new RangeError('Spatial grid cell size must be a positive finite number.');
    }
    this.cellSize = cellSize;
  }

  private cell(value: number) {
    return Math.floor(value / this.cellSize);
  }

  private key(x: number, y: number) {
    return `${x}:${y}`;
  }

  insert(item: T) {
    if (!Number.isFinite(item.x) || !Number.isFinite(item.y)) return;
    const key = this.key(this.cell(item.x), this.cell(item.y));
    const bucket = this.buckets.get(key);
    if (bucket) bucket.push(item);
    else this.buckets.set(key, [item]);
  }

  someNearby(x: number, y: number, radius: number, predicate: (item: T) => boolean) {
    if (!Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(radius) || radius < 0) return false;
    const minX = this.cell(x - radius);
    const maxX = this.cell(x + radius);
    const minY = this.cell(y - radius);
    const maxY = this.cell(y + radius);

    for (let cellY = minY; cellY <= maxY; cellY += 1) {
      for (let cellX = minX; cellX <= maxX; cellX += 1) {
        const bucket = this.buckets.get(this.key(cellX, cellY));
        if (!bucket) continue;
        for (const item of bucket) {
          if (predicate(item)) return true;
        }
      }
    }
    return false;
  }

  clear() {
    this.buckets.clear();
  }
}
