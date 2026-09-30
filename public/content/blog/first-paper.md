---
title: "My first paper: describing hand gestures in structured natural language"
description: "I published my first paper at the ECCV 2026 HuMoWM workshop. It is about RB-GDA, a structured natural-language schema for describing hand gestures, and how it improves semantic quality and command-inference accuracy."
date: 2026-09-30
image: /images/urban/DSCF4550.jpg
keywords: [paper, ECCV 2026, HuMoWM, hand gestures, natural language, RB-GDA, multimodal LLMs, human motion]
---

I published my first paper. It is titled "Structured Natural Language as a Representation for Human Hand Gestures" and it was accepted to the HuMoWM workshop at ECCV 2026, together with Elizabete Munzlinger, Mads Aqqalu Roager, Ted Vucurevich, Dan Witzner Hansen and Fabricio Batista Narcizo.

You can read it on [OpenReview](https://openreview.net/forum?id=97vsNsPXVC).

---

## The problem

Hand gestures carry meaning, and that meaning is hard to represent in a form that both a human and a machine can work with.

The usual shortcuts are lossy. A label like "peace" is compact, but it collapses a lot of observable information into one word. Two people can make the same labeled gesture with very different finger positions, orientations, and speeds, and the label throws all of that away.

Meanwhile, a full video of the gesture is rich, but it is not something you can reason about directly in language, search, or describe to a model that is not a vision model.

## The idea

The paper introduces RB-GDA, a structured natural-language schema for describing hand gestures. Instead of a single label, or a raw video, a gesture is described as a set of structured statements in natural language that capture the observable parts of it.

The point is that the representation stays human-interpretable while becoming machine-usable. You can read it, and you can feed it to a multimodal large language model.

We show that this structured description improves both the semantic quality of the gesture description and the accuracy of command inference over a free-form description, where a model is simply asked to describe the gesture in its own words.

## Where the data came from

The paper builds on the hand-gesture dataset I collected during my [bachelor project](/projects/bachelor) on hand-gesture-based interaction in hybrid meetings. That collection was quite large, and it is the substrate the whole paper runs on.

So this is, in a sense, the second life of that dataset. The bachelor project was about recognizing gestures in meetings; this work is about representing them in a form that is useful beyond recognition, for reasoning and description.

## What I used the agent for

I want to be straight about the role my [self-hosted agent](/blog/self-hosted-ai-agents) played, because it is smaller than you might expect.

The paper was not written by the agent. I did not hand it a prompt and get a manuscript back. What it actually helped with was the surrounding work: searching the literature, keeping track of references, drafting and rewriting sections, managing notes, and the general scheduling and follow-up that a submission drags behind it.

That is the honest version of "using AI for work". It is not the headline act. It is the scaffolding. And the scaffolding is where most of the time goes.

## A note on the framing

I am writing this both to mark the milestone and because the framing matters to me. This is a paper on human motion and representation, and the core contribution is the schema and the evaluation, not the tooling around it.

If you work on gesture recognition, multimodal models, or representations that sit between vision and language, I would genuinely appreciate you reading it. The OpenReview page has the PDF and the full metadata.

## Links

- [OpenReview forum and PDF](https://openreview.net/forum?id=97vsNsPXVC)
- [HuMoWM workshop at ECCV 2026](https://openreview.net/group?id=thecvf.com/ECCV/2026/Workshop/HuMoWM)
- [My ORCID](https://orcid.org/0009-0001-0166-3637)
- [The bachelor project this builds on](/projects/bachelor)
