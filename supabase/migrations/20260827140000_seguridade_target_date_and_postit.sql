-- Migration: Seguridade Social Target Date, Post-it and Trigger fix
-- 1. Ensure trigger handles both INSERT and UPDATE of status_seguridad
CREATE OR REPLACE FUNCTION core_personal.fn_worker_status_triggers_kanban()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'core_personal', 'public', 'core_comercial', 'core_operacoes', 'core_common'
AS $function$
DECLARE
  v_tipo core_personal.tipo_evento_seguridade;
  v_cliente_nome text;
  v_contratante text;
BEGIN
  IF NEW.status_seguridad = 'Pendente Alta' THEN
    v_tipo := 'alta';
  ELSIF NEW.status_seguridad = 'Pendente Baixa' THEN
    v_tipo := 'baixa';
  ELSE
    RETURN NEW;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM core_personal.seguridade_status
    WHERE worker_id = NEW.id 
      AND tipo_evento = v_tipo
      AND status IN ('pendente', 'erro')
  ) THEN
    SELECT cliente_nombre, contratante 
    INTO v_cliente_nome, v_contratante
    FROM core_personal.vw_worker_allocations
    WHERE cod_colab = NEW.cod_colab
    ORDER BY inserted_at DESC
    LIMIT 1;

    INSERT INTO core_personal.seguridade_status (
      empresa_id,
      worker_id,
      tipo_evento,
      status,
      origem,
      origem_cliente_nome,
      origem_contratante,
      data_solicitacao
    ) VALUES (
      NEW.empresa_id,
      NEW.id,
      v_tipo,
      'pendente',
      'Cadastro Trabalhador',
      COALESCE(v_cliente_nome, NEW.cliente),
      COALESCE(v_contratante, NEW.contratante, (SELECT nome FROM core_common.empresas WHERE id = NEW.empresa_id LIMIT 1)),
      now()
    );
  END IF;

  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_worker_status_triggers_kanban ON core_personal.workers;
CREATE TRIGGER trg_worker_status_triggers_kanban
AFTER INSERT OR UPDATE OF status_seguridad ON core_personal.workers
FOR EACH ROW
EXECUTE FUNCTION core_personal.fn_worker_status_triggers_kanban();

-- 2. Add lembrete_postit column
ALTER TABLE core_personal.seguridade_status ADD COLUMN IF NOT EXISTS lembrete_postit text;

-- 3. Update get_real_seguridade_status RPC to return data_alvo_execucao and lembrete_postit
CREATE OR REPLACE FUNCTION core_personal.get_real_seguridade_status(p_empresa_id uuid)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'core_personal', 'public', 'core_comercial', 'core_operacoes', 'core_common'
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
        'data_alvo_execucao', CASE 
            WHEN ss.tipo_evento = 'alta' THEN
              COALESCE(
                ss.data_efetiva::timestamp with time zone,
                (SELECT COALESCE(wa.planned_start_date, wa.start_date)::timestamp with time zone FROM core_personal.worker_assignments wa WHERE wa.worker_id = w.id AND wa.status != 'cancelled' ORDER BY COALESCE(wa.planned_start_date, wa.start_date) DESC LIMIT 1),
                (SELECT vwa.fechainiciopedido::timestamp with time zone FROM core_personal.vw_worker_allocations vwa WHERE vwa.cod_colab = w.cod_colab AND vwa.fechasalidatrabajador IS NULL ORDER BY vwa.inserted_at DESC LIMIT 1),
                (SELECT vwa.fechainiciopedido::timestamp with time zone FROM core_personal.vw_worker_allocations vwa WHERE vwa.cod_colab = w.cod_colab ORDER BY vwa.inserted_at DESC LIMIT 1),
                w.data_ingresso::timestamp with time zone,
                ss.data_solicitacao
              )
            ELSE
              COALESCE(
                ss.data_efetiva::timestamp with time zone,
                (SELECT vwa.fechasalidatrabajador::timestamp with time zone FROM core_personal.vw_worker_allocations vwa WHERE vwa.cod_colab = w.cod_colab AND vwa.fechasalidatrabajador IS NOT NULL ORDER BY vwa.inserted_at DESC LIMIT 1),
                (SELECT h.effective_date::timestamp with time zone FROM core_personal.worker_status_history h WHERE h.worker_id = w.id AND h.new_value ILIKE '%Baixa%' ORDER BY h.created_at DESC LIMIT 1),
                w.data_baixa::timestamp with time zone,
                ss.data_solicitacao
              )
        END,
        'lembrete_postit', ss.lembrete_postit,
        'observacoes', ss.observacoes,
        'autor_inativacao', (
            SELECT COALESCE(u.display_name, u.email)
            FROM core_personal.worker_status_history h
            LEFT JOIN public.mcs_users u ON u.id = h.changed_by
            WHERE h.worker_id = w.id 
            ORDER BY h.created_at DESC 
            LIMIT 1
        ),
        'hist_observacoes', COALESCE(
            ss.observacoes,
            (
                SELECT h.comments
                FROM core_personal.worker_status_history h
                WHERE h.worker_id = w.id 
                  AND h.comments IS NOT NULL AND h.comments <> ''
                ORDER BY h.created_at DESC 
                LIMIT 1
            )
        ),
        'hist_data_efetiva', COALESCE(
            ss.data_efetiva,
            (
                SELECT h.effective_date
                FROM core_personal.worker_status_history h
                WHERE h.worker_id = w.id 
                  AND h.effective_date IS NOT NULL
                ORDER BY h.created_at DESC 
                LIMIT 1
            )
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
