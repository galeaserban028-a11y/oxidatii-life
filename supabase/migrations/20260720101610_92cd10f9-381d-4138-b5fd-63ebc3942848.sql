
CREATE OR REPLACE FUNCTION public.realtime_can_access_topic(_topic text)
 RETURNS boolean
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  uid uuid := auth.uid();
  parts text[];
  prefix text;
  suffix text;
BEGIN
  IF uid IS NULL THEN RETURN false; END IF;
  IF _topic IS NULL OR length(_topic) = 0 THEN RETURN false; END IF;

  parts := regexp_split_to_array(_topic, ':');
  prefix := parts[1];
  suffix := CASE WHEN array_length(parts, 1) >= 2 THEN parts[2] ELSE NULL END;

  IF prefix IN ('presence', 'public') THEN
    RETURN true;
  END IF;

  IF prefix = 'conv' AND suffix IS NOT NULL THEN
    RETURN public.is_conversation_member(suffix::uuid, uid);
  END IF;

  IF prefix IN ('notif', 'user') AND suffix IS NOT NULL THEN
    RETURN suffix::uuid = uid;
  END IF;

  IF prefix = 'party' AND suffix IS NOT NULL THEN
    RETURN EXISTS (
      SELECT 1 FROM public.parties p
      WHERE p.id = suffix::uuid AND p.host_id = uid
    ) OR EXISTS (
      SELECT 1 FROM public.party_joins pj
      WHERE pj.party_id = suffix::uuid AND pj.user_id = uid AND pj.status = 'accepted'
    );
  END IF;

  IF prefix = 'poll' AND suffix IS NOT NULL THEN
    RETURN EXISTS (
      SELECT 1 FROM public.decision_polls dp
      WHERE dp.id = suffix::uuid
        AND (dp.host_id = uid
             OR (dp.conversation_id IS NOT NULL
                 AND public.is_conversation_member(dp.conversation_id, uid)))
    );
  END IF;

  -- User-scoped postgres_changes streams: topic embeds the owning user id as
  -- the first colon-segment after the prefix. Only that user may subscribe.
  IF prefix IN ('inbox-stream', 'live-presence', 'notifications', 'notif-count', 'bottombar-inbox')
     AND suffix IS NOT NULL THEN
    BEGIN
      RETURN suffix::uuid = uid;
    EXCEPTION WHEN others THEN
      RETURN false;
    END;
  END IF;

  -- chat-<convId>:<userId>:... — must be a member of the conversation AND own the stream
  IF _topic LIKE 'chat-%' THEN
    DECLARE
      conv_id uuid;
      owner_id uuid;
    BEGIN
      conv_id := substring(prefix from 6)::uuid; -- strip 'chat-'
      owner_id := suffix::uuid;
      RETURN owner_id = uid AND public.is_conversation_member(conv_id, uid);
    EXCEPTION WHEN others THEN
      RETURN false;
    END;
  END IF;

  -- mr-<messageId> — message reactions stream; require membership in the message's conversation.
  IF _topic LIKE 'mr-%' THEN
    BEGIN
      RETURN EXISTS (
        SELECT 1 FROM public.messages m
        WHERE m.id = substring(_topic from 4)::uuid
          AND public.is_conversation_member(m.conversation_id, uid)
      );
    EXCEPTION WHEN others THEN
      RETURN false;
    END;
  END IF;

  -- Venue night chat / parties feed: authenticated postgres_changes streams whose
  -- payloads are filtered per-row by table RLS. Any signed-in user may subscribe.
  IF prefix IN ('vnc', 'parties-feed') THEN
    RETURN true;
  END IF;

  -- Deny by default for any unrecognized topic.
  RETURN false;
EXCEPTION WHEN others THEN
  RETURN false;
END;
$function$;
