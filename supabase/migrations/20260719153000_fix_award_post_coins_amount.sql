-- Fix: award_post_coins inserted negative amounts into coin_spends,
-- which violates coin_spends_amount_check (amount > 0) and rolls back
-- every venue_photos insert that earns a bonus (first post / video).
-- Ledger convention: amount is always positive; kind distinguishes earn vs spend.

CREATE OR REPLACE FUNCTION public.award_post_coins()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  already_today int;
  bonus int := 0;
  is_video boolean;
BEGIN
  SELECT COUNT(*) INTO already_today
  FROM public.venue_photos
  WHERE user_id = NEW.user_id
    AND id <> NEW.id
    AND (created_at AT TIME ZONE 'Europe/Bucharest')::date
        = (NEW.created_at AT TIME ZONE 'Europe/Bucharest')::date;

  IF already_today = 0 THEN
    bonus := bonus + 5; -- first post of the day
  END IF;

  is_video := COALESCE(
    NEW.media_type = 'video'
      OR NEW.photo_url ~* '\.(mp4|webm|mov|m4v)(\?|$)',
    false
  );
  IF is_video THEN
    bonus := bonus + 3;
  END IF;

  IF bonus > 0 THEN
    BEGIN
      UPDATE public.profiles
        SET coin_balance = COALESCE(coin_balance, 0) + bonus
        WHERE id = NEW.user_id;
      INSERT INTO public.coin_spends (user_id, amount, kind, ref_id)
        VALUES (
          NEW.user_id,
          bonus,
          CASE WHEN is_video THEN 'earn_post_video' ELSE 'earn_post' END,
          NEW.id::text
        );
    EXCEPTION WHEN OTHERS THEN
      -- Never block posting because of coin ledger issues
      RAISE WARNING 'award_post_coins failed for %: %', NEW.id, SQLERRM;
    END;
  END IF;

  RETURN NEW;
END
$$;
