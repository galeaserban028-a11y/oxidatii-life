ALTER TABLE public.venue_photos ADD COLUMN IF NOT EXISTS media_type text NOT NULL DEFAULT 'image';
ALTER TABLE public.sprit_proofs ADD COLUMN IF NOT EXISTS media_type text NOT NULL DEFAULT 'image';
ALTER TABLE public.venue_photos ADD CONSTRAINT venue_photos_media_type_check CHECK (media_type IN ('image','video'));
ALTER TABLE public.sprit_proofs ADD CONSTRAINT sprit_proofs_media_type_check CHECK (media_type IN ('image','video'));