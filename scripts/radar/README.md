# Radar producer

Maintained producer source for the personal Radar cutover. The daily Freyr user timer stays at **05:07 Copenhagen time**.

## Production

- Install the files listed in `SHA256SUMS` to `/home/lucas/loki-radar`; check every installed hash.
- Preserve `news-interests.md`, private output and rollback outside Git. Never copy them into this repository.
- Keep the PEP 723 header and sibling Python modules together. `run.sh` runs `uv run -q radar.py`.
- User service drop-in: `RADAR_PUBLICATION_SOURCE=supabase`, `RADAR_LEGACY_GITHUB_PUBLISH=0`, `RADAR_X=0`. Never enable the legacy GitHub writer after archival.
- The two-key private publisher file is `/home/lucas/.config/loki-radar/radar-publisher.env`, mode `0600`. Its URL must be exactly `https://lucashanson.dk/api/radar/publish`; its dedicated token stays outside Git.
- Public edition publication must succeed before `output/current` changes. Private JSON never reaches the publisher. Output directories are `0700`, JSON files `0600`.
- Existing rollback: `/home/lucas/loki-radar/.rollback-20261029-161602`. Rolling source back also requires restoring an appropriate service mode; do not silently reactivate GitHub publishing.

## Gimle briefing handoff

`python3 scripts/radar/sync_briefing.py` pulls only the two files from a pinned Freyr generation over SSH, validates them and atomically updates the private Gimle-local store. It never copies the interest profile, extracts archive paths or prints private picks.

The included LaunchAgent is an **unloaded proposal**, not activated configuration: one daily sync at 05:45 Copenhagen time, after the 05:07 Freyr collection. It requires explicit approval before installation/loading. The current one-time sync proves the briefing reader but does not establish future automatic freshness.

## Tests

```sh
cd scripts/radar
python3 -m unittest -v test_nostr_source
python3 -m unittest -v test_radar_publication
bash -n run.sh
```

`test_radar_publication.py` currently loads the morning-briefing reader from `/Users/gimle/loki-data/live/hermes/scripts/cron_native.py`. That integration test requires the Gimle checkout; it is not a portable fixture. The producer itself has no dependency on that path. The Nostr tests require the dependencies declared in the collector PEP 723 header.

The retained GitHub fallback contains legacy token-in-URL behavior and is not approved for activation. The production Supabase mode never enters it.
