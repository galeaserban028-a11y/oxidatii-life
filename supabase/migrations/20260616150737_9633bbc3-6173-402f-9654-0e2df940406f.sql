DROP FUNCTION IF EXISTS public.claim_daily_spin() CASCADE;
DROP FUNCTION IF EXISTS public.set_tonight_intent(date) CASCADE;
DROP FUNCTION IF EXISTS public.set_tonight_intent(date, uuid, text) CASCADE;
DROP FUNCTION IF EXISTS public.clear_tonight_intent(date) CASCADE;
DROP FUNCTION IF EXISTS public.get_tonight_friends(date) CASCADE;
DROP FUNCTION IF EXISTS public.get_streak_status() CASCADE;
DROP TABLE IF EXISTS public.daily_spins CASCADE;
DROP TABLE IF EXISTS public.tonight_intents CASCADE;