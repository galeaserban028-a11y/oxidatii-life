ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS profile_theme_id text,
  ADD COLUMN IF NOT EXISTS music_clip_url text,
  ADD COLUMN IF NOT EXISTS profile_bg_url text,
  ADD COLUMN IF NOT EXISTS boost_until timestamptz,
  ADD COLUMN IF NOT EXISTS last_boost_at timestamptz;

CREATE OR REPLACE FUNCTION public.claim_profile_boost()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
  prof record;
  next_at timestamptz;
  new_until timestamptz;
BEGIN
  IF uid IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'not_authenticated');
  END IF;

  SELECT premium_tier, premium_until, last_boost_at
    INTO prof
    FROM public.profiles
   WHERE id = uid;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'profile_not_found');
  END IF;

  IF prof.premium_tier IS NULL
     OR prof.premium_tier::text NOT IN ('pro','elite')
     OR prof.premium_until IS NULL
     OR prof.premium_until < now() THEN
    RETURN jsonb_build_object('ok', false, 'error', 'requires_pro');
  END IF;

  IF prof.last_boost_at IS NOT NULL AND prof.last_boost_at > now() - interval '7 days' THEN
    next_at := prof.last_boost_at + interval '7 days';
    RETURN jsonb_build_object('ok', false, 'error', 'cooldown', 'next_at', next_at);
  END IF;

  new_until := now() + interval '24 hours';

  UPDATE public.profiles
     SET boost_until = new_until,
         last_boost_at = now()
   WHERE id = uid;

  RETURN jsonb_build_object('ok', true, 'boost_until', new_until);
END;
$$;

GRANT EXECUTE ON FUNCTION public.claim_profile_boost() TO authenticated;