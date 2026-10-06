import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import matter from "gray-matter";
import { searchItems } from "../lib/search.ts";

const postPath = new URL("../public/content/blog/self-hosted-ai-agents.md", import.meta.url);
const post = matter(readFileSync(postPath, "utf8"));

const items = [{
  title: post.data.title,
  href: "/blog/self-hosted-ai-agents",
  description: post.data.description,
  searchText: [
    post.data.title,
    post.data.description,
    ...(Array.isArray(post.data.keywords) ? post.data.keywords : []),
    post.content,
  ].join(" "),
}];

test("search finds the Loki setup post by Hermes from its body text", () => {
  assert.deepEqual(searchItems(items, "Hermes"), items);
  assert.deepEqual(searchItems(items, "Loki Telegram")[0], items[0]);
});

test("search finds Bitcoin donations by page title and description", () => {
  const bitcoinPage = {
    title: "Bitcoin donations",
    href: "/bitcoin",
    description: "An optional Bitcoin donation to support Lucas Hanson's work.",
  };
  assert.deepEqual(searchItems([bitcoinPage], "bitcoin"), [bitcoinPage]);
  assert.deepEqual(searchItems([bitcoinPage], "donation support")[0], bitcoinPage);
});

test("search matches all query words and excludes items missing a word", () => {
  const results = searchItems([
    { title: "Hermes agent", href: "/one", description: "Android setup" },
    { title: "Hermes", href: "/two", description: "Agent setup" },
  ], "agent Hermes");
  assert.deepEqual(results.map(({ href }) => href), ["/one", "/two"]);
  assert.deepEqual(searchItems(items, "Hermes absent"), []);
});
