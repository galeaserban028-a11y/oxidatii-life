
-- Peer ratings: 6 categorii, 1-5 stele, un singur vot per (rater, rated, category)
CREATE TABLE public.user_ratings (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  rater_id uuid NOT NULL,
  rated_id uuid NOT NULL,
  category text NOT NULL CHECK (category IN ('respect','reliability','energy','friendliness','contribution','trust')),
  value smallint NOT NULL CHECK (value BETWEEN 1 AND 5),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT user_ratings_no_self CHECK (rater_id <> rated_id),
  CONSTRAINT user_ratings_unique UNIQUE (rater_id, rated_id, category)
);

CREATE INDEX user_ratings_rated_idx ON public.user_ratings(rated_id);
CREATE INDEX user_ratings_rater_idx ON public.user_ratings(rater_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_ratings TO authenticated;
GRANT SELECT ON public.user_ratings TO anon;
GRANT ALL ON public.user_ratings TO service_role;

ALTER TABLE public.user_ratings ENABLE ROW LEVEL SECURITY;

CREATE POLICY user_ratings_public_read ON public.user_ratings
  FOR SELECT USING (true);

CREATE POLICY user_ratings_self_insert ON public.user_ratings
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = rater_id AND NOT public.is_blocked(rater_id, rated_id));

CREATE POLICY user_ratings_self_update ON public.user_ratings
  FOR UPDATE TO authenticated
  USING (auth.uid() = rater_id)
  WITH CHECK (auth.uid() = rater_id);

CREATE POLICY user_ratings_self_delete ON public.user_ratings
  FOR DELETE TO authenticated
  USING (auth.uid() = rater_id);

CREATE TRIGGER user_ratings_updated_at
  BEFORE UPDATE ON public.user_ratings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
