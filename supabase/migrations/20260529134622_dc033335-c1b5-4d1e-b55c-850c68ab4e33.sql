-- Followers (Instagram-style)
CREATE TABLE public.follows (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  follower_id uuid NOT NULL,
  following_id uuid NOT NULL,
  status text NOT NULL DEFAULT 'pending', -- 'pending' | 'accepted'
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(follower_id, following_id),
  CHECK (follower_id <> following_id)
);

CREATE INDEX idx_follows_follower ON public.follows(follower_id, status);
CREATE INDEX idx_follows_following ON public.follows(following_id, status);

GRANT SELECT ON public.follows TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.follows TO authenticated;
GRANT ALL ON public.follows TO service_role;

ALTER TABLE public.follows ENABLE ROW LEVEL SECURITY;

-- Anyone can see ACCEPTED follow edges (needed for follower counts/lists on public profiles)
CREATE POLICY follows_public_accepted_read ON public.follows
  FOR SELECT TO anon, authenticated
  USING (status = 'accepted');

-- Follower or target can see pending (for request inbox)
CREATE POLICY follows_pending_read_involved ON public.follows
  FOR SELECT TO authenticated
  USING (status = 'pending' AND (auth.uid() = follower_id OR auth.uid() = following_id));

-- Follower creates the request; auto-accepted by trigger if target is_public
CREATE POLICY follows_self_insert ON public.follows
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = follower_id);

-- Only the target can update status (accept request)
CREATE POLICY follows_target_update ON public.follows
  FOR UPDATE TO authenticated
  USING (auth.uid() = following_id)
  WITH CHECK (auth.uid() = following_id);

-- Either party can delete (unfollow / remove follower / reject)
CREATE POLICY follows_either_delete ON public.follows
  FOR DELETE TO authenticated
  USING (auth.uid() = follower_id OR auth.uid() = following_id);

-- Auto-accept when target is public
CREATE OR REPLACE FUNCTION public.set_follow_status_on_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _is_public boolean;
BEGIN
  SELECT is_public INTO _is_public FROM public.profiles WHERE id = NEW.following_id;
  IF COALESCE(_is_public, true) THEN
    NEW.status := 'accepted';
  ELSE
    NEW.status := 'pending';
  END IF;
  RETURN NEW;
END $$;

CREATE TRIGGER trg_follows_set_status
BEFORE INSERT ON public.follows
FOR EACH ROW EXECUTE FUNCTION public.set_follow_status_on_insert();

CREATE TRIGGER trg_follows_updated_at
BEFORE UPDATE ON public.follows
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Helper: is viewer allowed to see private content of target?
CREATE OR REPLACE FUNCTION public.can_view_profile(_viewer uuid, _target uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    _viewer = _target
    OR EXISTS (SELECT 1 FROM public.profiles WHERE id = _target AND is_public = true)
    OR EXISTS (
      SELECT 1 FROM public.follows
      WHERE follower_id = _viewer AND following_id = _target AND status = 'accepted'
    );
$$;