
-- Generic anti-spam guard used by BEFORE INSERT triggers
CREATE OR REPLACE FUNCTION public.antispam_guard(
  _user_id UUID,
  _scope TEXT,
  _body TEXT,
  _dup_window_seconds INT,
  _flood_max INT,
  _flood_window_seconds INT
) RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _norm TEXT;
  _hash TEXT;
  _dup_count INT;
  _flood_count INT;
BEGIN
  IF _user_id IS NULL OR _body IS NULL THEN RETURN; END IF;

  -- Normalize: lowercase + collapse whitespace
  _norm := regexp_replace(lower(trim(_body)), '\s+', ' ', 'g');
  IF length(_norm) = 0 THEN RETURN; END IF;
  _hash := md5(_norm);

  -- Duplicate detection (same normalized text within dup window)
  SELECT count(*)
    INTO _dup_count
  FROM public.antispam_log
  WHERE user_id = _user_id
    AND scope = _scope
    AND body_hash = _hash
    AND created_at > now() - make_interval(secs => _dup_window_seconds);

  IF _dup_count > 0 THEN
    RAISE EXCEPTION 'duplicate_blocked: Ai trimis același mesaj recent. Așteaptă puțin.'
      USING ERRCODE = 'check_violation';
  END IF;

  -- Flood detection (too many of this scope within flood window)
  SELECT count(*)
    INTO _flood_count
  FROM public.antispam_log
  WHERE user_id = _user_id
    AND scope = _scope
    AND created_at > now() - make_interval(secs => _flood_window_seconds);

  IF _flood_count >= _flood_max THEN
    RAISE EXCEPTION 'flood_blocked: Trimiți prea repede. Pauză de % secunde.', _flood_window_seconds
      USING ERRCODE = 'check_violation';
  END IF;

  -- Record this attempt
  INSERT INTO public.antispam_log (user_id, scope, body_hash) VALUES (_user_id, _scope, _hash);

  -- Best-effort cleanup of old log rows for this user/scope
  DELETE FROM public.antispam_log
  WHERE user_id = _user_id AND scope = _scope AND created_at < now() - interval '1 hour';
END;
$$;

CREATE TABLE IF NOT EXISTS public.antispam_log (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL,
  scope TEXT NOT NULL,
  body_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.antispam_log TO authenticated;
GRANT ALL ON public.antispam_log TO service_role;

ALTER TABLE public.antispam_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users see own antispam log"
ON public.antispam_log FOR SELECT TO authenticated
USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS antispam_log_lookup_idx
  ON public.antispam_log (user_id, scope, created_at DESC);
CREATE INDEX IF NOT EXISTS antispam_log_hash_idx
  ON public.antispam_log (user_id, scope, body_hash, created_at DESC);

-- Trigger functions per table
CREATE OR REPLACE FUNCTION public.antispam_messages_trigger()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Skip if sender is service role context (NEW.sender_id null shouldn't happen)
  PERFORM public.antispam_guard(
    NEW.sender_id,
    'message:' || COALESCE(NEW.conversation_id::text, 'global'),
    NEW.body,
    30,   -- duplicate within 30s
    10,   -- max 10 messages
    30    -- per 30s
  );
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.antispam_photo_comments_trigger()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.antispam_guard(
    NEW.user_id,
    'comment:' || COALESCE(NEW.photo_id::text, 'global'),
    NEW.body,
    60,   -- duplicate within 60s (more strict for comments)
    8,    -- max 8 comments
    30    -- per 30s
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS antispam_messages_check ON public.messages;
CREATE TRIGGER antispam_messages_check
  BEFORE INSERT ON public.messages
  FOR EACH ROW EXECUTE FUNCTION public.antispam_messages_trigger();

DROP TRIGGER IF EXISTS antispam_photo_comments_check ON public.photo_comments;
CREATE TRIGGER antispam_photo_comments_check
  BEFORE INSERT ON public.photo_comments
  FOR EACH ROW EXECUTE FUNCTION public.antispam_photo_comments_trigger();
