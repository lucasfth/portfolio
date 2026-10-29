-- Run with psql against an isolated Supabase local DB after applying the migration.
-- This test file is never run against the production project.
begin;

insert into public.radar_publication (edition) values (
  '{"generated":"2026-10-28T04:11:24+00:00","count_scanned":1,"items":[{"title":"Example","url":"https://example.com/item","source":"Example source","summary":"A public summary.","tag":"agents","score":7,"kind":"article","ts":1793124473}]}'::jsonb
 ) on conflict (singleton) do update set edition = excluded.edition;

-- A rejected edition must not replace the last good singleton.
do $$
begin
  begin
    update public.radar_publication
       set edition = '{"generated":"2026-10-28T04:11:24+00:00","count_scanned":1,"private":{"items":["secret"]},"items":[]}'::jsonb;
    raise exception 'private top-level data unexpectedly accepted';
  exception when check_violation then null;
  end;

  begin
    update public.radar_publication
       set edition = '{"generated":"2026-10-28T04:11:24+00:00","count_scanned":1,"items":[{"title":"x","url":"javascript:alert(1)","source":"s","summary":"x","tag":"agents","score":7,"kind":"article","ts":1}]}'::jsonb;
    raise exception 'non-http URL unexpectedly accepted';
  exception when check_violation then null;
  end;

  begin
    update public.radar_publication
       set edition = '{"generated":"2026-10-28T04:11:24+00:00","count_scanned":1,"items":[{"title":"x","url":"https://example.com","source":"s","summary":"x","tag":"agents","score":7,"kind":"article","ts":1,"internal":"private"}]}'::jsonb;
    raise exception 'unknown item key unexpectedly accepted';
  exception when check_violation then null;
  end;

  begin
    update public.radar_publication
       set edition = '{"generated":"2026-10-28T04:11:24+00:00","count_scanned":1,"items":[{"title":"x","url":"https://example.com","source":"s","summary":"x","tag":"invented-tag","score":7,"kind":"article","ts":1}]}'::jsonb;
    raise exception 'out-of-vocabulary tag unexpectedly accepted';
  exception when check_violation then null;
  end;

  begin
    update public.radar_publication
       set edition = '{"generated":"2026-10-28T04:11:24","count_scanned":1,"items":[]}'::jsonb;
    raise exception 'timezone-naive timestamp unexpectedly accepted';
  exception when check_violation then null;
  end;

  if (select edition->>'count_scanned' from public.radar_publication where singleton) <> '1'
     or (select edition->'items'->0->>'title' from public.radar_publication where singleton) <> 'Example' then
    raise exception 'failed publication changed last-good edition';
  end if;
end;
$$;

rollback;
