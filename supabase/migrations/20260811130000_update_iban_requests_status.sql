-- Atualizar a restrição de status na tabela de solicitações de troca de IBAN
ALTER TABLE core_personal.iban_change_requests 
DROP CONSTRAINT IF EXISTS iban_change_requests_status_check;

ALTER TABLE core_personal.iban_change_requests 
ADD CONSTRAINT iban_change_requests_status_check 
CHECK (status IN ('pendente_envio', 'enviado', 'aguardando_assinatura', 'assinado', 'aprovado', 'rejeitado'));
