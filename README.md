# Portfolio Website

This project is a modern portfolio website built with [Next.js](https://nextjs.org/) and powered by the [Bun](https://bun.sh/) runtime.

## Reasoning

My previous portfolio needed to add html for each new page I wanted (you can see the old version [here](https://github.com/lucasfth/lucas-hanson)).
I wanted to make it easier and mimic a CMS.
Thus, I created this project, which mainly needs new markdown files to create new pages.
Though I still need to refer to the files in the code.

Since creating my old one I have also gotten more obsessed with photography, so I wanted to make a portfolio that could showcase my photos better.

You can visit the deployed version [here](https://lucashanson.dk).

## Tech Stack

- **Framework**: Next.js 15 (App Router)
- **Runtime**: Bun 1.3
- **Language**: TypeScript
- **Content**: Markdown files
- **Styling**: CSS
- **Deployment**: Vercel (recommended)

## Available Scripts

Run locally with reload:

`bun run dev`

Will be available at [http://localhost:3000](http://localhost:3000)

### Build and deploy (Vercel)

Local build:

```bash
bun run build
```

To deploy, push to your GitHub repository and connect it to Vercel. Vercel will run `npm run build` automatically.

## Bitcoin donations

`GET /bitcoin` returns one Bitcoin mainnet native-SegWit (`bc1q…`) receive address
as plain text, followed by a newline. It is a dynamic Node.js route; neither its
response nor its blockchain-history lookups are cached.

### Configuration

- Set **`BITCOIN_ZPUB`** as a server-only Vercel Secret in each environment where
  donations should be enabled. Environment changes take effect in a new
  deployment. For local development, use an uncommitted `.env.local`.
- Use an **account-level BIP84 `zpub`**, normally exported at
  `m/84'/0'/account'`. The endpoint derives the external receive chain at
  `0/index` relative to that account. Master keys and receive-chain-only exports
  are rejected.
- Prefer a dedicated donation wallet or account so the website does not hold
  your savings account's `zpub`. Verify the export against your wallet's receive
  addresses and retain the account's recovery information.
- Never configure a seed phrase, `zprv`, or private key. Do not use a
  `NEXT_PUBLIC_` environment variable or commit the `zpub`.

### Rotation and privacy

On every request, the server scans receive addresses sequentially from index
zero using [Blockstream's public address-history API](https://github.com/Blockstream/esplora/blob/master/API.md#addresses).
It returns the first address with no confirmed received outputs. Once a payment
has at least one confirmation, the next request advances past that address.
Pending payments do not trigger rotation, and spending donations never makes a
previously paid address eligible again. Multiple visitors can receive the same
address; all previously issued addresses remain valid.

No cron job or database is required. Lookups increase with the number of paid
addresses; the complete scan has a ten-second deadline. Missing or invalid
configuration, unavailable or invalid explorer responses, and timeouts return
HTTP `503` with a generic message rather than an unchecked address.

The explorer receives derived addresses, never the `zpub`. Nevertheless, it can
associate queried addresses, and someone monitoring `/bitcoin` can collect
successive donation addresses. Bitcoin amounts and transactions are public.
Separate wallets limit exposure of savings; combining their funds in later
transactions can link them. A leaked `zpub` reveals its account's addresses and
history but cannot spend funds.

### Regression checks

Run `npm run test:bitcoin` with Node.js 22.18 or newer, which supports native
TypeScript execution. Tests use public BIP84 vectors and simulated explorer
histories; no real wallet secrets or payments are needed.

## Want to use this project?

This project is open source and uses the Apache 2.0 license.
If you are unsure about what that entails, you can read the license [here](./LICENSE).

To get started with using this project, you need to:

1. Fork the repository
2. Clone the repository
3. `cd` into the repository
4. Install Bun (if not already installed): `curl -fsSL https://bun.sh/install | bash`
5. Run `bun install`
6. Run `bun run dev`

When you get to building and deploying, I have unfortunately hardcoded my own domain in a few places.
You must therefore need to change the domain in the following files:

- `package.json`
- `CNAME`
- `scripts/generateRSS.js`

There might be more places, but these are the primary ones.
