const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const appDir = path.join(root, 'src', 'app');
const serverTargetDir = path.join(root, '.next', 'server', 'app');
const staticTargetDir = path.join(root, '.next', 'static', 'chunks', 'app');
const typesTargetDir = path.join(root, '.next', 'types', 'app');

function mirrorDirs(src, dest) {
  if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest, { recursive: true });
  }
  const entries = fs.readdirSync(src, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.isDirectory()) {
      const subSrc = path.join(src, entry.name);
      const subDest = path.join(dest, entry.name);
      mirrorDirs(subSrc, subDest);
    }
  }
}

mirrorDirs(appDir, serverTargetDir);
mirrorDirs(appDir, staticTargetDir);
mirrorDirs(appDir, typesTargetDir);
console.log('Pre-created directory tree for .next/server/app, .next/static/chunks/app, and .next/types/app');
