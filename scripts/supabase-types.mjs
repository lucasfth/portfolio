import { spawn } from "node:child_process";
import { open, rename, rm } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const output = path.join(root, "lib/supabase/database.types.ts");
const args = process.argv.slice(2);
const target = ["gen", "types", "typescript", "--schema", "public"];
let projectId = "jkelrfwaikcxughpsbqx";
let local = false;

for (let i = 0; i < args.length; i += 1) {
  if (args[i] === "--local") {
    local = true;
  } else if (args[i] === "--project-id") {
    projectId = args[++i];
    if (!projectId || projectId.startsWith("--")) {
      console.error("--project-id requires a project ref");
      process.exit(2);
    }
  } else {
    console.error(`Unknown argument: ${args[i]}`);
    process.exit(2);
  }
}

if (local) target.push("--local");
else target.push("--project-id", projectId);

const temp = `${output}.${randomUUID()}.tmp`;
const cli = path.join(root, "node_modules/.bin/supabase");
const chunks = [];
const child = spawn(cli, target, { cwd: root, stdio: ["ignore", "pipe", "inherit"] });
child.stdout.on("data", (chunk) => chunks.push(chunk));
child.on("error", (error) => {
  console.error(`Could not start Supabase CLI: ${error.message}`);
  process.exitCode = 1;
});
child.on("close", async (code) => {
  const generated = Buffer.concat(chunks);
  if (code !== 0) {
    console.error(`Supabase type generation failed (exit ${code ?? "unknown"}); existing types were left unchanged.`);
    process.exitCode = code || 1;
    return;
  }
  if (generated.length === 0 || !generated.toString("utf8").trim()) {
    console.error("Supabase CLI returned empty type output; existing types were left unchanged.");
    process.exitCode = 1;
    return;
  }
  try {
    const handle = await open(temp, "wx", 0o600);
    try {
      await handle.writeFile(generated);
      await handle.sync();
    } finally {
      await handle.close();
    }
    await rename(temp, output);
    console.log("Updated lib/supabase/database.types.ts");
  } catch (error) {
    console.error(`Could not atomically update generated types: ${error.message}`);
    process.exitCode = 1;
  } finally {
    await rm(temp, { force: true });
  }
});
