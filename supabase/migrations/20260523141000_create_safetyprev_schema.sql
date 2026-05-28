-- ========================================================================================
-- Migration: 20260523141000_create_safetyprev_schema.sql
-- Description: Criação das tabelas da SafetyPrevi dentro do schema core_personal para exposição na API
-- ========================================================================================

-- Limpar schema anterior caso exista para não deixar lixo no banco
DROP SCHEMA IF EXISTS safety_prev CASCADE;

-- Limpar tabelas anteriores no core_personal se existirem para recriação limpa
DROP TABLE IF EXISTS core_personal.safety_certificates CASCADE;
DROP TABLE IF EXISTS core_personal.safety_templates CASCADE;
DROP TABLE IF EXISTS core_personal.safety_instructors CASCADE;
DROP TABLE IF EXISTS core_personal.safety_courses CASCADE;

-- 1. Criar tabela de cursos
CREATE TABLE core_personal.safety_courses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    duration_hours INTEGER NOT NULL,
    syllabus TEXT,
    price NUMERIC(10, 2),
    revolut_link TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Criar tabela de instrutores
CREATE TABLE core_personal.safety_instructors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    signature_url TEXT, -- caminho no Storage (bucket: safetyprev-assets)
    credentials TEXT, -- ex: 'Técnico Superior de Segurança no Trabalho - CAP nº XXX'
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Criar tabela de templates de DOCX
CREATE TABLE core_personal.safety_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    docx_storage_path TEXT NOT NULL, -- caminho no Storage (bucket: safetyprev-templates)
    is_default BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Criar tabela de certificados
CREATE TABLE core_personal.safety_certificates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    worker_id UUID NOT NULL REFERENCES core_personal.workers(id) ON DELETE CASCADE,
    course_id UUID NOT NULL REFERENCES core_personal.safety_courses(id) ON DELETE CASCADE,
    instructor_id UUID NOT NULL REFERENCES core_personal.safety_instructors(id) ON DELETE CASCADE,
    template_id UUID NOT NULL REFERENCES core_personal.safety_templates(id) ON DELETE CASCADE,
    
    issue_date DATE NOT NULL DEFAULT CURRENT_DATE,
    expiry_date DATE, -- validade opcional
    certificate_code VARCHAR(100) UNIQUE NOT NULL, -- ex: 'SP-2026-0001'
    
    docx_url TEXT, -- link no Storage (bucket: safetyprev-certificates)
    pdf_url TEXT, -- link no Storage
    status VARCHAR(50) NOT NULL DEFAULT 'active', -- 'active', 'expired', 'revoked'
    
    verification_token UUID UNIQUE DEFAULT gen_random_uuid(), -- Token para link/QR Code
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID
);

-- Criar indexadores para melhoria de busca
CREATE INDEX idx_safety_certs_worker ON core_personal.safety_certificates(worker_id);
CREATE INDEX idx_safety_certs_course ON core_personal.safety_certificates(course_id);
CREATE INDEX idx_safety_certs_verification_token ON core_personal.safety_certificates(verification_token);
CREATE INDEX idx_safety_certs_code ON core_personal.safety_certificates(certificate_code);

-- 5. Habilitar RLS nas tabelas
ALTER TABLE core_personal.safety_courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE core_personal.safety_instructors ENABLE ROW LEVEL SECURITY;
ALTER TABLE core_personal.safety_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE core_personal.safety_certificates ENABLE ROW LEVEL SECURITY;

-- 6. Políticas de RLS simplificadas no schema core_personal
-- Cursos: Leitura pública, escrita para autenticados
CREATE POLICY "Permitir leitura pública de safety_courses"
ON core_personal.safety_courses FOR SELECT TO anon, authenticated USING (is_active = true);

CREATE POLICY "Permitir gravação de safety_courses para autenticados"
ON core_personal.safety_courses FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Instrutores: Leitura pública, escrita para autenticados
CREATE POLICY "Permitir leitura pública de safety_instructors"
ON core_personal.safety_instructors FOR SELECT TO anon, authenticated USING (is_active = true);

CREATE POLICY "Permitir gravação de safety_instructors para autenticados"
ON core_personal.safety_instructors FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Templates: Leitura e escrita para autenticados
CREATE POLICY "Permitir leitura de safety_templates para autenticados"
ON core_personal.safety_templates FOR SELECT TO authenticated USING (true);

CREATE POLICY "Permitir gravação de safety_templates para autenticados"
ON core_personal.safety_templates FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Certificados: Leitura pública por token, escrita para autenticados
CREATE POLICY "Permitir leitura pública de safety_certificates via token"
ON core_personal.safety_certificates FOR SELECT TO anon, authenticated USING (verification_token IS NOT NULL);

CREATE POLICY "Permitir membros visualizarem safety_certificates"
ON core_personal.safety_certificates FOR SELECT TO authenticated USING (true);

CREATE POLICY "Permitir gravação de safety_certificates para autenticados"
ON core_personal.safety_certificates FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 7. Garantir privilégios
GRANT ALL PRIVILEGES ON core_personal.safety_courses TO postgres, service_role, authenticated, anon;
GRANT ALL PRIVILEGES ON core_personal.safety_instructors TO postgres, service_role, authenticated, anon;
GRANT ALL PRIVILEGES ON core_personal.safety_templates TO postgres, service_role, authenticated, anon;
GRANT ALL PRIVILEGES ON core_personal.safety_certificates TO postgres, service_role, authenticated, anon;
