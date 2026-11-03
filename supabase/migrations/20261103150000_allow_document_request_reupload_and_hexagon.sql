-- Allow workers to re-upload or update documents on valid (non-expired) document_requests
-- regardless of whether the request was previously submitted or verified.
DROP POLICY IF EXISTS "Permitir upload anonimo com token valido" ON storage.objects;
CREATE POLICY "Permitir upload anonimo com token valido"
ON storage.objects
FOR INSERT
TO anon
WITH CHECK (
    bucket_id = 'worker-incoming-docs'
    AND EXISTS (
        SELECT 1
        FROM core_personal.document_requests r
        WHERE r.token = ((storage.foldername(objects.name))[1])::uuid
          AND r.expires_at > now()
    )
);

DROP POLICY IF EXISTS "Permitir update anonimo com token valido" ON storage.objects;
CREATE POLICY "Permitir update anonimo com token valido"
ON storage.objects
FOR UPDATE
TO anon
USING (
    bucket_id = 'worker-incoming-docs'
    AND EXISTS (
        SELECT 1
        FROM core_personal.document_requests r
        WHERE r.token = ((storage.foldername(objects.name))[1])::uuid
          AND r.expires_at > now()
    )
);
