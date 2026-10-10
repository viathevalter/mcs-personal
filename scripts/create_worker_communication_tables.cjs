const { Client } = require('pg');

const devConnectionString = 'postgresql://postgres.pyahcgorkvwfwmlzspnv:Stkrt%40Dev2026@aws-1-eu-central-1.pooler.supabase.com:5432/postgres';
const prodConnectionString = 'postgresql://postgres.unbepkdzvsfvylnysrcq:Stkrt%402026%23%40%23@aws-1-eu-west-1.pooler.supabase.com:5432/postgres';

const ddl = `
-- 1. Tabela de Mensagens e Notificações Bidirecionais (Gestor <-> Trabalhador)
CREATE TABLE IF NOT EXISTS core_personal.worker_timesheet_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    empresa_id UUID,
    worker_id UUID NOT NULL,
    hour_record_id UUID,
    period_year INT NOT NULL,
    period_month INT NOT NULL,
    sender_type TEXT NOT NULL CHECK (sender_type IN ('gestor', 'trabalhador', 'sistema')),
    sender_name TEXT,
    message TEXT NOT NULL,
    read BOOLEAN NOT NULL DEFAULT false,
    read_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_worker_ts_msg_worker_period 
ON core_personal.worker_timesheet_messages(worker_id, period_year, period_month);

-- 2. Tabela de Modelos de Mensagens / Frases Prontas (Templates)
CREATE TABLE IF NOT EXISTS core_personal.worker_message_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    empresa_id UUID,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    category TEXT DEFAULT 'geral',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Inserir frases prontas padrão caso não existam
INSERT INTO core_personal.worker_message_templates (title, message, category)
SELECT 'Apontamento de Horas Pendente', 'Olá! Lembramos que o seu apontamento de horas deste mês ainda está pendente. Por favor, aceda ao Portal do Trabalhador e preencha seus dias de trabalho.', 'lembrete'
WHERE NOT EXISTS (SELECT 1 FROM core_personal.worker_message_templates WHERE title = 'Apontamento de Horas Pendente');

INSERT INTO core_personal.worker_message_templates (title, message, category)
SELECT 'Prazo de Fecho Próximo', 'Atenção: O prazo de envio das folhas de horas termina amanhã. Aceda ao Portal MCS e finalize o preenchimento hoje.', 'urgente'
WHERE NOT EXISTS (SELECT 1 FROM core_personal.worker_message_templates WHERE title = 'Prazo de Fecho Próximo');

INSERT INTO core_personal.worker_message_templates (title, message, category)
SELECT 'Conferência de Turno Noturno / Diurno', 'Por favor, confirme se o turno realizado no dia indicado foi diurno ou noturno para procedermos com a validação.', 'divergencia'
WHERE NOT EXISTS (SELECT 1 FROM core_personal.worker_message_templates WHERE title = 'Conferência de Turno Noturno / Diurno');

INSERT INTO core_personal.worker_message_templates (title, message, category)
SELECT 'Folha Aguardando Assinatura', 'O seu apontamento está pronto, mas aguarda a assinatura do encarregado para ser validado. Por favor, solicite a assinatura.', 'assinatura'
WHERE NOT EXISTS (SELECT 1 FROM core_personal.worker_message_templates WHERE title = 'Folha Aguardando Assinatura');

-- 3. Tabela de Push Subscriptions
CREATE TABLE IF NOT EXISTS core_personal.worker_push_subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    worker_id UUID NOT NULL,
    endpoint TEXT NOT NULL UNIQUE,
    p256dh TEXT NOT NULL,
    auth TEXT NOT NULL,
    user_agent TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_worker_push_worker 
ON core_personal.worker_push_subscriptions(worker_id);

-- 4. Habilitar RLS e Políticas
ALTER TABLE core_personal.worker_timesheet_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE core_personal.worker_message_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE core_personal.worker_push_subscriptions ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
    DROP POLICY IF EXISTS "Public access worker_timesheet_messages" ON core_personal.worker_timesheet_messages;
    CREATE POLICY "Public access worker_timesheet_messages" ON core_personal.worker_timesheet_messages FOR ALL USING (true) WITH CHECK (true);

    DROP POLICY IF EXISTS "Public access worker_message_templates" ON core_personal.worker_message_templates;
    CREATE POLICY "Public access worker_message_templates" ON core_personal.worker_message_templates FOR ALL USING (true) WITH CHECK (true);

    DROP POLICY IF EXISTS "Public access worker_push_subscriptions" ON core_personal.worker_push_subscriptions;
    CREATE POLICY "Public access worker_push_subscriptions" ON core_personal.worker_push_subscriptions FOR ALL USING (true) WITH CHECK (true);
EXCEPTION WHEN OTHERS THEN NULL; END $$;
`;

async function applyCommunicationTables() {
  for (const [env, connStr] of [['DEV', devConnectionString], ['PROD', prodConnectionString]]) {
    console.log(`Connecting to ${env}...`);
    const client = new Client({ connectionString: connStr });
    try {
      await client.connect();
      console.log(`Connected to ${env}. Applying DDL...`);
      await client.query(ddl);
      console.log(`Successfully created worker communication tables on ${env}!`);
    } catch (err) {
      console.error(`Error applying to ${env}:`, err);
    } finally {
      await client.end();
    }
  }
}

applyCommunicationTables();
