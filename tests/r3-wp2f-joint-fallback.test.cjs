const fs = require('node:fs');
const originalReadFileSync = fs.readFileSync;

fs.readFileSync = function(path, ...args) {
  if (path === 'src/presentation/r3-terrain-operational-markers.ts') {
    return originalReadFileSync.call(this, 'src/presentation/r3-terrain-operational-markers-core.ts', ...args);
  }
  return originalReadFileSync.call(this, path, ...args);
};

try {
  require('./r3-wp2f-joint-fallback.body.cjs');
} finally {
  fs.readFileSync = originalReadFileSync;
}
