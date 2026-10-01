-- Migration: Add criador_email and criador_nome to ordens_pagamento with auto-trigger
ALTER TABLE core_finance.ordens_pagamento ADD COLUMN IF NOT EXISTS criador_email text;
ALTER TABLE core_finance.ordens_pagamento ADD COLUMN IF NOT EXISTS criador_nome text;

UPDATE core_finance.ordens_pagamento op
SET criador_email = u.email
FROM auth.users u
WHERE op.criador_id = u.id AND (op.criador_email IS NULL OR op.criador_email = '');

UPDATE core_finance.ordens_pagamento op
SET criador_email = m.criado_por
FROM core_finance.movimentos_pagos m
WHERE m.ordem_pagamento_id = op.id 
  AND (op.criador_email IS NULL OR op.criador_email = '')
  AND m.criado_por IS NOT NULL;

CREATE OR REPLACE FUNCTION core_finance.fn_set_ordem_pagamento_criador_email()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.criador_email IS NULL OR NEW.criador_email = '' THEN
        SELECT email INTO NEW.criador_email FROM auth.users WHERE id = NEW.criador_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_set_ordem_pagamento_criador_email ON core_finance.ordens_pagamento;
CREATE TRIGGER trg_set_ordem_pagamento_criador_email
BEFORE INSERT OR UPDATE ON core_finance.ordens_pagamento
FOR EACH ROW EXECUTE FUNCTION core_finance.fn_set_ordem_pagamento_criador_email();
