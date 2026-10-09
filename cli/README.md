# Portfolio CLI

Read public content from [lucashanson.dk](https://lucashanson.dk). It uses the site's public read-only MCP endpoint for discovery and Markdown endpoints for pages. It sends no credentials and has no write commands.

Requires Node 20+.

```sh
node cli/index.mjs list
node cli/index.mjs read /about
node cli/index.mjs read /blog/self-hosted-ai-agents
```

Options:

```text
--base URL       Override the site URL (useful for a local public endpoint)
--timeout MS     Request deadline; defaults to 10000
```

`list` prints tab-separated local paths and titles. `read` writes Markdown to stdout. Invalid input, failed HTTP responses, and timeouts write an error to stderr and exit nonzero.
