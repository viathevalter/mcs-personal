-- Migration: 20260608170000_add_document_language_to_estimaciones.sql
-- Description: Adiciona coluna de idioma do documento para as estimativas

ALTER TABLE core_comercial.estimaciones 
ADD COLUMN IF NOT EXISTS document_language VARCHAR(10) DEFAULT 'pt' 
CHECK (document_language IN ('pt', 'es', 'en', 'it', 'fr'));
