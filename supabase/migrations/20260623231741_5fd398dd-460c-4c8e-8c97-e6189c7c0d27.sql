
CREATE OR REPLACE FUNCTION public.has_active_premium(_user_id uuid, _min_tier text DEFAULT 'vip')
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH ranks(tier, rank) AS (
    VALUES ('vip', 1), ('vip_plus', 2), ('pro', 3), ('elite', 4)
  ),
  req AS (SELECT rank FROM ranks WHERE tier = _min_tier),
  prof AS (
    SELECT premium_tier::text AS tier_txt, premium_until
    FROM public.profiles
    WHERE id = _user_id
  )
  SELECT COALESCE(
    (SELECT
       r.rank >= (SELECT rank FROM req)
       AND (p.premium_until IS NULL OR p.premium_until > now())
     FROM prof p
     LEFT JOIN ranks r ON r.tier = p.tier_txt),
    false
  );
$$;

GRANT EXECUTE ON FUNCTION public.has_active_premium(uuid, text) TO authenticated, anon, service_role;
