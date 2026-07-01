DROP POLICY IF EXISTS campaigns_active_public_read ON public.campaigns;

CREATE POLICY campaigns_active_authenticated_read ON public.campaigns
  FOR SELECT
  TO authenticated
  USING (
    status = 'active'::campaign_status
    AND starts_at <= now()
    AND (ends_at IS NULL OR ends_at > now())
  );

REVOKE SELECT ON public.campaigns FROM anon;

CREATE OR REPLACE VIEW public.campaigns_public
WITH (security_invoker = off) AS
SELECT
  id, business_id, venue_id, party_id, kind, title, subtitle, body,
  cta_text, cta_url, image_urls, video_url, theme_color,
  event_starts_at, entry_kind, entry_price_text, street, special_guest,
  starts_at, ends_at, status
FROM public.campaigns
WHERE status = 'active'::campaign_status
  AND starts_at <= now()
  AND (ends_at IS NULL OR ends_at > now());

GRANT SELECT ON public.campaigns_public TO anon, authenticated;