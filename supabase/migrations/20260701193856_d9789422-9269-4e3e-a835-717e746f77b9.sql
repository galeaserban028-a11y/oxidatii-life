
CREATE OR REPLACE FUNCTION public.track_campaign_event(_campaign_id uuid, _event_type text)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _bid int;
BEGIN
  IF _event_type NOT IN ('impression','click','view','conversion') THEN
    RAISE EXCEPTION 'invalid_event_type';
  END IF;

  SELECT COALESCE(bid_cents,0) INTO _bid FROM public.campaigns WHERE id = _campaign_id;
  IF _bid IS NULL THEN RETURN; END IF;

  INSERT INTO public.campaign_events (campaign_id, user_id, event_type, cost_cents)
    VALUES (_campaign_id, auth.uid(),
            _event_type,
            CASE WHEN _event_type = 'impression' THEN _bid ELSE 0 END);

  IF _event_type = 'impression' THEN
    UPDATE public.campaigns
       SET impressions = COALESCE(impressions,0) + 1,
           spent_cents = COALESCE(spent_cents,0) + _bid
     WHERE id = _campaign_id;
  ELSIF _event_type = 'click' THEN
    UPDATE public.campaigns SET clicks = COALESCE(clicks,0) + 1 WHERE id = _campaign_id;
  END IF;
END;
$$;
GRANT EXECUTE ON FUNCTION public.track_campaign_event(uuid, text) TO authenticated;
