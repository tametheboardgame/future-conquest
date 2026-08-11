import { performance } from 'node:perf_hooks';

function polygonCentre(points) {
  const total = points.reduce((acc, [x, y]) => [acc[0] + x, acc[1] + y], [0, 0]);
  return [total[0] / points.length, total[1] / points.length];
}

export const buildRendererSpikeScene = (density = 'representative') => {
  const territoryCount = 15;
  const routeCount = density === 'dense' ? 72 : 36;
  const pieceCount = density === 'dense' ? 120 : 48;
  const overlayCount = density === 'dense' ? 90 : 30;

  const territories = Array.from({ length: territoryCount }, (_, index) => {
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

  const routes = Array.from({ length: routeCount }, (_, index) => {
    const from = territories[index % territoryCount];
    const to = territories[(index * 7 + 3) % territoryCount];
    return {
      id: `R-${index + 1}`,
      from: polygonCentre(from.points),
      to: polygonCentre(to.points),
      critical: index % 9 === 0
    };
  });

  const pieces = Array.from({ length: pieceCount }, (_, index) => {
    const territory = territories[index % territoryCount];
    const [x, y] = polygonCentre(territory.points);
    return {
      id: `P-${index + 1}`,
      x: x + (index % 4) * 7,
      y: y + (index % 3) * 7,
      selected: index === 2
    };
  });

  return { width: 900, height: 520, territories, routes, pieces, overlayCount };
};

export const prepareSvgDomSpike = scene => {
  const territories = scene.territories.map(territory => (
    `<polygon data-id="${territory.id}"${territory.selected ? ' data-selected="true"' : ''} points="${territory.points.map(point => point.join(',')).join(' ')}" />`
  )).join('');
  const routes = scene.routes.map(route => (
    `<line data-id="${route.id}"${route.critical ? ' data-critical="true"' : ''} x1="${route.from[0]}" y1="${route.from[1]}" x2="${route.to[0]}" y2="${route.to[1]}" />`
  )).join('');
  const pieces = scene.pieces.map(piece => (
    `<g data-id="${piece.id}" transform="translate(${piece.x} ${piece.y})"${piece.selected ? ' data-selected="true"' : ''}><circle r="5"/><path d="M-4,2 L0,-6 L4,2 Z"/></g>`
  )).join('');
  const overlays = Array.from({ length: scene.overlayCount }, (_, index) => `<text data-overlay="${index}">${index}</text>`).join('');
  return `<svg viewBox="0 0 ${scene.width} ${scene.height}"><g>${territories}</g><g>${routes}</g><g>${pieces}</g><g>${overlays}</g></svg>`;
};

export const prepareWebGlHybridSpike = scene => {
  const territoryFloats = [];
  for (const territory of scene.territories) {
    const origin = territory.points[0];
    for (let index = 1; index < territory.points.length - 1; index += 1) {
      for (const point of [origin, territory.points[index], territory.points[index + 1]]) {
        territoryFloats.push(point[0], point[1], territory.selected ? 1 : 0);
      }
    }
  }

  const routeFloats = [];
  for (const route of scene.routes) {
    routeFloats.push(route.from[0], route.from[1], route.to[0], route.to[1], route.critical ? 1 : 0);
  }

  const pieceFloats = [];
  for (const piece of scene.pieces) pieceFloats.push(piece.x, piece.y, piece.selected ? 1 : 0);

  return {
    territories: new Float32Array(territoryFloats),
    routes: new Float32Array(routeFloats),
    pieces: new Float32Array(pieceFloats),
    domOverlayCount: scene.overlayCount
  };
};

const benchmark = (label, scene, prepare, iterations) => {
  for (let index = 0; index < 50; index += 1) prepare(scene);
  const started = performance.now();
  let payloadSize = 0;
  for (let index = 0; index < iterations; index += 1) {
    const value = prepare(scene);
    payloadSize = typeof value === 'string'
      ? value.length
      : value.territories.byteLength + value.routes.byteLength + value.pieces.byteLength;
  }
  const elapsed = performance.now() - started;
  return {
    label,
    iterations,
    totalMs: Number(elapsed.toFixed(3)),
    averagePrepareMs: Number((elapsed / iterations).toFixed(5)),
    payloadSize
  };
};

export const runRendererPreparationBenchmark = (iterations = 2000) => {
  const result = {};
  for (const density of ['representative', 'dense']) {
    const scene = buildRendererSpikeScene(density);
    result[density] = {
      scene: {
        territories: scene.territories.length,
        routes: scene.routes.length,
        pieces: scene.pieces.length,
        overlays: scene.overlayCount
      },
      svgDom: benchmark('svg-dom', scene, prepareSvgDomSpike, iterations),
      webglHybrid: benchmark('webgl-hybrid', scene, prepareWebGlHybridSpike, iterations)
    };
  }
  return result;
};

if (import.meta.url === `file://${process.argv[1]}`) {
  console.log(JSON.stringify(runRendererPreparationBenchmark(), null, 2));
}
