-- Adiciona coluna options para salvar opções de perguntas de múltipla escolha
ALTER TABLE "core_comercial"."job_function_questions" 
ADD COLUMN IF NOT EXISTS "options" TEXT[] DEFAULT NULL;
