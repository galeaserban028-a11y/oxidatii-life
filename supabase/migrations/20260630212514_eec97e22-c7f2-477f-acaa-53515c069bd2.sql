CREATE OR REPLACE FUNCTION public.tip_creator(p_recipient_id uuid, p_amount integer, p_message text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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

  INSERT INTO public.notifications (user_id, actor_id, type, data)
  VALUES (
    p_recipient_id, v_sender, 'creator_tip',
    jsonb_build_object('amount', p_amount, 'tip_id', v_tip_id, 'message', NULLIF(trim(p_message), ''))
  );

  RETURN jsonb_build_object('ok', true, 'tip_id', v_tip_id, 'new_balance', v_balance - p_amount);
END;
$function$;