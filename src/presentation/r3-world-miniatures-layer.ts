import { MercatorCoordinate, type CustomLayerInterface, type CustomRenderMethodInput, type Map } from 'maplibre-gl';
import {
  AmbientLight, BoxGeometry, Camera, ConeGeometry, CylinderGeometry, DirectionalLight,
  Group, Matrix4, Mesh, MeshStandardMaterial, Scene, SphereGeometry, Vector3, WebGLRenderer,
  type Object3D
} from 'three';
import { STRATEGIC_NODES } from '../game/strategic-network-data';
import type { StrategicNodeDefinition } from '../game/types';
import type { TerrainOperationalLayers } from './r3-terrain-operational-markers-core';

export const R3_WORLD_MINIATURE_LAYER_ID = 'r3-wp3-5-world-miniatures';
const CLEARANCE_METRES = 22;

type WorldLod = 'theatre' | 'campaign' | 'selected';
type WorldKind = 'city' | 'port' | 'airport' | 'rail-hub' | 'logistics' | 'crossing';
type CityVariant = 'generic' | 'london' | 'paris' | 'brussels';
type WorldPiece = {
  node: StrategicNodeDefinition;
  root: Group;
  kind: WorldKind;
  elevation?: number;
  cityVariant?: CityVariant;
  landmarks?: readonly string[];
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
    cityVariant?: CityVariant;
    landmarks?: readonly string[];
  }>;
};

declare global { interface Window { __r3WorldMiniatures?: WorldMiniatureEvidence } }

const cityMaterial = new MeshStandardMaterial({ color: 0xc9c5b1, roughness: 0.82, metalness: 0.08 });
const capitalMaterial = new MeshStandardMaterial({ color: 0xe6d9ad, roughness: 0.72, metalness: 0.14 });
const roofMaterial = new MeshStandardMaterial({ color: 0x59676a, roughness: 0.78 });
const infrastructureMaterial = new MeshStandardMaterial({ color: 0x72aeb0, roughness: 0.7, metalness: 0.22 });
const accentMaterial = new MeshStandardMaterial({ color: 0xe6b96a, roughness: 0.62, metalness: 0.26 });
const baseMaterial = new MeshStandardMaterial({ color: 0x243b3d, roughness: 0.9, metalness: 0.05 });
const landmarkStoneMaterial = new MeshStandardMaterial({ color: 0xb9ad91, roughness: 0.78, metalness: 0.06 });
const landmarkDarkMaterial = new MeshStandardMaterial({ color: 0x465355, roughness: 0.7, metalness: 0.18 });
const landmarkMetalMaterial = new MeshStandardMaterial({ color: 0x8f9b9b, roughness: 0.58, metalness: 0.34 });
const clockMaterial = new MeshStandardMaterial({ color: 0xe7dcc0, roughness: 0.55, metalness: 0.12 });

const LOD_RANK: Record<WorldLod, number> = { theatre: 0, campaign: 1, selected: 2 };
const LOD_TAG = 'r3MinimumWorldLod';

const box = (x: number, y: number, z: number, material = infrastructureMaterial) => {
  const mesh = new Mesh(new BoxGeometry(x, y, z), material);
  mesh.position.z = z / 2 + 0.08;
  return mesh;
};

function addBuilding(
  root: Group,
  x: number,
  y: number,
  width: number,
  depth: number,
  height: number,
  material: MeshStandardMaterial = cityMaterial
) {
  const building = box(width, depth, height, material);
  building.position.x = x;
  building.position.y = y;
  root.add(building);
  return building;
}

function tagLod<T extends Object3D>(object: T, minimum: WorldLod) {
  object.userData[LOD_TAG] = minimum;
  return object;
}

function applyModelLod(root: Group, lod: WorldLod) {
  root.traverse(object => {
    const minimum = object.userData[LOD_TAG] as WorldLod | undefined;
    if (minimum) object.visible = LOD_RANK[lod] >= LOD_RANK[minimum];
  });
}

function cityBase(radius = 1.08) {
  const base = new Mesh(new CylinderGeometry(radius, radius * 1.05, 0.14, 14), baseMaterial);
  base.rotation.x = Math.PI / 2;
  base.position.z = 0.07;
  return base;
}

function genericCityCluster(node: StrategicNodeDefinition) {
  const root = new Group();
  const major = node.type === 'capital' || node.importance >= 3;
  root.add(cityBase(major ? 1.05 : 0.76));
  const buildings = major
    ? [[-0.42, -0.2, 0.42, 0.38, 0.86], [0.25, -0.28, 0.5, 0.4, 1.24], [-0.05, 0.34, 0.46, 0.48, 0.68], [0.48, 0.3, 0.3, 0.32, 0.56]]
    : [[-0.24, -0.12, 0.38, 0.35, 0.58], [0.25, 0.12, 0.42, 0.38, 0.82]];
  for (const [x, y, width, depth, height] of buildings) {
    addBuilding(root, x, y, width, depth, height, major ? capitalMaterial : cityMaterial);
  }
  if (major) {
    const spire = new Mesh(new ConeGeometry(0.16, 0.52, 6), roofMaterial);
    spire.rotation.x = Math.PI / 2;
    spire.position.set(0.25, -0.28, 1.58);
    root.add(spire);
  }
  root.userData.cityVariant = 'generic';
  root.userData.landmarks = [];
  return root;
}

/** London: oversized Elizabeth Tower, Westminster roofline and compact masonry blocks. */
function londonLandmarkCity() {
  const root = new Group();
  root.add(cityBase(1.22));

  const tower = addBuilding(root, 0.43, -0.2, 0.29, 0.29, 1.7, landmarkStoneMaterial);
  const clockBand = box(0.36, 0.34, 0.22, clockMaterial);
  clockBand.position.set(0.43, -0.2, 1.46);
  root.add(clockBand);
  const clockFace = new Mesh(new CylinderGeometry(0.105, 0.105, 0.035, 16), clockMaterial);
  clockFace.position.set(0.43, -0.39, 1.47);
  tagLod(clockFace, 'selected');
  root.add(clockFace);
  const towerRoof = new Mesh(new ConeGeometry(0.2, 0.5, 4), roofMaterial);
  towerRoof.rotation.x = Math.PI / 2;
  towerRoof.rotation.z = Math.PI / 4;
  towerRoof.position.set(0.43, -0.2, 2.0);
  root.add(towerRoof);
  tower.userData.landmark = 'Elizabeth Tower';

  const westminster = new Group();
  addBuilding(westminster, -0.18, 0.08, 1.15, 0.36, 0.48, capitalMaterial);
  addBuilding(westminster, -0.42, -0.2, 0.5, 0.32, 0.58, capitalMaterial);
  const roofline = new Mesh(new ConeGeometry(0.22, 0.34, 4), roofMaterial);
  roofline.rotation.x = Math.PI / 2;
  roofline.rotation.z = Math.PI / 4;
  roofline.position.set(-0.64, -0.2, 0.82);
  westminster.add(roofline);
  tagLod(westminster, 'campaign');
  root.add(westminster);

  const supporting = new Group();
  addBuilding(supporting, -0.55, 0.5, 0.36, 0.3, 0.42, cityMaterial);
  addBuilding(supporting, -0.05, 0.54, 0.4, 0.3, 0.5, cityMaterial);
  addBuilding(supporting, 0.42, 0.48, 0.32, 0.28, 0.4, cityMaterial);
  tagLod(supporting, 'campaign');
  root.add(supporting);

  root.userData.cityVariant = 'london';
  root.userData.landmarks = ['Elizabeth Tower / Big Ben', 'Palace of Westminster'];
  return root;
}

/** Paris: Eiffel Tower silhouette, secondary Arc de Triomphe and Haussmann blocks. */
function parisLandmarkCity() {
  const root = new Group();
  root.add(cityBase(1.24));

  const eiffel = new Group();
  for (const [x, y, rotationX, rotationY] of [
    [-0.23, -0.2, -0.09, 0.09],
    [0.23, -0.2, -0.09, -0.09],
    [-0.23, 0.2, 0.09, 0.09],
    [0.23, 0.2, 0.09, -0.09]
  ] as const) {
    const leg = box(0.09, 0.09, 1.48, landmarkDarkMaterial);
    leg.position.set(x, y, 0.83);
    leg.rotation.x = rotationX;
    leg.rotation.y = rotationY;
    eiffel.add(leg);
  }
  const lowerDeck = box(0.72, 0.62, 0.09, landmarkMetalMaterial);
  lowerDeck.position.z = 0.66;
  eiffel.add(lowerDeck);
  const upperDeck = box(0.38, 0.32, 0.08, landmarkMetalMaterial);
  upperDeck.position.z = 1.36;
  eiffel.add(upperDeck);
  const mast = box(0.07, 0.07, 0.52, landmarkDarkMaterial);
  mast.position.z = 1.82;
  eiffel.add(mast);
  eiffel.userData.landmark = 'Eiffel Tower';
  root.add(eiffel);

  const arc = new Group();
  addBuilding(arc, -0.16, 0, 0.13, 0.22, 0.48, landmarkStoneMaterial);
  addBuilding(arc, 0.16, 0, 0.13, 0.22, 0.48, landmarkStoneMaterial);
  const lintel = box(0.45, 0.22, 0.18, landmarkStoneMaterial);
  lintel.position.z = 0.5;
  arc.add(lintel);
  arc.position.set(0.58, 0.2, 0);
  arc.userData.landmark = 'Arc de Triomphe';
  tagLod(arc, 'campaign');
  root.add(arc);

  const haussmann = new Group();
  addBuilding(haussmann, -0.65, 0.38, 0.34, 0.3, 0.46, cityMaterial);
  addBuilding(haussmann, -0.28, 0.53, 0.32, 0.28, 0.52, cityMaterial);
  addBuilding(haussmann, 0.16, 0.55, 0.38, 0.28, 0.44, cityMaterial);
  addBuilding(haussmann, 0.58, -0.34, 0.36, 0.3, 0.5, cityMaterial);
  tagLod(haussmann, 'campaign');
  root.add(haussmann);

  root.userData.cityVariant = 'paris';
  root.userData.landmarks = ['Eiffel Tower', 'Arc de Triomphe'];
  return root;
}

function atomiumRod(a: Vector3, b: Vector3) {
  const direction = new Vector3().subVectors(b, a);
  const length = direction.length();
  const rod = new Mesh(new CylinderGeometry(0.035, 0.035, length, 6), landmarkMetalMaterial);
  rod.position.copy(a).add(b).multiplyScalar(0.5);
  rod.quaternion.setFromUnitVectors(new Vector3(0, 1, 0), direction.clone().normalize());
  return rod;
}

/** Brussels: Atomium topology, Gothic town-hall spire and compact historic blocks. */
function brusselsLandmarkCity() {
  const root = new Group();
  root.add(cityBase(1.2));

  const atomium = new Group();
  const atomiumPoints = [
    new Vector3(-0.25, -0.2, 0.55),
    new Vector3(0.25, -0.2, 0.55),
    new Vector3(-0.25, 0.2, 0.55),
    new Vector3(0.25, 0.2, 0.55),
    new Vector3(-0.25, -0.2, 1.12),
    new Vector3(0.25, -0.2, 1.12),
    new Vector3(0, 0, 1.55)
  ];
  for (const point of atomiumPoints) {
    const sphere = new Mesh(new SphereGeometry(0.115, 8, 6), landmarkMetalMaterial);
    sphere.position.copy(point);
    atomium.add(sphere);
  }
  for (const [from, to] of [[0, 1], [0, 2], [1, 3], [2, 3], [0, 4], [1, 5], [4, 5], [4, 6], [5, 6], [2, 6], [3, 6]] as const) {
    atomium.add(atomiumRod(atomiumPoints[from], atomiumPoints[to]));
  }
  atomium.position.x = -0.18;
  atomium.userData.landmark = 'Atomium';
  root.add(atomium);

  const townHall = new Group();
  addBuilding(townHall, 0, 0, 0.42, 0.28, 0.5, landmarkStoneMaterial);
  const hallTower = box(0.13, 0.13, 0.82, landmarkStoneMaterial);
  hallTower.position.set(0, 0, 0.78);
  townHall.add(hallTower);
  const gothicSpire = new Mesh(new ConeGeometry(0.11, 0.52, 6), roofMaterial);
  gothicSpire.rotation.x = Math.PI / 2;
  gothicSpire.position.z = 1.44;
  townHall.add(gothicSpire);
  townHall.position.set(0.58, 0.2, 0);
  townHall.userData.landmark = 'Brussels Town Hall';
  tagLod(townHall, 'campaign');
  root.add(townHall);

  const historic = new Group();
  addBuilding(historic, -0.58, 0.48, 0.28, 0.28, 0.46, cityMaterial);
  addBuilding(historic, -0.22, 0.54, 0.26, 0.26, 0.42, cityMaterial);
  addBuilding(historic, 0.2, 0.54, 0.3, 0.28, 0.48, cityMaterial);
  addBuilding(historic, 0.62, -0.34, 0.3, 0.28, 0.4, cityMaterial);
  tagLod(historic, 'campaign');
  root.add(historic);

  root.userData.cityVariant = 'brussels';
  root.userData.landmarks = ['Atomium', 'Brussels Town Hall / Grand-Place spire'];
  return root;
}

function cityCluster(node: StrategicNodeDefinition) {
  if (node.id === 'N-LONDON') return londonLandmarkCity();
  if (node.id === 'N-PARIS') return parisLandmarkCity();
  if (node.id === 'N-BRUSSELS') return brusselsLandmarkCity();
  return genericCityCluster(node);
}

function infrastructure(node: StrategicNodeDefinition) {
  const root = new Group();
  const base = new Mesh(new CylinderGeometry(0.72, 0.78, 0.12, 10), baseMaterial);
  base.rotation.x = Math.PI / 2; base.position.z = 0.06; root.add(base);
  if (node.type === 'port') {
    root.add(box(1.05, 0.22, 0.12), box(0.22, 0.82, 0.12));
    const crane = box(0.12, 0.12, 0.92, accentMaterial); crane.position.set(-0.3, 0.05, 0.54); root.add(crane);
    const boom = box(0.72, 0.1, 0.1, accentMaterial); boom.position.set(0.02, 0.05, 0.96); root.add(boom);
  } else if (node.type === 'airport') {
    root.add(box(1.25, 0.2, 0.08), box(0.72, 0.52, 0.22));
    const tower = box(0.16, 0.16, 0.7, accentMaterial); tower.position.x = 0.38; root.add(tower);
  } else if (node.type === 'crossing') {
    root.add(box(1.15, 0.18, 0.14, accentMaterial));
    for (const x of [-0.38, 0, 0.38]) { const pier = box(0.1, 0.38, 0.4); pier.position.x = x; root.add(pier); }
  } else {
    root.add(box(0.9, 0.48, 0.35));
    for (const x of [-0.32, 0, 0.32]) { const cargo = box(0.22, 0.6, 0.2, accentMaterial); cargo.position.x = x; root.add(cargo); }
    if (node.type === 'rail-hub') { const mast = box(0.1, 0.1, 0.92); mast.position.x = 0.42; root.add(mast); }
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

  constructor(layers: TerrainOperationalLayers) {
    this.layers = layers;
    this.pieces = STRATEGIC_NODES.map(node => {
      const kind = kindFor(node);
      const root = kind === 'city' ? cityCluster(node) : infrastructure(node);
      root.userData.nodeId = node.id;
      const cityVariant = kind === 'city' ? root.userData.cityVariant as CityVariant : undefined;
      const landmarks = kind === 'city' ? root.userData.landmarks as readonly string[] : undefined;
      return { node, root, kind, cityVariant, landmarks };
    });
    for (const piece of this.pieces) this.scene.add(piece.root);
  }

  onAdd(map: Map, gl: WebGL2RenderingContext) {
    this.map = map;
    this.renderer = new WebGLRenderer({ canvas: map.getCanvas(), context: gl, antialias: true });
    this.renderer.autoClear = false;
    this.scene.add(new AmbientLight(0xe6f1e9, 1.45));
    const sun = new DirectionalLight(0xffefcf, 2.2); sun.position.set(-4, -5, 9); this.scene.add(sun);
  }

  update(layers: TerrainOperationalLayers) { this.layers = layers; this.map?.triggerRepaint(); }

  render(_gl: WebGL2RenderingContext, options: CustomRenderMethodInput) {
    if (!this.map || !this.renderer) return;
    const zoom = this.map.getZoom();
    const lod: WorldLod = zoom < 4.8 ? 'theatre' : zoom < 6.4 ? 'campaign' : 'selected';
    const evidence: WorldMiniatureEvidence['objects'] = [];
    for (const piece of this.pieces) {
      const enabled = piece.kind === 'port' ? this.layers.ports
        : piece.kind === 'airport' ? this.layers.airports : this.layers.citiesHubs;
      const lodVisible = lod === 'selected' || (lod === 'campaign' ? piece.node.importance >= 2 : piece.node.importance >= 3);
      applyModelLod(piece.root, lod);
      piece.root.visible = enabled && lodVisible;
      piece.elevation ??= this.map.queryTerrainElevation([piece.node.position[0], piece.node.position[1]]) ?? undefined;
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
        visible: piece.root.visible,
        displayScale,
        cityVariant: piece.cityVariant,
        landmarks: piece.landmarks
      });
    }
    this.camera.projectionMatrix = new Matrix4().fromArray(options.defaultProjectionData.mainMatrix);
    this.renderer.resetState(); this.renderer.render(this.scene, this.camera); this.renderCount += 1;
    window.__r3WorldMiniatures = { layerId: this.id, renderCount: this.renderCount, lod, objects: evidence };
  }

  onRemove() {
    this.renderer?.dispose(); this.renderer = undefined; this.map = undefined;
    this.pieces.length = 0; delete window.__r3WorldMiniatures;
  }
}
