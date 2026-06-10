
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS birthdate date,
  ADD COLUMN IF NOT EXISTS tutorial_seen boolean NOT NULL DEFAULT false;

-- Validation trigger: if birthdate is set, must be 18+ years ago
CREATE OR REPLACE FUNCTION public.validate_birthdate()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.birthdate IS NOT NULL AND NEW.birthdate > (CURRENT_DATE - INTERVAL '18 years')::date THEN
    RAISE EXCEPTION 'Trebuie să ai cel puțin 18 ani';
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_validate_birthdate ON public.profiles;
CREATE TRIGGER trg_validate_birthdate
  BEFORE INSERT OR UPDATE OF birthdate ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.validate_birthdate();
