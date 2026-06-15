-- Add body field for rich post details + likes on sponsored posts
ALTER TABLE public.campaigns ADD COLUMN IF NOT EXISTS body text;

CREATE TABLE IF NOT EXISTS public.campaign_likes (
  campaign_id uuid NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (campaign_id, user_id)
);

GRANT SELECT, INSERT, DELETE ON public.campaign_likes TO authenticated;
GRANT SELECT ON public.campaign_likes TO anon;
GRANT ALL ON public.campaign_likes TO service_role;

ALTER TABLE public.campaign_likes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view campaign likes"
  ON public.campaign_likes FOR SELECT
  USING (true);

CREATE POLICY "Users like as themselves"
  ON public.campaign_likes FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users unlike their own"
  ON public.campaign_likes FOR DELETE
  USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_campaign_likes_campaign ON public.campaign_likes(campaign_id);
CREATE INDEX IF NOT EXISTS idx_campaign_likes_user ON public.campaign_likes(user_id);