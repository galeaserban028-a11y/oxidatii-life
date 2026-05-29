-- 1) push_subscriptions
CREATE TABLE public.push_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  endpoint text NOT NULL UNIQUE,
  p256dh text NOT NULL,
  auth text NOT NULL,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_push_subs_user ON public.push_subscriptions(user_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.push_subscriptions TO authenticated;
GRANT ALL ON public.push_subscriptions TO service_role;

ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY push_subs_self_read ON public.push_subscriptions
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY push_subs_self_insert ON public.push_subscriptions
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY push_subs_self_delete ON public.push_subscriptions
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- 2) notification_prefs
CREATE TABLE public.notification_prefs (
  user_id uuid PRIMARY KEY,
  new_party_in_city boolean NOT NULL DEFAULT true,
  party_join boolean NOT NULL DEFAULT true,
  friend_live boolean NOT NULL DEFAULT true,
  challenge boolean NOT NULL DEFAULT true,
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.notification_prefs TO authenticated;
GRANT ALL ON public.notification_prefs TO service_role;

ALTER TABLE public.notification_prefs ENABLE ROW LEVEL SECURITY;

CREATE POLICY notif_prefs_self_read ON public.notification_prefs
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY notif_prefs_self_upsert ON public.notification_prefs
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY notif_prefs_self_update ON public.notification_prefs
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);

CREATE TRIGGER notif_prefs_touch
  BEFORE UPDATE ON public.notification_prefs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3) challenges
CREATE TABLE public.challenges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  challenger_id uuid NOT NULL,
  challenged_id uuid NOT NULL,
  venue_id uuid,
  message text,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (challenger_id <> challenged_id),
  CHECK (status IN ('pending','accepted','declined'))
);
CREATE INDEX idx_challenges_challenged ON public.challenges(challenged_id, status);
CREATE INDEX idx_challenges_challenger ON public.challenges(challenger_id, status);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.challenges TO authenticated;
GRANT ALL ON public.challenges TO service_role;

ALTER TABLE public.challenges ENABLE ROW LEVEL SECURITY;

CREATE POLICY challenges_involved_read ON public.challenges
  FOR SELECT TO authenticated
  USING (auth.uid() = challenger_id OR auth.uid() = challenged_id);

CREATE POLICY challenges_create ON public.challenges
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = challenger_id);

CREATE POLICY challenges_addressee_update ON public.challenges
  FOR UPDATE TO authenticated
  USING (auth.uid() = challenged_id);

CREATE POLICY challenges_self_delete ON public.challenges
  FOR DELETE TO authenticated
  USING (auth.uid() = challenger_id);

CREATE TRIGGER challenges_touch
  BEFORE UPDATE ON public.challenges
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();