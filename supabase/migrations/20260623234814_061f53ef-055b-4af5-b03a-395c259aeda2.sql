
REVOKE SELECT ON public.profiles FROM authenticated;
REVOKE SELECT ON public.profiles FROM anon;

GRANT SELECT (
  id, handle, display_name, city_id, avatar_url, bio, rank, aura,
  lifetime_sprits, location_consent, onboarded, created_at, updated_at,
  is_public, current_streak, longest_streak, last_streak_week,
  active_frame_id, map_ghost, map_visibility, map_precision,
  map_auto_ghost_hours, map_hide_from_live_list, map_require_reciprocity,
  tutorial_seen, profile_theme_id, music_clip_url, profile_bg_url,
  theme_intensity
) ON public.profiles TO authenticated;

GRANT SELECT (
  id, handle, display_name, city_id, avatar_url, bio, rank, aura,
  lifetime_sprits, is_public, current_streak, longest_streak,
  active_frame_id, profile_theme_id, music_clip_url, profile_bg_url,
  theme_intensity
) ON public.profiles TO anon;

DROP FUNCTION IF EXISTS public.get_my_account_state();

CREATE OR REPLACE FUNCTION public.get_my_account_state()
RETURNS TABLE(
  coin_balance integer,
  last_boost_at timestamp with time zone,
  boost_until timestamp with time zone,
  premium_tier text,
  premium_until timestamp with time zone,
  birthdate date,
  map_ghost boolean,
  map_visibility text,
  map_precision text,
  location_consent boolean
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT p.coin_balance,
         p.last_boost_at,
         p.boost_until,
         p.premium_tier::text,
         p.premium_until,
         p.birthdate,
         p.map_ghost,
         p.map_visibility::text,
         p.map_precision::text,
         p.location_consent
  FROM public.profiles p
  WHERE p.id = auth.uid();
$function$;

CREATE OR REPLACE FUNCTION public.get_user_premium_badge(_user_id uuid)
RETURNS TABLE(
  user_id uuid,
  premium_tier text,
  has_active_premium boolean,
  has_active_boost boolean
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT p.id,
         CASE
           WHEN p.premium_until IS NULL OR p.premium_until > now()
             THEN p.premium_tier::text
           ELSE NULL
         END,
         (p.premium_tier IS NOT NULL
            AND (p.premium_until IS NULL OR p.premium_until > now())),
         (p.boost_until IS NOT NULL AND p.boost_until > now())
  FROM public.profiles p
  WHERE p.id = _user_id;
$function$;

GRANT EXECUTE ON FUNCTION public.get_user_premium_badge(uuid) TO authenticated, anon;

CREATE OR REPLACE FUNCTION public.admin_list_users()
RETURNS TABLE(
  id uuid,
  handle text,
  display_name text,
  avatar_url text,
  aura integer,
  lifetime_sprits integer,
  current_streak integer,
  longest_streak integer,
  is_public boolean,
  onboarded boolean,
  rank text,
  premium_tier text,
  premium_until timestamp with time zone,
  created_at timestamp with time zone
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF auth.uid() IS NULL OR NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Necesită rol admin';
  END IF;
  RETURN QUERY
  SELECT p.id, p.handle, p.display_name, p.avatar_url, p.aura,
         p.lifetime_sprits, p.current_streak, p.longest_streak,
         p.is_public, p.onboarded, p.rank::text,
         p.premium_tier::text, p.premium_until, p.created_at
  FROM public.profiles p
  ORDER BY p.created_at DESC;
END;
$function$;

GRANT EXECUTE ON FUNCTION public.admin_list_users() TO authenticated;

CREATE POLICY "campaign_events_owner_admin_read"
ON public.campaign_events
FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin'::app_role)
  OR EXISTS (
    SELECT 1
    FROM public.campaigns c
    JOIN public.business_accounts b ON b.id = c.business_id
    WHERE c.id = campaign_events.campaign_id
      AND b.owner_user_id = auth.uid()
  )
);
