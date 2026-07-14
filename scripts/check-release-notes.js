const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const changelogPath = path.join(root, 'docs', 'CHANGELOG.md');
const backendPackagePath = path.join(root, 'backend', 'package.json');
const frontendPackagePath = path.join(root, 'frontend', 'package.json');

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function main() {
  if (!fs.existsSync(changelogPath)) {
    console.error('docs/CHANGELOG.md is missing.');
    process.exit(1);
  }

  const backendPackage = readJson(backendPackagePath);
  const frontendPackage = readJson(frontendPackagePath);
  const changelog = fs.readFileSync(changelogPath, 'utf8');

  const expectedVersion = `## [${backendPackage.version}] -`;
  if (!changelog.includes(expectedVersion)) {
    console.error(`docs/CHANGELOG.md is missing a ${backendPackage.version} release entry.`);
    process.exit(1);
  }

  if (backendPackage.version !== frontendPackage.version) {
    console.error('Backend and frontend package versions must match.');
    process.exit(1);
  }

  console.log(`Release notes check passed for version ${backendPackage.version}.`);
}

main();
