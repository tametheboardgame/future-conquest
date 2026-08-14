import { MercatorCoordinate, type CustomLayerInterface, type CustomRenderMethodInput, type Map } from 'maplibre-gl';
import {
  AmbientLight,
  BoxGeometry,
  Camera,
  CanvasTexture,
  ConeGeometry,
  CylinderGeometry,
  DirectionalLight,
  DoubleSide,
  Group,
  Matrix4,
  Mesh,
  MeshStandardMaterial,
  Object3D,
  PlaneGeometry,
  Scene,
  SRGBColorSpace,
  WebGLRenderer
} from 'three';
import type { GameState, TaskGroup } from '../game/types';
import { FORMATION_PRESENTATION_ANIMATION_MS, formationForwardPathTarget, formationPresentationPath, formationPresentationPosition, interpolateFormationPresentation, type FormationGeoPoint } from './r3-formation-movement';
import { terrainOperationalTerritoryCentres, type TerrainOperationalLayers } from './r3-terrain-operational-markers-core';

export const R3_FORMATION_MINIATURE_LAYER_ID = 'r3-wp3-5-formation-miniatures';
const CLEARANCE_METRES = 45;
const VISUAL_GROUP_NAME = 'formation-miniature-visual';

type Piece = {
  root: Group;
  current: FormationGeoPoint;
  from: FormationGeoPoint;
  target: FormationGeoPoint;
  startedAt: number;
};

export type FormationMiniatureBrowserEvidence = {
  layerId: string;
  reducedMotion: boolean;
  renderCount: number;
  pieces: Array<{
    id: string;
    current: FormationGeoPoint;
    target: FormationGeoPoint;
    elevation: number;
    visible: boolean;
    clusterOffset: readonly [number, number];
    displayScale: number;
  }>;
};

declare global {
  interface Window { __r3FormationMiniatures?: FormationMiniatureBrowserEvidence }
}

const statusColours: Record<TaskGroup['status'], number> = {
  ready: 0x65d8ca,
  moving: 0x8fe9dc,
  attacking: 0xff986e,
  garrison: 0xc6d875,
  recovering: 0x86a7b3,
  engineering: 0xe2bc63,
  interdicting: 0xc18ee8
};

function soldier(material: MeshStandardMaterial, x: number, y: number) {
  const figure = new Group();
  const legs = new Mesh(new BoxGeometry(0.13, 0.12, 0.45), material);
  legs.position.z = 0.31;
  const torso = new Mesh(new CylinderGeometry(0.14, 0.18, 0.36, 6), material);
  torso.rotation.x = Math.PI / 2;
  torso.position.z = 0.67;
  const head = new Mesh(new ConeGeometry(0.12, 0.24, 7), material);
  head.rotation.x = Math.PI / 2;
  head.position.z = 0.99;
  const weapon = new Mesh(new BoxGeometry(0.07, 0.48, 0.07), material);
  weapon.position.set(0.16, -0.08, 0.7);
  weapon.rotation.z = -0.22;
  figure.add(legs, torso, head, weapon);
  figure.position.set(x, y, 0);
  return figure;
}

function makeIdentityTexture(group: TaskGroup) {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 48;
  const context = canvas.getContext('2d')!;
  context.fillStyle = '#102b32';
  context.fillRect(0, 0, 128, 48);
  context.strokeStyle = '#a8fff4';
  context.lineWidth = 3;
  context.strokeRect(2, 2, 124, 44);
  context.fillStyle = '#effffd';
  context.font = 'bold 25px sans-serif';
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  context.fillText(`TG ${group.id.replace('TG-', '')}`, 64, 25);
  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  return texture;
}

function makeMiniature(group: TaskGroup, selected: boolean) {
  const root = new Group();
  const visual = new Group();
  visual.name = VISUAL_GROUP_NAME;
  const material = new MeshStandardMaterial({ color: statusColours[group.status], roughness: 0.7, metalness: 0.18 });
  const base = new Mesh(
    new CylinderGeometry(selected ? 1.25 : 1.08, selected ? 1.35 : 1.18, 0.16, 16),
    new MeshStandardMaterial({ color: selected ? 0xeaff78 : 0x173a3f, roughness: 0.86, metalness: 0.12 })
  );
  base.rotation.x = Math.PI / 2;
  base.position.z = 0.08;
  visual.add(base);
  for (const [x, y] of [[-0.5, -0.2], [0, 0.22], [0.5, -0.2], [-0.25, 0.55], [0.25, 0.55]] as const) {
    visual.add(soldier(material, x, y));
  }
  const label = new Mesh(
    new PlaneGeometry(1.55, 0.58),
    new MeshStandardMaterial({ map: makeIdentityTexture(group), transparent: true, side: DoubleSide, roughness: 0.8 })
  );
  label.position.set(0, -0.88, 0.48);
  label.rotation.x = Math.PI / 2.7;
  visual.add(label);
  root.add(visual);
  root.userData.status = group.status;
  return root;
}

function movementBearing(group: TaskGroup) {
  const path = formationPresentationPath(group, terrainOperationalTerritoryCentres);
  if (!path || path.length < 2 || group.status !== 'moving') return 0;
  const progress = group.order?.type === 'move' ? group.order.progress / 100 : 0;
  const position = formationPresentationPosition(group, terrainOperationalTerritoryCentres) ?? path[0];
  const next = formationForwardPathTarget(path, progress) ?? path.at(-1)!;
  return Math.atan2(next[0] - position[0], next[1] - position[1]);
}

function disposeMiniature(root: Object3D) {
  const geometries = new Set<{ dispose(): void }>();
  const materials = new Set<MeshStandardMaterial>();
  root.traverse(child => {
    if (!(child instanceof Mesh)) return;
    geometries.add(child.geometry);
    const meshMaterials = Array.isArray(child.material) ? child.material : [child.material];
    for (const material of meshMaterials) if (material instanceof MeshStandardMaterial) materials.add(material);
  });
  for (const geometry of geometries) geometry.dispose();
  for (const material of materials) { material.map?.dispose(); material.dispose(); }
}

function coordinateKey(point: FormationGeoPoint) {
  return `${point[0].toFixed(5)}:${point[1].toFixed(5)}`;
}

function clusterOffsets(state: GameState) {
  const clusters = new globalThis.Map<string, Array<{ id: string; point: FormationGeoPoint }>>();
  for (const group of Object.values(state.taskGroups)) {
    const point = formationPresentationPosition(group, terrainOperationalTerritoryCentres);
    if (!point) continue;
    const key = coordinateKey(point);
    const cluster = clusters.get(key) ?? [];
    cluster.push({ id: group.id, point });
    clusters.set(key, cluster);
  }

  const offsets = new globalThis.Map<string, readonly [number, number]>();
  for (const cluster of clusters.values()) {
    cluster.sort((a, b) => a.id.localeCompare(b.id));
    if (cluster.length === 1) {
      offsets.set(cluster[0].id, [0, 0]);
      continue;
    }
    const radius = cluster.length <= 4 ? 1.18 : 1.45;
    cluster.forEach((member, index) => {
      const angle = -Math.PI / 2 + (Math.PI * 2 * index) / cluster.length;
      offsets.set(member.id, [Math.cos(angle) * radius, Math.sin(angle) * radius]);
    });
  }
  return offsets;
}

function presentationScaleForZoom(zoom: number) {
  if (zoom < 4.8) return 78_000;
  if (zoom < 6.4) return 52_000;
  return 24_000;
}

/** Derived-only Three.js presentation. MapLibre's matrix and DEM remain the sole camera/terrain authority. */
export class FormationMiniaturesLayer implements CustomLayerInterface {
  readonly id = R3_FORMATION_MINIATURE_LAYER_ID;
  readonly type = 'custom' as const;
  readonly renderingMode = '3d' as const;
  private map?: Map;
  private renderer?: WebGLRenderer;
  private readonly camera = new Camera();
  private readonly scene = new Scene();
  private readonly pieces = new globalThis.Map<string, Piece>();
  private state: GameState;
  private reducedMotion: boolean;
  private visible: boolean;
  private renderCount = 0;
  private clusterOffsetById = new globalThis.Map<string, readonly [number, number]>();

  constructor(state: GameState, layers: Pick<TerrainOperationalLayers, 'friendlyFormations'>) {
    this.state = state;
    this.visible = layers.friendlyFormations;
    this.reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }

  onAdd(map: Map, gl: WebGL2RenderingContext) {
    this.map = map;
    this.renderer = new WebGLRenderer({ canvas: map.getCanvas(), context: gl, antialias: true });
    this.renderer.autoClear = false;
    this.scene.add(new AmbientLight(0xd9f6ee, 1.5));
    const sun = new DirectionalLight(0xfff2d4, 2.4);
    sun.position.set(-3, -4, 8);
    this.scene.add(sun);
    this.rebuild();
  }

  update(state: GameState, layers: Pick<TerrainOperationalLayers, 'friendlyFormations'>) {
    this.state = state;
    this.visible = layers.friendlyFormations;
    this.rebuild();
    this.map?.triggerRepaint();
  }

  private rebuild() {
    if (!this.map) return;
    this.clusterOffsetById = clusterOffsets(this.state);
    const active = new Set(Object.keys(this.state.taskGroups));
    for (const [id, piece] of this.pieces) if (!active.has(id)) {
      this.scene.remove(piece.root);
      disposeMiniature(piece.root);
      this.pieces.delete(id);
    }
    for (const group of Object.values(this.state.taskGroups)) {
      const target = formationPresentationPosition(group, terrainOperationalTerritoryCentres);
      if (!target) continue;
      const selected = group.id === this.state.selectedTaskGroupId;
      const old = this.pieces.get(group.id);
      if (!old || old.root.userData.status !== group.status || Boolean(old.root.userData.selected) !== selected) {
        if (old) { this.scene.remove(old.root); disposeMiniature(old.root); }
        const root = makeMiniature(group, selected);
        root.userData.selected = selected;
        root.rotation.z = movementBearing(group);
        this.scene.add(root);
        const current = old?.current ?? target;
        this.pieces.set(group.id, { root, current, from: current, target, startedAt: performance.now() });
      } else {
        if (old.target[0] !== target[0] || old.target[1] !== target[1]) {
          old.from = old.current; old.target = target; old.startedAt = performance.now();
        }
        old.root.rotation.z = movementBearing(group);
      }
      const piece = this.pieces.get(group.id);
      const visual = piece?.root.getObjectByName(VISUAL_GROUP_NAME);
      const offset = this.clusterOffsetById.get(group.id) ?? [0, 0];
      visual?.position.set(offset[0], offset[1], 0);
    }
  }

  render(_gl: WebGL2RenderingContext, options: CustomRenderMethodInput) {
    if (!this.map || !this.renderer) return;
    const now = performance.now();
    let animating = false;
    const displayScale = presentationScaleForZoom(this.map.getZoom());
    const browserPieces: FormationMiniatureBrowserEvidence['pieces'] = [];
    for (const [id, piece] of this.pieces) {
      const elapsed = now - piece.startedAt;
      piece.current = this.reducedMotion ? piece.target : interpolateFormationPresentation(piece.from, piece.target, elapsed);
      animating ||= !this.reducedMotion && elapsed < FORMATION_PRESENTATION_ANIMATION_MS;
      const lngLat: [number, number] = [piece.current[0], piece.current[1]];
      const elevation = this.map.queryTerrainElevation(lngLat) ?? 0;
      const coordinate = MercatorCoordinate.fromLngLat(lngLat, elevation + CLEARANCE_METRES);
      const metres = coordinate.meterInMercatorCoordinateUnits();
      piece.root.position.set(coordinate.x, coordinate.y, coordinate.z);
      piece.root.scale.set(metres * displayScale, -metres * displayScale, metres * displayScale);
      piece.root.visible = this.visible;
      browserPieces.push({
        id,
        current: [...piece.current],
        target: [...piece.target],
        elevation,
        visible: piece.root.visible,
        clusterOffset: this.clusterOffsetById.get(id) ?? [0, 0],
        displayScale
      });
    }
    this.camera.projectionMatrix = new Matrix4().fromArray(options.defaultProjectionData.mainMatrix);
    this.renderer.resetState();
    this.renderer.render(this.scene, this.camera);
    this.renderCount += 1;
    window.__r3FormationMiniatures = {
      layerId: this.id,
      reducedMotion: this.reducedMotion,
      renderCount: this.renderCount,
      pieces: browserPieces
    };
    if (animating) this.map.triggerRepaint();
  }

  onRemove() {
    this.renderer?.dispose();
    this.renderer = undefined;
    this.map = undefined;
    for (const piece of this.pieces.values()) disposeMiniature(piece.root);
    for (const child of this.scene.children) if (child instanceof Object3D) child.clear();
    this.pieces.clear();
    delete window.__r3FormationMiniatures;
  }
}
