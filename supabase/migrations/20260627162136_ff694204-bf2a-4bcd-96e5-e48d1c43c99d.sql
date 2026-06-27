
GRANT SELECT (id, owner_user_id, brand_name, slug, city_id, venue_id, verified, tier, cover_url, logo_url, description, website, instagram_handle, tiktok_handle, address, lat, lng, reputation_score, total_reviews, total_visits, pro_tier, is_exclusive_slot, exclusive_city_id, featured_score, live_energy, type)
  ON public.business_accounts TO authenticated, anon;

ALTER TABLE public.sprit_proofs
  ADD CONSTRAINT sprit_proofs_user_profile_fkey
  FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

CREATE OR REPLACE FUNCTION public.get_spritz_index_ranking()
 RETURNS TABLE(city_id uuid, city_name text, slug text, score integer, vibe text, emoji text)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  c record;
  idx jsonb;
BEGIN
  FOR c IN SELECT ci.id AS id, ci.name AS name, ci.slug AS city_slug FROM public.cities ci ORDER BY ci.name LOOP
    idx := public.get_spritz_index(c.id);
    city_id := c.id;
    city_name := c.name;
    slug := c.city_slug;
    score := (idx->>'score')::int;
    vibe := idx->>'vibe';
    emoji := idx->>'emoji';
    RETURN NEXT;
  END LOOP;
  RETURN;
END;
$function$;
