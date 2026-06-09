
-- 1) Profile columns for map settings
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS map_ghost boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS map_visibility text NOT NULL DEFAULT 'friends',
  ADD COLUMN IF NOT EXISTS map_precision text NOT NULL DEFAULT 'exact',
  ADD COLUMN IF NOT EXISTS map_auto_ghost_hours int NOT NULL DEFAULT 8,
  ADD COLUMN IF NOT EXISTS map_hide_from_live_list boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS map_require_reciprocity boolean NOT NULL DEFAULT false;

ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_map_visibility_chk,
  ADD CONSTRAINT profiles_map_visibility_chk CHECK (map_visibility IN ('friends','close','nobody'));

ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_map_precision_chk,
  ADD CONSTRAINT profiles_map_precision_chk CHECK (map_precision IN ('exact','approx','city'));

ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_map_auto_ghost_hours_chk,
  ADD CONSTRAINT profiles_map_auto_ghost_hours_chk CHECK (map_auto_ghost_hours BETWEEN 1 AND 72);

-- 2) close_friends table
CREATE TABLE IF NOT EXISTS public.close_friends (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  friend_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, friend_id),
  CHECK (user_id <> friend_id)
);
CREATE INDEX IF NOT EXISTS close_friends_user_idx ON public.close_friends(user_id);
CREATE INDEX IF NOT EXISTS close_friends_friend_idx ON public.close_friends(friend_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.close_friends TO authenticated;
GRANT ALL ON public.close_friends TO service_role;
ALTER TABLE public.close_friends ENABLE ROW LEVEL SECURITY;

CREATE POLICY "close_friends_self_select" ON public.close_friends
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "close_friends_self_insert" ON public.close_friends
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "close_friends_self_delete" ON public.close_friends
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- 3) private_locations table
CREATE TABLE IF NOT EXISTS public.private_locations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  label text NOT NULL,
  lat numeric NOT NULL,
  lng numeric NOT NULL,
  radius_m int NOT NULL DEFAULT 150 CHECK (radius_m BETWEEN 50 AND 2000),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS private_locations_user_idx ON public.private_locations(user_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.private_locations TO authenticated;
GRANT ALL ON public.private_locations TO service_role;
ALTER TABLE public.private_locations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "private_locations_self_all" ON public.private_locations
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 4) Helper: is the viewer allowed to see owner's live pin per privacy settings?
CREATE OR REPLACE FUNCTION public.can_view_live_location(_viewer uuid, _owner uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    CASE
      WHEN _viewer = _owner THEN true
      WHEN NOT public.are_friends(_viewer, _owner) THEN false
      ELSE EXISTS (
        SELECT 1 FROM public.profiles p
        WHERE p.id = _owner
          AND p.map_ghost = false
          AND (
            p.map_visibility = 'friends'
            OR (p.map_visibility = 'close'
                AND EXISTS (SELECT 1 FROM public.close_friends cf
                            WHERE cf.user_id = _owner AND cf.friend_id = _viewer))
          )
      )
    END
$$;

-- 5) Update RLS on live_locations to honor privacy settings
DROP POLICY IF EXISTS "live_locations_friends_read" ON public.live_locations;
CREATE POLICY "live_locations_friends_read" ON public.live_locations
  FOR SELECT TO authenticated
  USING (
    expires_at > now()
    AND public.can_view_live_location(auth.uid(), user_id)
  );
