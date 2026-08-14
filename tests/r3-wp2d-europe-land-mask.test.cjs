const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const renderer = fs.readFileSync('src/components/TerrainMapPrototypeImpl.tsx', 'utf8');
const builder = fs.readFileSync('scripts/maps/build-r3-europe-land-mask.mjs', 'utf8');
const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
const assetPath = 'src/assets/r3-europe-land-mask.json';
const asset = JSON.parse(fs.readFileSync(assetPath, 'utf8'));
const clipBounds = [-30, 28, 55, 76];

function visitGeometry(geometry, visitor) {
  if (!geometry) return;
  if (geometry.type === 'Polygon') {
    geometry.coordinates.forEach(polygon => visitor(polygon));
    return;
  }
  if (geometry.type === 'MultiPolygon') {
    geometry.coordinates.forEach(polygon => polygon.forEach(ring => visitor(ring)));
  }
}

test('WP2D-E renderer consumes only the generated Europe land mask', () => {
  assert.match(renderer, /import europeLandMask from '\.\.\/assets\/r3-europe-land-mask\.json'/);
  assert.match(renderer, /const terrainLandGeoJSON = europeLandMask/);
  assert.doesNotMatch(renderer, /world-atlas\/land-110m\.json/);
  assert.doesNotMatch(renderer, /topojsonFeature/);
});

test('WP2D-E land mask is reproducible from World Atlas during normal production builds', () => {
  assert.equal(packageJson.scripts['build:r3-europe-land-mask'], 'node scripts/maps/build-r3-europe-land-mask.mjs');
  assert.match(packageJson.scripts.prebuild, /build:r3-europe-land-mask/);
  assert.match(builder, /bboxClip/);
  assert.match(builder, /world-atlas\/land-110m\.json/);
  assert.match(builder, /R3_EUROPE_LAND_MASK_BOUNDS = \[-30, 28, 55, 76\]/);
  assert.match(builder, /cleanClippedFeature/);
});

test('WP2D-E generated land mask is bounded, non-empty and free of empty rings', () => {
  assert.equal(asset.type, 'FeatureCollection');
  assert.equal(asset.futureConquest.id, 'r3-europe-land-mask-v2');
  assert.equal(asset.futureConquest.source, 'world-atlas/land-110m');
  assert.equal(asset.futureConquest.purpose, 'presentation-only physical land wash and coastline');
  assert.deepEqual(asset.futureConquest.clipBounds, clipBounds);
  assert.ok(asset.features.length > 0);
  assert.ok(fs.statSync(assetPath).size < 500_000, 'Europe land mask should remain a small presentation asset');

  let ringCount = 0;
  let coordinateCount = 0;
  for (const feature of asset.features) {
    assert.equal(feature.geometry?.type, 'Polygon', 'each island/continent must be an independent render geometry');
    visitGeometry(feature.geometry, ring => {
      ringCount += 1;
      assert.ok(Array.isArray(ring) && ring.length >= 4, 'land mask contains an empty or invalid polygon ring');
      for (const coordinate of ring) {
        coordinateCount += 1;
        assert.ok(Array.isArray(coordinate) && coordinate.length >= 2);
        const [longitude, latitude] = coordinate;
        assert.ok(longitude >= clipBounds[0] - 1e-9 && longitude <= clipBounds[2] + 1e-9, `longitude ${longitude} escaped Europe clip`);
        assert.ok(latitude >= clipBounds[1] - 1e-9 && latitude <= clipBounds[3] + 1e-9, `latitude ${latitude} escaped Europe clip`);
      }
    });
  }
  assert.ok(ringCount > 10, 'Europe land mask unexpectedly lost coastline geometry');
  assert.ok(coordinateCount > 100, 'Europe land mask unexpectedly lost geographic detail');
});

test('WP2D stabilisation mask uses bounded RFC 7946 polygon units at Theatre zoom', () => {
  assert.ok(asset.features.length > 10, 'expected the clipped MultiPolygon to be split into render units');
  for (const feature of asset.features) {
    feature.geometry.coordinates.forEach((ring, index) => {
      const area = ring.reduce((sum, coordinate, pointIndex) => {
        const previous = ring[(pointIndex + ring.length - 1) % ring.length];
        return sum + previous[0] * coordinate[1] - coordinate[0] * previous[1];
      }, 0) / 2;
      assert.equal(area > 0, index === 0, `ring ${index} has incorrect RFC 7946 winding`);
    });
  }
  assert.match(builder, /independent,[\s\S]*bounded triangulation units/);
});
