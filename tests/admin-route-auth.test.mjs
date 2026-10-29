import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync, writeFileSync, mkdtempSync, rmSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { NextRequest } from "next/server.js";

const repo = process.cwd();

async function loadInjectedHandler(routeName) {
  const relative = `app/api/admin/${routeName}/route.ts`;
  const original = readFileSync(join(repo, relative), "utf8");
  let source = original.replace('import { adminUser } from "@/lib/admin/server";', 'const adminUser = (request: unknown) => (globalThis as any).__adminUser(request);');
  assert.notEqual(source, original, `${routeName}: auth dependency replacement must apply`);
  const afterAuth = source;
  source = source.replace(/import \{ (fetch\w+) \} from "@\/lib\/admin\/sources";/, (_, name) => `const ${name} = (...args: unknown[]) => (globalThis as any).__adminFetch(...args);`);
  assert.notEqual(source, afterAuth, `${routeName}: source dependency replacement must apply`);
  const afterFetch = source;
  source = source.replace('import { NextRequest, NextResponse } from "next/server";', 'import { NextRequest, NextResponse } from "next/server.js";');
  assert.notEqual(source, afterFetch, `${routeName}: Next import replacement must apply`);
  assert.match(source, /__adminUser/);
  assert.match(source, /__adminFetch/);

  const temp = mkdtempSync(join(repo, ".tmp-admin-route-"));
  try {
    const harnessTs = join(temp, "route.mts");
    writeFileSync(harnessTs, source);
    const output = join(temp, "out");
    const compiled = spawnSync("npx", ["tsc", "--ignoreConfig", "--outDir", output, "--target", "ES2022", "--module", "NodeNext", "--moduleResolution", "NodeNext", "--skipLibCheck", "--esModuleInterop", "--noEmit", "false", harnessTs], { cwd: repo, encoding: "utf8" });
    assert.equal(compiled.status, 0, `compile ${routeName}: ${compiled.stdout}\n${compiled.stderr}`);
    return { temp, module: await import(`${pathToFileURL(join(output, "route.mjs")).href}?${Date.now()}`) };
  } catch (error) {
    rmSync(temp, { recursive: true, force: true });
    throw error;
  }
}

test("actual admin GET handlers reject unauthenticated, malformed, invalid, and non-admin requests before source fetch", async () => {
  for (const routeName of ["weather", "stocks", "github", "radar"]) {
    const { temp, module } = await loadInjectedHandler(routeName);
    try {
      for (const [authorization, verifiedEmail] of [[null,null],["Bearer malformed",null],["Bearer invalid",null],["Bearer valid-non-admin","other@example.com"]]) {
        let calls = 0;
        globalThis.__adminUser = async request => {
          assert.equal(request.headers.get("authorization"), authorization);
          return verifiedEmail === "online@lucashanson.dk" ? verifiedEmail : null;
        };
        globalThis.__adminFetch = async () => { calls++; return { status: "ok" }; };
        const url = `https://example.test/api/admin/${routeName}`;
        const req = authorization ? new NextRequest(url, { headers: { authorization } }) : new NextRequest(url);
        const response = await module.GET(req);
        assert.equal(response.status, 401, `${routeName} ${authorization ?? "no header"}`);
        assert.equal(calls, 0, `${routeName} source fetch must not run`);
      }
      let calls = 0;
      globalThis.__adminUser = async request => {
        assert.equal(request.headers.get("authorization"), "Bearer valid-admin");
        return "online@lucashanson.dk";
      };
      globalThis.__adminFetch = async () => { calls++; return { status: "ok" }; };
      const response = await module.GET(new NextRequest(`https://example.test/api/admin/${routeName}`, { headers: { authorization: "Bearer valid-admin" } }));
      assert.equal(response.status, 200);
      assert.equal(calls, 1, `${routeName} source fetch should run once for admin`);
    } finally {
      delete globalThis.__adminUser;
      delete globalThis.__adminFetch;
      rmSync(temp, { recursive: true, force: true });
    }
  }
});

test("source-text check: adminUser validates bearer token and fails closed on non-admin and errors", () => {
  const source = readFileSync(join(repo, "lib/admin/server.ts"), "utf8");
  assert.match(source, /auth\.getUser\(token\)/);
  assert.match(source, /email === ADMIN_EMAIL\.toLowerCase\(\)/);
  assert.match(source, /catch \{\s*return null/);
});

test("mocked adminUser verifies bearer tokens, normalizes the admin email, and fails closed", async () => {
  const original = readFileSync(join(repo, "lib/admin/server.ts"), "utf8");
  let source = original.replace('import "server-only";', "");
  assert.notEqual(source, original, "server-only import replacement must apply");
  const beforeClient = source;
  source = source.replace('import { createClient } from "@supabase/supabase-js";', 'const createClient = (...args: unknown[]) => (globalThis as any).__createClient(...args);');
  assert.notEqual(source, beforeClient, "Supabase client injection must apply");
  const beforeType = source;
  source = source.replace('import type { NextRequest } from "next/server";', 'type NextRequest = import("next/server.js").NextRequest;');
  assert.notEqual(source, beforeType, "NextRequest type import replacement must apply");
  const beforeConfig = source;
  source = source.replace('import { ADMIN_EMAIL } from "@/lib/admin/config";', 'const ADMIN_EMAIL = "online@lucashanson.dk";');
  assert.notEqual(source, beforeConfig, "admin identity test fixture replacement must apply");
  assert.match(source, /__createClient/);
  const temp = mkdtempSync(join(repo, ".tmp-admin-user-"));
  const oldUrl = process.env.SUPABASE_URL;
  const oldKey = process.env.SUPABASE_SECRET_KEY;
  try {
    const sourcePath = join(temp, "server.mts");
    writeFileSync(sourcePath, source);
    const output = join(temp, "out");
    const compiled = spawnSync("npx", ["tsc", "--ignoreConfig", "--outDir", output, "--target", "ES2022", "--module", "NodeNext", "--moduleResolution", "NodeNext", "--skipLibCheck", "--esModuleInterop", "--types", "node", "--noEmit", "false", sourcePath], { cwd: repo, encoding: "utf8" });
    assert.equal(compiled.status, 0, `compile adminUser harness: ${compiled.stdout}\n${compiled.stderr}`);
    const module = await import(`${pathToFileURL(join(output, "server.mjs")).href}?${Date.now()}`);
    process.env.SUPABASE_URL = "https://test-project.invalid";
    process.env.SUPABASE_SECRET_KEY = "test-only-placeholder";
    let clientCreations = 0;
    let lookupToken;
    globalThis.__createClient = () => { clientCreations++; return { auth: { getUser: async token => { lookupToken = token; return globalThis.__getUser(token); } } }; };
    globalThis.__getUser = async () => ({ data: { user: { email: "ONLINE@LUCASHANSON.DK" } }, error: null });
    assert.equal(await module.adminUser(new NextRequest("https://example.test")), null, "missing bearer is denied");
    assert.equal(await module.adminUser(new NextRequest("https://example.test", { headers: { authorization: "Basic abc" } })), null, "malformed scheme is denied");
    assert.equal(clientCreations, 0, "missing/malformed headers must not create Supabase client");
    const adminRequest = new NextRequest("https://example.test", { headers: { authorization: "Bearer unit-test-admin-token" } });
    assert.equal(await module.adminUser(adminRequest), "online@lucashanson.dk", "admin email comparison is case-insensitive");
    assert.equal(lookupToken, "unit-test-admin-token");
    globalThis.__getUser = async () => ({ data: { user: null }, error: { message: "invalid token" } });
    assert.equal(await module.adminUser(new NextRequest("https://example.test", { headers: { authorization: "Bearer unit-test-invalid-token" } })), null, "invalid/expired Supabase identity is denied");
    globalThis.__getUser = async () => ({ data: { user: { email: "person@example.test" } }, error: null });
    assert.equal(await module.adminUser(new NextRequest("https://example.test", { headers: { authorization: "Bearer unit-test-nonadmin-token" } })), null, "non-admin is denied");
    globalThis.__getUser = async () => { throw new Error("test-only auth failure"); };
    assert.equal(await module.adminUser(new NextRequest("https://example.test", { headers: { authorization: "Bearer unit-test-error-token" } })), null, "auth exceptions fail closed");
  } finally {
    delete globalThis.__createClient;
    delete globalThis.__getUser;
    if (oldUrl === undefined) delete process.env.SUPABASE_URL; else process.env.SUPABASE_URL = oldUrl;
    if (oldKey === undefined) delete process.env.SUPABASE_SECRET_KEY; else process.env.SUPABASE_SECRET_KEY = oldKey;
    rmSync(temp, { recursive: true, force: true });
  }
});
