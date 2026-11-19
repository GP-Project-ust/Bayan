import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function ensureAppDirs() {
  const appDir = path.join(__dirname, 'src', 'app');
  if (!fs.existsSync(appDir)) return;
  
  function getAllDirs(dir) {
    let results = [];
    try {
      const list = fs.readdirSync(dir, { withFileTypes: true });
      for (const item of list) {
        if (item.isDirectory()) {
          const full = path.join(dir, item.name);
          results.push(full);
          results = results.concat(getAllDirs(full));
        }
      }
    } catch {}
    return results;
  }

  const allDirs = getAllDirs(appDir).map(d => path.relative(appDir, d));
  const prefixes = [
    path.join(__dirname, '.next', 'server', 'app'),
    path.join(__dirname, '.next', 'static', 'chunks', 'app'),
    path.join(__dirname, '.next', 'types', 'app'),
  ];

  for (const prefix of prefixes) {
    if (!fs.existsSync(prefix)) {
      try { fs.mkdirSync(prefix, { recursive: true }); } catch {}
    }
    for (const rel of allDirs) {
      const target = path.join(prefix, rel);
      if (!fs.existsSync(target)) {
        try { fs.mkdirSync(target, { recursive: true }); } catch {}
      }
    }
  }
}

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: process.env.STANDALONE === "true" || process.platform !== "win32" ? "standalone" : undefined,
  reactStrictMode: true,
  webpack: (config) => {
    ensureAppDirs();
    return config;
  },
};

export default nextConfig;
