const fs = require("fs");
const path = require("path");

const imagesDir = path.join(process.cwd(), "public", "images");
if (!fs.existsSync(imagesDir)) {
  console.error("public/images not found");
  process.exit(1);
}

const galleries = fs
  .readdirSync(imagesDir, { withFileTypes: true })
  .filter((d) => d.isDirectory())
  .map((d) => d.name);
let anyMissing = false;
for (const g of galleries) {
  const manifestPath = path.join(imagesDir, g, "manifest.json");
  if (!fs.existsSync(manifestPath)) {
    console.log(`${g}: manifest missing`);
    continue;
  }
  const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
  const missing = [];
  for (const img of manifest.images || []) {
    const p = path.join(imagesDir, g, img);
    if (!fs.existsSync(p)) missing.push(img);
  }
  if (missing.length) {
    anyMissing = true;
    console.log(`${g}: missing ${missing.length} files`);
    missing.forEach((m) => console.log("  - " + m));
  } else {
    console.log(`${g}: ok`);
  }
}
if (!anyMissing) console.log("All referenced images exist.");
