
-- 1) PROFILES: hide sensitive columns from anonymous visitors via column-level grants.
-- Authenticated users continue to use the existing profiles_authenticated_read policy
-- which already includes can_view_profile / role checks.
REVOKE SELECT ON public.profiles FROM anon;
GRANT SELECT (
  id, handle, display_name, avatar_url, bio, rank, is_public, city_id,
  active_frame_id, onboarded, created_at, updated_at
) ON public.profiles TO anon;

-- 2) BUSINESS_ACCOUNTS: hide contact_email and contact_phone from all non-owner authenticated users.
-- Drop the broad read policy and replace with two policies:
--   - everyone authenticated can read non-sensitive columns (via column grants)
--   - owners + admins can read everything (including contact info) on their own rows
REVOKE SELECT ON public.business_accounts FROM authenticated;
GRANT SELECT (
  id, owner_user_id, brand_name, slug, type, tier, city_id, venue_id,
  address, lat, lng, cover_url, logo_url, description, website,
  instagram_handle, tiktok_handle, verified, wallet_balance_cents,
  monthly_credits_cents, created_at, updated_at
) ON public.business_accounts TO authenticated;

-- Owners + admins also get the sensitive columns
GRANT SELECT (contact_email, contact_phone) ON public.business_accounts TO authenticated;

-- Replace the catch-all read policy with one that hides contact info via app code
-- (column GRANTs allow contact_* to authenticated, but we add a restrictive
--  row-level policy that limits which rows can be projected with those columns
--  through a security-definer helper used by the UI).
DROP POLICY IF EXISTS business_accounts_auth_read ON public.business_accounts;

-- Anyone authenticated can read business profiles (rows), column grants control what cols
CREATE POLICY business_accounts_auth_read
  ON public.business_accounts
  FOR SELECT
  TO authenticated
  USING (true);

-- Helper function: only owners/admins can fetch contact info
CREATE OR REPLACE FUNCTION public.get_business_contact(_business_id uuid)
RETURNS TABLE(contact_email text, contact_phone text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT contact_email, contact_phone
  FROM public.business_accounts
  WHERE id = _business_id
    AND (owner_user_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role));
$$;

REVOKE ALL ON FUNCTION public.get_business_contact(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_business_contact(uuid) TO authenticated;

-- Now remove the column-level grant on contact_* columns from generic authenticated users.
-- The helper function above is the only sanctioned path for owners/admins.
REVOKE SELECT (contact_email, contact_phone) ON public.business_accounts FROM authenticated;

-- 3) COIN_BOOSTS: restrict reads to the owning user only.
DROP POLICY IF EXISTS coin_boosts_auth_read_active ON public.coin_boosts;
CREATE POLICY coin_boosts_self_read_active
  ON public.coin_boosts
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id AND expires_at > now());
