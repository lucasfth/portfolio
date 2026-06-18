/**
 * Server-side: auto-discover gallery images from the filesystem at build/render time.
 * Replaces the manifest.json prebuild approach — galleries and images are discovered
 * dynamically from `public/images/` directory structure.
 * For server components only — uses fs directly.
 */
import { readdirSync } from "fs";
import { join } from "path";

const IMAGE_EXTENSIONS = new Set(["jpg", "jpeg", "png", "webp", "gif"]);

export interface GalleryImage {
  src: string;
  alt: string;
}

/**
 * Discover all gallery IDs by reading subdirectory names under `public/images/`.
 * Returns empty array if the directory is missing or inaccessible.
 */
export function getGalleryIds(): string[] {
  try {
    const entries = readdirSync(join(process.cwd(), "public/images"), {
      withFileTypes: true,
    });
    return entries
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name)
      .sort();
  } catch {
    return [];
  }
}

/**
 * Get all images for a given gallery.
 * Reads `public/images/${galleryId}/`, filters for image file extensions,
 * and returns sorted `{ src, alt }` objects.
 * Returns empty array if the directory is missing or inaccessible.
 */
export function getGalleryImages(galleryId: string): GalleryImage[] {
  try {
    const entries = readdirSync(
      join(process.cwd(), "public/images", galleryId),
      { withFileTypes: true },
    );
    return entries
      .filter((entry) => {
        if (!entry.isFile()) return false;
        const ext = entry.name.split(".").pop()?.toLowerCase() ?? "";
        return IMAGE_EXTENSIONS.has(ext);
      })
      .map((entry) => ({
        src: `/images/${galleryId}/${entry.name}`,
        alt: filenameToAlt(entry.name),
      }))
      .sort((a, b) => a.src.localeCompare(b.src));
  } catch {
    return [];
  }
}

/** Convert a filename like "DSCF6813-EDIT.jpg" into a human-readable alt text. */
function filenameToAlt(filename: string): string {
  const nameWithoutExt = filename.replace(/\.[^.]+$/, "");
  return nameWithoutExt.replace(/[-_]/g, " ").trim();
}
