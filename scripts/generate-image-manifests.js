const fs = require("fs");
const path = require("path");

function isImageFile(name) {
  return /\.(jpe?g|png|webp|gif|svg)$/i.test(name);
}

const imagesDir = path.join(process.cwd(), "public", "images");

if (!fs.existsSync(imagesDir)) {
  console.error("public/images folder not found — nothing to do");
  process.exit(1);
}

const entries = fs.readdirSync(imagesDir, { withFileTypes: true });
const folders = entries.filter((e) => e.isDirectory()).map((d) => d.name);

folders.forEach((folder) => {
  const folderPath = path.join(imagesDir, folder);
  const files = fs.readdirSync(folderPath).filter(isImageFile).sort();
  const manifest = { images: files };
  const outPath = path.join(folderPath, "manifest.json");
  fs.writeFileSync(outPath, JSON.stringify(manifest, null, 2));
  console.log(`Wrote ${outPath} (${files.length} images)`);
});

// Also write a top-level images manifest listing galleries
const topManifest = { galleries: folders };
fs.writeFileSync(
  path.join(imagesDir, "manifest.json"),
  JSON.stringify(topManifest, null, 2)
);
console.log(
  `Wrote ${path.join(imagesDir, "manifest.json")} (galleries: ${
    folders.length
  })`
);
