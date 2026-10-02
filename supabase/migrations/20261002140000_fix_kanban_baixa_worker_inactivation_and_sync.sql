-- Migration: 20261002140000_fix_kanban_baixa_worker_inactivation_and_sync.sql
-- Description: Blindagem definitiva da inativação automática ao dar baixa no Kanban da Seguridade,
-- sincronização com a tabela espelho public.colaboradores, blindagem da trigger do SharePoint para não ressuscitar
-- trabalhadores inativos, fechamento automático de alocações pendentes e correção imediata dos trabalhadores com baixa.

BEGIN;

-- 1. Atualizar a trigger fn_kanban_updates_worker_status para sincronizar tanto workers quanto colaboradores e alocações
CREATE OR REPLACE FUNCTION core_personal.fn_kanban_updates_worker_status()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'core_personal', 'public', 'core_comercial', 'core_operacoes', 'core_common'
AS $function$
DECLARE
   v_old_status_seguridad text;
   v_old_status_trabajador text;
   v_cod_colab text;
   v_effective_date date;
BEGIN
    -- Se o card mudou para "confirmado"
    IF NEW.status = 'confirmado' AND OLD.status != 'confirmado' THEN
        SELECT status_seguridad, status_trabajador, cod_colab 
        INTO v_old_status_seguridad, v_old_status_trabajador, v_cod_colab
        FROM core_personal.workers WHERE id = NEW.worker_id;

        v_effective_date := COALESCE(NEW.data_efetiva, CURRENT_DATE);

        IF NEW.tipo_evento = 'alta' THEN
            IF v_old_status_seguridad ILIKE '%Pendente%' OR v_old_status_seguridad IS NULL THEN
                UPDATE core_personal.workers 
                SET status_seguridad = 'Alta',
                    data_alta_seguridad = v_effective_date
                WHERE id = NEW.worker_id;

                IF v_cod_colab IS NOT NULL THEN
                    UPDATE public.colaboradores
                    SET status_seguridad = 'Alta',
                        fecha_alta = v_effective_date::text
                    WHERE cod_colab = v_cod_colab;
                END IF;

                INSERT INTO core_personal.worker_status_history (
                    worker_id, change_type, old_value, new_value, effective_date, comments, changed_by
                ) VALUES (
                    NEW.worker_id, 'SEGURIDADE', COALESCE(v_old_status_seguridad, 'Sem Status'), 'Alta', v_effective_date, NEW.observacoes, auth.uid()
                );
            END IF;

        ELSIF NEW.tipo_evento = 'baixa' THEN
            -- A. Atualizar ficha mestre em core_personal.workers
            UPDATE core_personal.workers 
            SET status_seguridad = 'Baixa',
                status_trabajador = 'INATIVO',
                data_baixa = COALESCE(data_baixa, v_effective_date),
                data_baixa_seguridad = v_effective_date
            WHERE id = NEW.worker_id;

            -- B. Sincronizar tabela espelho public.colaboradores para NUNCA mais sobrescrever o status como ativo
            IF v_cod_colab IS NOT NULL THEN
                UPDATE public.colaboradores
                SET status_seguridad = 'Baixa',
                    status_trabajador = 'INATIVO',
                    fecha_baja = v_effective_date::text
                WHERE cod_colab = v_cod_colab;
            END IF;

            -- C. Fechar alocações ativas em worker_assignments e colaborador_por_pedido
            UPDATE core_personal.worker_assignments
            SET status = 'completed',
                end_date = COALESCE(end_date, v_effective_date),
                updated_at = NOW()
            WHERE worker_id = NEW.worker_id
              AND (status = 'active' OR end_date IS NULL);

            IF v_cod_colab IS NOT NULL THEN
                UPDATE public.colaborador_por_pedido
                SET fechasalidatrabajador = COALESCE(fechasalidatrabajador, v_effective_date),
                    updated_at = NOW()
                WHERE cod_colab = v_cod_colab
                  AND fechasalidatrabajador IS NULL;
            END IF;

            -- D. Registrar histórico
            IF v_old_status_seguridad IS DISTINCT FROM 'Baixa' THEN
                INSERT INTO core_personal.worker_status_history (
                    worker_id, change_type, old_value, new_value, effective_date, comments, changed_by
                ) VALUES (
                    NEW.worker_id, 'SEGURIDADE', COALESCE(v_old_status_seguridad, 'Sem Status'), 'Baixa', v_effective_date, NEW.observacoes, auth.uid()
                );
            END IF;

            IF v_old_status_trabajador IS NULL OR v_old_status_trabajador NOT ILIKE 'INATIVO' THEN
                INSERT INTO core_personal.worker_status_history (
                    worker_id, change_type, old_value, new_value, effective_date, comments, changed_by
                ) VALUES (
                    NEW.worker_id, 'TRABALHADOR', COALESCE(v_old_status_trabajador, 'Sem Status'), 'INATIVO', v_effective_date, 'Reflexo Automático da Baixa Kanban', auth.uid()
                );
            END IF;
        END IF;
    END IF;
    
    RETURN NEW;
END;
$function$;


-- 2. Blindar a trigger fn_sync_sharepoint_worker em public.colaboradores
-- Se o trabalhador estiver INATIVO na tabela mestre workers, public.colaboradores NÃO pode reativá-lo!
CREATE OR REPLACE FUNCTION public.fn_sync_sharepoint_worker()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
    v_cod_colab TEXT;
    v_status_seguridad TEXT;
    v_status_trabajador TEXT;
    v_curr_trabajador TEXT;
    v_curr_seguridad TEXT;
BEGIN
    v_cod_colab := COALESCE(NEW.cod_colab, 'SP-' || COALESCE(NEW.sp_id, 0)::text);
    
    -- Safely extract Value from SharePoint JSON string if present, otherwise use the value directly
    v_status_seguridad := COALESCE(substring(NEW.status_seguridad from '"Value":"([^"]+)"'), NEW.status_seguridad);
    v_status_trabajador := COALESCE(substring(NEW.status_trabajador from '"Value":"([^"]+)"'), NEW.status_trabajador);

    IF TG_OP = 'UPDATE' THEN
        -- Obter status atual na tabela mestre core_personal.workers
        SELECT status_trabajador, status_seguridad 
        INTO v_curr_trabajador, v_curr_seguridad
        FROM core_personal.workers 
        WHERE cod_colab = v_cod_colab;

        -- BLINDAGEM: Se o trabalhador já está INATIVO/DESLIGADO/DESISTIU na tabela mestre,
        -- ou com Baixa na seguridade, NÃO permitir que um update em colaboradores
        -- o reverta de volta para ativo!
        IF (v_curr_trabajador ILIKE '%INATIVO%' OR v_curr_trabajador ILIKE '%DESLIGADO%' OR v_curr_trabajador ILIKE '%DESISTIU%')
           AND (v_status_trabajador ILIKE '%ATIVO%' OR v_status_trabajador ILIKE '%ACTIVO%') THEN
            v_status_trabajador := v_curr_trabajador;
        END IF;

        IF (v_curr_seguridad ILIKE '%BAIXA%' OR v_curr_seguridad ILIKE '%BAJA%')
           AND (v_status_seguridad ILIKE '%ALTA%' OR v_status_seguridad ILIKE '%REGULARIZA%') THEN
            v_status_seguridad := v_curr_seguridad;
        END IF;

        UPDATE core_personal.workers
        SET 
            nome = CASE 
                WHEN NEW.nombre IS NOT NULL 
                     AND NEW.nombre NOT ILIKE 'Colaborador E%' 
                     AND NEW.nombre NOT ILIKE 'Sem Nome' 
                     AND TRIM(NEW.nombre) <> '' 
                THEN NEW.nombre 
                ELSE COALESCE(core_personal.workers.nome, NEW.nombre, 'Sem Nome') 
            END,
            email = COALESCE(NULLIF(NEW.email, ''), core_personal.workers.email),
            movil = COALESCE(NULLIF(NEW.movil, ''), core_personal.workers.movil),
            niss = COALESCE(NULLIF(NEW.niss, ''), core_personal.workers.niss),
            nif = COALESCE(NULLIF(NEW.nif, ''), core_personal.workers.nif),
            nie = COALESCE(NULLIF(NEW.nie, ''), core_personal.workers.nie),
            dni = COALESCE(NULLIF(NEW.dni, ''), core_personal.workers.dni),
            pasaporte = COALESCE(NULLIF(NEW.pasaporte, ''), core_personal.workers.pasaporte),
            status_seguridad = COALESCE(v_status_seguridad, core_personal.workers.status_seguridad),
            status_trabajador = COALESCE(v_status_trabajador, core_personal.workers.status_trabajador),
            licencia_conducir = COALESCE(NULLIF(NEW.licencia_conducir, ''), core_personal.workers.licencia_conducir),
            nacionalidade = COALESCE(NULLIF(NEW.nacionalidade, ''), core_personal.workers.nacionalidade),
            fecha_nacimiento = COALESCE(NEW.fecha_nacimiento, core_personal.workers.fecha_nacimiento),
            nuss = COALESCE(NULLIF(NEW.nuss, ''), core_personal.workers.nuss),
            foto = COALESCE(NULLIF(NEW.foto, ''), core_personal.workers.foto)
        WHERE cod_colab = v_cod_colab;
        
        IF FOUND THEN
            RETURN NEW;
        END IF;
    END IF;

    IF EXISTS (SELECT 1 FROM core_personal.workers WHERE cod_colab = v_cod_colab) THEN
         v_cod_colab := v_cod_colab || '-' || COALESCE(NEW.sp_id, 0)::text;
    END IF;
    
    BEGIN
        INSERT INTO core_personal.workers (
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
        RAISE NOTICE 'Failed to sync worker: %', SQLERRM;
    END;
    RETURN NEW;
END;
$function$;


-- 3. Correção Imediata: inativar todos os trabalhadores que possuem Seguridade Social em Baixa
-- e ajustar data_baixa e alocações
UPDATE core_personal.workers w
SET status_trabajador = 'INATIVO',
    data_baixa = COALESCE(w.data_baixa, w.data_baixa_seguridad, CURRENT_DATE)
WHERE (w.status_trabajador ILIKE 'Ativo%' OR w.status_trabajador ILIKE 'Activo%')
  AND (w.status_seguridad ILIKE 'Baixa%' OR w.status_seguridad ILIKE 'Baja%');

-- Sincronizar em public.colaboradores
UPDATE public.colaboradores c
SET status_trabajador = 'INATIVO',
    status_seguridad = 'Baixa',
    fecha_baja = COALESCE(c.fecha_baja, c.fecha_salida_trabajador, CURRENT_DATE::text)
FROM core_personal.workers w
WHERE w.cod_colab = c.cod_colab
  AND w.status_trabajador = 'INATIVO'
  AND (c.status_trabajador ILIKE 'Ativo%' OR c.status_trabajador ILIKE 'Activo%');

-- Fechar alocações legadas de colaboradores inativados
UPDATE public.colaborador_por_pedido cpp
SET fechasalidatrabajador = COALESCE(cpp.fechasalidatrabajador, w.data_baixa, CURRENT_DATE)
FROM core_personal.workers w
WHERE w.cod_colab = cpp.cod_colab
  AND w.status_trabajador = 'INATIVO'
  AND cpp.fechasalidatrabajador IS NULL;

-- Fechar alocações novas de trabalhadores inativados
UPDATE core_personal.worker_assignments wa
SET status = 'completed',
    end_date = COALESCE(wa.end_date, w.data_baixa, CURRENT_DATE),
    updated_at = NOW()
FROM core_personal.workers w
WHERE w.id = wa.worker_id
  AND w.status_trabajador = 'INATIVO'
  AND wa.status = 'active';

COMMIT;
