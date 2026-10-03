import { readdirSync } from "node:fs";
import { join } from "node:path";

/** Discover public static App Router pages; dynamic content is expanded separately. */
export function getStaticPagePaths(appDirectory = join(process.cwd(), "app")): string[] {
  const paths = new Set<string>();

  function visit(directory: string, route: string) {
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      if (entry.isFile()) {
        if (/^page\.(tsx?|jsx?)$/.test(entry.name)) paths.add(route || "/");
        continue;
      }
      if (!entry.isDirectory()) continue;
      const name = entry.name;
      if (
        name.startsWith("_") || name.startsWith("@") ||
        name.startsWith("[") || name.startsWith("(.") ||
        (route === "" && name === "api")
      ) continue;
      const isGroup = name.startsWith("(") && name.endsWith(")");
      visit(join(directory, name), isGroup ? route : `${route}/${name}`);
    }
  }

  visit(appDirectory, "");
  return Array.from(paths).sort();
}
