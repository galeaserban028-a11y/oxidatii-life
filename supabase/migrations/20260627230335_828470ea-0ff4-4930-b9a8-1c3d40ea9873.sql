
CREATE OR REPLACE FUNCTION public.get_drop_stats()
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path = public AS $$
DECLARE
  v_total BIGINT;
  v_users BIGINT;
  v_top_cities JSONB;
  v_top_proof JSONB;
BEGIN
  SELECT count(*) INTO v_total FROM public.sprit_proofs
  WHERE created_at >= date_trunc('week', now());

  SELECT count(DISTINCT user_id) INTO v_users FROM public.sprit_proofs
  WHERE created_at >= date_trunc('week', now());

  SELECT COALESCE(jsonb_agg(jsonb_build_object('city', city_name, 'count', cnt) ORDER BY cnt DESC), '[]'::jsonb)
  INTO v_top_cities FROM (
    SELECT c.name AS city_name, count(*) AS cnt
    FROM public.sprit_proofs sp
    JOIN public.profiles p ON p.id = sp.user_id
    JOIN public.cities c ON c.id = p.city_id
    WHERE sp.created_at >= date_trunc('week', now())
    GROUP BY c.name
    ORDER BY count(*) DESC
    LIMIT 3
  ) t;

  SELECT to_jsonb(t) INTO v_top_proof FROM (
    SELECT sp.id, sp.photo_url, p.display_name, p.handle, p.avatar_url,
           COALESCE((SELECT count(*) FROM public.photo_likes pl WHERE pl.photo_id = sp.id), 0) AS likes
    FROM public.sprit_proofs sp
    JOIN public.profiles p ON p.id = sp.user_id
    WHERE sp.created_at >= date_trunc('week', now()) AND p.is_public = true
    ORDER BY (SELECT count(*) FROM public.photo_likes pl WHERE pl.photo_id = sp.id) DESC NULLS LAST,
             sp.created_at DESC
    LIMIT 1
  ) t;

  RETURN jsonb_build_object(
    'total_spritz', COALESCE(v_total, 0),
    'active_users', COALESCE(v_users, 0),
    'top_cities', v_top_cities,
    'top_proof', v_top_proof,
    'week_start', date_trunc('week', now())
  );
END $$;

GRANT EXECUTE ON FUNCTION public.get_drop_stats() TO anon, authenticated;

-- Also fix monthly wrap to use venue_id only (no caption col exists)
CREATE OR REPLACE FUNCTION public.get_monthly_wrap(_month_start DATE DEFAULT NULL)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path = public AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_start DATE;
  v_end DATE;
  v_proofs BIGINT;
  v_nights BIGINT;
  v_top_venue JSONB;
  v_top_crew JSONB;
  v_badge TEXT;
BEGIN
  IF v_uid IS NULL THEN RETURN jsonb_build_object('ok', false); END IF;
  v_start := COALESCE(_month_start, date_trunc('month', now())::date);
  v_end := (v_start + interval '1 month')::date;

  SELECT count(*) INTO v_proofs FROM public.sprit_proofs
  WHERE user_id = v_uid AND created_at >= v_start AND created_at < v_end;

  SELECT count(DISTINCT date_trunc('day', created_at)) INTO v_nights
  FROM public.sprit_proofs WHERE user_id = v_uid AND created_at >= v_start AND created_at < v_end;

  SELECT to_jsonb(t) INTO v_top_venue FROM (
    SELECT v.id, v.name, count(*) AS visits
    FROM public.sprit_proofs sp
    JOIN public.venues v ON v.id = sp.venue_id
    WHERE sp.user_id = v_uid AND sp.created_at >= v_start AND sp.created_at < v_end
      AND sp.venue_id IS NOT NULL
    GROUP BY v.id, v.name
    ORDER BY count(*) DESC LIMIT 1
  ) t;

  SELECT COALESCE(jsonb_agg(jsonb_build_object('id', uid, 'display_name', dn, 'avatar_url', av) ORDER BY hangs DESC), '[]'::jsonb)
  INTO v_top_crew FROM (
    SELECT p.id AS uid, p.display_name AS dn, p.avatar_url AS av, count(*) AS hangs
    FROM public.party_joins pj
    JOIN public.parties pa ON pa.id = pj.party_id
    JOIN public.profiles p ON p.id = pj.user_id
    WHERE pj.status = 'accepted'
      AND pa.created_at >= v_start AND pa.created_at < v_end
      AND pj.user_id <> v_uid
      AND pa.host_id = v_uid
    GROUP BY p.id, p.display_name, p.avatar_url
    ORDER BY count(*) DESC LIMIT 3
  ) t;

  v_badge := CASE
    WHEN v_proofs >= 20 THEN 'Night Legend'
    WHEN v_proofs >= 10 THEN 'Social Butterfly'
    WHEN v_proofs >= 5 THEN 'Spritz Regular'
    WHEN v_proofs >= 1 THEN 'Casual Sipper'
    ELSE 'Ghost'
  END;

  RETURN jsonb_build_object(
    'ok', true,
    'month_start', v_start,
    'proofs', COALESCE(v_proofs, 0),
    'nights', COALESCE(v_nights, 0),
    'top_venue', v_top_venue,
    'top_crew', v_top_crew,
    'badge', v_badge
  );
END $$;
