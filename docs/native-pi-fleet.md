# Native Pi fleet reporting

Private latest-session status for Gimle and the personal MacBook Pro. Base reporting is deployed; this activity enrichment requires separate review/activation. Pulling config alone does not create trust or a live path. No Herdr, terminal control, OSC support, finance service, SSH or company host is involved.

## Architecture and privacy

Native Pi extension events -> HTTPS `POST /api/admin/fleet/report` -> Supabase transactional `fleet_report` -> admin-authenticated `GET /api/admin/fleet` -> existing `/admin` panel. Native workers outside TUI registration are included when launched with the reporter extension. The reporter must be enabled/configured independently on each personal host.

Wire v1 base keys: `schemaVersion`, `hostId`, `sessionId`, `label`, `state`, `observedAt`, `lastToolCompletedAt`, `startedAt`, `sequence`. Enriched producers add paired optional `workingSince` and `toolsInFlight`. Old Mac reporters omit both and remain valid. Working requires a canonical work-start timestamp between startedAt and observedAt and integer tool count 0–256; all other states require null/0. Partial pairs, unknown fields and contradictory values are rejected. `sessionId` is the first 32 lowercase hex characters of SHA256(native session ID). No native ID/path, repository, prompt, title, tool IDs/names/arguments/results or exceptions are accepted. Automatic session names currently contain first-prompt excerpts, so title enrichment is deliberately blocked; `/fleet-name` is an operator-approved label and default `Pi session <8hex>` remains the fallback.

Labels: trimmed, nonempty, at most 80 ASCII characters; allow only `A-Z a-z 0-9`, ordinary space, period, underscore and hyphen (`^[A-Za-z0-9 ._-]+$`), with no leading/trailing spaces. Producer, TypeScript receiver and PostgreSQL use the same predicate; SQL pins regex collation to `C`. Emoji, other Unicode, controls and slash are rejected. A label is not a sanitized prompt/title: never generate it automatically from private content.

## One-time activation gates (not performed by source publication)

1. For a fresh installation, approve/apply base `20261029090000_native_pi_fleet.sql` using the canonical migration process. For this enrichment, separately approve/apply **`20261029130000_fleet_activity.sql` before activating new producers**, then deploy the compatible receiver. It replaces only fleet_report validation, preserving schema/grants/RLS/storage ordering. Check actual migration history: the original base was registered remotely under a generated version; never blindly reapply it by filename. No unrelated schema/history fixes.
2. Separately approve server environment provisioning: existing `SUPABASE_URL`, `SUPABASE_SECRET_KEY` service-role access, plus **distinct dedicated** `FLEET_PRODUCER_GIMLE_TOKEN` and `FLEET_PRODUCER_MACBOOK_TOKEN`. Set only hosts being provisioned. A missing host token grants no producer access; invalid/duplicate values fail producer authentication closed. Use random base64url secrets of at least 32 characters; never reuse admin, finance, Supabase, model-provider or other application tokens.
3. Separately approve deployment. The server must be able to call the approved Supabase project; no filesystem/socket transport exists. Confirm actual authenticated GET behavior, fresh/stale/ended/failure UI and non-admin denial after deployment. No production success is implied by local tests.
4. Once per new host, follow config `configs/pi/fleet.md` for owned 0600 private `fleet.json`. Known tracked hostnames support **token-only** `{token}`; non-secret endpoint/host mapping lives in source. Existing full `{endpoint,hostId,token}` files continue unchanged; partial overrides and unknown token-only hosts fail closed. Do not pass tokens in CLI arguments/logs/Git/notes/PRs. Existing trusted hosts need no new setup/secret/Nix activation; next normal managed Pi launch adopts updated source. Never restart user sessions automatically or require MacBook SSH.
5. Run `/fleet-status` locally and assign `/fleet-name <safe display label>`. Verify actual server receipt in signed-in admin. Missing producer config disables reporting without failing normal agent work.

Repeat updates use the config repository's normal pull/setup/next-launch workflow; secrets remain private and are not overwritten. No credential setup helper is part of this portfolio change.

## Receiver behavior

- Only POST; dedicated host Bearer token authenticates **before body consumption or storage**. SHA256 digests compared with `timingSafeEqual`; tokens never grant reads or admin rights. Payload host must match mapped credential. No redirects or arbitrary remote execution.
- JSON content type, streaming 8-KiB byte cap, exact fields, canonical timestamp validation, nonnegative safe integer sequence. `observedAt` must be between receiver time minus 5 minutes and plus 30 seconds; `startedAt <= observedAt`, started no more than 366 days ago; tool timestamp <= observedAt. Large streams are cancelled. Server storage RPC times out after five seconds.
- HTTP 202 accepted, 409 stale/duplicate, 429 rate/capacity, 400 invalid, 413 oversized, 401 invalid/missing producer credentials, 403 peer-host mismatch, 503 storage unavailable. Errors are generic, never database detail. Every response is private/no-store.
- Database fixed host-row locks serialize each host across serverless instances. At most 240 valid authenticated report attempts/minute/host; stale reports count. This is a storage admission budget, not network-edge DDoS protection. Invalid/unauthenticated traffic needs deployment/platform limits if exposed to hostile volume; no process-local map is claimed to enforce distributed rate limits.
- Latest row per host/session, compared by `(startedAt,sequence)` with nondecreasing source observation. An ended reporter instance cannot resume; a newer reporter instance can. Preserve last completed-tool timestamp across null heartbeats/reloads. Server receipt is measured after lock acquisition.
- At most 64 retained sessions per host. No history table. Ended sessions expire after 24 hours, others after seven days. Writes/read RPC prune expired rows without a scheduler; without traffic expired data may remain physically until next RPC, but storage stays capped. Host receipt metadata is two bounded rows, preserving previously-seen vs never-seen after session expiry. High churn at capacity gives 429 rather than evicting another live session.
- RLS enabled; all anon/authenticated raw-table access and RPC execution revoked, including browser writes. Reads go only through existing `adminUser` authorization and service-only snapshot RPC. Admin JWT does not bypass denied raw writes.

## UI semantics

Operator label heading and stable short reference; automatic prompt-derived names are not collected. Source workingSince and toolsInFlight distinguish **Responding / Running tools** only for enriched working observations; old wire says legacy working. Idle/Error/Unknown/Ended reuse existing scheduler semantic colors with light/dark equivalents and plain text, not color-only meaning. Working sessions sort first stably; ended rows use a closed native details/summary disclosure, keyboard accessible without custom controls. Stale/clock-skew states read **Last reported:** independently of color. Source observed/backend receipt/latest tool complete remain distinct. Freshness uses both source/receipt (120 seconds), never HTTP read time. Unavailable reads/token refresh retain previous values with explicit warning. Completed tools can fail; heartbeat is not progress or success. No percentages, terminal controls or remote actions.

## Local checks

```sh
node --disable-warning=MODULE_TYPELESS_PACKAGE_JSON --test tests/fleet*.test.mjs
npm run typecheck
npm run build
# Existing HTML tests require finished build, not concurrent build:
node --disable-warning=MODULE_TYPELESS_PACKAGE_JSON --test tests/*.test.mjs lib/game/*.test.mjs
# Only an explicit isolated PostgreSQL database; never load production .env:
FLEET_TEST_DATABASE_URL=postgresql://127.0.0.1:<test-port>/<test-db> \
  node --disable-warning=MODULE_TYPELESS_PACKAGE_JSON --test supabase/tests/fleet.mjs
```

Create synthetic roles anon/authenticated/service_role in an explicitly isolated PostgreSQL cluster; apply base then activity migration before SQL tests. FLEET_TEST_PSQL selects an existing psql binary, TMPDIR must be owned scratch. Verify old/new strict contract, SQL/TS label and activity parity, RLS/grants/search_path, atomic ordering/rates/capacity/retention. No production fallback. The canonical build regenerates public/rss.xml; discard only unrelated generated timestamp churn.

SDK lifecycle tests use scripted model responses and isolated loopback transport; SQL tests use real isolated PostgreSQL, and compiled component/effect tests cover retained errors/token races/semantic disclosure rendering. Synthetic fork/resume reason emissions are not genuine session replacement proof. No browser attachment, signed-in pixel proof, production mutation or MacBook access is part of local enrichment verification. Actual new signed-in UI and rollout are separate gates.
