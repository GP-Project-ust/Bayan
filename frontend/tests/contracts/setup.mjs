import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const origRead = fs.readFileSync;
const origExists = fs.existsSync;
const origStat = fs.statSync;
const origLstat = fs.lstatSync;

const resolve = p => {
  if (typeof p !== 'string') return p;
  if (origExists(p)) return p;
  const rel = path.relative(root, p);
  const srcCandidate = path.join(root, 'src', rel);
  if (origExists(srcCandidate)) return srcCandidate;
  return p;
};

fs.readFileSync = (p, ...args) => origRead.call(fs, resolve(p), ...args);
fs.existsSync = (p) => origExists.call(fs, resolve(p));
fs.statSync = (p, ...args) => origStat.call(fs, resolve(p), ...args);
fs.lstatSync = (p, ...args) => origLstat.call(fs, resolve(p), ...args);
