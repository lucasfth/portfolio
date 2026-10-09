import { NextRequest, NextResponse } from "next/server";
import { markdownPage } from "./lib/agent-content";
import { wantsMarkdown } from "./lib/accept";

export function proxy(request: NextRequest) {
  const path = request.nextUrl.pathname;
  // Leave API responses, metadata and assets in their native formats.
  if (path.startsWith("/api/") || path === "/mcp" || path.startsWith("/_next/") || path.startsWith("/images/") || /\.(?!md$)[a-z0-9]+$/i.test(path)) return NextResponse.next();
  const isMarkdownFile = path.endsWith(".md");
  let response: NextResponse;
  if (isMarkdownFile || wantsMarkdown(request.headers.get("accept") || "")) {
    const page = markdownPage(path === "/index.md" ? "/" : path.replace(/\.md$/, "").replace(/\/$/, "") || "/");
    response = new NextResponse(page.body, { status: page.status, headers: { "Content-Type": "text/markdown; charset=utf-8", "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" } });
  } else if (/^\/(blog|projects|aperture)\//.test(path) && markdownPage(path).status === 404) {
    response = NextResponse.rewrite(new URL("/_not-found", request.url), { status: 404 });
  } else {
    response = NextResponse.next();
  }
  response.headers.set("Vary", "Accept");
  response.headers.set("Link", '</llms.txt>; rel="describedby"');
  return response;
}
