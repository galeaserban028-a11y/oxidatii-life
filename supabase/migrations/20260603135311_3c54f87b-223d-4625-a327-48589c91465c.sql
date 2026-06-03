
-- Add approval status to party joins
ALTER TABLE public.party_joins
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'pending';

ALTER TABLE public.party_joins
  DROP CONSTRAINT IF EXISTS party_joins_status_check;
ALTER TABLE public.party_joins
  ADD CONSTRAINT party_joins_status_check CHECK (status IN ('pending','accepted'));

-- Auto-accept join if the host is joining their own party (legacy/host self)
-- Existing rows: mark as accepted to keep current parties working
UPDATE public.party_joins SET status = 'accepted' WHERE status = 'pending';

-- Allow host to update status of joins on their parties
DROP POLICY IF EXISTS party_joins_host_update ON public.party_joins;
CREATE POLICY party_joins_host_update
ON public.party_joins
FOR UPDATE
TO authenticated
USING (EXISTS (SELECT 1 FROM public.parties p WHERE p.id = party_joins.party_id AND p.host_id = auth.uid()))
WITH CHECK (EXISTS (SELECT 1 FROM public.parties p WHERE p.id = party_joins.party_id AND p.host_id = auth.uid()));

-- Allow host to remove joiners from their parties
DROP POLICY IF EXISTS party_joins_host_delete ON public.party_joins;
CREATE POLICY party_joins_host_delete
ON public.party_joins
FOR DELETE
TO authenticated
USING (EXISTS (SELECT 1 FROM public.parties p WHERE p.id = party_joins.party_id AND p.host_id = auth.uid()));
