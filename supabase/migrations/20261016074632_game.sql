create table public.game_used_runs (
  run_id text primary key check (char_length(run_id) between 8 and 64),
  used_at bigint not null default floor(extract(epoch from clock_timestamp()) * 1000)
);

create table public.game_scores (
  date date not null,
  normalized_nickname text collate "C" not null check (char_length(normalized_nickname) between 1 and 48),
  display_nickname text not null check (char_length(display_nickname) between 1 and 24),
  level integer not null check (level between 1 and 20),
  elapsed_ms integer not null check (elapsed_ms between 0 and 86400000),
  created_at bigint not null default floor(extract(epoch from clock_timestamp()) * 1000),
  primary key (date, normalized_nickname),
  check (normalized_nickname = lower(normalize(display_nickname, NFKC)))
);

create index game_scores_ranking on public.game_scores
  (date, level desc, elapsed_ms, normalized_nickname);

alter table public.game_used_runs enable row level security;
alter table public.game_scores enable row level security;
revoke all on public.game_used_runs, public.game_scores from public, anon, authenticated;
grant select, insert on public.game_used_runs to service_role;
grant select, insert, update on public.game_scores to service_role;
create policy game_used_runs_server on public.game_used_runs for all to service_role using (true) with check (true);
create policy game_scores_server on public.game_scores for all to service_role using (true) with check (true);

create function public.claim_game_run(p_run_id text)
returns boolean
language plpgsql
security invoker
set search_path = ''
as $$
declare claimed integer;
begin
  insert into public.game_used_runs (run_id) values (p_run_id)
  on conflict (run_id) do nothing;
  get diagnostics claimed = row_count;
  return claimed = 1;
end;
$$;

create function public.save_game_best_score(
  p_run_id text,
  p_date date,
  p_normalized_nickname text,
  p_display_nickname text,
  p_level integer,
  p_elapsed_ms integer
)
returns public.game_scores
language plpgsql
security invoker
set search_path = ''
as $$
declare result public.game_scores;
begin
  if not exists (select 1 from public.game_used_runs where run_id = p_run_id) then
    raise exception 'Run was not claimed.' using errcode = '23514';
  end if;

  -- The conflicting row is locked by ON CONFLICT, so concurrent submissions
  -- cannot replace a faster result with a slower one. Preserve creation time.
  insert into public.game_scores as current
    (date, normalized_nickname, display_nickname, level, elapsed_ms)
  values (p_date, p_normalized_nickname, p_display_nickname, p_level, p_elapsed_ms)
  on conflict (date, normalized_nickname) do update set
    display_nickname = case when excluded.level > current.level or
      (excluded.level = current.level and excluded.elapsed_ms < current.elapsed_ms)
      then excluded.display_nickname else current.display_nickname end,
    level = greatest(current.level, excluded.level),
    elapsed_ms = case when excluded.level > current.level or
      (excluded.level = current.level and excluded.elapsed_ms < current.elapsed_ms)
      then excluded.elapsed_ms else current.elapsed_ms end
  returning * into result;
  return result;
end;
$$;

revoke all on function public.claim_game_run(text) from public, anon, authenticated;
revoke all on function public.save_game_best_score(text, date, text, text, integer, integer) from public, anon, authenticated;
grant execute on function public.claim_game_run(text) to service_role;
grant execute on function public.save_game_best_score(text, date, text, text, integer, integer) to service_role;
