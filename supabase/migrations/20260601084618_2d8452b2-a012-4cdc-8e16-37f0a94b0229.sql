
-- Add country support to cities (ISO alpha-2)
ALTER TABLE public.cities
  ADD COLUMN IF NOT EXISTS country TEXT NOT NULL DEFAULT 'RO';

CREATE INDEX IF NOT EXISTS cities_country_idx ON public.cities(country);

-- Make slug unique per country, not globally, so 'paris' etc. don't collide later
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname='public' AND indexname='cities_slug_key') THEN
    ALTER TABLE public.cities DROP CONSTRAINT IF EXISTS cities_slug_key;
  END IF;
EXCEPTION WHEN others THEN NULL; END $$;

CREATE UNIQUE INDEX IF NOT EXISTS cities_country_slug_uidx ON public.cities(country, slug);
