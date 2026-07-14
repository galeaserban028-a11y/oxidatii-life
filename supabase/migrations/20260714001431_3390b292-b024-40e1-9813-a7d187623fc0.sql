-- ============ 1. profiles: hide sensitive columns from other users ============
REVOKE SELECT (coin_balance, premium_tier, premium_until) ON public.profiles FROM anon;
REVOKE SELECT (coin_balance, premium_tier, premium_until) ON public.profiles FROM authenticated;
-- service_role keeps all access (default GRANT ALL); owner reads via get_my_account_state()

-- ============ 2. follows: scope accepted reads to participants ============
DROP POLICY IF EXISTS "follows_auth_accepted_read" ON public.follows;

CREATE POLICY "follows_participants_read"
  ON public.follows
  FOR SELECT
  TO authenticated
  USING (
    status = 'accepted'
    AND (auth.uid() = follower_id OR auth.uid() = following_id)
  );

CREATE POLICY "follows_admin_read"
  ON public.follows
  FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role));

-- ============ 3. venues: admin-only INSERT ============
DROP POLICY IF EXISTS "venues_auth_insert" ON public.venues;

CREATE POLICY "venues_admin_insert"
  ON public.venues
  FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

-- ============ 4. coin_boosts: explicit self-INSERT policy ============
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'coin_boosts'
      AND cmd = 'INSERT'
  ) THEN
    EXECUTE 'CREATE POLICY "coin_boosts_self_insert" ON public.coin_boosts
             FOR INSERT TO authenticated
             WITH CHECK (auth.uid() = user_id)';
  END IF;
END $$;

-- ============ 5. profile_visits: owner can read their own visitors ============
CREATE POLICY "profile_visits_owner_read"
  ON public.profile_visits
  FOR SELECT
  TO authenticated
  USING (auth.uid() = profile_id);

-- ============ 6. Realtime channel authorization ============
ALTER TABLE IF EXISTS realtime.messages ENABLE ROW LEVEL SECURITY;

-- Helper to check if the current user should be allowed to subscribe to a topic.
-- Topic conventions in the app:
--   conv:<conversation_id>     → must be a conversation member
--   party:<party_id>           → must be host or accepted joiner
--   poll:<poll_id>             → host or conversation member
--   mr-<message_id>            → any authenticated user (message reactions on visible msg)
--   notif:<user_id>            → only that user
--   user:<user_id>             → only that user
--   presence:*, public:*       → any authenticated
CREATE OR REPLACE FUNCTION public.realtime_can_access_topic(_topic text)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
  parts text[];
  prefix text;
  suffix text;
BEGIN
  IF uid IS NULL THEN RETURN false; END IF;
  IF _topic IS NULL OR length(_topic) = 0 THEN RETURN false; END IF;

  parts := regexp_split_to_array(_topic, ':');
  prefix := parts[1];
  suffix := CASE WHEN array_length(parts, 1) >= 2 THEN parts[2] ELSE NULL END;

  IF prefix IN ('presence', 'public') THEN
    RETURN true;
  END IF;

  IF prefix = 'conv' AND suffix IS NOT NULL THEN
    RETURN public.is_conversation_member(suffix::uuid, uid);
  END IF;

  IF prefix IN ('notif', 'user') AND suffix IS NOT NULL THEN
    RETURN suffix::uuid = uid;
  END IF;

  IF prefix = 'party' AND suffix IS NOT NULL THEN
    RETURN EXISTS (
      SELECT 1 FROM public.parties p
      WHERE p.id = suffix::uuid AND p.host_id = uid
    ) OR EXISTS (
      SELECT 1 FROM public.party_joins pj
      WHERE pj.party_id = suffix::uuid AND pj.user_id = uid AND pj.status = 'accepted'
    );
  END IF;

  IF prefix = 'poll' AND suffix IS NOT NULL THEN
    RETURN EXISTS (
      SELECT 1 FROM public.decision_polls dp
      WHERE dp.id = suffix::uuid
        AND (dp.host_id = uid
             OR (dp.conversation_id IS NOT NULL
                 AND public.is_conversation_member(dp.conversation_id, uid)))
    );
  END IF;

  -- Fallback for other prefixes like mr-<message_id>: allow authenticated users;
  -- the underlying tables have their own RLS on payloads.
  RETURN true;
EXCEPTION WHEN others THEN
  -- Bad topic format (e.g. non-uuid suffix) → deny.
  RETURN false;
END;
$$;

GRANT EXECUTE ON FUNCTION public.realtime_can_access_topic(text) TO authenticated;

DROP POLICY IF EXISTS "app_realtime_topic_authorization" ON realtime.messages;
CREATE POLICY "app_realtime_topic_authorization"
  ON realtime.messages
  FOR SELECT
  TO authenticated
  USING (public.realtime_can_access_topic(realtime.topic()));

-- ============ 7. Revoke EXECUTE from anon on all public SECURITY DEFINER fns ============
DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT n.nspname AS schema_name, p.proname AS func_name,
           pg_get_function_identity_arguments(p.oid) AS args
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.prosecdef = true
  LOOP
    EXECUTE format('REVOKE EXECUTE ON FUNCTION %I.%I(%s) FROM PUBLIC, anon',
                   r.schema_name, r.func_name, r.args);
  END LOOP;
END $$;
