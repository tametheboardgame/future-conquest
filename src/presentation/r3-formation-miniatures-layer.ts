import { MercatorCoordinate, type CustomLayerInterface, type Map } from 'maplibre-gl';
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
import { formationPresentationPath, formationPresentationPosition, type FormationGeoPoint } from './r3-formation-movement';
import { terrainOperationalTerritoryCentres } from './r3-terrain-operational-markers-core';

export const R3_FORMATION_MINIATURE_LAYER_ID = 'r3-wp3-5-formation-miniatures';
const CLEARANCE_METRES = 45;

type Piece = {
  root: Group;
  current: FormationGeoPoint;
  target: FormationGeoPoint;
  lastUpdate: number;
};

export type FormationMiniatureBrowserEvidence = {
  layerId: string;
  reducedMotion: boolean;
  renderCount: number;
  pieces: Array<{ id: string; current: FormationGeoPoint; target: FormationGeoPoint; elevation: number; visible: boolean }>;
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
  const material = new MeshStandardMaterial({ color: statusColours[group.status], roughness: 0.7, metalness: 0.18 });
  const base = new Mesh(
    new CylinderGeometry(selected ? 1.25 : 1.08, selected ? 1.35 : 1.18, 0.16, 16),
    new MeshStandardMaterial({ color: selected ? 0xeaff78 : 0x173a3f, roughness: 0.86, metalness: 0.12 })
  );
  base.rotation.x = Math.PI / 2;
  base.position.z = 0.08;
  root.add(base);
  for (const [x, y] of [[-0.5, -0.2], [0, 0.22], [0.5, -0.2], [-0.25, 0.55], [0.25, 0.55]] as const) {
    root.add(soldier(material, x, y));
  }
  const label = new Mesh(
    new PlaneGeometry(1.55, 0.58),
    new MeshStandardMaterial({ map: makeIdentityTexture(group), transparent: true, side: DoubleSide, roughness: 0.8 })
  );
  label.position.set(0, -0.88, 0.48);
  label.rotation.x = Math.PI / 2.7;
  root.add(label);
  root.userData.status = group.status;
  return root;
}

function movementBearing(group: TaskGroup) {
  const path = formationPresentationPath(group, terrainOperationalTerritoryCentres);
  if (!path || path.length < 2 || group.status !== 'moving') return 0;
  const position = formationPresentationPosition(group, terrainOperationalTerritoryCentres) ?? path[0];
  const next = path.find(point => point !== path[0] && (point[0] !== position[0] || point[1] !== position[1])) ?? path.at(-1)!;
  return Math.atan2(next[0] - position[0], next[1] - position[1]);
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
  private renderCount = 0;

  constructor(state: GameState) {
    this.state = state;
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

  update(state: GameState) {
    this.state = state;
    this.rebuild();
    this.map?.triggerRepaint();
  }

  private rebuild() {
    if (!this.map) return;
    const active = new Set(Object.keys(this.state.taskGroups));
    for (const [id, piece] of this.pieces) if (!active.has(id)) {
      this.scene.remove(piece.root);
      this.pieces.delete(id);
    }
    for (const group of Object.values(this.state.taskGroups)) {
      const target = formationPresentationPosition(group, terrainOperationalTerritoryCentres);
      if (!target) continue;
      const selected = group.id === this.state.selectedTaskGroupId;
      const old = this.pieces.get(group.id);
      if (!old || old.root.userData.status !== group.status || Boolean(old.root.userData.selected) !== selected) {
        if (old) this.scene.remove(old.root);
        const root = makeMiniature(group, selected);
        root.userData.selected = selected;
        root.rotation.z = movementBearing(group);
        this.scene.add(root);
        this.pieces.set(group.id, { root, current: old?.current ?? target, target, lastUpdate: performance.now() });
      } else {
        old.target = target;
        old.root.rotation.z = movementBearing(group);
      }
    }
  }

  render(_gl: WebGL2RenderingContext, options: { modelViewProjectionMatrix: ArrayLike<number> }) {
    if (!this.map || !this.renderer) return;
    const now = performance.now();
    let animating = false;
    const zoom = this.map.getZoom();
    const lodScale = zoom < 4.8 ? 0.55 : zoom < 6.4 ? 0.78 : 1;
    const browserPieces: FormationMiniatureBrowserEvidence['pieces'] = [];
    for (const [id, piece] of this.pieces) {
      const elapsed = Math.min(64, Math.max(0, now - piece.lastUpdate));
      piece.lastUpdate = now;
      const alpha = this.reducedMotion ? 1 : 1 - Math.exp(-elapsed / 135);
      const dx = piece.target[0] - piece.current[0];
      const dy = piece.target[1] - piece.current[1];
      piece.current = Math.hypot(dx, dy) < 1e-7 ? piece.target : [piece.current[0] + dx * alpha, piece.current[1] + dy * alpha];
      animating ||= piece.current !== piece.target;
      const lngLat: [number, number] = [piece.current[0], piece.current[1]];
      const elevation = this.map.queryTerrainElevation(lngLat) ?? 0;
      const coordinate = MercatorCoordinate.fromLngLat(lngLat, elevation + CLEARANCE_METRES);
      const metres = coordinate.meterInMercatorCoordinateUnits();
      piece.root.position.set(coordinate.x, coordinate.y, coordinate.z);
      piece.root.scale.set(metres * 26000 * lodScale, -metres * 26000 * lodScale, metres * 26000 * lodScale);
      piece.root.visible = true;
      browserPieces.push({ id, current: [...piece.current], target: [...piece.target], elevation, visible: piece.root.visible });
    }
    this.camera.projectionMatrix = new Matrix4().fromArray(options.modelViewProjectionMatrix);
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
    for (const child of this.scene.children) if (child instanceof Object3D) child.clear();
    this.pieces.clear();
    delete window.__r3FormationMiniatures;
  }
}
