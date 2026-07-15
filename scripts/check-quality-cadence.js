const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const changelogPath = path.join(root, 'docs', 'CHANGELOG.md');
const backendPackagePath = path.join(root, 'backend', 'package.json');
const frontendPackagePath = path.join(root, 'frontend', 'package.json');

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function extractSection(changelog, version) {
  const escaped = version.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const startRe = new RegExp(`^## \\[${escaped}\\].*$`, 'm');
  const startMatch = changelog.match(startRe);
  if (!startMatch || typeof startMatch.index !== 'number') {
    return null;
  }

  const start = startMatch.index;
  const rest = changelog.slice(start + startMatch[0].length);
  const nextHeaderIndex = rest.search(/^## \[/m);
  const section = nextHeaderIndex >= 0 ? rest.slice(0, nextHeaderIndex) : rest;
  return section;
}

function main() {
  if (!fs.existsSync(changelogPath)) {
    console.error('docs/CHANGELOG.md is missing.');
    process.exit(1);
  }

  const backendPackage = readJson(backendPackagePath);
  const frontendPackage = readJson(frontendPackagePath);
  const changelog = fs.readFileSync(changelogPath, 'utf8');

  if (backendPackage.version !== frontendPackage.version) {
    console.error('Backend and frontend package versions must match.');
    process.exit(1);
  }

  const version = backendPackage.version;
  const parts = String(version).split('.');
  const major = Number(parts[0] || 0);
  const minor = Number(parts[1] || 0);
  const patch = Number(parts[2] || 0);

  const isThirdMinorRelease = major === 0 && patch === 0 && minor > 0 && minor % 3 === 0;

  if (!isThirdMinorRelease) {
    console.log(`Quality cadence check passed for version ${version} (not a 3rd minor release checkpoint).`);
    return;
  }

  const section = extractSection(changelog, version);
  if (!section) {
    console.error(`docs/CHANGELOG.md is missing a ${version} section required for quality cadence checks.`);
    process.exit(1);
  }

  const sectionLower = section.toLowerCase();
  const hasQualityNote = sectionLower.includes('quality audit')
    || sectionLower.includes('quality review')
    || sectionLower.includes('code quality check');

  if (!hasQualityNote) {
    console.error(`Version ${version} is a 3rd minor release checkpoint. Add a quality audit note to docs/CHANGELOG.md under [${version}] before versioning.`);
    process.exit(1);
  }

  console.log(`Quality cadence check passed for version ${version}.`);
}

main();
