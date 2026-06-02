
-- Extend business_accounts with brand profile fields
ALTER TABLE public.business_accounts
  ADD COLUMN IF NOT EXISTS cover_url text,
  ADD COLUMN IF NOT EXISTS logo_url text,
  ADD COLUMN IF NOT EXISTS description text,
  ADD COLUMN IF NOT EXISTS website text,
  ADD COLUMN IF NOT EXISTS instagram_handle text,
  ADD COLUMN IF NOT EXISTS tiktok_handle text,
  ADD COLUMN IF NOT EXISTS address text,
  ADD COLUMN IF NOT EXISTS lat numeric,
  ADD COLUMN IF NOT EXISTS lng numeric;

-- Extend campaigns with rich creative + targeting + scheduling
ALTER TABLE public.campaigns
  ADD COLUMN IF NOT EXISTS subtitle text,
  ADD COLUMN IF NOT EXISTS cta_text text DEFAULT 'Vezi detalii',
  ADD COLUMN IF NOT EXISTS cta_url text,
  ADD COLUMN IF NOT EXISTS image_urls text[] DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS theme_color text DEFAULT '#FF2D55',
  ADD COLUMN IF NOT EXISTS pricing_model text NOT NULL DEFAULT 'cpm',
  ADD COLUMN IF NOT EXISTS daily_cap_cents integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS targeting jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS schedule jsonb NOT NULL DEFAULT '{}'::jsonb;

-- Add a placement type to support multiple ad surfaces.
-- The existing campaign_kind enum has 'boost_feed'; add more values.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_enum e ON t.oid=e.enumtypid WHERE t.typname='campaign_kind' AND e.enumlabel='boost_map') THEN
    ALTER TYPE public.campaign_kind ADD VALUE 'boost_map';
  END IF;
END$$;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_enum e ON t.oid=e.enumtypid WHERE t.typname='campaign_kind' AND e.enumlabel='boost_discover') THEN
    ALTER TYPE public.campaign_kind ADD VALUE 'boost_discover';
  END IF;
END$$;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_enum e ON t.oid=e.enumtypid WHERE t.typname='campaign_kind' AND e.enumlabel='boost_story') THEN
    ALTER TYPE public.campaign_kind ADD VALUE 'boost_story';
  END IF;
END$$;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_enum e ON t.oid=e.enumtypid WHERE t.typname='campaign_kind' AND e.enumlabel='boost_push') THEN
    ALTER TYPE public.campaign_kind ADD VALUE 'boost_push';
  END IF;
END$$;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_enum e ON t.oid=e.enumtypid WHERE t.typname='campaign_kind' AND e.enumlabel='boost_brand') THEN
    ALTER TYPE public.campaign_kind ADD VALUE 'boost_brand';
  END IF;
END$$;

-- Allow public-read of business media bucket policies are already configured for venue-photos; reuse it.

-- Make sure RLS still allows owners to update new columns (existing campaigns_owner_update covers all cols).
