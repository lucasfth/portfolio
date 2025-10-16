const fs = require("fs");
const path = require("path");

const generateRSS = () => {
  const blogPosts = [
    {
      title: "Downsizing Images",
      description: "Downsizing images to prevent unauthorized use.",
      link: "https://lucashanson.dk/blog/downsize-images",
      pubDate: new Date("2025-03-9").toUTCString(),
      guid: "https://lucashanson.dk/blog/downsize-images",
    },
    {
      title: "My First Blog Post",
      description: "A brief introduction.",
      link: "https://lucashanson.dk/blog/first-post",
      pubDate: new Date("2025-02-26").toUTCString(),
      guid: "https://lucashanson.dk/blog/first-post",
    },
  ];

  const rssContent = `<?xml version="1.0" encoding="UTF-8"?>
    <rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
      <channel>
        <title>Lucas Hanson's Blog</title>
        <description>Software development, photography, and personal insights</description>
        <link>https://lucashanson.dk/blog</link>
        <atom:link href="https://lucashanson.dk/rss.xml" rel="self" type="application/rss+xml"/>
        <language>en-us</language>
        <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
        <pubDate>${new Date().toUTCString()}</pubDate>
        <managingEditor>contact@lucashanson.dk (Lucas Hanson)</managingEditor>
        <webMaster>contact@lucashanson.dk (Lucas Hanson)</webMaster>
        
        ${blogPosts
          .map(
            (post) => `
        <item>
          <title>${post.title}</title>
          <description>${post.description}</description>
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
  console.log("RSS feed generated successfully!");
};

generateRSS();
