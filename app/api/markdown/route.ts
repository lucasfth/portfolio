import { markdownPage } from "@/lib/agent-content";

export function GET(request: Request) {
  const { body, status } = markdownPage(new URL(request.url).searchParams.get("path") || "/");
  return new Response(body, { status, headers: {
    "Content-Type": "text/markdown; charset=utf-8", "Vary": "Accept",
    "Cache-Control": "no-store", "Link": '</llms.txt>; rel="describedby"',
    "X-Content-Type-Options": "nosniff",
  } });
}
