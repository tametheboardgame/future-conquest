import type { MapViewBox } from '../game/map-viewport';

export const R3_CAMERA_TRANSITION_MS = 320;

export interface CameraFrameScheduler {
  now(): number;
  request(callback: (timestamp: number) => void): number;
  cancel(handle: number): void;
}

export interface CameraTransitionOptions {
  durationMs?: number;
  reducedMotion?: boolean;
  scheduler?: CameraFrameScheduler;
}

const clampUnit = (value: number) => Math.max(0, Math.min(1, Number.isFinite(value) ? value : 0));

export const easeCameraProgress = (progress: number) => {
  const value = clampUnit(progress);
  return value < 0.5
    ? 4 * value * value * value
    : 1 - Math.pow(-2 * value + 2, 3) / 2;
};

/**
 * Interpolates between two already-valid viewport boxes. Map viewport constraints
 * are convex, so interpolating valid endpoints preserves bounds/aspect while
 * avoiding any change to authoritative geographic geometry.
 */
export const interpolateMapView = (
  from: Readonly<MapViewBox>,
  to: Readonly<MapViewBox>,
  progress: number
): MapViewBox => {
  const eased = easeCameraProgress(progress);
  const interpolate = (start: number, finish: number) => start + (finish - start) * eased;
  return {
    x: interpolate(from.x, to.x),
    y: interpolate(from.y, to.y),
    width: interpolate(from.width, to.width),
    height: interpolate(from.height, to.height)
  };
};

export const cameraViewsEquivalent = (
  first: Readonly<MapViewBox>,
  second: Readonly<MapViewBox>,
  tolerance = 0.01
) => Math.abs(first.x - second.x) <= tolerance
  && Math.abs(first.y - second.y) <= tolerance
  && Math.abs(first.width - second.width) <= tolerance
  && Math.abs(first.height - second.height) <= tolerance;

const browserScheduler = (): CameraFrameScheduler | undefined => {
  if (typeof window === 'undefined' || typeof window.requestAnimationFrame !== 'function') return undefined;
  return {
    now: () => window.performance.now(),
    request: callback => window.requestAnimationFrame(callback),
    cancel: handle => window.cancelAnimationFrame(handle)
  };
};

/**
 * Runnable camera-transition primitive used by the WP1 spike and later map
 * integration. It emits the exact start/end views, can be cancelled safely,
 * and collapses immediately to the destination when reduced motion is active.
 */
export const runCameraTransition = (
  from: Readonly<MapViewBox>,
  to: Readonly<MapViewBox>,
  onFrame: (view: MapViewBox) => void,
  options: CameraTransitionOptions = {}
) => {
  const durationMs = Math.max(0, options.durationMs ?? R3_CAMERA_TRANSITION_MS);
  const scheduler = options.scheduler ?? browserScheduler();

  if (options.reducedMotion || durationMs === 0 || !scheduler || cameraViewsEquivalent(from, to)) {
    onFrame({ ...to });
    return () => {};
  }

  const startedAt = scheduler.now();
  let frameHandle: number | undefined;
  let cancelled = false;

  onFrame({ ...from });

  const tick = (timestamp: number) => {
    if (cancelled) return;
    const progress = clampUnit((timestamp - startedAt) / durationMs);
    onFrame(interpolateMapView(from, to, progress));
    if (progress < 1) frameHandle = scheduler.request(tick);
    else frameHandle = undefined;
  };

  frameHandle = scheduler.request(tick);

  return () => {
    cancelled = true;
    if (frameHandle !== undefined) scheduler.cancel(frameHandle);
    frameHandle = undefined;
  };
};
