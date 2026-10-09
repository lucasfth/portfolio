---
title: I made my phone the brain of my AI agents
description: "Why I keep my AI agents grounded in a portable markdown vault, and why a phone is a useful but unreliable place to run them."
keywords: [personal AI assistant, self-hosted LLM, Termux, Obsidian, MCP, Tailscale, llama.cpp, Qwen, Hermes Agent, coding agent, automation]
date: 2026-09-30
image: /images/nature/DSCF2082.jpg
---

I run my personal AI assistant on an old Android phone. Not as a toy, but as the actual hub of my setup. It reads my email, tracks my packages, remembers my projects, and works while I am asleep.

That sounds cleverer than it is. The useful part is not an AI living on a phone. The useful part is refusing to let every new AI product become another place where my context goes to die.

---

## The argument

Most AI products make you their memory layer. You copy context between chats, re-explain decisions, and hope the next model remembers enough to be useful.

I want the opposite. My memory should outlive the chat app, the model, the agent harness, and the company selling all of them.

That is why the real asset is a markdown vault. Plain files. Wikilinks. Git. If an agent gets something wrong, I can open the file and fix it. If I stop using a tool, the files are still mine. Durable and portable beats convenient and trapped.

## The platform is not the point

[Hermes Agent](https://github.com/NousResearch/hermes-agent) is the platform running on the phone. It gives me the boring plumbing I actually need: sessions, tools, messaging, scheduled work, profiles, memory and skills. It can talk over Telegram, so the agent is available when I am not at my desk.

Hermes also has its own bounded, curated persistent memory. That is useful for preferences and working context. It is not where I want my life to live. Its memory is scoped to a profile and injected at the start of a session. My vault is the longer-lived shared layer because it is readable without Hermes and usable by other tools.

The model and the harness are not the asset. They are replaceable parts. I run a self-hosted model through [llama.cpp](https://github.com/ggml-org/llama.cpp) when it makes sense, and I can switch to subscription models when the work needs them. I do not want a better model to require rebuilding my memory or changing how I work.

## The roster

I name the agents after Norse mythology, because it helps me keep track of what is what.

**Loki** is the main agent. It runs on the old Android phone inside Termux, on Hermes, and talks to me over Telegram. It has access to the vault and a set of cron jobs. Loki can now fuck my life up a bit, so I keep the dangerous parts constrained.

**Huginn** is the desktop agent. It is the [omp.sh](https://omp.sh) coding harness I use for code work at the desk.

**Ratatosk** is the Raycast AI assistant on the Mac. It is the quick access point when I need information instead of making a Google search.

**Muninn** is not really an agent. It is the vault exposed as an [MCP](https://modelcontextprotocol.io) server, giving other tools search, read and write access to the markdown files. That keeps one source of truth available wherever I need it.

## Skills are procedures, not learning

Hermes skills are useful. They are reusable instructions and workflows that can load when a task needs them. They save me from explaining the same process over and over.

But this is not magical learning. A skill is only as good as the procedure it contains, the tools it can actually use, and the model reading it. It can be stale, wrong, or overly confident. Saving a workflow does not make the agent understand the world. It makes a repeatable workflow easier to reuse.

The same goes for capabilities. An agent that can read email, run commands, use a browser, or write notes is not trustworthy because it can do those things. Capability is blast radius. Trust comes from narrow permissions, review where it matters, logs, recoverable data, and accepting that some work should not be automated.

## What I actually use it for

- A morning briefing: calendar, weather, my stock watchlist, anything that is due
- Email triage: what actually needs me, with drafts I approve before anything is sent
- Research and drafting
- Grocery price comparison across supermarkets
- Package tracking
- Calendar and reminders
- A nightly pass over the vault that consolidates notes and finds gaps

The pattern is the same in all of them. The agent has context I would never bother typing into an app, so it can help without making me start from zero.

## The bad side

Running the brain of your setup on an old phone has a cost, and Android is the main villain.

- **Memory pressure kills too.** A script that loads a big file into RAM can take the entire stack down. On a phone there is no "just wait for it to finish".
- **Silent half-death.** A connection can die inside a still-running process. Everything locks up, nothing works, and a basic watchdog may still think the process is healthy.
- **Reboots wipe everything.** After a phone restart, the stack only comes back through a boot script. If that script fails, you notice when the assistant stops answering.
- **Termux is not first-class.** Some binaries simply do not work on Android. When they do, you are often behind the platforms people build for first.
- **Self-hosting is not free.** There is hardware, power, maintenance, failed updates, model availability and time. There is no token bill, but there is absolutely a bill.

The phone is cheap, portable and always nearby. It is not reliable infrastructure. I use it because the tradeoff is good enough for my personal setup, not because it is the best way to run an agent.

## What you can copy

You do not need my exact setup. The minimal version is:

1. One markdown vault, versioned with git
2. One model you can replace without moving your data
3. One agent harness with only the tools it needs
4. One shared interface to the vault
5. One way to reach the agent when it is useful

Start there. Add automation only after you know what failure looks like. The interesting part is not giving an agent more power. It is keeping your memory portable when the next model, harness or company changes.
