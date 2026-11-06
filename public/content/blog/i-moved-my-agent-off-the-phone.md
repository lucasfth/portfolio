---
title: I moved my agent off the phone
date: 2026-11-07
description: "Five months of running my AI agent on an old Android phone ended in a Mac mini. What the new box is, what I deleted, and what I have not proved."
keywords: [self-hosting, ai-agent, hermes, termux, macos, launchd]
image: /images/off-the-phone-macmini-dark.png
imageDark: /images/off-the-phone-macmini-dark.png
imageLight: /images/off-the-phone-macmini-light.png
imageWidth: 1660
imageHeight: 995
---

*Hero: Mac mini internal-study schematic, not an exact teardown.*

I ran my personal AI assistant on an old Android phone for five months. Two thousand sessions, one terminal, no root. In [September I wrote about it](/blog/self-hosted-ai-agents): I loved the design, I did not love the platform. In late October the agent got a Mac mini. This is the honest version: what the new box is, what I deleted, and what I have not proved.

## My opinions, up front

* **The phone was the first home, not the smallest.** The design was right, and the platform was what had to go.
* **An agent that fights its platform is maintenance.** On the phone I was writing watchdogs for the host, not features for the agent.
* **The reboot test is the only acceptance test that matters.** A manual start proves nothing about a box that must run alone.
* **The memory outlived both machines.** Everything durable was in git, so nothing had to be rebuilt.

## What the phone cost

[The September post](/blog/self-hosted-ai-agents) has the failure list: a gateway that crashed five times in eight days, a watchdog I wrote because Termux does not respawn processes, a boot script because reboots wipe everything, and a week in which 27 scheduled runs ended in states I could not read. None of those were bugs in the agent. They were the platform tax.

There was one cost that made the move feel wrong. A phone has a built-in UPS. When the power died at the desk, the brain kept answering on mobile data while the desktop went dark. I miss that, and I say it up front because the new setup cannot do it.

## What the Mac mini is

The box is a Mac mini on my desk, on the tailnet, running me as my main account, because everything durable is git-backed.

Three rules shaped the whole install.

1. Native, no Docker. launchd daemons, system services, the OS's own process management. No proot, no shims, no Android in the stack.
2. Services start at boot, before anyone signs in. The gateway and the four MCP services come up as KeepAlive daemons. If the box stops, it is available again the moment it starts.
3. The agent gets no sudo. It writes files in its own home, pushes git from there, and the daemons respawn it on crash. Anything that needs root is a one-time job I do at setup, never something the agent does at runtime.

Two deviations from the plan, both mine to own. FileVault is off; the plan said on, and the machine I actually live on runs the Tailscale app with auto-login and a locked screen instead. Those choices keep the tailnet working while the box sits locked, and they are not what I would pitch. They work, and they are the ones in production.

## What I deleted

The move was a deletion list more than an install. Left behind on the phone:

* the nohup and setsid hacks that kept the gateway alive between Android suspensions
* the keepalive script, the watchdog for the watchdog
* the battery-saver triage scripts
* the SIGSYS dance around Android killing the terminal

What moved was the payload: the vault, the skills, the agent state. About 3.3 gigabytes and 14,741 files over the tailnet. The mail stack got simpler instead of copied: Mail.app on the mini with full disk access for the agent's Python, so it reads the live stores directly. There are no IMAP passwords anywhere in the new setup.

## The test

The qualification battery had one test that mattered: reboot the box with nobody at the keyboard. A manual start counts for nothing. The login screen appears, and sshd, the tailnet, the gateway and the MCP services come back on their own.

I watched one such boot on November 5. Power on at 19:34, screen locked, tailnet rejoined, gateway and dashboard healthy by 19:36. About 100 seconds from power to answering, with no human involved.

One verified boot is not a week of verified boots. Recovery after an abrupt power cut is still untested. I will not claim more than the boot I watched.

## What the phone is now

It is frozen: not wiped, not repurposed, nothing running. It is the rollback target, kept because the design that made the move a day of work also made it reversible. If the mini proves to be the wrong home, the phone sits there with everything it had.

[The September post](/blog/self-hosted-ai-agents) ended with "Would I do it again? Yes." The answer now is narrower: I would not do the platform again. The design transfers; the platform did not have to.

## What you can copy

1. A resume point that is not an agent: a git vault with no special access.
2. Services owned by the OS. If you find yourself writing a keepalive script, you are leaving self-hosting.
3. A reboot test that does not need you in the room.
4. The old machine kept frozen, not wiped, until the new one has earned the role.

The voice still comes from the old GPU box. The tunnel just starts from a different machine.
