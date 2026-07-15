
-- Revoke column-level SELECT on the sensitive financial/subscription
-- columns from ordinary roles. Row-level policies on profiles remain, but
-- these columns will no longer be readable through them.
REVOKE SELECT (coin_balance, premium_tier, premium_until)
  ON public.profiles FROM authenticated;
REVOKE SELECT (coin_balance, premium_tier, premium_until)
  ON public.profiles FROM anon;

-- service_role keeps full access (needed for SECURITY DEFINER RPCs like
-- get_my_account_state / admin_list_users and for server-only writes).
GRANT SELECT (coin_balance, premium_tier, premium_until)
  ON public.profiles TO service_role;

-- Tighten the premium badge RPC so premium status is only revealed to the
-- profile owner or an admin. Anyone else sees NULL/false.
CREATE OR REPLACE FUNCTION public.get_user_premium_badge(_user_id uuid)
RETURNS TABLE(user_id uuid, premium_tier text, has_active_premium boolean, has_active_boost boolean)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT p.id,
         CASE
           WHEN auth.uid() = p.id OR public.has_role(auth.uid(), 'admin'::app_role) THEN
             CASE
               WHEN p.premium_until IS NULL OR p.premium_until > now()
                 THEN p.premium_tier::text
               ELSE NULL
             END
           ELSE NULL
         END AS premium_tier,
         CASE
           WHEN auth.uid() = p.id OR public.has_role(auth.uid(), 'admin'::app_role) THEN
             (p.premium_tier IS NOT NULL
                AND (p.premium_until IS NULL OR p.premium_until > now()))
           ELSE false
         END AS has_active_premium,
         (p.boost_until IS NOT NULL AND p.boost_until > now()) AS has_active_boost
  FROM public.profiles p
  WHERE p.id = _user_id;
$function$;
