
CREATE OR REPLACE FUNCTION public.admin_grant_coins(_user_id uuid, _amount int)
RETURNS int
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_bal int;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Trebuie să fii autentificat';
  END IF;
  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Necesită rol admin';
  END IF;
  IF _amount IS NULL OR _amount = 0 THEN
    RAISE EXCEPTION 'Sumă invalidă';
  END IF;

  UPDATE public.profiles
     SET coin_balance = GREATEST(0, COALESCE(coin_balance,0) + _amount)
   WHERE id = _user_id
   RETURNING coin_balance INTO new_bal;

  IF new_bal IS NULL THEN
    RAISE EXCEPTION 'User inexistent';
  END IF;

  INSERT INTO public.coin_spends (user_id, amount, kind, ref_id)
    VALUES (_user_id, _amount, CASE WHEN _amount > 0 THEN 'admin_grant' ELSE 'admin_deduct' END, auth.uid()::text);

  RETURN new_bal;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_grant_coins(uuid, int) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_grant_coins(uuid, int) TO authenticated;
