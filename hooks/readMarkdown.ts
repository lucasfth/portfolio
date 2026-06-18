/**
 * Server-side: Read markdown from `public/content/` at build/render time.
 * For server components only — uses fs directly.
 */
import { readFileSync } from "fs";
import { join } from "path";

export function readMarkdown(path: string): string {
  return readFileSync(join(process.cwd(), "public", path), "utf8");
}
