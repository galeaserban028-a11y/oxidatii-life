DROP FUNCTION IF EXISTS public.get_reels_for_you(int);
DROP FUNCTION IF EXISTS public.get_people_you_may_know(int);

CREATE OR REPLACE FUNCTION public.get_reels_for_you(p_limit int DEFAULT 60)
RETURNS TABLE (
  id uuid, photo_url text, caption text, taken_at timestamptz,
  user_id uuid, venue_id uuid, media_type text, score numeric,
  is_friend boolean, is_follow boolean, same_city boolean
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  WITH me AS (SELECT auth.uid() AS uid),
  my_city AS (SELECT city_id FROM public.profiles WHERE id = (SELECT uid FROM me)),
  my_friends AS (
    SELECT CASE WHEN requester_id = (SELECT uid FROM me) THEN addressee_id ELSE requester_id END AS fid
    FROM public.friendships
    WHERE status = 'accepted' AND ((SELECT uid FROM me) IN (requester_id, addressee_id))
  ),
  my_follows AS (
    SELECT following_id AS fid FROM public.follows
    WHERE follower_id = (SELECT uid FROM me) AND status = 'accepted'
  ),
  base AS (
    SELECT vp.id, vp.photo_url, vp.caption, vp.taken_at, vp.user_id, vp.venue_id, vp.media_type,
           v.city_id AS venue_city
    FROM public.venue_photos vp
    LEFT JOIN public.venues v ON v.id = vp.venue_id
    WHERE vp.taken_at > now() - interval '14 days'
    ORDER BY vp.taken_at DESC
    LIMIT 400
  ),
  scored AS (
    SELECT b.id, b.photo_url, b.caption, b.taken_at, b.user_id, b.venue_id, b.media_type,
      (b.user_id IN (SELECT fid FROM my_friends)) AS is_friend,
      (b.user_id IN (SELECT fid FROM my_follows)) AS is_follow,
      (b.venue_city IS NOT NULL AND b.venue_city = (SELECT city_id FROM my_city)) AS same_city,
      (
        GREATEST(0, 5 - EXTRACT(EPOCH FROM (now() - b.taken_at)) / 86400.0)::numeric
        + CASE WHEN b.user_id IN (SELECT fid FROM my_friends) THEN 8 ELSE 0 END
        + CASE WHEN b.user_id IN (SELECT fid FROM my_follows) THEN 4 ELSE 0 END
        + CASE WHEN b.venue_city IS NOT NULL AND b.venue_city = (SELECT city_id FROM my_city) THEN 3 ELSE 0 END
        + CASE WHEN b.media_type = 'video' THEN 2 ELSE 0 END
      ) AS score
    FROM base b
  ),
  diversified AS (
    SELECT *, ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY score DESC, taken_at DESC) AS rn
    FROM scored
  )
  SELECT id, photo_url, caption, taken_at, user_id, venue_id, media_type, score,
         is_friend, is_follow, same_city
  FROM diversified
  WHERE rn <= 2
  ORDER BY score DESC, taken_at DESC
  LIMIT p_limit;
$$;
GRANT EXECUTE ON FUNCTION public.get_reels_for_you(int) TO authenticated;

CREATE OR REPLACE FUNCTION public.get_people_you_may_know(p_limit int DEFAULT 20)
RETURNS TABLE (
  id uuid, handle text, display_name text, avatar_url text, rank text, aura int,
  common_venues int, city_name text, last_seen_at timestamptz
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  WITH me AS (SELECT auth.uid() AS uid),
  my_venues AS (
    SELECT DISTINCT venue_id FROM public.check_ins
    WHERE user_id = (SELECT uid FROM me) AND venue_id IS NOT NULL
      AND created_at > now() - interval '60 days'
  ),
  excluded AS (
    SELECT (SELECT uid FROM me) AS id
    UNION SELECT following_id FROM public.follows WHERE follower_id = (SELECT uid FROM me)
    UNION SELECT CASE WHEN requester_id = (SELECT uid FROM me) THEN addressee_id ELSE requester_id END
           FROM public.friendships WHERE (SELECT uid FROM me) IN (requester_id, addressee_id)
    UNION SELECT blocked_id FROM public.blocks WHERE blocker_id = (SELECT uid FROM me)
    UNION SELECT blocker_id FROM public.blocks WHERE blocked_id = (SELECT uid FROM me)
  ),
  candidates AS (
    SELECT ci.user_id,
           COUNT(DISTINCT ci.venue_id)::int AS common_venues,
           MAX(ci.created_at) AS last_seen_at
    FROM public.check_ins ci
    WHERE ci.venue_id IN (SELECT venue_id FROM my_venues)
      AND ci.user_id NOT IN (SELECT id FROM excluded)
      AND ci.created_at > now() - interval '60 days'
    GROUP BY ci.user_id
    ORDER BY common_venues DESC
    LIMIT p_limit * 2
  )
  SELECT p.id, p.handle, p.display_name, p.avatar_url, p.rank, p.aura,
         c.common_venues, ci.name AS city_name, c.last_seen_at
  FROM candidates c
  JOIN public.profiles p ON p.id = c.user_id
  LEFT JOIN public.cities ci ON ci.id = p.city_id
  WHERE COALESCE(p.is_public, true) = true
  ORDER BY c.common_venues DESC, c.last_seen_at DESC, p.aura DESC NULLS LAST
  LIMIT p_limit;
$$;
GRANT EXECUTE ON FUNCTION public.get_people_you_may_know(int) TO authenticated;