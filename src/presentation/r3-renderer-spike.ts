import {
  scoreRendererEvaluation,
  type RendererEvaluation,
  type RendererKind
} from './r3-renderer-foundation';

export type RendererSpikeDensity = 'representative' | 'dense';
export type RendererSpikePoint = readonly [number, number];

export interface RendererSpikeTerritory {
  id: string;
  points: readonly RendererSpikePoint[];
  selected: boolean;
}

export interface RendererSpikeRoute {
  id: string;
  from: RendererSpikePoint;
  to: RendererSpikePoint;
  critical: boolean;
}

export interface RendererSpikePiece {
  id: string;
  x: number;
  y: number;
  selected: boolean;
}

export interface RendererSpikeScene {
  width: number;
  height: number;
  camera: {
    x: number;
    y: number;
    width: number;
    height: number;
    zoomPercent: number;
  };
  territories: readonly RendererSpikeTerritory[];
  routes: readonly RendererSpikeRoute[];
  pieces: readonly RendererSpikePiece[];
  overlayCount: number;
  selectedTerritoryId: string;
  selectedPieceId: string;
}

export interface SvgDomSpikePlan {
  territoryPolygons: readonly string[];
  routeLines: readonly string[];
  pieceTransforms: readonly string[];
  overlayCount: number;
}

export interface WebGlHybridSpikePlan {
  territoryTriangles: Float32Array;
  routeVertices: Float32Array;
  pieceVertices: Float32Array;
  domOverlayCount: number;
}

export interface WebGlCapability {
  supported: boolean;
  api: 'webgl2' | 'webgl' | 'none';
  maxTextureSize: number;
  maxRenderbufferSize: number;
}

const polygonCentre = (points: readonly RendererSpikePoint[]): RendererSpikePoint => {
  const total = points.reduce<[number, number]>((accumulator, [x, y]) => [
    accumulator[0] + x,
    accumulator[1] + y
  ], [0, 0]);
  return [total[0] / points.length, total[1] / points.length];
};

/**
 * Synthetic but deliberately over-representative WP1 scene. The dense profile
 * keeps the current 15-territory campaign footprint while substantially raising
 * route, piece and overlay pressure so the renderer decision has headroom.
 */
export const createRendererSpikeScene = (density: RendererSpikeDensity = 'representative'): RendererSpikeScene => {
  const territoryCount = 15;
  const routeCount = density === 'dense' ? 72 : 36;
  const pieceCount = density === 'dense' ? 120 : 48;
  const overlayCount = density === 'dense' ? 90 : 30;

  const territories: RendererSpikeTerritory[] = Array.from({ length: territoryCount }, (_, index) => {
    const column = index % 5;
    const row = Math.floor(index / 5);
    const x = 70 + column * 150 + (row % 2) * 32;
    const y = 70 + row * 150;
    return {
      id: `T-${index + 1}`,
      points: [
        [x, y - 42],
        [x + 48, y - 18],
        [x + 42, y + 38],
        [x, y + 52],
        [x - 44, y + 34],
        [x - 50, y - 16]
      ],
      selected: index === 6
    };
  });

  const routes: RendererSpikeRoute[] = Array.from({ length: routeCount }, (_, index) => {
    const from = territories[index % territoryCount];
    const to = territories[(index * 7 + 3) % territoryCount];
    return {
      id: `R-${index + 1}`,
      from: polygonCentre(from.points),
      to: polygonCentre(to.points),
      critical: index % 9 === 0
    };
  });

  const pieces: RendererSpikePiece[] = Array.from({ length: pieceCount }, (_, index) => {
    const territory = territories[index % territoryCount];
    const [x, y] = polygonCentre(territory.points);
    return {
      id: `P-${index + 1}`,
      x: x + (index % 4) * 7,
      y: y + (index % 3) * 7,
      selected: index === 2
    };
  });

  return {
    width: 900,
    height: 520,
    camera: { x: 0, y: 0, width: 900, height: 520, zoomPercent: 285 },
    territories,
    routes,
    pieces,
    overlayCount,
    selectedTerritoryId: 'T-7',
    selectedPieceId: 'P-3'
  };
};

export const prepareSvgDomSpikePlan = (scene: RendererSpikeScene): SvgDomSpikePlan => ({
  territoryPolygons: scene.territories.map(territory => territory.points.map(point => point.join(',')).join(' ')),
  routeLines: scene.routes.map(route => `${route.from[0]},${route.from[1]} ${route.to[0]},${route.to[1]}`),
  pieceTransforms: scene.pieces.map(piece => `translate(${piece.x} ${piece.y})`),
  overlayCount: scene.overlayCount
});

export const prepareWebGlHybridSpikePlan = (scene: RendererSpikeScene): WebGlHybridSpikePlan => {
  const territoryFloats: number[] = [];
  for (const territory of scene.territories) {
    const origin = territory.points[0];
    for (let index = 1; index < territory.points.length - 1; index += 1) {
      for (const point of [origin, territory.points[index], territory.points[index + 1]]) {
        territoryFloats.push(point[0], point[1], territory.selected ? 1 : 0);
      }
    }
  }

  const routeFloats: number[] = [];
  for (const route of scene.routes) {
    routeFloats.push(route.from[0], route.from[1], route.to[0], route.to[1], route.critical ? 1 : 0);
  }

  const pieceFloats: number[] = [];
  for (const piece of scene.pieces) pieceFloats.push(piece.x, piece.y, piece.selected ? 1 : 0);

  return {
    territoryTriangles: new Float32Array(territoryFloats),
    routeVertices: new Float32Array(routeFloats),
    pieceVertices: new Float32Array(pieceFloats),
    domOverlayCount: scene.overlayCount
  };
};

/**
 * Browser/device capability probe for the optional accelerated layer. The
 * renderer must fall back to SVG/DOM when neither WebGL API is available.
 */
export const probeWebGlCapability = (canvas: HTMLCanvasElement): WebGlCapability => {
  const options: WebGLContextAttributes = {
    alpha: true,
    antialias: true,
    depth: true,
    preserveDrawingBuffer: false,
    powerPreference: 'high-performance'
  };
  const webgl2 = canvas.getContext('webgl2', options);
  if (webgl2) {
    return {
      supported: true,
      api: 'webgl2',
      maxTextureSize: Number(webgl2.getParameter(webgl2.MAX_TEXTURE_SIZE)),
      maxRenderbufferSize: Number(webgl2.getParameter(webgl2.MAX_RENDERBUFFER_SIZE))
    };
  }
  const webgl = canvas.getContext('webgl', options);
  if (webgl) {
    return {
      supported: true,
      api: 'webgl',
      maxTextureSize: Number(webgl.getParameter(webgl.MAX_TEXTURE_SIZE)),
      maxRenderbufferSize: Number(webgl.getParameter(webgl.MAX_RENDERBUFFER_SIZE))
    };
  }
  return { supported: false, api: 'none', maxTextureSize: 0, maxRenderbufferSize: 0 };
};

export const R3_WP1_RENDERER_EVALUATIONS: readonly RendererEvaluation[] = [
  {
    renderer: 'svg-dom',
    maintainability: 5,
    visualCapability: 4.2,
    performance: 4.2,
    accessibilityIntegration: 5,
    deploymentCompatibility: 5,
    implementationRisk: 1,
    evidence: [
      'Current production renderer already preserves projection, hit-testing, keyboard, pointer and contextual navigation behaviour.',
      'The active campaign has 15 territory geometries and the dense spike keeps SVG preparation far below a frame budget.',
      'Layered paths, filters, masks, gradients and DOM/SVG transforms are sufficient for the approved command-table 2.5D target.',
      'No new runtime dependency or accessibility bridge is required.'
    ]
  },
  {
    renderer: 'webgl-hybrid',
    maintainability: 3,
    visualCapability: 5,
    performance: 5,
    accessibilityIntegration: 3,
    deploymentCompatibility: 4.5,
    implementationRisk: 3,
    evidence: [
      'Typed-buffer preparation is materially cheaper in the synthetic dense scene and offers higher effect/piece scaling headroom.',
      'WebGL still requires a DOM/SVG accessibility and command overlay plus explicit unsupported-device fallback.',
      'The current campaign scale does not yet demonstrate a production bottleneck that justifies replacing mature SVG interaction code.',
      'The renderer-neutral frame keeps WebGL available later for effect-heavy layers without forcing a WP1 migration.'
    ]
  }
];

export const rankedRendererEvaluations = () => [...R3_WP1_RENDERER_EVALUATIONS]
  .map(evaluation => ({ evaluation, score: scoreRendererEvaluation(evaluation) }))
  .sort((first, second) => second.score - first.score);

export const preferredR3Renderer = (): RendererKind => rankedRendererEvaluations()[0].evaluation.renderer;

export const R3_WP1_PRIMARY_RENDERER: RendererKind = 'svg-dom';
