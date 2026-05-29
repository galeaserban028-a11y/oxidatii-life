
CREATE TABLE public.parties (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  host_id uuid NOT NULL,
  title text NOT NULL,
  description text,
  location_text text NOT NULL,
  venue_id uuid,
  lat numeric,
  lng numeric,
  spots_total int NOT NULL DEFAULT 10,
  starts_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '12 hours'),
  vibe text,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.parties TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.parties TO authenticated;
GRANT ALL ON public.parties TO service_role;

ALTER TABLE public.parties ENABLE ROW LEVEL SECURITY;

CREATE POLICY "parties_public_read" ON public.parties
  FOR SELECT USING (expires_at > now());
CREATE POLICY "parties_self_insert" ON public.parties
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = host_id);
CREATE POLICY "parties_self_update" ON public.parties
  FOR UPDATE TO authenticated USING (auth.uid() = host_id);
CREATE POLICY "parties_self_delete" ON public.parties
  FOR DELETE TO authenticated USING (auth.uid() = host_id);

CREATE INDEX idx_parties_expires ON public.parties(expires_at DESC);

CREATE TABLE public.party_joins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  party_id uuid NOT NULL REFERENCES public.parties(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(party_id, user_id)
);

GRANT SELECT ON public.party_joins TO anon;
GRANT SELECT, INSERT, DELETE ON public.party_joins TO authenticated;
GRANT ALL ON public.party_joins TO service_role;

ALTER TABLE public.party_joins ENABLE ROW LEVEL SECURITY;

CREATE POLICY "party_joins_public_read" ON public.party_joins
  FOR SELECT USING (true);
CREATE POLICY "party_joins_self_insert" ON public.party_joins
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "party_joins_self_delete" ON public.party_joins
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE INDEX idx_party_joins_party ON public.party_joins(party_id);

ALTER PUBLICATION supabase_realtime ADD TABLE public.parties;
ALTER PUBLICATION supabase_realtime ADD TABLE public.party_joins;
