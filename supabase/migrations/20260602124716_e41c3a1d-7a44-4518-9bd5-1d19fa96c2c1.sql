
-- Business types
CREATE TYPE public.business_type AS ENUM ('club','bar','festival','promoter','host','beach');
CREATE TYPE public.business_tier AS ENUM ('starter','growth','pro','elite');
CREATE TYPE public.campaign_kind AS ENUM ('boost_feed');
CREATE TYPE public.campaign_status AS ENUM ('draft','active','paused','exhausted','ended');
CREATE TYPE public.ledger_kind AS ENUM ('topup','spend','refund','bonus','adjustment');

-- ============ business_accounts ============
CREATE TABLE public.business_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_user_id uuid NOT NULL,
  type public.business_type NOT NULL DEFAULT 'promoter',
  brand_name text NOT NULL,
  slug text UNIQUE,
  city_id uuid,
  venue_id uuid,
  contact_email text,
  contact_phone text,
  verified boolean NOT NULL DEFAULT false,
  tier public.business_tier NOT NULL DEFAULT 'starter',
  wallet_balance_cents integer NOT NULL DEFAULT 0,
  monthly_credits_cents integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.business_accounts TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.business_accounts TO authenticated;
GRANT ALL ON public.business_accounts TO service_role;

ALTER TABLE public.business_accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY business_accounts_public_read ON public.business_accounts
  FOR SELECT USING (true);
CREATE POLICY business_accounts_owner_insert ON public.business_accounts
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = owner_user_id);
CREATE POLICY business_accounts_owner_update ON public.business_accounts
  FOR UPDATE TO authenticated USING (auth.uid() = owner_user_id);
CREATE POLICY business_accounts_owner_delete ON public.business_accounts
  FOR DELETE TO authenticated USING (auth.uid() = owner_user_id);

CREATE TRIGGER business_accounts_updated_at
  BEFORE UPDATE ON public.business_accounts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_business_accounts_owner ON public.business_accounts(owner_user_id);
CREATE INDEX idx_business_accounts_city ON public.business_accounts(city_id);

-- ============ wallet_ledger ============
CREATE TABLE public.wallet_ledger (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.business_accounts(id) ON DELETE CASCADE,
  kind public.ledger_kind NOT NULL,
  amount_cents integer NOT NULL,
  campaign_id uuid,
  note text,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.wallet_ledger TO authenticated;
GRANT ALL ON public.wallet_ledger TO service_role;

ALTER TABLE public.wallet_ledger ENABLE ROW LEVEL SECURITY;

CREATE POLICY wallet_ledger_owner_read ON public.wallet_ledger
  FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM public.business_accounts b
            WHERE b.id = wallet_ledger.business_id AND b.owner_user_id = auth.uid())
  );

CREATE INDEX idx_wallet_ledger_business ON public.wallet_ledger(business_id, created_at DESC);

-- ============ campaigns ============
CREATE TABLE public.campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.business_accounts(id) ON DELETE CASCADE,
  kind public.campaign_kind NOT NULL DEFAULT 'boost_feed',
  party_id uuid,
  venue_id uuid,
  city_id uuid,
  title text NOT NULL,
  status public.campaign_status NOT NULL DEFAULT 'draft',
  bid_cents integer NOT NULL DEFAULT 150,   -- per impression (PPR), in bani (0.01 RON)
  budget_cents integer NOT NULL DEFAULT 0,
  spent_cents integer NOT NULL DEFAULT 0,
  impressions integer NOT NULL DEFAULT 0,
  clicks integer NOT NULL DEFAULT 0,
  starts_at timestamptz NOT NULL DEFAULT now(),
  ends_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.campaigns TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.campaigns TO authenticated;
GRANT ALL ON public.campaigns TO service_role;

ALTER TABLE public.campaigns ENABLE ROW LEVEL SECURITY;

-- Anyone can see active campaigns (so the feed can render boosted slots)
CREATE POLICY campaigns_active_public_read ON public.campaigns
  FOR SELECT USING (
    status = 'active'
    AND starts_at <= now()
    AND (ends_at IS NULL OR ends_at > now())
  );

CREATE POLICY campaigns_owner_read ON public.campaigns
  FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM public.business_accounts b
            WHERE b.id = campaigns.business_id AND b.owner_user_id = auth.uid())
  );

CREATE POLICY campaigns_owner_insert ON public.campaigns
  FOR INSERT TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM public.business_accounts b
            WHERE b.id = campaigns.business_id AND b.owner_user_id = auth.uid())
  );

CREATE POLICY campaigns_owner_update ON public.campaigns
  FOR UPDATE TO authenticated USING (
    EXISTS (SELECT 1 FROM public.business_accounts b
            WHERE b.id = campaigns.business_id AND b.owner_user_id = auth.uid())
  );

CREATE POLICY campaigns_owner_delete ON public.campaigns
  FOR DELETE TO authenticated USING (
    EXISTS (SELECT 1 FROM public.business_accounts b
            WHERE b.id = campaigns.business_id AND b.owner_user_id = auth.uid())
  );

CREATE TRIGGER campaigns_updated_at
  BEFORE UPDATE ON public.campaigns
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_campaigns_status ON public.campaigns(status, city_id);
CREATE INDEX idx_campaigns_business ON public.campaigns(business_id);

-- ============ campaign_events ============
CREATE TABLE public.campaign_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
  user_id uuid,
  event_type text NOT NULL,    -- 'impression' | 'click' | 'conversion'
  cost_cents integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.campaign_events TO authenticated;
GRANT ALL ON public.campaign_events TO service_role;

ALTER TABLE public.campaign_events ENABLE ROW LEVEL SECURITY;

-- Authenticated users can log their own impression/click on an active campaign
CREATE POLICY campaign_events_user_insert ON public.campaign_events
  FOR INSERT TO authenticated WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (SELECT 1 FROM public.campaigns c WHERE c.id = campaign_events.campaign_id AND c.status = 'active')
  );

CREATE POLICY campaign_events_owner_read ON public.campaign_events
  FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM public.campaigns c
            JOIN public.business_accounts b ON b.id = c.business_id
            WHERE c.id = campaign_events.campaign_id AND b.owner_user_id = auth.uid())
  );

CREATE INDEX idx_campaign_events_campaign ON public.campaign_events(campaign_id, created_at DESC);
