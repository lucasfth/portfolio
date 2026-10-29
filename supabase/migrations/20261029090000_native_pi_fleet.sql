-- Source only: apply only after separate production migration approval.
-- Latest rows, not transcripts or history. HTTP producer secrets stay outside SQL.
create table public.fleet_hosts (
  host_id text primary key check (host_id in ('gimle','macbook')),
  last_received_at timestamptz,
  window_started_at timestamptz not null default now(),
  attempts integer not null default 0 check (attempts >= 0)
);
insert into public.fleet_hosts(host_id) values ('gimle'),('macbook');
create table public.fleet_sessions (
  host_id text not null references public.fleet_hosts(host_id),
  session_id text not null check (session_id ~ '^[a-f0-9]{32}$'),
  started_at timestamptz not null,
  sequence bigint not null check (sequence between 0 and 9007199254740991),
  observed_at timestamptz not null,
  received_at timestamptz not null,
  ended boolean not null,
  payload jsonb not null check (jsonb_typeof(payload) = 'object'),
  primary key (host_id, session_id)
);
alter table public.fleet_hosts enable row level security;
alter table public.fleet_sessions enable row level security;
-- No browser role, including authenticated users, can read or write raw rows.
revoke all on public.fleet_hosts, public.fleet_sessions from public, anon, authenticated;
grant select,insert,update,delete on public.fleet_hosts, public.fleet_sessions to service_role;

-- Same trimmed 1-80 character ASCII alphabet as producer and fleet.ts.
create function public.fleet_safe_label(p_label text) returns boolean
language sql immutable set search_path = '' as $$
  select coalesce(char_length(p_label) between 1 and 80
    and octet_length(p_label) = char_length(p_label)
    and p_label = btrim(p_label)
    and p_label collate "C" ~ '^[A-Za-z0-9 ._-]+$', false);
$$;
revoke all on function public.fleet_safe_label(text) from public, anon, authenticated;

create function public.fleet_report(p_report jsonb) returns text
language plpgsql security definer set search_path = '' as $$
declare
  h public.fleet_hosts%rowtype;
  prior public.fleet_sessions%rowtype;
  v_host text := p_report->>'hostId';
  v_session text := p_report->>'sessionId';
  v_started timestamptz;
  v_observed timestamptz;
  v_tool timestamptz;
  v_sequence bigint;
  v_now timestamptz := clock_timestamp();
  v_keys text[];
begin
  select array_agg(k order by k) into v_keys from jsonb_object_keys(p_report) k;
  if v_keys is distinct from array['hostId','label','lastToolCompletedAt','observedAt','schemaVersion','sequence','sessionId','startedAt','state']::text[]
     or p_report->'schemaVersion' is distinct from '1'::jsonb
     or jsonb_typeof(p_report->'hostId') is distinct from 'string' or v_host not in ('gimle','macbook')
     or jsonb_typeof(p_report->'sessionId') is distinct from 'string' or v_session !~ '^[a-f0-9]{32}$'
     or jsonb_typeof(p_report->'label') is distinct from 'string' or not public.fleet_safe_label(p_report->>'label')
     or jsonb_typeof(p_report->'state') is distinct from 'string' or p_report->>'state' not in ('working','idle','blocked','error','done','ended','unknown')
     or jsonb_typeof(p_report->'sequence') is distinct from 'number' or p_report->>'sequence' !~ '^[0-9]+$'
     or jsonb_typeof(p_report->'observedAt') is distinct from 'string' or jsonb_typeof(p_report->'startedAt') is distinct from 'string'
     or p_report->>'observedAt' !~ '^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$'
     or p_report->>'startedAt' !~ '^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$'
     or (p_report->'lastToolCompletedAt' <> 'null'::jsonb and (jsonb_typeof(p_report->'lastToolCompletedAt') <> 'string' or p_report->>'lastToolCompletedAt' !~ '^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$'))
  then raise exception 'Invalid fleet report'; end if;
  v_started := (p_report->>'startedAt')::timestamptz;
  v_observed := (p_report->>'observedAt')::timestamptz;
  v_tool := (p_report->>'lastToolCompletedAt')::timestamptz;
  v_sequence := (p_report->>'sequence')::bigint;
  -- Fixed two-row lock serializes write rate, ordering, pruning and capacity across instances.
  select * into strict h from public.fleet_hosts where host_id = v_host for update;
  -- Receipt is measured after lock acquisition, so queued requests cannot move it backwards.
  v_now := clock_timestamp();
  if v_sequence > 9007199254740991 or v_observed < v_now - interval '5 minutes' or v_observed > v_now + interval '30 seconds'
     or v_started > v_observed or v_started < v_now - interval '366 days' or v_tool > v_observed
  then raise exception 'Invalid fleet report'; end if;
  if h.window_started_at < v_now - interval '1 minute' then
    update public.fleet_hosts set window_started_at = v_now, attempts = 1 where host_id = v_host;
  else
    if h.attempts >= 240 then return 'limited'; end if;
    update public.fleet_hosts set attempts = attempts + 1 where host_id = v_host;
  end if;
  delete from public.fleet_sessions where host_id = v_host and
    received_at < v_now - case when ended then interval '24 hours' else interval '7 days' end;
  select * into prior from public.fleet_sessions where host_id = v_host and session_id = v_session;
  if found then
    if (v_started, v_sequence) <= (prior.started_at, prior.sequence) or v_observed < prior.observed_at
       or (prior.ended and v_started = prior.started_at) then return 'stale'; end if;
    -- Preserve the last completed-tool event across reporter restart/heartbeat nulls.
    if (prior.payload->>'lastToolCompletedAt')::timestamptz > v_tool or v_tool is null then
      p_report := jsonb_set(p_report, '{lastToolCompletedAt}', prior.payload->'lastToolCompletedAt');
    end if;
  elsif (select count(*) from public.fleet_sessions where host_id = v_host) >= 64 then
    return 'limited';
  end if;
  insert into public.fleet_sessions(host_id,session_id,started_at,sequence,observed_at,received_at,ended,payload)
    values(v_host,v_session,v_started,v_sequence,v_observed,v_now,p_report->>'state' = 'ended',p_report)
    on conflict(host_id,session_id) do update set started_at=excluded.started_at,sequence=excluded.sequence,
      observed_at=excluded.observed_at,received_at=excluded.received_at,ended=excluded.ended,payload=excluded.payload;
  update public.fleet_hosts set last_received_at = v_now where host_id = v_host;
  return 'accepted';
end;
$$;

create function public.fleet_snapshot() returns jsonb
language plpgsql security definer set search_path = '' as $$
declare v_now timestamptz := clock_timestamp(); v_hosts jsonb;
begin
  -- Same lock order as writes; read-time pruning enforces retention even on quiet fleets.
  perform host_id from public.fleet_hosts order by host_id for update;
  v_now := clock_timestamp();
  delete from public.fleet_sessions where received_at < v_now - case when ended then interval '24 hours' else interval '7 days' end;
  select jsonb_agg(jsonb_build_object(
    'id', h.host_id,
    'lastReceivedAt', case when h.last_received_at is null then null else to_char(h.last_received_at at time zone 'UTC','YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') end,
    'sessions', coalesce((select jsonb_agg(s.payload || jsonb_build_object('receivedAt',to_char(s.received_at at time zone 'UTC','YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')) order by s.received_at desc, s.session_id)
      from public.fleet_sessions s where s.host_id=h.host_id), '[]'::jsonb)) order by h.host_id)
    into v_hosts from public.fleet_hosts h;
  return jsonb_build_object('schemaVersion',1,'readAt',to_char(v_now at time zone 'UTC','YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),'hosts',v_hosts);
end;
$$;
revoke all on function public.fleet_report(jsonb), public.fleet_snapshot() from public, anon, authenticated;
grant execute on function public.fleet_report(jsonb), public.fleet_snapshot() to service_role;
