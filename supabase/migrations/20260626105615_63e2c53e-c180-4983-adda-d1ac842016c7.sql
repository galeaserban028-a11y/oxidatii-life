
-- ============================================================
-- REPLAY NIGHT — unlock per-day wrap of activity
-- ============================================================
CREATE TABLE public.replay_unlocks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  unlock_date date NOT NULL,
  stripe_session_id text UNIQUE,
  purchased_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, unlock_date)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.replay_unlocks TO authenticated;
GRANT ALL ON public.replay_unlocks TO service_role;
ALTER TABLE public.replay_unlocks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owner can view own unlocks" ON public.replay_unlocks
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE INDEX idx_replay_unlocks_user_date ON public.replay_unlocks(user_id, unlock_date DESC);

-- ============================================================
-- LAST CALL — anonymous ping with paid reveal
-- ============================================================
CREATE TABLE public.last_call_pings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  target_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '24 hours'),
  revealed_at timestamptz,
  sender_stripe_session_id text UNIQUE,
  reveal_stripe_session_id text UNIQUE,
  CHECK (sender_id <> target_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.last_call_pings TO authenticated;
GRANT ALL ON public.last_call_pings TO service_role;
ALTER TABLE public.last_call_pings ENABLE ROW LEVEL SECURITY;

-- NOTE: no direct SELECT policy for target — they must use get_my_last_calls() RPC
-- which masks sender_id until revealed.
CREATE POLICY "Sender can view own pings" ON public.last_call_pings
  FOR SELECT TO authenticated USING (auth.uid() = sender_id);

CREATE INDEX idx_last_call_target ON public.last_call_pings(target_id, created_at DESC) WHERE revealed_at IS NULL;
CREATE INDEX idx_last_call_sender ON public.last_call_pings(sender_id, created_at DESC);

-- ============================================================
-- RPC: grant_replay_unlock (called from webhook/syncCheckout)
-- ============================================================
CREATE OR REPLACE FUNCTION public.grant_replay_unlock(_user_id uuid, _date date, _session text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.replay_unlocks (user_id, unlock_date, stripe_session_id)
    VALUES (_user_id, _date, _session)
    ON CONFLICT (user_id, unlock_date) DO NOTHING;
  RETURN jsonb_build_object('ok', true);
END;
$$;

-- ============================================================
-- RPC: get_replay_data (returns aggregated night activity)
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_replay_data(_date date)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
  has_unlock boolean;
  d_start timestamptz;
  d_end timestamptz;
  checkins jsonb;
  photos jsonb;
  proofs_count int;
  parties_joined jsonb;
  top_venue text;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'not_authenticated'; END IF;
  SELECT EXISTS(SELECT 1 FROM public.replay_unlocks WHERE user_id = uid AND unlock_date = _date) INTO has_unlock;
  IF NOT has_unlock THEN
    RETURN jsonb_build_object('ok', false, 'error', 'not_unlocked');
  END IF;

  -- Night window: 18:00 of _date until 06:00 next day (Bucharest tz)
  d_start := ((_date::text || ' 18:00')::timestamp AT TIME ZONE 'Europe/Bucharest');
  d_end := (((_date + 1)::text || ' 06:00')::timestamp AT TIME ZONE 'Europe/Bucharest');

  SELECT COALESCE(jsonb_agg(row_to_json(c) ORDER BY c.created_at), '[]'::jsonb) INTO checkins
  FROM (
    SELECT ci.id, ci.created_at, v.id AS venue_id, v.name AS venue_name, v.lat, v.lng
    FROM public.check_ins ci
    LEFT JOIN public.venues v ON v.id = ci.venue_id
    WHERE ci.user_id = uid AND ci.created_at BETWEEN d_start AND d_end
  ) c;

  SELECT COALESCE(jsonb_agg(row_to_json(p) ORDER BY p.created_at), '[]'::jsonb) INTO photos
  FROM (
    SELECT vp.id, vp.photo_url, vp.created_at, v.name AS venue_name
    FROM public.venue_photos vp
    LEFT JOIN public.venues v ON v.id = vp.venue_id
    WHERE vp.user_id = uid AND vp.created_at BETWEEN d_start AND d_end
  ) p;

  SELECT COUNT(*)::int INTO proofs_count FROM public.sprit_proofs
    WHERE user_id = uid AND created_at BETWEEN d_start AND d_end;

  SELECT COALESCE(jsonb_agg(DISTINCT row_to_json(pj)), '[]'::jsonb) INTO parties_joined
  FROM (
    SELECT p.id, p.title, p.starts_at, v.name AS venue_name
    FROM public.party_joins pj
    JOIN public.parties p ON p.id = pj.party_id
    LEFT JOIN public.venues v ON v.id = p.venue_id
    WHERE pj.user_id = uid AND pj.created_at BETWEEN d_start AND d_end
  ) pj;

  SELECT v.name INTO top_venue
  FROM public.check_ins ci
  LEFT JOIN public.venues v ON v.id = ci.venue_id
  WHERE ci.user_id = uid AND ci.created_at BETWEEN d_start AND d_end AND v.name IS NOT NULL
  GROUP BY v.name
  ORDER BY COUNT(*) DESC
  LIMIT 1;

  RETURN jsonb_build_object(
    'ok', true,
    'date', _date,
    'checkins', checkins,
    'photos', photos,
    'sprit_proofs', proofs_count,
    'parties', parties_joined,
    'top_venue', top_venue,
    'venues_count', jsonb_array_length(checkins)
  );
END;
$$;

-- ============================================================
-- RPC: create_last_call_ping (sender bought; insert + push)
-- ============================================================
CREATE OR REPLACE FUNCTION public.create_last_call_ping(_target_id uuid, _session text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
  new_id uuid;
  daily_count int;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'not_authenticated'; END IF;
  IF uid = _target_id THEN RAISE EXCEPTION 'cannot_target_self'; END IF;
  IF public.is_blocked(uid, _target_id) THEN RAISE EXCEPTION 'blocked'; END IF;

  -- Anti-abuse: max 5 pings/day per sender
  SELECT COUNT(*) INTO daily_count FROM public.last_call_pings
    WHERE sender_id = uid AND created_at > now() - interval '24 hours';
  IF daily_count >= 5 THEN RAISE EXCEPTION 'daily_limit_reached'; END IF;

  -- Dedupe: same sender→target in last 24h returns existing
  SELECT id INTO new_id FROM public.last_call_pings
    WHERE sender_id = uid AND target_id = _target_id
      AND created_at > now() - interval '24 hours'
    LIMIT 1;
  IF FOUND THEN RETURN new_id; END IF;

  INSERT INTO public.last_call_pings (sender_id, target_id, sender_stripe_session_id)
    VALUES (uid, _target_id, _session)
    RETURNING id INTO new_id;

  -- Notify target (without revealing sender)
  INSERT INTO public.notifications (user_id, actor_id, type)
    VALUES (_target_id, NULL, 'last_call_received');

  RETURN new_id;
END;
$$;

-- ============================================================
-- RPC: get_my_last_calls (target inbox; sender masked until revealed)
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_my_last_calls()
RETURNS TABLE(
  id uuid,
  created_at timestamptz,
  expires_at timestamptz,
  revealed_at timestamptz,
  sender_id uuid,
  sender_handle text,
  sender_display_name text,
  sender_avatar_url text
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'not_authenticated'; END IF;
  RETURN QUERY
  SELECT
    lcp.id,
    lcp.created_at,
    lcp.expires_at,
    lcp.revealed_at,
    CASE WHEN lcp.revealed_at IS NOT NULL THEN lcp.sender_id ELSE NULL END,
    CASE WHEN lcp.revealed_at IS NOT NULL THEN p.handle ELSE NULL END,
    CASE WHEN lcp.revealed_at IS NOT NULL THEN p.display_name ELSE NULL END,
    CASE WHEN lcp.revealed_at IS NOT NULL THEN p.avatar_url ELSE NULL END
  FROM public.last_call_pings lcp
  LEFT JOIN public.profiles p ON p.id = lcp.sender_id
  WHERE lcp.target_id = uid AND lcp.expires_at > now()
  ORDER BY lcp.created_at DESC;
END;
$$;

-- ============================================================
-- RPC: reveal_last_call (target paid; mark revealed)
-- ============================================================
CREATE OR REPLACE FUNCTION public.reveal_last_call(_ping_id uuid, _session text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
  ping record;
  sender_profile record;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'not_authenticated'; END IF;

  SELECT * INTO ping FROM public.last_call_pings WHERE id = _ping_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'ping_not_found'; END IF;
  IF ping.target_id <> uid THEN RAISE EXCEPTION 'forbidden'; END IF;
  IF ping.expires_at < now() THEN RAISE EXCEPTION 'expired'; END IF;

  UPDATE public.last_call_pings
    SET revealed_at = now(), reveal_stripe_session_id = _session
    WHERE id = _ping_id;

  SELECT id, handle, display_name, avatar_url INTO sender_profile
    FROM public.profiles WHERE id = ping.sender_id;

  RETURN jsonb_build_object(
    'ok', true,
    'sender_id', sender_profile.id,
    'handle', sender_profile.handle,
    'display_name', sender_profile.display_name,
    'avatar_url', sender_profile.avatar_url
  );
END;
$$;

-- Lock down execute privileges to authenticated only
REVOKE EXECUTE ON FUNCTION public.grant_replay_unlock(uuid, date, text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.create_last_call_ping(uuid, text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.reveal_last_call(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_replay_data(date) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_my_last_calls() TO authenticated;
