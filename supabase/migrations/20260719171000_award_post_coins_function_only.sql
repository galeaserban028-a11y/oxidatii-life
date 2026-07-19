-- Safe fix: ONLY replace the function. Do NOT recreate the trigger
-- (avoids error if you're on a branch DB without venue_photos).
-- The existing trigger will call this new function automatically.

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
      -- Never write coin_spends here — that CHECK was rolling back posts.
    END IF;
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'award_post_coins skipped for %: %', NEW.id, SQLERRM;
  END;

  RETURN NEW;
END
$$;
