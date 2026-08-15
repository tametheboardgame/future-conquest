export type LandmarkMiniatureCityVariant = 'london' | 'paris' | 'brussels' | 'amsterdam' | 'frankfurt' | 'bern' | 'strasbourg' | 'lyon' | 'luxembourg';
export type LandmarkMiniatureRollout = 'runtime' | 'authoring';

export interface LandmarkMiniatureAssetDefinition {
  nodeId: 'N-LONDON' | 'N-PARIS' | 'N-BRUSSELS' | 'N-AMSTERDAM' | 'N-FRANKFURT' | 'N-BERN' | 'N-STRASBOURG' | 'N-LYON' | 'N-LUXEMBOURG';
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

const assetUrl = (pass: 'wp3-8a' | 'wp3-8b' | 'wp3-8c', filename: string) => `${import.meta.env.BASE_URL}miniatures/${pass}/${filename}`;

/**
 * Authored landmark miniatures use the premium board-game-piece direction
 * established and accepted in WP3.8A. Campaign and Selected views use the
 * self-hosted glTF when available; Theatre and load failure retain the cheap
 * procedural fallback. The export name is retained for compatibility with the
 * existing world layer while the registry grows across the WP3.8 programme.
 */
export const WP38A_LANDMARK_MINIATURE_ASSETS: Readonly<Record<LandmarkMiniatureAssetDefinition['nodeId'], LandmarkMiniatureAssetDefinition>> = {
  'N-LONDON': {
    nodeId: 'N-LONDON',
    cityVariant: 'london',
    assetId: 'wp3.8a-v2-london-selected',
    selectedUrl: assetUrl('wp3-8a', 'london-selected.gltf'),
    selectedScale: 0.62,
    rotationZ: -0.12,
    landmarks: ['Elizabeth Tower / Big Ben', 'Palace of Westminster'],
    visualReference: 'london-approved-reference.webp',
    authoredFaceCount: 3604,
    rollout: 'runtime'
  },
  'N-PARIS': {
    nodeId: 'N-PARIS',
    cityVariant: 'paris',
    assetId: 'wp3.8a-v2-paris-selected',
    selectedUrl: assetUrl('wp3-8a', 'paris-selected.gltf'),
    selectedScale: 0.68,
    rotationZ: 0.14,
    landmarks: ['Eiffel Tower', 'Arc de Triomphe'],
    visualReference: 'paris-approved-reference.webp',
    authoredFaceCount: 4836,
    rollout: 'runtime'
  },
  'N-BRUSSELS': {
    nodeId: 'N-BRUSSELS',
    cityVariant: 'brussels',
    assetId: 'wp3.8a-v2-brussels-selected',
    selectedUrl: assetUrl('wp3-8a', 'brussels-selected.gltf'),
    selectedScale: 1.0,
    rotationZ: -0.08,
    landmarks: ['Atomium', 'Brussels Town Hall / Grand-Place spire'],
    visualReference: 'brussels-approved-reference.webp',
    authoredFaceCount: 4520,
    rollout: 'runtime'
  },
  'N-AMSTERDAM': {
    nodeId: 'N-AMSTERDAM',
    cityVariant: 'amsterdam',
    assetId: 'wp3.8b-amsterdam-selected',
    selectedUrl: assetUrl('wp3-8b', 'amsterdam-selected.gltf'),
    selectedScale: 0.92,
    rotationZ: -0.08,
    landmarks: ['Amsterdam canal-house gables', 'Westerkerk-style tower'],
    visualReference: 'WP3.8B roadmap landmark lock',
    authoredFaceCount: 1884,
    rollout: 'runtime'
  },
  'N-FRANKFURT': {
    nodeId: 'N-FRANKFURT',
    cityVariant: 'frankfurt',
    assetId: 'wp3.8b-frankfurt-selected',
    selectedUrl: assetUrl('wp3-8b', 'frankfurt-selected.gltf'),
    selectedScale: 0.82,
    rotationZ: 0.10,
    landmarks: ['Main Tower-style modern skyline', 'Römer historic frontage'],
    visualReference: 'WP3.8B roadmap landmark lock',
    authoredFaceCount: 2480,
    rollout: 'runtime'
  },
  'N-BERN': {
    nodeId: 'N-BERN',
    cityVariant: 'bern',
    assetId: 'wp3.8b-bern-selected',
    selectedUrl: assetUrl('wp3-8b', 'bern-selected.gltf'),
    selectedScale: 0.90,
    rotationZ: -0.12,
    landmarks: ['Zytglogge clock tower', 'Federal Palace dome'],
    visualReference: 'WP3.8B roadmap landmark lock',
    authoredFaceCount: 1752,
    rollout: 'runtime'
  },
  'N-STRASBOURG': {
    nodeId: 'N-STRASBOURG',
    cityVariant: 'strasbourg',
    assetId: 'wp3.8c-strasbourg-selected',
    selectedUrl: assetUrl('wp3-8c', 'strasbourg-selected.gltf'),
    selectedScale: 0.88,
    rotationZ: -0.10,
    landmarks: ['Strasbourg Cathedral', 'Petite France half-timbered roofs'],
    visualReference: 'WP3.8C roadmap landmark lock',
    authoredFaceCount: 2888,
    rollout: 'runtime'
  },
  'N-LYON': {
    nodeId: 'N-LYON',
    cityVariant: 'lyon',
    assetId: 'wp3.8c-lyon-selected',
    selectedUrl: assetUrl('wp3-8c', 'lyon-selected.gltf'),
    selectedScale: 0.90,
    rotationZ: 0.08,
    landmarks: ['Basilica of Notre-Dame de Fourvière', 'Part-Dieu skyline cue'],
    visualReference: 'WP3.8C roadmap landmark lock',
    authoredFaceCount: 3692,
    rollout: 'runtime'
  },
  'N-LUXEMBOURG': {
    nodeId: 'N-LUXEMBOURG',
    cityVariant: 'luxembourg',
    assetId: 'wp3.8c-luxembourg-selected',
    selectedUrl: assetUrl('wp3-8c', 'luxembourg-selected.gltf'),
    selectedScale: 0.92,
    rotationZ: -0.06,
    landmarks: ['Luxembourg fortified old city / casemates', 'Adolphe Bridge'],
    visualReference: 'WP3.8C roadmap landmark lock',
    authoredFaceCount: 2968,
    rollout: 'runtime'
  }
};

export function landmarkMiniatureAssetForNode(nodeId: string): LandmarkMiniatureAssetDefinition | undefined {
  const asset = WP38A_LANDMARK_MINIATURE_ASSETS[nodeId as LandmarkMiniatureAssetDefinition['nodeId']];
  return asset?.rollout === 'runtime' ? asset : undefined;
}
