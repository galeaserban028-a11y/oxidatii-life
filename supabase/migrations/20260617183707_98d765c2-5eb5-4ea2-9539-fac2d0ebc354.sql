
CREATE EXTENSION IF NOT EXISTS pg_cron;

CREATE OR REPLACE FUNCTION public.cleanup_old_spritz()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.sprit_proofs WHERE created_at < now() - INTERVAL '12 hours';
  DELETE FROM public.venue_photos WHERE created_at < now() - INTERVAL '12 hours';
END;
$$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'cleanup-old-spritz') THEN
    PERFORM cron.unschedule('cleanup-old-spritz');
  END IF;
END $$;

SELECT cron.schedule(
  'cleanup-old-spritz',
  '*/15 * * * *',
  $$SELECT public.cleanup_old_spritz();$$
);
