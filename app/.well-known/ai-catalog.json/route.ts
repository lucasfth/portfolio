const AI_CATALOG = {
  specVersion: "1.0",
  entries: [
    {
      identifier: "urn:air:lucashanson.dk:mcp:public-portfolio",
      displayName: "Lucas Hanson public portfolio (MCP)",
      description: "Read-only MCP access to public portfolio pages: list pages and read them as Markdown. No authentication is required.",
      type: "application/mcp-server-card+json",
      url: "https://lucashanson.dk/mcp/server-card",
      representativeQueries: [
        "List the public pages on Lucas Hanson's portfolio",
        "Read a Lucas Hanson blog post as Markdown",
        "What software projects does Lucas Hanson have?",
      ],
    },
  ],
};

export function GET() {
  return new Response(JSON.stringify(AI_CATALOG, null, 2), {
    headers: {
      "Content-Type": "application/ai-catalog+json; charset=utf-8",
      "Access-Control-Allow-Origin": "*",
      "Cache-Control": "public, max-age=3600",
    },
  });
}