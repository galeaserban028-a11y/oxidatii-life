
-- Crystal Ball: profile visits + unlock window
CREATE TABLE public.profile_visits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  visitor_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  profile_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  visited_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT profile_visits_no_self CHECK (visitor_id <> profile_id)
);
CREATE INDEX idx_profile_visits_profile_time ON public.profile_visits(profile_id, visited_at DESC);
CREATE INDEX idx_profile_visits_visitor ON public.profile_visits(visitor_id);

GRANT SELECT, INSERT ON public.profile_visits TO authenticated;
GRANT ALL ON public.profile_visits TO service_role;
ALTER TABLE public.profile_visits ENABLE ROW LEVEL SECURITY;

-- Only the owner can see who visited them (via Crystal Ball RPC); direct selects locked down
CREATE POLICY "Visitor can insert own visit"
  ON public.profile_visits FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = visitor_id);

CREATE POLICY "Profile owner can read own visits"
  ON public.profile_visits FOR SELECT TO authenticated
  USING (auth.uid() = profile_id);

-- Crystal Ball unlocks (7-day windows)
CREATE TABLE public.crystal_ball_unlocks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  unlocked_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL,
  price_coins int NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_crystal_unlocks_user_active ON public.crystal_ball_unlocks(user_id, expires_at DESC);

GRANT SELECT ON public.crystal_ball_unlocks TO authenticated;
GRANT ALL ON public.crystal_ball_unlocks TO service_role;
ALTER TABLE public.crystal_ball_unlocks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users see own unlocks"
  ON public.crystal_ball_unlocks FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

-- RPC: record a profile visit (debounced to 1/hour per visitor->profile)
CREATE OR REPLACE FUNCTION public.record_profile_visit(_profile_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
BEGIN
  IF uid IS NULL OR uid = _profile_id THEN RETURN; END IF;
  IF public.is_blocked(uid, _profile_id) THEN RETURN; END IF;

  IF EXISTS (
    SELECT 1 FROM public.profile_visits
    WHERE visitor_id = uid AND profile_id = _profile_id
      AND visited_at > now() - interval '1 hour'
  ) THEN RETURN; END IF;

  INSERT INTO public.profile_visits (visitor_id, profile_id) VALUES (uid, _profile_id);
END $$;

-- RPC: unlock Crystal Ball (7 days) — costs 30 șprițuri pentru acum (Stripe vine mai târziu)
CREATE OR REPLACE FUNCTION public.unlock_crystal_ball()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
  active record;
  price int := 30;
  new_expires timestamptz;
BEGIN
  IF uid IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'not_authenticated');
  END IF;

  SELECT * INTO active FROM public.crystal_ball_unlocks
   WHERE user_id = uid AND expires_at > now()
   ORDER BY expires_at DESC LIMIT 1;
  IF FOUND THEN
    RETURN jsonb_build_object('ok', true, 'already_active', true, 'expires_at', active.expires_at);
  END IF;

  PERFORM public.spend_coins(price, 'crystal_ball', NULL);

  new_expires := now() + interval '7 days';
  INSERT INTO public.crystal_ball_unlocks (user_id, expires_at, price_coins)
    VALUES (uid, new_expires, price);

  RETURN jsonb_build_object('ok', true, 'expires_at', new_expires, 'price_coins', price);
END $$;

-- RPC: get Crystal Ball data (profile visitors + nearby users last 7 days)
CREATE OR REPLACE FUNCTION public.get_crystal_ball()
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
  active record;
  visitors jsonb;
  nearby jsonb;
BEGIN
  IF uid IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'not_authenticated');
  END IF;

  SELECT * INTO active FROM public.crystal_ball_unlocks
   WHERE user_id = uid AND expires_at > now()
   ORDER BY expires_at DESC LIMIT 1;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', true, 'unlocked', false);
  END IF;

  SELECT COALESCE(jsonb_agg(row_to_json(v) ORDER BY v.last_visit DESC), '[]'::jsonb) INTO visitors
  FROM (
    SELECT pv.visitor_id AS user_id,
           p.handle, p.display_name, p.avatar_url,
           MAX(pv.visited_at) AS last_visit,
           COUNT(*)::int AS visit_count
    FROM public.profile_visits pv
    JOIN public.profiles p ON p.id = pv.visitor_id
    WHERE pv.profile_id = uid
      AND pv.visited_at > now() - interval '7 days'
    GROUP BY pv.visitor_id, p.handle, p.display_name, p.avatar_url
    ORDER BY last_visit DESC
    LIMIT 50
  ) v;

  -- Nearby: users seen within ~500m via live_locations in last 7 days
  SELECT COALESCE(jsonb_agg(row_to_json(n) ORDER BY n.last_seen DESC), '[]'::jsonb) INTO nearby
  FROM (
    SELECT ll.user_id,
           p.handle, p.display_name, p.avatar_url,
           MAX(ll.updated_at) AS last_seen
    FROM public.live_locations ll
    JOIN public.profiles p ON p.id = ll.user_id
    JOIN public.live_locations me ON me.user_id = uid
    WHERE ll.user_id <> uid
      AND ll.updated_at > now() - interval '7 days'
      AND me.updated_at > now() - interval '7 days'
      AND (
        6371000 * acos(
          LEAST(1, GREATEST(-1,
            cos(radians(me.lat)) * cos(radians(ll.lat))
            * cos(radians(ll.lng) - radians(me.lng))
            + sin(radians(me.lat)) * sin(radians(ll.lat))
          ))
        )
      ) < 500
    GROUP BY ll.user_id, p.handle, p.display_name, p.avatar_url
    LIMIT 50
  ) n;

  RETURN jsonb_build_object(
    'ok', true,
    'unlocked', true,
    'expires_at', active.expires_at,
    'visitors', visitors,
    'nearby', nearby
  );
END $$;
