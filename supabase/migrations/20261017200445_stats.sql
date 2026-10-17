-- Stats: one row per pageview behind the public analytics page.
-- Writes are service-role only via record_visit; the only public read surface
-- is the aggregated stats_overview. No IPs, no cookies, no raw user tables.

create table public.visits (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  path text not null check (char_length(path) between 1 and 200 and path like '/%'),
  referrer_domain text check (char_length(referrer_domain) between 4 and 200),
  region text check (char_length(region) between 2 and 40),
  visitor_kind text not null default 'human' check (visitor_kind in ('human', 'agent'))
);

create index visits_created_at_desc on public.visits (created_at desc);
create index visits_path on public.visits (path);

alter table public.visits enable row level security;
revoke all on public.visits from public, anon, authenticated;
grant select, insert on public.visits to service_role;
create policy visits_server on public.visits for all to service_role using (true) with check (true);

create function public.record_visit(
  p_path text,
  p_referrer_domain text,
  p_region text,
  p_visitor_kind text
)
returns void
language sql
security invoker
set search_path = ''
as $$
  insert into public.visits (path, referrer_domain, region, visitor_kind)
  values (
    p_path,
    nullif(p_referrer_domain, ''),
    nullif(p_region, ''),
    p_visitor_kind
  );
$$;

create function public.stats_overview()
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

revoke all on function public.record_visit(text, text, text, text) from public, anon, authenticated;
revoke all on function public.stats_overview() from public, anon, authenticated;
grant execute on function public.record_visit(text, text, text, text) to service_role;
grant execute on function public.stats_overview() to service_role;