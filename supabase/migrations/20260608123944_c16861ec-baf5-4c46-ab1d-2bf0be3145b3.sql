
-- ============= 1. BUSINESS ACCOUNTS: reputation + pro tier =============
ALTER TABLE public.business_accounts
  ADD COLUMN IF NOT EXISTS reputation_score numeric(3,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_reviews integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_visits integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS pro_tier text,
  ADD COLUMN IF NOT EXISTS pro_until timestamptz;

-- ============= 2. BUSINESS REVIEWS (#3 Reputation Score) =============
CREATE TABLE IF NOT EXISTS public.business_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.business_accounts(id) ON DELETE CASCADE,
  reviewer_id uuid NOT NULL,
  check_in_id uuid REFERENCES public.check_ins(id) ON DELETE SET NULL,
  rating smallint NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (business_id, reviewer_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.business_reviews TO authenticated;
GRANT SELECT ON public.business_reviews TO anon;
GRANT ALL ON public.business_reviews TO service_role;
ALTER TABLE public.business_reviews ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Reviews public read" ON public.business_reviews FOR SELECT USING (true);
CREATE POLICY "Users insert own reviews" ON public.business_reviews FOR INSERT TO authenticated WITH CHECK (auth.uid() = reviewer_id);
CREATE POLICY "Users update own reviews" ON public.business_reviews FOR UPDATE TO authenticated USING (auth.uid() = reviewer_id);
CREATE POLICY "Users delete own reviews" ON public.business_reviews FOR DELETE TO authenticated USING (auth.uid() = reviewer_id);
CREATE TRIGGER trg_business_reviews_updated BEFORE UPDATE ON public.business_reviews
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Recompute business reputation on review insert/update/delete
CREATE OR REPLACE FUNCTION public.recompute_business_reputation()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE _bid uuid;
BEGIN
  _bid := COALESCE(NEW.business_id, OLD.business_id);
  UPDATE public.business_accounts ba SET
    reputation_score = COALESCE((SELECT ROUND(AVG(rating)::numeric, 2) FROM public.business_reviews WHERE business_id = _bid), 0),
    total_reviews   = COALESCE((SELECT COUNT(*) FROM public.business_reviews WHERE business_id = _bid), 0)
  WHERE ba.id = _bid;
  RETURN NULL;
END $$;
CREATE TRIGGER trg_business_reviews_recompute
AFTER INSERT OR UPDATE OR DELETE ON public.business_reviews
FOR EACH ROW EXECUTE FUNCTION public.recompute_business_reputation();

-- ============= 3. BUSINESS OFFERS (#2 Proof-of-Visit Rewards) =============
CREATE TABLE IF NOT EXISTS public.business_offers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.business_accounts(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  reward_text text NOT NULL,
  image_url text,
  min_user_rating numeric(3,2) DEFAULT 0,
  max_redemptions integer,
  redeemed_count integer NOT NULL DEFAULT 0,
  expires_at timestamptz,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.business_offers TO authenticated;
GRANT SELECT ON public.business_offers TO anon;
GRANT ALL ON public.business_offers TO service_role;
ALTER TABLE public.business_offers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Offers public read" ON public.business_offers FOR SELECT USING (true);
CREATE POLICY "Owner manage offers" ON public.business_offers FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.business_accounts ba WHERE ba.id = business_id AND ba.owner_user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.business_accounts ba WHERE ba.id = business_id AND ba.owner_user_id = auth.uid()));
CREATE TRIGGER trg_business_offers_updated BEFORE UPDATE ON public.business_offers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE IF NOT EXISTS public.offer_redemptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  offer_id uuid NOT NULL REFERENCES public.business_offers(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  check_in_id uuid REFERENCES public.check_ins(id) ON DELETE SET NULL,
  code text NOT NULL DEFAULT upper(substr(replace(gen_random_uuid()::text,'-',''),1,8)),
  redeemed_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (offer_id, user_id)
);
GRANT SELECT, INSERT ON public.offer_redemptions TO authenticated;
GRANT ALL ON public.offer_redemptions TO service_role;
ALTER TABLE public.offer_redemptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users see own redemptions" ON public.offer_redemptions FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR EXISTS (
    SELECT 1 FROM public.business_offers o JOIN public.business_accounts ba ON ba.id = o.business_id
    WHERE o.id = offer_id AND ba.owner_user_id = auth.uid()));
CREATE POLICY "Users claim redemptions" ON public.offer_redemptions FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Atomic claim function: validates rating, max_redemptions, expires_at, dedup
CREATE OR REPLACE FUNCTION public.claim_business_offer(_offer_id uuid, _check_in_id uuid DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE
  uid uuid := auth.uid();
  o record;
  user_rating numeric;
  new_code text;
BEGIN
  IF uid IS NULL THEN RETURN jsonb_build_object('ok',false,'error','not_authenticated'); END IF;
  SELECT * INTO o FROM public.business_offers WHERE id = _offer_id FOR UPDATE;
  IF NOT FOUND OR NOT o.active THEN RETURN jsonb_build_object('ok',false,'error','offer_unavailable'); END IF;
  IF o.expires_at IS NOT NULL AND o.expires_at < now() THEN RETURN jsonb_build_object('ok',false,'error','expired'); END IF;
  IF o.max_redemptions IS NOT NULL AND o.redeemed_count >= o.max_redemptions THEN
    RETURN jsonb_build_object('ok',false,'error','sold_out');
  END IF;
  IF EXISTS (SELECT 1 FROM public.offer_redemptions WHERE offer_id = _offer_id AND user_id = uid) THEN
    RETURN jsonb_build_object('ok',false,'error','already_claimed');
  END IF;
  IF COALESCE(o.min_user_rating,0) > 0 THEN
    SELECT ROUND(AVG(value)::numeric,2) INTO user_rating FROM public.user_ratings WHERE rated_id = uid;
    IF COALESCE(user_rating,0) < o.min_user_rating THEN
      RETURN jsonb_build_object('ok',false,'error','rating_too_low','required',o.min_user_rating,'yours',COALESCE(user_rating,0));
    END IF;
  END IF;
  INSERT INTO public.offer_redemptions (offer_id, user_id, check_in_id)
    VALUES (_offer_id, uid, _check_in_id) RETURNING code INTO new_code;
  UPDATE public.business_offers SET redeemed_count = redeemed_count + 1 WHERE id = _offer_id;
  RETURN jsonb_build_object('ok',true,'code',new_code);
END $$;
GRANT EXECUTE ON FUNCTION public.claim_business_offer(uuid,uuid) TO authenticated;

-- ============= 4. BUSINESS BATTLES (#5 weekly leaderboard) =============
CREATE TABLE IF NOT EXISTS public.business_battles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.business_accounts(id) ON DELETE CASCADE,
  city_id uuid REFERENCES public.cities(id) ON DELETE SET NULL,
  category text NOT NULL,
  week_start date NOT NULL DEFAULT public.iso_week_start(now()),
  stake_cents integer NOT NULL DEFAULT 0,
  score integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (business_id, category, week_start)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.business_battles TO authenticated;
GRANT SELECT ON public.business_battles TO anon;
GRANT ALL ON public.business_battles TO service_role;
ALTER TABLE public.business_battles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Battles public read" ON public.business_battles FOR SELECT USING (true);
CREATE POLICY "Owner manage battles" ON public.business_battles FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.business_accounts ba WHERE ba.id = business_id AND ba.owner_user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.business_accounts ba WHERE ba.id = business_id AND ba.owner_user_id = auth.uid()));
