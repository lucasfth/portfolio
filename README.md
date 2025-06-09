# Lucas Hanson Portfolio - Next.js with Bun

This project is a modern portfolio website built with Next.js and Bun, featuring static site generation (SSG) for optimal SEO and performance.

## 🚀 Recent Migrations

### From npm to Bun (Latest)
This portfolio now uses **Bun** as the package manager for:
- **Faster installations** - 10x faster than npm
- **Better performance** - Native speed and efficiency
- **Built-in bundler** - Optimized JavaScript bundling
- **TypeScript support** - Native TypeScript execution

### From React to Next.js
Previously migrated from Create React App to Next.js 15 with App Router to enable:
- **Static Site Generation (SSG)** - All pages are pre-rendered as static HTML
- **SEO Optimization** - Individual pages are crawlable by search engines
- **Performance** - Faster loading times with optimized builds
- **Better Developer Experience** - Type safety with TypeScript and modern tooling

## 🏗️ Architecture

The project uses Next.js App Router with file-based routing:
- `app/` - Next.js App Router pages and layouts
- `components/` - Reusable React components
- `public/` - Static assets (images, content files)
- `scripts/` - Build scripts (RSS generation)
- `types/` - TypeScript type definitions

## ✨ Features

- **Static Site Generation** - Pre-rendered HTML for all routes
- **SEO Optimized** - Meta tags, Open Graph, Twitter Cards
- **Photography Gallery** - Dynamic galleries with static generation
- **Blog System** - Markdown-based blog posts with syntax highlighting
- **Project Showcase** - Dynamic project pages
- **RSS Feed** - Automatically generated RSS feed
- **TypeScript** - Full type safety
- **Responsive Design** - Mobile-first approach

## 🛠️ Available Scripts

### Development

```bash
bun run dev
```

Starts the development server at [http://localhost:3000](http://localhost:3000)

### Build & Deploy

```bash
bun run build        # Build static site
bun run deploy       # Deploy to GitHub Pages
bun run deploy-test  # Test deployment without publishing
```

### Other Scripts

```bash
bun run generate-rss           # Generate RSS feed
bun run normalize-extensions  # Normalize image extensions
bun run lint                  # Run ESLint
```

## 🌐 Live Website

Visit the deployed version at [https://lucashanson.dk](https://lucashanson.dk)

## 📁 Content Management

The portfolio uses a markdown-based content system:

- **Blog posts**: Add markdown files to `public/content/blog/`
- **Projects**: Add markdown files to `public/content/projects/`
- **Gallery descriptions**: Add markdown files to `public/content/aperture/`
- **Images**: Add images to `public/images/`

To add new content:
1. Create the markdown file in the appropriate directory
2. Update the relevant page component to include the new route in `generateStaticParams()`
3. Rebuild the site

## 🎯 SEO Features

- **Meta tags** - Dynamic title, description, and keywords for each page
- **Open Graph** - Social media preview cards
- **Twitter Cards** - Twitter-specific metadata
- **RSS Feed** - Automatically generated blog RSS feed
- **Sitemap** - Static sitemap generation
- **Semantic HTML** - Proper heading structure and markup

## 🛠️ Want to use this project?

This project is open source and uses the Apache 2.0 license.
If you are unsure about what that entails, you can read the license [here](./LICENSE).

To get started:

1. Fork the repository
2. Clone the repository
3. `cd` into the repository
4. Run `bun install`
5. Run `bun run dev`

### Customization

When deploying to your own domain, update these files:
- `next.config.js` - Update `basePath` and `assetPrefix` if needed
- `package.json` - Update `homepage` field
- `CNAME` - Replace with your domain
- `app/layout.tsx` - Update site metadata

## 🔧 Tech Stack

- **Framework**: Next.js 15 with App Router
- **Package Manager**: Bun (high-performance npm alternative)
- **Language**: TypeScript
- **Styling**: CSS Modules
- **Content**: Markdown with syntax highlighting
- **Deployment**: GitHub Pages
- **Build**: Static Site Generation (SSG)
