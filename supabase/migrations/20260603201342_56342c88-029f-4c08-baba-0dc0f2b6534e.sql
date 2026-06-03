
DROP VIEW IF EXISTS public.business_accounts_public;

DROP POLICY IF EXISTS business_accounts_auth_read ON public.business_accounts;
CREATE POLICY business_accounts_owner_read ON public.business_accounts
  FOR SELECT TO authenticated USING (auth.uid() = owner_user_id);
CREATE POLICY business_accounts_admin_read ON public.business_accounts
  FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'moderator'::app_role));

CREATE VIEW public.business_accounts_public
WITH (security_invoker = true) AS
SELECT id, brand_name, type, verified, tier, venue_id, city_id, address, lat, lng,
       cover_url, logo_url, description, slug, website, instagram_handle, tiktok_handle, created_at
FROM public.business_accounts;
GRANT SELECT ON public.business_accounts_public TO anon, authenticated;

DROP POLICY IF EXISTS party_joins_auth_read ON public.party_joins;
CREATE POLICY party_joins_self_or_host_read ON public.party_joins
  FOR SELECT TO authenticated
  USING (
    auth.uid() = user_id
    OR EXISTS (SELECT 1 FROM public.parties p WHERE p.id = party_joins.party_id AND p.host_id = auth.uid())
  );

DROP POLICY IF EXISTS sprit_proofs_auth_read ON public.sprit_proofs;
CREATE POLICY sprit_proofs_self_read ON public.sprit_proofs
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY sprit_proofs_admin_read ON public.sprit_proofs
  FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'moderator'::app_role));

DROP POLICY IF EXISTS user_frames_public_read_owned ON public.user_frames;

DROP POLICY IF EXISTS "Users update own files in user folders" ON storage.objects;
CREATE POLICY "Users update own files in user folders" ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = ANY(ARRAY['avatars','proofs','venue-photos'])
    AND (storage.foldername(name))[1] = auth.uid()::text
  )
  WITH CHECK (
    bucket_id = ANY(ARRAY['avatars','proofs','venue-photos'])
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO authenticated;
