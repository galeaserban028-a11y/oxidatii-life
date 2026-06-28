
CREATE OR REPLACE FUNCTION public.get_reels_for_you(p_limit int DEFAULT 60)
RETURNS TABLE (
  id uuid, photo_url text, caption text, taken_at timestamptz,
  user_id uuid, venue_id uuid, media_type text, score numeric
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
    LIMIT 300
  )
  SELECT b.id, b.photo_url, b.caption, b.taken_at, b.user_id, b.venue_id, b.media_type,
    (
      GREATEST(0, 5 - EXTRACT(EPOCH FROM (now() - b.taken_at)) / 86400.0)::numeric
      + CASE WHEN b.user_id IN (SELECT fid FROM my_friends) THEN 8 ELSE 0 END
      + CASE WHEN b.user_id IN (SELECT fid FROM my_follows) THEN 4 ELSE 0 END
      + CASE WHEN b.venue_city IS NOT NULL AND b.venue_city = (SELECT city_id FROM my_city) THEN 3 ELSE 0 END
      + CASE WHEN b.media_type = 'video' THEN 2 ELSE 0 END
    ) AS score
  FROM base b
  ORDER BY score DESC, b.taken_at DESC
  LIMIT p_limit;
$$;
GRANT EXECUTE ON FUNCTION public.get_reels_for_you(int) TO authenticated;

CREATE OR REPLACE FUNCTION public.get_people_you_may_know(p_limit int DEFAULT 20)
RETURNS TABLE (
  id uuid, handle text, display_name text, avatar_url text, rank text, aura int,
  common_venues int
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
    SELECT ci.user_id, COUNT(DISTINCT ci.venue_id)::int AS common_venues
    FROM public.check_ins ci
    WHERE ci.venue_id IN (SELECT venue_id FROM my_venues)
      AND ci.user_id NOT IN (SELECT id FROM excluded)
      AND ci.created_at > now() - interval '60 days'
    GROUP BY ci.user_id
    ORDER BY common_venues DESC
    LIMIT p_limit * 2
  )
  SELECT p.id, p.handle, p.display_name, p.avatar_url, p.rank, p.aura, c.common_venues
  FROM candidates c
  JOIN public.profiles p ON p.id = c.user_id
  WHERE COALESCE(p.is_public, true) = true
  ORDER BY c.common_venues DESC, p.aura DESC NULLS LAST
  LIMIT p_limit;
$$;
GRANT EXECUTE ON FUNCTION public.get_people_you_may_know(int) TO authenticated;

CREATE TABLE IF NOT EXISTS public.creator_tips (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  recipient_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount int NOT NULL CHECK (amount > 0),
  message text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.creator_tips TO authenticated;
GRANT ALL ON public.creator_tips TO service_role;
ALTER TABLE public.creator_tips ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS creator_tips_read_own ON public.creator_tips;
CREATE POLICY creator_tips_read_own ON public.creator_tips
  FOR SELECT TO authenticated
  USING (auth.uid() IN (sender_id, recipient_id));
CREATE INDEX IF NOT EXISTS idx_creator_tips_recipient ON public.creator_tips(recipient_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_creator_tips_sender ON public.creator_tips(sender_id, created_at DESC);

CREATE OR REPLACE FUNCTION public.tip_creator(
  p_recipient_id uuid,
  p_amount int,
  p_message text DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_sender uuid := auth.uid();
  v_balance int;
  v_tip_id uuid;
BEGIN
  IF v_sender IS NULL THEN RAISE EXCEPTION 'not_authenticated'; END IF;
  IF v_sender = p_recipient_id THEN RAISE EXCEPTION 'cannot_tip_self'; END IF;
  IF p_amount IS NULL OR p_amount < 5 THEN RAISE EXCEPTION 'min_tip_5'; END IF;
  IF p_amount > 5000 THEN RAISE EXCEPTION 'max_tip_5000'; END IF;

  SELECT COALESCE(coin_balance, 0) INTO v_balance FROM public.profiles WHERE id = v_sender FOR UPDATE;
  IF v_balance < p_amount THEN RAISE EXCEPTION 'insufficient_funds'; END IF;

  UPDATE public.profiles SET coin_balance = coin_balance - p_amount WHERE id = v_sender;
  UPDATE public.profiles SET coin_balance = COALESCE(coin_balance, 0) + p_amount WHERE id = p_recipient_id;

  INSERT INTO public.creator_tips (sender_id, recipient_id, amount, message)
  VALUES (v_sender, p_recipient_id, p_amount, NULLIF(trim(p_message), ''))
  RETURNING id INTO v_tip_id;

  INSERT INTO public.wallet_ledger (user_id, amount, kind, ref)
  VALUES (v_sender, -p_amount, 'tip_sent', v_tip_id::text),
         (p_recipient_id, p_amount, 'tip_received', v_tip_id::text);

  INSERT INTO public.notifications (user_id, actor_id, type, data)
  VALUES (
    p_recipient_id, v_sender, 'creator_tip',
    jsonb_build_object('amount', p_amount, 'tip_id', v_tip_id, 'message', NULLIF(trim(p_message), ''))
  );

  RETURN jsonb_build_object('ok', true, 'tip_id', v_tip_id, 'new_balance', v_balance - p_amount);
END;
$$;
GRANT EXECUTE ON FUNCTION public.tip_creator(uuid, int, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.get_creator_earnings(p_user_id uuid)
RETURNS jsonb
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT jsonb_build_object(
    'total', COALESCE(SUM(amount), 0)::int,
    'count', COUNT(*)::int,
    'last_30d', COALESCE(SUM(amount) FILTER (WHERE created_at > now() - interval '30 days'), 0)::int
  )
  FROM public.creator_tips
  WHERE recipient_id = p_user_id;
$$;
GRANT EXECUTE ON FUNCTION public.get_creator_earnings(uuid) TO authenticated, anon;
