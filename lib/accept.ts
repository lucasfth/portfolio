/** Prefer explicitly requested Markdown when its effective quality matches or exceeds HTML. */
export function wantsMarkdown(accept: string): boolean {
  const ranges = accept.toLowerCase().split(",").map(value => {
    const [type, ...params] = value.trim().split(";");
    const quality = params.find(p => p.trim().startsWith("q="));
    const q = quality ? Number(quality.trim().slice(2)) : 1;
    return { type: type.trim(), q: Number.isFinite(q) && q >= 0 && q <= 1 ? q : 0 };
  });
  const effectiveQuality = (type: string) => {
    for (const range of [type, "text/*", "*/*"]) {
      const matches = ranges.filter(item => item.type === range);
      if (matches.length) return Math.max(...matches.map(item => item.q));
    }
    return 0;
  };
  const markdown = effectiveQuality("text/markdown");
  return ranges.some(item => item.type === "text/markdown") && markdown > 0 && markdown >= effectiveQuality("text/html");
}
