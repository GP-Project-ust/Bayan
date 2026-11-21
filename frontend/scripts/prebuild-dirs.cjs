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

// Pre-create Next.js internal directories that are outside src/app
// to prevent ENOENT errors with non-ASCII folder paths during build traces
const internalDirs = [
  path.join(root, '.next', 'server', 'app', '_not-found'),
  path.join(root, '.next', 'server', 'app', '_error'),
];
for (const dir of internalDirs) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

console.log('Pre-created directory tree for .next/server/app, .next/static/chunks/app, and .next/types/app');
