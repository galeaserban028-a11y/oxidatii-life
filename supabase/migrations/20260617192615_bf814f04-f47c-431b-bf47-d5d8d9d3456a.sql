ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS theme_intensity jsonb;
NOTIFY pgrst, 'reload schema';