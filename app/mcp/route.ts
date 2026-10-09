import { publicPages, markdownPage } from "@/lib/agent-content";

function isObject(value: unknown): value is Record<string, unknown> { return !!value && typeof value === "object" && !Array.isArray(value); }
const VERSION = "2025-06-18";
// Stateless transport: absent version headers use the specification's legacy fallback.
const LEGACY_VERSION = "2025-03-26";
const JSON_HEADERS = { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" };

function error(code: number, message: string, status = 200, id: string | number | null = null, headers?: HeadersInit) {
  return Response.json({ jsonrpc: "2.0", id, error: { code, message } }, { status, headers: { ...JSON_HEADERS, ...headers } });
}

function validate(request: Request): Response | undefined {
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin) return error(-32000, "Origin not allowed", 403);
  const version = request.headers.get("mcp-protocol-version");
  if (version && version !== VERSION && version !== LEGACY_VERSION) return error(-32600, "Unsupported protocol version", 400);
}

export function GET(request: Request) {
  return validate(request) || error(-32600, "This endpoint only supports POST.", 405, null, { Allow: "POST" });
}

export async function POST(request: Request) {
  const invalid = validate(request);
  if (invalid) return invalid;
  const accept = (request.headers.get("accept") || "").toLowerCase();
  const accepts = (type: string) => accept.split(",").some(range => {
    const [media, ...params] = range.trim().split(";");
    const quality = params.find(p => p.trim().startsWith("q="));
    const q = quality ? Number(quality.trim().slice(2)) : 1;
    return media.trim() === type && q > 0 && q <= 1;
  });
  if (!accepts("application/json") || !accepts("text/event-stream")) return error(-32600, "Accept must include application/json and text/event-stream", 406);
  if ((request.headers.get("content-type") || "").split(";")[0].trim().toLowerCase() !== "application/json") return error(-32600, "Use application/json", 415);

  let message: any;
  try {
    const text = await request.text();
    if (text.length > 16384) return error(-32600, "Request too large", 413);
    message = JSON.parse(text);
  } catch { return error(-32700, "Parse error", 400); }
  if (!message || Array.isArray(message) || message.jsonrpc !== "2.0" || typeof message.method !== "string" || (message.id !== undefined && typeof message.id !== "string" && typeof message.id !== "number")) return error(-32600, "Invalid request", 400);
  if (message.id === undefined) return new Response(null, { status: 202 });

  let result: unknown;
  switch (message.method) {
    case "initialize":
      if (!isObject(message.params) || typeof message.params.protocolVersion !== "string" || !isObject(message.params.clientInfo) || typeof message.params.clientInfo.name !== "string" || typeof message.params.clientInfo.version !== "string" || !isObject(message.params.capabilities)) return error(-32602, "Invalid initialization parameters", 200, message.id);
      result = { protocolVersion: VERSION, capabilities: { tools: {} }, serverInfo: { name: "lucas-hanson-public-portfolio", version: "1.0.0" } }; break;
    case "ping": result = {}; break;
    case "tools/list": result = { tools: [
      { name: "list_pages", description: "List public portfolio pages. Use to discover Lucas Hanson's projects, writing and photography.", inputSchema: { type: "object", properties: {}, additionalProperties: false }, annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: false } },
      { name: "read_page", description: "Read a public portfolio page as Markdown using its local path.", inputSchema: { type: "object", properties: { path: { type: "string" } }, required: ["path"], additionalProperties: false }, annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: false } },
    ] }; break;
    case "tools/call": {
      const { name, arguments: args = {} } = message.params || {};
      if (!args || typeof args !== "object" || Array.isArray(args)) return error(-32602, "Invalid tool arguments", 200, message.id);
      if (name === "list_pages") {
        if (Object.keys(args).length) return error(-32602, "list_pages takes no arguments", 200, message.id);
        result = { content: [{ type: "text", text: JSON.stringify(publicPages().map(({ path, title }) => ({ path, title }))) }] };
      } else if (name === "read_page") {
        if (typeof args.path !== "string" || args.path.length > 300 || !args.path.startsWith("/") || args.path.startsWith("//") || Object.keys(args).some(k => k !== "path")) return error(-32602, "Provide a local public page path", 200, message.id);
        const page = markdownPage(args.path);
        result = { content: [{ type: "text", text: page.body }], isError: page.status !== 200 };
      } else return error(-32602, "Unknown tool", 200, message.id);
      break;
    }
    default: return error(-32601, "Method not found", 200, message.id);
  }
  return Response.json({ jsonrpc: "2.0", id: message.id, result }, { headers: JSON_HEADERS });
}
