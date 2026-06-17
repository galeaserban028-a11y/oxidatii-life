
-- 1) business_accounts: hide sensitive columns from non-owners via column-level GRANT
REVOKE SELECT ON public.business_accounts FROM anon, authenticated;
GRANT SELECT (
  id, slug, owner_user_id, type, brand_name, city_id, venue_id, verified, tier,
  created_at, updated_at, cover_url, logo_url, description, website,
  instagram_handle, tiktok_handle, address, lat, lng,
  reputation_score, total_reviews, total_visits,
  pro_tier, is_exclusive_slot, exclusive_city_id, featured_score, live_energy
) ON public.business_accounts TO anon, authenticated;
GRANT ALL ON public.business_accounts TO service_role;
-- Owners and admins read sensitive fields through SECURITY DEFINER functions (already present).

-- 2) campaign_events: do not expose viewer/clicker user_id to business owners
REVOKE SELECT ON public.campaign_events FROM anon, authenticated;
GRANT SELECT (id, campaign_id, event_type, cost_cents, created_at) ON public.campaign_events TO authenticated;
GRANT ALL ON public.campaign_events TO service_role;

-- 3) profile_visits: drop direct owner SELECT; only readable via get_crystal_ball SECURITY DEFINER
DROP POLICY IF EXISTS "Profile owner can read own visits" ON public.profile_visits;

-- 4) coin_spends: explicit restrictive policy so client writes are impossible
DROP POLICY IF EXISTS coin_spends_no_client_writes ON public.coin_spends;
CREATE POLICY coin_spends_no_client_writes ON public.coin_spends
  AS RESTRICTIVE FOR ALL TO anon, authenticated
  USING (false) WITH CHECK (false);
-- (SECURITY DEFINER functions bypass RLS, so spend_coins/admin_grant_coins keep working.)

-- 5) coin_boosts / user_frames: lock client INSERTs; require atomic RPCs
DROP POLICY IF EXISTS coin_boosts_self_insert ON public.coin_boosts;
DROP POLICY IF EXISTS user_frames_self_insert ON public.user_frames;

CREATE OR REPLACE FUNCTION public.buy_boost(_kind text, _target_id uuid DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  uid uuid := auth.uid();
  cost int;
  hours int;
  expires timestamptz;
  new_bal int;
  new_id uuid;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'Trebuie să fii autentificat'; END IF;
  IF _kind = 'profile' THEN cost := 5; hours := 24;
  ELSIF _kind = 'party' THEN
    cost := 15; hours := 12;
    IF _target_id IS NULL THEN RAISE EXCEPTION 'Lipsește petrecerea'; END IF;
    IF NOT EXISTS (SELECT 1 FROM public.parties WHERE id = _target_id AND host_id = uid) THEN
      RAISE EXCEPTION 'Nu ești gazda acestei petreceri';
    END IF;
  ELSE RAISE EXCEPTION 'Tip de boost invalid';
  END IF;

  new_bal := public.spend_coins(cost, 'boost_'||_kind, _target_id::text);
  expires := now() + (hours || ' hours')::interval;
  INSERT INTO public.coin_boosts (user_id, kind, target_id, expires_at, cost_coins)
    VALUES (uid, _kind, _target_id, expires, cost)
    RETURNING id INTO new_id;
  RETURN jsonb_build_object('ok', true, 'id', new_id, 'expires_at', expires, 'balance', new_bal);
END $$;
GRANT EXECUTE ON FUNCTION public.buy_boost(text, uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.buy_frame(_frame_id text)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  uid uuid := auth.uid();
  price int;
  new_bal int;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'Trebuie să fii autentificat'; END IF;
  IF EXISTS (SELECT 1 FROM public.user_frames WHERE user_id = uid AND frame_id = _frame_id) THEN
    UPDATE public.profiles SET active_frame_id = _frame_id WHERE id = uid;
    RETURN jsonb_build_object('ok', true, 'already_owned', true);
  END IF;
  SELECT price_coins INTO price FROM public.avatar_frames WHERE id = _frame_id;
  IF price IS NULL THEN RAISE EXCEPTION 'Ramă inexistentă'; END IF;
  new_bal := public.spend_coins(price, 'frame', _frame_id);
  INSERT INTO public.user_frames (user_id, frame_id) VALUES (uid, _frame_id);
  UPDATE public.profiles SET active_frame_id = _frame_id WHERE id = uid;
  RETURN jsonb_build_object('ok', true, 'balance', new_bal);
END $$;
GRANT EXECUTE ON FUNCTION public.buy_frame(text) TO authenticated;
