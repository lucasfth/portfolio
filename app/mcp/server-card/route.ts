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
const ETAG = `"${createHash("sha1").update(BODY).digest("hex")}"`;

export function GET() {
  return new Response(BODY, {
    headers: {
      "Content-Type": "application/mcp-server-card+json; charset=utf-8",
      "Access-Control-Allow-Origin": "*",
      "Cache-Control": "public, max-age=3600",
      ETag: ETAG,
    },
  });
}