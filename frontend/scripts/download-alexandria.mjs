import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const fontsDir = path.join(root, "src", "app", "fonts");

async function download() {
  console.log("Fetching Alexandria Arabic variable WOFF2...");
  const arabicUrl = "https://fonts.gstatic.com/s/alexandria/v6/UMBXrPdDqW66y0Y2usFeaijdA4M5.woff2";
  const latinUrl = "https://fonts.gstatic.com/s/alexandria/v6/UMBXrPdDqW66y0Y2usFeai3dAw.woff2";
  const oflUrl = "https://raw.githubusercontent.com/google/fonts/main/ofl/alexandria/OFL.txt";

  const [resArabic, resLatin, resOfl] = await Promise.all([
    fetch(arabicUrl),
    fetch(latinUrl),
    fetch(oflUrl),
  ]);

  const arabicBuffer = Buffer.from(await resArabic.arrayBuffer());
  const latinBuffer = Buffer.from(await resLatin.arrayBuffer());
  const oflText = await resOfl.text();

  console.log(`Arabic size: ${arabicBuffer.length} bytes`);
  console.log(`Latin size: ${latinBuffer.length} bytes`);

  // Verify WOFF2 magic bytes: 0x77 0x4F 0x46 0x32 ('wOF2')
  const magicArabic = arabicBuffer.subarray(0, 4).toString("ascii");
  const magicLatin = latinBuffer.subarray(0, 4).toString("ascii");

  if (magicArabic !== "wOF2" || magicLatin !== "wOF2") {
    throw new Error(`Invalid WOFF2 signature: Arabic=${magicArabic}, Latin=${magicLatin}`);
  }

  console.log("Verified WOFF2 magic signature: 'wOF2'");

  const arabicDest = path.join(fontsDir, "Alexandria-Variable.woff2");
  const latinDest = path.join(fontsDir, "Alexandria-Latin.woff2");
  const oflDest = path.join(fontsDir, "ALEXANDRIA_OFL.txt");

  fs.writeFileSync(arabicDest, arabicBuffer);
  fs.writeFileSync(latinDest, latinBuffer);
  fs.writeFileSync(oflDest, oflText, "utf8");

  console.log(`Saved:
  - ${arabicDest}
  - ${latinDest}
  - ${oflDest}
  `);
}

download().catch(err => {
  console.error("Download failed:", err);
  process.exit(1);
});
