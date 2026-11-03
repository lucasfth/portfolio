# Radar and admin recovery

## Approved scope

Repair Supabase Radar publication and compact the authenticated admin overview. Lucas approved one combined rollout after tests and review, including alignment of the dedicated publisher token and one scheduled-service recovery run. PR-first applies; Lucas retains the merge decision. No shared inference restart, schedule change, database migration, GitHub-feed revival or unrelated credential repair is authorized.

## Diagnosis

- Public Radar retained the 29 October edition on 3 November.
- Freyr's enabled 05:07 Europe/Copenhagen timer executed daily on 30 October–3 November. Collection/ranking completed, but the authenticated Supabase publisher endpoint returned HTTP 401 on all five runs.
- The dedicated producer env file passes the existing strict format checks. Vercel's production token is sensitive/non-readable, so a mismatch cannot be proven by comparing values. Authorization is the confirmed failed boundary; aligning the receiver to the current producer credential is the proposed recovery, not a proven root cause until exercised.
- GitHub discovery produced partial/deadline-limited results and rendered every repository as a large card. The client refreshed only on sign-in or demand. One GraphQL field error incorrectly marked sibling data incomplete.
- Fleet retained stale working sessions under the current-active count. Retention is intentional; those observations need qualification and collapse, not deletion.

## Implemented design

- Bounded-concurrent GitHub repository batches, recent metadata priority, per-field error isolation, honest partial coverage, private/no-store API responses and collector observation timestamps preserved by caching.
- Compact native repository accordions, visible section shortcuts, three-row current fleet preview per host and separate stale/quiet/ended disclosures.
- Minute-based read-only refresh while visible, focus/visibility recovery, no overlapping flights, token-generation cancellation and last-good retention. Finance sync remains manual and independent.
- Supabase is the default Radar reader; explicitly configured legacy reads remain possible but are never an automatic fallback.
- Public/admin stale-edition qualification after a 36-hour daily grace period, preserving picks and source dates. Successful publication invalidates only `/radar`; denied/failed writes leave last-good caches/output unchanged.

## Release gates and runtime recovery

1. Verify exact candidate tests, typecheck, full build, secret scan and independent review. Browser acceptance remains separate from fixture tests.
2. Publish a scoped PR; obtain Lucas's merge decision, then rebase-merge only. Verify exact deployed tree and retain the pre-release deployment as rollback.
3. Transfer only the dedicated Freyr publisher token to Vercel's `RADAR_PUBLISH_TOKEN` production env through stdin/in-memory transport. Never print it, place it in source/arguments, broadly export env, or change Supabase credentials. Updating an env is not evidence a deployment loaded it.
4. Deploy the approved final source with that env. Preserve the producer config and current generation; do not replace the archived repository or reactivate its writer.
5. Invoke `loki-radar.service` once through the real scheduler, with no model-service restart. Record start/end/result and the public generation metadata; private picks remain private.
6. Verify matching generation timestamp and representative public content on `/radar` and authenticated `/admin`. If authorization still fails, stop rather than retrying collection or relaxing auth. A successful forced run does not prove the following natural 05:07 execution; record that separately.

No token alignment, source push, merge, deployment or forced producer run had occurred when this plan was written.
