
-- 1) business_accounts: restrict direct reads, expose public view
DROP POLICY IF EXISTS business_accounts_auth_read ON public.business_accounts;
CREATE POLICY business_accounts_owner_admin_read ON public.business_accounts
  FOR SELECT TO authenticated
  USING (owner_user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'::app_role));

CREATE OR REPLACE VIEW public.business_accounts_public
WITH (security_invoker = true) AS
SELECT id, type, brand_name, slug, city_id, venue_id, verified, tier, pro_tier,
       cover_url, logo_url, description, website, instagram_handle, tiktok_handle,
       address, lat, lng, reputation_score, total_reviews, total_visits,
       is_exclusive_slot, exclusive_city_id, featured_score, live_energy,
       owner_user_id, created_at
FROM public.business_accounts
WHERE suspended_until IS NULL OR suspended_until <= now();

-- Views need their own table-level grant; underlying RLS still applies, so we
-- add a permissive "anyone may read public columns" policy that the view uses.
CREATE POLICY business_accounts_public_view_read ON public.business_accounts
  FOR SELECT TO anon, authenticated
  USING (false);
-- (placeholder to keep policy list stable — view runs with caller's privileges)

GRANT SELECT ON public.business_accounts_public TO anon, authenticated;

-- To let the security_invoker view actually return rows, add a narrow policy
-- that only matches when the caller queries through the view. Simplest: allow
-- read of non-sensitive columns by re-granting select via a definer function.
DROP POLICY IF EXISTS business_accounts_public_view_read ON public.business_accounts;

CREATE OR REPLACE FUNCTION public.list_business_accounts_public()
RETURNS SETOF public.business_accounts_public
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT * FROM public.business_accounts_public;
$$;
GRANT EXECUTE ON FUNCTION public.list_business_accounts_public() TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.get_business_account_public(_id uuid)
RETURNS SETOF public.business_accounts_public
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT * FROM public.business_accounts_public WHERE id = _id;
$$;
GRANT EXECUTE ON FUNCTION public.get_business_account_public(uuid) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.get_business_account_public_by_venue(_venue_id uuid)
RETURNS SETOF public.business_accounts_public
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT * FROM public.business_accounts_public WHERE venue_id = _venue_id LIMIT 1;
$$;
GRANT EXECUTE ON FUNCTION public.get_business_account_public_by_venue(uuid) TO anon, authenticated;

-- 2) profiles: drop anon SELECT entirely
DROP POLICY IF EXISTS profiles_anon_public_only ON public.profiles;
REVOKE SELECT ON public.profiles FROM anon;

-- 3) heat_alerts_sent: admin-only read
DROP POLICY IF EXISTS heat_alerts_sent_auth_read ON public.heat_alerts_sent;
CREATE POLICY heat_alerts_sent_admin_read ON public.heat_alerts_sent
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

-- 4) generate_referral_code: set fixed search_path
CREATE OR REPLACE FUNCTION public.generate_referral_code()
RETURNS text
LANGUAGE plpgsql
SET search_path = public
AS $function$
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
END $function$;
