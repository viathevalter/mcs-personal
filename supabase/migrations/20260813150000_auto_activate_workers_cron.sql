-- =========================================================================
-- MIGRATION: AUTO-ACTIVATE WORKERS ON START DATE (DATA_INGRESSO) VIA PG_CRON
-- =========================================================================

BEGIN;

CREATE OR REPLACE FUNCTION core_personal.fn_auto_activate_due_workers()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_count integer := 0;
BEGIN
    UPDATE core_personal.workers
    SET status_trabajador = 'Ativo'
    WHERE (status_trabajador ILIKE '%Pendente%Ingresso%' OR status_trabajador ILIKE '%Pendiente%Ingresar%')
      AND data_ingresso IS NOT NULL
      AND data_ingresso <= CURRENT_DATE
      AND (data_baixa IS NULL OR data_baixa >= CURRENT_DATE);

    GET DIAGNOSTICS v_count = ROW_COUNT;
    RETURN v_count;
END;
$$;

COMMIT;

-- Schedule pg_cron job to run daily at 00:05 AM
SELECT cron.schedule(
    'auto-activate-workers-daily',
    '5 0 * * *',
    $$SELECT core_personal.fn_auto_activate_due_workers();$$
);
