
ALTER TABLE public.campaigns
  ADD COLUMN IF NOT EXISTS event_starts_at timestamptz,
  ADD COLUMN IF NOT EXISTS entry_kind text,
  ADD COLUMN IF NOT EXISTS entry_price_text text,
  ADD COLUMN IF NOT EXISTS street text,
  ADD COLUMN IF NOT EXISTS special_guest text,
  ADD COLUMN IF NOT EXISTS video_url text;

ALTER TABLE public.campaigns
  DROP CONSTRAINT IF EXISTS campaigns_entry_kind_check;
ALTER TABLE public.campaigns
  ADD CONSTRAINT campaigns_entry_kind_check
  CHECK (entry_kind IS NULL OR entry_kind IN ('free','paid'));
