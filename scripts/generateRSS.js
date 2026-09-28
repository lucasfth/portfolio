const fs = require("fs");
const path = require("path");

const SITE_URL = "https://lucashanson.dk";
const CONTENT_DIR = path.join(__dirname, "..", "public", "content", "blog");

/**
 * Minimal YAML frontmatter reader (title, description, date, image).
 * Supports `key: value` pairs and quoted strings. Avoids a full dependency
 * so the build script stays dependency-free and fast.
 */
function parseFrontmatter(raw) {
  const result = { data: {}, content: raw };
  const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  if (!match) return result;
  const [, fm, body] = match;
  for (const line of fm.split(/\r?\n/)) {
    const m = line.match(/^([A-Za-z0-9_-]+):\s*(.*)$/);
    if (!m) continue;
    let val = m[2].trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    result.data[m[1]] = val;
  }
  result.content = body;
  return result;
}

function firstHeading(content) {
  const line = content.split(/\r?\n/).find((l) => l.trim().startsWith("#"));
  return line ? line.replace(/^#+\s*/, "").trim() : "Untitled";
}

function firstParagraph(content) {
  const line = content
    .split(/\r?\n/)
    .find(
      (l) =>
        l.trim() &&
        !l.startsWith("#") &&
        !l.startsWith("![") &&
        !l.startsWith("---")
    );
  return line ? line.trim() : "";
}

function xmlEscape(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

const generateRSS = () => {
  let blogPosts = [];

  if (fs.existsSync(CONTENT_DIR)) {
    const files = fs
      .readdirSync(CONTENT_DIR)
      .filter((f) => f.toLowerCase().endsWith(".md"))
      .sort();

    for (const file of files) {
      const slug = file.replace(/\.md$/i, "");
      const raw = fs.readFileSync(path.join(CONTENT_DIR, file), "utf8");
      const { data, content } = parseFrontmatter(raw);

      const title = data.title || firstHeading(content);
      const description =
        data.description || firstParagraph(content).slice(0, 160);
      const pubDate = data.date
        ? new Date(`${data.date}T00:00:00Z`).toUTCString()
        : new Date(0).toUTCString();

      blogPosts.push({
        title,
        description,
        link: `${SITE_URL}/blog/${slug}`,
        pubDate,
        guid: `${SITE_URL}/blog/${slug}`,
      });
    }
  }

  // Newest first.
  blogPosts.sort((a, b) => new Date(b.pubDate) - new Date(a.pubDate));

  const now = new Date().toUTCString();

  const rssContent = `<?xml version="1.0" encoding="UTF-8"?>
    <rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
      <channel>
        <title>Lucas Hanson's Blog</title>
        <description>Software development, photography, and personal insights</description>
        <link>${SITE_URL}/blog</link>
        <atom:link href="${SITE_URL}/rss.xml" rel="self" type="application/rss+xml"/>
        <language>en-us</language>
        <lastBuildDate>${now}</lastBuildDate>
        <pubDate>${now}</pubDate>
        <managingEditor>contact@lucashanson.dk (Lucas Hanson)</managingEditor>
        <webMaster>contact@lucashanson.dk (Lucas Hanson)</webMaster>

        ${blogPosts
          .map(
            (post) => `
        <item>
          <title>${xmlEscape(post.title)}</title>
          <description>${xmlEscape(post.description)}</description>
          <link>${post.link}</link>
          <guid isPermaLink="true">${post.guid}</guid>
          <pubDate>${post.pubDate}</pubDate>
        </item>`
          )
          .join("")}
      </channel>
    </rss>`;

  const outDir = path.join(__dirname, "..", "public");
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }

  fs.writeFileSync(path.join(outDir, "rss.xml"), rssContent);
  console.log(`RSS feed generated with ${blogPosts.length} post(s)!`);
};

generateRSS();
