declare module 'topojson-client' {
  export function feature(topology: unknown, object: unknown): unknown;
}

declare module 'd3-geo' {
  export function geoCentroid(object: unknown): [number, number];
  export function geoGraticule10(): unknown;
  export function geoMercator(): {
    fitExtent(extent: [[number, number], [number, number]], object: unknown): unknown;
    (coordinates: [number, number]): [number, number] | null;
  };
  export function geoPath(projection: unknown): {
    (object: unknown): string | null;
    bounds(object: unknown): [[number, number], [number, number]];
  };
}
