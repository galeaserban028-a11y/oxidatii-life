
-- 1. business_accounts: hide sensitive financial/contact fields from public
DROP POLICY IF EXISTS business_accounts_public_read ON public.business_accounts;

CREATE POLICY business_accounts_auth_read
  ON public.business_accounts FOR SELECT
  TO authenticated
  USING (true);

-- Public view exposes only safe brand/marketing columns
CREATE OR REPLACE VIEW public.business_accounts_public
WITH (security_invoker = on) AS
SELECT
  id, brand_name, slug, type, tier, verified, logo_url, cover_url,
  description, website, instagram_handle, tiktok_handle,
  address, lat, lng, city_id, venue_id, created_at
FROM public.business_accounts;

GRANT SELECT ON public.business_accounts_public TO anon, authenticated;

-- 2. profiles: respect is_public for anonymous viewers
DROP POLICY IF EXISTS profiles_public_read ON public.profiles;

CREATE POLICY profiles_anon_public_only
  ON public.profiles FOR SELECT
  TO anon
  USING (is_public = true);

CREATE POLICY profiles_authenticated_read
  ON public.profiles FOR SELECT
  TO authenticated
  USING (
    is_public = true
    OR auth.uid() = id
    OR public.can_view_profile(auth.uid(), id)
    OR public.has_role(auth.uid(), 'admin'::app_role)
    OR public.has_role(auth.uid(), 'moderator'::app_role)
  );

-- 3. check_ins: restrict to authenticated users
DROP POLICY IF EXISTS check_ins_public_live_read ON public.check_ins;

CREATE POLICY check_ins_auth_live_read
  ON public.check_ins FOR SELECT
  TO authenticated
  USING (expires_at > now());

-- 4. follows: restrict to authenticated users
DROP POLICY IF EXISTS follows_public_accepted_read ON public.follows;

CREATE POLICY follows_auth_accepted_read
  ON public.follows FOR SELECT
  TO authenticated
  USING (status = 'accepted');

-- 5. party_joins: restrict to authenticated users
DROP POLICY IF EXISTS party_joins_public_read ON public.party_joins;

CREATE POLICY party_joins_auth_read
  ON public.party_joins FOR SELECT
  TO authenticated
  USING (true);

-- 6. sprit_proofs: restrict to authenticated users
DROP POLICY IF EXISTS sprit_proofs_public_read ON public.sprit_proofs;

CREATE POLICY sprit_proofs_auth_read
  ON public.sprit_proofs FOR SELECT
  TO authenticated
  USING (true);

-- 7. Revoke EXECUTE on SECURITY DEFINER helper functions from anon
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.are_friends(uuid, uuid) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.is_blocked(uuid, uuid) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.is_conversation_member(uuid, uuid) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.can_view_profile(uuid, uuid) FROM anon, public;

GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.are_friends(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_blocked(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_conversation_member(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_view_profile(uuid, uuid) TO authenticated;
