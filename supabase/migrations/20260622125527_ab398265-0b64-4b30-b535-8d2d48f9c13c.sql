
-- 1) daily_intents table
CREATE TABLE IF NOT EXISTS public.daily_intents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  intent_date date NOT NULL,
  venue_id uuid REFERENCES public.venues(id) ON DELETE SET NULL,
  note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, intent_date)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.daily_intents TO authenticated;
GRANT ALL ON public.daily_intents TO service_role;

ALTER TABLE public.daily_intents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read daily_intents"
  ON public.daily_intents FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users insert their own intent"
  ON public.daily_intents FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users update their own intent"
  ON public.daily_intents FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users delete their own intent"
  ON public.daily_intents FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE TRIGGER trg_daily_intents_updated_at
  BEFORE UPDATE ON public.daily_intents
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX IF NOT EXISTS idx_daily_intents_date_venue
  ON public.daily_intents (intent_date, venue_id);

-- 2) current_weekend_window function: Fri 18:00 -> Mon 06:00 Bucharest
CREATE OR REPLACE FUNCTION public.current_weekend_window()
RETURNS TABLE(starts_at timestamptz, ends_at timestamptz, prize_at timestamptz, is_active boolean)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  now_local timestamp;
  dow int;
  this_monday date;
  fri timestamptz;
  mon timestamptz;
BEGIN
  now_local := now() AT TIME ZONE 'Europe/Bucharest';
  dow := EXTRACT(DOW FROM now_local)::int; -- 0 Sun .. 6 Sat
  -- Anchor: monday of the ISO week that contains the upcoming/current weekend
  -- We want: weekend window = Fri 18:00 .. next Mon 06:00 of the SAME calendar weekend.
  -- Compute the Friday of THIS week (if dow>=5 use current week, else previous? Use current week's friday).
  this_monday := date_trunc('week', now_local)::date; -- Monday of this week
  fri := ((this_monday + 4) || ' 18:00')::timestamp AT TIME ZONE 'Europe/Bucharest';
  mon := ((this_monday + 7) || ' 06:00')::timestamp AT TIME ZONE 'Europe/Bucharest';

  -- If we're already past Mon 06:00 of current week (i.e. it's Mon afternoon..Fri 18:00),
  -- show last weekend's window
  IF (now() AT TIME ZONE 'UTC') < (fri AT TIME ZONE 'UTC') AND (now() AT TIME ZONE 'UTC') >= (mon - interval '7 days') AT TIME ZONE 'UTC' THEN
    -- between Mon 06:00 and Fri 18:00 -> last weekend
    fri := fri - interval '7 days';
    mon := mon - interval '7 days';
  END IF;

  starts_at := fri;
  ends_at := mon;
  prize_at := mon;
  is_active := (now() >= fri AND now() < mon);
  RETURN NEXT;
END
$$;

-- 3) award_post_coins trigger function
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
  -- Count this user's previous photos today (Bucharest local day)
  SELECT COUNT(*) INTO already_today
  FROM public.venue_photos
  WHERE user_id = NEW.user_id
    AND id <> NEW.id
    AND (created_at AT TIME ZONE 'Europe/Bucharest')::date
        = (NEW.created_at AT TIME ZONE 'Europe/Bucharest')::date;

  IF already_today = 0 THEN
    bonus := bonus + 5; -- first post of the day
  END IF;

  -- Video bonus
  is_video := COALESCE(NEW.photo_url ~* '\.(mp4|webm|mov)(\?|$)', false);
  IF is_video THEN
    bonus := bonus + 3;
  END IF;

  IF bonus > 0 THEN
    UPDATE public.profiles
      SET coin_balance = COALESCE(coin_balance,0) + bonus
      WHERE id = NEW.user_id;
    INSERT INTO public.coin_spends (user_id, amount, kind, ref_id)
      VALUES (NEW.user_id, -bonus,
              CASE WHEN is_video THEN 'earn_post_video' ELSE 'earn_post' END,
              NEW.id::text);
  END IF;

  RETURN NEW;
END
$$;

DROP TRIGGER IF EXISTS trg_award_post_coins ON public.venue_photos;
CREATE TRIGGER trg_award_post_coins
  AFTER INSERT ON public.venue_photos
  FOR EACH ROW EXECUTE FUNCTION public.award_post_coins();

-- 4) Stop auto-deleting venue_photos (they live on profile forever).
--    Sprit_proofs already untouched. The home feed filters by 12h in query.
CREATE OR REPLACE FUNCTION public.cleanup_old_spritz()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- No-op: venue_photos persist on profile; feeds filter by created_at in query.
  -- sprit_proofs retained for leaderboard counts.
  RETURN;
END;
$$;
