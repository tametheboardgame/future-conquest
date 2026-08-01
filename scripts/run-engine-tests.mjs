import { execFileSync } from 'node:child_process';
import { rmSync, writeFileSync } from 'node:fs';

const tsc = process.platform === 'win32' ? 'tsc.cmd' : 'tsc';

rmSync('.test-dist', { recursive: true, force: true });
execFileSync(tsc, ['-p', 'tsconfig.test.json'], { stdio: 'inherit' });
writeFileSync('.test-dist/package.json', '{"type":"commonjs"}\n');
execFileSync(process.execPath, ['--test', 'tests/engine.test.cjs'], { stdio: 'inherit' });
