
CREATE OR REPLACE FUNCTION public.get_campaign_public(_id uuid)
RETURNS TABLE (
  id uuid,
  business_id uuid,
  title text,
  subtitle text,
  body text,
  cta_text text,
  cta_url text,
  image_urls text[],
  video_url text,
  theme_color text,
  kind text,
  entry_kind text,
  entry_price_text text,
  special_guest text,
  street text,
  event_starts_at timestamptz,
  starts_at timestamptz,
  ends_at timestamptz,
  status text,
  venue_id uuid,
  party_id uuid,
  business_brand_name text,
  business_logo_url text,
  business_cover_url text,
  venue_name text
) LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT c.id, c.business_id, c.title, c.subtitle, c.body, c.cta_text, c.cta_url,
         c.image_urls, c.video_url, c.theme_color, c.kind::text,
         c.entry_kind, c.entry_price_text, c.special_guest, c.street, c.event_starts_at,
         c.starts_at, c.ends_at, c.status::text, c.venue_id, c.party_id,
         b.brand_name, b.logo_url, b.cover_url, v.name
    FROM public.campaigns c
    LEFT JOIN public.business_accounts b ON b.id = c.business_id
    LEFT JOIN public.venues v ON v.id = c.venue_id
   WHERE c.id = _id;
$$;
GRANT EXECUTE ON FUNCTION public.get_campaign_public(uuid) TO anon, authenticated;
