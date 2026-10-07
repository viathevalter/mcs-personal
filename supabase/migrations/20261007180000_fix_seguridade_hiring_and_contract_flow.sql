-- Migration: 20261007180000_fix_seguridade_hiring_and_contract_flow.sql
-- Description: Desacoplar contratação inicial da Seguridade Social, vincular Pendente Alta à validação de NISS/NIF e Contratos, e corrigir contratante em alocações.

-- 1. Triggers e Funções para conectar Seguridade Social ao Contrato e Validação de NISS/NIF
CREATE OR REPLACE FUNCTION core_personal.fn_contract_triggers_seguridade()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'core_personal', 'public', 'core_common'
AS $function$
DECLARE
    v_niss text;
    v_nif text;
    v_status_seguridad text;
    v_status_trabajador text;
BEGIN
    -- Ignorar contratos cancelados ou terminados
    IF NEW.status IN ('cancelled', 'terminated') THEN
        RETURN NEW;
    END IF;

    -- Obter dados atuais do trabalhador
    SELECT niss, nif, status_seguridad, status_trabajador 
    INTO v_niss, v_nif, v_status_seguridad, v_status_trabajador
    FROM core_personal.workers
    WHERE id = NEW.worker_id;

    -- Se o trabalhador possui NISS válido (11 dígitos) e NIF (ao menos 9 dígitos)
    -- E não está inativo
    IF (v_status_trabajador IS NULL OR v_status_trabajador NOT ILIKE '%INATIVO%')
       AND (v_niss IS NOT NULL AND length(regexp_replace(v_niss, '[^0-9]', '', 'g')) = 11)
       AND (v_nif IS NOT NULL AND length(regexp_replace(v_nif, '[^0-9]', '', 'g')) >= 9) THEN
       
        -- Se o status de seguridade ainda não é 'Alta' nem 'Pendente Alta'
        IF v_status_seguridad IS DISTINCT FROM 'Alta' AND v_status_seguridad IS DISTINCT FROM 'Pendente Alta' THEN
            UPDATE core_personal.workers
            SET status_seguridad = 'Pendente Alta'
            WHERE id = NEW.worker_id;
        END IF;
    END IF;

    RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_contract_triggers_seguridade ON core_personal.contracts;
CREATE TRIGGER trg_contract_triggers_seguridade
AFTER INSERT OR UPDATE OF status, worker_id ON core_personal.contracts
FOR EACH ROW EXECUTE FUNCTION core_personal.fn_contract_triggers_seguridade();


-- 2. Gatilho para quando o trabalhador tiver seu NISS e NIF validados (ex: via Validação de Documentos)
CREATE OR REPLACE FUNCTION core_personal.fn_worker_niss_nif_triggers_seguridade()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'core_personal', 'public', 'core_common'
AS $function$
DECLARE
    v_has_active_contract boolean;
    v_has_active_assignment boolean;
BEGIN
    -- Só processar se NISS ou NIF agora possui formato completo
    IF (NEW.niss IS NOT NULL AND length(regexp_replace(NEW.niss, '[^0-9]', '', 'g')) = 11)
       AND (NEW.nif IS NOT NULL AND length(regexp_replace(NEW.nif, '[^0-9]', '', 'g')) >= 9)
       AND (NEW.status_trabajador IS NULL OR NEW.status_trabajador NOT ILIKE '%INATIVO%')
       AND (NEW.status_seguridad IS NULL OR NEW.status_seguridad = 'Em Regularização') THEN
       
        -- Verificar se possui contrato ativo/pendente OU alocação planejada/ativa
        SELECT EXISTS (
            SELECT 1 FROM core_personal.contracts
            WHERE worker_id = NEW.id AND status NOT IN ('cancelled', 'terminated')
        ) INTO v_has_active_contract;

        SELECT EXISTS (
            SELECT 1 FROM core_personal.worker_assignments
            WHERE worker_id = NEW.id AND status IN ('planned', 'active')
        ) INTO v_has_active_assignment;

        -- Se possui contrato ou alocação, ele está apto para ter Alta na Seguridade
        IF v_has_active_contract OR v_has_active_assignment THEN
            NEW.status_seguridad := 'Pendente Alta';
        END IF;
    END IF;

    RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_worker_niss_nif_triggers_seguridade ON core_personal.workers;
CREATE TRIGGER trg_worker_niss_nif_triggers_seguridade
BEFORE INSERT OR UPDATE OF niss, nif ON core_personal.workers
FOR EACH ROW EXECUTE FUNCTION core_personal.fn_worker_niss_nif_triggers_seguridade();


-- 3. Atualizar função core_personal.alocar_trabalhador_em_vaga
CREATE OR REPLACE FUNCTION core_personal.alocar_trabalhador_em_vaga(payload jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
      DECLARE
          v_empresa_id UUID;
          v_pedido_item_id UUID;
          v_worker_id UUID;
          v_worker_name TEXT;
          v_worker_document TEXT;
          v_planned_start_date DATE;
          v_planned_end_date DATE;
          v_solicitud_id UUID;
          v_solicitud_target_id UUID;
          v_notes TEXT;
          v_camiseta TEXT;
          v_pantalones TEXT;
          v_licencia_conducir TEXT;
          v_movil TEXT;
          v_tarifa_acordada NUMERIC;

          -- Variáveis resolvidas
          v_pedido_id UUID;
          v_job_function_id UUID;
          v_job_function_name TEXT;
          v_client_id UUID;
          v_client_site_id UUID;
          v_contratante_nome TEXT;
          v_existing_worker RECORD;
          v_existing_active_assignment UUID;
          v_new_assignment_id UUID := gen_random_uuid();
          v_assignment_status VARCHAR;
          v_start_date DATE;
          v_source_assignment_id UUID;
          v_total_items INT;
          v_fulfilled_items INT;
          v_new_operational_status VARCHAR;
          v_worker_status_trabajador VARCHAR;
          v_worker_cod_colab TEXT;
          
          v_target_jf_id UUID;
          v_target_jf_name TEXT;
      BEGIN
          -- 1. Extração de Parâmetros
          v_empresa_id := (payload->>'empresa_id')::uuid;
          v_pedido_item_id := (payload->>'pedido_item_id')::uuid;
          v_worker_id := (payload->>'worker_id')::uuid;
          v_worker_name := payload->>'worker_name';
          v_worker_document := payload->>'worker_document';
          v_planned_start_date := (payload->>'planned_start_date')::date;
          v_planned_end_date := (payload->>'planned_end_date')::date;
          v_solicitud_id := (payload->>'solicitud_id')::uuid;
          v_solicitud_target_id := (payload->>'solicitud_target_id')::uuid;
          v_notes := payload->>'notes';
          v_camiseta := payload->>'camiseta';
          v_pantalones := payload->>'pantalones';
          v_licencia_conducir := payload->>'licencia_conducir';
          v_movil := payload->>'movil';
          v_tarifa_acordada := (payload->>'tarifa_acordada')::numeric;

          IF v_empresa_id IS NULL THEN
              RAISE EXCEPTION 'O campo empresa_id é obrigatório.';
          END IF;

          IF v_planned_start_date IS NULL THEN
              RAISE EXCEPTION 'A data de início prevista é obrigatória.';
          END IF;

          -- 2. Resolver informações do Pedido Item se fornecido
          IF v_pedido_item_id IS NOT NULL THEN
              SELECT 
                  pi.pedido_id, 
                  pi.job_function_id, 
                  COALESCE(pi.job_function_name_snapshot, jf.name, 'Função'),
                  p.client_id, 
                  p.client_site_id
              INTO 
                  v_pedido_id, 
                  v_job_function_id, 
                  v_job_function_name, 
                  v_client_id, 
                  v_client_site_id
              FROM core_comercial.pedido_items pi
              JOIN core_comercial.pedidos p ON p.id = pi.pedido_id
              LEFT JOIN core_comercial.job_functions jf ON jf.id = pi.job_function_id
              WHERE pi.id = v_pedido_item_id;

              IF v_pedido_id IS NULL THEN
                  RAISE EXCEPTION 'Item do pedido não encontrado.';
              END IF;
          END IF;

          -- 3. Resolver informações da Solicitude (Reemplazo) se aplicável
          IF v_solicitud_target_id IS NOT NULL THEN
              SELECT 
                  COALESCE(v_pedido_id, s.pedido_id),
                  COALESCE(v_client_id, st.source_client_id, s.client_id),
                  COALESCE(v_client_site_id, st.source_client_site_id, s.client_site_id),
                  st.source_assignment_id,
                  st.target_job_function_id,
                  st.target_job_function_name,
                  st.solicitud_id
              INTO 
                  v_pedido_id, 
                  v_client_id, 
                  v_client_site_id, 
                  v_source_assignment_id, 
                  v_target_jf_id, 
                  v_target_jf_name, 
                  v_solicitud_id
              FROM core_operacoes.solicitud_targets st
              JOIN core_operacoes.solicitudes_operativas s ON s.id = st.solicitud_id
              WHERE st.id = v_solicitud_target_id;

              IF v_target_jf_id IS NOT NULL THEN
                  v_job_function_id := v_target_jf_id;
                  v_job_function_name := COALESCE(v_target_jf_name, (SELECT name FROM core_comercial.job_functions WHERE id = v_target_jf_id), v_job_function_name);
              ELSIF v_target_jf_name IS NOT NULL AND TRIM(v_target_jf_name) != '' THEN
                  v_job_function_name := v_target_jf_name;
              END IF;
          ELSIF v_solicitud_id IS NOT NULL THEN
              SELECT 
                  COALESCE(v_pedido_id, s.pedido_id),
                  COALESCE(v_client_id, s.client_id),
                  COALESCE(v_client_site_id, s.client_site_id),
                  st.source_assignment_id,
                  st.target_job_function_id,
                  st.target_job_function_name
              INTO 
                  v_pedido_id, 
                  v_client_id, 
                  v_client_site_id, 
                  v_source_assignment_id, 
                  v_target_jf_id, 
                  v_target_jf_name
              FROM core_operacoes.solicitudes_operativas s
              LEFT JOIN core_operacoes.solicitud_targets st ON st.solicitud_id = s.id 
                AND (v_pedido_item_id IS NULL OR st.source_pedido_item_id = v_pedido_item_id)
                AND st.status IN ('pending', 'in_progress')
              WHERE s.id = v_solicitud_id
              ORDER BY st.created_at ASC
              LIMIT 1;

              IF v_target_jf_id IS NOT NULL THEN
                  v_job_function_id := v_target_jf_id;
                  v_job_function_name := COALESCE(v_target_jf_name, (SELECT name FROM core_comercial.job_functions WHERE id = v_target_jf_id), v_job_function_name);
              ELSIF v_target_jf_name IS NOT NULL AND TRIM(v_target_jf_name) != '' THEN
                  v_job_function_name := v_target_jf_name;
              END IF;
          END IF;

          -- Fallback/Override explícito de client e job_function vindo do payload se informado
          IF payload->>'client_id' IS NOT NULL AND TRIM(payload->>'client_id') != '' THEN
              v_client_id := (payload->>'client_id')::uuid;
          END IF;
          IF payload->>'client_site_id' IS NOT NULL AND TRIM(payload->>'client_site_id') != '' THEN
              v_client_site_id := (payload->>'client_site_id')::uuid;
          END IF;
          IF payload->>'job_function_id' IS NOT NULL AND TRIM(payload->>'job_function_id') != '' THEN
              v_job_function_id := (payload->>'job_function_id')::uuid;
          END IF;
          IF payload->>'job_function_name' IS NOT NULL AND TRIM(payload->>'job_function_name') != '' THEN
              v_job_function_name := TRIM(payload->>'job_function_name');
          END IF;
          v_job_function_name := COALESCE(v_job_function_name, 'Função');

          -- 4. REGRA DE BLOQUEIO DE DUPLICAÇÃO OU RECONTRATAÇÃO DE INATIVO
          IF v_worker_id IS NULL THEN
              -- 4.1 Validação estrita por Documento (NIF, Pasaporte, DNI, NIE)
              IF v_worker_document IS NOT NULL AND TRIM(v_worker_document) != '' THEN
                  SELECT id, nome, cod_colab INTO v_existing_worker
                  FROM core_personal.workers
                  WHERE (nif IS NOT NULL AND TRIM(UPPER(nif)) = TRIM(UPPER(v_worker_document)))
                     OR (pasaporte IS NOT NULL AND TRIM(UPPER(pasaporte)) = TRIM(UPPER(v_worker_document)))
                     OR (dni IS NOT NULL AND TRIM(UPPER(dni)) = TRIM(UPPER(v_worker_document)))
                     OR (nie IS NOT NULL AND TRIM(UPPER(nie)) = TRIM(UPPER(v_worker_document)))
                  ORDER BY created_at ASC
                  LIMIT 1;

                  IF v_existing_worker.id IS NOT NULL THEN
                      RAISE EXCEPTION 'Já existe um trabalhador cadastrado com este documento (%): "%" (Cód: %). Por favor, selecione a opção "Trabalhador Existente" para alocá-lo.', 
                          v_worker_document, v_existing_worker.nome, v_existing_worker.cod_colab;
                  END IF;
              END IF;

              IF v_worker_name IS NULL OR TRIM(v_worker_name) = '' THEN
                  RAISE EXCEPTION 'Nome do trabalhador é obrigatório para novos cadastros.';
              END IF;

              -- 4.2 Verificação por Nome Completo para evitar duplicidades mesmo com documento digitado errado
              SELECT id, nome, cod_colab INTO v_existing_worker
              FROM core_personal.workers
              WHERE UPPER(TRIM(nome)) = UPPER(TRIM(v_worker_name))
              ORDER BY created_at ASC
              LIMIT 1;

              IF v_existing_worker.id IS NOT NULL THEN
                  v_worker_id := v_existing_worker.id;
              ELSE
                  -- 4.3 Inserir novo trabalhador no core_personal (SEM Pendente Alta prematura!)
                  INSERT INTO core_personal.workers (
                      nome,
                      pasaporte,
                      camiseta,
                      pantalones,
                      licencia_conducir,
                      movil,
                      status_trabajador,
                      status_seguridad,
                      funcion
                  )
                  VALUES (
                      TRIM(v_worker_name),
                      NULLIF(TRIM(v_worker_document), ''),
                      v_camiseta,
                      v_pantalones,
                      v_licencia_conducir,
                      v_movil,
                      'Pendente Ingresso',
                      'Em Regularização',
                      v_job_function_name
                  )
                  RETURNING id INTO v_worker_id;
              END IF;
          END IF;

          -- Se v_worker_id foi reutilizado de um existente ou fornecido no payload:
          IF v_worker_id IS NOT NULL THEN
              -- Validação de Alocação Ativa concorrente
              SELECT id INTO v_existing_active_assignment
              FROM core_personal.worker_assignments
              WHERE worker_id = v_worker_id
                AND status IN ('planned', 'active')
              LIMIT 1;

              IF v_existing_active_assignment IS NOT NULL THEN
                  RAISE EXCEPTION 'Este trabalhador já possui uma alocação ativa ou planejada (ID: %). Finalize ou cancele a alocação anterior primeiro.', v_existing_active_assignment;
              END IF;

              -- 5. Atualizar perfil e status do trabalhador
              IF v_planned_start_date > CURRENT_DATE THEN
                  v_assignment_status := 'planned';
                  v_worker_status_trabajador := 'Pendente Ingresso';
                  v_start_date := NULL;
              ELSE
                  v_assignment_status := 'active';
                  v_worker_status_trabajador := 'Ativo';
                  v_start_date := v_planned_start_date;
              END IF;

              -- Buscar nome CORRETO da empresa contratante (NUNCA o cliente!)
              SELECT COALESCE(trade_name, nome) INTO v_contratante_nome
              FROM core_common.empresas
              WHERE id = v_empresa_id;

              UPDATE core_personal.workers
              SET 
                  status_trabajador = v_worker_status_trabajador,
                  status_seguridad = CASE 
                      WHEN status_seguridad = 'Alta' THEN 'Alta'
                      WHEN (niss IS NOT NULL AND length(regexp_replace(niss, '[^0-9]', '', 'g')) = 11)
                           AND (nif IS NOT NULL AND length(regexp_replace(nif, '[^0-9]', '', 'g')) >= 9)
                           THEN status_seguridad
                      ELSE 'Em Regularização'
                  END,
                  cliente = COALESCE((SELECT trade_name FROM core_common.clients WHERE id = v_client_id), cliente),
                  contratante = COALESCE(v_contratante_nome, contratante),
                  funcion = COALESCE(v_job_function_name, funcion),
                  camiseta = COALESCE(v_camiseta, camiseta),
                  pantalones = COALESCE(v_pantalones, pantalones),
                  licencia_conducir = COALESCE(v_licencia_conducir, licencia_conducir),
                  movil = COALESCE(v_movil, movil),
                  pasaporte = COALESCE(NULLIF(TRIM(v_worker_document), ''), pasaporte),
                  data_baixa = NULL,
                  departure_reason = NULL
              WHERE id = v_worker_id
              RETURNING cod_colab INTO v_worker_cod_colab;

              -- Sincronizar com public.colaboradores
              IF v_worker_cod_colab IS NOT NULL THEN
                  UPDATE public.colaboradores
                  SET
                      status_trabajador = v_worker_status_trabajador,
                      status_seguridad = CASE 
                          WHEN status_seguridad = 'Alta' THEN 'Alta'
                          ELSE 'Em Regularização'
                      END,
                      contratante = COALESCE(v_contratante_nome, contratante),
                      funcion = COALESCE(v_job_function_name, funcion),
                      camiseta = COALESCE(v_camiseta, camiseta),
                      pantalones = COALESCE(v_pantalones, pantalones),
                      licencia_conducir = COALESCE(v_licencia_conducir, licencia_conducir),
                      movil = COALESCE(v_movil, movil),
                      pasaporte = COALESCE(NULLIF(TRIM(v_worker_document), ''), pasaporte)
                  WHERE cod_colab = v_worker_cod_colab;
              END IF;
          END IF;

          -- 6. Se for uma substituição, finalizamos a alocação de origem
          IF v_source_assignment_id IS NOT NULL THEN
              UPDATE core_personal.worker_assignments
              SET status = 'replaced',
                  end_date = v_planned_start_date - 1
              WHERE id = v_source_assignment_id;
          END IF;

          -- 7. Criar registro de Alocação
          INSERT INTO core_personal.worker_assignments (
              id, empresa_id, worker_id, pedido_item_id, pedido_id, job_function_id, client_id, client_site_id,
              planned_start_date, planned_end_date, start_date, status, notes,
              job_function_name_snapshot, replacement_of_assignment_id, solicitud_id,
              tarifa_acordada
          )
          VALUES (
              v_new_assignment_id,
              v_empresa_id,
              v_worker_id,
              v_pedido_item_id,
              v_pedido_id,
              v_job_function_id,
              v_client_id,
              v_client_site_id,
              v_planned_start_date,
              v_planned_end_date,
              v_start_date,
              v_assignment_status,
              v_notes,
              v_job_function_name,
              v_source_assignment_id,
              v_solicitud_id,
              v_tarifa_acordada
          );

          -- 8. Atualizar quantidade preenchida no Pedido Item se aplicável
          IF v_solicitud_id IS NULL AND v_pedido_item_id IS NOT NULL THEN
              UPDATE core_comercial.pedido_items
              SET quantity_fulfilled = quantity_fulfilled + 1
              WHERE id = v_pedido_item_id;
          END IF;

          -- Se associado a uma solicitude, marcar o target correspondente como concluído
          IF v_solicitud_target_id IS NOT NULL THEN
              UPDATE core_operacoes.solicitud_targets
              SET status = 'completed',
                  target_worker_id = v_worker_id,
                  target_assignment_id = v_new_assignment_id,
                  updated_at = NOW()
              WHERE id = v_solicitud_target_id;
          ELSIF v_solicitud_id IS NOT NULL THEN
              UPDATE core_operacoes.solicitud_targets
              SET status = 'completed',
                  target_worker_id = v_worker_id,
                  target_assignment_id = v_new_assignment_id,
                  updated_at = NOW()
              WHERE id = (
                  SELECT id FROM core_operacoes.solicitud_targets
                  WHERE solicitud_id = v_solicitud_id
                    AND status IN ('pending', 'in_progress')
                    AND (v_source_assignment_id IS NULL OR source_assignment_id = v_source_assignment_id)
                  ORDER BY created_at ASC
                  LIMIT 1
              );
          END IF;

          -- Se todos os targets da solicitude estiverem concluídos, concluir a solicitude
          IF v_solicitud_id IS NOT NULL AND NOT EXISTS (
              SELECT 1 FROM core_operacoes.solicitud_targets
              WHERE solicitud_id = v_solicitud_id AND status IN ('pending', 'in_progress')
          ) THEN
              UPDATE core_operacoes.solicitudes_operativas
              SET status = 'completed',
                  updated_at = NOW()
              WHERE id = v_solicitud_id;
          END IF;

          -- 9. Atualizar Operational Status do Pedido Comercial se aplicável
          IF v_pedido_id IS NOT NULL THEN
              SELECT COUNT(*), COUNT(*) FILTER (WHERE status = 'fulfilled' OR quantity_fulfilled >= quantity_requested)
              INTO v_total_items, v_fulfilled_items
              FROM core_comercial.pedido_items
              WHERE pedido_id = v_pedido_id;

              IF v_fulfilled_items = v_total_items THEN
                  v_new_operational_status := 'fulfilled';
              ELSE
                  v_new_operational_status := 'partially_fulfilled';
              END IF;

              UPDATE core_comercial.pedidos
              SET operational_status = v_new_operational_status,
                  updated_at = NOW()
              WHERE id = v_pedido_id;
          END IF;

          -- 10. Retornar dados da alocação criada
          RETURN jsonb_build_object(
              'success', true,
              'assignment_id', v_new_assignment_id,
              'worker_id', v_worker_id,
              'status', v_assignment_status,
              'job_function_name', v_job_function_name
          );
      END;
$function$;
