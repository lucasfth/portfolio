-- Stats v2: daily-salted IP hash for per-day unique visitor counts.
-- The hash is HMAC-SHA256 keyed server-side with a daily rotation, so a
-- visitor's fingerprint is not linkable across days and never stored raw.
-- The legacy 4-argument record_visit keeps existing callers (old deployments)
-- working until the 5-argument client is deployed; it stores NULL hashes.

alter table public.visits
  add column visit_hash text check (visit_hash is null or char_length(visit_hash) = 64);

create index visits_visit_hash on public.visits (visit_hash);

create or replace function public.record_visit(
  p_path text,
  p_referrer_domain text,
  p_region text,
  p_visitor_kind text,
  p_visit_hash text
)
returns void
language sql
security invoker
set search_path = ''
as $$
  insert into public.visits (path, referrer_domain, region, visitor_kind, visit_hash)
  values (
    p_path,
    nullif(p_referrer_domain, ''),
    nullif(p_region, ''),
    p_visitor_kind,
    nullif(p_visit_hash, '')
  );
$$;

revoke all on function public.record_visit(text, text, text, text, text) from public, anon, authenticated;
grant execute on function public.record_visit(text, text, text, text, text) to service_role;

create or replace function public.stats_overview()
returns jsonb
language sql
stable
security invoker
set search_path = ''
as $$
  select jsonb_build_object(
    'total', (select count(*) from public.visits),
    'last_1h', (select count(*) from public.visits where created_at >= now() - interval '1 hour'),
    'last_7d', (select count(*) from public.visits where created_at >= now() - interval '7 days'),
    'unique_today', (
      select coalesce(count(distinct visit_hash), 0)
      from public.visits
      where visit_hash is not null
        and created_at >= date_trunc('day', now() at time zone 'Europe/Copenhagen')
          at time zone 'Europe/Copenhagen'
    ),
    'first_visit', (select min(created_at) from public.visits),
    'hourly_48h', (
      select coalesce(
        jsonb_agg(
          jsonb_build_object('hour', to_char(hour, 'YYYY-MM-DD"T"HH24:00'), 'count', count)
          order by hour
        ),
        '[]'::jsonb
      )
      from (
        select date_trunc('hour', created_at) as hour, count(*)
        from public.visits
        where created_at >= now() - interval '48 hours'
        group by 1
      ) hourly
    ),
    'top_paths', (
      select coalesce(
        jsonb_agg(jsonb_build_object('path', path, 'count', count) order by count desc, path),
        '[]'::jsonb
      )
      from (
        select path, count(*)
        from public.visits
        group by path
        order by count(*) desc, path
        limit 10
      ) paths
    ),
    'top_referrers', (
      select coalesce(
        jsonb_agg(
          jsonb_build_object('referrer', referrer_domain, 'count', count)
          order by count desc, referrer_domain
        ),
        '[]'::jsonb
      )
      from (
        select referrer_domain, count(*)
        from public.visits
        where referrer_domain is not null
        group by referrer_domain
        order by count(*) desc, referrer_domain
        limit 10
      ) referrers
    ),
    'top_regions', (
      select coalesce(
        jsonb_agg(jsonb_build_object('region', region, 'count', count) order by count desc, region),
        '[]'::jsonb
      )
      from (
        select region, count(*)
        from public.visits
        where region is not null
        group by region
        order by count(*) desc, region
        limit 10
      ) regions
    ),
    'visitor_kinds', (
      select coalesce(jsonb_object_agg(visitor_kind, count), '{}'::jsonb)
      from (
        select visitor_kind, count(*)
        from public.visits
        group by visitor_kind
      ) kinds
    )
  );
$$;