CREATE OR REPLACE FUNCTION core_personal.get_dashboard_metrics(
    p_empresa_id uuid,
    p_year int,
    p_month int
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_total_workers int;
    v_active_housing int;
    v_pending_entries int;
    v_aux_moradia_sum numeric(10, 2);
    v_top_workers jsonb;
    v_last_day date;
    v_first_day date;
    v_housing_type_id uuid;
BEGIN
    -- 1. Date boundaries
    v_first_day := make_date(p_year, p_month, 1);
    v_last_day := v_first_day + interval '1 month' - interval '1 day';

    -- 2. Total active workers
    SELECT COUNT(*) INTO v_total_workers
    FROM core_personal.workers
    WHERE empresa_id = p_empresa_id
      AND status = 'active';

    -- 3. Workers with active housing benefits this month
    SELECT COUNT(DISTINCT worker_id) INTO v_active_housing
    FROM core_personal.worker_benefit_housing
    WHERE empresa_id = p_empresa_id
      AND start_date <= v_last_day
      AND (end_date IS NULL OR end_date >= v_first_day);

    -- 4. Pending entries this month
    SELECT COUNT(*) INTO v_pending_entries
    FROM core_personal.worker_ledger_entries
    WHERE empresa_id = p_empresa_id
      AND competence_year = p_year
      AND competence_month = p_month
      AND status = 'pending';

    -- 5. Sum of AUX_MORADIA credits this month
    SELECT id INTO v_housing_type_id
    FROM core_personal.ledger_types
    WHERE empresa_id = p_empresa_id
      AND type_code = 'AUX_MORADIA'
      LIMIT 1;

    IF v_housing_type_id IS NOT NULL THEN
        SELECT COALESCE(SUM(amount), 0) INTO v_aux_moradia_sum
        FROM core_personal.worker_ledger_entries
        WHERE empresa_id = p_empresa_id
          AND competence_year = p_year
          AND competence_month = p_month
          AND ledger_type_id = v_housing_type_id;
    ELSE
        v_aux_moradia_sum := 0;
    END IF;

    -- 6. Top 10 workers by net ledger amount in month
    -- We'll return JSON array: [{ worker_name, net_amount }]
    WITH worker_totals AS (
        SELECT 
            w.id AS worker_id,
            w.nome AS worker_name,
            SUM(
                CASE WHEN lt.direction = 'credit' THEN e.amount
                     WHEN lt.direction = 'debit' THEN -e.amount
                     ELSE 0 END
            ) AS net_amount
        FROM core_personal.worker_ledger_entries e
        JOIN core_personal.workers w ON w.id = e.worker_id
        JOIN core_personal.ledger_types lt ON lt.id = e.ledger_type_id
        WHERE e.empresa_id = p_empresa_id
          AND e.competence_year = p_year
          AND e.competence_month = p_month
        GROUP BY w.id, w.nome
    )
    SELECT COALESCE(jsonb_agg(tw), '[]'::jsonb) INTO v_top_workers
    FROM (
        SELECT worker_name, net_amount
        FROM worker_totals
        ORDER BY net_amount DESC
        LIMIT 10
    ) tw;

    -- Return combined JSON payload
    RETURN jsonb_build_object(
        'total_workers', v_total_workers,
        'active_housing', v_active_housing,
        'pending_entries', v_pending_entries,
        'aux_moradia_sum', v_aux_moradia_sum,
        'top_workers', v_top_workers
    );
END;
$$;
