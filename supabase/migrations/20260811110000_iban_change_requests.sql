-- 1. Criar tabela de solicitações de troca de IBAN
CREATE TABLE IF NOT EXISTS core_personal.iban_change_requests (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    empresa_id uuid NOT NULL,
    worker_id uuid NOT NULL REFERENCES core_personal.workers(id) ON DELETE CASCADE,
    token uuid NOT NULL UNIQUE DEFAULT gen_random_uuid(),
    status text NOT NULL DEFAULT 'pendente_envio' CHECK (status IN ('pendente_envio', 'enviado', 'aprovado', 'rejeitado')),
    
    old_iban text,
    old_banco text,
    
    new_iban text,
    new_banco text,
    
    iban_photo_url text,      -- foto do comprovante/número do IBAN enviado pelo trabalhador
    comprovante_url text,     -- comprovante oficial de titularidade do banco
    
    termo_gerado_url text,    -- PDF do termo gerado
    termo_assinado_url text,  -- PDF do termo assinado
    
    rejection_reason text,
    expires_at timestamptz NOT NULL DEFAULT (now() + interval '72 hours'),
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE core_personal.iban_change_requests ENABLE ROW LEVEL SECURITY;

-- 2. Políticas RLS para a tabela iban_change_requests
-- Admin e RH (Autenticados)
CREATE POLICY "RH e Admin possuem controle total sobre iban_change_requests"
ON core_personal.iban_change_requests FOR ALL TO authenticated
USING (true)
WITH CHECK (true);

-- Anon (Trabalhador no fluxo de preenchimento de IBAN)
CREATE POLICY "Trabalhadores podem ler sua solicitacao de IBAN por token"
ON core_personal.iban_change_requests FOR SELECT TO anon
USING (expires_at > now());

CREATE POLICY "Trabalhadores podem atualizar sua solicitacao de IBAN por token"
ON core_personal.iban_change_requests FOR UPDATE TO anon
USING (expires_at > now())
WITH CHECK (expires_at > now());


-- 3. Políticas RLS para o Storage bucket 'worker-incoming-docs' vinculadas a iban_change_requests
CREATE POLICY "Trabalhadores podem enviar arquivos de IBAN no padrao da pasta token"
ON storage.objects FOR INSERT TO anon
WITH CHECK (
    bucket_id = 'worker-incoming-docs' AND
    (EXISTS (
        SELECT 1 FROM core_personal.iban_change_requests r
        WHERE r.token::text = (storage.foldername(name))[1]
        AND r.expires_at > now()
        AND r.status = 'pendente_envio'
    ))
);

CREATE POLICY "Trabalhadores podem ler arquivos de IBAN correspondentes a sua pasta token"
ON storage.objects FOR SELECT TO anon
USING (
    bucket_id = 'worker-incoming-docs' AND
    (EXISTS (
        SELECT 1 FROM core_personal.iban_change_requests r
        WHERE r.token::text = (storage.foldername(name))[1]
        AND r.expires_at > now()
    ))
);
