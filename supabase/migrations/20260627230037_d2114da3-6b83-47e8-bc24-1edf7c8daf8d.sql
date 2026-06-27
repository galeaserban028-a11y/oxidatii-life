
-- 1. Profiles: referral fields
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS referral_code TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS referred_by UUID REFERENCES auth.users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_profiles_referred_by ON public.profiles(referred_by);
CREATE INDEX IF NOT EXISTS idx_profiles_referral_code ON public.profiles(referral_code);

-- 2. Generate referral code on insert/backfill
CREATE OR REPLACE FUNCTION public.generate_referral_code()
RETURNS TEXT LANGUAGE plpgsql AS $$
DECLARE
  v_code TEXT;
  v_exists BOOLEAN;
BEGIN
  LOOP
    v_code := upper(substring(md5(random()::text || clock_timestamp()::text) for 7));
    SELECT EXISTS(SELECT 1 FROM public.profiles WHERE referral_code = v_code) INTO v_exists;
    EXIT WHEN NOT v_exists;
  END LOOP;
  RETURN v_code;
END $$;

CREATE OR REPLACE FUNCTION public.set_referral_code()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.referral_code IS NULL THEN
    NEW.referral_code := public.generate_referral_code();
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_set_referral_code ON public.profiles;
CREATE TRIGGER trg_set_referral_code
  BEFORE INSERT ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_referral_code();

-- Backfill existing
UPDATE public.profiles SET referral_code = public.generate_referral_code() WHERE referral_code IS NULL;

-- 3. Founding Member frame in catalog (price 0, but only granted by referral)
INSERT INTO public.avatar_frames (id, name, css_class, emoji, price_coins, premium_tier_required)
VALUES ('founding-member', 'Founding Member', 'frame-founding', '👑', 99999, NULL)
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, css_class = EXCLUDED.css_class, emoji = EXCLUDED.emoji;

-- 4. RPC: apply referral code (called from onboarding/signup)
CREATE OR REPLACE FUNCTION public.apply_referral_code(_code TEXT)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_referrer UUID;
  v_count INT;
BEGIN
  IF v_uid IS NULL THEN RETURN jsonb_build_object('ok', false, 'error', 'not_authenticated'); END IF;
  IF _code IS NULL OR length(_code) < 4 THEN RETURN jsonb_build_object('ok', false, 'error', 'invalid_code'); END IF;

  -- Already used a code?
  IF EXISTS(SELECT 1 FROM public.profiles WHERE id = v_uid AND referred_by IS NOT NULL) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'already_referred');
  END IF;

  SELECT id INTO v_referrer FROM public.profiles WHERE referral_code = upper(_code) LIMIT 1;
  IF v_referrer IS NULL THEN RETURN jsonb_build_object('ok', false, 'error', 'code_not_found'); END IF;
  IF v_referrer = v_uid THEN RETURN jsonb_build_object('ok', false, 'error', 'self_referral'); END IF;

  UPDATE public.profiles SET referred_by = v_referrer WHERE id = v_uid;

  -- Bonus 50 coins for new user
  UPDATE public.profiles SET coin_balance = coin_balance + 50 WHERE id = v_uid;
  INSERT INTO public.wallet_ledger (user_id, amount, kind, ref)
  VALUES (v_uid, 50, 'referral_bonus', v_referrer::text)
  ON CONFLICT DO NOTHING;

  -- Check referrer count, grant frame at 3
  SELECT count(*) INTO v_count FROM public.profiles WHERE referred_by = v_referrer;
  IF v_count >= 3 THEN
    INSERT INTO public.user_frames (user_id, frame_id) VALUES (v_referrer, 'founding-member')
    ON CONFLICT (user_id, frame_id) DO NOTHING;
  END IF;

  -- Bonus 25 coins to referrer per invite
  UPDATE public.profiles SET coin_balance = coin_balance + 25 WHERE id = v_referrer;
  INSERT INTO public.wallet_ledger (user_id, amount, kind, ref)
  VALUES (v_referrer, 25, 'referral_invite', v_uid::text)
  ON CONFLICT DO NOTHING;

  RETURN jsonb_build_object('ok', true, 'referrer_count', v_count);
END $$;

REVOKE ALL ON FUNCTION public.apply_referral_code(TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.apply_referral_code(TEXT) TO authenticated;

-- 5. RPC: get my referral stats
CREATE OR REPLACE FUNCTION public.get_my_referral_stats()
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_code TEXT;
  v_count INT;
  v_rank INT;
BEGIN
  IF v_uid IS NULL THEN RETURN jsonb_build_object('ok', false); END IF;
  SELECT referral_code INTO v_code FROM public.profiles WHERE id = v_uid;
  SELECT count(*) INTO v_count FROM public.profiles WHERE referred_by = v_uid;
  SELECT rnk INTO v_rank FROM (
    SELECT referred_by, RANK() OVER (ORDER BY count(*) DESC) AS rnk
    FROM public.profiles WHERE referred_by IS NOT NULL GROUP BY referred_by
  ) r WHERE referred_by = v_uid;

  RETURN jsonb_build_object(
    'ok', true,
    'code', v_code,
    'count', COALESCE(v_count, 0),
    'founding_unlocked', v_count >= 3,
    'hall_of_fame', v_count >= 10,
    'rank', v_rank,
    'next_milestone', CASE WHEN v_count < 3 THEN 3 WHEN v_count < 10 THEN 10 ELSE NULL END
  );
END $$;

REVOKE ALL ON FUNCTION public.get_my_referral_stats() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_my_referral_stats() TO authenticated;

-- 6. RPC: public Hall of Fame
CREATE OR REPLACE FUNCTION public.get_hall_of_fame()
RETURNS TABLE (display_name TEXT, handle TEXT, avatar_url TEXT, invites BIGINT, rank INT)
LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public AS $$
  SELECT p.display_name, p.handle, p.avatar_url, c.invites,
         RANK() OVER (ORDER BY c.invites DESC)::INT AS rank
  FROM (
    SELECT referred_by AS uid, count(*) AS invites
    FROM public.profiles
    WHERE referred_by IS NOT NULL
    GROUP BY referred_by
    HAVING count(*) >= 3
    ORDER BY count(*) DESC
    LIMIT 50
  ) c
  JOIN public.profiles p ON p.id = c.uid
  WHERE p.is_public = true;
$$;

GRANT EXECUTE ON FUNCTION public.get_hall_of_fame() TO anon, authenticated;

-- 7. RPC: public Spritz Drop stats (anon, aggregate only)
CREATE OR REPLACE FUNCTION public.get_drop_stats()
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path = public AS $$
DECLARE
  v_total BIGINT;
  v_users BIGINT;
  v_top_cities JSONB;
  v_top_proof JSONB;
BEGIN
  -- This week's proofs
  SELECT count(*) INTO v_total FROM public.sprit_proofs
  WHERE created_at >= date_trunc('week', now());

  SELECT count(DISTINCT user_id) INTO v_users FROM public.sprit_proofs
  WHERE created_at >= date_trunc('week', now());

  -- Top 3 cities this week
  SELECT COALESCE(jsonb_agg(jsonb_build_object('city', city_name, 'count', cnt) ORDER BY cnt DESC), '[]'::jsonb)
  INTO v_top_cities FROM (
    SELECT c.name AS city_name, count(*) AS cnt
    FROM public.sprit_proofs sp
    JOIN public.profiles p ON p.id = sp.user_id
    JOIN public.cities c ON c.id = p.city_id
    WHERE sp.created_at >= date_trunc('week', now())
    GROUP BY c.name
    ORDER BY count(*) DESC
    LIMIT 3
  ) t;

  -- Top proof of week (most liked)
  SELECT to_jsonb(t) INTO v_top_proof FROM (
    SELECT sp.id, sp.image_url, sp.caption, sp.likes_count, p.display_name, p.handle, p.avatar_url
    FROM public.sprit_proofs sp
    JOIN public.profiles p ON p.id = sp.user_id
    WHERE sp.created_at >= date_trunc('week', now()) AND p.is_public = true
    ORDER BY sp.likes_count DESC NULLS LAST
    LIMIT 1
  ) t;

  RETURN jsonb_build_object(
    'total_spritz', COALESCE(v_total, 0),
    'active_users', COALESCE(v_users, 0),
    'top_cities', v_top_cities,
    'top_proof', v_top_proof,
    'week_start', date_trunc('week', now())
  );
END $$;

GRANT EXECUTE ON FUNCTION public.get_drop_stats() TO anon, authenticated;

-- 8. RPC: monthly wrap for current user
CREATE OR REPLACE FUNCTION public.get_monthly_wrap(_month_start DATE DEFAULT NULL)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path = public AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_start DATE;
  v_end DATE;
  v_proofs BIGINT;
  v_nights BIGINT;
  v_top_venue JSONB;
  v_top_crew JSONB;
  v_badge TEXT;
BEGIN
  IF v_uid IS NULL THEN RETURN jsonb_build_object('ok', false); END IF;
  v_start := COALESCE(_month_start, date_trunc('month', now())::date);
  v_end := (v_start + interval '1 month')::date;

  SELECT count(*) INTO v_proofs FROM public.sprit_proofs
  WHERE user_id = v_uid AND created_at >= v_start AND created_at < v_end;

  SELECT count(DISTINCT date_trunc('day', created_at)) INTO v_nights
  FROM public.sprit_proofs WHERE user_id = v_uid AND created_at >= v_start AND created_at < v_end;

  SELECT to_jsonb(t) INTO v_top_venue FROM (
    SELECT v.id, v.name, count(*) AS visits
    FROM public.sprit_proofs sp
    JOIN public.venues v ON v.id = sp.venue_id
    WHERE sp.user_id = v_uid AND sp.created_at >= v_start AND sp.created_at < v_end
    GROUP BY v.id, v.name
    ORDER BY count(*) DESC LIMIT 1
  ) t;

  SELECT COALESCE(jsonb_agg(jsonb_build_object('id', uid, 'display_name', dn, 'avatar_url', av) ORDER BY hangs DESC), '[]'::jsonb)
  INTO v_top_crew FROM (
    SELECT p.id AS uid, p.display_name AS dn, p.avatar_url AS av, count(*) AS hangs
    FROM public.party_joins pj
    JOIN public.parties pa ON pa.id = pj.party_id
    JOIN public.profiles p ON p.id = pj.user_id
    WHERE pj.status = 'accepted'
      AND pa.created_at >= v_start AND pa.created_at < v_end
      AND pj.user_id <> v_uid
      AND pa.host_id = v_uid
    GROUP BY p.id, p.display_name, p.avatar_url
    ORDER BY count(*) DESC LIMIT 3
  ) t;

  -- Award badge based on activity
  v_badge := CASE
    WHEN v_proofs >= 20 THEN 'Night Legend'
    WHEN v_proofs >= 10 THEN 'Social Butterfly'
    WHEN v_proofs >= 5 THEN 'Spritz Regular'
    WHEN v_proofs >= 1 THEN 'Casual Sipper'
    ELSE 'Ghost'
  END;

  RETURN jsonb_build_object(
    'ok', true,
    'month_start', v_start,
    'proofs', COALESCE(v_proofs, 0),
    'nights', COALESCE(v_nights, 0),
    'top_venue', v_top_venue,
    'top_crew', v_top_crew,
    'badge', v_badge
  );
END $$;

REVOKE ALL ON FUNCTION public.get_monthly_wrap(DATE) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_monthly_wrap(DATE) TO authenticated;
