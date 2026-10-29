revoke all on function public.publish_radar_edition(jsonb) from public, anon, authenticated, radar_publisher;
grant execute on function public.publish_radar_edition(jsonb) to service_role;
