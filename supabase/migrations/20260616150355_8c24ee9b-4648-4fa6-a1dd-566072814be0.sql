ALTER TABLE public.notification_prefs
  ADD COLUMN IF NOT EXISTS daily_spin boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS streak_risk boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS tonight_prompt boolean NOT NULL DEFAULT true;