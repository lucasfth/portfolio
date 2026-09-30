# Damage Control Implementation Plan

> **For agentic workers:** Execute this plan inline, task by task, using test-driven development. Do not commit unless Lucas asks.

**Goal:** Build a solo daily sentence-constraint game with 20 dependent rules, a five-minute rolling time constraint, a validated witness, and a shared Convex leaderboard.

**Architecture:** Keep puzzle generation and rule evaluation as pure TypeScript in `lib/game`; prove the dynamic witness against the production predicates. Store nickname scores in a portfolio-specific Convex deployment, expose them only through Next.js server Route Handlers, and cache leaderboard reads in Vercel's Next.js Data Cache with date-scoped tags.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, Node's built-in test runner (Node 26), Convex, Next.js `unstable_cache`/`revalidateTag`, Vercel Data Cache.

---

## Files and responsibilities

- Create `lib/game/rules.ts`: the 20 pure rule predicates, date/time calculations, tokenization, and rule evaluation results.
- Create `lib/game/challenge.ts`: deterministic daily challenge values, five-minute time buckets, witness sentence construction, and progression validation.
- Create `lib/game/rules.test.mjs` and `lib/game/challenge.test.mjs`: Node tests importing the TypeScript modules; cover rule boundaries, dependencies, date changes, all 288 daily time buckets, and the witness.
- Modify `package.json` and `package-lock.json`: add `npm test` using `node --test lib/game/*.test.mjs`; add Convex SDK.
- Create `convex/schema.ts`, `convex/game.ts`, and `convex/leaderboard.ts`: indexed score table, internal leaderboard query, best-score mutation, and pure score ordering/replacement logic.
- Create `convex/leaderboard.test.mjs`: test best-score replacement and leaderboard order.
- Create `lib/game/convex.ts`: server-only Convex client and typed references; require server environment variables and keep admin credentials out of client bundles.
- Create `app/api/game/leaderboard/route.ts`: fetch the date-scoped top scores from Convex through a tagged, 30-second `unstable_cache` entry.
- Create `app/api/game/scores/route.ts` and `lib/game/validateSubmission.ts`: validate all submitted level/sentence/timestamp steps against the challenge rules, write the best result to Convex, and call `revalidateTag` for that date.
- Create `lib/game/validateSubmission.test.mjs`: test valid and invalid score histories.
- Create `app/game/page.tsx` and `app/game/GameClient.tsx`: page shell and solo run UI, including the 20 cumulative rules, the live five-minute value, progress, nickname submission, and leaderboard.
- Modify `components/Header.tsx` and `components/Footer.tsx`: add `/game` navigation links.

## Task 1: Rule engine with deterministic predicates

**Files:**
- Create: `lib/game/rules.test.mjs`
- Create: `lib/game/rules.ts`
- Modify: `package.json`
- Modify: `package-lock.json`

- [ ] **Step 1: Write a failing test for the rule catalog and witness fixture.**

```js
import assert from "node:assert/strict";
import test from "node:test";
import { RULES, evaluateRules } from "./rules.ts";

const witness =
  "On Tuesday, 2026-09-29, we regret the delay because pigeon 3 is patient; at 14:35, the thirteen-minute incident remains serious but stable under review.";

test("the daily rule catalog has 20 ordered, unique rules", () => {
  assert.equal(RULES.length, 20);
  assert.equal(new Set(RULES.map(({ id }) => id)).size, 20);
});

test("the approved witness passes all rules at its date and time", () => {
  const result = evaluateRules(witness, {
    now: new Date("2026-09-29T14:35:00.000Z"),
  });
  assert.deepEqual(result.filter(({ passed }) => !passed), []);
});
```

- [ ] **Step 2: Run the new test and confirm the expected missing-module failure.**

Run: `node --test lib/game/rules.test.mjs`
Expected: FAIL because `./rules.ts` does not exist yet.

- [ ] **Step 3: Add the test script and Convex SDK dependency.**

Run: `npm install convex`

Set `package.json`'s test script to `node --test lib/game/*.test.mjs`; the shell glob then includes test files as they are added.

- [ ] **Step 4: Implement the minimal pure rule engine.**

Export `RULES` in R01–R20 order and `evaluateRules(sentence, { now })`. Define each rule as `{ id, description, test(sentence, context) }`; implement a tokenizer that treats ISO dates, `HH:MM` times, integers, words, and hyphenated words as one token and ignores punctuation. Use a fixed English-number lookup from zero through twenty for R04. R02 derives the weekday from R01's UTC date; R03 floors UTC minutes to a five-minute bucket; R04 derives its number from R03; R06–R08 derive their checks from the `pigeon` anchor. Normalize only case-insensitive rules; preserve exact casing for R01/R02/R03 values and the sentence prefix.

- [ ] **Step 5: Run the targeted test and confirm it passes.**

Run: `node --test lib/game/rules.test.mjs`
Expected: PASS; the witness has 23 tokens, three commas, one semicolon, one final period, and no failed rule IDs.

## Task 2: Daily challenge and satisfiability proof

**Files:**
- Create: `lib/game/challenge.test.mjs`
- Create: `lib/game/challenge.ts`
- Modify: `lib/game/rules.test.mjs`

- [ ] **Step 1: Write failing tests for time rollover, dependent values, and satisfiable generated witnesses.**

Test these observable cases: `14:39Z` maps to bucket `14:35`; `14:40Z` maps to `14:40`; the R04 word changes when the sum changes; every integer sum from 0 through 20 has an English spelling; a prior bucket's witness fails R03 and R04 in the next bucket; and the previous UTC date's witness fails R01/R02 after midnight. Loop over every UTC five-minute bucket (`00:00` through `23:55`) for representative dates including `2026-09-29`, a leap day, and a year boundary. For every case, assert 20 rule results and zero failures for `createWitness(date, bucket)`.

- [ ] **Step 2: Run the targeted test and confirm it fails before implementation.**

Run: `node --test lib/game/challenge.test.mjs`
Expected: FAIL because challenge generation and witness helpers do not exist.

- [ ] **Step 3: Implement challenge helpers.**

Export `getTimeBucket(date)`, `getUtcDate(date)`, `getWeekday(date)`, `createWitness(date, bucket)`, and `createChallenge(now)`. `createChallenge` returns only public challenge values and rule descriptions; do not expose the witness in the game UI. Ensure `createWitness` uses the same number-word lookup and tokenization as the production validators.

- [ ] **Step 4: Run both targeted rule and challenge tests.**

Run: `node --test lib/game/rules.test.mjs lib/game/challenge.test.mjs`
Expected: PASS for all 288 buckets on each representative UTC date, including date rollover.

## Task 3: Convex score storage

**Files:**
- Create: `convex/leaderboard.test.mjs`
- Create: `convex/leaderboard.ts`
- Create: `convex/schema.ts`
- Create: `convex/game.ts`
- Create: `lib/game/convex.ts`

- [ ] **Step 1: Write failing score-order and best-score tests.**

Assert that a higher level replaces a lower one, an equal level only replaces with a lower elapsed time, a worse repeat does not replace the saved row, and rankings sort level descending then elapsed time ascending with a deterministic nickname tie-break.

- [ ] **Step 2: Run the tests and confirm the expected failure.**

Run: `node --test convex/leaderboard.test.mjs`
Expected: FAIL because the pure score helpers do not exist.

- [ ] **Step 3: Implement pure score helpers.**

Export `shouldReplaceBest(previous, next)` and `rankScores(rows, limit = 50)` from `convex/leaderboard.ts`. Keep comparison behavior independent of Convex database APIs so it can be tested directly and reused by the mutation.

- [ ] **Step 4: Define the score record contract.**

Store `date`, normalized nickname, display nickname, highest validated level, elapsed milliseconds, and server creation time. Index by date and normalized nickname for best-score replacement; query only the requested date and return the top 50 ordered by level descending then elapsed time ascending.

- [ ] **Step 5: Implement internal Convex query and mutation.**

Use `internalQuery` to list a date's top scores and `internalMutation` to insert or replace a nickname's score only when `shouldReplaceBest` returns true. Validate data types and bounded field lengths in Convex validators. Do not expose write functions publicly.

- [ ] **Step 6: Configure generated Convex references and a server-only client.**

Use Convex CLI code generation for `_generated` files. `lib/game/convex.ts` must fail with a clear server configuration error when the portfolio Convex URL/admin key is missing, construct a fresh `ConvexHttpClient` per request, set its admin auth, and export only internal query/mutation calls. Never prefix the admin key with `NEXT_PUBLIC_`.

- [ ] **Step 7: Verify schema and function typing.**

Run: `npx convex codegen`
Expected: generated API references include the internal score query/mutation and TypeScript accepts the score record shape.

## Task 4: Server routes and Vercel Data Cache

**Files:**
- Create: `app/api/game/leaderboard/route.ts`
- Create: `app/api/game/scores/route.ts`
- Create: `lib/game/validateSubmission.ts`
- Create: `lib/game/validateSubmission.test.mjs`

- [ ] **Step 1: Add pure submission-validation behavior tests.**

Cover a valid 20-step history, an invalid sentence at one level, skipped/reordered levels, a stale five-minute bucket, a previous-date submission, malformed/oversized nickname, and invalid elapsed time. Derive score from server-validated progress; do not trust a client-supplied score.

- [ ] **Step 2: Run the tests and confirm failure before writing routes.**

Run: `node --test lib/game/validateSubmission.test.mjs`
Expected: FAIL because the validation module is not implemented.

- [ ] **Step 3: Implement deterministic submission validation.**

Each history entry carries the sentence and the UTC date/time context at which that level was passed. Validate sequential level numbers, rule prefixes, daily date, and the R03/R04 values for each recorded five-minute bucket. Return the highest valid level and its elapsed time; reject malformed, impossible, or out-of-order histories.

- [ ] **Step 4: Implement leaderboard GET with Vercel's persistent Data Cache.**

Read the requested UTC date (default current UTC date), then call Convex through `unstable_cache` keyed by that date with `revalidate: 30` and tag `game-leaderboard-${date}`. Validate the date format before querying. Return a JSON leaderboard with cacheable public response headers.

- [ ] **Step 5: Implement score POST.**

Validate the request shape and history on the server, derive score rather than accepting one, call the internal Convex mutation, then `revalidateTag("game-leaderboard-${date}", { expire: 0 })`. Return the saved rank data; never expose Convex admin credentials or internal function references in the response.

- [ ] **Step 6: Run rule, challenge, score-order, and submission tests.**

Run: `npm test`
Expected: PASS; invalid histories cannot produce leaderboard scores, best-score replacement is stable, and date/time rules remain deterministic.


## Task 5: `/game` UI and navigation

**Files:**
- Create: `app/game/page.tsx`
- Create: `app/game/GameClient.tsx`
- Modify: `components/Header.tsx`
- Modify: `components/Footer.tsx`

- [ ] **Step 1: Build the route shell and game interface using existing theme/Tailwind conventions.**

Show the incident prompt, a single sentence editor, current level out of 20, the visible cumulative rule list with pass/fail status, and a UTC five-minute countdown. On each boundary, refresh the challenge time context and re-evaluate every revealed rule without resetting completed-level progress.

- [ ] **Step 2: Implement progression and completion behavior.**

Require each current sentence to satisfy all revealed rules before unlocking the next level. Submit a sentence/time history to the score route; show field-level invalid-rule explanations and retain editable text. At level 20, ask for a nickname, submit the score, and show the current daily leaderboard.

- [ ] **Step 3: Add discoverable links.**

Add `/game` to the existing `NAV_ITEMS` in `components/Header.tsx` and `NAV` in `components/Footer.tsx` without changing other navigation behavior.

- [ ] **Step 4: Run the production build.**

Run: `npm run build`
Expected: Next build and RSS generation complete without errors.

## Task 6: Runtime verification

- [ ] Start the Next app and the portfolio-specific Convex development deployment using Lucas's Convex account; do not deploy to CampusCup production.
- [ ] In a real browser, start a run, pass dependent rule levels, cross a five-minute boundary, confirm R03/R04 invalidate the old sentence while completed progress remains, and complete all 20 with the generated witness.
- [ ] Submit a nickname; confirm it appears on `/game` leaderboard, the score route rejects a stale/invalid submission, and a cache revalidation makes the updated board visible.
- [ ] Verify that omitting Convex environment variables produces an explicit server-side setup error rather than a fake/local leaderboard.
- [ ] Update existing project docs with run/setup instructions only if the repository has an appropriate README section; otherwise keep the approved design spec as the feature documentation.

## External setup and safety

The code expects a portfolio-specific Convex development/production deployment and server-only Convex URL/admin key environment variables. Do not reuse CampusCup production. Creating/deploying a production Convex deployment or deploying the website requires Lucas's explicit approval; no deploy command is part of this plan.