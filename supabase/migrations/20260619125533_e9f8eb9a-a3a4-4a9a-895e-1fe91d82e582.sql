
-- Revoke direct column-level SELECT on sensitive business_accounts columns.
-- The broad authenticated SELECT policy stays for non-sensitive discovery
-- columns (brand_name, logo_url, etc.); column grants enforce the rest.
REVOKE SELECT (
  contact_email,
  contact_phone,
  wallet_balance_cents,
  monthly_price_cents,
  monthly_credits_cents,
  suspended_until,
  tier_renews_at,
  pro_until,
  pro_tier
) ON public.business_accounts FROM anon, authenticated;

-- Admin-only RPC that returns the full sensitive row set for dashboards.
CREATE OR REPLACE FUNCTION public.admin_list_businesses()
RETURNS SETOF public.business_accounts
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL OR NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Necesită rol admin';
  END IF;
  RETURN QUERY SELECT * FROM public.business_accounts ORDER BY created_at DESC;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.admin_list_businesses() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_list_businesses() TO authenticated;

-- Admin-only RPC that returns the aggregate wallet balance across all
-- businesses, used by the admin dashboard summary.
CREATE OR REPLACE FUNCTION public.admin_business_wallet_total()
RETURNS bigint
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE total bigint;
BEGIN
  IF auth.uid() IS NULL OR NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Necesită rol admin';
  END IF;
  SELECT COALESCE(SUM(wallet_balance_cents), 0) INTO total FROM public.business_accounts;
  RETURN total;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.admin_business_wallet_total() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_business_wallet_total() TO authenticated;
