/**
 * API catalog served with the RFC 9727 Linkset profile.
 * See https://www.rfc-editor.org/rfc/rfc9727#appendix-A (and RFC 8631 relations).
 */
const API_CATALOG = {
  linkset: [
    {
      anchor: "https://lucashanson.dk/.well-known/api-catalog",
      item: [
        {
          href: "https://lucashanson.dk/openapi.json",
          type: "application/openapi+json;v=3",
          title: "Public portfolio API — OpenAPI 3.1 specification",
        },
        {
          href: "https://lucashanson.dk/developers",
          type: "text/html",
          title: "Developer and agent guide (human-readable service description)",
        },
      ],
      "service-desc": [
        {
          href: "https://lucashanson.dk/openapi.json",
          type: "application/openapi+json;v=3",
        },
      ],
      "service-doc": [
        {
          href: "https://lucashanson.dk/developers",
          type: "text/html",
        },
      ],
    },
  ],
};

export function GET() {
  const headers: Record<string, string> = {
    "Content-Type": 'application/linkset+json; profile="https://www.rfc-editor.org/info/rfc9727"',
    "Access-Control-Allow-Origin": "*",
    "Cache-Control": "public, max-age=3600",
    // RFC 9727 section 2: the response advertises the api-catalog relation.
    "Link": '</.well-known/api-catalog>; rel="api-catalog"',
  };
  return new Response(JSON.stringify(API_CATALOG, null, 2), { headers });
}

/** RFC 9727 also requires HEAD on the well-known URI, with the Link header. */
export function HEAD() {
  const headers: Record<string, string> = {
    "Content-Type": 'application/linkset+json; profile="https://www.rfc-editor.org/info/rfc9727"',
    "Access-Control-Allow-Origin": "*",
    "Cache-Control": "public, max-age=3600",
    "Link": '</.well-known/api-catalog>; rel="api-catalog"',
  };
  return new Response(null, { status: 200, headers });
}