
-- Restore broad authenticated read (contact info on a business listing is meant to be visible)
DROP POLICY IF EXISTS business_accounts_owner_read ON public.business_accounts;
DROP POLICY IF EXISTS business_accounts_admin_read ON public.business_accounts;
DROP VIEW IF EXISTS public.business_accounts_public;

CREATE POLICY business_accounts_auth_read ON public.business_accounts
  FOR SELECT TO authenticated USING (true);

-- Hide financial columns from generic authenticated reads via column-level privileges.
-- Owners/admins still see them via SECURITY DEFINER paths or owner-scoped queries done server-side.
REVOKE SELECT (wallet_balance_cents, monthly_credits_cents) ON public.business_accounts FROM authenticated, anon;

-- Expose a SECURITY DEFINER helper for owners to read their own wallet
CREATE OR REPLACE FUNCTION public.get_business_wallet(_business_id uuid)
RETURNS TABLE(wallet_balance_cents int, monthly_credits_cents int)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT wallet_balance_cents, monthly_credits_cents
  FROM public.business_accounts
  WHERE id = _business_id
    AND (owner_user_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role));
$$;
REVOKE EXECUTE ON FUNCTION public.get_business_wallet(uuid) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.get_business_wallet(uuid) TO authenticated;

-- Lock down internal SECURITY DEFINER helpers from anon (they're auth-only)
REVOKE EXECUTE ON FUNCTION public.are_friends(uuid, uuid) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.are_friends(uuid, uuid) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.can_view_profile(uuid, uuid) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.can_view_profile(uuid, uuid) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.is_blocked(uuid, uuid) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.is_blocked(uuid, uuid) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.is_conversation_member(uuid, uuid) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.is_conversation_member(uuid, uuid) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.spend_coins(int, text, text) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.spend_coins(int, text, text) TO authenticated;
