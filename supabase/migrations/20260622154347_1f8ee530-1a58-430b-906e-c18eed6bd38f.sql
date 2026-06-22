
-- Venue follows
CREATE TABLE public.venue_follows (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  venue_id uuid NOT NULL REFERENCES public.venues(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, venue_id)
);
CREATE INDEX idx_venue_follows_venue ON public.venue_follows(venue_id);

GRANT SELECT, INSERT, DELETE ON public.venue_follows TO authenticated;
GRANT ALL ON public.venue_follows TO service_role;

ALTER TABLE public.venue_follows ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Read own venue follows"
  ON public.venue_follows FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Insert own venue follows"
  ON public.venue_follows FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Delete own venue follows"
  ON public.venue_follows FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- Helper: user has tonight-intent at venue+date
CREATE OR REPLACE FUNCTION public.has_venue_intent(_user uuid, _venue uuid, _date date)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.daily_intents
    WHERE user_id = _user AND venue_id = _venue AND intent_date = _date
  );
$$;

-- Venue night chat
CREATE TABLE public.venue_night_chats (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  venue_id uuid NOT NULL REFERENCES public.venues(id) ON DELETE CASCADE,
  intent_date date NOT NULL,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  body text NOT NULL CHECK (length(body) BETWEEN 1 AND 240),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_vnc_room ON public.venue_night_chats(venue_id, intent_date, created_at);

GRANT SELECT, INSERT ON public.venue_night_chats TO authenticated;
GRANT ALL ON public.venue_night_chats TO service_role;

ALTER TABLE public.venue_night_chats ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Read chat if you are in the room"
  ON public.venue_night_chats FOR SELECT TO authenticated
  USING (public.has_venue_intent(auth.uid(), venue_id, intent_date));

CREATE POLICY "Post chat if you are in the room"
  ON public.venue_night_chats FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND public.has_venue_intent(auth.uid(), venue_id, intent_date)
  );

ALTER PUBLICATION supabase_realtime ADD TABLE public.venue_night_chats;
ALTER TABLE public.venue_night_chats REPLICA IDENTITY FULL;
