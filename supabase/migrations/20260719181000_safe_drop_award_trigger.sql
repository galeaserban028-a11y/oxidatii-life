-- Safe on ANY database: never errors if venue_photos is missing.
-- 1) Always replace the function (no table needed).
-- 2) Drop trigger only when the table exists.

CREATE OR REPLACE FUNCTION public.award_post_coins()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- No-op: posting must never fail because of coin ledger.
  RETURN NEW;
END
$$;

DO $$
BEGIN
  IF to_regclass('public.venue_photos') IS NOT NULL THEN
    DROP TRIGGER IF EXISTS trg_award_post_coins ON public.venue_photos;
    RAISE NOTICE 'Dropped trg_award_post_coins on public.venue_photos';
  ELSE
    RAISE NOTICE 'public.venue_photos does not exist on THIS database — open project qzxvnjpumtujfylfofmg (the app DB), not a Branch/empty project.';
  END IF;
END
$$;
