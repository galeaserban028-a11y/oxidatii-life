-- Live locations table: each user has at most one "current" position row.
CREATE TABLE public.live_locations (
  user_id uuid PRIMARY KEY,
  lat numeric NOT NULL,
  lng numeric NOT NULL,
  heading numeric,
  accuracy numeric,
  updated_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '15 minutes')
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.live_locations TO authenticated;
GRANT ALL ON public.live_locations TO service_role;

ALTER TABLE public.live_locations ENABLE ROW LEVEL SECURITY;

-- Self can fully manage own row
CREATE POLICY live_locations_self_insert ON public.live_locations
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY live_locations_self_update ON public.live_locations
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY live_locations_self_delete ON public.live_locations
  FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- Read: self or accepted friends, and only while not expired
CREATE POLICY live_locations_friends_read ON public.live_locations
  FOR SELECT TO authenticated
  USING (
    expires_at > now()
    AND (
      auth.uid() = user_id
      OR public.are_friends(auth.uid(), user_id)
    )
  );

CREATE INDEX live_locations_expires_idx ON public.live_locations (expires_at);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.live_locations;
ALTER TABLE public.live_locations REPLICA IDENTITY FULL;