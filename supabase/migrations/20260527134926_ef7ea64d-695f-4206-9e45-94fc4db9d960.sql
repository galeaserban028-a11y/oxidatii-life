
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS current_streak integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS longest_streak integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_streak_week date;

-- Function: given a check-in timestamp, return the Monday of that ISO week
CREATE OR REPLACE FUNCTION public.iso_week_start(_ts timestamptz)
RETURNS date
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT date_trunc('week', _ts AT TIME ZONE 'Europe/Bucharest')::date;
$$;

-- Trigger function: bump streak when a check-in is inserted (only if it's Fri/Sat/Sun)
CREATE OR REPLACE FUNCTION public.bump_streak_on_checkin()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _dow int;
  _week date;
  _last date;
  _cur int;
  _long int;
BEGIN
  -- Day of week in Bucharest tz (0=Sun..6=Sat). We accept Fri(5), Sat(6), Sun(0)
  _dow := EXTRACT(DOW FROM (NEW.created_at AT TIME ZONE 'Europe/Bucharest'))::int;
  IF _dow NOT IN (0, 5, 6) THEN
    RETURN NEW;
  END IF;

  _week := public.iso_week_start(NEW.created_at);

  SELECT last_streak_week, current_streak, longest_streak
    INTO _last, _cur, _long
  FROM public.profiles WHERE id = NEW.user_id;

  IF _last IS NULL THEN
    _cur := 1;
  ELSIF _last = _week THEN
    RETURN NEW; -- already counted this weekend
  ELSIF _last = (_week - INTERVAL '7 days')::date THEN
    _cur := _cur + 1;
  ELSE
    _cur := 1; -- streak broken
  END IF;

  IF _cur > COALESCE(_long, 0) THEN
    _long := _cur;
  END IF;

  UPDATE public.profiles
     SET current_streak = _cur,
         longest_streak = _long,
         last_streak_week = _week
   WHERE id = NEW.user_id;

  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_bump_streak ON public.check_ins;
CREATE TRIGGER trg_bump_streak
AFTER INSERT ON public.check_ins
FOR EACH ROW
EXECUTE FUNCTION public.bump_streak_on_checkin();
