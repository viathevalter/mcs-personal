-- 1. Criar tabela de solicitações de documentos
CREATE TABLE IF NOT EXISTS core_personal.document_requests (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    empresa_id uuid NOT NULL,
    worker_id uuid NOT NULL REFERENCES core_personal.workers(id) ON DELETE CASCADE,
    token uuid NOT NULL UNIQUE DEFAULT gen_random_uuid(),
    status text NOT NULL DEFAULT 'pending_upload' CHECK (status IN ('pending_upload', 'submitted', 'verified', 'rejected')),
    
    -- Caminhos no storage
    passport_url text,
    nif_url text,
    niss_url text,
    license_url text,
    selfie_url text,
    
    -- Dados brutos retornados pelo OCR da IA
    extracted_data jsonb DEFAULT '{}'::jsonb,
    
    expires_at timestamptz NOT NULL DEFAULT (now() + interval '48 hours'),
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE core_personal.document_requests ENABLE ROW LEVEL SECURITY;

-- 2. Políticas RLS para a tabela document_requests
-- Admin e RH (Autenticados)
CREATE POLICY "RH e Admin possuem controle total sobre document_requests"
ON core_personal.document_requests FOR ALL TO authenticated
USING (true)
WITH CHECK (true);

-- Anon (Trabalhador no fluxo de preenchimento)
CREATE POLICY "Trabalhadores podem ler sua solicitação por token"
ON core_personal.document_requests FOR SELECT TO anon
USING (expires_at > now());

CREATE POLICY "Trabalhadores podem atualizar sua solicitação por token"
ON core_personal.document_requests FOR UPDATE TO anon
USING (expires_at > now())
WITH CHECK (expires_at > now());


-- 3. Criar Bucket de Armazenamento para os Documentos Recebidos
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'worker-incoming-docs', 
    'worker-incoming-docs', 
    false, 
    15728640, -- Limite de 15MB
    ARRAY['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
)
ON CONFLICT (id) DO NOTHING;

-- 4. Políticas RLS para o Storage bucket 'worker-incoming-docs'
-- Permissões totais para autenticados (RH/Admin)
CREATE POLICY "RH e Admin possuem acesso total ao bucket worker-incoming-docs"
ON storage.objects FOR ALL TO authenticated
USING (bucket_id = 'worker-incoming-docs')
WITH CHECK (bucket_id = 'worker-incoming-docs');

-- Permissões seguras para o trabalhador (anon) via token de acesso
CREATE POLICY "Trabalhadores podem enviar arquivos no padrão da pasta token"
ON storage.objects FOR INSERT TO anon
WITH CHECK (
    bucket_id = 'worker-incoming-docs' AND
    (EXISTS (
        SELECT 1 FROM core_personal.document_requests r
        WHERE r.token::text = (storage.foldername(name))[1]
        AND r.expires_at > now()
        AND r.status = 'pending_upload'
    ))
);

CREATE POLICY "Trabalhadores podem ler arquivos correspondentes à sua pasta token"
ON storage.objects FOR SELECT TO anon
USING (
    bucket_id = 'worker-incoming-docs' AND
    (EXISTS (
        SELECT 1 FROM core_personal.document_requests r
        WHERE r.token::text = (storage.foldername(name))[1]
        AND r.expires_at > now()
    ))
);
