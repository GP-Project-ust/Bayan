// Transparent path mapper for Bayan Next.js source migration (root -> src/)
import fs from 'node:fs';

const origRead = fs.readFileSync;
const origExists = fs.existsSync;
const origStat = fs.statSync;

function mapPath(p) {
  if (typeof p !== 'string') return p;
  if (origExists(p)) return p;

  const segments = ['app', 'components', 'lib', 'styles'];
  for (const seg of segments) {
    const pattern = new RegExp(`([\\\\/])(${seg}[\\\\/])`);
    if (pattern.test(p)) {
      const candidate = p.replace(pattern, `$1src$1$2`);
      if (origExists(candidate)) return candidate;
    }
  }
  return p;
}

fs.readFileSync = function(p, ...args) {
  return origRead.call(this, mapPath(p), ...args);
};

fs.existsSync = function(p) {
  return origExists.call(this, mapPath(p));
};

fs.statSync = function(p, ...args) {
  return origStat.call(this, mapPath(p), ...args);
};
