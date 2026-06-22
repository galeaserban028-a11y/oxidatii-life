
-- 1) business_reviews: drop public-read policy, allow only authenticated; remove reviewer_id exposure handled in client
DROP POLICY IF EXISTS "Reviews public read" ON public.business_reviews;
CREATE POLICY "Reviews authenticated read"
  ON public.business_reviews
  FOR SELECT
  TO authenticated
  USING (true);

-- 2) campaign_events: replace owner-row read with aggregate RPC
DROP POLICY IF EXISTS campaign_events_owner_read ON public.campaign_events;

CREATE OR REPLACE FUNCTION public.get_campaign_event_stats(_campaign_id uuid)
RETURNS TABLE(event_type text, event_count bigint, unique_users bigint)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT ce.event_type,
         COUNT(*)::bigint AS event_count,
         COUNT(DISTINCT ce.user_id)::bigint AS unique_users
  FROM public.campaign_events ce
  JOIN public.campaigns c ON c.id = ce.campaign_id
  JOIN public.business_accounts b ON b.id = c.business_id
  WHERE ce.campaign_id = _campaign_id
    AND (b.owner_user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'::app_role))
  GROUP BY ce.event_type;
$$;
GRANT EXECUTE ON FUNCTION public.get_campaign_event_stats(uuid) TO authenticated;

-- 3) profiles: revoke SELECT on sensitive private columns from anon/authenticated
REVOKE SELECT (coin_balance, last_boost_at, map_ghost, map_visibility, map_precision, location_consent)
  ON public.profiles FROM anon, authenticated;

-- Self-access RPC for the signed-in user
CREATE OR REPLACE FUNCTION public.get_my_account_state()
RETURNS TABLE(
  coin_balance integer,
  last_boost_at timestamptz,
  map_ghost boolean,
  map_visibility text,
  map_precision text,
  location_consent boolean
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.coin_balance,
         p.last_boost_at,
         p.map_ghost,
         p.map_visibility::text,
         p.map_precision::text,
         p.location_consent
  FROM public.profiles p
  WHERE p.id = auth.uid();
$$;
GRANT EXECUTE ON FUNCTION public.get_my_account_state() TO authenticated;
