/** Prefer Markdown only when explicitly requested and not outranked by HTML. */
export function wantsMarkdown(accept: string): boolean {
  const types = accept.toLowerCase().split(",").map(value => {
    const [type, ...params] = value.trim().split(";");
    const quality = params.find(p => p.trim().startsWith("q="));
    const q = quality ? Number(quality.trim().slice(2)) : 1;
    return { type: type.trim(), q: Number.isFinite(q) && q >= 0 && q <= 1 ? q : 0 };
  });
  const markdown = Math.max(0, ...types.filter(t => t.type === "text/markdown").map(t => t.q));
  const html = Math.max(0, ...types.filter(t => t.type === "text/html").map(t => t.q));
  return markdown > 0 && markdown >= html;
}
