import { publicPages, markdownPage } from "@/lib/agent-content";

const VERSION = "2025-06-18";
// Stateless transport: absent version headers use the specification's legacy fallback.
const LEGACY_VERSION = "2025-03-26";
function validate(request: Request): Response | undefined {
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin) return new Response("Origin not allowed", { status: 403 });
  const version = request.headers.get("mcp-protocol-version");
  if (version && version !== VERSION && version !== LEGACY_VERSION) return new Response("Unsupported protocol version", { status: 400 });
}
export function GET(request: Request) {
  return validate(request) || new Response(null, { status: 405, headers: { Allow: "POST" } });
}
export async function POST(request: Request) {
  const invalid = validate(request);
  if (invalid) return invalid;
  const accept = request.headers.get("accept") || "";
  if (!accept.includes("application/json") || !accept.includes("text/event-stream")) return new Response("Accept must include application/json and text/event-stream", { status: 406 });
  if (!(request.headers.get("content-type") || "").startsWith("application/json")) return new Response("Use application/json", { status: 415 });
  let message: any;
  const error = (code: number, text: string, status = 200) => Response.json({ jsonrpc: "2.0", id: message?.id ?? null, error: { code, message: text } }, { status });
  try {
    const text = await request.text();
    if (text.length > 16384) return new Response("Request too large", { status: 413 });
    message = JSON.parse(text);
  } catch { return error(-32700, "Parse error", 400); }
  if (!message || Array.isArray(message) || message.jsonrpc !== "2.0" || typeof message.method !== "string" || (message.id !== undefined && typeof message.id !== "string" && typeof message.id !== "number")) return error(-32600, "Invalid request", 400);
  if (message.id === undefined) return new Response(null, { status: 202 });
  let result: unknown;
  switch (message.method) {
    case "initialize":
      if (!message.params || typeof message.params.protocolVersion !== "string" || !message.params.clientInfo || !message.params.capabilities) return error(-32602, "Invalid initialization parameters");
      result = { protocolVersion: VERSION, capabilities: { tools: {} }, serverInfo: { name: "lucas-hanson-public-portfolio", version: "1.0.0" } }; break;
    case "ping": result = {}; break;
    case "tools/list": result = { tools: [
      { name: "list_pages", description: "List public portfolio pages. Use to discover Lucas Hanson's projects, writing and photography.", inputSchema: { type: "object", properties: {}, additionalProperties: false }, annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: false } },
      { name: "read_page", description: "Read a public portfolio page as Markdown using its local path.", inputSchema: { type: "object", properties: { path: { type: "string" } }, required: ["path"], additionalProperties: false }, annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: false } },
    ] }; break;
    case "tools/call": {
      const { name, arguments: args = {} } = message.params || {};
      if (!args || typeof args !== "object" || Array.isArray(args)) return error(-32602, "Invalid tool arguments");
      if (name === "list_pages") {
        if (Object.keys(args).length) return error(-32602, "list_pages takes no arguments");
        result = { content: [{ type: "text", text: JSON.stringify(publicPages().map(({ path, title }) => ({ path, title }))) }] };
      } else if (name === "read_page") {
        if (typeof args.path !== "string" || args.path.length > 300 || !args.path.startsWith("/") || args.path.startsWith("//") || Object.keys(args).some(k => k !== "path")) return error(-32602, "Provide a local public page path");
        const page = markdownPage(args.path);
        result = { content: [{ type: "text", text: page.body }], isError: page.status !== 200 };
      } else return error(-32602, "Unknown tool");
      break;
    }
    default: return error(-32601, "Method not found");
  }
  return Response.json({ jsonrpc: "2.0", id: message.id, result }, { headers: { "Cache-Control": "no-store" } });
}
