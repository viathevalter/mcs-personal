-- Permite atualizar o e-mail genérico (info@/administracion@) para o e-mail real do decisor no Cockpit
-- sem bloqueio cruzado entre empresas diferentes (Génio, Luminous, Triángulo, Wiseowe) ou filiais do mesmo grupo.
DROP INDEX IF EXISTS core_comercial.uq_leads_email_lower;

CREATE INDEX IF NOT EXISTS idx_leads_email_lower
  ON core_comercial.leads (lower(TRIM(BOTH FROM email)))
  WHERE email IS NOT NULL AND email <> '';
