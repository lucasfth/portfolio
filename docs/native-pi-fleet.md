# Native Pi fleet reporting

Private latest-session status for Gimle and the personal MacBook Pro. This feature is **source only until the migration, environment and dedicated producer setup are explicitly approved and completed**. Pulling config alone does not create a live data path. No Herdr, terminal control, OSC support, finance service, SSH or company host is involved.

## Architecture and privacy

Native Pi extension events -> HTTPS `POST /api/admin/fleet/report` -> Supabase transactional `fleet_report` -> admin-authenticated `GET /api/admin/fleet` -> existing `/admin` panel. Native workers outside TUI registration are included when launched with the reporter extension. The reporter must be enabled/configured independently on each personal host.

Wire v1 exact keys: `schemaVersion`, `hostId`, `sessionId`, `label`, `state`, `observedAt`, `lastToolCompletedAt`, `startedAt`, `sequence`. `sessionId` is the first 32 lowercase hex characters of SHA256(native session ID). No native ID/path, repository, prompt, terminal title, tool arguments/results or exception content is accepted. Do not put private information in labels. `/fleet-name` is an explicit operator-approved label; default `Pi session <8hex>` remains recognizable only as a reference until named.

Labels: trimmed, nonempty, at most 80 ASCII characters; allow only `A-Z a-z 0-9`, ordinary space, period, underscore and hyphen (`^[A-Za-z0-9 ._-]+$`), with no leading/trailing spaces. Producer, TypeScript receiver and PostgreSQL use the same predicate; SQL pins regex collation to `C`. Emoji, other Unicode, controls and slash are rejected. A label is not a sanitized prompt/title: never generate it automatically from private content.

## One-time activation gates (not performed by source publication)

1. Independently review source, SQL privileges and the exact published revisions. Apply `supabase/migrations/20261029090000_native_pi_fleet.sql` **only after production migration approval** using the existing migration process. It creates only fleet tables/functions; no unrelated data changes.
2. Separately approve server environment provisioning: existing `SUPABASE_URL`, `SUPABASE_SECRET_KEY` service-role access, plus **distinct dedicated** `FLEET_PRODUCER_GIMLE_TOKEN` and `FLEET_PRODUCER_MACBOOK_TOKEN`. Set only hosts being provisioned. A missing host token grants no producer access; invalid/duplicate values fail producer authentication closed. Use random base64url secrets of at least 32 characters; never reuse admin, finance, Supabase, model-provider or other application tokens.
3. Separately approve deployment. The server must be able to call the approved Supabase project; no filesystem/socket transport exists. Confirm actual authenticated GET behavior, fresh/stale/ended/failure UI and non-admin denial after deployment. No production success is implied by local tests.
4. Once per host, follow config repository `configs/pi/fleet.md` to create private owned 0600 `fleet.json` with HTTPS endpoint `/api/admin/fleet/report`, fixed host ID and that host's dedicated secret. Do not pass tokens in CLI arguments, logs, Git, notes or PRs. Outbound HTTPS means MacBook SSH access is unnecessary. Next normal Pi launch loads the configured extension. Existing user sessions need an operator-directed reload/relaunch; this feature never restarts them.
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

Explicit labels and stable short references; reported state separate from source observation, backend receipt and latest completed tool. Freshness uses both observation and receipt (120 seconds), not just HTTP read time. Reporter `ended` is distinct from stale. An unavailable source retains last received values with an explicit warning; never-seen is not a healthy empty fleet. Heartbeat means process liveness, not task progress. Completed tools can fail; quiet stale sessions are not called stalled or successful. UI has no remote controls, artificial completion percentage, OSC field or success inference.

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

Create synthetic roles `anon`, `authenticated`, `service_role` in the isolated database and apply the migration source there before SQL tests. `FLEET_TEST_PSQL` can select an existing `psql` binary. Set `TMPDIR` to owned task scratch for all test commands. Tests verify grants, independently expected ASCII alphabet/trim/length and rejected Unicode/control cases against both TS and SQL, atomic ordering/concurrent rates, capacity and pruning. PostgreSQL UTF-8 cannot represent NUL or unpaired surrogates; TypeScript rejects these separately. No test DB fallback exists in shipping paths. The canonical build regenerates `public/rss.xml`; discard that unrelated generated timestamp diff before committing.

Task handoff separately records actual native SDK lifecycle -> real HTTP receiver -> Supabase client protocol shim -> isolated PostgreSQL RPC -> authenticated reader -> actual component static markup. Scripted model/auth and a protocol shim are not production Supabase or signed-in browser proof. Existing local `/admin` lacks Supabase browser environment; actual authenticated rendering remains a separate gate.
