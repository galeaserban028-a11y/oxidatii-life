
-- Rate limiting infrastructure
CREATE TABLE IF NOT EXISTS public.rate_limits (
  user_id UUID NOT NULL,
  action TEXT NOT NULL,
  window_start TIMESTAMPTZ NOT NULL,
  count INT NOT NULL DEFAULT 0,
  PRIMARY KEY (user_id, action, window_start)
);

GRANT SELECT ON public.rate_limits TO authenticated;
GRANT ALL ON public.rate_limits TO service_role;

ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users read own rate limits"
ON public.rate_limits FOR SELECT TO authenticated
USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS rate_limits_cleanup_idx ON public.rate_limits (window_start);

-- Atomic check + increment. Returns true if allowed, false if over limit.
CREATE OR REPLACE FUNCTION public.check_rate_limit(
  _action TEXT,
  _max_per_window INT,
  _window_seconds INT DEFAULT 60
) RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid UUID := auth.uid();
  _bucket TIMESTAMPTZ;
  _current INT;
BEGIN
  IF _uid IS NULL THEN
    RETURN FALSE;
  END IF;

  _bucket := date_trunc('second', now()) - (EXTRACT(EPOCH FROM now())::INT % _window_seconds) * INTERVAL '1 second';

  INSERT INTO public.rate_limits (user_id, action, window_start, count)
  VALUES (_uid, _action, _bucket, 1)
  ON CONFLICT (user_id, action, window_start)
  DO UPDATE SET count = public.rate_limits.count + 1
  RETURNING count INTO _current;

  -- best-effort cleanup of old rows for this user/action
  DELETE FROM public.rate_limits
  WHERE user_id = _uid AND action = _action AND window_start < (now() - INTERVAL '1 hour');

  RETURN _current <= _max_per_window;
END;
$$;

GRANT EXECUTE ON FUNCTION public.check_rate_limit(TEXT, INT, INT) TO authenticated;
