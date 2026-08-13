-- =========================================================================
-- MIGRATION: FIX SEGURIDADE SOCIAL CONTEXT RESOLUTION FOR ALLOCATIONS
-- =========================================================================

BEGIN;

-- 1. Update fn_populate_seguridade_context trigger
CREATE OR REPLACE FUNCTION core_personal.fn_populate_seguridade_context()
RETURNS trigger AS $$
BEGIN
  IF NEW.origem_cliente_nome IS NULL OR NEW.origem_cliente_nome = 'ELECTRODINAMIC JO-AN SL' THEN
    SELECT COALESCE(
      (
        SELECT vwa.cliente_nombre 
        FROM core_personal.vw_worker_allocations vwa
        WHERE vwa.cod_colab = w.cod_colab 
          AND vwa.fechasalidatrabajador IS NULL
        ORDER BY vwa.inserted_at DESC 
        LIMIT 1
      ),
      (
        SELECT vwa.cliente_nombre 
        FROM core_personal.vw_worker_allocations vwa
        WHERE vwa.cod_colab = w.cod_colab 
        ORDER BY vwa.inserted_at DESC 
        LIMIT 1
      ),
      w.cliente,
      'Não Alocado'
    ) INTO NEW.origem_cliente_nome
    FROM core_personal.workers w
    WHERE w.id = NEW.worker_id;
  END IF;

  IF NEW.origem_contratante IS NULL OR NEW.origem_contratante ILIKE '%Luminous%' THEN
    SELECT COALESCE(
      (
        SELECT vwa.contratante 
        FROM core_personal.vw_worker_allocations vwa
        WHERE vwa.cod_colab = w.cod_colab 
          AND vwa.fechasalidatrabajador IS NULL
        ORDER BY vwa.inserted_at DESC 
        LIMIT 1
      ),
      (
        SELECT vwa.contratante 
        FROM core_personal.vw_worker_allocations vwa
        WHERE vwa.cod_colab = w.cod_colab 
        ORDER BY vwa.inserted_at DESC 
        LIMIT 1
      ),
      w.contratante,
      e.nome
    ) INTO NEW.origem_contratante
    FROM core_personal.workers w
    LEFT JOIN core_common.empresas e ON e.id = w.empresa_id
    WHERE w.id = NEW.worker_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 2. Update fn_worker_status_triggers_kanban trigger
CREATE OR REPLACE FUNCTION core_personal.fn_worker_status_triggers_kanban()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_tipo_evento text;
    v_cliente text;
    v_contratante text;
    v_empresa_id uuid;
BEGIN
    IF NEW.status_seguridad IS DISTINCT FROM OLD.status_seguridad THEN
        IF NEW.status_seguridad ILIKE '%Pendente%Alta%' OR NEW.status_seguridad ILIKE '%Pendiente%Alta%' THEN
            v_tipo_evento := 'alta';
            
            SELECT id INTO v_empresa_id
            FROM core_common.empresas
            WHERE nome ILIKE NEW.contratante OR trade_name ILIKE NEW.contratante OR legal_name ILIKE NEW.contratante OR codigo ILIKE NEW.contratante
            LIMIT 1;

            IF v_empresa_id IS NULL THEN
                v_empresa_id := NEW.empresa_id;
            END IF;
            IF v_empresa_id IS NULL THEN
                v_empresa_id := 'bedbc2ad-bb7a-4bb3-986e-07224a9a5a3d'::uuid;
            END IF;

            v_cliente := COALESCE(
                (SELECT cliente_nombre FROM core_personal.vw_worker_allocations WHERE cod_colab = NEW.cod_colab AND fechasalidatrabajador IS NULL ORDER BY inserted_at DESC LIMIT 1),
                (SELECT cliente_nombre FROM core_personal.vw_worker_allocations WHERE cod_colab = NEW.cod_colab ORDER BY inserted_at DESC LIMIT 1),
                NEW.cliente
            );

            v_contratante := COALESCE(
                (SELECT contratante FROM core_personal.vw_worker_allocations WHERE cod_colab = NEW.cod_colab AND fechasalidatrabajador IS NULL ORDER BY inserted_at DESC LIMIT 1),
                (SELECT contratante FROM core_personal.vw_worker_allocations WHERE cod_colab = NEW.cod_colab ORDER BY inserted_at DESC LIMIT 1),
                NEW.contratante
            );

            IF NOT EXISTS (SELECT 1 FROM core_personal.seguridade_status WHERE worker_id = NEW.id AND status = 'pendente' AND tipo_evento = 'alta') THEN
                INSERT INTO core_personal.seguridade_status (worker_id, empresa_id, origem, status, tipo_evento, data_solicitacao, origem_cliente_nome, origem_contratante)
                VALUES (NEW.id, v_empresa_id, 'Sistema', 'pendente', v_tipo_evento, NOW(), v_cliente, v_contratante);
            END IF;
            
        ELSIF NEW.status_seguridad ILIKE '%Pendente%Baixa%' OR NEW.status_seguridad ILIKE '%Pendiente%Baja%' THEN
            v_tipo_evento := 'baixa';
            
            SELECT id INTO v_empresa_id
            FROM core_common.empresas
            WHERE nome ILIKE NEW.contratante OR trade_name ILIKE NEW.contratante OR legal_name ILIKE NEW.contratante OR codigo ILIKE NEW.contratante
            LIMIT 1;

            IF v_empresa_id IS NULL THEN
                v_empresa_id := NEW.empresa_id;
            END IF;
            IF v_empresa_id IS NULL THEN
                v_empresa_id := 'bedbc2ad-bb7a-4bb3-986e-07224a9a5a3d'::uuid;
            END IF;

            v_cliente := COALESCE(
                (SELECT cliente_nombre FROM core_personal.vw_worker_allocations WHERE cod_colab = NEW.cod_colab AND fechasalidatrabajador IS NULL ORDER BY inserted_at DESC LIMIT 1),
                (SELECT cliente_nombre FROM core_personal.vw_worker_allocations WHERE cod_colab = NEW.cod_colab ORDER BY inserted_at DESC LIMIT 1),
                NEW.cliente
            );

            v_contratante := COALESCE(
                (SELECT contratante FROM core_personal.vw_worker_allocations WHERE cod_colab = NEW.cod_colab AND fechasalidatrabajador IS NULL ORDER BY inserted_at DESC LIMIT 1),
                (SELECT contratante FROM core_personal.vw_worker_allocations WHERE cod_colab = NEW.cod_colab ORDER BY inserted_at DESC LIMIT 1),
                NEW.contratante
            );

            IF NOT EXISTS (SELECT 1 FROM core_personal.seguridade_status WHERE worker_id = NEW.id AND status = 'pendente' AND tipo_evento = 'baixa') THEN
                INSERT INTO core_personal.seguridade_status (worker_id, empresa_id, origem, status, tipo_evento, data_solicitacao, origem_cliente_nome, origem_contratante)
                VALUES (NEW.id, v_empresa_id, 'Sistema', 'pendente', v_tipo_evento, NOW(), v_cliente, v_contratante);
            END IF;
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$;

-- 3. Update get_real_seguridade_status RPC
CREATE OR REPLACE FUNCTION core_personal.get_real_seguridade_status(p_empresa_id uuid)
 RETURNS json
 LANGUAGE plpgsql
AS $function$
BEGIN
  RETURN COALESCE((
    SELECT json_agg(
      json_build_object(
        'id', ss.id,
        'empresa_id', ss.empresa_id,
        'worker_id', w.id,
        'tipo_evento', ss.tipo_evento,
        'status', ss.status,
        'origem', ss.origem,
        'origem_cliente_nome', COALESCE(
            ss.origem_cliente_nome,
            (
                SELECT vwa.cliente_nombre 
                FROM core_personal.vw_worker_allocations vwa 
                WHERE vwa.cod_colab = w.cod_colab 
                  AND vwa.fechasalidatrabajador IS NULL
                ORDER BY vwa.inserted_at DESC 
                LIMIT 1
            ),
            (
                SELECT vwa.cliente_nombre 
                FROM core_personal.vw_worker_allocations vwa 
                WHERE vwa.cod_colab = w.cod_colab 
                ORDER BY vwa.inserted_at DESC 
                LIMIT 1
            ),
            w.cliente
        ),
        'origem_contratante', COALESCE(
            ss.origem_contratante,
            (
                SELECT vwa.contratante 
                FROM core_personal.vw_worker_allocations vwa 
                WHERE vwa.cod_colab = w.cod_colab 
                  AND vwa.fechasalidatrabajador IS NULL
                ORDER BY vwa.inserted_at DESC 
                LIMIT 1
            ),
            (
                SELECT vwa.contratante 
                FROM core_personal.vw_worker_allocations vwa 
                WHERE vwa.cod_colab = w.cod_colab 
                ORDER BY vwa.inserted_at DESC 
                LIMIT 1
            ),
            w.contratante,
            (SELECT e.nome FROM core_common.empresas e WHERE e.id = ss.empresa_id LIMIT 1)
        ),
        'data_solicitacao', ss.data_solicitacao,
        'data_efetiva', ss.data_efetiva,
        'observacoes', ss.observacoes,
        'autor_inativacao', (
            SELECT COALESCE(u.display_name, u.email)
            FROM core_personal.worker_status_history h
            LEFT JOIN public.mcs_users u ON u.id = h.changed_by
            WHERE h.worker_id = w.id 
              AND h.change_type = 'TRABALHADOR'
            ORDER BY h.created_at DESC 
            LIMIT 1
        ),
        'hist_observacoes', (
            SELECT h.comments
            FROM core_personal.worker_status_history h
            WHERE h.worker_id = w.id 
              AND h.change_type = 'TRABALHADOR'
            ORDER BY h.created_at DESC 
            LIMIT 1
        ),
        'hist_data_efetiva', (
            SELECT h.effective_date
            FROM core_personal.worker_status_history h
            WHERE h.worker_id = w.id 
              AND h.change_type = 'TRABALHADOR'
            ORDER BY h.created_at DESC 
            LIMIT 1
        ),
        'worker', json_build_object(
          'id', w.id,
          'nome', w.nome,
          'cod_colab', w.cod_colab,
          'niss', w.niss,
          'nif', w.nif,
          'dni', w.dni,
          'nie', w.nie,
          'pasaporte', w.pasaporte,
          'fecha_nacimiento', w.fecha_nacimiento,
          'contratante', COALESCE(
              (
                  SELECT vwa.contratante 
                  FROM core_personal.vw_worker_allocations vwa 
                  WHERE vwa.cod_colab = w.cod_colab 
                    AND vwa.fechasalidatrabajador IS NULL
                  ORDER BY vwa.inserted_at DESC 
                  LIMIT 1
              ),
              (
                  SELECT vwa.contratante 
                  FROM core_personal.vw_worker_allocations vwa 
                  WHERE vwa.cod_colab = w.cod_colab 
                  ORDER BY vwa.inserted_at DESC 
                  LIMIT 1
              ),
              w.contratante
          ),
          'cliente', COALESCE(
              (
                  SELECT vwa.cliente_nombre 
                  FROM core_personal.vw_worker_allocations vwa 
                  WHERE vwa.cod_colab = w.cod_colab 
                    AND vwa.fechasalidatrabajador IS NULL
                  ORDER BY vwa.inserted_at DESC 
                  LIMIT 1
              ),
              (
                  SELECT vwa.cliente_nombre 
                  FROM core_personal.vw_worker_allocations vwa 
                  WHERE vwa.cod_colab = w.cod_colab 
                  ORDER BY vwa.inserted_at DESC 
                  LIMIT 1
              ),
              w.cliente
          ),
          'data_ingresso', w.data_ingresso,
          'data_baixa', w.data_baixa,
          'funcion', COALESCE(
              (
                  SELECT vwa.funcion 
                  FROM core_personal.vw_worker_allocations vwa 
                  WHERE vwa.cod_colab = w.cod_colab 
                  ORDER BY vwa.inserted_at DESC 
                  LIMIT 1
              ),
              w.funcion
          ),
          'empresa_nome', (SELECT e.nome FROM core_common.empresas e WHERE e.id = ss.empresa_id LIMIT 1)
        )
      ) ORDER BY ss.created_at DESC
    )
    FROM core_personal.seguridade_status ss
    JOIN core_personal.workers w ON ss.worker_id = w.id
    WHERE (p_empresa_id IS NULL OR p_empresa_id = 'bedbc2ad-bb7a-4bb3-986e-07224a9a5a3d'::uuid OR ss.empresa_id = p_empresa_id)
      AND (
         ss.status IN ('pendente', 'erro', 'cancelado') OR
         (ss.status = 'confirmado' AND (ss.updated_at > now() - interval '60 days' OR ss.created_at > now() - interval '60 days'))
      )
  ), '[]');
END;
$function$;

COMMIT;
