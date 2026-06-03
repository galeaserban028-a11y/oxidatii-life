CREATE POLICY "chat-media members read" ON storage.objects FOR SELECT TO authenticated USING (
  bucket_id = 'chat-media'
  AND public.is_conversation_member(((string_to_array(name, '/'))[2])::uuid, auth.uid())
);

CREATE POLICY "chat-media own upload" ON storage.objects FOR INSERT TO authenticated WITH CHECK (
  bucket_id = 'chat-media'
  AND (string_to_array(name, '/'))[1] = auth.uid()::text
  AND public.is_conversation_member(((string_to_array(name, '/'))[2])::uuid, auth.uid())
);

CREATE POLICY "chat-media own delete" ON storage.objects FOR DELETE TO authenticated USING (
  bucket_id = 'chat-media' AND (string_to_array(name, '/'))[1] = auth.uid()::text
);