
ALTER TABLE public.notification_prefs
  ADD COLUMN IF NOT EXISTS heat_now boolean NOT NULL DEFAULT true;

CREATE TABLE IF NOT EXISTS public.heat_alerts_sent (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cell_id text NOT NULL,
  city_id uuid,
  heat_score int NOT NULL,
  alerted_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS heat_alerts_sent_cell_time_idx
  ON public.heat_alerts_sent (cell_id, alerted_at DESC);
CREATE INDEX IF NOT EXISTS heat_alerts_sent_city_time_idx
  ON public.heat_alerts_sent (city_id, alerted_at DESC);

GRANT SELECT ON public.heat_alerts_sent TO authenticated;
GRANT ALL ON public.heat_alerts_sent TO service_role;
ALTER TABLE public.heat_alerts_sent ENABLE ROW LEVEL SECURITY;
CREATE POLICY heat_alerts_sent_auth_read ON public.heat_alerts_sent
  FOR SELECT TO authenticated USING (true);

CREATE OR REPLACE FUNCTION public.find_new_hot_cells(
  _threshold int DEFAULT 75,
  _cooldown_minutes int DEFAULT 60
)
RETURNS TABLE(
  cell_id text, city_id uuid, lat numeric, lng numeric,
  heat_score int, recent_count int,
  top_venue_id uuid, top_venue_name text
)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  RETURN QUERY
  WITH hot AS (
    SELECT h.cell_id, h.lat, h.lng, h.heat_score, h.recent_count,
           h.top_venue_id, h.top_venue_name, v.city_id
    FROM public.get_heat_now() h
    LEFT JOIN public.venues v ON v.id = h.top_venue_id
    WHERE h.heat_score >= _threshold
  ),
  fresh AS (
    SELECT h.* FROM hot h
    WHERE NOT EXISTS (
      SELECT 1 FROM public.heat_alerts_sent a
      WHERE a.cell_id = h.cell_id
        AND a.alerted_at > now() - make_interval(mins => _cooldown_minutes)
    )
  ),
  ins AS (
    INSERT INTO public.heat_alerts_sent(cell_id, city_id, heat_score)
    SELECT f.cell_id, f.city_id, f.heat_score FROM fresh f
    RETURNING 1
  )
  SELECT f.cell_id, f.city_id, f.lat, f.lng, f.heat_score, f.recent_count,
         f.top_venue_id, f.top_venue_name
  FROM fresh f
  WHERE (SELECT count(*) FROM ins) >= 0;
END;
$$;

REVOKE ALL ON FUNCTION public.find_new_hot_cells(int, int) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.find_new_hot_cells(int, int) TO service_role;
