
DROP POLICY IF EXISTS campaigns_active_authenticated_read ON public.campaigns;
DROP VIEW IF EXISTS public.campaigns_public CASCADE;

CREATE OR REPLACE FUNCTION public.get_active_campaigns(_kinds text[] DEFAULT NULL, _limit int DEFAULT 20)
RETURNS TABLE (
  id uuid, business_id uuid, kind text, title text, subtitle text, body text,
  cta_text text, cta_url text, image_urls text[], video_url text, theme_color text,
  venue_id uuid, party_id uuid, event_starts_at timestamptz,
  entry_kind text, entry_price_text text, street text, special_guest text,
  business_brand_name text
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT c.id, c.business_id, c.kind::text, c.title, c.subtitle, c.body,
         c.cta_text, c.cta_url, c.image_urls, c.video_url, c.theme_color,
         c.venue_id, c.party_id, c.event_starts_at,
         c.entry_kind::text, c.entry_price_text, c.street, c.special_guest,
         b.brand_name
  FROM public.campaigns c
  LEFT JOIN public.business_accounts b ON b.id = c.business_id
  WHERE c.status = 'active'
    AND c.starts_at <= now()
    AND (c.ends_at IS NULL OR c.ends_at > now())
    AND (_kinds IS NULL OR c.kind::text = ANY(_kinds))
  ORDER BY c.bid_cents DESC NULLS LAST, c.created_at DESC
  LIMIT GREATEST(1, LEAST(COALESCE(_limit, 20), 50));
$$;
GRANT EXECUTE ON FUNCTION public.get_active_campaigns(text[], int) TO authenticated, anon;

REVOKE SELECT ON public.profiles FROM authenticated;
REVOKE SELECT ON public.profiles FROM anon;

GRANT SELECT (
  id, handle, display_name, avatar_url, bio, rank, aura,
  city_id, is_public, active_frame_id,
  lifetime_sprits, current_streak, longest_streak, last_streak_week,
  profile_theme_id, theme_intensity, music_clip_url, profile_bg_url,
  created_at, updated_at, boost_until
) ON public.profiles TO authenticated;

GRANT ALL ON public.profiles TO service_role;
