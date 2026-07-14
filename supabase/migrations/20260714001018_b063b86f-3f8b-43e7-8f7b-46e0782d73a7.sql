-- Tighten exclusive_partner_slots: restrict raw SELECT to owner + admin.
DROP POLICY IF EXISTS "ex_slots_authenticated_read" ON public.exclusive_partner_slots;

CREATE POLICY "ex_slots_owner_read"
  ON public.exclusive_partner_slots
  FOR SELECT
  TO authenticated
  USING (
    business_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.business_accounts ba
      WHERE ba.id = public.exclusive_partner_slots.business_id
        AND ba.owner_user_id = auth.uid()
    )
  );

CREATE POLICY "ex_slots_admin_read"
  ON public.exclusive_partner_slots
  FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role));

-- Safe listing (no business_id, no claimed_at) for the "claim a slot" UI.
CREATE OR REPLACE FUNCTION public.list_exclusive_slots()
RETURNS TABLE (
  city_id uuid,
  slot_index smallint,
  is_taken boolean,
  locked_until timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    s.city_id,
    s.slot_index,
    (s.business_id IS NOT NULL AND (s.locked_until IS NULL OR s.locked_until > now())) AS is_taken,
    s.locked_until
  FROM public.exclusive_partner_slots s;
$$;

GRANT EXECUTE ON FUNCTION public.list_exclusive_slots() TO authenticated;

-- Tighten business_battles: restrict SELECT to owner + admin.
DROP POLICY IF EXISTS "Battles authenticated read" ON public.business_battles;

CREATE POLICY "battles_owner_read"
  ON public.business_battles
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.business_accounts ba
      WHERE ba.id = public.business_battles.business_id
        AND ba.owner_user_id = auth.uid()
    )
  );

CREATE POLICY "battles_admin_read"
  ON public.business_battles
  FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role));
