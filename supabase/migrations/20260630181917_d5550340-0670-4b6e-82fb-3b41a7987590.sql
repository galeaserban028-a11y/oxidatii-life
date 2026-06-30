CREATE OR REPLACE FUNCTION public.get_public_profile(_handle TEXT)
RETURNS TABLE (
  id UUID,
  handle TEXT,
  display_name TEXT,
  avatar_url TEXT,
  bio TEXT,
  rank TEXT,
  aura INTEGER,
  lifetime_sprits INTEGER,
  current_streak INTEGER,
  active_frame_id TEXT,
  city_name TEXT,
  city_slug TEXT
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    p.id,
    p.handle,
    p.display_name,
    p.avatar_url,
    p.bio,
    p.rank::text,
    p.aura,
    p.lifetime_sprits,
    p.current_streak,
    p.active_frame_id,
    c.name AS city_name,
    c.slug AS city_slug
  FROM public.profiles p
  LEFT JOIN public.cities c ON c.id = p.city_id
  WHERE p.handle = lower(_handle) AND p.is_public = true
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.get_public_profile(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_profile(TEXT) TO anon, authenticated;