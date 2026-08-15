import { MercatorCoordinate, type CustomLayerInterface, type CustomRenderMethodInput, type Map } from 'maplibre-gl';
import {
  AmbientLight, BoxGeometry, Camera, ConeGeometry, CylinderGeometry, DirectionalLight,
  Group, Matrix4, Mesh, MeshStandardMaterial, Quaternion, Scene, SphereGeometry, Vector3, WebGLRenderer,
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
const eiffelMaterial = new MeshStandardMaterial({ color: 0x756b5b, roughness: 0.52, metalness: 0.46 });
const atomiumMaterial = new MeshStandardMaterial({ color: 0xc8d1d0, roughness: 0.26, metalness: 0.78 });

const LOD_RANK: Record<WorldLod, number> = { theatre: 0, campaign: 1, selected: 2 };
const LOD_TAG = 'r3MinimumWorldLod';

const box = (x: number, y: number, z: number, material = infrastructureMaterial) => {
  const mesh = new Mesh(new BoxGeometry(x, y, z), material);
  mesh.position.z = z / 2 + 0.08;
  return mesh;
};

const centredBox = (x: number, y: number, z: number, material: MeshStandardMaterial) =>
  new Mesh(new BoxGeometry(x, y, z), material);

function beamBetween(
  a: Vector3,
  b: Vector3,
  radius = 0.035,
  material: MeshStandardMaterial = landmarkDarkMaterial,
  radialSegments = 6
) {
  const direction = new Vector3().subVectors(b, a);
  const length = direction.length();
  const beam = new Mesh(new CylinderGeometry(radius, radius, length, radialSegments), material);
  beam.position.copy(a).add(b).multiplyScalar(0.5);
  beam.quaternion.setFromUnitVectors(new Vector3(0, 1, 0), direction.clone().normalize());
  return beam;
}

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

function addElizabethClockFaces(root: Group, z: number) {
  const clocks = new Group();
  const faces: Array<{ axis: 'x' | 'y'; direction: -1 | 1 }> = [
    { axis: 'x', direction: -1 }, { axis: 'x', direction: 1 },
    { axis: 'y', direction: -1 }, { axis: 'y', direction: 1 }
  ];
  for (const { axis, direction } of faces) {
    const surround = new Mesh(new CylinderGeometry(0.145, 0.145, 0.035, 20), accentMaterial);
    const face = new Mesh(new CylinderGeometry(0.118, 0.118, 0.042, 20), clockMaterial);
    if (axis === 'x') {
      surround.rotation.z = Math.PI / 2;
      face.rotation.z = Math.PI / 2;
      surround.position.x = 0.254 * direction;
      face.position.x = 0.273 * direction;
    } else {
      surround.position.y = 0.254 * direction;
      face.position.y = 0.273 * direction;
    }
    surround.position.z = z;
    face.position.z = z;
    clocks.add(surround, face);
  }
  tagLod(clocks, 'campaign');
  root.add(clocks);
}

/** London: accurate Elizabeth Tower hero model with Westminster kept deliberately secondary. */
function londonLandmarkCity() {
  const root = new Group();
  root.add(cityBase(1.18));

  const tower = new Group();
  tower.position.set(0.28, -0.08, 0);

  const shaft = centredBox(0.37, 0.37, 1.08, landmarkStoneMaterial);
  shaft.position.z = 0.68;
  tower.add(shaft);

  const buttresses = new Group();
  for (const x of [-0.2, 0.2]) {
    for (const y of [-0.2, 0.2]) {
      const buttress = centredBox(0.055, 0.055, 1.0, capitalMaterial);
      buttress.position.set(x, y, 0.69);
      buttresses.add(buttress);
    }
  }
  tagLod(buttresses, 'campaign');
  tower.add(buttresses);

  const lowerCornice = centredBox(0.43, 0.43, 0.1, capitalMaterial);
  lowerCornice.position.z = 1.18;
  tower.add(lowerCornice);

  const clockStage = centredBox(0.49, 0.49, 0.34, landmarkStoneMaterial);
  clockStage.position.z = 1.38;
  tower.add(clockStage);
  addElizabethClockFaces(tower, 1.39);

  const clockCornice = centredBox(0.54, 0.54, 0.09, capitalMaterial);
  clockCornice.position.z = 1.58;
  tower.add(clockCornice);

  const belfry = new Group();
  for (const x of [-0.18, 0.18]) {
    for (const y of [-0.18, 0.18]) {
      const post = centredBox(0.055, 0.055, 0.32, landmarkStoneMaterial);
      post.position.set(x, y, 1.77);
      belfry.add(post);
    }
  }
  for (const x of [-0.06, 0.06]) {
    const frontPost = centredBox(0.035, 0.035, 0.28, landmarkStoneMaterial);
    frontPost.position.set(x, -0.205, 1.77);
    belfry.add(frontPost);
  }
  const belfryCap = centredBox(0.43, 0.43, 0.08, capitalMaterial);
  belfryCap.position.z = 1.95;
  belfry.add(belfryCap);
  tagLod(belfry, 'campaign');
  tower.add(belfry);

  const roof = new Mesh(new ConeGeometry(0.3, 0.46, 4), roofMaterial);
  roof.rotation.x = Math.PI / 2;
  roof.rotation.z = Math.PI / 4;
  roof.position.z = 2.19;
  tower.add(roof);

  const spire = beamBetween(new Vector3(0, 0, 2.39), new Vector3(0, 0, 2.67), 0.016, accentMaterial, 6);
  tower.add(spire);
  const crown = new Mesh(new ConeGeometry(0.04, 0.12, 6), accentMaterial);
  crown.rotation.x = Math.PI / 2;
  crown.position.z = 2.72;
  tower.add(crown);

  const finials = new Group();
  for (const x of [-0.24, 0.24]) {
    for (const y of [-0.24, 0.24]) {
      const finial = new Mesh(new ConeGeometry(0.025, 0.15, 5), accentMaterial);
      finial.rotation.x = Math.PI / 2;
      finial.position.set(x, y, 1.73);
      finials.add(finial);
    }
  }
  tagLod(finials, 'selected');
  tower.add(finials);
  tower.userData.landmark = 'Elizabeth Tower / Big Ben';
  root.add(tower);

  const westminster = new Group();
  addBuilding(westminster, -0.42, 0.17, 1.18, 0.34, 0.4, capitalMaterial);
  addBuilding(westminster, -0.76, -0.06, 0.46, 0.28, 0.5, landmarkStoneMaterial);
  const roofline = centredBox(1.05, 0.25, 0.09, roofMaterial);
  roofline.position.set(-0.42, 0.17, 0.53);
  westminster.add(roofline);
  for (const x of [-0.92, -0.68, -0.44, -0.2, 0.04]) {
    const pinnacle = new Mesh(new ConeGeometry(0.035, 0.18, 5), landmarkStoneMaterial);
    pinnacle.rotation.x = Math.PI / 2;
    pinnacle.position.set(x, 0.17, 0.67);
    westminster.add(pinnacle);
  }
  tagLod(westminster, 'campaign');
  root.add(westminster);

  root.userData.cityVariant = 'london';
  root.userData.landmarks = ['Elizabeth Tower / Big Ben', 'Palace of Westminster'];
  return root;
}

function addEiffelBracing(root: Group, start: Vector3[], end: Vector3[]) {
  const faces = [[0, 1], [1, 3], [3, 2], [2, 0]] as const;
  for (const [a, b] of faces) {
    root.add(
      beamBetween(start[a], end[b], 0.018, eiffelMaterial, 5),
      beamBetween(start[b], end[a], 0.018, eiffelMaterial, 5)
    );
  }
}

/** Paris: accurate Eiffel Tower proportions and lattice hierarchy, with Arc de Triomphe secondary. */
function parisLandmarkCity() {
  const root = new Group();
  root.add(cityBase(1.2));

  const eiffel = new Group();
  const basePoints = [
    new Vector3(-0.54, -0.43, 0.16), new Vector3(0.54, -0.43, 0.16),
    new Vector3(-0.54, 0.43, 0.16), new Vector3(0.54, 0.43, 0.16)
  ];
  const firstDeckPoints = [
    new Vector3(-0.3, -0.24, 0.74), new Vector3(0.3, -0.24, 0.74),
    new Vector3(-0.3, 0.24, 0.74), new Vector3(0.3, 0.24, 0.74)
  ];
  const secondDeckPoints = [
    new Vector3(-0.15, -0.12, 1.42), new Vector3(0.15, -0.12, 1.42),
    new Vector3(-0.15, 0.12, 1.42), new Vector3(0.15, 0.12, 1.42)
  ];
  const crownPoints = [
    new Vector3(-0.05, -0.04, 2.08), new Vector3(0.05, -0.04, 2.08),
    new Vector3(-0.05, 0.04, 2.08), new Vector3(0.05, 0.04, 2.08)
  ];

  for (let i = 0; i < 4; i += 1) {
    eiffel.add(
      beamBetween(basePoints[i], firstDeckPoints[i], 0.055, eiffelMaterial, 6),
      beamBetween(firstDeckPoints[i], secondDeckPoints[i], 0.046, eiffelMaterial, 6),
      beamBetween(secondDeckPoints[i], crownPoints[i], 0.033, eiffelMaterial, 6)
    );
  }

  const firstDeck = centredBox(0.76, 0.62, 0.08, eiffelMaterial);
  firstDeck.position.z = 0.75;
  const secondDeck = centredBox(0.42, 0.34, 0.07, eiffelMaterial);
  secondDeck.position.z = 1.43;
  const topDeck = centredBox(0.2, 0.16, 0.08, landmarkMetalMaterial);
  topDeck.position.z = 2.09;
  eiffel.add(firstDeck, secondDeck, topDeck);

  const bracing = new Group();
  addEiffelBracing(bracing, basePoints, firstDeckPoints);
  addEiffelBracing(bracing, firstDeckPoints, secondDeckPoints);
  addEiffelBracing(bracing, secondDeckPoints, crownPoints);
  tagLod(bracing, 'campaign');
  eiffel.add(bracing);

  const mast = beamBetween(new Vector3(0, 0, 2.12), new Vector3(0, 0, 2.5), 0.018, eiffelMaterial, 6);
  eiffel.add(mast);
  const antenna = beamBetween(new Vector3(0, 0, 2.5), new Vector3(0, 0, 2.65), 0.009, accentMaterial, 6);
  tagLod(antenna, 'selected');
  eiffel.add(antenna);
  eiffel.userData.landmark = 'Eiffel Tower';
  root.add(eiffel);

  const arc = new Group();
  const leftPier = centredBox(0.12, 0.2, 0.4, landmarkStoneMaterial);
  leftPier.position.set(-0.13, 0, 0.34);
  const rightPier = centredBox(0.12, 0.2, 0.4, landmarkStoneMaterial);
  rightPier.position.set(0.13, 0, 0.34);
  const lintel = centredBox(0.38, 0.2, 0.14, landmarkStoneMaterial);
  lintel.position.z = 0.55;
  arc.add(leftPier, rightPier, lintel);
  arc.position.set(0.76, 0.43, 0);
  arc.userData.landmark = 'Arc de Triomphe';
  tagLod(arc, 'campaign');
  root.add(arc);

  root.userData.cityVariant = 'paris';
  root.userData.landmarks = ['Eiffel Tower', 'Arc de Triomphe'];
  return root;
}

/** Brussels: Atomium built from the nine atoms of a body-centred cubic unit cell. */
function brusselsLandmarkCity() {
  const root = new Group();
  root.add(cityBase(1.18));

  const atomium = new Group();
  const cubeSigns = [
    [-1, -1, -1], [1, -1, -1], [-1, 1, -1], [1, 1, -1],
    [-1, -1, 1], [1, -1, 1], [-1, 1, 1], [1, 1, 1]
  ] as const;
  const alignment = new Quaternion().setFromUnitVectors(
    new Vector3(1, 1, 1).normalize(),
    new Vector3(0, 0, 1)
  );
  const rawCorners = cubeSigns.map(([x, y, z]) =>
    new Vector3(x, y, z).applyQuaternion(alignment).multiplyScalar(0.44)
  );
  const minimumZ = Math.min(...rawCorners.map(point => point.z));
  const verticalOffset = 0.38 - minimumZ;
  const atomiumPoints = rawCorners.map(point => point.clone().add(new Vector3(0, 0, verticalOffset)));
  const centrePoint = new Vector3(0, 0, verticalOffset);

  for (const point of [...atomiumPoints, centrePoint]) {
    const sphere = new Mesh(new SphereGeometry(0.16, 10, 8), atomiumMaterial);
    sphere.position.copy(point);
    atomium.add(sphere);
  }

  for (let i = 0; i < cubeSigns.length; i += 1) {
    for (let j = i + 1; j < cubeSigns.length; j += 1) {
      const differentAxes = cubeSigns[i].reduce((count, value, axis) =>
        count + (value === cubeSigns[j][axis] ? 0 : 1), 0);
      if (differentAxes === 1) atomium.add(beamBetween(atomiumPoints[i], atomiumPoints[j], 0.024, atomiumMaterial, 7));
    }
    atomium.add(beamBetween(atomiumPoints[i], centrePoint, 0.023, atomiumMaterial, 7));
  }

  const supportIndices = atomiumPoints
    .map((point, index) => ({ point, index }))
    .sort((a, b) => a.point.z - b.point.z)
    .slice(1, 4)
    .map(entry => entry.index);
  for (const index of supportIndices) {
    const point = atomiumPoints[index];
    const anchor = new Vector3(point.x * 1.35, point.y * 1.35, 0.15);
    atomium.add(beamBetween(anchor, point, 0.03, landmarkMetalMaterial, 7));
  }

  const topPoint = atomiumPoints.reduce((highest, point) => point.z > highest.z ? point : highest, atomiumPoints[0]);
  const antenna = beamBetween(
    new Vector3(topPoint.x, topPoint.y, topPoint.z + 0.1),
    new Vector3(topPoint.x, topPoint.y, topPoint.z + 0.38),
    0.01,
    landmarkDarkMaterial,
    6
  );
  tagLod(antenna, 'campaign');
  atomium.add(antenna);

  const entrance = new Mesh(new CylinderGeometry(0.19, 0.24, 0.13, 10), landmarkStoneMaterial);
  entrance.rotation.x = Math.PI / 2;
  entrance.position.set(0, 0, 0.11);
  tagLod(entrance, 'campaign');
  atomium.add(entrance);
  atomium.userData.landmark = 'Atomium';
  root.add(atomium);

  const townHall = new Group();
  const hall = centredBox(0.3, 0.2, 0.28, landmarkStoneMaterial);
  hall.position.z = 0.27;
  const hallTower = centredBox(0.08, 0.08, 0.5, landmarkStoneMaterial);
  hallTower.position.set(0.04, 0, 0.55);
  const gothicSpire = new Mesh(new ConeGeometry(0.07, 0.35, 6), roofMaterial);
  gothicSpire.rotation.x = Math.PI / 2;
  gothicSpire.position.set(0.04, 0, 0.98);
  townHall.add(hall, hallTower, gothicSpire);
  townHall.position.set(0.72, 0.45, 0);
  townHall.userData.landmark = 'Brussels Town Hall';
  tagLod(townHall, 'campaign');
  root.add(townHall);

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

function worldPieceInViewport(map: Map, node: StrategicNodeDefinition, lod: WorldLod) {
  const bounds = map.getBounds();
  const padding = lod === 'selected' ? 0.75 : 1.5;
  const [longitude, latitude] = node.position;
  return longitude >= bounds.getWest() - padding
    && longitude <= bounds.getEast() + padding
    && latitude >= bounds.getSouth() - padding
    && latitude <= bounds.getNorth() + padding;
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
      const inViewport = worldPieceInViewport(this.map, piece.node, lod);
      applyModelLod(piece.root, lod);
      piece.root.visible = enabled && lodVisible && inViewport;
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
