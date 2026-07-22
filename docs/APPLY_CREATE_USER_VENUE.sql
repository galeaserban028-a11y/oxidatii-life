-- OXIDAȚII project only: qzxvnjpumtujfylfofmg
-- https://supabase.com/dashboard/project/qzxvnjpumtujfylfofmg/sql/new

CREATE OR REPLACE FUNCTION public.create_user_venue(
  _name text,
  _type text,
  _city_id uuid,
  _lat double precision,
  _lng double precision,
  _address text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_id uuid;
  s text;
BEGIN
  IF to_regclass('public.venues') IS NULL THEN
    RAISE EXCEPTION 'venues_table_missing — open project qzxvnjpumtujfylfofmg';
  END IF;
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;
  IF _name IS NULL OR length(trim(_name)) < 2 THEN
    RAISE EXCEPTION 'name_required';
  END IF;
  IF _type IS NULL OR _type NOT IN ('club', 'bar', 'terasa', 'after', 'pub') THEN
    RAISE EXCEPTION 'bad_type';
  END IF;
  IF _city_id IS NULL THEN
    RAISE EXCEPTION 'city_required';
  END IF;
  IF _lat IS NULL OR _lng IS NULL
     OR _lat < -90 OR _lat > 90 OR _lng < -180 OR _lng > 180 THEN
    RAISE EXCEPTION 'coords_required';
  END IF;

  s := lower(trim(regexp_replace(
    translate(trim(_name), 'ăâîșțĂÂÎȘȚ', 'aaistaaaiist'),
    '[^a-z0-9]+', '-', 'g'
  )));
  s := trim(both '-' from s);
  IF s IS NULL OR s = '' THEN s := 'loc'; END IF;
  s := left(s, 48) || '-' || substr(md5(random()::text || clock_timestamp()::text), 1, 6);

  INSERT INTO public.venues (name, slug, type, city_id, lat, lng, address)
  VALUES (trim(_name), s, _type::public.venue_type, _city_id, _lat, _lng, NULLIF(trim(_address), ''))
  RETURNING id INTO new_id;

  RETURN new_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_user_venue(text, text, uuid, double precision, double precision, text)
  TO authenticated;

DROP POLICY IF EXISTS "venues_auth_insert" ON public.venues;
CREATE POLICY "venues_auth_insert"
  ON public.venues
  FOR INSERT
  TO authenticated
  WITH CHECK (
    lat IS NOT NULL
    AND lng IS NOT NULL
    AND name IS NOT NULL
    AND length(trim(name)) >= 2
    AND city_id IS NOT NULL
    AND type IS NOT NULL
  );
