ALTER VIEW public.campaigns_public SET (security_invoker = true);

REVOKE SELECT ON public.campaigns FROM anon, authenticated;
GRANT SELECT (
  id,
  business_id,
  venue_id,
  party_id,
  kind,
  title,
  subtitle,
  body,
  cta_text,
  cta_url,
  image_urls,
  video_url,
  theme_color,
  event_starts_at,
  entry_kind,
  entry_price_text,
  street,
  special_guest,
  starts_at,
  ends_at,
  status
) ON public.campaigns TO authenticated;
GRANT SELECT ON public.campaigns_public TO anon, authenticated;
GRANT ALL ON public.campaigns TO service_role;
GRANT ALL ON public.campaigns_public TO service_role;

REVOKE SELECT ON public.profiles FROM anon, authenticated;
GRANT SELECT (
  id,
  handle,
  display_name,
  city_id,
  avatar_url,
  bio,
  rank,
  aura,
  lifetime_sprits,
  is_public,
  current_streak,
  longest_streak,
  active_frame_id,
  profile_theme_id,
  music_clip_url,
  profile_bg_url,
  theme_intensity,
  created_at,
  updated_at
) ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;