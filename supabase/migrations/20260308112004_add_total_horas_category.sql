-- Migration to add 'total_horas' to evento_categoria

-- Since it's an ENUM type, we can add the value if it doesn't already exist.
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_enum e ON t.oid = e.enumtypid WHERE t.typname = 'evento_categoria' AND e.enumlabel = 'total_horas') THEN
        ALTER TYPE core_personal.evento_categoria ADD VALUE 'total_horas';
    END IF;
END
$$;
