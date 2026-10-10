const document = {
  openapi: "3.1.1",
  info: {
    title: "Lucas Hanson public portfolio API",
    version: "1.0.0",
    description: "Public portfolio search, gallery preview, Markdown pages and the Damage Control game. Game leaderboard entries from sessions that fail the bot check require an x402 v2 payment.",
  },
  servers: [{ url: "https://lucashanson.dk" }],
  paths: {
    "/api/search": {
      get: {
        summary: "List searchable portfolio resources",
        responses: {
          "200": {
            description: "Search resources",
            content: { "application/json": { schema: { type: "array", items: { $ref: "#/components/schemas/SearchItem" } } } },
          },
          "405": { $ref: "#/components/responses/MethodNotAllowed" },
        },
      },
    },
    "/api/gallery-preview": {
      get: {
        summary: "List preview images for a gallery",
        parameters: [{ name: "id", in: "query", required: true, schema: { type: "string" }, description: "Public gallery ID." }],
        responses: {
          "200": {
            description: "Gallery preview images",
            content: { "application/json": { schema: { type: "array", items: { $ref: "#/components/schemas/GalleryPreviewImage" } } } },
          },
          "404": { $ref: "#/components/responses/GalleryNotFound" },
          "405": { $ref: "#/components/responses/MethodNotAllowed" },
        },
      },
    },
    "/api/markdown": {
      get: {
        summary: "Read a public portfolio page as Markdown",
        parameters: [{ name: "path", in: "query", schema: { type: "string", default: "/" }, description: "Local public page path." }],
        responses: {
          "200": { description: "Markdown page", content: { "text/markdown": { schema: { type: "string" } } } },
          "404": { description: "Markdown explanation of a missing public page", content: { "text/markdown": { schema: { type: "string" } } } },
          "405": { $ref: "#/components/responses/MethodNotAllowed" },
        },
      },
    },
    "/api/game/challenge": {
      get: {
        summary: "Current Damage Control rules",
        responses: { "200": { description: "Today's date, time bucket and 20 rules", content: { "application/json": { schema: { type: "object" } } } } },
      },
    },
    "/api/game/play": {
      post: {
        summary: "Start a run ({}) or clear the next rule ({ token, sentence })",
        requestBody: { content: { "application/json": { schema: { type: "object", properties: { token: { type: "string" }, sentence: { type: "string", maxLength: 500 } } } } } },
        responses: {
          "200": { description: "New run token and progress", content: { "application/json": { schema: { type: "object" } } } },
          "422": { description: "Sentence failed one or more rules, or contains words that are not English (misspelled_words)", content: { "application/json": { schema: { type: "object" } } } },
          "429": { description: "Cleared rules faster than one per second", content: { "application/json": { schema: { type: "object" } } } },
        },
      },
    },
    "/api/game/leaderboard": {
      get: {
        summary: "Daily top 50",
        parameters: [{ name: "date", in: "query", schema: { type: "string", format: "date" } }],
        responses: { "200": { description: "Ranked scores", content: { "application/json": { schema: { type: "object" } } } } },
      },
    },
    "/api/game/scores": {
      post: {
        summary: "Submit a finished run to the leaderboard (agents pay via x402)",
        requestBody: { content: { "application/json": { schema: { type: "object", required: ["token", "nickname", "sentence"], properties: { token: { type: "string" }, nickname: { type: "string", maxLength: 24 }, sentence: { type: "string", maxLength: 500 } } } } } },
        responses: {
          "200": { description: "Saved score and rank", content: { "application/json": { schema: { type: "object" } } } },
          "402": { description: "x402 v2 payment required; terms in the PAYMENT-REQUIRED header. Donations: https://lucashanson.dk/bitcoin", content: { "application/json": { schema: { type: "object" } } } },
          "409": { description: "Run already submitted", content: { "application/json": { schema: { type: "object" } } } },
        },
      },
    },
  },
  components: {
    schemas: {
      SearchItem: {
        type: "object", required: ["title", "href"], additionalProperties: false,
        properties: {
          title: { type: "string" }, href: { type: "string" }, description: { type: "string" },
          external: { type: "boolean" }, searchText: { type: "string" },
        },
      },
      GalleryPreviewImage: {
        type: "object", required: ["src", "alt", "imageClassName"], additionalProperties: false,
        properties: { src: { type: "string" }, alt: { type: "string" }, imageClassName: { type: "string" } },
      },
      ApiError: {
        type: "object", required: ["error"], additionalProperties: false,
        properties: { error: { type: "object", required: ["code", "message"], additionalProperties: false, properties: { code: { type: "string" }, message: { type: "string" } } } },
      },
    },
    responses: {
      MethodNotAllowed: { description: "Method not allowed", headers: { Allow: { schema: { type: "string" } } }, content: { "application/json": { schema: { $ref: "#/components/schemas/ApiError" } } } },
      GalleryNotFound: { description: "Gallery not found", content: { "application/json": { schema: { $ref: "#/components/schemas/ApiError" } } } },
    },
  },
};

export function GET() {
  return Response.json(document, { headers: { "Cache-Control": "public, max-age=3600" } });
}
