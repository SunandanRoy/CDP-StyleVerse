#!/usr/bin/env node
// Replaces the block between the SCE seed markers in a target HTML file with
// `const SCE_SEED = <json>;` + `const SCE_CHECKSUM = "...";` + the pure helper
// functions extracted verbatim from shared/generate-seed.mjs. Dev-only tooling —
// not part of the submitted HTML file.
//
// Usage: node scripts/inline-seed.mjs [PWC_CX_Semi.html]

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');

const START_MARKER = '/* === SCE SHARED SEED v2 (do not hand-edit) === */';
const END_MARKER = '/* === END SCE SHARED SEED === */';
const HELPER_START = '/* === PURE HELPERS START === */';
const HELPER_END = '/* === PURE HELPERS END === */';

const targetFile = process.argv[2] || 'PWC_CX_Semi.html';
const targetPath = path.join(root, targetFile);

if (!existsSync(targetPath)) {
  console.error('Target file not found:', targetPath);
  process.exit(1);
}

const genSrc = readFileSync(path.join(root, 'shared/generate-seed.mjs'), 'utf8');
const seedJsonPath = path.join(root, 'shared/sce-seed.json');
if (!existsSync(seedJsonPath)) {
  console.error('shared/sce-seed.json not found — run `node shared/generate-seed.mjs` first.');
  process.exit(1);
}
const seedObj = JSON.parse(readFileSync(seedJsonPath, 'utf8'));

const hStart = genSrc.indexOf(HELPER_START);
const hEnd = genSrc.indexOf(HELPER_END);
if (hStart === -1 || hEnd === -1) {
  console.error('Pure-helper markers not found in shared/generate-seed.mjs');
  process.exit(1);
}
const helperSrc = genSrc.slice(hStart + HELPER_START.length, hEnd)
  .split('\n')
  .filter(line => line.trim() !== '/* ======================================================================= */')
  .join('\n')
  .trim();

let html = readFileSync(targetPath, 'utf8');
const s = html.indexOf(START_MARKER);
const e = html.indexOf(END_MARKER);
if (s === -1 || e === -1) {
  console.error('SCE seed markers not found in ' + targetFile + '. Expected:');
  console.error('  ' + START_MARKER);
  console.error('  ' + END_MARKER);
  process.exit(1);
}

const checksum = seedObj.checksum;
const seedJsonStr = JSON.stringify(seedObj);
const block = START_MARKER + '\n'
  + 'const SCE_SEED = ' + seedJsonStr + ';\n'
  + 'const SCE_CHECKSUM = "' + checksum + '";\n'
  + helperSrc + '\n'
  + END_MARKER;

html = html.slice(0, s) + block + html.slice(e + END_MARKER.length);
writeFileSync(targetPath, html, 'utf8');

console.log('Inlined SCE seed into', targetFile);
console.log('  seed JSON bytes:', seedJsonStr.length);
console.log('  checksum:', checksum, '(short:', checksum.slice(0, 8) + ')');
console.log('  helper source bytes:', helperSrc.length);
