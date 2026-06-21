-- Revoke broad SELECT, then re-grant only safe (public) columns to authenticated and anon.
-- Owners/admins continue to read sensitive fields via SECURITY DEFINER RPCs.

REVOKE SELECT ON public.business_accounts FROM authenticated;
REVOKE SELECT ON public.business_accounts FROM anon;

GRANT SELECT (
  id, owner_user_id, type, brand_name, slug, city_id, venue_id, verified, tier,
  created_at, updated_at, cover_url, logo_url, description, website,
  instagram_handle, tiktok_handle, address, lat, lng,
  reputation_score, total_reviews, total_visits,
  is_exclusive_slot, exclusive_city_id, featured_score, live_energy
) ON public.business_accounts TO authenticated;

GRANT SELECT (
  id, type, brand_name, slug, city_id, venue_id, verified, tier,
  created_at, cover_url, logo_url, description, website,
  instagram_handle, tiktok_handle, address, lat, lng,
  reputation_score, total_reviews, total_visits,
  is_exclusive_slot, exclusive_city_id, featured_score, live_energy
) ON public.business_accounts TO anon;

-- Keep ALL for service_role (edge functions, admin code, SECURITY DEFINER RPCs).
GRANT ALL ON public.business_accounts TO service_role;