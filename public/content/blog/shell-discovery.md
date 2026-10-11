---
title: I configured a better shell. Then forgot how to use it.
description: "I built a Raycast extension to surface the shell commands I keep forgetting. Installing better tools is easy. Using them is the problem."
keywords: [Raycast, Shell Discovery, Zsh, shell history, developer tools, productivity]
date: 2026-10-11
image: /images/nature/DSCF2082.jpg
---

I have a shell full of useful tools and shortcuts. I also keep using the same few commands.

So I built another tool to remind me to use the tools I already installed. This is either sensible or a very specific form of procrastination.

It is called Shell Discovery. It lives in Raycast and gives me a shell tip, a searchable cheat sheet, and a small menu bar reminder.

## My opinions, up front

- **Installing a tool is not learning it.** A package list is not a skill set.
- **Your own setup is more useful than a generic tips feed.** A shortcut that does not work on your machine is just trivia.
- **History is a hint, not a competence score.** Running a command does not mean you understand it.
- **Not everything needs an LLM.** Picking a neglected command does not require sending my terminal history to one.
- **Discovery should not execute anything.** Show me the command. Let me decide whether to run it.

## The problem is not my shell

My config includes Zsh, fzf, zoxide, bat, fd, jq, ripgrep and a collection of custom bindings. The setup is in [a public repository](https://github.com/lucasfth/config).

There are useful things hiding in it. I can edit a long command in Vim and return it to the prompt without executing it. I can preview batch renames with `zmv -n`. I can open files by typing their names, using the suffix handlers I configured.

But configuration does not create a habit. Writing a shortcut into a file does not make me remember it when I need it.

A README helps when I already know what to look for. It is less useful for remembering something I forgot existed.

## What I built

Shell Discovery has a catalogue of commands, shortcuts, examples and cautions from my actual setup.

The daily card shows one tip. The menu bar keeps it nearby. The cheat sheet lets me search the whole catalogue and mark things learned.

For command tips, it reads a recent tail of my local Zsh history and counts matching command positions. Unlearned tips with lower counts get priority. If I keep using ripgrep but never touch jq, those tools get separate counts. One does not hide the other.

That is the useful bit. Not a random command of the day. Something from my own shell that I might be overlooking.

I can mark a tip learned or move on to another. I do not need a streak, a badge or a congratulatory animation for remembering how to change directories.

## What history cannot tell me

The counts are deliberately limited.

They cover recent history, not lifetime usage. Zsh history deduplication can remove repeated commands. A command can be absent because I ran it elsewhere, excluded it from history, or simply do not need it.

Keyboard shortcuts are worse. Pressing a key does not leave a command in history. The extension cannot infer whether I use those bindings. I have to mark them learned myself.

Calling any of this a measure of proficiency would be bullshit. It is a way to choose a reminder.

## The AI part is optional

There is also a Raycast AI tool that searches the same catalogue. I can ask how to edit the current command or clear the screen without losing it.

That tool does not read my history, inspect usage counts or execute commands. It searches the documented tips. Its job is to help me find an answer, not invent what my shell supports.

The history-aware selection stays local. The extension does not send raw history to a service or persist a copy of it.

I like that boundary. My terminal history is not something I want to hand over just to get a reminder about `jq`.

## The catch

The catalogue is currently tailored to my setup. Some bindings, directory names and file handlers are mine, not Zsh defaults. Copying the extension does not configure your shell to match it.

That is the main job before a proper public release: separate generally useful tips from setup-specific ones and make the requirements explicit.

There is another obvious limitation. A reminder is still a reminder. I can ignore it. Building this does not prove I have learned anything, and I do not have measurements showing that it makes me faster.

For now, the [source is available in my config repository](https://github.com/lucasfth/config/tree/main/raycast/shell-discovery). It is a local extension, not a published Raycast Store release.

I do not need a more impressive shell. I need to use the one I already have.
