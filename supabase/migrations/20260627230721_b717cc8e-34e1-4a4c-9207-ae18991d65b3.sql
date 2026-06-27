
CREATE OR REPLACE FUNCTION public.send_chat_gift(_conversation_id uuid, _gift_id text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  uid uuid := auth.uid();
  g record;
  sender_bal int;
  recipient_count int;
  new_msg_id uuid;
  share int;
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

  SELECT coin_balance INTO sender_bal FROM public.profiles WHERE id = uid FOR UPDATE;
  IF COALESCE(sender_bal,0) < g.price_coins THEN
    RAISE EXCEPTION 'Nu ai destui șprițuri (ai % / ai nevoie de %)', COALESCE(sender_bal,0), g.price_coins;
  END IF;

  UPDATE public.profiles SET coin_balance = coin_balance - g.price_coins WHERE id = uid;
  INSERT INTO public.coin_spends (user_id, amount, kind, ref_id)
    VALUES (uid, g.price_coins, 'chat_gift', g.id);

  SELECT count(*) INTO recipient_count
    FROM public.conversation_members
    WHERE conversation_id = _conversation_id AND user_id <> uid;

  IF recipient_count > 0 THEN
    share := g.price_coins; -- each recipient receives full amount
    UPDATE public.profiles
       SET coin_balance = coin_balance + share
     WHERE id IN (
       SELECT user_id FROM public.conversation_members
       WHERE conversation_id = _conversation_id AND user_id <> uid
     );

    -- notify each recipient
    INSERT INTO public.notifications (user_id, actor_id, type, data)
    SELECT cm.user_id, uid, 'chat_gift',
           jsonb_build_object(
             'conversation_id', _conversation_id,
             'gift_id', g.id,
             'emoji', g.emoji,
             'name', g.name,
             'coins', share
           )
    FROM public.conversation_members cm
    WHERE cm.conversation_id = _conversation_id AND cm.user_id <> uid;
  END IF;

  INSERT INTO public.messages (conversation_id, sender_id, body)
    VALUES (_conversation_id, uid, '🎁 ' || g.emoji || ' ' || g.name)
    RETURNING id INTO new_msg_id;

  INSERT INTO public.chat_gifts (conversation_id, sender_id, gift_id, message_id)
    VALUES (_conversation_id, uid, g.id, new_msg_id);

  RETURN jsonb_build_object('ok', true, 'message_id', new_msg_id, 'spent', g.price_coins, 'recipients', recipient_count);
END;
$function$;

-- Backfill missing memberships for DM conversations that have messages but only one member
INSERT INTO public.conversation_members (conversation_id, user_id)
SELECT DISTINCT m.conversation_id, m.sender_id
FROM public.messages m
WHERE NOT EXISTS (
  SELECT 1 FROM public.conversation_members cm
  WHERE cm.conversation_id = m.conversation_id AND cm.user_id = m.sender_id
)
ON CONFLICT DO NOTHING;
