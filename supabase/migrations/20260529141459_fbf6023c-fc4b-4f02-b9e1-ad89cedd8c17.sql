-- Notifications table
CREATE TABLE public.notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL, -- recipient
  actor_id UUID, -- who caused the notification
  type TEXT NOT NULL, -- 'follow_request' | 'follow_accepted' | 'follow_rejected'
  data JSONB NOT NULL DEFAULT '{}'::jsonb,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_notifications_user_created ON public.notifications(user_id, created_at DESC);
CREATE INDEX idx_notifications_unread ON public.notifications(user_id) WHERE read_at IS NULL;

GRANT SELECT, UPDATE, DELETE ON public.notifications TO authenticated;
GRANT ALL ON public.notifications TO service_role;

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "notifications_self_read"
  ON public.notifications FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "notifications_self_update"
  ON public.notifications FOR UPDATE TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "notifications_self_delete"
  ON public.notifications FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- Trigger: on new follow row, notify target (request OR auto-accept)
CREATE OR REPLACE FUNCTION public.notify_on_follow_insert()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'pending' THEN
    INSERT INTO public.notifications (user_id, actor_id, type)
    VALUES (NEW.following_id, NEW.follower_id, 'follow_request');
  ELSIF NEW.status = 'accepted' THEN
    -- public profile auto-accept: notify target someone started following
    INSERT INTO public.notifications (user_id, actor_id, type)
    VALUES (NEW.following_id, NEW.follower_id, 'follow_accepted_auto');
  END IF;
  RETURN NEW;
END $$;

CREATE TRIGGER follows_notify_insert
  AFTER INSERT ON public.follows
  FOR EACH ROW EXECUTE FUNCTION public.notify_on_follow_insert();

-- Also fire the auto-accept trigger that sets status BEFORE this insert trigger
DROP TRIGGER IF EXISTS follows_set_status ON public.follows;
CREATE TRIGGER follows_set_status
  BEFORE INSERT ON public.follows
  FOR EACH ROW EXECUTE FUNCTION public.set_follow_status_on_insert();

-- Trigger: on update (pending -> accepted), notify the requester
CREATE OR REPLACE FUNCTION public.notify_on_follow_update()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF OLD.status = 'pending' AND NEW.status = 'accepted' THEN
    INSERT INTO public.notifications (user_id, actor_id, type)
    VALUES (NEW.follower_id, NEW.following_id, 'follow_accepted');
  END IF;
  RETURN NEW;
END $$;

CREATE TRIGGER follows_notify_update
  AFTER UPDATE ON public.follows
  FOR EACH ROW EXECUTE FUNCTION public.notify_on_follow_update();

-- Trigger: on delete of pending row by the target = rejection
CREATE OR REPLACE FUNCTION public.notify_on_follow_delete()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF OLD.status = 'pending' AND auth.uid() = OLD.following_id THEN
    INSERT INTO public.notifications (user_id, actor_id, type)
    VALUES (OLD.follower_id, OLD.following_id, 'follow_rejected');
  END IF;
  RETURN NULL;
END $$;

CREATE TRIGGER follows_notify_delete
  AFTER DELETE ON public.follows
  FOR EACH ROW EXECUTE FUNCTION public.notify_on_follow_delete();

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;