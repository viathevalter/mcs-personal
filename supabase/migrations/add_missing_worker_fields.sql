-- 1. Add NUSS to public.colaboradores (if not exists)
ALTER TABLE public.colaboradores ADD COLUMN IF NOT EXISTS nuss text;

-- 2. Add new fields to core_personal.workers
ALTER TABLE core_personal.workers 
    ADD COLUMN IF NOT EXISTS nacionalidade text,
    ADD COLUMN IF NOT EXISTS fecha_nacimiento text,
    ADD COLUMN IF NOT EXISTS nuss text,
    ADD COLUMN IF NOT EXISTS foto text;

-- 3. Update the sync trigger function
CREATE OR REPLACE FUNCTION public.fn_sync_sharepoint_worker()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
    v_empresa_id UUID;
    v_cod_colab TEXT;
    v_status_seguridad TEXT;
    v_status_trabajador TEXT;
BEGIN
    SELECT id INTO v_empresa_id FROM core_common.empresas WHERE is_active = true LIMIT 1;
    IF v_empresa_id IS NULL THEN
        RAISE EXCEPTION 'Cannot sync worker: No active Empresa found in core_common.empresas.';
    END IF;

    v_cod_colab := COALESCE(NEW.cod_colab, 'SP-' || NEW.sp_id::text);
    
    -- Safely extract Value from SharePoint JSON string if present, otherwise use the value directly
    v_status_seguridad := COALESCE(substring(NEW.status_seguridad from '"Value":"([^"]+)"'), NEW.status_seguridad);
    v_status_trabajador := COALESCE(substring(NEW.status_trabajador from '"Value":"([^"]+)"'), NEW.status_trabajador);

    IF TG_OP = 'UPDATE' THEN
        UPDATE core_personal.workers
        SET 
            nome = COALESCE(NEW.nombre, 'Sem Nome'),
            email = NEW.email,
            movil = NEW.movil,
            niss = NEW.niss,
            nif = NEW.nif,
            nie = NEW.nie,
            dni = NEW.dni,
            pasaporte = NEW.pasaporte,
            status_seguridad = v_status_seguridad,
            status_trabajador = v_status_trabajador,
            licencia_conducir = NEW.licencia_conducir,
            nacionalidade = NEW.nacionalidade,
            fecha_nacimiento = NEW.fecha_nacimiento,
            nuss = NEW.nuss,
            foto = NEW.foto
        WHERE cod_colab = v_cod_colab;
        
        IF FOUND THEN
            RETURN NEW;
        END IF;
    END IF;

    IF EXISTS (SELECT 1 FROM core_personal.workers WHERE empresa_id = v_empresa_id AND cod_colab = v_cod_colab) THEN
         v_cod_colab := v_cod_colab || '-' || NEW.sp_id::text;
    END IF;
    
    BEGIN
        INSERT INTO core_personal.workers (
            empresa_id,
            cod_colab,
            nome,
            email,
            movil,
            niss,
            nif,
            nie,
            dni,
            pasaporte,
            status_seguridad,
            status_trabajador,
            licencia_conducir,
            nacionalidade,
            fecha_nacimiento,
            nuss,
            foto
        ) VALUES (
            v_empresa_id,
            v_cod_colab,
            COALESCE(NEW.nombre, 'Sem Nome'),
            NEW.email,
            NEW.movil,
            NEW.niss,
            NEW.nif,
            NEW.nie,
            NEW.dni,
            NEW.pasaporte,
            v_status_seguridad,
            v_status_trabajador,
            NEW.licencia_conducir,
            NEW.nacionalidade,
            NEW.fecha_nacimiento,
            NEW.nuss,
            NEW.foto
        );
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'Failed to sync worker %: %', NEW.sp_id, SQLERRM;
    END;
    RETURN NEW;
END;
$function$;

-- 4. Backfill existing data to core_personal.workers
UPDATE core_personal.workers AS w
SET 
    nacionalidade = c.nacionalidade,
    fecha_nacimiento = c.fecha_nacimiento,
    nuss = c.nuss,
    foto = c.foto
FROM public.colaboradores AS c
WHERE w.cod_colab = c.cod_colab;
