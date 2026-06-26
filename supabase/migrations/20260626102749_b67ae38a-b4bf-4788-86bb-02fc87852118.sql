-- Remove the implicit public EXECUTE grant on all public SECURITY DEFINER functions.
-- The "public" pseudo-role includes anon, so this closes the remaining anonymous
-- execution path. Functions that authenticated users need remain callable via
-- the authenticated grant; internal/admin functions remain service_role only.
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
      AND has_function_privilege('public', p.oid, 'EXECUTE')
  LOOP
    EXECUTE format('REVOKE EXECUTE ON FUNCTION public.%I(%s) FROM public', r.proname, r.args);
  END LOOP;
END $$;
