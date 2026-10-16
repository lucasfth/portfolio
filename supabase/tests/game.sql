begin;
set local role service_role;
do $$
declare
  first_score public.game_scores;
  result public.game_scores;
  test_date date;
  run_prefix text := 'sql-' || substr(md5(random()::text || clock_timestamp()::text), 1, 24) || '-';
begin
  select candidate::date into test_date
  from generate_series(date '1900-01-01', date '1900-02-01', interval '1 day') as dates(candidate)
  where not exists (select 1 from public.game_scores where date = candidate::date)
  order by candidate
  limit 1;
  assert test_date is not null, 'unused test date must be available';

  assert public.claim_game_run(run_prefix || '01'), 'first claim must succeed';
  assert not public.claim_game_run(run_prefix || '01'), 'replay must fail';
  begin
    perform public.save_game_best_score(run_prefix || '99', test_date, 'lucas', 'Lucas', 20, 1000);
    raise exception 'unclaimed run accepted';
  exception when check_violation then null;
  end;

  first_score := public.save_game_best_score(run_prefix || '01', test_date, 'lucas', 'Lucas', 19, 1000);
  assert public.claim_game_run(run_prefix || '02'), 'second claim must succeed';
  result := public.save_game_best_score(run_prefix || '02', test_date, 'lucas', 'LUCAS', 20, 5000);
  assert result.level = 20 and result.elapsed_ms = 5000, 'higher level must replace';
  assert result.created_at = first_score.created_at, 'creation time must stay stable';
  result := public.save_game_best_score(run_prefix || '02', test_date, 'lucas', 'Lucas', 20, 6000);
  assert result.elapsed_ms = 5000 and result.display_nickname = 'LUCAS', 'slower run must not replace';
  result := public.save_game_best_score(run_prefix || '02', test_date, 'lucas', 'Lucas', 20, 4000);
  assert result.elapsed_ms = 4000, 'faster equal-level run must replace';

  assert public.claim_game_run(run_prefix || '03'), 'Unicode normalization claim must succeed';
  result := public.save_game_best_score(run_prefix || '03', test_date, 'alice', 'Ａlice', 1, 0);
  assert result.normalized_nickname = 'alice' and result.display_nickname = 'Ａlice',
    'NFKC normalization must preserve the display nickname';
  assert public.claim_game_run(run_prefix || '04'), 'accented Unicode normalization claim must succeed';
  result := public.save_game_best_score(run_prefix || '04', test_date, 'élodie', 'Élodie', 1, 1);
  assert result.normalized_nickname = 'élodie', 'case folding must normalize accented Unicode characters';

  begin
    perform public.claim_game_run('short');
    raise exception 'short run id accepted';
  exception when check_violation then null;
  end;
  begin
    perform public.claim_game_run(repeat('x', 65));
    raise exception 'long run id accepted';
  exception when check_violation then null;
  end;
  begin
    perform public.save_game_best_score(run_prefix || '02', test_date, 'wrong', 'Lucas', 20, 4000);
    raise exception 'mismatched normalized nickname accepted';
  exception when check_violation then null;
  end;
  begin
    perform public.save_game_best_score(run_prefix || '02', test_date, '', '', 20, 4000);
    raise exception 'empty nickname accepted';
  exception when check_violation then null;
  end;
  begin
    perform public.save_game_best_score(run_prefix || '02', test_date, repeat('x', 49), repeat('x', 24), 20, 4000);
    raise exception 'oversized normalized nickname accepted';
  exception when check_violation then null;
  end;
  begin
    perform public.save_game_best_score(run_prefix || '02', test_date, repeat('x', 25), repeat('x', 25), 20, 4000);
    raise exception 'oversized display nickname accepted';
  exception when check_violation then null;
  end;
  begin
    perform public.save_game_best_score(run_prefix || '02', test_date, 'lucas', 'Lucas', 0, 4000);
    raise exception 'level below minimum accepted';
  exception when check_violation then null;
  end;
  begin
    perform public.save_game_best_score(run_prefix || '02', test_date, 'lucas', 'Lucas', 21, 4000);
    raise exception 'level above maximum accepted';
  exception when check_violation then null;
  end;
  begin
    perform public.save_game_best_score(run_prefix || '02', test_date, 'lucas', 'Lucas', 20, -1);
    raise exception 'negative elapsed time accepted';
  exception when check_violation then null;
  end;
  begin
    perform public.save_game_best_score(run_prefix || '02', test_date, 'lucas', 'Lucas', 20, 86400001);
    raise exception 'elapsed time above maximum accepted';
  exception when check_violation then null;
  end;

end $$;
reset role;

set local role anon;
do $$ begin
  begin
    perform * from public.game_used_runs;
    raise exception 'anonymous run read accepted';
  exception when insufficient_privilege then null;
  end;
  begin
    perform * from public.game_scores;
    raise exception 'anonymous score read accepted';
  exception when insufficient_privilege then null;
  end;
  begin
    insert into public.game_used_runs (run_id) values ('anonymous-run-0001');
    raise exception 'anonymous run write accepted';
  exception when insufficient_privilege then null;
  end;
  begin
    insert into public.game_scores (date, normalized_nickname, display_nickname, level, elapsed_ms)
    values (date '2026-10-16', 'anon', 'anon', 1, 0);
    raise exception 'anonymous score write accepted';
  exception when insufficient_privilege then null;
  end;
  begin
    update public.game_scores set elapsed_ms = 0;
    raise exception 'anonymous score update accepted';
  exception when insufficient_privilege then null;
  end;
  begin
    delete from public.game_scores;
    raise exception 'anonymous score delete accepted';
  exception when insufficient_privilege then null;
  end;
  begin
    perform public.claim_game_run('anonymous-run-0002');
    raise exception 'anonymous claim RPC accepted';
  exception when insufficient_privilege then null;
  end;
  begin
    perform public.save_game_best_score('anonymous-run-0002', date '2026-10-16', 'anon', 'anon', 1, 0);
    raise exception 'anonymous score RPC accepted';
  exception when insufficient_privilege then null;
  end;
end $$;
reset role;

set local role authenticated;
do $$ begin
  begin
    perform * from public.game_used_runs;
    raise exception 'authenticated run read accepted';
  exception when insufficient_privilege then null;
  end;
  begin
    perform * from public.game_scores;
    raise exception 'authenticated score read accepted';
  exception when insufficient_privilege then null;
  end;
  begin
    insert into public.game_used_runs (run_id) values ('authenticated-run-0001');
    raise exception 'authenticated run write accepted';
  exception when insufficient_privilege then null;
  end;
  begin
    insert into public.game_scores (date, normalized_nickname, display_nickname, level, elapsed_ms)
    values (date '2026-10-16', 'authenticated', 'authenticated', 1, 0);
    raise exception 'authenticated score write accepted';
  exception when insufficient_privilege then null;
  end;
  begin
    update public.game_scores set elapsed_ms = 0;
    raise exception 'authenticated score update accepted';
  exception when insufficient_privilege then null;
  end;
  begin
    delete from public.game_scores;
    raise exception 'authenticated score delete accepted';
  exception when insufficient_privilege then null;
  end;
  begin
    perform public.claim_game_run('authenticated-run-0002');
    raise exception 'authenticated claim RPC accepted';
  exception when insufficient_privilege then null;
  end;
  begin
    perform public.save_game_best_score('authenticated-run-0002', date '2026-10-16', 'authenticated', 'authenticated', 1, 0);
    raise exception 'authenticated score RPC accepted';
  exception when insufficient_privilege then null;
  end;
end $$;
reset role;
rollback;
