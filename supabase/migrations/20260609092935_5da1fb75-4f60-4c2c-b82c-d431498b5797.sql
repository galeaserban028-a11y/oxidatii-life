
CREATE OR REPLACE FUNCTION public.get_profile_card(_id uuid)
RETURNS TABLE(id uuid, handle text, display_name text, avatar_url text, bio text, is_public boolean)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.id, p.handle, p.display_name, p.avatar_url, p.bio, p.is_public
  FROM public.profiles p
  WHERE p.id = _id
$$;

GRANT EXECUTE ON FUNCTION public.get_profile_card(uuid) TO anon, authenticated;
