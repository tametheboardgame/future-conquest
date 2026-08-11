import type { MapViewBox } from '../game/map-viewport';

export const R3_CAMERA_TRANSITION_MS = 320;

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
