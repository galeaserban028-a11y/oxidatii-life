-- Harden SECURITY DEFINER functions for production launch
-- 1. Remove anon EXECUTE from every public SECURITY DEFINER function.
--    The app has no anonymous sign-ups, so no public route should invoke these directly.
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT p.proname,
           pg_get_function_identity_arguments(p.oid) AS args
    FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE p.prosecdef = true
      AND n.nspname = 'public'
      AND has_function_privilege('anon', p.oid, 'EXECUTE')
  LOOP
    EXECUTE format('REVOKE EXECUTE ON FUNCTION public.%I(%s) FROM anon', r.proname, r.args);
  END LOOP;
END $$;

-- 2. Restrict admin-only functions to service_role (they were exposed to authenticated).
REVOKE EXECUTE ON FUNCTION public.admin_business_wallet_total() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.admin_grant_coins(uuid, integer) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.admin_list_businesses() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.admin_list_users() FROM authenticated;

-- 3. Restrict trigger functions to service_role / postgres only.
--    These are invoked by triggers, never by the authenticated client directly.
REVOKE EXECUTE ON FUNCTION public.antispam_messages_trigger() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.antispam_photo_comments_trigger() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.award_post_coins() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.bump_business_live_energy() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.bump_conversation_on_message() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.bump_streak_on_checkin() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.cleanup_on_block() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.notify_on_follow_delete() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.notify_on_follow_insert() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.notify_on_follow_update() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.set_follow_status_on_insert() FROM authenticated;