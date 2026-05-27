
REVOKE EXECUTE ON FUNCTION public.bump_streak_on_checkin() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.iso_week_start(timestamptz) FROM PUBLIC, anon, authenticated;
