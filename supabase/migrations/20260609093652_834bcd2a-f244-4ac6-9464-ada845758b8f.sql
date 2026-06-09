
CREATE OR REPLACE FUNCTION public.send_chat_gift(_conversation_id uuid, _gift_id text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
  g record;
  sender_bal int;
  recipient_count int;
  new_msg_id uuid;
BEGIN
  IF uid IS NULL THEN
    RAISE EXCEPTION 'Trebuie să fii autentificat';
  END IF;

  IF NOT public.is_conversation_member(_conversation_id, uid) THEN
    RAISE EXCEPTION 'Nu ești în conversație';
  END IF;

  SELECT id, emoji, name, price_coins INTO g
    FROM public.chat_gift_catalog WHERE id = _gift_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Cadou inexistent';
  END IF;

  -- debit sender
  SELECT coin_balance INTO sender_bal FROM public.profiles WHERE id = uid FOR UPDATE;
  IF COALESCE(sender_bal,0) < g.price_coins THEN
    RAISE EXCEPTION 'Nu ai destui șprițuri (ai % / ai nevoie de %)', COALESCE(sender_bal,0), g.price_coins;
  END IF;

  UPDATE public.profiles SET coin_balance = coin_balance - g.price_coins WHERE id = uid;
  INSERT INTO public.coin_spends (user_id, amount, kind, ref_id)
    VALUES (uid, g.price_coins, 'chat_gift', g.id);

  -- credit recipients (every other member)
  SELECT count(*) INTO recipient_count
    FROM public.conversation_members
    WHERE conversation_id = _conversation_id AND user_id <> uid;

  IF recipient_count > 0 THEN
    UPDATE public.profiles
       SET coin_balance = coin_balance + g.price_coins
     WHERE id IN (
       SELECT user_id FROM public.conversation_members
       WHERE conversation_id = _conversation_id AND user_id <> uid
     );
  END IF;

  -- post the gift message (parsed client-side via 🎁 prefix)
  INSERT INTO public.messages (conversation_id, sender_id, body)
    VALUES (_conversation_id, uid, '🎁 ' || g.emoji || ' ' || g.name)
    RETURNING id INTO new_msg_id;

  INSERT INTO public.chat_gifts (conversation_id, sender_id, gift_id, message_id)
    VALUES (_conversation_id, uid, g.id, new_msg_id);

  RETURN jsonb_build_object('ok', true, 'message_id', new_msg_id, 'spent', g.price_coins, 'recipients', recipient_count);
END;
$$;

GRANT EXECUTE ON FUNCTION public.send_chat_gift(uuid, text) TO authenticated;
