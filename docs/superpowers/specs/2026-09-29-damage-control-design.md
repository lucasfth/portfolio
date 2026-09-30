# Damage Control — Mini-game Design

## Goal

Add a solo, daily sentence-constraint game to the portfolio. Players write one statement while 20 cumulative rules are revealed; a shared leaderboard compares each day's results.

## Player loop

1. Open `/game` and see the current daily challenge and leaderboard.
2. Start a run. A short absurd incident prompt sets the context for a public statement.
3. Type or edit one sentence. Each level reveals the next rule; every revealed rule remains active. All active rules are rechecked whenever the timed value changes.
4. Advance only when the current sentence satisfies all revealed rules. Complete all 20 to finish.
5. Submit a nickname and score. Rank by rules cleared, then elapsed time. The daily challenge is shared, while its live time value changes for everyone at the same UTC five-minute boundary.

The game is single-player. No chat, accounts, or multiplayer session.

## Rule and sentence validation

- Rule predicates are pure, deterministic functions over the submitted sentence and the challenge's UTC date/time. Rule descriptions state exactly what is checked; no LLM judges scores.
- The first daily challenge has these 20 distinct, mechanically checked rules:

  | ID | Rule |
  |---|---|
  | R01 | Contains the current UTC date in `YYYY-MM-DD` form. |
  | R02 | Starts with `On` followed by the weekday corresponding to R01's date. |
  | R03 | Contains the current UTC time rounded down to a five-minute bucket, in `HH:MM` form. This value changes every five minutes. |
  | R04 | Immediately before `incident`, contains `<English word for the sum of the four digits in R03>-minute`; for `14:35`, that is `thirteen-minute`. Depends on R03. Use a fixed zero-through-twenty lookup, covering every possible time bucket. |
  | R05 | Contains the anchor word `pigeon`. |
  | R06 | Immediately after `pigeon`, contains the number of vowels in that anchor (`3`). Depends on R05. |
  | R07 | Contains exactly two distinct words starting with the anchor's first letter (`p`). Depends on R05. |
  | R08 | The second word starting with that letter appears after the anchor and its number. Depends on R05–R07. |
  | R09 | Contains exactly 23 tokens. Words, integers, ISO dates, times, and hyphenated compounds each count as one; punctuation does not count. |
  | R10 | Contains exactly three commas. |
  | R11 | Contains exactly one semicolon. |
  | R12 | Contains the exact phrase `we regret` (case-insensitive). |
  | R13 | Contains the exact phrase `the delay` (case-insensitive). |
  | R14 | Contains the whole word `because` (case-insensitive). |
  | R15 | Contains the whole word `remains` (case-insensitive). |
  | R16 | Contains the whole word `serious` (case-insensitive). |
  | R17 | Contains the exact ordered phrase `but stable` (case-insensitive). |
  | R18 | Contains the exact ordered phrase `under review` (case-insensitive). |
  | R19 | Contains no apostrophe. |
  | R20 | Ends with exactly one period and no trailing text. |

- Satisfiability witness for 2026-09-29 at 14:35 UTC: **“On Tuesday, 2026-09-29, we regret the delay because pigeon 3 is patient; at 14:35, the thirteen-minute incident remains serious but stable under review.”** It is one grammatical statement with 23 tokens and passes all 20 rules.
- The witness template substitutes the current UTC date, weekday, and five-minute time bucket. Tests run the generated witness through the same production predicates for every five-minute bucket (all 288 values) and representative UTC dates, including date and year boundaries. A challenge is invalid if any active rule fails for its generated witness.
- The witness is a test/design fixture, not shown in the game UI. Player-entered prose is scored on explicit rules; the system does not claim to reliably judge arbitrary semantic coherence. A grammar checker may provide non-blocking advice, but never decides leaderboard eligibility.
- The UTC date determines the shared daily challenge and rule order; R03 updates every five minutes for all active players. R04 changes with R03. Previously cleared levels remain cleared, but the current sentence must satisfy every revealed rule again before advancing or finishing. A sentence from another date or time bucket therefore fails until edited.

## Scores and leaderboard

- Save one best result per nickname per day. Score is the highest level completed; elapsed time breaks ties.
- Convex is the durable source of truth, in a portfolio-specific deployment separate from CampusCup's Convex data.
- A Next.js Route Handler validates the submitted sentence history against each claimed progression step and writes scores through Convex server functions. Do not expose a Convex admin credential to the browser.
- Cache leaderboard reads at Vercel for 30 seconds with Next's tagged server cache around Convex `fetchQuery`. Successful score writes invalidate that day's tag; Convex remains authoritative.
- Leaderboard identity is a player-chosen nickname; no auth or personal profile data.

## Portfolio integration

- Add a dedicated `/game` route and a single discoverable link in the existing site navigation.
- Use the existing Next.js App Router, React, TypeScript, Tailwind styling, and theme conventions. No new client-side grammar service is required for score validation.

## Non-goals

- AI-based semantic or humor scoring.
- Anti-bot guarantees, accounts, social features, or a general-purpose puzzle editor.
- Using the CampusCup production Convex deployment for portfolio data.

## Acceptance checks

- A complete run has 20 sequential rules, and every later level still checks all earlier rules.
- Rule dependencies resolve from already-established values (date→weekday, time→digit sum, anchor→qualifier/initial-letter counts).
- A test proves each shipped daily challenge's witness sentence satisfies all 20 rules.
- The same UTC date produces the same rule order for every player; R03 changes at each UTC five-minute boundary and R04 recomputes from it. A prior date/bucket witness fails the current R01/R03 checks.
- The public leaderboard ranks valid submitted scores and reflects new submissions within 30 seconds.
- A player can finish the game alone without authentication.

## Operational prerequisite

A portfolio-specific Convex deployment and Vercel environment variables are required before the remote leaderboard can work. Do not reuse or deploy to CampusCup production. Deploying a Convex production backend requires Lucas's explicit approval.