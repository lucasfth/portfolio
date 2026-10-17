---
title: I secured my Bitcoin with two YubiKeys
description: "No hardware wallet. My Bitcoin is guarded by two YubiKeys I already use daily, a sentence I memorized, and a printed paper. Here is what I understand, and what I do not."
keywords: [bitcoin, self custody, yubikey, superbacked, security, backup]
date: 2026-10-19
image: /images/keyring-yubikey.jpg
---

I hold my Bitcoin on keys of my own. The security is two small USB keys I already use every day, a sentence I have memorized, and a printed sheet of paper. No hardware wallet with a screen, no gadget to charge, nothing that was not on my keyring before.

To be upfront about where I stand: I am not a cryptographer. I do not understand most of the math in this. What I do understand is the design. What each piece is for, what can break, and how I recover from each failure. That is the only claim I make for this setup. If the math is wrong, I would like to hear it from someone who knows, not from me.

## The three pieces

The wallet comes from three things, and all three are needed at once:

1. **The secret.** A random number that lives inside each of my [YubiKeys](https://www.yubico.com). The keys know it without ever revealing it: software asks the key a question, and only the right key answers, while the secret itself never leaves the device.
2. **The sentence.** Something I have memorized. It also lives in my password manager.
3. **The name.** A name I chose for this wallet. Also in the password manager.

Give the three to [Superbacked](https://superbacked.com) and it builds a normal Bitcoin wallet. The same three inputs always produce the same wallet. The wallet lives in the math, not in any device or file.

Any piece alone gives you nothing:

- The secret by itself: nothing.
- The sentence and the name: nothing.
- YubiKey + sentence + name: the wallet.

## Why a YubiKey instead of a hardware wallet

I already carry both keys. Losing a key is an anxiety I live with every day, and the second one turned that anxiety into a plan. And nothing new enters my life: nothing to buy, charge, update, or lock in a drawer. These same keys run my passwords and second-factor logins. My wallet got protected by the thing I already trusted with my accounts.

The trade, said plainly: the keys do not sign anything. When I need the wallet, my Mac does the derivation for a few seconds, and for those seconds the sensitive material sits in its memory. If my Mac were compromised in exactly that moment, this design does not save me. A real signing device would. I accept that at my position size, and Superbacked itself says it: for amounts you cannot afford to lose, use a signing device.

## The printed paper

There is no 24 word list to write down. The paper is a printed, encrypted copy of the secret from inside the keys. It covers exactly one thing: both keys dying. I buy a new YubiKey, load the paper onto it, and I am back. If only one key dies, the paper stays in the drawer.

The paper is printed and sits in two places, both far from the keys.

And one thing the paper cannot cover: if I forget the sentence, everything is gone. No device, backup, or company recovers it. I think that is the most honest line in the whole setup.

## Using it day to day

Ninety percent of the time: checking the balance, which needs nothing. Every wallet has a public side that shows the balance without revealing the keys. That side lives in [Electrum](https://electrum.org) on my Mac and [BlueWallet](https://bluewallet.io) on my phone. I can check from anywhere.

Moving money, the rare case: I plug in a key, enter the sentence, enter the name, the Mac builds a throw-away wallet, it sends, and I delete that wallet. No secret stays on disk. It takes about five minutes on purpose. That is why this wallet is savings, not pocket money.

## If something breaks

- Home key lost: use the travel key. Nothing else.
- Travel key lost or stolen: use the home key. If I suspect theft, I cut a new secret onto both keys.
- Both keys dead: load the paper onto a new key.
- Paper lost: either key still works.
- Sentence forgotten: no recovery. By design.

## Buying, from Denmark

I buy on [Kraken](https://www.kraken.com) with a SEPA transfer and a limit order. No MitID, which rules out the Danish home-grown options for me. The withdrawal flow never changes: a small test send first, wait for it to land, then the rest. Buying is not the security part. Custody starts at the withdrawal.

The agents that helped me set this up are in my [post about my AI agents](/blog/self-hosted-ai-agents).

## What is not in this post

My wallet name, my key serials, the wallet's public key, and the balance. If you read this post and can guess any of those, I am doing something wrong. I never put the secret, the sentence, or any key material into a password manager, a file, or a chat. Only the sentence and the name go in the password manager, and that is all.

If you build this: verify the software's checksums and signature before trusting it, confirm both keys build the same wallet before moving a single satoshi, print the backup somewhere the keys will never be, and be honest about the position size this trade is allowed to carry.