<div align="center">

# Lucas Hanson — Portfolio

A content-driven portfolio for projects, writing, photography, and public developer resources.

[![Website](https://img.shields.io/badge/site-lucashanson.dk-111111?style=flat-square)](https://lucashanson.dk)
[![Next.js](https://img.shields.io/badge/Next.js-16-000000?style=flat-square&logo=next.js)](https://nextjs.org/)
[![License](https://img.shields.io/badge/license-Apache--2.0-7C3AED?style=flat-square)](./LICENSE)

[Visit the site](https://lucashanson.dk) · [Projects](https://lucashanson.dk/projects) · [Writing](https://lucashanson.dk/blog) · [Photography](https://lucashanson.dk/aperture) · [API](#public-api) · [Contributing](#using-this-project)

</div>

## About

This is the source for [lucashanson.dk](https://lucashanson.dk). Pages are primarily authored as Markdown, making it straightforward to extend the portfolio with writing, projects, and galleries without building a separate CMS.

## Stack

- **Framework:** Next.js 16 (App Router)
- **Language:** TypeScript
- **UI:** React 19, CSS, Tailwind CSS
- **Content:** Markdown files
- **Runtime and package manager:** Node.js and npm
- **Deployment:** Vercel

## Local development

Requires a current Node.js release. Node.js 22.18 or newer is required for the Bitcoin regression tests.

```bash
npm install
npm run dev
```

The development server runs at [http://localhost:3000](http://localhost:3000).

```bash
npm run build
npm start
```

Useful checks:

```bash
npm run test:sitemap
npm run test:bitcoin
npm run test:search
```

Deploy by connecting the repository to Vercel; its production build command is `npm run build`.

## Content and sitemap

Next.js generates `/sitemap.xml` during a production build. Static public pages are discovered from `app/**/page.{ts,tsx,js,jsx}` rather than a maintained URL list, so new pages such as `/bitcoin` are included automatically. Route groups do not become URL segments; API handlers, dynamic templates, private folders, parallel slots, and intercepted routes are excluded.

Blog posts, projects, and photography galleries are expanded from their content collections. `public/robots.txt` advertises the sitemap. Rebuild and deploy after adding a page or changing content.

## Public API

The site exposes read-only resources for discovery and reuse:

| Resource | Purpose |
| --- | --- |
| [`/openapi.json`](https://lucashanson.dk/openapi.json) | OpenAPI 3.1 description of the public search, gallery-preview, and Markdown endpoints. |
| [`/.well-known/api-catalog`](https://lucashanson.dk/.well-known/api-catalog) | API catalog that points clients to the OpenAPI document. |
| [`/mcp`](https://lucashanson.dk/mcp) | Public, read-only MCP endpoint for listing and reading portfolio pages. |
| [`cli/`](./cli/README.md) | Node CLI for listing public pages and reading a page as Markdown. |

The CLI requires Node 20+ and makes no authenticated or write requests:

```bash
node cli/index.mjs list
node cli/index.mjs read /about
node cli/index.mjs read /blog/self-hosted-ai-agents
```

See [`cli/README.md`](./cli/README.md) for options and behavior.

## Damage Control game

[`/game`](https://lucashanson.dk/game) is a solo sentence game with 20 rules. Rules 1 to 4 follow the UTC clock; rules 5 to 8 use an anchor word that rotates daily. The server times every run and checks every rule on its own clock, using a signed run token (`/api/game/play`). Clients never report their own progress or time. Each run can enter the leaderboard once.

Agents can play over JSON; see [`/game.md`](https://lucashanson.dk/game.md). Playing is free. A leaderboard entry is free only when [Vercel BotID](https://vercel.com/docs/botid) classifies the browser session as human. Everything else, including verified AI agents, gets HTTP 402 with x402 v2 payment terms and a link to [`/bitcoin`](https://lucashanson.dk/bitcoin). BotID runs an invisible challenge in the page and is verified on the server, so forged headers no longer pass. It is not bulletproof: an agent driving a real browser that passes BotID still enters free. Enable **BotID Deep Analysis** under Firewall, Rules in the Vercel project for the stronger behavioural check (Pro plan, $1 per 1,000 checks). Off Vercel, only the Fetch Metadata check runs.

Server-side environment variables (never `NEXT_PUBLIC_`):

- `GAME_RUN_SECRET`: at least 32 random characters. Signs run tokens. Without it the game API returns 503.
- `CONVEX_DEPLOY_KEY`: the production deploy key of the `damage-control` Convex project, separate from CampusCup. Production builds (`npm run build`) deploy the Convex functions with it, and the build passes the deployment URL on to the server. Reads use a public query; only writes use the key. `PORTFOLIO_CONVEX_URL` and `PORTFOLIO_CONVEX_ADMIN_KEY` override it if set.
- `X402_PAY_TO`: a Base address that receives USDC. It enables paid agent entries; without it they are closed and the 402 lists no payment options. x402 does not settle on-chain Bitcoin, so `BITCOIN_ZPUB` cannot be reused here. Optional: `X402_FACILITATOR_URL` (default PayAI, `https://facilitator.payai.network`, no API key), `X402_NETWORK` (default `eip155:8453`), `X402_ASSET` (default Base USDC), `X402_AMOUNT` (default `100000`, 0.10 USDC), `X402_FACILITATOR_AUTH`.

`npm run test:game` runs the rule engine, run token, x402 and leaderboard tests.

## Bitcoin donations

[`/bitcoin`](https://lucashanson.dk/bitcoin) displays a QR code, selectable address, copy button, and wallet link. It fetches one address per visit, keeping the QR code and BIP21 URI (`bitcoin:{address}` with no requested amount) tied to that value. If an address cannot be obtained, the page shows an unavailable message and retry action; it never presents a fallback address.

`GET /api/bitcoin` returns one Bitcoin mainnet native-SegWit (`bc1q…`) receive address as plain text followed by a newline. It is a dynamic Node.js route: neither its response nor blockchain-history lookups are cached.

### Configuration and security

- Set **`BITCOIN_ZPUB`** as a server-only Vercel Secret for every environment where donations are enabled. For local development, use an uncommitted `.env.local`; configuration changes apply after a new deployment.
- Use an **account-level BIP84 `zpub`**, normally exported at `m/84'/0'/account'`. The service derives the external receive chain at `0/index` relative to that account. Master keys and receive-chain-only exports are rejected.
- Use a dedicated donation wallet or account, verify its export against receive addresses, and retain its recovery information.
- Never configure a seed phrase, `zprv`, or any private key. Do not use `NEXT_PUBLIC_` for the `zpub`, and never commit it.

### Rotation and privacy

For each request, the server scans receive addresses from index zero using [Blockstream's public address-history API](https://github.com/Blockstream/esplora/blob/master/API.md#addresses) and returns the first address with no confirmed received outputs. After a payment receives a confirmation, the next request moves past that address. Pending payments do not cause rotation, spending does not make a paid address eligible again, and previously issued addresses remain valid. Visitors may receive the same address.

No cron job or database is required. The complete scan has a ten-second deadline; missing or invalid configuration, explorer failures, invalid responses, and timeouts return HTTP `503` with a generic message rather than an unchecked address.

The explorer receives derived addresses, never the `zpub`. It can still associate queried addresses, and observers of `/api/bitcoin` can collect successive donation addresses. Bitcoin amounts and transactions are public; combining funds later can link them. A leaked `zpub` exposes the account's addresses and history but cannot spend funds.

`/llms.txt` describes the site and links to optional donation instructions, the donation page, and the raw endpoint—not a hardcoded address.

## Using this project

This project is available under the [Apache License 2.0](./LICENSE).

```bash
git clone https://github.com/lucasfth/portfolio.git
cd portfolio
npm install
npm run dev
```

Before deploying a fork, replace the hardcoded domain references, including those in `package.json`, `CNAME`, and `scripts/generateRSS.js`. Review the repository for any additional site-specific URLs.
