-- Add unique constraint to prevent duplicate auto-generated entries
ALTER TABLE core_personal.worker_ledger_entries 
  ADD CONSTRAINT ux_ledger_auto_ref 
  UNIQUE NULLS NOT DISTINCT (worker_id, competence_year, competence_month, ledger_type_id, reference_type, reference_id);

CREATE OR REPLACE FUNCTION core_personal.generate_housing_ledger(
    p_empresa_id uuid,
    p_year int,
    p_month int
)
RETURNS int
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_housing_type_id uuid;
    v_inserted_count int := 0;
    v_first_day date;
    v_last_day date;
    v_days_in_month numeric;
    
    r_benefit RECORD;
    v_overlap_start date;
    v_overlap_end date;
    v_eligible_days int;
    v_calculated_amount numeric(10, 2);
BEGIN
    -- 1. Find the AUX_MORADIA ledger type for this empresa
    SELECT id INTO v_housing_type_id
    FROM core_personal.ledger_types
    WHERE empresa_id = p_empresa_id
      AND type_code = 'AUX_MORADIA'
      AND is_active = true
    LIMIT 1;

    IF v_housing_type_id IS NULL THEN
        RAISE EXCEPTION 'Ledger type AUX_MORADIA not found or inactive for empresa %', p_empresa_id;
    END IF;

    -- 2. Define month boundaries
    v_first_day := make_date(p_year, p_month, 1);
    v_last_day := v_first_day + interval '1 month' - interval '1 day';
    v_days_in_month := extract(day from v_last_day);

    -- 3. Loop over all active housing benefits for this month
    FOR r_benefit IN 
        SELECT 
            b.id AS benefit_id,
            b.worker_id,
            b.monthly_amount,
            b.start_date,
            b.end_date,
            COALESCE(b.proration_method, 'daily_actual') AS current_proration
        FROM core_personal.worker_benefit_housing b
        JOIN core_personal.workers w ON w.id = b.worker_id
        WHERE b.empresa_id = p_empresa_id
          AND w.status = 'active'
          AND b.start_date <= v_last_day
          AND (b.end_date IS NULL OR b.end_date >= v_first_day)
    LOOP
        -- Calculate overlap
        IF r_benefit.start_date > v_first_day THEN
            v_overlap_start := r_benefit.start_date;
        ELSE
            v_overlap_start := v_first_day;
        END IF;

        IF r_benefit.end_date IS NOT NULL AND r_benefit.end_date < v_last_day THEN
            v_overlap_end := r_benefit.end_date;
        ELSE
            v_overlap_end := v_last_day;
        END IF;

        -- Both dates are inclusive
        v_eligible_days := (v_overlap_end - v_overlap_start) + 1;

        -- Skip if no positive overlap (safeguard)
        IF v_eligible_days <= 0 THEN
            CONTINUE;
        END IF;

        -- Calculate amount
        IF r_benefit.current_proration = 'daily_actual' THEN
            v_calculated_amount := ROUND((r_benefit.monthly_amount * v_eligible_days) / v_days_in_month, 2);
        ELSIF r_benefit.current_proration = 'daily_30' THEN
            v_calculated_amount := ROUND((r_benefit.monthly_amount * v_eligible_days) / 30.0, 2);
        ELSE
            -- Default fallback
            v_calculated_amount := r_benefit.monthly_amount;
        END IF;

        -- Insert idempotently
        INSERT INTO core_personal.worker_ledger_entries (
            empresa_id,
            worker_id,
            competence_year,
            competence_month,
            ledger_type_id,
            amount,
            entry_date,
            reference_type,
            reference_id,
            status
        )
        VALUES (
            p_empresa_id,
            r_benefit.worker_id,
            p_year,
            p_month,
            v_housing_type_id,
            v_calculated_amount,
            v_last_day, -- entry date defaults to last day of month for auto gen
            'housing_benefit',
            r_benefit.benefit_id,
            'pending'
        )
        ON CONFLICT (worker_id, competence_year, competence_month, ledger_type_id, reference_type, reference_id) 
        DO UPDATE SET 
            amount = EXCLUDED.amount,
            entry_date = EXCLUDED.entry_date
        WHERE core_personal.worker_ledger_entries.status = 'pending'; -- Only update if still pending!

        -- We consider it an insertion/update for the counter
        v_inserted_count := v_inserted_count + 1;
    END LOOP;

    RETURN v_inserted_count;
END;
$$;
