CREATE INDEX IF NOT EXISTS idx_venues_name ON public.venues (name);
CREATE INDEX IF NOT EXISTS idx_venues_latlng_notnull ON public.venues (name) WHERE lat IS NOT NULL AND lng IS NOT NULL;