-- Unify TALLERS VIDAL AMILL, SLU (ID: 88, Codigo: C0267) variants
-- 1. Update colaborador_por_pedido
UPDATE public.colaborador_por_pedido
SET 
  idcliente = 88,
  codcliente = 'C0267',
  cliente_nombre = 'TALLERS VIDAL AMILL, SLU'
WHERE cliente_nombre IN ('TALLERES VIDAL AMILL', 'TALLERS VIDAL AMILL, SLU804', 'TALLERS VIDAL AMILL, SLU');

-- 2. Update workers
UPDATE core_personal.workers
SET cliente = 'TALLERS VIDAL AMILL, SLU'
WHERE cliente IN ('TALLERES VIDAL AMILL', 'TALLERS VIDAL AMILL, SLU804');

-- 3. Update seguridade_status
UPDATE core_personal.seguridade_status
SET origem_cliente_nome = 'TALLERS VIDAL AMILL, SLU'
WHERE origem_cliente_nome IN ('TALLERES VIDAL AMILL', 'TALLERS VIDAL AMILL, SLU804');

-- 4. Update asignaciones_grupo
UPDATE public.asignaciones_grupo
SET cliente_id = 'TALLERS VIDAL AMILL, SLU'
WHERE cliente_id IN ('TALLERES VIDAL AMILL', 'TALLERS VIDAL AMILL, SLU804');
