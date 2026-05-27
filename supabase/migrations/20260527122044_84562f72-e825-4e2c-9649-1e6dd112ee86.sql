
-- Set immutable search_path on functions
ALTER FUNCTION public.validate_handle() SET search_path = public;
ALTER FUNCTION public.handle_new_user() SET search_path = public;

-- Restrict execution of internal trigger function
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;

-- Replace permissive venue insert policy with one that requires authenticated user
DROP POLICY IF EXISTS "venues_auth_insert" ON public.venues;
CREATE POLICY "venues_auth_insert" ON public.venues
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);
