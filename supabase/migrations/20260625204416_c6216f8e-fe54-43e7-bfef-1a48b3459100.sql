
-- =============== DECISION MODE ===============

CREATE TABLE public.decision_polls (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  host_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  conversation_id uuid REFERENCES public.conversations(id) ON DELETE CASCADE,
  party_id uuid REFERENCES public.parties(id) ON DELETE SET NULL,
  title text,
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '30 minutes'),
  status text NOT NULL DEFAULT 'open',
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.decision_polls TO authenticated;
GRANT ALL ON public.decision_polls TO service_role;
ALTER TABLE public.decision_polls ENABLE ROW LEVEL SECURITY;

CREATE POLICY "poll members can view" ON public.decision_polls FOR SELECT TO authenticated
  USING (
    host_id = auth.uid()
    OR (conversation_id IS NOT NULL AND public.is_conversation_member(conversation_id, auth.uid()))
  );
CREATE POLICY "host can insert" ON public.decision_polls FOR INSERT TO authenticated
  WITH CHECK (host_id = auth.uid());
CREATE POLICY "host can update" ON public.decision_polls FOR UPDATE TO authenticated
  USING (host_id = auth.uid());
CREATE POLICY "host can delete" ON public.decision_polls FOR DELETE TO authenticated
  USING (host_id = auth.uid());

CREATE TABLE public.decision_options (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  poll_id uuid NOT NULL REFERENCES public.decision_polls(id) ON DELETE CASCADE,
  venue_id uuid REFERENCES public.venues(id) ON DELETE CASCADE,
  label text,
  source text NOT NULL DEFAULT 'manual',
  score_snapshot int DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.decision_options TO authenticated;
GRANT ALL ON public.decision_options TO service_role;
ALTER TABLE public.decision_options ENABLE ROW LEVEL SECURITY;

CREATE POLICY "members view options" ON public.decision_options FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.decision_polls p WHERE p.id = poll_id
      AND (p.host_id = auth.uid()
        OR (p.conversation_id IS NOT NULL AND public.is_conversation_member(p.conversation_id, auth.uid())))
  ));
CREATE POLICY "host manage options" ON public.decision_options FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.decision_polls p WHERE p.id = poll_id AND p.host_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.decision_polls p WHERE p.id = poll_id AND p.host_id = auth.uid()));

CREATE TABLE public.decision_votes (
  poll_id uuid NOT NULL REFERENCES public.decision_polls(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  option_id uuid NOT NULL REFERENCES public.decision_options(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (poll_id, user_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.decision_votes TO authenticated;
GRANT ALL ON public.decision_votes TO service_role;
ALTER TABLE public.decision_votes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "members view votes" ON public.decision_votes FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.decision_polls p WHERE p.id = poll_id
      AND (p.host_id = auth.uid()
        OR (p.conversation_id IS NOT NULL AND public.is_conversation_member(p.conversation_id, auth.uid())))
  ));
CREATE POLICY "members vote" ON public.decision_votes FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.decision_polls p WHERE p.id = poll_id
        AND p.status = 'open' AND p.expires_at > now()
        AND (p.host_id = auth.uid()
          OR (p.conversation_id IS NOT NULL AND public.is_conversation_member(p.conversation_id, auth.uid())))
    )
  );
CREATE POLICY "members update own vote" ON public.decision_votes FOR UPDATE TO authenticated
  USING (user_id = auth.uid());
CREATE POLICY "members delete own vote" ON public.decision_votes FOR DELETE TO authenticated
  USING (user_id = auth.uid());

ALTER PUBLICATION supabase_realtime ADD TABLE public.decision_votes;
ALTER PUBLICATION supabase_realtime ADD TABLE public.decision_polls;

-- =============== HEAT NOW RPC ===============

CREATE OR REPLACE FUNCTION public.get_heat_now(_city_id uuid DEFAULT NULL, _min_lat numeric DEFAULT NULL, _min_lng numeric DEFAULT NULL, _max_lat numeric DEFAULT NULL, _max_lng numeric DEFAULT NULL)
RETURNS TABLE(cell_id text, lat numeric, lng numeric, heat_score int, trend text, recent_count int, prior_count int, top_venue_id uuid, top_venue_name text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  WITH base AS (
    SELECT v.id AS venue_id, v.name AS venue_name, v.lat, v.lng,
           (SELECT COUNT(*) FROM public.check_ins ci WHERE ci.venue_id = v.id AND ci.created_at > now() - interval '90 minutes')
         + (SELECT COUNT(*) FROM public.venue_photos vp WHERE vp.venue_id = v.id AND vp.created_at > now() - interval '90 minutes') AS recent_n,
           (SELECT COUNT(*) FROM public.check_ins ci WHERE ci.venue_id = v.id AND ci.created_at BETWEEN now() - interval '180 minutes' AND now() - interval '90 minutes')
         + (SELECT COUNT(*) FROM public.venue_photos vp WHERE vp.venue_id = v.id AND vp.created_at BETWEEN now() - interval '180 minutes' AND now() - interval '90 minutes') AS prior_n
    FROM public.venues v
    WHERE v.lat IS NOT NULL AND v.lng IS NOT NULL
      AND (_city_id IS NULL OR v.city_id = _city_id)
      AND (_min_lat IS NULL OR (v.lat BETWEEN _min_lat AND _max_lat AND v.lng BETWEEN _min_lng AND _max_lng))
  ),
  cells AS (
    SELECT (round(lat::numeric, 3))::text || ':' || (round(lng::numeric, 3))::text AS cell_id,
           round(lat::numeric, 3) AS clat,
           round(lng::numeric, 3) AS clng,
           SUM(recent_n)::int AS recent_count,
           SUM(prior_n)::int AS prior_count,
           (ARRAY_AGG(venue_id ORDER BY recent_n DESC))[1] AS top_venue_id,
           (ARRAY_AGG(venue_name ORDER BY recent_n DESC))[1] AS top_venue_name
    FROM base
    WHERE recent_n > 0
    GROUP BY 1, 2, 3
  )
  SELECT cell_id, clat AS lat, clng AS lng,
         LEAST(100, ROUND(100 * (1 - exp(-recent_count::numeric / 8.0)))::int) AS heat_score,
         CASE
           WHEN recent_count - prior_count >= 3 THEN 'rising'
           WHEN prior_count - recent_count >= 3 THEN 'cooling'
           ELSE 'flat'
         END AS trend,
         recent_count, prior_count, top_venue_id, top_venue_name
  FROM cells
  ORDER BY recent_count DESC
  LIMIT 60;
$$;

GRANT EXECUTE ON FUNCTION public.get_heat_now(uuid, numeric, numeric, numeric, numeric) TO authenticated, anon;

-- =============== DECISION MODE RPCs ===============

CREATE OR REPLACE FUNCTION public.create_decision_poll(
  _conversation_id uuid,
  _venue_ids uuid[],
  _expires_minutes int DEFAULT 30,
  _title text DEFAULT NULL
) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  uid uuid := auth.uid();
  new_poll uuid;
  v uuid;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'Trebuie să fii autentificat'; END IF;
  IF _conversation_id IS NOT NULL AND NOT public.is_conversation_member(_conversation_id, uid) THEN
    RAISE EXCEPTION 'Nu ești în conversație';
  END IF;
  IF _venue_ids IS NULL OR array_length(_venue_ids, 1) < 2 THEN
    RAISE EXCEPTION 'Adaugă cel puțin 2 opțiuni';
  END IF;

  INSERT INTO public.decision_polls (host_id, conversation_id, expires_at, title)
    VALUES (uid, _conversation_id, now() + (_expires_minutes || ' minutes')::interval, _title)
    RETURNING id INTO new_poll;

  FOREACH v IN ARRAY _venue_ids LOOP
    INSERT INTO public.decision_options (poll_id, venue_id, source)
      VALUES (new_poll, v, 'manual');
  END LOOP;

  -- auto-vote pentru host
  INSERT INTO public.decision_votes (poll_id, user_id, option_id)
    SELECT new_poll, uid, id FROM public.decision_options
    WHERE poll_id = new_poll ORDER BY created_at LIMIT 1;

  IF _conversation_id IS NOT NULL THEN
    INSERT INTO public.messages (conversation_id, sender_id, body)
      VALUES (_conversation_id, uid, '📊 decision:' || new_poll::text);
  END IF;

  RETURN new_poll;
END $$;

GRANT EXECUTE ON FUNCTION public.create_decision_poll(uuid, uuid[], int, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.cast_decision_vote(_poll_id uuid, _option_id uuid)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  uid uuid := auth.uid();
  p record;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'Trebuie să fii autentificat'; END IF;
  SELECT * INTO p FROM public.decision_polls WHERE id = _poll_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Sondaj inexistent'; END IF;
  IF p.status <> 'open' OR p.expires_at < now() THEN RAISE EXCEPTION 'Sondaj închis'; END IF;
  IF p.conversation_id IS NOT NULL AND NOT public.is_conversation_member(p.conversation_id, uid) AND p.host_id <> uid THEN
    RAISE EXCEPTION 'Nu ai acces';
  END IF;

  INSERT INTO public.decision_votes (poll_id, user_id, option_id)
    VALUES (_poll_id, uid, _option_id)
    ON CONFLICT (poll_id, user_id) DO UPDATE SET option_id = EXCLUDED.option_id, created_at = now();

  RETURN jsonb_build_object('ok', true);
END $$;

GRANT EXECUTE ON FUNCTION public.cast_decision_vote(uuid, uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.get_decision_poll(_poll_id uuid)
RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  uid uuid := auth.uid();
  p record;
  opts jsonb;
  my_vote uuid;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'Trebuie să fii autentificat'; END IF;
  SELECT * INTO p FROM public.decision_polls WHERE id = _poll_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Sondaj inexistent'; END IF;
  IF p.conversation_id IS NOT NULL AND NOT public.is_conversation_member(p.conversation_id, uid) AND p.host_id <> uid THEN
    RAISE EXCEPTION 'Nu ai acces';
  END IF;

  SELECT COALESCE(jsonb_agg(row_to_json(o) ORDER BY o.votes DESC), '[]'::jsonb) INTO opts FROM (
    SELECT o.id, o.venue_id, o.label, o.source,
           v.name AS venue_name, v.lat, v.lng,
           (SELECT COUNT(*) FROM public.decision_votes dv WHERE dv.option_id = o.id)::int AS votes
    FROM public.decision_options o
    LEFT JOIN public.venues v ON v.id = o.venue_id
    WHERE o.poll_id = _poll_id
  ) o;

  SELECT option_id INTO my_vote FROM public.decision_votes WHERE poll_id = _poll_id AND user_id = uid;

  RETURN jsonb_build_object(
    'id', p.id,
    'host_id', p.host_id,
    'conversation_id', p.conversation_id,
    'title', p.title,
    'status', p.status,
    'expires_at', p.expires_at,
    'created_at', p.created_at,
    'my_vote', my_vote,
    'options', opts
  );
END $$;

GRANT EXECUTE ON FUNCTION public.get_decision_poll(uuid) TO authenticated;
