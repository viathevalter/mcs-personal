import { supabase } from '@/shared/supabase/client';
import { logisticsService } from '@/features/logistica/services/logisticsService';
import type {
  AlmacenDeliveryPoint,
  AlmacenEpi,
  AlmacenEmpresa,
  AlmacenStockItem,
  AlmacenStockMovement,
  CarrierStatus,
  DemandaPedidoAlmacen,
  DemandaWorkerAlmacen,
  DeliveryMethod,
  MovementType,
  PickingItem,
  PickingOrder,
  PickingStatus,
  RequestType,
  RequiredEpiPreview,
  WorkerReplenishmentRow,
} from '../types';
import { STANDARD_SIZES } from '../types';

function normalizeSizeCode(raw?: string | null): string | null {
  if (!raw) return null;
  const clean = String(raw).trim().toUpperCase();
  if (!clean) return null;
  // Extrair S, M, L, XL, XXL, XXXL de formatos como "CAM/XL", "PAN/M", "L (58)", "XL"
  const match = clean.match(/\b(XXXL|XXL|XL|S|M|L)\b/) || clean.match(/\/(XXXL|XXL|XL|S|M|L)$/);
  if (match) return match[1];
  if ((STANDARD_SIZES as readonly string[]).includes(clean)) return clean;
  return null;
}

export const almacenService = {
  async getEpis(): Promise<AlmacenEpi[]> {
    const { data, error } = await supabase
      .schema('core_logistica')
      .from('epis')
      .select('*')
      .neq('status', 'archived')
      .order('name');
    if (error) throw error;
    return (data || []) as AlmacenEpi[];
  },

  async updateEpiConfig(
    epiId: string,
    payload: Partial<Pick<AlmacenEpi, 'is_branded' | 'has_sizes' | 'size_category' | 'default_cost'>>
  ): Promise<void> {
    const { error } = await supabase
      .schema('core_logistica')
      .from('epis')
      .update(payload)
      .eq('id', epiId);
    if (error) throw error;
  },

  async getEmpresas(): Promise<AlmacenEmpresa[]> {
    const { data, error } = await supabase
      .schema('core_common')
      .from('empresas')
      .select('id, nome, trade_name, legal_name, tax_id')
      .eq('is_active', true)
      .order('nome');
    if (error) throw error;
    return (data || []) as AlmacenEmpresa[];
  },

  async getStock(): Promise<AlmacenStockItem[]> {
    const [stockRes, episRes, empresasRes] = await Promise.all([
      supabase
        .schema('core_logistica')
        .from('almacen_stock')
        .select('*')
        .order('sku_code', { ascending: true }),
      this.getEpis(),
      this.getEmpresas(),
    ]);
    if (stockRes.error) throw stockRes.error;

    const episMap = new Map(episRes.map((e) => [e.id, e]));
    const empresasMap = new Map(empresasRes.map((e) => [e.id, e]));

    return (stockRes.data || []).map((row: any) => ({
      ...row,
      epi: episMap.get(row.epi_id),
      empresa: row.empresa_id ? empresasMap.get(row.empresa_id) || null : null,
    })) as AlmacenStockItem[];
  },

  async getStockMovements(stockId: string): Promise<AlmacenStockMovement[]> {
    const { data, error } = await supabase
      .schema('core_logistica')
      .from('almacen_stock_movements')
      .select('*')
      .eq('stock_id', stockId)
      .order('created_at', { ascending: false })
      .limit(50);
    if (error) throw error;
    return (data || []) as AlmacenStockMovement[];
  },

  async upsertStockConfig(payload: {
    id?: string;
    epi_id: string;
    empresa_id: string | null;
    size_code: string;
    sku_code?: string | null;
    min_stock: number;
    location_bin?: string | null;
    unit_cost?: number | null;
  }): Promise<AlmacenStockItem> {
    const normalizedSize = payload.size_code.trim().toUpperCase() || 'UNICO';
    if (payload.id) {
      const { data, error } = await supabase
        .schema('core_logistica')
        .from('almacen_stock')
        .update({
          sku_code: payload.sku_code ?? null,
          min_stock: payload.min_stock,
          location_bin: payload.location_bin ?? null,
          unit_cost: payload.unit_cost ?? null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', payload.id)
        .select('*')
        .single();
      if (error) throw error;
      return data as AlmacenStockItem;
    }

    const { data, error } = await supabase
      .schema('core_logistica')
      .from('almacen_stock')
      .insert({
        epi_id: payload.epi_id,
        empresa_id: payload.empresa_id,
        size_code: normalizedSize,
        sku_code: payload.sku_code ?? null,
        min_stock: payload.min_stock,
        location_bin: payload.location_bin ?? null,
        unit_cost: payload.unit_cost ?? null,
        quantity_on_hand: 0,
      })
      .select('*')
      .single();
    if (error) throw error;
    return data as AlmacenStockItem;
  },

  async adjustStock(params: {
    stockId: string;
    quantityDelta: number;
    movementType: MovementType;
    notes?: string;
    referenceType?: string;
    referenceId?: string;
  }): Promise<void> {
    const { data: current, error: fetchErr } = await supabase
      .schema('core_logistica')
      .from('almacen_stock')
      .select('id, quantity_on_hand')
      .eq('id', params.stockId)
      .single();
    if (fetchErr) throw fetchErr;

    const prevQty = Number(current.quantity_on_hand || 0);
    const newQty = Math.max(0, prevQty + params.quantityDelta);

    const { error: updErr } = await supabase
      .schema('core_logistica')
      .from('almacen_stock')
      .update({
        quantity_on_hand: newQty,
        updated_at: new Date().toISOString(),
      })
      .eq('id', params.stockId);
    if (updErr) throw updErr;

    const { data: userData } = await supabase.auth.getUser();

    const { error: movErr } = await supabase
      .schema('core_logistica')
      .from('almacen_stock_movements')
      .insert({
        stock_id: params.stockId,
        movement_type: params.movementType,
        quantity_delta: params.quantityDelta,
        previous_qty: prevQty,
        new_qty: newQty,
        reference_type: params.referenceType || 'manual',
        reference_id: params.referenceId || null,
        notes: params.notes || null,
        created_by: userData?.user?.id || null,
      });
    if (movErr) throw movErr;
  },

  async initializeStandardStock(): Promise<number> {
    const [epis, empresas, existingStock] = await Promise.all([
      this.getEpis(),
      this.getEmpresas(),
      supabase.schema('core_logistica').from('almacen_stock').select('epi_id, empresa_id, size_code'),
    ]);

    const existingKeys = new Set(
      (existingStock.data || []).map(
        (s: any) => `${s.epi_id}::${s.empresa_id || 'SHARED'}::${String(s.size_code).toUpperCase()}`
      )
    );

    const toInsert: any[] = [];
    for (const epi of epis) {
      if (epi.status !== 'active') continue;
      const sizes = epi.has_sizes ? [...STANDARD_SIZES] : ['UNICO'];
      const targetEmpresas: (AlmacenEmpresa | null)[] = epi.is_branded ? empresas : [null];

      for (const emp of targetEmpresas) {
        for (const sz of sizes) {
          const empKey = emp ? emp.id : 'SHARED';
          const key = `${epi.id}::${empKey}::${sz}`;
          if (existingKeys.has(key)) continue;

          const prefix = epi.size_category === 'camisa' ? 'CAM' : epi.size_category === 'pantalon' ? 'PAN' : epi.code || 'EPI';
          const empTag = emp ? `-${emp.nome.substring(0, 3).toUpperCase()}` : '';
          const sku = epi.has_sizes ? `${prefix}/${sz}${empTag}` : `${prefix}`;

          toInsert.push({
            epi_id: epi.id,
            empresa_id: emp ? emp.id : null,
            size_code: sz,
            sku_code: sku,
            quantity_on_hand: 0,
            min_stock: epi.has_sizes ? 5 : 10,
            unit_cost: epi.default_cost ?? 0,
          });
        }
      }
    }

    if (toInsert.length === 0) return 0;

    const { error } = await supabase
      .schema('core_logistica')
      .from('almacen_stock')
      .insert(toInsert);
    if (error) throw error;
    return toInsert.length;
  },

  async updateWorkerSizes(workerId: string, camiseta: string, pantalones: string): Promise<void> {
    const { error } = await supabase
      .schema('core_personal')
      .from('workers')
      .update({
        camiseta: camiseta || null,
        pantalones: pantalones || null,
      })
      .eq('id', workerId);
    if (error) throw error;
  },

  async getDemandasPedidos(): Promise<DemandaPedidoAlmacen[]> {
    const [pedidosRes, assignmentsRes, jobEpisRes, episRes, jobsRes, pickingRes, alocacoesAtivas, alojamentos, solicitudesRes, targetsRes] = await Promise.all([
      supabase
        .schema('core_comercial')
        .from('pedidos')
        .select('*')
        .neq('operational_status', 'cancelled')
        .order('created_at', { ascending: false }),
      supabase
        .schema('core_personal')
        .from('worker_assignments')
        .select(`
          id, pedido_id, solicitud_id, replacement_of_assignment_id, empresa_id, client_id, client_site_id, status,
          planned_start_date, start_date, job_function_id, job_function_name_snapshot,
          worker:workers(
            id, cod_colab, nome, movil, dni, nie, pasaporte, nif, camiseta, pantalones, funcion
          )
        `)
        .in('status', ['planned', 'active']),
      supabase
        .schema('core_logistica')
        .from('job_function_epis')
        .select('*')
        .neq('status', 'archived'),
      this.getEpis(),
      supabase.schema('core_comercial').from('job_functions').select('id, name'),
      supabase
        .schema('core_logistica')
        .from('almacen_picking_orders')
        .select('*, items:almacen_picking_items(*)')
        .neq('status', 'CANCELADO')
        .order('created_at', { ascending: false }),
      logisticsService.fetchAlocacoesAtivas().catch(() => []),
      logisticsService.fetchAlojamentos().catch(() => []),
      supabase
        .schema('core_operacoes')
        .from('solicitudes_operativas')
        .select('id, pedido_id, codigo, tipo, status')
        .neq('status', 'cancelled'),
      supabase
        .schema('core_operacoes')
        .from('solicitud_targets')
        .select('id, solicitud_id, source_pedido_id, source_assignment_id, target_assignment_id, target_worker_id, action_type, requires_replacement, status')
        .in('action_type', ['replace', 'offboard'])
        .in('status', ['pending', 'in_progress', 'completed']),
    ]);

    if (pedidosRes.error) throw pedidosRes.error;
    const pedidos = pedidosRes.data || [];
    const assignments = assignmentsRes.data || [];

    const clientIds = [...new Set(pedidos.map((p: any) => p.client_id).filter(Boolean))];
    const siteIds = [...new Set(pedidos.map((p: any) => p.client_site_id).filter(Boolean))];
    const empresaIds = [...new Set(pedidos.map((p: any) => p.empresa_id).filter(Boolean))];

    const [clientsRes, sitesRes, empresasRes] = await Promise.all([
      clientIds.length
        ? supabase.schema('core_common').from('clients').select('id, trade_name, legal_name').in('id', clientIds)
        : Promise.resolve({ data: [] }),
      siteIds.length
        ? supabase.schema('core_common').from('client_sites').select('id, name, address_line, city, postal_code, contact_name, contact_phone').in('id', siteIds)
        : Promise.resolve({ data: [] }),
      empresaIds.length
        ? supabase.schema('core_common').from('empresas').select('id, nome, trade_name').in('id', empresaIds)
        : Promise.resolve({ data: [] }),
    ]);

    const clientsMap = new Map((clientsRes.data || []).map((c: any) => [c.id, c]));
    const sitesMap = new Map((sitesRes.data || []).map((s: any) => [s.id, s]));
    const empresasMap = new Map((empresasRes.data || []).map((e: any) => [e.id, e]));
    const episMap = new Map(episRes.map((e) => [e.id, e]));
    const jobsMap = new Map((jobsRes.data || []).map((j: any) => [j.id, j.name]));

    // Mapear Alojamentos e Alocações Ativas por worker_id e cod_colab
    const alojMap = new Map(alojamentos.map((a: any) => [a.id, a]));
    const alocByWorkerId = new Map<string, any>();
    const alocByCodColab = new Map<string, any>();
    for (const al of alocacoesAtivas as any[]) {
      if (al.worker_id) alocByWorkerId.set(al.worker_id, al);
      if (al.codigo_colab) alocByCodColab.set(String(al.codigo_colab).trim().toUpperCase(), al);
    }

    // Group job_function_epis by job_function_id (deduplicated by epi_id)
    const jobEpisMap = new Map<string, RequiredEpiPreview[]>();
    const seenJobEpi = new Set<string>();
    for (const row of jobEpisRes.data || []) {
      const epi = episMap.get(row.epi_id);
      if (!epi) continue;
      const dedupKey = `${row.job_function_id}::${epi.id}`;
      if (seenJobEpi.has(dedupKey)) continue;
      seenJobEpi.add(dedupKey);

      const list = jobEpisMap.get(row.job_function_id) || [];
      list.push({
        epi_id: epi.id,
        epi_name: epi.name,
        epi_code: epi.code,
        is_branded: epi.is_branded,
        has_sizes: epi.has_sizes,
        size_category: epi.size_category,
        quantity: row.quantity || 1,
        is_required: row.is_required ?? true,
        renewal_period_days: row.renewal_period_days ?? null,
        unit_cost: Number(epi.default_cost || 0),
      });
      jobEpisMap.set(row.job_function_id, list);
    }

    // Index picking orders by pedido_id::worker_id and also last dispatch per worker_id
    const pickingOrders = (pickingRes.data || []) as PickingOrder[];
    const orderByPedidoWorker = new Map<string, PickingOrder>();
    const lastDispatchByWorker = new Map<string, string>();
    const sixMonthsAgo = Date.now() - 180 * 24 * 60 * 60 * 1000;

    for (const po of pickingOrders) {
      if (po.pedido_id && po.worker_id) {
        const key = `${po.pedido_id}::${po.worker_id}`;
        if (!orderByPedidoWorker.has(key)) {
          orderByPedidoWorker.set(key, po);
        }
      }
      if (po.worker_id && (po.status === 'DESPACHADO' || po.status === 'ENTREGUE')) {
        const dt = po.dispatched_at || po.created_at;
        const existingDt = lastDispatchByWorker.get(po.worker_id);
        if (!existingDt || dt > existingDt) {
          lastDispatchByWorker.set(po.worker_id, dt);
        }
      }
    }

    // Mapear Solicitudes e Reemplazos -> Pedido
    const solicitudesMap = new Map<string, any>((solicitudesRes.data || []).map((s: any) => [s.id, s]));
    const solicitudToPedidoMap = new Map<string, string>();
    for (const s of solicitudesRes.data || []) {
      if (s.pedido_id) solicitudToPedidoMap.set(s.id, s.pedido_id);
    }
    for (const t of targetsRes.data || []) {
      if (t.solicitud_id && t.source_pedido_id && !solicitudToPedidoMap.has(t.solicitud_id)) {
        solicitudToPedidoMap.set(t.solicitud_id, t.source_pedido_id);
      }
    }
    const assignmentById = new Map<string, any>(assignments.map((a: any) => [a.id, a]));

    // Group assignments by pedido_id (including reemplazos linked via solicitud_id or replacement_of_assignment_id)
    const assignmentsByPedido = new Map<string, any[]>();
    for (const a of assignments) {
      if (!a.worker) continue;
      let resolvedPedidoId = a.pedido_id;
      if (!resolvedPedidoId && a.solicitud_id) {
        resolvedPedidoId = solicitudToPedidoMap.get(a.solicitud_id) || null;
      }
      if (!resolvedPedidoId && a.replacement_of_assignment_id) {
        const orig = assignmentById.get(a.replacement_of_assignment_id);
        if (orig?.pedido_id) resolvedPedidoId = orig.pedido_id;
      }
      if (!resolvedPedidoId) continue;

      const list = assignmentsByPedido.get(resolvedPedidoId) || [];
      list.push(a);
      assignmentsByPedido.set(resolvedPedidoId, list);
    }

    const result: DemandaPedidoAlmacen[] = [];

    for (const p of pedidos) {
      const pAssignments = assignmentsByPedido.get(p.id) || [];
      if (pAssignments.length === 0) continue;

      const emp = empresasMap.get(p.empresa_id);
      const cli = clientsMap.get(p.client_id);
      const site = sitesMap.get(p.client_site_id);

      const seenWorkers = new Set<string>();
      const workers: DemandaWorkerAlmacen[] = [];

      for (const a of pAssignments) {
        const w = a.worker;
        if (!w || seenWorkers.has(w.id)) continue;
        seenWorkers.add(w.id);

        const jfId = a.job_function_id || null;
        const jfName = a.job_function_name_snapshot || (jfId ? jobsMap.get(jfId) : null) || w.funcion || null;
        const requiredEpis = jfId ? jobEpisMap.get(jfId) || [] : [];
        const existingOrder = orderByPedidoWorker.get(`${p.id}::${w.id}`) || null;
        const lastDispatchAt = lastDispatchByWorker.get(w.id) || null;
        const hasRecentDispatch = lastDispatchAt ? new Date(lastDispatchAt).getTime() >= sixMonthsAgo : false;

        // Resolver Alojamento Local do trabalhador
        const codKey = w.cod_colab ? String(w.cod_colab).trim().toUpperCase() : '';
        const aloc = alocByWorkerId.get(w.id) || (codKey ? alocByCodColab.get(codKey) : null);
        let alojTipo: 'alojamento' | 'propio' | 'cliente' | 'pendente' = 'pendente';
        let alojNome: string | null = null;
        let alojEndereco: string | null = null;
        let alojCidade: string | null = null;

        if (aloc) {
          const tipoStr = String(aloc.tipo_alojamento || aloc.alojamento_nome || '').toLowerCase();
          if (tipoStr.includes('propio') || tipoStr.includes('próprio')) {
            alojTipo = 'propio';
            alojNome = 'Alojamento Próprio';
          } else if (tipoStr.includes('cliente')) {
            alojTipo = 'cliente';
            alojNome = 'Alojamento do Cliente';
          } else {
            const alojObj = aloc.alojamento_id ? alojMap.get(aloc.alojamento_id) : null;
            alojTipo = 'alojamento';
            alojNome = alojObj?.nome || alojObj?.titulo || aloc.alojamento_nome || 'Alojamento Alocado';
            const addrParts = [alojObj?.endereco, alojObj?.codigo_postal, alojObj?.municipio || alojObj?.provincia]
              .filter(Boolean)
              .join(', ');
            alojEndereco = addrParts || aloc.endereco || null;
            alojCidade = alojObj?.municipio || alojObj?.provincia || null;
          }
        }

        const solObj = a.solicitud_id ? solicitudesMap.get(a.solicitud_id) : null;
        const isReplacement = Boolean(a.solicitud_id || a.replacement_of_assignment_id);

        workers.push({
          worker_id: w.id,
          cod_colab: w.cod_colab || null,
          nome: w.nome,
          identificacion: w.dni || w.nie || w.pasaporte || w.nif || null,
          movil: w.movil || null,
          camiseta: normalizeSizeCode(w.camiseta),
          pantalones: normalizeSizeCode(w.pantalones),
          job_function_id: jfId,
          job_function_name: jfName,
          required_epis: requiredEpis,
          existing_order: existingOrder,
          last_dispatch_at: lastDispatchAt,
          has_recent_dispatch: hasRecentDispatch,
          alojamento_tipo: alojTipo,
          alojamento_nome: alojNome,
          alojamento_endereco: alojEndereco,
          alojamento_cidade: alojCidade,
          is_replacement: isReplacement,
          replacement_code: solObj?.codigo || null,
        });
      }

      const pendingCount = workers.filter((w) => !w.existing_order).length;

      result.push({
        pedido_id: p.id,
        codigo: p.codigo,
        empresa_id: p.empresa_id || null,
        empresa_nome: emp?.trade_name || emp?.nome || 'Empresa',
        client_id: p.client_id || null,
        client_nome: cli?.trade_name || cli?.legal_name || 'Cliente',
        site_nome: site?.name || null,
        site_cidade: site?.city || null,
        site_address: site?.address_line || null,
        site_postal_code: site?.postal_code || null,
        site_contact_name: site?.contact_name || null,
        site_contact_phone: site?.contact_phone || null,
        expected_start_date: p.expected_start_date || null,
        operational_status: p.operational_status || null,
        workers,
        pending_count: pendingCount,
        total_workers: workers.length,
      });
    }

    // Pedidos com pendentes primeiro
    result.sort((a, b) => b.pending_count - a.pending_count);
    return result;
  },

  async createPickingOrder(params: {
    pedido_id: string | null;
    pedido_codigo: string | null;
    empresa_id: string | null;
    empresa_nome: string | null;
    client_id: string | null;
    client_nome: string | null;
    worker: DemandaWorkerAlmacen;
    request_type?: RequestType;
    expected_start_date?: string | null;
    delivery_method?: DeliveryMethod | null;
    delivery_point_id?: string | null;
    delivery_address?: string | null;
    observations?: string | null;
    custom_items?: { epi_id: string; item_name: string; size_code: string; quantity: number; unit_cost: number; is_branded: boolean }[];
  }): Promise<PickingOrder> {
    const stockList = await this.getStock();
    const { data: userData } = await supabase.auth.getUser();

    // Gerar número sequencial único
    const year = new Date().getFullYear();
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const tsSuffix = Date.now().toString().slice(-4);
    const orderNumber = `SEP-${year}-${tsSuffix}${randomSuffix}`;

    const itemsSource = params.custom_items
      ? params.custom_items
      : params.worker.required_epis.map((re) => {
          let sizeCode = 'UNICO';
          if (re.has_sizes) {
            if (re.size_category === 'camisa') sizeCode = (params.worker.camiseta || 'L').toUpperCase();
            else if (re.size_category === 'pantalon') sizeCode = (params.worker.pantalones || 'L').toUpperCase();
          }
          return {
            epi_id: re.epi_id,
            item_name: re.epi_name,
            size_code: sizeCode,
            quantity: re.quantity,
            unit_cost: re.unit_cost,
            is_branded: re.is_branded,
          };
        });

    const { data: orderData, error: orderErr } = await supabase
      .schema('core_logistica')
      .from('almacen_picking_orders')
      .insert({
        order_number: orderNumber,
        pedido_id: params.pedido_id,
        pedido_codigo: params.pedido_codigo,
        empresa_id: params.empresa_id,
        empresa_nome: params.empresa_nome,
        client_id: params.client_id,
        client_nome: params.client_nome,
        worker_id: params.worker.worker_id,
        cod_colab: params.worker.cod_colab,
        worker_nome: params.worker.nome,
        worker_identificacion: params.worker.identificacion,
        worker_phone: params.worker.movil,
        job_function_id: params.worker.job_function_id,
        job_function_name: params.worker.job_function_name,
        request_type: params.request_type || 'ASIGNACION',
        status: 'PENDENTE',
        camiseta_size: params.worker.camiseta || null,
        pantalones_size: params.worker.pantalones || null,
        delivery_method: params.delivery_method || null,
        delivery_point_id: params.delivery_point_id || null,
        delivery_address: params.delivery_address || null,
        carrier_status: 'PENDENTE_ENVIO',
        expected_start_date: params.expected_start_date || null,
        observations: params.observations || (params.worker.has_recent_dispatch ? 'Ya cuenta con Epis y Dotacion Reciente. Proxima Reposicion: 6 meses' : null),
        created_by: userData?.user?.id || null,
      })
      .select('*')
      .single();

    if (orderErr) throw orderErr;

    if (itemsSource.length > 0) {
      const itemsToInsert = itemsSource.map((item) => {
        const matchedStock = stockList.find(
          (s) =>
            s.epi_id === item.epi_id &&
            s.size_code.toUpperCase() === item.size_code.toUpperCase() &&
            (item.is_branded ? s.empresa_id === params.empresa_id : s.empresa_id === null)
        );
        return {
          picking_order_id: orderData.id,
          epi_id: item.epi_id,
          stock_id: matchedStock?.id || null,
          item_name: item.item_name,
          size_code: item.size_code,
          sku_code: matchedStock?.sku_code || null,
          quantity_requested: item.quantity,
          quantity_picked: 0,
          is_checked: false,
          unit_cost: item.unit_cost || matchedStock?.unit_cost || 0,
        };
      });

      const { error: itemsErr } = await supabase
        .schema('core_logistica')
        .from('almacen_picking_items')
        .insert(itemsToInsert);
      if (itemsErr) throw itemsErr;
    }

    return orderData as PickingOrder;
  },

  async getPickingOrders(statusFilter?: PickingStatus | 'TODOS'): Promise<PickingOrder[]> {
    let query = supabase
      .schema('core_logistica')
      .from('almacen_picking_orders')
      .select('*, items:almacen_picking_items(*)')
      .order('created_at', { ascending: false });

    if (statusFilter && statusFilter !== 'TODOS') {
      query = query.eq('status', statusFilter);
    }

    const { data, error } = await query;
    if (error) throw error;
    return (data || []) as PickingOrder[];
  },

  async togglePickingItemCheck(itemId: string, isChecked: boolean, quantityPicked: number): Promise<void> {
    const { error } = await supabase
      .schema('core_logistica')
      .from('almacen_picking_items')
      .update({
        is_checked: isChecked,
        quantity_picked: quantityPicked,
      })
      .eq('id', itemId);
    if (error) throw error;
  },

  async updatePickingStatus(orderId: string, status: PickingStatus): Promise<void> {
    const updates: any = {
      status,
      updated_at: new Date().toISOString(),
    };
    if (status === 'CONFERIDO') updates.prepared_at = new Date().toISOString();
    if (status === 'ENTREGUE') updates.delivered_at = new Date().toISOString();

    const { error } = await supabase
      .schema('core_logistica')
      .from('almacen_picking_orders')
      .update(updates)
      .eq('id', orderId);
    if (error) throw error;
  },

  async dispatchPickingOrder(params: {
    order: PickingOrder;
    deliveryMethod: DeliveryMethod;
    trackingCode?: string;
    deliveryAddress?: string;
  }): Promise<void> {
    const { order } = params;
    const now = new Date().toISOString();

    // Deduzir estoque dos itens vinculados que ainda não foram baixados
    if (order.status !== 'DESPACHADO' && order.status !== 'ENTREGUE') {
      const movType: MovementType =
        order.request_type === 'REPOSICION'
          ? 'SAIDA_REPOSICION'
          : order.request_type === 'DETERIORO'
          ? 'SAIDA_DETERIORO'
          : 'SAIDA_ASIGNACION';

      for (const item of order.items || []) {
        const qty = item.quantity_picked > 0 ? item.quantity_picked : item.quantity_requested;
        if (item.stock_id && qty > 0) {
          await this.adjustStock({
            stockId: item.stock_id,
            quantityDelta: -qty,
            movementType: movType,
            referenceType: 'picking_order',
            referenceId: order.id,
            notes: `Despacho ${order.order_number} - ${order.worker_nome}`,
          });
        }
      }
    }

    const { error } = await supabase
      .schema('core_logistica')
      .from('almacen_picking_orders')
      .update({
        status: 'DESPACHADO',
        delivery_method: params.deliveryMethod,
        tracking_code: params.trackingCode || null,
        delivery_address: params.deliveryAddress || null,
        carrier_status: 'EM_TRANSITO',
        carrier_last_sync_at: now,
        dispatched_at: now,
        prepared_at: order.prepared_at || now,
        updated_at: now,
      })
      .eq('id', order.id);

    if (error) throw error;
  },

  async getDeliveryPoints(): Promise<AlmacenDeliveryPoint[]> {
    const { data, error } = await supabase
      .schema('core_logistica')
      .from('almacen_delivery_points')
      .select('*')
      .eq('is_active', true)
      .order('name');
    if (error) throw error;
    return (data || []) as AlmacenDeliveryPoint[];
  },

  async createDeliveryPoint(payload: {
    name: string;
    point_type: 'NACEX_AGENCIA' | 'NACEX_SHOP' | 'OBRA_FIXA' | 'OUTRO';
    nacex_code?: string;
    address_line: string;
    postal_code?: string;
    city?: string;
    phone?: string;
  }): Promise<AlmacenDeliveryPoint> {
    const { data, error } = await supabase
      .schema('core_logistica')
      .from('almacen_delivery_points')
      .insert({
        name: payload.name,
        point_type: payload.point_type,
        nacex_code: payload.nacex_code || null,
        address_line: payload.address_line,
        postal_code: payload.postal_code || null,
        city: payload.city || null,
        phone: payload.phone || null,
      })
      .select('*')
      .single();
    if (error) throw error;
    return data as AlmacenDeliveryPoint;
  },

  async updateCarrierStatus(
    orderId: string,
    carrierStatus: CarrierStatus,
    detail?: string
  ): Promise<void> {
    const now = new Date().toISOString();
    const updates: any = {
      carrier_status: carrierStatus,
      carrier_status_detail: detail || null,
      carrier_last_sync_at: now,
      updated_at: now,
    };
    if (carrierStatus === 'ENTREGUE') {
      updates.status = 'ENTREGUE';
      updates.delivered_at = now;
    }
    const { error } = await supabase
      .schema('core_logistica')
      .from('almacen_picking_orders')
      .update(updates)
      .eq('id', orderId);
    if (error) throw error;
  },

  async getJobFunctionRequiredEpis(jobFunctionId: string): Promise<RequiredEpiPreview[]> {
    const [jobEpisRes, epis] = await Promise.all([
      supabase
        .schema('core_logistica')
        .from('job_function_epis')
        .select('*')
        .eq('job_function_id', jobFunctionId)
        .neq('status', 'archived'),
      this.getEpis(),
    ]);
    const episMap = new Map(epis.map((e) => [e.id, e]));
    const seen = new Set<string>();
    const list: RequiredEpiPreview[] = [];
    for (const row of jobEpisRes.data || []) {
      const epi = episMap.get(row.epi_id);
      if (!epi || seen.has(epi.id)) continue;
      seen.add(epi.id);
      list.push({
        epi_id: epi.id,
        epi_name: epi.name,
        epi_code: epi.code,
        is_branded: epi.is_branded,
        has_sizes: epi.has_sizes,
        size_category: epi.size_category,
        quantity: row.quantity || 1,
        is_required: row.is_required ?? true,
        renewal_period_days: row.renewal_period_days ?? null,
        unit_cost: Number(epi.default_cost || 0),
      });
    }
    return list;
  },

  async getWorkersReplenishmentOverview(): Promise<WorkerReplenishmentRow[]> {
    const [workersRes, assignmentsRes, ordersRes, pedidosRes, clientsRes, sitesRes, empresasRes, jobsRes, alocacoesAtivas, alojamentos] = await Promise.all([
      supabase
        .schema('core_personal')
        .from('workers')
        .select('id, cod_colab, nome, movil, dni, nie, pasaporte, nif, camiseta, pantalones, funcion, contratante, cliente, status_trabajador')
        .is('deleted_at', null)
        .order('nome', { ascending: true })
        .limit(2000),
      supabase
        .schema('core_personal')
        .from('worker_assignments')
        .select('id, worker_id, pedido_id, empresa_id, client_id, client_site_id, status, job_function_id, job_function_name_snapshot')
        .in('status', ['active', 'planned']),
      supabase
        .schema('core_logistica')
        .from('almacen_picking_orders')
        .select('*, items:almacen_picking_items(*)')
        .neq('status', 'CANCELADO')
        .order('created_at', { ascending: false }),
      supabase.schema('core_comercial').from('pedidos').select('id, codigo, client_id, client_site_id, empresa_id'),
      supabase.schema('core_common').from('clients').select('id, trade_name, legal_name'),
      supabase.schema('core_common').from('client_sites').select('id, name, address_line, city, postal_code'),
      this.getEmpresas(),
      supabase.schema('core_comercial').from('job_functions').select('id, name'),
      logisticsService.fetchAlocacoesAtivas().catch(() => []),
      logisticsService.fetchAlojamentos().catch(() => []),
    ]);

    if (workersRes.error) throw workersRes.error;

    const pedidosMap = new Map((pedidosRes.data || []).map((p: any) => [p.id, p]));
    const clientsMap = new Map((clientsRes.data || []).map((c: any) => [c.id, c]));
    const sitesMap = new Map((sitesRes.data || []).map((s: any) => [s.id, s]));
    const empresasMap = new Map(empresasRes.map((e) => [e.id, e]));
    const jobsMap = new Map((jobsRes.data || []).map((j: any) => [j.id, j.name]));
    const alojMap = new Map(alojamentos.map((a: any) => [a.id, a]));

    const assignmentByWorker = new Map<string, any>();
    for (const a of assignmentsRes.data || []) {
      if (!a.worker_id) continue;
      if (!assignmentByWorker.has(a.worker_id) || a.status === 'active') {
        assignmentByWorker.set(a.worker_id, a);
      }
    }

    const ordersByWorker = new Map<string, PickingOrder[]>();
    for (const o of (ordersRes.data || []) as PickingOrder[]) {
      if (!o.worker_id) continue;
      const list = ordersByWorker.get(o.worker_id) || [];
      list.push(o);
      ordersByWorker.set(o.worker_id, list);
    }

    const alocByWorkerId = new Map<string, any>();
    const alocByCodColab = new Map<string, any>();
    for (const al of alocacoesAtivas as any[]) {
      if (al.worker_id) alocByWorkerId.set(al.worker_id, al);
      if (al.codigo_colab) alocByCodColab.set(String(al.codigo_colab).trim().toUpperCase(), al);
    }

    const nowMs = Date.now();
    const rows: WorkerReplenishmentRow[] = [];

    for (const w of workersRes.data || []) {
      const statusLower = String(w.status_trabajador || '').toLowerCase();
      const ass = assignmentByWorker.get(w.id);
      const history = ordersByWorker.get(w.id) || [];

      // Exibir trabalhadores ativos, alocados em pedido ou que já possuem histórico no Almacén
      if (statusLower.includes('baixa') || statusLower.includes('inactivo') || statusLower.includes('baja')) {
        if (!ass && history.length === 0) continue;
      }

      const ped = ass?.pedido_id ? pedidosMap.get(ass.pedido_id) : null;
      let empId: string | null = ass?.empresa_id || ped?.empresa_id || null;
      let emp = empId ? empresasMap.get(empId) : null;
      if (!emp && w.contratante) {
        const contUpper = String(w.contratante).trim().toUpperCase();
        const matchedEmp = empresasRes.find(
          (e) =>
            e.nome.toUpperCase().includes(contUpper) ||
            contUpper.includes(e.nome.toUpperCase()) ||
            (e.trade_name && (e.trade_name.toUpperCase().includes(contUpper) || contUpper.includes(e.trade_name.toUpperCase())))
        );
        if (matchedEmp) {
          emp = matchedEmp;
          empId = matchedEmp.id;
        }
      }
      const clientId = ass?.client_id || ped?.client_id || null;
      const cli = clientId ? clientsMap.get(clientId) : null;
      const siteId = ass?.client_site_id || ped?.client_site_id || null;
      const site = siteId ? sitesMap.get(siteId) : null;
      const siteAddr = site
        ? [site.address_line, site.postal_code, site.city].filter(Boolean).join(', ')
        : null;

      const codKey = w.cod_colab ? String(w.cod_colab).trim().toUpperCase() : '';
      const aloc = alocByWorkerId.get(w.id) || (codKey ? alocByCodColab.get(codKey) : null);
      let alojNome: string | null = null;
      let alojEndereco: string | null = null;
      if (aloc) {
        const alojObj = aloc.alojamento_id ? alojMap.get(aloc.alojamento_id) : null;
        alojNome = alojObj?.nome || alojObj?.titulo || aloc.alojamento_nome || null;
        alojEndereco =
          [alojObj?.endereco, alojObj?.codigo_postal, alojObj?.municipio || alojObj?.provincia]
            .filter(Boolean)
            .join(', ') ||
          aloc.endereco ||
          null;
      }

      const lastOrder = history[0] || null;
      const lastDispatched = history.find((o) => o.status === 'DESPACHADO' || o.status === 'ENTREGUE') || lastOrder;
      const lastDateStr = lastDispatched ? (lastDispatched.dispatched_at || lastDispatched.created_at) : null;
      const daysSince = lastDateStr
        ? Math.max(0, Math.floor((nowMs - new Date(lastDateStr).getTime()) / (1000 * 60 * 60 * 24)))
        : null;

      const jfId = ass?.job_function_id || null;
      const jfName = ass?.job_function_name_snapshot || (jfId ? jobsMap.get(jfId) : null) || w.funcion || null;

      rows.push({
        worker_id: w.id,
        cod_colab: w.cod_colab || null,
        nome: w.nome,
        identificacion: w.dni || w.nie || w.pasaporte || w.nif || null,
        movil: w.movil || null,
        camiseta: normalizeSizeCode(w.camiseta),
        pantalones: normalizeSizeCode(w.pantalones),
        empresa_id: empId,
        empresa_nome: emp?.trade_name || emp?.nome || w.contratante || null,
        client_id: clientId,
        client_nome: cli?.trade_name || cli?.legal_name || w.cliente || null,
        pedido_id: ass?.pedido_id || null,
        pedido_codigo: ped?.codigo || null,
        job_function_id: jfId,
        job_function_name: jfName,
        alojamento_nome: alojNome,
        alojamento_endereco: alojEndereco,
        site_address: siteAddr,
        last_order: lastOrder,
        last_dispatch_at: lastDateStr,
        days_since_last: daysSince,
        total_orders: history.length,
        history,
      });
    }

    return rows;
  },
};
