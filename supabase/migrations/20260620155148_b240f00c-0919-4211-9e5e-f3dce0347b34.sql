
CREATE OR REPLACE FUNCTION public.get_spritz_index(_city_id uuid DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  checkins_2h int := 0;
  photos_2h int := 0;
  proofs_2h int := 0;
  ratings_2h int := 0;
  parties_active int := 0;
  cities_count int := 0;
  raw_score numeric := 0;
  final_score int := 0;
  hour_local int;
  dow_local int;
  time_bonus numeric := 1.0;
  vibe text;
  emoji text;
BEGIN
  -- Counts in last 2 hours, optionally scoped by city via venue
  SELECT COUNT(*) INTO checkins_2h
  FROM public.check_ins ci
  LEFT JOIN public.venues v ON v.id = ci.venue_id
  WHERE ci.created_at > now() - interval '2 hours'
    AND (_city_id IS NULL OR v.city_id = _city_id);

  SELECT COUNT(*) INTO photos_2h
  FROM public.venue_photos vp
  LEFT JOIN public.venues v ON v.id = vp.venue_id
  WHERE vp.created_at > now() - interval '2 hours'
    AND (_city_id IS NULL OR v.city_id = _city_id);

  SELECT COUNT(*) INTO proofs_2h
  FROM public.sprit_proofs sp
  WHERE sp.created_at > now() - interval '2 hours';

  SELECT COUNT(*) INTO ratings_2h
  FROM public.user_ratings ur
  WHERE ur.created_at > now() - interval '2 hours';

  SELECT COUNT(*) INTO parties_active
  FROM public.parties p
  LEFT JOIN public.venues v ON v.id = p.venue_id
  WHERE p.expires_at > now()
    AND p.starts_at < now() + interval '6 hours'
    AND (_city_id IS NULL OR v.city_id = _city_id);

  -- Time-of-day bonus (Bucharest tz)
  hour_local := EXTRACT(HOUR FROM (now() AT TIME ZONE 'Europe/Bucharest'))::int;
  dow_local := EXTRACT(DOW FROM (now() AT TIME ZONE 'Europe/Bucharest'))::int;

  IF hour_local BETWEEN 22 AND 23 OR hour_local BETWEEN 0 AND 3 THEN
    time_bonus := 1.35;
  ELSIF hour_local BETWEEN 19 AND 21 THEN
    time_bonus := 1.15;
  ELSIF hour_local BETWEEN 4 AND 11 THEN
    time_bonus := 0.55;
  END IF;

  -- Weekend boost (Fri=5, Sat=6, Sun=0)
  IF dow_local IN (0, 5, 6) THEN
    time_bonus := time_bonus * 1.15;
  END IF;

  -- Weighted raw score (tuned so a lively city sits 60-90)
  raw_score := (checkins_2h * 2.5)
             + (photos_2h * 1.8)
             + (proofs_2h * 2.0)
             + (ratings_2h * 1.2)
             + (parties_active * 4.0);

  raw_score := raw_score * time_bonus;

  -- Compress to 0-100 with diminishing returns (asymptote at 100)
  final_score := LEAST(100, ROUND(100 * (1 - exp(-raw_score / 80.0)))::int);

  -- Vibe label
  IF final_score >= 85 THEN vibe := 'INCENDIAR'; emoji := '🔥';
  ELSIF final_score >= 70 THEN vibe := 'în flăcări'; emoji := '🍹';
  ELSIF final_score >= 50 THEN vibe := 'animat'; emoji := '✨';
  ELSIF final_score >= 30 THEN vibe := 'lent'; emoji := '😌';
  ELSIF final_score >= 15 THEN vibe := 'somnoros'; emoji := '😴';
  ELSE vibe := 'pustiu'; emoji := '🌙';
  END IF;

  RETURN jsonb_build_object(
    'score', final_score,
    'vibe', vibe,
    'emoji', emoji,
    'city_id', _city_id,
    'computed_at', now(),
    'signals', jsonb_build_object(
      'checkins_2h', checkins_2h,
      'photos_2h', photos_2h,
      'proofs_2h', proofs_2h,
      'ratings_2h', ratings_2h,
      'parties_active', parties_active
    ),
    'multiplier', time_bonus
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_spritz_index(uuid) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.get_spritz_index_ranking()
RETURNS TABLE(city_id uuid, city_name text, slug text, score int, vibe text, emoji text)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  c record;
  idx jsonb;
BEGIN
  FOR c IN SELECT id, name, slug FROM public.cities ORDER BY name LOOP
    idx := public.get_spritz_index(c.id);
    city_id := c.id;
    city_name := c.name;
    slug := c.slug;
    score := (idx->>'score')::int;
    vibe := idx->>'vibe';
    emoji := idx->>'emoji';
    RETURN NEXT;
  END LOOP;
  RETURN;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_spritz_index_ranking() TO anon, authenticated;
