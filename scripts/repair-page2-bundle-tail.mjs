import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const panel12PartsDirectory = path.join(
  repositoryRoot,
  'src',
  'assets',
  'motion-comic-v3',
  'page2',
  'panel-12-parts'
);
const page2BundleDirectory = path.join(
  repositoryRoot,
  'src',
  'assets',
  'motion-comic-v3',
  'page2',
  'bundle-parts-q12'
);

const PANEL_12_LENGTH = 23_636;
const PANEL_12_BYTES_ALREADY_IN_BUNDLE = 10_076;
const EXPECTED_TAIL_LENGTH = 13_560;
const FIRST_ENCODED_PART_LENGTH = 9_040;

function partNumber(fileName) {
  const match = fileName.match(/^part-(\d+)\.txt$/);
  return match ? Number.parseInt(match[1], 10) : Number.MAX_SAFE_INTEGER;
}

function isWebP(bytes) {
  return bytes.subarray(0, 4).toString('ascii') === 'RIFF'
    && bytes.subarray(8, 12).toString('ascii') === 'WEBP';
}

const sourceParts = (await readdir(panel12PartsDirectory))
  .filter(fileName => /^part-\d+\.txt$/.test(fileName))
  .sort((left, right) => partNumber(left) - partNumber(right));

if (sourceParts.length !== 4) {
  throw new Error(`Expected 4 standalone Panel 12 source parts, found ${sourceParts.length}.`);
}

const encodedPanel12 = (await Promise.all(
  sourceParts.map(fileName => readFile(path.join(panel12PartsDirectory, fileName), 'utf8'))
)).map(content => content.trim()).join('');
const panel12Bytes = Buffer.from(encodedPanel12, 'base64');

if (panel12Bytes.length !== PANEL_12_LENGTH || !isWebP(panel12Bytes)) {
  throw new Error(
    `Standalone Panel 12 reconstruction produced ${panel12Bytes.length} bytes instead of ${PANEL_12_LENGTH}.`
  );
}

const tailBytes = panel12Bytes.subarray(PANEL_12_BYTES_ALREADY_IN_BUNDLE);
if (tailBytes.length !== EXPECTED_TAIL_LENGTH) {
  throw new Error(`Panel 12 bundle tail has ${tailBytes.length} bytes instead of ${EXPECTED_TAIL_LENGTH}.`);
}

const encodedTail = tailBytes.toString('base64');
const tailParts = [
  encodedTail.slice(0, FIRST_ENCODED_PART_LENGTH),
  encodedTail.slice(FIRST_ENCODED_PART_LENGTH)
];

await mkdir(page2BundleDirectory, { recursive: true });
await Promise.all(tailParts.map((content, index) =>
  writeFile(
    path.join(page2BundleDirectory, `part-${String(index + 9).padStart(2, '0')}.txt`),
    content,
    'utf8'
  )
));

console.log(
  `Rebuilt the ${EXPECTED_TAIL_LENGTH}-byte Page 2 bundle tail from verified standalone Panel 12 artwork.`
);
