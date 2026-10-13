---
title: nocturne
tagline: A night-time LLM API on spare laptops, paid in sats
description: An OpenAI-compatible LLM API served at night by up to four idle Mac laptops. No account, no card, no prompt logging. Pay per request over Lightning.
keywords: [LLM API, OpenAI-compatible, Lightning, Bitcoin, sats, pay per request, self-hosted, inference, no logging, privacy]
image: /images/nocturne.png
tags: [Python, FastAPI, llama.cpp, Lightning]
date: 2026-10
schemaType: WebAPI
---

# nocturne

Laptops sit idle most of the night. nocturne puts them to work: a small LLM API served by up to four Mac laptops that opens in the evening, closes in the morning and charges per request in sats.

**Try it:** [lucashanson.dk/nocturne](https://lucashanson.dk/nocturne)

## What you get

- **OpenAI-compatible.** Point any OpenAI client at it and change the base URL. Chat completions, streaming and thinking on or off.
- **No account, no card.** Get a key, top up over Lightning and pay only for the tokens you use.
- **No prompt logging.** Prompts and responses are not stored. Only token counts are kept, for billing.
- **Night hours.** Open roughly 17:30 to 08:00 Copenhagen time. Outside that window requests get `503` with a `Retry-After` header.

## Honest limits

- It is a small model on laptops, not a frontier model in a datacenter.
- Capacity varies. Machines join and leave during the night: a laptop drops out when someone uses it or its battery drops below 20%. The service page shows how many are serving right now.
- Each request runs entirely on one machine, at about 18 to 23 tokens per second, with one or two requests per machine at a time.
- No uptime promise. It is an experiment.

## How it works

A small coordinator takes requests and hands each one to an eligible worker. Workers only take jobs while idle, cool, and plugged in or above 20% battery, and they check in constantly. If a machine drops out mid-request, the request is retried once on another machine; streamed requests are not retried and stop with an error instead. Credits are reserved before a request runs and settled on the actual token count, so a failed request costs nothing. Prices are fixed per token in DKK and charged in sats at the current BTC rate. When Danish electricity gets expensive enough that a request would cost more in power than it earns, the service pauses instead of running at a loss.

Pricing, live status, the model name and the API reference are on the [service page](https://lucashanson.dk/nocturne).
