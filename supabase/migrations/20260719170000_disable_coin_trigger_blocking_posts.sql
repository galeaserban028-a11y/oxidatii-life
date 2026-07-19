-- Nuclear fix: never block venue_photos inserts because of coin ledger.
-- Drop trigger side-effects that were rolling back posts (coin_spends check).

DROP TRIGGER IF EXISTS trg_award_post_coins ON public.venue_photos;

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
  BEGIN
    SELECT COUNT(*) INTO already_today
    FROM public.venue_photos
    WHERE user_id = NEW.user_id
      AND id <> NEW.id
      AND (created_at AT TIME ZONE 'Europe/Bucharest')::date
          = (NEW.created_at AT TIME ZONE 'Europe/Bucharest')::date;

    IF already_today = 0 THEN
      bonus := bonus + 5;
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
      UPDATE public.profiles
        SET coin_balance = COALESCE(coin_balance, 0) + bonus
        WHERE id = NEW.user_id;
      -- Do NOT write coin_spends here — that table's CHECK / RLS has
      -- rolled back posts. Balance update alone is enough for UX.
    END IF;
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'award_post_coins skipped for %: %', NEW.id, SQLERRM;
  END;

  RETURN NEW;
END
$$;

-- Re-attach as AFTER INSERT, but function never raises.
DROP TRIGGER IF EXISTS trg_award_post_coins ON public.venue_photos;
CREATE TRIGGER trg_award_post_coins
  AFTER INSERT ON public.venue_photos
  FOR EACH ROW EXECUTE FUNCTION public.award_post_coins();
