CREATE TABLE public.night_wraps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  night_date DATE NOT NULL,
  title TEXT NOT NULL,
  tagline TEXT,
  vibe_emoji TEXT,
  stats JSONB NOT NULL DEFAULT '{}'::jsonb,
  photo_urls TEXT[] NOT NULL DEFAULT '{}',
  crew_user_ids UUID[] NOT NULL DEFAULT '{}',
  top_venue_id UUID REFERENCES public.venues(id) ON DELETE SET NULL,
  peak_hour INT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, night_date)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.night_wraps TO authenticated;
GRANT ALL ON public.night_wraps TO service_role;

ALTER TABLE public.night_wraps ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own night wraps"
  ON public.night_wraps FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own night wraps"
  ON public.night_wraps FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own night wraps"
  ON public.night_wraps FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE INDEX night_wraps_user_date_idx ON public.night_wraps(user_id, night_date DESC);