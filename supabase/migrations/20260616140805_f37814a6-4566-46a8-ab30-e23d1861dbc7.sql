
-- ============================================================
-- 1) DAILY SPIN
-- ============================================================
CREATE TABLE public.daily_spins (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  spin_date date NOT NULL DEFAULT (now() AT TIME ZONE 'Europe/Bucharest')::date,
  reward_kind text NOT NULL,
  reward_amount integer NOT NULL DEFAULT 0,
  reward_label text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, spin_date)
);

GRANT SELECT, INSERT ON public.daily_spins TO authenticated;
GRANT ALL ON public.daily_spins TO service_role;

ALTER TABLE public.daily_spins ENABLE ROW LEVEL SECURITY;

CREATE POLICY "daily_spins_self_read" ON public.daily_spins
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE INDEX idx_daily_spins_user_date ON public.daily_spins (user_id, spin_date DESC);

CREATE OR REPLACE FUNCTION public.claim_daily_spin()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
  today date := (now() AT TIME ZONE 'Europe/Bucharest')::date;
  existing record;
  roll int;
  r_kind text;
  r_amount int := 0;
  r_label text;
  next_at timestamptz;
BEGIN
  IF uid IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'not_authenticated');
  END IF;

  -- already spun today?
  SELECT * INTO existing FROM public.daily_spins
    WHERE user_id = uid AND spin_date = today;
  IF FOUND THEN
    next_at := ((today + 1) || ' 00:00')::timestamp AT TIME ZONE 'Europe/Bucharest';
    RETURN jsonb_build_object(
      'ok', false,
      'error', 'already_spun',
      'next_at', next_at,
      'reward_kind', existing.reward_kind,
      'reward_amount', existing.reward_amount,
      'reward_label', existing.reward_label
    );
  END IF;

  -- weighted random reward
  roll := floor(random() * 100)::int; -- 0..99
  IF roll < 2 THEN
    -- 2% jackpot: 150 coins
    r_kind := 'coins'; r_amount := 150; r_label := 'JACKPOT 150 șprițuri 🎰';
  ELSIF roll < 5 THEN
    -- 3% profile boost 24h (Pro feature: still grant boost regardless)
    r_kind := 'boost'; r_amount := 24; r_label := 'Boost profil 24h ✨';
    UPDATE public.profiles
       SET boost_until = GREATEST(COALESCE(boost_until, now()), now()) + interval '24 hours'
     WHERE id = uid;
  ELSIF roll < 20 THEN
    -- 15% aura
    r_kind := 'aura'; r_amount := 50; r_label := '+50 aură';
    UPDATE public.profiles SET aura = COALESCE(aura,0) + 50 WHERE id = uid;
  ELSIF roll < 45 THEN
    -- 25%: 50 coins
    r_kind := 'coins'; r_amount := 50; r_label := '50 șprițuri 🍹';
  ELSIF roll < 75 THEN
    -- 30%: 25 coins
    r_kind := 'coins'; r_amount := 25; r_label := '25 șprițuri';
  ELSE
    -- 25%: 10 coins (consolation)
    r_kind := 'coins'; r_amount := 10; r_label := '10 șprițuri';
  END IF;

  IF r_kind = 'coins' THEN
    UPDATE public.profiles
       SET coin_balance = COALESCE(coin_balance,0) + r_amount
     WHERE id = uid;
  END IF;

  INSERT INTO public.daily_spins (user_id, spin_date, reward_kind, reward_amount, reward_label)
    VALUES (uid, today, r_kind, r_amount, r_label);

  next_at := ((today + 1) || ' 00:00')::timestamp AT TIME ZONE 'Europe/Bucharest';

  RETURN jsonb_build_object(
    'ok', true,
    'reward_kind', r_kind,
    'reward_amount', r_amount,
    'reward_label', r_label,
    'next_at', next_at
  );
END;
$$;

-- ============================================================
-- 2) TONIGHT INTENT
-- ============================================================
CREATE TABLE public.tonight_intents (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  intent_date date NOT NULL,
  note text,
  venue_id uuid REFERENCES public.venues(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, intent_date)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.tonight_intents TO authenticated;
GRANT ALL ON public.tonight_intents TO service_role;

ALTER TABLE public.tonight_intents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tonight_intents_self_all" ON public.tonight_intents
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "tonight_intents_friends_read" ON public.tonight_intents
  FOR SELECT TO authenticated
  USING (public.are_friends(auth.uid(), user_id));

CREATE INDEX idx_tonight_intents_date ON public.tonight_intents (intent_date, user_id);

CREATE TRIGGER trg_tonight_intents_updated
  BEFORE UPDATE ON public.tonight_intents
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.set_tonight_intent(_date date, _note text DEFAULT NULL, _venue_id uuid DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
BEGIN
  IF uid IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'not_authenticated');
  END IF;

  INSERT INTO public.tonight_intents (user_id, intent_date, note, venue_id)
    VALUES (uid, _date, _note, _venue_id)
  ON CONFLICT (user_id, intent_date)
    DO UPDATE SET note = EXCLUDED.note,
                  venue_id = EXCLUDED.venue_id,
                  updated_at = now();

  RETURN jsonb_build_object('ok', true, 'intent_date', _date);
END;
$$;

CREATE OR REPLACE FUNCTION public.clear_tonight_intent(_date date)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
BEGIN
  IF uid IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'not_authenticated');
  END IF;

  DELETE FROM public.tonight_intents
    WHERE user_id = uid AND intent_date = _date;

  RETURN jsonb_build_object('ok', true);
END;
$$;

CREATE OR REPLACE FUNCTION public.get_tonight_friends(_date date DEFAULT NULL)
RETURNS TABLE(
  user_id uuid,
  handle text,
  display_name text,
  avatar_url text,
  note text,
  venue_id uuid,
  venue_name text,
  current_streak integer,
  is_checked_in boolean,
  set_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH d AS (
    SELECT COALESCE(_date, (now() AT TIME ZONE 'Europe/Bucharest')::date) AS day
  )
  SELECT
    p.id AS user_id,
    p.handle,
    p.display_name,
    p.avatar_url,
    ti.note,
    ti.venue_id,
    v.name AS venue_name,
    p.current_streak,
    EXISTS (
      SELECT 1 FROM public.check_ins ci
      WHERE ci.user_id = p.id
        AND ci.expires_at > now()
    ) AS is_checked_in,
    ti.created_at AS set_at
  FROM public.tonight_intents ti
  JOIN public.profiles p ON p.id = ti.user_id
  LEFT JOIN public.venues v ON v.id = ti.venue_id
  CROSS JOIN d
  WHERE ti.intent_date = d.day
    AND ti.user_id <> auth.uid()
    AND public.are_friends(auth.uid(), ti.user_id)
  ORDER BY is_checked_in DESC, ti.created_at DESC;
$$;

-- ============================================================
-- 3) STREAK STATUS HELPER
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_streak_status(_user_id uuid DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := COALESCE(_user_id, auth.uid());
  p record;
  this_week date;
  has_this_week boolean;
  expires_at timestamptz;
BEGIN
  IF uid IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'not_authenticated');
  END IF;

  SELECT current_streak, longest_streak, last_streak_week
    INTO p FROM public.profiles WHERE id = uid;

  this_week := public.iso_week_start(now());
  has_this_week := (p.last_streak_week IS NOT NULL AND p.last_streak_week = this_week);

  -- The streak resets if next weekend (Fri/Sat/Sun) passes without a check-in.
  -- Expires_at = end of next-week Sunday (Bucharest tz).
  expires_at := ((this_week + 14) || ' 03:00')::timestamp AT TIME ZONE 'Europe/Bucharest';

  RETURN jsonb_build_object(
    'ok', true,
    'current_streak', COALESCE(p.current_streak, 0),
    'longest_streak', COALESCE(p.longest_streak, 0),
    'this_week_done', has_this_week,
    'this_week_start', this_week,
    'expires_at', expires_at
  );
END;
$$;
