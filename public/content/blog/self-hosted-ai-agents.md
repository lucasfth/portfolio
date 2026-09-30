---
title: I made my phone the brain of my AI agents
description: "How I run a personal AI assistant on an old Android phone: one shared markdown vault, one self-hosted model, four agents, and the problems Android causes."
date: 2026-09-30
image: /images/nature/DSCF2082.jpg
---

I run my personal AI assistant on an old Android phone. Not as a toy, but as the actual hub of my setup. It reads my email, tracks my packages, remembers my projects, and works while I am asleep.

This post is about how it is put together, how the pieces talk to each other, and where it hurts.

---

## The problem

Every AI tool you use forgets you the moment you close it. The chat app does not know what your notes app knows. The assistant does not know what you decided yesterday in a different conversation.

The result is that you become the memory layer. You copy context between tools, you re-explain yourself, and the tools slowly drift away from your actual life.

I wanted the opposite: one memory, one model, and a few thin entry points.

## One vault, one model

The whole setup rests on two decisions.

First, memory lives in a single [Obsidian](https://obsidian.md) vault. Plain markdown files with wikilinks, versioned with git, around 1,600 notes. No database, no proprietary format. If the agent gets something wrong, I can open the file and fix it by hand. If everything else dies, the files survive.

Second, every agent runs against the same self-hosted model. A Qwen model served by [llama.cpp](https://github.com/ggml-org/llama.cpp) on a dedicated GPU machine, reached over a private Tailscale network. No API keys, no per-token billing, no cloud.
Well, and when more complex work is needed I can switch to the subscription based models.

The memory should be considered the real asset.

## The roster

I name the agents after Norse mythology, because it helps me keep track of what is what.

**Loki** is the main agent. It runs on the old Android phone inside Termux, on the [Hermes Agent](https://github.com/NousResearch/hermes-agent) platform, and talks to me over Telegram. It has access to my email, calendar, GitHub, the vault, and a set of cron jobs (thus Loki as he can now fuck my life a bit up). If something needs to happen while I am away from a computer, Loki does it.

**Huginn** is the desktop agent. It is the [omp.sh](https://omp.sh) coding harness running on my MacBook. I use it for code work at the desk.

**Ratatosk** is the Raycast AI assistant on the Mac. It's the quick access point when I need quick information instead of making a Google search.

**Muninn** is not really an agent. It is the vault exposed as an [MCP](https://modelcontextprotocol.io) server, giving other tools search, read, and write access to the markdown files. This makes me have a single source of truth for all my agents, ensuring that I can query data that I might need at any point.

## How they talk

MCP is the glue. Anything that needs access gets a small HTTP MCP server on the private network:

- **Muninn** lets Raycast search, read, and write vault notes.
- **Ask Loki** is a separate server that does not just hand Raycast file tools, but invokes the full phone agent with its memory and skills. I kept the two servers separate on purpose: file access and full agent execution have different permission boundaries and different response times.
- **Huginn** does not need MCP at all, it only needs the model endpoint.

Tailscale is the trust boundary. Every service binds to a private tailnet address, nothing is exposed to the internet, and there is no extra auth layer on top. The network itself is the auth. It is boring, and it works (for now).

## What I actually use it for

- A morning briefing: calendar, weather, my stock watchlist, anything that is due
- Email triage: what actually needs me, with drafts I approve before anything is sent
- Grocery price comparison across supermarkets
- Package tracking
- Calendar and reminders
- A nightly pass over the vault that consolidates notes and finds gaps

The pattern is the same in all of them. The agent has context I would never bother typing into an app, so it acts instead of asking.

## The bad side

Running the brain of your setup on an old phone has a cost, and Android is the main villain.

- **Memory pressure kills too.** A script that loads a big file into RAM can take the entire stack down. On a phone there is no "just wait for it to finish".
- **Silent half-death.** When Tailscale drops the tunnel, one service's socket can die inside a still-running process. Everything locks up, nothing works, and the watchdog cannot see the problem because the process is alive.
- **Reboots wipe everything.** After a phone restart, the stack only comes back through a boot script. If that script fails, you notice when the assistant stops answering.
- **No public IP.** My carrier puts the phone behind carrier-grade NAT, so all inbound access has to go through Tailscale.
- **Termux is not first-class.** Some binaries simply do not work on Android. When they do, they work, but you are always a version behind.

None of this is a reason not to do it, but it is a reason to build the watchdogs before the features.

## What you can copy

You do not need my exact setup. The minimal version is:

1. One markdown vault, versioned with git
2. One local model, llama.cpp on any GPU you have access to
3. Tailscale for private access
4. One MCP server that exposes the vault
5. One agent, with Telegram as the front door

That is the whole core. Everything else is what you bolt on afterwards.
