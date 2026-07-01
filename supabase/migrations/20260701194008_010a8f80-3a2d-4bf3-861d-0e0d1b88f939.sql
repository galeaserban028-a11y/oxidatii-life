
DROP FUNCTION IF EXISTS public.get_active_campaigns(text[], int);

CREATE FUNCTION public.get_active_campaigns(_kinds text[] DEFAULT NULL, _limit int DEFAULT 20)
RETURNS TABLE (
  id uuid,
  kind text,
  title text,
  subtitle text,
  body text,
  cta_text text,
  cta_url text,
  image_urls text[],
  video_url text,
  theme_color text,
  entry_kind text,
  entry_price_text text,
  special_guest text,
  street text,
  event_starts_at timestamptz,
  party_id uuid,
  venue_id uuid,
  business_id uuid,
  business_brand_name text,
  business_logo_url text,
  business_cover_url text,
  venue_name text
) LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT c.id, c.kind::text, c.title, c.subtitle, c.body, c.cta_text, c.cta_url,
         c.image_urls, c.video_url, c.theme_color, c.entry_kind, c.entry_price_text,
         c.special_guest, c.street, c.event_starts_at, c.party_id, c.venue_id, c.business_id,
         b.brand_name, b.logo_url, b.cover_url,
         v.name
    FROM public.campaigns c
    LEFT JOIN public.business_accounts b ON b.id = c.business_id
    LEFT JOIN public.venues v ON v.id = c.venue_id
   WHERE c.status = 'active'
     AND (c.starts_at IS NULL OR c.starts_at <= now())
     AND (c.ends_at IS NULL OR c.ends_at > now())
     AND (_kinds IS NULL OR c.kind::text = ANY(_kinds))
   ORDER BY COALESCE(c.bid_cents, 0) DESC, c.created_at DESC
   LIMIT COALESCE(_limit, 20);
$$;
GRANT EXECUTE ON FUNCTION public.get_active_campaigns(text[], int) TO anon, authenticated;
