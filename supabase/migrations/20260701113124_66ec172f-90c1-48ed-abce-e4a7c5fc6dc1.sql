
-- 1. Add sponsored reel kind to enum
ALTER TYPE campaign_kind ADD VALUE IF NOT EXISTS 'boost_reel';

-- 2. Business dashboard stats RPC (owner-only)
CREATE OR REPLACE FUNCTION public.get_biz_stats(_business_id uuid, _days int DEFAULT 30)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _venue uuid;
  _owner uuid;
  _total int;
  _uniq int;
  _hourly jsonb;
  _daily jsonb;
BEGIN
  SELECT owner_user_id, venue_id INTO _owner, _venue
    FROM public.business_accounts WHERE id = _business_id;
  IF _owner IS NULL OR _owner <> auth.uid() THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
  IF _venue IS NULL THEN
    RETURN jsonb_build_object('total',0,'unique',0,'hourly','[]'::jsonb,'daily','[]'::jsonb,'venue_id',NULL);
  END IF;

  SELECT count(*), count(distinct user_id)
    INTO _total, _uniq
    FROM public.check_ins
    WHERE venue_id = _venue
      AND created_at > now() - make_interval(days => _days);

  SELECT coalesce(jsonb_agg(jsonb_build_object('h', h, 'c', c) ORDER BY h), '[]'::jsonb)
    INTO _hourly
    FROM (
      SELECT extract(hour from created_at at time zone 'Europe/Bucharest')::int AS h,
             count(*)::int AS c
        FROM public.check_ins
       WHERE venue_id = _venue
         AND created_at > now() - make_interval(days => _days)
       GROUP BY 1
    ) t;

  SELECT coalesce(jsonb_agg(jsonb_build_object('d', d, 'c', c) ORDER BY d), '[]'::jsonb)
    INTO _daily
    FROM (
      SELECT to_char(created_at at time zone 'Europe/Bucharest', 'YYYY-MM-DD') AS d,
             count(*)::int AS c
        FROM public.check_ins
       WHERE venue_id = _venue
         AND created_at > now() - make_interval(days => _days)
       GROUP BY 1
    ) t;

  RETURN jsonb_build_object(
    'total', coalesce(_total,0),
    'unique', coalesce(_uniq,0),
    'hourly', _hourly,
    'daily', _daily,
    'venue_id', _venue
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_biz_stats(uuid, int) TO authenticated;
