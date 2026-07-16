-- Unify EUROCONTAINER into CARVISA CONTAINER S.L.U (ID: 202, Codigo: C0225)
-- 1. Update colaborador_por_pedido
UPDATE public.colaborador_por_pedido
SET 
  idcliente = 202,
  codcliente = 'C0225',
  cliente_nombre = 'CARVISA CONTAINER S.L.U'
WHERE cliente_nombre IN (
  'EUROCONTAINER',
  'CARVISA CONTAINER SLU',
  'CARVISA CONTAINER S.L.U',
  'CARVISA CONTAINER, S.L.U'
) OR idcliente IN (202, 694, 700);

-- 2. Update workers
UPDATE core_personal.workers
SET cliente = 'CARVISA CONTAINER S.L.U'
WHERE cliente IN (
  'EUROCONTAINER',
  'CARVISA CONTAINER SLU',
  'CARVISA CONTAINER, S.L.U'
);

-- 3. Update seguridade_status
UPDATE core_personal.seguridade_status
SET origem_cliente_nome = 'CARVISA CONTAINER S.L.U'
WHERE origem_cliente_nome IN (
  'EUROCONTAINER',
  'CARVISA CONTAINER SLU',
  'CARVISA CONTAINER, S.L.U'
);

-- 4. Update asignaciones_grupo
UPDATE public.asignaciones_grupo
SET cliente_id = 'CARVISA CONTAINER S.L.U'
WHERE cliente_id IN (
  'EUROCONTAINER',
  'CARVISA CONTAINER SLU',
  'CARVISA CONTAINER, S.L.U'
);
