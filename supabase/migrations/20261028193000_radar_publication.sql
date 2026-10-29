-- Radar public edition: one validated JSON document, atomically replaced.
-- Writers are service_role-only; public readers receive this singleton through
-- a fixed-shape RPC. Private Radar output is never accepted here.

create or replace function public.radar_edition_is_valid(document jsonb)
returns boolean
language plpgsql
stable
set search_path = ''
as $$
declare
  entry jsonb;
  allowed_tags text[] := array[
    'local-llm', 'agents', 'models', 'devtools', 'security', 'selfhosting',
    'danish-tech', 'web', 'research', 'other'
  ];
  generated_at timestamptz;
begin
  if document is null
     or jsonb_typeof(document) is distinct from 'object'
     or document - array['generated', 'count_scanned', 'items'] <> '{}'::jsonb
     or jsonb_typeof(document->'generated') is distinct from 'string'
     or jsonb_typeof(document->'count_scanned') is distinct from 'number'
     or jsonb_typeof(document->'items') is distinct from 'array'
     or (document->>'count_scanned')::numeric < 0
     or trunc((document->>'count_scanned')::numeric) <> (document->>'count_scanned')::numeric
     or jsonb_array_length(document->'items') > 40
     or (document->>'generated') !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}(:[0-9]{2}([.][0-9]+)?)?(Z|[+-][0-9]{2}:[0-9]{2})$' then
    return false;
  end if;

  begin
    generated_at := (document->>'generated')::timestamptz;
  exception when others then
    return false;
  end;
  if generated_at is null then return false; end if;

  for entry in select value from jsonb_array_elements(document->'items') loop
    if jsonb_typeof(entry) is distinct from 'object'
       or entry - array['title', 'url', 'source', 'summary', 'tag', 'score', 'kind', 'ts'] <> '{}'::jsonb
       or jsonb_typeof(entry->'title') is distinct from 'string'
       or coalesce(length(entry->>'title'), 0) not between 1 and 200
       or jsonb_typeof(entry->'url') is distinct from 'string'
       or coalesce(length(entry->>'url'), 0) not between 1 and 2048
       or (entry->>'url') !~ '^https?://[^[:space:]]+$'
       or jsonb_typeof(entry->'source') is distinct from 'string'
       or coalesce(length(entry->>'source'), 0) not between 1 and 200
       or jsonb_typeof(entry->'summary') is distinct from 'string'
       or coalesce(length(entry->>'summary'), 0) not between 1 and 600
       or jsonb_typeof(entry->'tag') is distinct from 'string'
       or not ((entry->>'tag') = any(allowed_tags))
       or jsonb_typeof(entry->'score') is distinct from 'number'
       or (entry->>'score')::numeric not between 0 and 10
       or jsonb_typeof(entry->'kind') is distinct from 'string'
       or coalesce(length(entry->>'kind'), 0) not between 1 and 40
       or jsonb_typeof(entry->'ts') is distinct from 'number'
       or (entry->>'ts')::numeric < 0 then
      return false;
    end if;
  end loop;
  return true;
end;
$$;

revoke all on function public.radar_edition_is_valid(jsonb) from public, anon, authenticated;
grant execute on function public.radar_edition_is_valid(jsonb) to service_role;

create table public.radar_publication (
  singleton boolean primary key default true check (singleton),
  edition jsonb not null check (public.radar_edition_is_valid(edition)),
  published_at timestamptz not null default now()
);

alter table public.radar_publication enable row level security;
revoke all on public.radar_publication from public, anon, authenticated;
grant select, insert, update, delete on public.radar_publication to service_role;

create policy radar_publication_service on public.radar_publication
  for all to service_role using (true) with check (true);

create or replace function public.get_radar_edition()
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select edition from public.radar_publication where singleton = true limit 1;
$$;

revoke all on function public.get_radar_edition() from public, anon, authenticated;
grant execute on function public.get_radar_edition() to anon, authenticated;
