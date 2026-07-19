CREATE OR REPLACE FUNCTION public.award_post_coins()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN NEW;
END
$$;

DO $$
BEGIN
  IF to_regclass('public.venue_photos') IS NOT NULL THEN
    DROP TRIGGER IF EXISTS trg_award_post_coins ON public.venue_photos;
    RAISE NOTICE 'Dropped trg_award_post_coins on public.venue_photos';
  END IF;
END
$$;