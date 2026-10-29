-- Additive v1 activity evidence; apply before activating enriched producers.
-- Existing payloads, snapshot, RLS and service-only grants are unchanged.
create or replace function public.fleet_report(p_report jsonb) returns text
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
  if (v_keys is distinct from array['hostId','label','lastToolCompletedAt','observedAt','schemaVersion','sequence','sessionId','startedAt','state']::text[]
     and v_keys is distinct from array['hostId','label','lastToolCompletedAt','observedAt','schemaVersion','sequence','sessionId','startedAt','state','toolsInFlight','workingSince']::text[])
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
  -- Optional v1 evidence is paired, bounded and valid only for the observed state.
  if p_report ? 'workingSince' then
    if jsonb_typeof(p_report->'toolsInFlight') is distinct from 'number'
       or p_report->>'toolsInFlight' !~ '^[0-9]+$'
       or (p_report->>'toolsInFlight')::numeric > 256 then raise exception 'Invalid fleet report'; end if;
    if p_report->>'state' = 'working' then
      if jsonb_typeof(p_report->'workingSince') is distinct from 'string'
         or p_report->>'workingSince' !~ '^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$'
         then raise exception 'Invalid fleet report'; end if;
      if (p_report->>'workingSince')::timestamptz < v_started or (p_report->>'workingSince')::timestamptz > v_observed
         then raise exception 'Invalid fleet report'; end if;
    elsif p_report->'workingSince' is distinct from 'null'::jsonb or (p_report->>'toolsInFlight')::numeric <> 0
      then raise exception 'Invalid fleet report'; end if;
  end if;
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

revoke all on function public.fleet_report(jsonb) from public, anon, authenticated;
grant execute on function public.fleet_report(jsonb) to service_role;
