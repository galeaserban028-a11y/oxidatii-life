
-- business_battles: restrict to authenticated
DROP POLICY IF EXISTS "Battles public read" ON public.business_battles;
CREATE POLICY "Battles authenticated read" ON public.business_battles
  FOR SELECT TO authenticated USING (true);
REVOKE SELECT ON public.business_battles FROM anon;

-- business_reviews: scope to non-suspended businesses
DROP POLICY IF EXISTS "Reviews authenticated read" ON public.business_reviews;
CREATE POLICY "Reviews authenticated read" ON public.business_reviews
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.business_accounts ba
      WHERE ba.id = business_reviews.business_id
        AND (ba.suspended_until IS NULL OR ba.suspended_until < now())
    )
  );

-- campaign_likes: scope to own likes + campaign business owner
DROP POLICY IF EXISTS "Authenticated can view campaign likes" ON public.campaign_likes;
CREATE POLICY "View own or owned-campaign likes" ON public.campaign_likes
  FOR SELECT TO authenticated
  USING (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM public.campaigns c
      JOIN public.business_accounts ba ON ba.id = c.business_id
      WHERE c.id = campaign_likes.campaign_id
        AND ba.owner_user_id = auth.uid()
    )
  );

-- exclusive_partner_slots: restrict to authenticated
DROP POLICY IF EXISTS "ex_slots_public_read" ON public.exclusive_partner_slots;
CREATE POLICY "ex_slots_authenticated_read" ON public.exclusive_partner_slots
  FOR SELECT TO authenticated USING (true);
REVOKE SELECT ON public.exclusive_partner_slots FROM anon;
