import fs from 'node:fs';
import path from 'node:path';

const fontDir = path.resolve('src/app/fonts');
const files = fs.readdirSync(fontDir);

console.log('Font Directory:', fontDir);
for (const file of files) {
  const filePath = path.join(fontDir, file);
  const stat = fs.statSync(filePath);
  if (stat.isDirectory()) continue;
  const buf = fs.readFileSync(filePath);
  const magic = buf.subarray(0, 4).toString('ascii');
  const flavor = buf.subarray(4, 8).toString('ascii');
  const length = buf.readUInt32BE(8);
  console.log({
    file,
    sizeOnDisk: stat.size,
    headerLength: length,
    magic,
    flavor: flavor.trim(),
    isValidWoff2: magic === 'wOF2',
  });
}
