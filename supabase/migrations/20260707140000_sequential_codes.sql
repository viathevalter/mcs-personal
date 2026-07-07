-- =========================================================================
-- MIGRATION: SEQUENTIAL AUTO-GENERATION OF ESTIMATES AND ORDERS CODES
-- =========================================================================

-- 1. Create next_estimacion_code function
CREATE OR REPLACE FUNCTION core_comercial.fn_generate_next_estimacion_code()
RETURNS text AS $$
DECLARE
    current_year text;
    seq_name text;
    next_val integer;
BEGIN
    current_year := to_char(NOW(), 'YYYY');
    seq_name := 'core_comercial.seq_estimacion_code_' || current_year;
    
    -- Create sequence if it does not exist
    BEGIN
        EXECUTE 'CREATE SEQUENCE IF NOT EXISTS ' || seq_name;
    EXCEPTION WHEN duplicate_table THEN
        -- Ignore if another transaction created it simultaneously
    END;
    
    EXECUTE 'SELECT nextval(''' || seq_name || ''')' INTO next_val;
    
    RETURN 'EST-' || current_year || '-' || lpad(next_val::text, 4, '0');
END;
$$ LANGUAGE plpgsql;

-- 2. Create triggers for estimaciones
CREATE OR REPLACE FUNCTION core_comercial.fn_trg_estimacion_generate_code()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.codigo IS NULL OR NEW.codigo = '' OR length(NEW.codigo) > 20 THEN
        NEW.codigo := core_comercial.fn_generate_next_estimacion_code();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_estimacion_generate_code ON core_comercial.estimaciones;
CREATE TRIGGER trg_estimacion_generate_code
BEFORE INSERT ON core_comercial.estimaciones
FOR EACH ROW
EXECUTE FUNCTION core_comercial.fn_trg_estimacion_generate_code();


-- 3. Create next_pedido_code function
CREATE OR REPLACE FUNCTION core_comercial.fn_generate_next_pedido_code()
RETURNS text AS $$
DECLARE
    current_year text;
    seq_name text;
    next_val integer;
BEGIN
    current_year := to_char(NOW(), 'YYYY');
    seq_name := 'core_comercial.seq_pedido_code_' || current_year;
    
    -- Create sequence if it does not exist
    BEGIN
        EXECUTE 'CREATE SEQUENCE IF NOT EXISTS ' || seq_name;
    EXCEPTION WHEN duplicate_table THEN
        -- Ignore if another transaction created it simultaneously
    END;
    
    EXECUTE 'SELECT nextval(''' || seq_name || ''')' INTO next_val;
    
    RETURN 'PED-' || current_year || '-' || lpad(next_val::text, 4, '0');
END;
$$ LANGUAGE plpgsql;

-- 4. Create triggers for pedidos
CREATE OR REPLACE FUNCTION core_comercial.fn_trg_pedido_generate_code()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.codigo IS NULL OR NEW.codigo = '' OR length(NEW.codigo) > 20 THEN
        NEW.codigo := core_comercial.fn_generate_next_pedido_code();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_pedido_generate_code ON core_comercial.pedidos;
CREATE TRIGGER trg_pedido_generate_code
BEFORE INSERT ON core_comercial.pedidos
FOR EACH ROW
EXECUTE FUNCTION core_comercial.fn_trg_pedido_generate_code();
