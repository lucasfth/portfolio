---
title: I've become a data hoarder
description: "2,544 notes, 9.8 MB of Markdown, and a raven named Muninn. No vector database: an inverted index, math, and a ledger that keeps the bytes, so the whole hoard answers a question in about 22 milliseconds."
keywords: [Muninn, MCP, SQLite, FTS5, full-text search, knowledge base, AI agents, benchmarks]
date: 2026-11-04
image: /figures/muninn-architecture-dark.png
imageLight: /figures/muninn-architecture-light.png
imageDark: /figures/muninn-architecture-dark.png
imageWidth: 2240
imageHeight: 1896
---
I've become a data hoarder. 2,544 notes, 9.8 MB of Markdown, git-backed, named Muninn after Odin's raven of memory. It holds Instagram posts I sent one of my agents to extract the useful bit from, salary numbers, runbooks, postmortems, a watchlist, a dinner plan, someone's opinion on a blog I half remember reading. Three agents (Huginn, Loki, Ratatosk) and I write to it. By any objective metric, this is a hoard.

The difference between me and a normal hoarder: I can find anything. Hoarding is only a sin when it is a black hole. So I built a small MCP server in Python over the folder, and now any of my agents can ask the hoard a question and get a real, ranked, cited answer back in a couple of dozen milliseconds. It turns out the last step of being a confident hoarder is making the hoard answer questions.

This post is the tour: the layers, the real code, the real numbers, measured on the live server.

## The vault: frontmatter is load-bearing

Every canonical note starts with five required fields:

```yaml
---
title: Muninn MCP Vault Server
type: operations
created: 2026-08-31
updated: 2026-10-29
status: active
tags: [muninn, mcp, vault, raycast]
---
```

Folders are semantic, not chronological: `life/`, `tech/`, `projects/`, `references/`, plus generated `daily/`, `dreams/` (overnight maintenance output) and `logs/`. Each folder keeps an `_INDEX.md` of links to its notes, and notes cross-link with Obsidian `[[wikilinks]]`. There are 5,403 of those links in the vault right now. `personal-notes/` is my private corner; the server enforces the hard part, existing private notes cannot be overwritten or archived through the MCP, and no private note is ever sent off-device.

The frontmatter contract matters more than it looks because three systems read it with three different jobs:

1. **Index time.** Title and tags go into their own columns with BM25 weights of 6x and 3x against 1x for the body, and the full frontmatter is searchable, so `status: active` or a `deadline:` field in the YAML is findable.
2. **Write time.** A mechanical gate validates every non-private write: title, type, and status nonempty; 2 to 5 distinct lowercase kebab-case tags; `updated` a real calendar date; frontmatter under 16 KiB; unique keys, no YAML aliases; exactly one final newline. Invalid metadata is rejected before anything is touched.
3. **Read time.** Every search result carries a bounded observation of the source frontmatter (first 16 KiB, allowlisted keys) so callers see declared `status`/`updated` without the server guessing at meaning.

Shared vocabulary between the human, the gate, the indexer, and the reader. It exists for that reason and costs zero at query time.

![The frontmatter contract parsed three ways: index time, write time, read time](/figures/muninn-frontmatter-dark.png)

## The layers

One process: FastAPI over loopback, one SQLite file for the index, a second for the evidence ledger. Top to bottom:

![Muninn architecture: clients, auth boundary, index, gated rerank, write governance, ledger, vault](/figures/muninn-architecture-dark.png)

### 1. Transport and caller auth

MCP JSON-RPC over a loopback port, tailnet exposure handled outside the process. Clients (Hermes, Raycast, my OpenClaw fleet) each hold a bearer token. The allowlist stores SHA-256 digests, comparison is constant time, and the allowlist file is re-read on every request, so I can rotate a token without restarting anything. Misconfigured strict mode fails closed with 503; unknown tokens get 401. Auth names the caller, which is just a credential holder, not a person, and the server says so in its policy responses instead of pretending to know who you are.

### 2. The search index

One file, `index.db`, SQLite in WAL mode, nothing beyond Python's standard library:

- `files (path, mtime, size, title)` - the change-detection key
- `notes` - an FTS5 virtual table over `(path, title, tags, body)`, tokenizer `porter unicode61 remove_diacritics 2`
- `links (src, dst)` - every `[[wikilink]]` resolved to a normalized lowercase stem, indexed both directions

FTS5 gives you inverted-index search, BM25 ranking, phrase queries, and stemming. The diacritics removal is doing real work in a Denmark-based vault: å, ø, æ and their ASCII forms (aa, oe, ae) hit the same terms, and porter makes `deadline` match `deadlines` for free. The ranking is where the vault structure pays off:

```sql
bm25(notes, 0.5, 6.0, 3.0, 1.0)
```

Title 6x, tags 3x, body 1x, path 0.5x. A note named for the thing you want wins, which is exactly what you want in a vault where someone took the time to name the file.

Post-processing fixes the three things raw FTS gets wrong: **downranks generated folders** (`dreams/` and `logs/` 0.35x, `archives/` 0.7x, auto-written session logs 0.6x, because the nightly job writes constantly and would drown the real answers); **diversity cap, 3 hits per folder**, so fifteen salary notes cannot fill the top 10; **prefix matching on terms of 4+ characters**. The stopword list is small and personal: a, the, and, how, plus `lucas`, `me`, `my`. This vault is about one specific person, and his name is not a distinguishing term.

Sync is incremental: a stat walk comparing `(mtime, size)` against the `files` table, bucketed into a 20-second window. A no-change walk of all 2,544 files takes **34 ms** on this machine; a forced full re-index of every note takes **5.3 seconds**. That second number is the design's secret: **the index is a disposable cache, not the data.** Delete it and it rebuilds from the Markdown, so the database never has corruption to preserve, only to replace. And if the index ever throws, search degrades to a labeled substring scan of the whole corpus (`engine: substring-fallback`, error attached), bounded chunked reads. It degrades. It does not die.

### 3. Rerank, gated

BM25 has a ceiling, so there is an optional second stage: a small model (a TypeSafe System One endpoint) scores the shortlist, one 0-to-1 relevance number per candidate. The model is called **only when BM25 is unsure**: if the second-best score is within 90% of the best, the top is contested. My October benchmark showed roughly half of all queries are confident enough to skip the call entirely, and on the contested ones the reranker recovered 14 of 17 known BM25 top-1 misses into the top 5. When the top is clear, the query never leaves the machine. Two invariants: private notes are **never** sent to the endpoint (they keep their BM25 slot and get merged back in place), and if the endpoint fails, the BM25 order stands with the engine string annotated. The gate costs nothing when nobody is unsure.

### 4. The link graph

`vault_links`: what points at this note, where it points, which targets are broken. Backlinks feed the archive flow, because archiving a note and leaving its inbound links dangling is how knowledge bases quietly rot. Graph navigation is a SQL join, not an LLM conversation.

### 5. Write governance

Agents make mistakes at 4 AM, so writes go through five gates in order:

1. **Validate first**, including a byte-level rule I did not expect to need: the `Related:` link blocks that maintenance generates at the bottom of notes must stay byte-identical between revisions, or the write is rejected. An agent that "tidies" them breaks the maintenance system.
2. **Check the revision.** Writers pass `expected_revision`, the SHA-256 of the bytes they read; if the file moved since, they get a conflict with the current hash and nothing changes.
3. **Hold a per-path lock** (POSIX advisory, lockfiles outside the vault) so two cooperating writers cannot interleave.
4. **Stage, fsync, rename.** New content is written to a hidden staging file, fsynced, then `os.replace`d into place. A crash mid-write leaves the old file or the new file, never a torn one.
5. **No delete.** There is no delete tool. Removing a note commits its exact prior bytes into the evidence ledger as an immutable revision with a reason (`archived`, `superseded`, `retracted`) and only then unlinks. If preservation fails, the original stays. Restore is exclusive-create only.

On top: `dry_run` gives a side-effect-free preflight (current revision, bounded duplicate-filename hints, index obligations), and `vault_file_note` writes note plus `_INDEX.md` as a journaled transaction, durable intent before either file moves, replay never rebases, a crash leaves a `transaction_id` you can recover with. The split is deliberate: **mechanical violations are rejected, judgment is returned as data for the caller to decide on.**

### 6. The temporal ledger and claims

`temporal.db` stores the preserved bytes (`source_path, sha256, content`), the archive events, and a small claims layer: an explicit statement like "hue bridge, firmware, 2024.08.2" bound to the exact SHA-256 of the note it came from, with a validity window and typed supersession (a superseding claim keeps the same subject, property, and scope; it never invalidates a whole note). The query is honest: ask for a claim's current value and it re-checks the on-disk bytes against the recorded hash; if the source drifted, the answer is `abstained_stale_source`, not a guess; if two claims disagree, it is `abstained_conflict`. It can tell you a fact is stale or contested. It refuses to pick a winner and call it fresh.

Right now the ledger holds 482 preserved revisions (12 MB of immutable bytes) and 508 archive events from two and a half weeks of normal agent traffic (it went live 2026-10-19). Every MCP overwrite since is recoverable byte-for-byte. I verified it with the benchmark: it wrote a scratch note, archived it, read the preserved revision back. Identical bytes, identical SHA-256.

### 7. Synthesis freshness

Agents write summary notes from other notes, and summaries rot. The synthesis layer makes the dependency explicit: register a summary with the SHA-256 of each source (up to 32), and `synthesis_status` walks the transitive graph reporting `current`, `stale` with the exact files that drifted, `incomplete` if the budget ran out, or `unregistered`. The budget is real and stated in the response: 128 file checks, 16 MiB read, a cooperative 250 ms deadline, and one shared budget object across all the warnings in a search response, so ten results cannot produce ten independent evaluations. Every `vault_read` and `vault_search` result carries these warnings, so a model reading a stale summary is told in the same response. And the response says what it is not: hash equality is not proof of truth, and the ledger does not lock filesystem writers.

### 8. `read_code`: the sandboxed workhorse

One more tool changed how my agents work: `read_code` runs read-only JavaScript in a QuickJS sandbox that can `await call("search", ...)` / `call("read", ...)` / `call("links", ...)` against the same surfaces as everything else, with no shell, no filesystem, no network, no credentials. Limits: 8 s wall clock, 32 MiB memory, 256 KiB stack, 20 KB of code. It turns "find the runbook, read it, follow the link, read that note" from four model round trips into one ~60 ms sandboxed call. The multi-hop happens where it is cheap, and the model only sees the final result.

### 9. Even my phone can ask

I got Apple Siri Shortcuts working against the Muninn MCP. A two-pass flow on the iPhone (Ask Muninn V2) plans the query natively, hits the MCP search, reads the source notes, does one follow-up if needed, and answers with grounding in the actual note text. Phone acceptance confirmed on my iPhone on 2026-10-29. Ask Muninn Fast still has the lexical-shortcut flaw, but the two-pass path is the one that ships. This is the hoarder payoff: I can ask the hoard from bed and the hoard answers with a citation.

## Benchmarks

Measured 2026-11-02 on the live server, loopback HTTP through the full auth + JSON-RPC path, Apple silicon Mac, 2,544 notes / 9.8 MB / 5,403 links, index.db 29.3 MiB.

The question sets come from three places: queries I wrote by hand for the notes I look up most, queries phrased the way I actually ask (written without looking at search output), and real past queries from the RAG log where the logged answer named exactly one note. That third set is the honest one, and the hardest.

![Latency on a log scale and recall by question set](/figures/muninn-benchmark-dark.png)

| Operation | n | p50 | p95 | max |
|---|---|---|---|---|
| `vault_read`, small note (3.8 KB) | 200 | 0.77 ms | 1.22 ms | 4.6 ms |
| `vault_read`, large note (247 KB) | 100 | 1.87 ms | 2.19 ms | 2.49 ms |
| `vault_search` (BM25 only) | 92 | 22.4 ms | 37.1 ms | 66.3 ms |
| `vault_search` + model rerank | 6 | 367 ms | 433 ms | 439 ms |
| `vault_links` | 50 | 1.7 ms | 2.1 ms | 2.3 ms |
| `read_code` sandboxed search | 20 | 59.8 ms | 64.8 ms | 73.7 ms |
| `vault_write` dry_run | 20 | 4.2 ms | 4.6 ms | 5.1 ms |
| `vault_write`, real (500 B note) | 1 | 2.6 ms | - | - |
| `vault_archive` (preserve + unlink) | 1 | 59 ms | - | - |
| `vault_archive_read` (200 B revision) | 10 | 1.75 ms | 6.3 ms | 8.0 ms |
| `vault_list` (live filesystem walk) | 50 | 69.4 ms | 81.6 ms | 86.0 ms |
| Raw FTS5, in-process, warm | 27 | 15.1 ms | 26.3 ms | 32.4 ms |
| Full index rebuild from Markdown | 1 | 5.27 s | - | - |
| Incremental sync, nothing changed | 2 | 34 ms | - | - |
| Naive substring scan of whole corpus | 8 | 62.5 ms | 68.7 ms | 71.4 ms |
| Naive any-word grep with counting | 8 | 75.8 ms | 79.3 ms | 80.1 ms |

Quality, BM25 only, 46 unique queries run twice:

| Set | top-1 | top-5 | MRR@10 |
|---|---|---|---|
| Curated (12) | 50% | 83% | 0.68 |
| Held-out, natural phrasing (20) | 75% | 90% | 0.81 |
| Real past queries from the log (14) | 36% | 50% | 0.43 |

### How to read these numbers

Be honest about the corpus size, because it changes the story. At 9.8 MB, a naive grep of every file takes 60 to 80 ms and is arguably fine; the index wins by 3x on raw speed. What it actually buys: **ranking** (top-1 on 50-75% and top-5 on 83-90% of the well-phrased sets, with snippets, versus matches in filesystem order), **scale** (naive reads the whole corpus every query; FTS5 reads a few index pages, and at 100x the notes this stops being a close contest), **degrade-don't-die** (broken index still returns labeled results; nothing else in the table can), and **ops cost is delete-and-rebuild** (no compaction, no migration, 5.3 s from zero).

The quality table is the more important one. The messiest, most realistic set (actual past queries) scores the lowest, top-1 36%. Not a bug: it is the failure mode of keyword search against questions typed from half-remembered context. The design answer is not a bigger keyword index, it is the gated rerank for contested cases, `read_code` for multi-hop cases, and honest warnings attached to every read. The contract is *ranked candidates, exact bytes, honest warnings*, and the agent does the last hop with the tools it already holds.

That last part is why the hoarding is survivable. I can throw an Instagram post at Loki, get told what is in it, watch the useful bit get filed, and three months later ask Huginn "what did that thing say about X" and get it back with the path. The hoard is only as good as its recall, and the recall has benchmarks.

## Reproduce it

- Server: `~/.hermes/mcp-vault-server/` (FastAPI + stdlib sqlite3)
- Benchmark: `bench/blog_bench_20261102.py`, quality sets in `bench/bench_search.py`
- Receipt: `bench/blog_bench_20261102_receipt.json`, regenerated 2026-11-02

The benchmark is read-only except one forced index refresh (an idempotent cache rebuild) and one scratch note it writes and archives. Run `python3 bench/blog_bench_20261102.py` and compare.

No vector store, no embeddings, no external service, no delete button, no off-device flow of private notes, no unbounded evaluation, no trust in frontmatter as truth. One process, two SQLite files, 9.8 MB of Markdown. **The Markdown is the data, the database is a 5-second rebuild, and every mutation leaves a byte-perfect receipt.** Everything fast about Muninn is a consequence of not believing the index. And the hoard can finally be audited like everything else I keep: by opening a text file.