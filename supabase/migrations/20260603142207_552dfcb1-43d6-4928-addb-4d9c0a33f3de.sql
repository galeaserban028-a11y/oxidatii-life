
DROP VIEW IF EXISTS public.business_accounts_public CASCADE;

CREATE VIEW public.business_accounts_public
WITH (security_invoker=off) AS
SELECT
  id, brand_name, slug, type, tier, verified, description,
  logo_url, cover_url, website, instagram_handle, tiktok_handle,
  address, lat, lng, city_id, venue_id, owner_user_id, created_at, updated_at
FROM public.business_accounts;

GRANT SELECT ON public.business_accounts_public TO anon, authenticated;
