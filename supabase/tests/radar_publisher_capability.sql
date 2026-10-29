BEGIN;

-- The public API roles cannot publish; only the server-side service role can.
DO $$
BEGIN
  IF has_function_privilege('anon', 'public.publish_radar_edition(jsonb)', 'EXECUTE')
     OR has_function_privilege('authenticated', 'public.publish_radar_edition(jsonb)', 'EXECUTE')
     OR NOT has_function_privilege('service_role', 'public.publish_radar_edition(jsonb)', 'EXECUTE')
     OR has_function_privilege('radar_publisher', 'public.publish_radar_edition(jsonb)', 'EXECUTE') THEN
    RAISE EXCEPTION 'unexpected publish RPC grants';
  END IF;
END;
$$;

SET LOCAL ROLE service_role;
SELECT public.publish_radar_edition(
  '{"generated":"2026-10-28T04:11:24+00:00","count_scanned":1,"items":[{"title":"Example","url":"https://example.com","source":"Example","summary":"Public item","tag":"agents","score":7,"kind":"article","ts":1}]}'::jsonb
);

DO $$
BEGIN
  IF (SELECT edition->>'count_scanned' FROM public.radar_publication WHERE singleton) <> '1'
     OR (SELECT edition->'items'->0->>'title' FROM public.radar_publication WHERE singleton) <> 'Example' THEN
    RAISE EXCEPTION 'publisher did not write the validated edition';
  END IF;
  BEGIN
    PERFORM public.publish_radar_edition('{"private":"must reject"}'::jsonb);
    RAISE EXCEPTION 'invalid edition was accepted';
  EXCEPTION WHEN invalid_parameter_value THEN
    NULL;
  END;
  IF (SELECT edition->'items'->0->>'title' FROM public.radar_publication WHERE singleton) <> 'Example' THEN
    RAISE EXCEPTION 'invalid edition replaced the last-good edition';
  END IF;
END;
$$;

ROLLBACK;
