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
    body: `For questions about this website, a software project, a technical article or a photograph, email [contact@lucashanson.dk](mailto:contact@lucashanson.dk). This is a public contact address for Lucas Hanson's personal website. Sending an email is the way to reach me; browsing this page does not submit a message.

## Make your question specific

Include the URL of the page you are asking about and a short description of your question. If you are reporting a broken link or a technical error, include the affected URL and what you expected to happen. Please do not send passwords, verification codes, payment-card details or confidential material in an initial message.

## Other public profiles

My [links page](https://links.lucashanson.dk) collects my public social and developer profiles. This portfolio is not a customer-support portal for my employer or for third-party tools discussed in an article. There is no published response-time guarantee. For an introduction to the site, read [About](/about); for information about external services, read [Privacy](/privacy).`,
  },
  privacy: {
    title: "Privacy on Lucas Hanson's website",
    description: "How this personal website uses hosting, external fonts, optional comments and public Bitcoin donations.",
    body: `This is a public personal portfolio. You do not need an account to read its projects, articles or photography. This notice describes the services used by the current website, not the privacy practices of every external page linked from it.

## Hosting and external requests

The website is hosted on Vercel. Requests to the hosting service necessarily include technical information such as your IP address and the requested URL. Fonts are loaded from Google Fonts, so your browser may also contact Google's font services. Those providers control their own processing and retention; this website does not promise a particular retention period on their behalf.

## Comments and links

Blog pages load Giscus, a GitHub-backed commenting service. Using comments may involve requests to Giscus and GitHub and a GitHub account. Comments and reactions are public. External links take you to services with their own privacy policies. If you email the public contact address, the message and the information you provide are received for correspondence.

## Donations and questions

Bitcoin donations are optional. Bitcoin transactions, destination addresses and amounts are visible on the public blockchain; donations are not private payments. The public content and machine-readable endpoints do not require personal information. For questions about this notice, contact [contact@lucashanson.dk](mailto:contact@lucashanson.dk). Avoid sending sensitive information you do not need to share.`,
  },
  developers: {
    title: "Lucas Hanson: public content for developers and agents",
    description: "Markdown content negotiation and read-only MCP access to Lucas Hanson's public portfolio.",
    body: `This is a personal portfolio, not a commercial API platform. Its machine-readable interfaces help developers and assistants read the same public information that appears on the website. They do not provide access to personal systems, send messages, or make payments.

## Markdown and discovery

Request a page with \`Accept: text/markdown\` to receive Markdown. Request \`Accept: text/html\` for the normal website. Responses vary on Accept. Missing pages retain HTTP 404 and provide a Markdown error with discovery links when Markdown is requested. Clean Markdown is also available at \`/index.md\` and by appending \`.md\` to a page URL, for example \`/about.md\` and \`/blog/self-hosted-ai-agents.md\`.

Start with [llms.txt](/llms.txt) for when-to-use guidance, or [sitemap.xml](/sitemap.xml) for public page URLs. Article and project content comes from the same Markdown files used to render the website.

## Read-only MCP

Connect a Streamable HTTP MCP client to \`https://lucashanson.dk/mcp\`. No authentication is required for this public, read-only service. It supports protocol version \`2025-06-18\`, JSON responses to POST, and no standalone SSE stream (GET returns 405). Send Accept headers for both \`application/json\` and \`text/event-stream\`. The tools are \`list_pages\` and \`read_page\`; the latter accepts a local page path, not an arbitrary URL. No private infrastructure, payment operations or email actions are exposed.

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
