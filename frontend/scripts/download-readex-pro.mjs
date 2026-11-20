import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const appFontsDir = path.join(root, "src", "app", "fonts");
const publicFontsDir = path.join(root, "public", "fonts");

for (const d of [appFontsDir, publicFontsDir]) {
  if (!fs.existsSync(d)) {
    fs.mkdirSync(d, { recursive: true });
  }
}

async function run() {
  console.log("Querying Google Fonts for Readex Pro (Variable 160-700)...");
  const cssUrl = "https://fonts.googleapis.com/css2?family=Readex+Pro:wght@160..700&display=swap";
  const userAgent = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

  const res = await fetch(cssUrl, { headers: { "User-Agent": userAgent } });
  const css = await res.text();
  console.log("Fetched CSS. Parsing @font-face blocks...");

  // Match arabic and latin font subsets
  const blocks = css.split("/* ");
  let arabicUrl = null;
  let latinUrl = null;

  for (const block of blocks) {
    if (block.startsWith("arabic */")) {
      const match = block.match(/url\((https:\/\/[^)]+\.woff2)\)/);
      if (match) arabicUrl = match[1];
    } else if (block.startsWith("latin */")) {
      const match = block.match(/url\((https:\/\/[^)]+\.woff2)\)/);
      if (match) latinUrl = match[1];
    }
  }

  console.log("Arabic WOFF2 URL:", arabicUrl);
  console.log("Latin WOFF2 URL:", latinUrl);

  if (!arabicUrl || !latinUrl) {
    throw new Error("Could not find arabic or latin font URLs in Google Fonts response");
  }

  const oflUrl = "https://raw.githubusercontent.com/google/fonts/main/ofl/readexpro/OFL.txt";
  console.log("Fetching font files and OFL license...");

  const [resArabic, resLatin, resOfl] = await Promise.all([
    fetch(arabicUrl),
    fetch(latinUrl),
    fetch(oflUrl)
  ]);

  const arabicBuf = Buffer.from(await resArabic.arrayBuffer());
  const latinBuf = Buffer.from(await resLatin.arrayBuffer());
  const oflText = await resOfl.text();

  console.log(`Arabic WOFF2 size: ${arabicBuf.length} bytes`);
  console.log(`Latin WOFF2 size: ${latinBuf.length} bytes`);
  console.log(`OFL length: ${oflText.length} characters`);

  // Verify WOFF2 magic bytes: 0x77 0x4F 0x46 0x32 ('wOF2')
  const magicArabic = arabicBuf.subarray(0, 4).toString("ascii");
  const magicLatin = latinBuf.subarray(0, 4).toString("ascii");

  if (magicArabic !== "wOF2" || magicLatin !== "wOF2") {
    throw new Error(`Invalid WOFF2 signature: Arabic=${magicArabic}, Latin=${magicLatin}`);
  }
  console.log("Verified WOFF2 magic signature: 'wOF2'");

  if (!oflText.includes("SIL OPEN FONT LICENSE Version 1.1") || !oflText.includes("Readex")) {
    throw new Error("Invalid or unverified OFL license text");
  }
  console.log("Verified SIL Open Font License 1.1 for Readex Pro");

  // Save to src/app/fonts/
  fs.writeFileSync(path.join(appFontsDir, "ReadexPro-Variable.woff2"), arabicBuf);
  fs.writeFileSync(path.join(appFontsDir, "ReadexPro-Latin.woff2"), latinBuf);
  fs.writeFileSync(path.join(appFontsDir, "READEX_PRO_OFL.txt"), oflText, "utf8");

  // Mirror to public/fonts/
  fs.writeFileSync(path.join(publicFontsDir, "ReadexPro-Variable.woff2"), arabicBuf);
  fs.writeFileSync(path.join(publicFontsDir, "ReadexPro-Latin.woff2"), latinBuf);
  fs.writeFileSync(path.join(publicFontsDir, "READEX_PRO_OFL.txt"), oflText, "utf8");

  console.log("All Readex Pro font files & licenses saved locally to src/app/fonts/ and public/fonts/ successfully!");
}

run().catch((err) => {
  console.error("Download failed:", err);
  process.exit(1);
});
