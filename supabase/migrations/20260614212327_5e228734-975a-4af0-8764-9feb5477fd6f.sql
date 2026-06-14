
ALTER TABLE public.business_accounts
  ADD COLUMN IF NOT EXISTS tier_started_at timestamptz,
  ADD COLUMN IF NOT EXISTS tier_renews_at timestamptz,
  ADD COLUMN IF NOT EXISTS monthly_price_cents integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS is_exclusive_slot boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS exclusive_city_id uuid REFERENCES public.cities(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS featured_score numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS live_energy integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS suspended_until timestamptz;

CREATE INDEX IF NOT EXISTS idx_biz_featured_score ON public.business_accounts(featured_score DESC);
CREATE INDEX IF NOT EXISTS idx_biz_city_tier ON public.business_accounts(city_id, tier);

CREATE TABLE IF NOT EXISTS public.business_metrics_daily (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.business_accounts(id) ON DELETE CASCADE,
  metric_date date NOT NULL DEFAULT (now() AT TIME ZONE 'Europe/Bucharest')::date,
  profile_views integer NOT NULL DEFAULT 0,
  map_clicks integer NOT NULL DEFAULT 0,
  story_views integer NOT NULL DEFAULT 0,
  event_joins integer NOT NULL DEFAULT 0,
  offer_claims integer NOT NULL DEFAULT 0,
  unique_visitors integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (business_id, metric_date)
);

GRANT SELECT, INSERT, UPDATE ON public.business_metrics_daily TO authenticated;
GRANT ALL ON public.business_metrics_daily TO service_role;
ALTER TABLE public.business_metrics_daily ENABLE ROW LEVEL SECURITY;

CREATE POLICY "biz_metrics_owner_read" ON public.business_metrics_daily
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.business_accounts b
                 WHERE b.id = business_metrics_daily.business_id
                   AND (b.owner_user_id = auth.uid() OR public.has_role(auth.uid(),'admin'))));

CREATE POLICY "biz_metrics_admin_write" ON public.business_metrics_daily
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE TABLE IF NOT EXISTS public.exclusive_partner_slots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  city_id uuid NOT NULL REFERENCES public.cities(id) ON DELETE CASCADE,
  slot_index smallint NOT NULL CHECK (slot_index BETWEEN 1 AND 3),
  business_id uuid REFERENCES public.business_accounts(id) ON DELETE SET NULL,
  claimed_at timestamptz,
  locked_until timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (city_id, slot_index)
);

GRANT SELECT ON public.exclusive_partner_slots TO authenticated, anon;
GRANT ALL ON public.exclusive_partner_slots TO service_role;
ALTER TABLE public.exclusive_partner_slots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ex_slots_public_read" ON public.exclusive_partner_slots
  FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "ex_slots_admin_write" ON public.exclusive_partner_slots
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin'));

INSERT INTO public.exclusive_partner_slots (city_id, slot_index)
SELECT c.id, s.idx
FROM public.cities c CROSS JOIN (VALUES (1::smallint),(2::smallint),(3::smallint)) AS s(idx)
ON CONFLICT DO NOTHING;

CREATE OR REPLACE FUNCTION public.compute_business_score(_business_id uuid)
RETURNS numeric
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public
AS $$
DECLARE
  b record;
  promo_w numeric := 1;
  rating_n numeric := 0;
  pop_7d numeric := 0;
  event_act numeric := 0;
  score numeric := 0;
BEGIN
  SELECT * INTO b FROM public.business_accounts WHERE id = _business_id;
  IF NOT FOUND THEN RETURN 0; END IF;
  IF b.suspended_until IS NOT NULL AND b.suspended_until > now() THEN RETURN 0; END IF;

  promo_w := CASE b.tier::text
    WHEN 'starter' THEN 1.3
    WHEN 'popular' THEN 2.0
    WHEN 'elite' THEN 3.5
    WHEN 'exclusive' THEN 5.0
    ELSE 1.0 END;

  rating_n := COALESCE(b.reputation_score,0) / 5.0;
  IF b.total_reviews < 20 THEN rating_n := rating_n * (b.total_reviews::numeric / 20.0); END IF;

  SELECT COALESCE(LEAST(COUNT(*)::numeric / 50.0, 1.0), 0) INTO pop_7d
  FROM public.check_ins ci
  WHERE ci.venue_id = b.venue_id AND ci.created_at > now() - interval '7 days';

  SELECT COALESCE(LEAST(COUNT(*)::numeric / 5.0, 1.0), 0) INTO event_act
  FROM public.parties p
  WHERE p.venue_id = b.venue_id AND p.expires_at > now();

  score := (promo_w * 0.30) + (rating_n * 0.20) + (pop_7d * 0.20) + (event_act * 0.15) + 0.15;
  RETURN ROUND(score::numeric, 4);
END $$;

CREATE OR REPLACE FUNCTION public.get_featured_tonight(_city_id uuid, _limit int DEFAULT 8)
RETURNS TABLE (
  business_id uuid, brand_name text, tier business_tier, cover_url text, logo_url text,
  venue_id uuid, live_energy int, score numeric, next_event_at timestamptz
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public
AS $$
  SELECT b.id, b.brand_name, b.tier, b.cover_url, b.logo_url, b.venue_id,
         b.live_energy, public.compute_business_score(b.id) AS score,
         (SELECT MIN(p.starts_at) FROM public.parties p
          WHERE p.venue_id = b.venue_id AND p.starts_at > now() AND p.expires_at > now())
  FROM public.business_accounts b
  WHERE (b.city_id = _city_id OR _city_id IS NULL)
    AND b.tier::text IN ('elite','exclusive')
    AND (b.suspended_until IS NULL OR b.suspended_until < now())
    AND COALESCE(b.reputation_score, 5) >= 3.5
  ORDER BY (b.tier::text = 'exclusive') DESC, public.compute_business_score(b.id) DESC
  LIMIT _limit;
$$;

REVOKE EXECUTE ON FUNCTION public.compute_business_score(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_featured_tonight(uuid, int) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.compute_business_score(uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_featured_tonight(uuid, int) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.claim_exclusive_slot(_business_id uuid, _city_id uuid)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public
AS $$
DECLARE
  b record;
  slot record;
BEGIN
  SELECT * INTO b FROM public.business_accounts WHERE id = _business_id;
  IF NOT FOUND THEN RETURN jsonb_build_object('ok',false,'error','business_not_found'); END IF;
  IF b.owner_user_id <> auth.uid() AND NOT public.has_role(auth.uid(),'admin') THEN
    RETURN jsonb_build_object('ok',false,'error','forbidden');
  END IF;
  IF b.tier::text <> 'exclusive' THEN
    RETURN jsonb_build_object('ok',false,'error','not_exclusive_tier');
  END IF;
  IF EXISTS (SELECT 1 FROM public.exclusive_partner_slots WHERE business_id = _business_id) THEN
    RETURN jsonb_build_object('ok',true,'note','already_claimed');
  END IF;

  SELECT * INTO slot FROM public.exclusive_partner_slots
   WHERE city_id = _city_id AND business_id IS NULL
   ORDER BY slot_index LIMIT 1 FOR UPDATE SKIP LOCKED;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok',false,'error','no_slots_available');
  END IF;

  UPDATE public.exclusive_partner_slots
    SET business_id = _business_id,
        claimed_at = now(),
        locked_until = now() + interval '30 days'
   WHERE id = slot.id;

  UPDATE public.business_accounts
     SET is_exclusive_slot = true, exclusive_city_id = _city_id
   WHERE id = _business_id;

  RETURN jsonb_build_object('ok',true,'slot_index',slot.slot_index);
END $$;

REVOKE EXECUTE ON FUNCTION public.claim_exclusive_slot(uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.claim_exclusive_slot(uuid, uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.bump_business_live_energy()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE _bid uuid;
BEGIN
  SELECT id INTO _bid FROM public.business_accounts WHERE venue_id = NEW.venue_id LIMIT 1;
  IF _bid IS NOT NULL THEN
    UPDATE public.business_accounts
       SET live_energy = (SELECT COUNT(*) FROM public.check_ins
                          WHERE venue_id = NEW.venue_id
                            AND created_at > now() - interval '2 hours')
     WHERE id = _bid;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_bump_live_energy ON public.check_ins;
CREATE TRIGGER trg_bump_live_energy
AFTER INSERT ON public.check_ins
FOR EACH ROW EXECUTE FUNCTION public.bump_business_live_energy();
