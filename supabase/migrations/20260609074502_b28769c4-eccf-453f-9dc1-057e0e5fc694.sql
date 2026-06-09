CREATE OR REPLACE FUNCTION public.increment_business_visit(_business_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF _business_id IS NULL THEN RETURN; END IF;
  UPDATE public.business_accounts
     SET total_visits = COALESCE(total_visits, 0) + 1
   WHERE id = _business_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.increment_business_visit(uuid) TO authenticated, anon;