---
title: The code they write
description: "I sent a draft to four models. Three said fine. One said it reads machine-written. Code review works the same trick, except the code ships to production."
keywords: [AI code, software engineering, code review, LLM, technical debt, agent workflow]
date: 2026-11-02
imageLight: /figures/code-slop-mbp13-light.png
imageDark: /figures/code-slop-mbp13-dark.png
imageWidth: 1536
imageHeight: 1024
---
I sent a draft to four different models. Three said fine. One said it reads machine-written, so I rewrote it in my own voice.

It turned out code review works the same trick. Something else reads the output and tells me it is fine. The model writes the diff. Other models judge it. I stand over all of it trying to decide what the repo should actually contain. The difference is that the draft only had to be readable, and the code has to be right in the corners nobody asked it about.

## The code is good, in the way that is the problem

The agent diffs are clean. The names are better than mine. The tests are green. It looks like somebody with more years did the work.

That is what makes it dangerous. The first look says fine, and the first look is where the bad stuff gets through.

## My opinions, up front

- **The model writes from patterns, not from your product.** Everything on the internet is in the training. Your business is not.
- **A green suite is the machine's favorite lie.** A test that never failed proves nothing.
- **A unanimous review is a chorus.** Four models agreeing is one opinion, shared.
- **Prototype is good enough, production is a debt.** The line is where the file lives.

## What the model cannot see

The part it cannot do is the part before the first line. What does the business do today. Where is it going. What does this need to hold.

Watch the answer on something small. `MAX_RETRIES = 3` is fine in one service and wrong in the next, and the difference is not in the language. The answer is what the system is for, and what a retry costs there.

That is the part I keep. I understand the business, where it is now and where it wants to be headed, and I make sure the infra I design can handle it. That context is not in any training data, and it is not in the diff either. So the writing gets easier every quarter, and the understanding is the only half left.

## Two kinds of bad

When it goes wrong, it goes wrong in one of two ways.

The first kind runs. It compiles, and it passes the tests, and the corner nobody thought to ask for, the empty list, the second call with the same id, simply never happens in the demo. I caught one of these in an overnight job recently. A key the job wrote through had been rotated on the server side. The job kept running and the lines kept landing, and the destination had quietly moved. You only see it when you check the outcome, not the report.

So the rule I use for the edges is the boring one. The key would have survived it anyway. I write the test first, I watch it fail, then I fix it. A test that has never gone red is not a test. It is a decoration.

The second kind never needed to exist. It is the diff nobody needs. The rename that changes nothing. The abstraction a step ahead of the use case. The button that became a strategy and an interface, for a second button that does not exist. It reads like productive work, it gets committed, and a month later it is the baseline the new code has to sit on. A model that has never seen the product cannot tell you that, because it does not know what the product is.

## What I do now

Huginn is the desk agent. It writes in the repos. I run the code in the real system, on the real paths, not just the happy path. I run the same diff through several models myself, and the unanimous ones get the longer stare. Three of the four said fine on that opening draft, and it was the fourth that made me look harder, not stop.

For the big ones the order flips. I design first, on paper when it has to be. Then Huginn writes as much as it can, and I keep the prototype part honest. A script for a week is a script, and fast and ugly and thrown away is a good trade. The line is where the file lives. In a scratch folder it is a script. In something people use it is a debt. Code in something people use gets the same review I would give a junior. The junior just happens to be faster than me.

## What I still do not know

- **I cannot measure how much I skip when I read a diff.** The eye that completes a plausible line is the same eye that approves it. I review slower now, but that is a habit, not a measurement.
- **Weighting the arguer is a heuristic.** I trust the models that disagree more than the ones that agree. I do not know how often that is right.
- **The business context does not transfer well.** The conventions flow in files, and that works. The business does not. I hold it, and the agent gets a sentence from me. I do not know the right size of that sentence yet.

Writing gets cheaper, and I take that. The understanding is the half that is left, and for now it is the half only one of us can do. What the business is, where it is going, and whether the code in front of me is the code it needs.

I do not think that changes within the year.

This is the follow-up to [my phone-brain post](/blog/self-hosted-ai-agents), where I wrote that a green log line is not proof, and you check the outcome, not the report. This post is that sentence applied to code.