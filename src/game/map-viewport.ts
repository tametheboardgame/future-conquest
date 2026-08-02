export interface MapViewBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface MapPoint {
  x: number;
  y: number;
}

export const MAP_WIDTH = 1440;
export const MAP_HEIGHT = 900;
export const MAP_ASPECT = MAP_WIDTH / MAP_HEIGHT;
export const MIN_VIEW_WIDTH = 72;
export const FULL_THEATRE_VIEW: MapViewBox = { x: 0, y: 0, width: MAP_WIDTH, height: MAP_HEIGHT };

const clamp = (value: number, minimum: number, maximum: number) => Math.max(minimum, Math.min(maximum, value));

export function clampMapView(view: MapViewBox): MapViewBox {
  const width = clamp(view.width, MIN_VIEW_WIDTH, MAP_WIDTH);
  const height = width / MAP_ASPECT;
  return {
    x: clamp(view.x, 0, MAP_WIDTH - width),
    y: clamp(view.y, 0, MAP_HEIGHT - height),
    width,
    height
  };
}

export function panMapView(view: MapViewBox, deltaX: number, deltaY: number): MapViewBox {
  return clampMapView({ ...view, x: view.x + deltaX, y: view.y + deltaY });
}

export function zoomMapView(view: MapViewBox, factor: number, anchor: MapPoint): MapViewBox {
  const safeFactor = Number.isFinite(factor) && factor > 0 ? factor : 1;
  const width = clamp(view.width / safeFactor, MIN_VIEW_WIDTH, MAP_WIDTH);
  const height = width / MAP_ASPECT;
  const horizontalRatio = view.width ? (anchor.x - view.x) / view.width : 0.5;
  const verticalRatio = view.height ? (anchor.y - view.y) / view.height : 0.5;
  return clampMapView({
    x: anchor.x - horizontalRatio * width,
    y: anchor.y - verticalRatio * height,
    width,
    height
  });
}

export function focusMapView(center: MapPoint, zoom = 3): MapViewBox {
  const width = clamp(MAP_WIDTH / Math.max(1, zoom), MIN_VIEW_WIDTH, MAP_WIDTH);
  const height = width / MAP_ASPECT;
  return clampMapView({
    x: center.x - width / 2,
    y: center.y - height / 2,
    width,
    height
  });
}

export function fitMapBounds(
  bounds: [[number, number], [number, number]],
  padding = 42
): MapViewBox {
  const [[left, top], [right, bottom]] = bounds;
  const contentWidth = Math.max(1, right - left + padding * 2);
  const contentHeight = Math.max(1, bottom - top + padding * 2);
  const width = Math.max(contentWidth, contentHeight * MAP_ASPECT);
  const height = width / MAP_ASPECT;
  return clampMapView({
    x: (left + right) / 2 - width / 2,
    y: (top + bottom) / 2 - height / 2,
    width,
    height
  });
}

export function screenPointToMap(
  clientX: number,
  clientY: number,
  rect: Pick<DOMRect, 'left' | 'top' | 'width' | 'height'>,
  view: MapViewBox
): MapPoint {
  return {
    x: view.x + ((clientX - rect.left) / Math.max(1, rect.width)) * view.width,
    y: view.y + ((clientY - rect.top) / Math.max(1, rect.height)) * view.height
  };
}

export function mapZoomPercent(view: MapViewBox): number {
  return Math.round((MAP_WIDTH / view.width) * 100);
}
