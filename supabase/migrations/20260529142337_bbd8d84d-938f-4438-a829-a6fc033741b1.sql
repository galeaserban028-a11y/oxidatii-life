-- Blocks table
CREATE TABLE public.blocks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  blocker_id uuid NOT NULL,
  blocked_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT blocks_unique_pair UNIQUE (blocker_id, blocked_id),
  CONSTRAINT blocks_no_self CHECK (blocker_id <> blocked_id)
);

GRANT SELECT, INSERT, DELETE ON public.blocks TO authenticated;
GRANT ALL ON public.blocks TO service_role;

ALTER TABLE public.blocks ENABLE ROW LEVEL SECURITY;

CREATE POLICY blocks_involved_read ON public.blocks FOR SELECT TO authenticated
  USING (auth.uid() = blocker_id OR auth.uid() = blocked_id);

CREATE POLICY blocks_self_insert ON public.blocks FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = blocker_id);

CREATE POLICY blocks_self_delete ON public.blocks FOR DELETE TO authenticated
  USING (auth.uid() = blocker_id);

CREATE INDEX blocks_blocker_idx ON public.blocks (blocker_id);
CREATE INDEX blocks_blocked_idx ON public.blocks (blocked_id);

-- Helper: either direction
CREATE OR REPLACE FUNCTION public.is_blocked(_a uuid, _b uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.blocks
    WHERE (blocker_id = _a AND blocked_id = _b)
       OR (blocker_id = _b AND blocked_id = _a)
  );
$$;

-- On block: remove any follows in both directions
CREATE OR REPLACE FUNCTION public.cleanup_on_block()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.follows
    WHERE (follower_id = NEW.blocker_id AND following_id = NEW.blocked_id)
       OR (follower_id = NEW.blocked_id AND following_id = NEW.blocker_id);
  RETURN NEW;
END $$;

CREATE TRIGGER blocks_cleanup_after_insert
AFTER INSERT ON public.blocks
FOR EACH ROW EXECUTE FUNCTION public.cleanup_on_block();

-- Tighten follows INSERT: cannot follow when a block exists in either direction
DROP POLICY IF EXISTS follows_self_insert ON public.follows;
CREATE POLICY follows_self_insert ON public.follows FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = follower_id
    AND NOT public.is_blocked(follower_id, following_id)
  );

-- Tighten messages INSERT: cannot send if any other conversation member is blocked
DROP POLICY IF EXISTS messages_insert_members ON public.messages;
CREATE POLICY messages_insert_members ON public.messages FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = sender_id
    AND public.is_conversation_member(conversation_id, auth.uid())
    AND NOT EXISTS (
      SELECT 1 FROM public.conversation_members cm
      WHERE cm.conversation_id = messages.conversation_id
        AND cm.user_id <> auth.uid()
        AND public.is_blocked(auth.uid(), cm.user_id)
    )
  );