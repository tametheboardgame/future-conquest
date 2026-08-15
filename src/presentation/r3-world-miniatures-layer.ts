import { MercatorCoordinate, type CustomLayerInterface, type CustomRenderMethodInput, type Map } from 'maplibre-gl';
import {
  AmbientLight, BoxGeometry, Camera, ConeGeometry, CylinderGeometry, DirectionalLight,
  Group, Matrix4, Mesh, MeshStandardMaterial, Scene, WebGLRenderer,
  type Object3D
} from 'three';
import { STRATEGIC_NODES } from '../game/strategic-network-data';
import type { StrategicNodeDefinition } from '../game/types';
import {
  WP38A_LANDMARK_MINIATURE_ASSETS,
  landmarkMiniatureAssetForNode,
  type LandmarkMiniatureAssetDefinition,
  type LandmarkMiniatureCityVariant
} from './r3-landmark-miniature-assets';
import type { TerrainOperationalLayers } from './r3-terrain-operational-markers-core';

export const R3_WORLD_MINIATURE_LAYER_ID = 'r3-wp3-5-world-miniatures';
const CLEARANCE_METRES = 22;

type WorldLod = 'theatre' | 'campaign' | 'selected';
type WorldKind = 'city' | 'port' | 'airport' | 'rail-hub' | 'logistics' | 'crossing';
type AssetStatus = 'procedural-fallback' | 'authoring' | 'loading' | 'ready' | 'error';
type PresentationModel = 'procedural-fallback' | 'authored-gltf';

type WorldPiece = {
  node: StrategicNodeDefinition;
  root: Group;
  fallbackRoot: Group;
  kind: WorldKind;
  elevation?: number;
  cityVariant?: 'generic' | LandmarkMiniatureCityVariant;
  landmarks?: readonly string[];
  asset?: LandmarkMiniatureAssetDefinition;
  assetRoot?: Object3D;
  assetStatus: AssetStatus;
};

export type WorldMiniatureEvidence = {
  layerId: string;
  renderCount: number;
  lod: WorldLod;
  objects: Array<{
    id: string;
    type: string;
    position: readonly [number, number];
    elevation: number;
    clearance: number;
    visible: boolean;
    displayScale: number;
    cityVariant?: 'generic' | LandmarkMiniatureCityVariant;
    landmarks?: readonly string[];
    assetId?: string;
    assetStatus: AssetStatus;
    presentationModel: PresentationModel;
    authoredFaceCount?: number;
  }>;
};

declare global { interface Window { __r3WorldMiniatures?: WorldMiniatureEvidence } }

const cityMaterial = new MeshStandardMaterial({ color: 0xc9c5b1, roughness: 0.82, metalness: 0.08 });
const capitalMaterial = new MeshStandardMaterial({ color: 0xe6d9ad, roughness: 0.72, metalness: 0.14 });
const roofMaterial = new MeshStandardMaterial({ color: 0x59676a, roughness: 0.78 });
const infrastructureMaterial = new MeshStandardMaterial({ color: 0x72aeb0, roughness: 0.7, metalness: 0.22 });
const accentMaterial = new MeshStandardMaterial({ color: 0xe6b96a, roughness: 0.62, metalness: 0.26 });
const baseMaterial = new MeshStandardMaterial({ color: 0x243b3d, roughness: 0.9, metalness: 0.05 });

const box = (x: number, y: number, z: number, material = infrastructureMaterial) => {
  const mesh = new Mesh(new BoxGeometry(x, y, z), material);
  mesh.position.z = z / 2 + 0.08;
  return mesh;
};

function cityBase(radius = 1.08) {
  const base = new Mesh(new CylinderGeometry(radius, radius * 1.05, 0.14, 14), baseMaterial);
  base.rotation.x = Math.PI / 2;
  base.position.z = 0.07;
  return base;
}

/** Cheap deterministic fallback used for Theatre LOD, loading and renderer failure. */
function genericCityCluster(node: StrategicNodeDefinition) {
  const root = new Group();
  const major = node.type === 'capital' || node.importance >= 3;
  root.add(cityBase(major ? 1.05 : 0.76));
  const buildings = major
    ? [[-0.42, -0.2, 0.42, 0.38, 0.86], [0.25, -0.28, 0.5, 0.4, 1.24], [-0.05, 0.34, 0.46, 0.48, 0.68], [0.48, 0.3, 0.3, 0.32, 0.56]]
    : [[-0.24, -0.12, 0.38, 0.35, 0.58], [0.25, 0.12, 0.42, 0.38, 0.82]];
  for (const [x, y, width, depth, height] of buildings) {
    const building = box(width, depth, height, major ? capitalMaterial : cityMaterial);
    building.position.x = x;
    building.position.y = y;
    root.add(building);
  }
  if (major) {
    const spire = new Mesh(new ConeGeometry(0.16, 0.52, 6), roofMaterial);
    spire.rotation.x = Math.PI / 2;
    spire.position.set(0.25, -0.28, 1.58);
    root.add(spire);
  }
  return root;
}

// Kept as a named boundary because WP3.5 contracts and later WP3.8 passes rely
// on one shared procedural fallback family rather than city-specific gameplay.
function cityCluster(node: StrategicNodeDefinition) {
  return genericCityCluster(node);
}

function infrastructure(node: StrategicNodeDefinition) {
  const root = new Group();
  const base = new Mesh(new CylinderGeometry(0.72, 0.78, 0.12, 10), baseMaterial);
  base.rotation.x = Math.PI / 2;
  base.position.z = 0.06;
  root.add(base);
  if (node.type === 'port') {
    root.add(box(1.05, 0.22, 0.12), box(0.22, 0.82, 0.12));
    const crane = box(0.12, 0.12, 0.92, accentMaterial);
    crane.position.set(-0.3, 0.05, 0.54);
    root.add(crane);
    const boom = box(0.72, 0.1, 0.1, accentMaterial);
    boom.position.set(0.02, 0.05, 0.96);
    root.add(boom);
  } else if (node.type === 'airport') {
    root.add(box(1.25, 0.2, 0.08), box(0.72, 0.52, 0.22));
    const tower = box(0.16, 0.16, 0.7, accentMaterial);
    tower.position.x = 0.38;
    root.add(tower);
  } else if (node.type === 'crossing') {
    root.add(box(1.15, 0.18, 0.14, accentMaterial));
    for (const x of [-0.38, 0, 0.38]) {
      const pier = box(0.1, 0.38, 0.4);
      pier.position.x = x;
      root.add(pier);
    }
  } else {
    root.add(box(0.9, 0.48, 0.35));
    for (const x of [-0.32, 0, 0.32]) {
      const cargo = box(0.22, 0.6, 0.2, accentMaterial);
      cargo.position.x = x;
      root.add(cargo);
    }
    if (node.type === 'rail-hub') {
      const mast = box(0.1, 0.1, 0.92);
      mast.position.x = 0.42;
      root.add(mast);
    }
  }
  return root;
}

const kindFor = (node: StrategicNodeDefinition): WorldKind =>
  node.type === 'capital' || node.type === 'city' ? 'city' : node.type;

function worldPresentationScale(lod: WorldLod) {
  if (lod === 'theatre') return 34_000;
  if (lod === 'campaign') return 24_000;
  return 14_000;
}

function worldPieceInViewport(map: Map, node: StrategicNodeDefinition, lod: WorldLod) {
  const bounds = map.getBounds();
  const padding = lod === 'selected' ? 0.75 : 1.5;
  const [longitude, latitude] = node.position;
  return longitude >= bounds.getWest() - padding
    && longitude <= bounds.getEast() + padding
    && latitude >= bounds.getSouth() - padding
    && latitude <= bounds.getNorth() + padding;
}

let gltfLoaderPromise: Promise<import('three/examples/jsm/loaders/GLTFLoader.js').GLTFLoader> | undefined;
async function gltfLoader() {
  gltfLoaderPromise ??= import('three/examples/jsm/loaders/GLTFLoader.js').then(({ GLTFLoader }) => new GLTFLoader());
  return gltfLoaderPromise;
}

/** Presentation-only objects derived exactly from the public strategic-node catalogue. */
export class WorldMiniaturesLayer implements CustomLayerInterface {
  readonly id = R3_WORLD_MINIATURE_LAYER_ID;
  readonly type = 'custom' as const;
  readonly renderingMode = '3d' as const;
  private map?: Map;
  private renderer?: WebGLRenderer;
  private readonly camera = new Camera();
  private readonly scene = new Scene();
  private readonly pieces: WorldPiece[];
  private layers: TerrainOperationalLayers;
  private renderCount = 0;
  private disposed = false;

  constructor(layers: TerrainOperationalLayers) {
    this.layers = layers;
    this.pieces = STRATEGIC_NODES.map(node => {
      const kind = kindFor(node);
      const fallbackRoot = kind === 'city' ? cityCluster(node) : infrastructure(node);
      const root = new Group();
      root.userData.nodeId = node.id;
      root.add(fallbackRoot);

      const plannedAsset = WP38A_LANDMARK_MINIATURE_ASSETS[node.id as keyof typeof WP38A_LANDMARK_MINIATURE_ASSETS];
      const asset = landmarkMiniatureAssetForNode(node.id);
      const cityVariant = kind === 'city' ? plannedAsset?.cityVariant ?? 'generic' : undefined;
      const landmarks = kind === 'city' ? plannedAsset?.landmarks ?? [] : undefined;
      const assetStatus: AssetStatus = asset ? 'procedural-fallback' : plannedAsset ? 'authoring' : 'procedural-fallback';
      return { node, root, fallbackRoot, kind, cityVariant, landmarks, asset, assetStatus };
    });
    for (const piece of this.pieces) this.scene.add(piece.root);
  }

  onAdd(map: Map, gl: WebGL2RenderingContext) {
    this.disposed = false;
    this.map = map;
    this.renderer = new WebGLRenderer({ canvas: map.getCanvas(), context: gl, antialias: true });
    this.renderer.autoClear = false;
    this.scene.add(new AmbientLight(0xe6f1e9, 1.45));
    const sun = new DirectionalLight(0xffefcf, 2.2);
    sun.position.set(-4, -5, 9);
    this.scene.add(sun);
  }

  update(layers: TerrainOperationalLayers) {
    this.layers = layers;
    this.map?.triggerRepaint();
  }

  private ensureAuthoredAsset(piece: WorldPiece) {
    if (!piece.asset || piece.assetStatus === 'loading' || piece.assetStatus === 'ready') return;
    piece.assetStatus = 'loading';
    const asset = piece.asset;
    void gltfLoader()
      .then(loader => loader.loadAsync(asset.selectedUrl))
      .then(gltf => {
        if (this.disposed) return;
        const model = gltf.scene;
        model.name = asset.assetId;
        model.scale.setScalar(asset.selectedScale);
        model.rotation.z = asset.rotationZ;
        model.visible = false;
        piece.root.add(model);
        piece.assetRoot = model;
        piece.assetStatus = 'ready';
        this.map?.triggerRepaint();
      })
      .catch(error => {
        if (this.disposed) return;
        piece.assetStatus = 'error';
        console.warn(`R3 landmark miniature failed to load ${asset.assetId}; retaining procedural fallback.`, error);
        this.map?.triggerRepaint();
      });
  }

  render(_gl: WebGL2RenderingContext, options: CustomRenderMethodInput) {
    if (!this.map || !this.renderer) return;
    const zoom = this.map.getZoom();
    const lod: WorldLod = zoom < 4.8 ? 'theatre' : zoom < 6.4 ? 'campaign' : 'selected';
    const evidence: WorldMiniatureEvidence['objects'] = [];

    for (const piece of this.pieces) {
      const enabled = piece.kind === 'port' ? this.layers.ports
        : piece.kind === 'airport' ? this.layers.airports
          : this.layers.citiesHubs;
      const lodVisible = lod === 'selected' || (lod === 'campaign' ? piece.node.importance >= 2 : piece.node.importance >= 3);
      const inViewport = worldPieceInViewport(this.map, piece.node, lod);
      const rootVisible = enabled && lodVisible && inViewport;
      const authoredAssetLod = lod === 'campaign' || lod === 'selected';
      piece.root.visible = rootVisible;

      // Landmark miniatures are part of the normal campaign-table presentation.
      // Theatre remains deliberately cheap, while Campaign and Selected use the
      // authored model whenever it is visible and successfully loaded.
      if (rootVisible && authoredAssetLod && piece.asset) this.ensureAuthoredAsset(piece);
      const useAuthoredAsset = rootVisible && authoredAssetLod && piece.assetStatus === 'ready' && Boolean(piece.assetRoot);
      piece.fallbackRoot.visible = rootVisible && !useAuthoredAsset;
      if (piece.assetRoot) piece.assetRoot.visible = useAuthoredAsset;

      // Do not request terrain data for culled pieces. This preserves the WP2E
      // network/performance boundary while still grounding every visible piece.
      if (rootVisible) {
        piece.elevation ??= this.map.queryTerrainElevation([piece.node.position[0], piece.node.position[1]]) ?? undefined;
      }
      const elevation = piece.elevation ?? 0;
      const coordinate = MercatorCoordinate.fromLngLat(piece.node.position, elevation + CLEARANCE_METRES);
      const metres = coordinate.meterInMercatorCoordinateUnits();
      const displayScale = worldPresentationScale(lod) * (piece.node.importance === 3 ? 1.18 : 1);
      piece.root.position.set(coordinate.x, coordinate.y, coordinate.z);
      piece.root.scale.set(metres * displayScale, -metres * displayScale, metres * displayScale);

      evidence.push({
        id: piece.node.id,
        type: piece.node.type,
        position: piece.node.position,
        elevation,
        clearance: CLEARANCE_METRES,
        visible: rootVisible,
        displayScale,
        cityVariant: piece.cityVariant,
        landmarks: piece.landmarks,
        assetId: piece.asset?.assetId,
        assetStatus: piece.assetStatus,
        presentationModel: useAuthoredAsset ? 'authored-gltf' : 'procedural-fallback',
        authoredFaceCount: piece.asset?.authoredFaceCount
      });
    }

    this.camera.projectionMatrix = new Matrix4().fromArray(options.defaultProjectionData.mainMatrix);
    this.renderer.resetState();
    this.renderer.render(this.scene, this.camera);
    this.renderCount += 1;
    window.__r3WorldMiniatures = { layerId: this.id, renderCount: this.renderCount, lod, objects: evidence };
  }

  onRemove() {
    this.disposed = true;
    this.renderer?.dispose();
    this.renderer = undefined;
    this.map = undefined;
    this.pieces.length = 0;
    delete window.__r3WorldMiniatures;
  }
}
