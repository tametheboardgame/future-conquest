export type MapDetailTier = 'theatre' | 'regional' | 'local' | 'tactical';

export type PresentationLayerId =
  | 'terrain'
  | 'political-control'
  | 'routes'
  | 'pieces'
  | 'effects'
  | 'overlays';

export type RendererKind = 'svg-dom' | 'webgl-hybrid';

export interface PresentationCamera {
  x: number;
  y: number;
  width: number;
  height: number;
  zoomPercent: number;
  detailTier: MapDetailTier;
}

export interface PresentationLayer<TPayload = unknown> {
  id: PresentationLayerId;
  visible: boolean;
  payload: TPayload;
}

/**
 * Renderer-facing state only. The authoritative GameState must be adapted into
 * this shape by presentation code; renderers must never mutate GameState.
 */
export interface MapPresentationFrame {
  sceneVersion: number;
  camera: PresentationCamera;
  layers: readonly PresentationLayer[];
  selectedTerritoryId?: string;
  selectedFormationId?: string;
}

export interface RendererMountContext {
  width: number;
  height: number;
  devicePixelRatio: number;
  reducedMotion: boolean;
}

/**
 * Common lifecycle contract for the R3 renderer spike. Implementations may be
 * SVG/DOM or WebGL-backed, but consume the same immutable presentation frame.
 */
export interface MapRendererAdapter {
  readonly id: string;
  readonly kind: RendererKind;
  mount(target: HTMLElement, context: RendererMountContext): void;
  render(frame: Readonly<MapPresentationFrame>): void;
  resize(context: RendererMountContext): void;
  destroy(): void;
}

export interface FrameBudgetSnapshot {
  sampleCount: number;
  averageFrameMs: number;
  worstFrameMs: number;
  estimatedFps: number;
  overBudgetRatio: number;
}

export interface RendererEvaluation {
  renderer: RendererKind;
  maintainability: number;
  visualCapability: number;
  performance: number;
  accessibilityIntegration: number;
  deploymentCompatibility: number;
  implementationRisk: number;
  evidence: readonly string[];
}

export const R3_SCENE_VERSION = 1;
export const R3_ASSET_NAMESPACE = 'r3-v1';
export const R3_TARGET_FRAME_MS = 1000 / 60;

export const resolveMapDetailTier = (zoomPercent: number): MapDetailTier => {
  if (zoomPercent >= 600) return 'tactical';
  if (zoomPercent >= 285) return 'local';
  if (zoomPercent >= 135) return 'regional';
  return 'theatre';
};

export const visibleLayersForTier = (tier: MapDetailTier): readonly PresentationLayerId[] => {
  if (tier === 'theatre') return ['terrain', 'political-control', 'routes', 'pieces', 'overlays'];
  if (tier === 'regional') return ['terrain', 'political-control', 'routes', 'pieces', 'effects', 'overlays'];
  return ['terrain', 'political-control', 'routes', 'pieces', 'effects', 'overlays'];
};

export const versionedAssetPath = (relativePath: string) => {
  const cleanPath = relativePath.replace(/^\/+/, '');
  return `assets/${R3_ASSET_NAMESPACE}/${cleanPath}`;
};

export const createFrameBudgetSampler = (maximumSamples = 120) => {
  const samples: number[] = [];

  const record = (frameMs: number) => {
    if (!Number.isFinite(frameMs) || frameMs < 0) return;
    samples.push(frameMs);
    if (samples.length > maximumSamples) samples.splice(0, samples.length - maximumSamples);
  };

  const snapshot = (): FrameBudgetSnapshot => {
    if (samples.length === 0) {
      return {
        sampleCount: 0,
        averageFrameMs: 0,
        worstFrameMs: 0,
        estimatedFps: 0,
        overBudgetRatio: 0
      };
    }

    const total = samples.reduce((sum, value) => sum + value, 0);
    const averageFrameMs = total / samples.length;
    const worstFrameMs = Math.max(...samples);
    const overBudgetCount = samples.filter(value => value > R3_TARGET_FRAME_MS).length;

    return {
      sampleCount: samples.length,
      averageFrameMs,
      worstFrameMs,
      estimatedFps: averageFrameMs > 0 ? 1000 / averageFrameMs : 0,
      overBudgetRatio: overBudgetCount / samples.length
    };
  };

  return { record, snapshot };
};

const clampScore = (score: number) => Math.max(0, Math.min(5, score));

/**
 * Higher is better. Implementation risk is inverted so a low-risk renderer is
 * rewarded rather than penalised. Runtime evidence must accompany final scores.
 */
export const scoreRendererEvaluation = (evaluation: RendererEvaluation) => {
  const maintainability = clampScore(evaluation.maintainability) * 0.2;
  const visualCapability = clampScore(evaluation.visualCapability) * 0.2;
  const performance = clampScore(evaluation.performance) * 0.2;
  const accessibility = clampScore(evaluation.accessibilityIntegration) * 0.15;
  const deployment = clampScore(evaluation.deploymentCompatibility) * 0.1;
  const riskReward = (5 - clampScore(evaluation.implementationRisk)) * 0.15;
  return maintainability + visualCapability + performance + accessibility + deployment + riskReward;
};
