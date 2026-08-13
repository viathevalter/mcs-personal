-- Fix Storage RLS policy for worker-incoming-docs bucket so anonymous workers can upload signed terms when status is 'aguardando_assinatura' or 'enviado'

DROP POLICY IF EXISTS "Trabalhadores podem enviar arquivos de IBAN no padrao da pasta " ON storage.objects;
DROP POLICY IF EXISTS "Trabalhadores podem enviar arquivos de IBAN no padrao da pasta token" ON storage.objects;
DROP POLICY IF EXISTS "Trabalhadores podem atualizar arquivos de IBAN no padrao da pasta token" ON storage.objects;

CREATE POLICY "Trabalhadores podem enviar arquivos de IBAN no padrao da pasta token"
ON storage.objects
FOR INSERT
TO anon
WITH CHECK (
  bucket_id = 'worker-incoming-docs' AND
  EXISTS (
    SELECT 1 FROM core_personal.iban_change_requests r
    WHERE r.token::text = (storage.foldername(objects.name))[1]
      AND r.expires_at > now()
      AND r.status IN ('pendente_envio', 'enviado', 'aguardando_assinatura')
  )
);

CREATE POLICY "Trabalhadores podem atualizar arquivos de IBAN no padrao da pasta token"
ON storage.objects
FOR UPDATE
TO anon
USING (
  bucket_id = 'worker-incoming-docs' AND
  EXISTS (
    SELECT 1 FROM core_personal.iban_change_requests r
    WHERE r.token::text = (storage.foldername(objects.name))[1]
      AND r.expires_at > now()
  )
);
