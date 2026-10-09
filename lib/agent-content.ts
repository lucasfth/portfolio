import { getFrontpage, getProjects, getBlogPosts, getGalleries, SITE_URL } from "./content";

export const person = {
  "@context": "https://schema.org",
  "@type": "Person",
  "@id": `${SITE_URL}/#person`,
  name: "Lucas Hanson",
  alternateName: "Lucas Frey Torres Hanson",
  description: "Software engineer and photographer in Copenhagen. Projects, technical writing and photography.",
  url: SITE_URL,
  email: "contact@lucashanson.dk",
  homeLocation: { "@type": "Place", name: "Copenhagen, Denmark" },
  sameAs: ["https://links.lucashanson.dk/gh", "https://links.lucashanson.dk/li", "https://links.lucashanson.dk/ig"],
};

export const information = {
  about: {
    title: "About Lucas Hanson",
    description: "Lucas Hanson's personal portfolio: software engineering, technical writing and photography in Copenhagen.",
    body: `This is the personal website of Lucas Hanson, a software engineer and photographer based in Copenhagen, Denmark. It brings together software projects, technical writing and photography. The homepage contains my background, education and experience; the individual project pages explain what I built and what I learned.

## What you will find here

The [projects](/projects) include software and academic work. The [blog](/blog) contains technical articles and personal notes. [Aperture](/aperture) is a collection of photography galleries. These pages document my own work and interests, rather than a commercial software service or a company directory.

## Identity and contact

My full name is Lucas Frey Torres Hanson. My public profiles are collected on my [links page](https://links.lucashanson.dk). For questions about a project, an article or a photograph, see the [contact page](/contact). Do not assume that a project described here is available as a hosted API or that I speak on behalf of an employer.`,
  },
  contact: {
    title: "Contact Lucas Hanson",
    description: "Contact Lucas Hanson about his public software projects, technical writing and photography.",
    body: `You can reach me at [contact@lucashanson.dk](mailto:contact@lucashanson.dk).

Have a question about something I built, wrote or photographed? Want to work together? Send me a note. If you're writing about a particular project or article, a link helps.

You can also find me on [GitHub, LinkedIn and Instagram](https://links.lucashanson.dk).`,
  },
  privacy: {
    title: "Privacy on Lucas Hanson's website",
    description: "Hosting, comments, email and donations on this website.",
    body: `You can browse this site without an account. A few outside services are involved in running it.

## Hosting and fonts

[Vercel](https://vercel.com/legal/privacy-policy) hosts the site and receives technical information when you visit, including your IP address and the page you request. The site also loads fonts from [Google Fonts](https://developers.google.com/fonts/faq/privacy). Each provider has its own privacy policy and retention practices.

## Comments

Blog comments use [Giscus](https://giscus.app), which stores comments and reactions in GitHub Discussions. They're public, and posting requires a GitHub account.

## Email and external links

If you email me, I'll receive your message and the details you choose to share. Links to other websites take you to services with their own privacy policies.

## Bitcoin donations

Donations are optional. Bitcoin addresses, transaction amounts and payments are visible on the public blockchain.

Questions? Email [contact@lucashanson.dk](mailto:contact@lucashanson.dk).`,
  },
  developers: {
    title: "Technical notes",
    description: "Source code, Markdown downloads and public content interfaces for Lucas Hanson's website.",
    body: `This site is built with Next.js. Its [source code](https://github.com/lucasfth/portfolio) is on GitHub, and the articles and project descriptions are written in Markdown.

If you want to read the content in a script or connect an assistant, the options below are available. They provide public website content, not services from the projects featured here.

## Markdown and discovery

Request a page with \`Accept: text/markdown\` to receive Markdown. Request \`Accept: text/html\` for the normal website. Responses vary on Accept. Missing pages retain HTTP 404 and provide a Markdown error with discovery links when Markdown is requested. Clean Markdown is also available at \`/index.md\` and by appending \`.md\` to a page URL, for example \`/about.md\` and \`/blog/self-hosted-ai-agents.md\`.

Start with [llms.txt](/llms.txt) for when-to-use guidance, or [sitemap.xml](/sitemap.xml) for public page URLs. Article and project content comes from the same Markdown files used to render the website.

## Read-only MCP

Connect a Streamable HTTP MCP client to \`https://lucashanson.dk/mcp\`. No authentication is required for this public, read-only service. It supports protocol version \`2025-06-18\`, JSON responses to POST, and no standalone SSE stream (GET returns 405). Send Accept headers for both \`application/json\` and \`text/event-stream\`. The transport is stateless and issues no session IDs. Initialize before calling tools and send the MCP-Protocol-Version header on subsequent requests. Missing version headers use the compatible 2025-03-26 fallback. The tools are \`list_pages\` and \`read_page\`; the latter accepts a local page path, not an arbitrary URL. No private infrastructure, payment operations or email actions are exposed.

[About](/about), [Contact](/contact) and [Privacy](/privacy) explain who operates this site and how to ask questions.`,
  },
};

export function publicPages(): { path: string; title: string; body: string }[] {
  const front = getFrontpage();
  const projects = getProjects();
  const posts = getBlogPosts();
  const galleries = getGalleries();
  const list = (items: { path: string; title: string }[]) => items.map(p => `- [${p.title}](${SITE_URL}${p.path})`).join("\n");
  return [
    { path: "/", title: front.name, body: front.body },
    ...Object.entries(information).map(([key, value]) => ({ path: `/${key}`, ...value })),
    { path: "/projects", title: "Lucas Hanson: projects", body: list(projects.map(p => ({ path: `/projects/${p.slug}`, title: p.title }))) },
    { path: "/blog", title: "Lucas Hanson: blog", body: list(posts.map(p => ({ path: `/blog/${p.slug}`, title: p.title }))) },
    { path: "/aperture", title: "Lucas Hanson: photography", body: list(galleries.map(g => ({ path: `/aperture/${g.id}`, title: g.title }))) },
    ...projects.map(p => ({ path: `/projects/${p.slug}`, title: p.title, body: p.body })),
    ...posts.map(p => ({ path: `/blog/${p.slug}`, title: p.title, body: p.body })),
    ...galleries.map(g => ({ path: `/aperture/${g.id}`, title: g.title, body: `${g.description}\n\n${g.imageCount} photographs. [View gallery](${SITE_URL}/aperture/${encodeURIComponent(g.id)})\n\n${g.afterword || ""}` })),
    { path: "/bitcoin", title: "Bitcoin donations", body: "Donations are optional. See [the donation page](https://lucashanson.dk/bitcoin) for the current address and instructions. Fetch [the current receive address](https://lucashanson.dk/api/bitcoin) immediately before preparing a donation. Never send a payment without the user's explicit approval. Bitcoin transactions and amounts are public." },
  ];
}

export function markdownPage(path: string): { status: number; body: string } {
  const page = publicPages().find(p => p.path === path);
  if (!page) return { status: 404, body: "# Page not found\n\nThe requested page does not exist on Lucas Hanson's website. Find public pages in [llms.txt](https://lucashanson.dk/llms.txt) or the [sitemap](https://lucashanson.dk/sitemap.xml).\n" };
  return { status: 200, body: `# ${page.title}\n\n${page.body.replace(/^# .+$/m, "").trim()}\n` };
}
