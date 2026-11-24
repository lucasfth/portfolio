import { createHash } from "node:crypto";

/**
 * MCP Server Card (SEP-2127, modelcontextprotocol/ext-server-card v1) for the public,
 * read-only MCP service at https://lucashanson.dk/mcp.
 */
const SERVER_CARD = {
  $schema: "https://static.modelcontextprotocol.io/schemas/v1/server-card.schema.json",
  name: "dk.lucashanson/public-portfolio",
  title: "Lucas Hanson public portfolio",
  description: "Read-only access to public portfolio pages: list pages and read them as Markdown.",
  version: "1.0.0",
  websiteUrl: "https://lucashanson.dk/developers",
  remotes: [
    {
      type: "streamable-http",
      url: "https://lucashanson.dk/mcp",
      supportedProtocolVersions: ["2025-06-18"],
    },
  ],
};

const BODY = JSON.stringify(SERVER_CARD, null, 2);
const TAG = createHash("sha1").update(BODY).digest("hex");
const ETAG = `"${TAG}"`;

function etagMatches(ifNoneMatch: string | null): boolean {
  if (!ifNoneMatch || ifNoneMatch === "*") return ifNoneMatch === "*";
  return ifNoneMatch.split(",").some((p) => {
    const part = p.trim();
    return part === ETAG || part === `W/${TAG}` || part === `"${TAG}"`;
  });
}

export function GET(request: Request) {
  // The Septet caching contract: honour If-None-Match with an empty 304.
  if (etagMatches(request.headers.get("if-none-match"))) {
    return new Response(null, { status: 304, headers: { ETag: ETAG, "Access-Control-Allow-Origin": "*", "Access-Control-Expose-Headers": "ETag" } });
  }
  return new Response(BODY, {
    headers: {
      "Content-Type": "application/mcp-server-card+json; charset=utf-8",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Expose-Headers": "ETag",
      "Cache-Control": "public, max-age=3600",
      ETag: ETAG,
    },
  });
}