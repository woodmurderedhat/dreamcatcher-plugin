import { mkdir, readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import JSZip from "jszip";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.resolve(__dirname, "..");

const manifestPath = path.join(root, "manifest.json");
const mainPath = path.join(root, "main.js");
const stylesPath = path.join(root, "styles.css");

if (!existsSync(mainPath)) {
  throw new Error("main.js not found. Run `npm run build` first.");
}

const manifestRaw = await readFile(manifestPath, "utf8");
const manifest = JSON.parse(manifestRaw);

const pluginId = manifest.id;
const version = manifest.version;
const filesToPackage = [
  { source: mainPath, name: "main.js" },
  { source: manifestPath, name: "manifest.json" },
  { source: stylesPath, name: "styles.css" }
];

const releaseRoot = path.join(root, "release");
const versionDirName = `${pluginId}-${version}`;
const versionDir = path.join(releaseRoot, versionDirName);
const latestDir = path.join(releaseRoot, "latest");
const zipPath = path.join(releaseRoot, `${versionDirName}.zip`);

await mkdir(versionDir, { recursive: true });
await mkdir(latestDir, { recursive: true });

const zip = new JSZip();
for (const file of filesToPackage) {
  const content = await readFile(file.source);
  zip.file(file.name, content);
  await writeFile(path.join(versionDir, file.name), content);
  await writeFile(path.join(latestDir, file.name), content);
}

const zipBuffer = await zip.generateAsync({ type: "nodebuffer", compression: "DEFLATE" });
await writeFile(zipPath, zipBuffer);

console.log(`Created prebuilt package: ${zipPath}`);
console.log(`Copied install files to: ${versionDir}`);
console.log(`Updated rolling prebuilt files: ${latestDir}`);
