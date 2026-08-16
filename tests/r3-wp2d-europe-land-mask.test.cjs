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

test('WP2D-E renderer consumes only the committed lightweight Europe land fallback', () => {
  assert.match(renderer, /import europeLandMask from '\.\.\/assets\/r3-europe-land-mask\.json'/);
  assert.match(renderer, /const terrainLandGeoJSON = europeLandMask/);
  assert.doesNotMatch(renderer, /world-atlas\/land-(?:50m|110m)\.json/);
  assert.doesNotMatch(renderer, /europe-land-mask-50m/);
  assert.doesNotMatch(renderer, /topojsonFeature/);
});

test('WP3.9B detailed land mask is reproducible from World Atlas during normal production builds', () => {
  assert.equal(packageJson.scripts['build:r3-europe-land-mask'], 'node scripts/maps/build-r3-europe-land-mask.mjs');
  assert.match(packageJson.scripts.prebuild, /build:r3-europe-land-mask/);
  assert.match(builder, /bboxClip/);
  assert.match(builder, /world-atlas\/land-50m\.json/);
  assert.match(builder, /public\/generated\/r3-terrain\/europe-land-mask-50m\.geojson/);
  assert.match(builder, /R3_EUROPE_LAND_MASK_BOUNDS = \[-30, 28, 55, 76\]/);
  assert.match(builder, /cleanClippedFeature/);
  assert.match(builder, /delivery: 'static-maplibre-geojson'/);
});

test('WP2D-E committed fallback mask remains bounded, non-empty and free of empty rings', () => {
  assert.equal(asset.type, 'FeatureCollection');
  assert.equal(asset.futureConquest.id, 'r3-europe-land-mask-v2');
  assert.equal(asset.futureConquest.source, 'world-atlas/land-110m');
  assert.equal(asset.futureConquest.purpose, 'presentation-only physical land wash and coastline');
  assert.deepEqual(asset.futureConquest.clipBounds, clipBounds);
  assert.ok(asset.features.length > 0);
  assert.ok(fs.statSync(assetPath).size < 500_000, 'Europe fallback mask should remain a small presentation asset');

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
  assert.ok(ringCount > 10, 'Europe fallback mask unexpectedly lost coastline geometry');
  assert.ok(coordinateCount > 100, 'Europe fallback mask unexpectedly lost geographic detail');
});

test('WP3.9B detailed mask builder preserves bounded RFC 7946 polygon render units', () => {
  assert.match(builder, /bboxClip\(feature, R3_EUROPE_LAND_MASK_BOUNDS\)/);
  assert.match(builder, /\.flatMap\(feature => feature\.geometry\.type === 'MultiPolygon'/);
  assert.match(builder, /geometry: \{ type: 'Polygon', coordinates \}/);
  assert.match(builder, /coordinates\.map\(rewindPolygon\)/);

  // The lightweight committed fallback retains the same independent-polygon
  // invariant, so it remains a valid immediate source while the 50m static
  // refinement is fetched and promoted by WP3.9B.
  assert.ok(asset.features.length > 10, 'expected the clipped fallback MultiPolygon to be split into render units');
  for (const feature of asset.features) {
    feature.geometry.coordinates.forEach((ring, index) => {
      const area = ring.reduce((sum, coordinate, pointIndex) => {
        const previous = ring[(pointIndex + ring.length - 1) % ring.length];
        return sum + previous[0] * coordinate[1] - coordinate[0] * previous[1];
      }, 0) / 2;
      assert.equal(area > 0, index === 0, `ring ${index} has incorrect RFC 7946 winding`);
    });
  }
});
