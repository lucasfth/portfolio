const fs = require("fs");
const path = require("path");

const imagesDir = path.join(process.cwd(), "public", "images");

if (!fs.existsSync(imagesDir)) {
  console.error("public/images folder not found — nothing to do");
  process.exit(0);
}

function walk(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(full);
    } else if (entry.isFile()) {
      if (entry.name.startsWith(".")) continue;
      // normalize filename: replace spaces with -, lowercase extension and basename
      const parsed = path.parse(full);
      const safeName = parsed.name
        .replace(/\s+/g, "-")
        .replace(/[^a-zA-Z0-9-_]/g, "");
      const ext = parsed.ext.toLowerCase();
      const newName = safeName + ext;
      const newFull = path.join(parsed.dir, newName);
      if (full !== newFull) {
        try {
          // if target doesn't exist, rename directly
          if (!fs.existsSync(newFull)) {
            fs.renameSync(full, newFull);
            console.log(`Renamed: ${full} -> ${newFull}`);
          } else {
            // Target exists: pick a unique name rather than deleting the original
            const dir = parsed.dir;
            const base = safeName;
            const extname = ext;
            let i = 1;
            let candidate;
            do {
              candidate = path.join(dir, `${base}-${i}${extname}`);
              i++;
            } while (fs.existsSync(candidate));
            fs.renameSync(full, candidate);
            console.log(
              `Target exists, renamed to unique: ${full} -> ${candidate}`
            );
          }
        } catch (e) {
          console.error("Error renaming", full, e && e.message ? e.message : e);
        }
      }
    }
  }
}

walk(imagesDir);
console.log("Image filename normalization complete.");
