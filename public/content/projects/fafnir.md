---
title: fafnir
tagline: Encrypted .env files in Git, no SDK and no vault
description: A Go CLI that keeps .env out of Git. The encrypted copy commits with SOPS and age, and coworkers get scoped grants, no shared key.
keywords: [Go, secrets, encryption, SOPS, age, dotenv, CLI, open source]
imageLight: /images/fafnir-latte.png
imageDark: /images/fafnir-mocha.png
tags: [Go, SOPS, age, CLI]
date: 2026-10
schemaType: SoftwareApplication
---

Secrets leak into Git as .env files. fafnir flips that: the plaintext stays on your machine, and the encrypted file is what gets committed. It is a small Go CLI that wraps SOPS and age. No application SDK, no Node runtime, no password-manager account, no protocol of my own.

Named after the dragon who guards the treasure hoard in Norse legend, Fafner in Danish. The treasure here is your repository's secrets.

## What you get

- **Plaintext never gets committed.** `init` writes the ignore rules, `seal` writes `.env.fafnir`, and you commit the rest like any other change. fafnir does not stage, commit, push or merge.
- **Standard cryptography.** The SOPS profile is restricted to a dotenv shape with age X25519 wrapping. Stock SOPS can decrypt the sealed files, so the tool cannot lock your data behind itself.
- **Your identity stays local.** One age key per developer, stored in the macOS keychain or the Linux Secret Service. Backup is a masked export into your existing password manager. There is no shared team key.
- **Scoped coworker access.** A coworker creates their own identity and sends you their public recipient. `grant` adds exactly that file's scope. They pull, review and run `trust`. No plaintext travels between machines.
- **A clean path for your app.** `fafnir run -- your-command` decrypts directly into the child process environment, passes arguments literally and strips the decryption credentials.

## Honest limits

- Experimental, and not independently audited. I use it for personal projects, where a leak would not compromise anything important.
- No binary releases. You clone the source, read it and build it with Go 1.27 or newer.
- `run` is not a sandbox. The child and its dependencies can read every secret it receives.
- No maintainer role. Whoever can decrypt a file can change its recipients, and "maintainer-only" is a team convention enforced through PR review, not by fafnir.
- Revocation re-encrypts the current data. It cannot take back already pulled ciphertext, and it does not rotate service credentials.
- The Git guard check reads the index, and the hook is opt-in and bypassable. Treat checks like any other CI job.

## How it works

Sealing parses your .env as dotenv and encrypts the quoted form of every value, including empty strings, so a deleted or renamed variable is detected instead of silently accepted. Restore normalizes formatting and preserves values; sync compares parsed values, not bytes.

Grants and revokes are re-encryptions plus a policy update. The change journal lives in private local state, so an interrupted grant either rolls back or fails loudly on the next run.

Every push runs Linux and macOS: race tests, vet, a build and platform-specific vulnerability scans. The security review pass added regression tests for its confirmed findings, and bounded fuzzing runs on a schedule.

## Links

- [GitHub repository](https://github.com/lucasfth/fafnir)
- The threat model, references and review findings live in the repo: SECURITY.md and docs/security-audit-2026-10-16.md.