---
title: I made my local LLM slower, then faster
description: "Over seven weeks I swapped the model on Mimer, turned on MTP speculative decoding in llama.cpp, and changed the serving engine. What each change measured, and what it did not prove."
keywords: [local LLM, llama.cpp, MTP, speculative decoding, Qwen 3.8, TabbyAPI, ExLlamaV3, DFlash2, RTX PRO 6000, self-hosted LLM, KV cache, concurrency]
date: 2026-10-23
image: /images/rtx-pro-6000-anatomy.png
---

I run a local LLM for my agents on a box with one RTX PRO 6000 Blackwell. I named the box Mimer. Loki is the phone agent, and the [phone post](/blog/self-hosted-ai-agents) covers the rest of the setup.

Over the last seven weeks I made three changes to it. The first made it slower. The other two were about speed. Here are the numbers, and what they do not prove.

---

## My opinions, up front

- **I pick the model for what it can do, not how fast it runs.** Speed is an engine problem, and I fixed it in the engine.
- **Benchmark at your real concurrency.** My load is rarely one request at a time.
- **Faster tokens are not the same answer.** I have not checked that the output matches.
- **Prefix caching is real but small.** Generation is where my GPU time goes.

## The box and what it serves

Mimer is a dedicated GPU box. Ubuntu, one RTX PRO 6000 Blackwell with 97 GB of VRAM at a 550 W power cap, and a firewall that only allows my own devices. It serves the phone agent, a few coding agents and around 20 cron jobs. The server runs four parallel slots with 262,144 tokens of context each.

The load is not single-user. Over six weeks it took 4,071 requests, and 50% of generation time ran with all four slots busy. A configuration that looks fast on one request can be slow when everything else is asking for tokens.

![RTX PRO 6000 Blackwell, cut apart](/images/rtx-pro-6000-anatomy.png)

## Change one: the model got slower

The first model was Qwen 3.5 122B, a mixture-of-experts that activates about 10B parameters per token. Single stream, roughly 130 tokens per second.

The problem was room. The old server had two slots of 65,536 tokens each. My longer sessions came close to that limit, and they got worse as they filled it. At the swap both slots were busy with five tasks queued behind them.

I moved to Qwen 3.8 27B, a 22.5 GiB Q6 quantized model. It is dense, so every token activates all 27B. The compute per token is about 2.7x higher, and single-stream speed went from about 130 to about 57 tokens per second. More than half is gone. The trade was four slots of 262,144 tokens each instead of two of 65,536.

## Change two: speculative decoding

Qwen 3.8 ships with a built-in next-token head. llama.cpp can have it draft two tokens that the main pass verifies, so one pass advances more than one token.

My first attempt made the fleet slower. On the old llama.cpp build, one stream went from 56 to 128 tokens per second, and the four-stream aggregate went from 166 down to 115. I tried different draft lengths. Nothing moved the four-stream number.

A newer llama.cpp build fixed it. The build alone was a small gain, 166 to 178 on four streams. Drafting on top of it gave most of the rest:

| | 1 stream | 2 streams | 4 streams |
|---|---|---|---|
| New build, no drafting | 57 | 104 | 178 |
| + MTP, draft length 2 | 126 | 161 | 259 |

Tokens per second; multi-stream values are summed across the concurrent streams. One stream is up 121%, four streams up about 46%. Draft acceptance averaged 63% over the first 16 production requests after the cutover.

## Change three: a different engine

In mid-October I switched the serving stack to TabbyAPI. EXL3 weights at 6 bits per weight, a DFlash2 draft model in 4-bit EXL3, and speculative decoding on top of ExLlamaV3.

The matched comparison is the relevant one: warm cache, four concurrent requests, roughly 22,000-token prompts. End-to-end tokens per second, summed across the four requests:

| Workload | llama.cpp + MTP | TabbyAPI | Gain |
|---|---:|---:|---:|
| Prose | 190 | 317 | 1.66x |
| Code | 246 | 582 | 2.36x |
| JSON | 260 | 722 | 2.78x |

Two caveats. These are benchmark rates for those workloads, not guarantees for individual agent tasks. And 22,000 tokens is my warm benchmark length. My real sessions run 30,000 to 60,000 tokens, where I have no matched number.

Before I adopted the engine I checked tools, reasoning control, vision and concurrent completions, plus a 600-second observation with 102 checks and 120 health samples. That is a compatibility check, not proof it stays reliable.

## The prefix cache

The llama.cpp benchmark also covered caching, and the result decided what I would not build. An 18,000-token prompt prefills in 5.5 seconds cold and 0.23 seconds with the prefix already in the KV cache. 24x. But prefill is 12% of my GPU time, and generation is 88%. LMCache, or vLLM for its caching, only chases that 12%. The levers are on the generation side: output length, thinking budget and context length.

Two more cache facts. A request not pinned to a slot still found its prefix in another slot and prefilled in 0.06 seconds. And on llama.cpp, the host RAM cache did not restore a session evicted from all slots.

## What the numbers do not cover

- **The draft path is not byte-identical.** One of two clean A/B prompts diverged from the baseline after 668 characters. I have not evaluated quality, and I have not checked whether DFlash2 output matches either. When an agent answers worse, I suspect the draft first.
- **The card is capped and hot.** 550 W, near thermal saturation in long generations, and nine GPU bus drops between October 7 and 20, two of them after the TabbyAPI switch. Every recovery took a reboot or a power cycle, and the cause is still open.
- **Contended requests are slow.** On the old llama.cpp setup with the other three slots busy, wall-clock rates fell to 5 to 8 tokens per second, thinking and prefill included.
- **The checks passed and the first real request still failed.** It came back 503 through my proxy, and retries turned it into a ten-minute wait. The old browser chat UI disappeared too, and I only noticed after the cutover.
- **Long-context exact answers are unqualified.** Four concurrent 261,888-token requests failed my exact-match check, each putting an extra word in front of the right answer. The prompt may have been ambiguous and I never reran it.

## What I would do next

The model change was a capability purchase: context and concurrency, paid for in speed. Speculative decoding on the newer llama.cpp build brought single-stream speed back near the old model's. The engine switch ran faster in the matched benchmark, and I still have no number for it at my real context length. Next time I want speed, I look at the serving engine and the draft model before the next model release.