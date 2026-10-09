import assert from "node:assert/strict";
import test from "node:test";

const base = process.env.TEST_BASE_URL;

async function json(path, init) {
  const response = await fetch(`${base}${path}`, init);
  return { response, body: await response.json() };
}

test("public API contract", { skip: !base }, async () => {
  const openapi = await (await fetch(`${base}/openapi.json`)).json();
  assert.equal(openapi.openapi, "3.1.1");
  assert.deepEqual(Object.keys(openapi.paths).sort(), ["/api/gallery-preview", "/api/markdown", "/api/search"]);
  assert.equal(openapi.paths["/api/search"].get.responses["200"].content["application/json"].schema.type, "array");
  assert.equal(openapi.paths["/api/gallery-preview"].get.responses["200"].content["application/json"].schema.items.$ref, "#/components/schemas/GalleryPreviewImage");
  assert.ok((await fetch(`${base}/.well-known/api-catalog`)).ok);

  const search = await json("/api/search");
  assert.equal(search.response.status, 200);
  assert.ok(Array.isArray(search.body));
  assert.ok(search.body.every(({ title, href }) => typeof title === "string" && typeof href === "string"));

  for (const path of ["/api/search", "/api/gallery-preview?id=nature", "/api/markdown?path=/about"]) {
    const result = await json(path, { method: "POST" });
    assert.equal(result.response.status, 405, path);
    assert.equal(result.response.headers.get("allow"), "GET", path);
    assert.deepEqual(result.body, { error: { code: "method_not_allowed", message: "This endpoint only supports GET." } }, path);
  }

  const missingGallery = await json("/api/gallery-preview?id=missing");
  assert.equal(missingGallery.response.status, 404);
  assert.deepEqual(missingGallery.body, { error: { code: "gallery_not_found", message: "The requested gallery was not found." } });

  const missingApi = await json("/api/not-a-public-endpoint");
  assert.equal(missingApi.response.status, 404);
  assert.deepEqual(missingApi.body, { error: { code: "api_not_found", message: "The requested public API endpoint was not found." } });
});

test("MCP failures are JSON-RPC errors", { skip: !base }, async () => {
  const headers = { "content-type": "application/json", accept: "application/json, text/event-stream" };
  const request = (body, extra = {}) => fetch(`${base}/mcp`, { method: "POST", headers: { ...headers, ...extra }, body });

  for (const [response, code, id] of [
    [await request("{"), -32700, null],
    [await request(JSON.stringify({ jsonrpc: "2.0", id: 4, method: "missing" })), -32601, 4],
    [await request(JSON.stringify({ jsonrpc: "2.0", id: 5, method: "ping" }), { "mcp-protocol-version": "unsupported" }), -32600, null],
  ]) {
    assert.match(response.headers.get("content-type"), /^application\/json/);
    const body = await response.json();
    assert.equal(body.jsonrpc, "2.0");
    assert.equal(body.id, id);
    assert.equal(body.error.code, code);
  }

  const noAccept = await fetch(`${base}/mcp`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ jsonrpc: "2.0", id: 7, method: "ping" }) });
  assert.equal(noAccept.status, 406);
  assert.equal((await noAccept.json()).error.code, -32600);

  const get = await fetch(`${base}/mcp`);
  assert.equal(get.status, 405);
  assert.equal(get.headers.get("allow"), "POST");
  assert.equal((await get.json()).error.code, -32600);
});
