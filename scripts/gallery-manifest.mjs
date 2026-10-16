// Build-time gallery manifest: image lists + EXIF for every public/images/<gallery> folder.
// Runtime code reads this instead of the image folders, so no photo gets copied into a function bundle.
import { readdirSync, writeFileSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import exifr from "exifr";

const IMAGE_EXTENSIONS = new Set(["jpg", "jpeg", "png", "webp", "gif", "avif"]);
const root = join(process.cwd(), "public", "images");
const isImage = (f) => IMAGE_EXTENSIONS.has(f.split(".").pop()?.toLowerCase() ?? "");

function exifDate(value) {
  if (value instanceof Date && !isNaN(value.getTime())) return value.toISOString().slice(0, 10);
  if (typeof value === "string" && value) {
    const m = value.match(/(20\d{2})[:\-.](\d{2})[:\-.](\d{2})/);
    if (m) return `${m[1]}-${m[2]}-${m[3]}`;
  }
  return undefined;
}

const manifest = {};
for (const dir of readdirSync(root, { withFileTypes: true }).filter((e) => e.isDirectory()).map((e) => e.name).sort()) {
  const files = readdirSync(join(root, dir), { withFileTypes: true })
    .filter((e) => e.isFile() && isImage(e.name))
    .map((e) => e.name)
    .sort();
  if (!files.length) continue;
  manifest[dir] = await Promise.all(
    files.map(async (file) => {
      let camera, date;
      // exifr's path reader leaks handles when loading malformed image metadata.
      try {
        const bytes = await readFile(join(root, dir, file));
        const meta = (await exifr.parse(bytes, { pick: ["Make", "Model", "DateTimeOriginal", "DateTime", "ModifyDate"] })) || {};
        if (meta.Make || meta.Model) camera = [meta.Make, meta.Model].filter(Boolean).join(" ").replace(/_/g, " ").trim();
        date = exifDate(meta.DateTimeOriginal) || exifDate(meta.DateTime) || exifDate(meta.ModifyDate);
      } catch {
        // no readable EXIF
      }
      if (!date) {
        const m = file.match(/(20\d{2})(\d{2})(\d{2})/);
        if (m) date = `${m[1]}-${m[2]}-${m[3]}`;
      }
      return { file, ...(camera && { camera }), ...(date && { date }) };
    })
  );
}

writeFileSync(join(process.cwd(), "lib", "gallery-manifest.json"), JSON.stringify(manifest, null, 1) + "\n");
console.log(`gallery manifest: ${Object.keys(manifest).length} galleries, ${Object.values(manifest).flat().length} images`);
