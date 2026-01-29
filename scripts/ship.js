#!/usr/bin/env node

import { readFileSync, writeFileSync } from 'fs';
import { execSync } from 'child_process';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');

const version = process.argv[2];

if (!version) {
  console.error('Usage: npm run ship <version>');
  console.error('Example: npm run ship 0.1.2');
  process.exit(1);
}

// Validate version format
if (!/^\d+\.\d+\.\d+$/.test(version)) {
  console.error('Invalid version format. Use semver (e.g., 0.1.2)');
  process.exit(1);
}

console.log(`Shipping version ${version}...\n`);

// Update package.json files
const packageFiles = [
  'package.json',
  'bridge/package.json',
  'extension/package.json',
];

for (const file of packageFiles) {
  const path = join(root, file);
  const pkg = JSON.parse(readFileSync(path, 'utf-8'));
  pkg.version = version;
  writeFileSync(path, JSON.stringify(pkg, null, 2) + '\n');
  console.log(`Updated ${file}`);
}

// Update extension/manifest.json
const manifestPath = join(root, 'extension/manifest.json');
const manifest = JSON.parse(readFileSync(manifestPath, 'utf-8'));
manifest.version = version;
writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n');
console.log('Updated extension/manifest.json');

// Update CLI version in bridge/src/index.ts
const indexPath = join(root, 'bridge/src/index.ts');
let indexContent = readFileSync(indexPath, 'utf-8');
indexContent = indexContent.replace(/\.version\(['"][^'"]+['"]\)/, `.version('${version}')`);
writeFileSync(indexPath, indexContent);
console.log('Updated bridge/src/index.ts');

console.log('\nBuilding extension...');
execSync('npm run build', { cwd: join(root, 'extension'), stdio: 'inherit' });

console.log('\nBuilding bridge...');
execSync('npm run build', { cwd: join(root, 'bridge'), stdio: 'inherit' });

console.log('\nCopying extension to bridge...');
execSync('npm run copy-extension', { cwd: join(root, 'bridge'), stdio: 'inherit' });

console.log('\nPublishing to npm...');
execSync('npm publish', { cwd: join(root, 'bridge'), stdio: 'inherit' });

console.log(`\n✓ Successfully published jammincms@${version}`);
