
-- Spritz Score: composite leaderboard combining 5 metrics per month
CREATE OR REPLACE FUNCTION public.get_spritz_score_leaderboard(
  _scope text DEFAULT 'world',          -- 'world' | 'country' | 'city'
  _country text DEFAULT NULL,           -- ISO code (when scope='country')
  _city_id uuid DEFAULT NULL,           -- city uuid (when scope='city')
  _month_start timestamptz DEFAULT date_trunc('month', now()),
  _limit int DEFAULT 100
)
RETURNS TABLE (
  user_id uuid,
  handle text,
  display_name text,
  avatar_url text,
  city_name text,
  country text,
  base_sprits int,
  explorer_score int,
  unique_venues int,
  unique_cities int,
  squad_maker int,
  sunrise_index int,
  trendsetter int,
  spritz_score int,
  rank int
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH window_bounds AS (
    SELECT _month_start AS w_start,
           (_month_start + interval '1 month') AS w_end
  ),
  -- Candidate users (public profiles, scoped by geo)
  candidates AS (
    SELECT p.id, p.handle, p.display_name, p.avatar_url,
           c.name AS city_name, c.country AS country
    FROM public.profiles p
    LEFT JOIN public.cities c ON c.id = p.city_id
    WHERE p.is_public = true
      AND (
        _scope = 'world'
        OR (_scope = 'country' AND c.country = _country)
        OR (_scope = 'city' AND p.city_id = _city_id)
      )
  ),
  -- Pre-filter check-ins for the month, joined with city
  ci AS (
    SELECT c.user_id, c.venue_id, c.created_at, v.city_id
    FROM public.check_ins c
    JOIN public.venues v ON v.id = c.venue_id
    JOIN window_bounds w ON c.created_at >= w.w_start AND c.created_at < w.w_end
    WHERE c.user_id IN (SELECT id FROM candidates)
  ),
  base AS (
    SELECT user_id, COUNT(*)::int AS base_sprits
    FROM ci GROUP BY user_id
  ),
  explorer AS (
    SELECT user_id,
           COUNT(DISTINCT venue_id)::int AS unique_venues,
           COUNT(DISTINCT city_id)::int AS unique_cities
    FROM ci GROUP BY user_id
  ),
  sunrise AS (
    -- Hours 00:00-05:59 Bucharest = strong noctambul; weight = 6 - hour
    SELECT user_id,
           SUM(
             GREATEST(0, 6 - EXTRACT(HOUR FROM created_at AT TIME ZONE 'Europe/Bucharest'))::int
           )::int AS sunrise_index
    FROM ci GROUP BY user_id
  ),
  -- Trendsetter: distinct other users who arrived at same venue 0..2h AFTER me
  trendsetter AS (
    SELECT me.user_id,
           COUNT(DISTINCT other.user_id)::int AS trendsetter
    FROM ci me
    JOIN public.check_ins other
      ON other.venue_id = me.venue_id
     AND other.user_id <> me.user_id
     AND other.created_at > me.created_at
     AND other.created_at <= me.created_at + interval '2 hours'
    GROUP BY me.user_id
  ),
  -- Squad maker: distinct other users co-checked-in within ±2h who are NOT already friends
  squad AS (
    SELECT me.user_id,
           COUNT(DISTINCT other.user_id)::int AS squad_maker
    FROM ci me
    JOIN public.check_ins other
      ON other.venue_id = me.venue_id
     AND other.user_id <> me.user_id
     AND other.created_at BETWEEN me.created_at - interval '2 hours'
                              AND me.created_at + interval '2 hours'
    WHERE NOT EXISTS (
      SELECT 1 FROM public.friendships f
      WHERE f.status = 'accepted'
        AND ((f.requester_id = me.user_id AND f.addressee_id = other.user_id)
          OR (f.requester_id = other.user_id AND f.addressee_id = me.user_id))
    )
    GROUP BY me.user_id
  ),
  scored AS (
    SELECT
      c.id AS user_id, c.handle, c.display_name, c.avatar_url,
      c.city_name, c.country,
      COALESCE(b.base_sprits, 0) AS base_sprits,
      COALESCE(e.unique_venues, 0) AS unique_venues,
      COALESCE(e.unique_cities, 0) AS unique_cities,
      (COALESCE(e.unique_venues, 0) * 5 + COALESCE(e.unique_cities, 0) * 15) AS explorer_score,
      COALESCE(sq.squad_maker, 0) AS squad_maker,
      COALESCE(s.sunrise_index, 0) AS sunrise_index,
      COALESCE(t.trendsetter, 0) AS trendsetter
    FROM candidates c
    LEFT JOIN base b ON b.user_id = c.id
    LEFT JOIN explorer e ON e.user_id = c.id
    LEFT JOIN squad sq ON sq.user_id = c.id
    LEFT JOIN sunrise s ON s.user_id = c.id
    LEFT JOIN trendsetter t ON t.user_id = c.id
  ),
  composed AS (
    SELECT *,
      (base_sprits * 10
       + explorer_score
       + squad_maker * 8
       + sunrise_index * 4
       + trendsetter * 6)::int AS spritz_score
    FROM scored
  )
  SELECT user_id, handle, display_name, avatar_url, city_name, country,
         base_sprits, explorer_score, unique_venues, unique_cities,
         squad_maker, sunrise_index, trendsetter, spritz_score,
         (ROW_NUMBER() OVER (ORDER BY spritz_score DESC, base_sprits DESC, user_id))::int AS rank
  FROM composed
  WHERE spritz_score > 0
  ORDER BY spritz_score DESC, base_sprits DESC, user_id
  LIMIT GREATEST(1, LEAST(_limit, 200));
$$;

REVOKE EXECUTE ON FUNCTION public.get_spritz_score_leaderboard(text, text, uuid, timestamptz, int) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.get_spritz_score_leaderboard(text, text, uuid, timestamptz, int) TO authenticated;

-- Companion: get a single user's rank/score (so they can see "you are #X" even if not in top 100)
CREATE OR REPLACE FUNCTION public.get_my_spritz_score(
  _scope text DEFAULT 'country',
  _country text DEFAULT NULL,
  _city_id uuid DEFAULT NULL,
  _month_start timestamptz DEFAULT date_trunc('month', now())
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
  row_data record;
  total_count int;
BEGIN
  IF uid IS NULL THEN RETURN jsonb_build_object('ok', false, 'error', 'not_authenticated'); END IF;

  -- Query full ranking (capped at 200), find my row
  WITH r AS (
    SELECT * FROM public.get_spritz_score_leaderboard(_scope, _country, _city_id, _month_start, 200)
  )
  SELECT *, (SELECT COUNT(*) FROM r) AS total
  INTO row_data
  FROM r WHERE user_id = uid;

  total_count := COALESCE(row_data.total, 0);

  IF row_data.user_id IS NULL THEN
    RETURN jsonb_build_object('ok', true, 'in_top', false, 'total', total_count);
  END IF;

  RETURN jsonb_build_object(
    'ok', true,
    'in_top', true,
    'total', total_count,
    'rank', row_data.rank,
    'spritz_score', row_data.spritz_score,
    'base_sprits', row_data.base_sprits,
    'explorer_score', row_data.explorer_score,
    'unique_venues', row_data.unique_venues,
    'unique_cities', row_data.unique_cities,
    'squad_maker', row_data.squad_maker,
    'sunrise_index', row_data.sunrise_index,
    'trendsetter', row_data.trendsetter
  );
END $$;

REVOKE EXECUTE ON FUNCTION public.get_my_spritz_score(text, text, uuid, timestamptz) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.get_my_spritz_score(text, text, uuid, timestamptz) TO authenticated;
