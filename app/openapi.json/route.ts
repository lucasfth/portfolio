const document = {
  openapi: "3.1.1",
  info: {
    title: "Lucas Hanson public portfolio API",
    version: "1.0.0",
    description: "Read-only public portfolio search, gallery preview, and Markdown page resources.",
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
