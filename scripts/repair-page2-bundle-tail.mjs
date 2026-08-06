import { createHash } from 'node:crypto';
import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const page2AssetsDirectory = path.join(
  repositoryRoot,
  'src',
  'assets',
  'motion-comic-v3',
  'page2'
);
const part8PartsDirectory = path.join(page2AssetsDirectory, 'part-08-parts');
const panel12PartsDirectory = path.join(page2AssetsDirectory, 'panel-12-parts');
const page2BundleDirectory = path.join(page2AssetsDirectory, 'bundle-parts-q12');

const PART_8_LENGTH = 15_000;
const PART_8_ENCODED_LENGTH = 20_000;
const PART_8_SHA256 = '594f5c18628c2ced06b9ff8e53c6707d3ba5dd31b900bb7dc934a0048eb280d9';
const PANEL_12_LENGTH = 23_636;
const PANEL_12_BYTES_ALREADY_IN_BUNDLE = 10_076;
const EXPECTED_TAIL_LENGTH = 13_560;
const FIRST_ENCODED_TAIL_PART_LENGTH = 9_040;

function partNumber(fileName) {
  const match = fileName.match(/^part-(\d+)\.txt$/);
  return match ? Number.parseInt(match[1], 10) : Number.MAX_SAFE_INTEGER;
}

function isWebP(bytes) {
  return bytes.subarray(0, 4).toString('ascii') === 'RIFF'
    && bytes.subarray(8, 12).toString('ascii') === 'WEBP';
}

async function readEncodedParts(directory, expectedCount, label) {
  const partFiles = (await readdir(directory))
    .filter(fileName => /^part-\d+\.txt$/.test(fileName))
    .sort((left, right) => partNumber(left) - partNumber(right));

  if (partFiles.length !== expectedCount) {
    throw new Error(`Expected ${expectedCount} ${label} source parts, found ${partFiles.length}.`);
  }

  const content = (await Promise.all(
    partFiles.map(fileName => readFile(path.join(directory, fileName), 'utf8'))
  )).map(part => part.trim()).join('');

  return { partFiles, content };
}

await mkdir(page2BundleDirectory, { recursive: true });

const part8Source = await readEncodedParts(part8PartsDirectory, 4, 'Page 2 segment 8');
const part8Bytes = Buffer.from(part8Source.content, 'base64');
const part8Hash = createHash('sha256').update(part8Bytes).digest('hex');

if (part8Source.content.length !== PART_8_ENCODED_LENGTH) {
  throw new Error(
    `Page 2 segment 8 has ${part8Source.content.length} encoded characters instead of ${PART_8_ENCODED_LENGTH}.`
  );
}

if (part8Bytes.length !== PART_8_LENGTH || part8Hash !== PART_8_SHA256) {
  throw new Error(
    `Page 2 segment 8 failed validation: ${part8Bytes.length} bytes, SHA-256 ${part8Hash}.`
  );
}

await writeFile(
  path.join(page2BundleDirectory, 'part-08.txt'),
  part8Source.content,
  'utf8'
);

const panel12Source = await readEncodedParts(panel12PartsDirectory, 4, 'standalone Panel 12');
const panel12Bytes = Buffer.from(panel12Source.content, 'base64');

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
  encodedTail.slice(0, FIRST_ENCODED_TAIL_PART_LENGTH),
  encodedTail.slice(FIRST_ENCODED_TAIL_PART_LENGTH)
];

await Promise.all(tailParts.map((content, index) =>
  writeFile(
    path.join(page2BundleDirectory, `part-${String(index + 9).padStart(2, '0')}.txt`),
    content,
    'utf8'
  )
));

console.log(
  `Rebuilt verified Page 2 segment 8 (${PART_8_LENGTH} bytes) from ${part8Source.partFiles.length} source parts.`
);
console.log(
  `Rebuilt the ${EXPECTED_TAIL_LENGTH}-byte Page 2 bundle tail from verified standalone Panel 12 artwork.`
);
