-- NUCLEAR: stop coin ledger from blocking posts.
-- Error was: new row for relation "coin_spends" violates check constraint "coin_spends_amount_check"
-- Run on Primary Database for project qzxvnjpumtujfylfofmg.

DROP TRIGGER IF EXISTS trg_award_post_coins ON public.venue_photos;

CREATE OR REPLACE FUNCTION public.award_post_coins()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- No-op: never touch coin_spends / coin_balance from this path.
  -- Posting must never fail because of ledger bugs.
  RETURN NEW;
END
$$;

-- Do NOT recreate the trigger. Posting works without coin bonuses for now.
