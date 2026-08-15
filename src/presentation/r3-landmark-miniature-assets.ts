export type LandmarkMiniatureCityVariant = 'london' | 'paris' | 'brussels';
export type LandmarkMiniatureRollout = 'runtime' | 'authoring';

export interface LandmarkMiniatureAssetDefinition {
  nodeId: 'N-LONDON' | 'N-PARIS' | 'N-BRUSSELS';
  cityVariant: LandmarkMiniatureCityVariant;
  assetId: string;
  selectedUrl: string;
  selectedScale: number;
  rotationZ: number;
  landmarks: readonly string[];
  visualReference: string;
  authoredFaceCount: number;
  rollout: LandmarkMiniatureRollout;
}

const assetUrl = (filename: string) => `${import.meta.env.BASE_URL}miniatures/wp3-8a/${filename}`;

/**
 * WP3.8A v2 treats the approved board-game-piece renders as the canonical art
 * target. Authored self-hosted glTF miniatures replace the primitive hero model
 * in Selected view only after that city's source asset has completed the new
 * build/browser/performance path. Theatre/Campaign and any load failure retain
 * the cheap procedural fallback.
 */
export const WP38A_LANDMARK_MINIATURE_ASSETS: Readonly<Record<LandmarkMiniatureAssetDefinition['nodeId'], LandmarkMiniatureAssetDefinition>> = {
  'N-LONDON': {
    nodeId: 'N-LONDON',
    cityVariant: 'london',
    assetId: 'wp3.8a-v2-london-selected',
    selectedUrl: assetUrl('london-selected.gltf'),
    selectedScale: 0.62,
    rotationZ: -0.12,
    landmarks: ['Elizabeth Tower / Big Ben', 'Palace of Westminster'],
    visualReference: 'london-approved-reference.webp',
    authoredFaceCount: 3352,
    rollout: 'runtime'
  },
  'N-PARIS': {
    nodeId: 'N-PARIS',
    cityVariant: 'paris',
    assetId: 'wp3.8a-v2-paris-selected',
    selectedUrl: assetUrl('paris-selected.gltf'),
    selectedScale: 0.88,
    rotationZ: 0.14,
    landmarks: ['Eiffel Tower', 'Arc de Triomphe'],
    visualReference: 'paris-approved-reference.webp',
    authoredFaceCount: 7372,
    rollout: 'authoring'
  },
  'N-BRUSSELS': {
    nodeId: 'N-BRUSSELS',
    cityVariant: 'brussels',
    assetId: 'wp3.8a-v2-brussels-selected',
    selectedUrl: assetUrl('brussels-selected.gltf'),
    selectedScale: 0.95,
    rotationZ: -0.08,
    landmarks: ['Atomium', 'Brussels Town Hall / Grand-Place spire'],
    visualReference: 'brussels-approved-reference.webp',
    authoredFaceCount: 5872,
    rollout: 'authoring'
  }
};

export function landmarkMiniatureAssetForNode(nodeId: string): LandmarkMiniatureAssetDefinition | undefined {
  const asset = WP38A_LANDMARK_MINIATURE_ASSETS[nodeId as LandmarkMiniatureAssetDefinition['nodeId']];
  return asset?.rollout === 'runtime' ? asset : undefined;
}
