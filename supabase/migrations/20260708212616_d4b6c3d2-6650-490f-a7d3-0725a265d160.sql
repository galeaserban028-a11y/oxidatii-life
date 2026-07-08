-- Rebuild storage_public_read WITHOUT the 'proofs' bucket.
DROP POLICY IF EXISTS "storage_public_read" ON storage.objects;
CREATE POLICY "storage_public_read"
  ON storage.objects FOR SELECT
  USING (bucket_id IN ('avatars','venue-photos'));

-- Owner-only read for any legacy objects still sitting in 'proofs'.
DROP POLICY IF EXISTS "proofs_owner_read" ON storage.objects;
CREATE POLICY "proofs_owner_read"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'proofs'
    AND auth.uid() IS NOT NULL
    AND (storage.foldername(name))[1] = auth.uid()::text
  );