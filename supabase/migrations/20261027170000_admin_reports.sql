-- Admin overnight module: nightly report rows for the /admin page.
-- Writes are service-role only (nightly cron on the agent host). The only human
-- read surface is the /admin page, gated by signed-in email in RLS.

create table public.admin_reports (
  id bigint generated always as identity primary key,
  night date not null,
  kind text not null check (char_length(kind) between 1 and 40),
  title text not null check (char_length(title) between 1 and 200),
  summary text check (char_length(summary) <= 4000),
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (night, kind, title)
);

create index admin_reports_night_desc on public.admin_reports (night desc, created_at desc);

alter table public.admin_reports enable row level security;
revoke all on public.admin_reports from public, anon, authenticated;
grant select on public.admin_reports to authenticated;
grant select, insert, update, delete on public.admin_reports to service_role;

create policy admin_reports_service on public.admin_reports
  for all to service_role using (true) with check (true);

-- Single human viewer: the signed-in email must match this one.
-- (Adjusted in the dashboard if the admin account email differs.)
create policy admin_reports_read on public.admin_reports
  for select to authenticated
  using (auth.jwt() ->> 'email' = 'online@lucashanson.dk');