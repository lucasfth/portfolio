create role radar_publisher nologin noinherit;
grant usage on schema public to radar_publisher;
grant execute on function public.radar_edition_is_valid(jsonb) to radar_publisher;
create or replace function public.publish_radar_edition(p_edition jsonb)
returns void
language plpgsql
security definer
set search_path = ''
as $function$
begin
  if not public.radar_edition_is_valid(p_edition) then
    raise exception 'invalid Radar edition' using errcode = '22023';
  end if;
  insert into public.radar_publication(singleton, edition, published_at)
  values (true, p_edition, now())
  on conflict (singleton) do update
    set edition = excluded.edition,
        published_at = excluded.published_at;
end;
$function$;
revoke all on function public.publish_radar_edition(jsonb) from public, anon, authenticated, service_role;
grant execute on function public.publish_radar_edition(jsonb) to radar_publisher;
revoke all on public.radar_publication from radar_publisher;
