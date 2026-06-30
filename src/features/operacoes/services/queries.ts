import { supabase } from './supabaseClient';
import type { ChartData, RankItem, KpiData, Filters, Pedido, Estimacion, EventoOperacional, ProfileMix, PedidoItem, ColaboradorAlocado } from './types';

// Helper to check connection
const isConnected = !!supabase;

// Helper to parse SharePoint JSON fields
const parseSharePointDisplay = (raw: string | any): string => {
  if (!raw) return '';
  if (typeof raw !== 'string') return raw; // Already parsed?
  try {
    const parsed = JSON.parse(raw);
    return parsed.Value || raw;
  } catch {
    return raw; // Not JSON, return as is
  }
};

export const fetchDashboardData = async (_filters: Filters) => {
  // Placeholder structure - in real implementation, this would aggregate data from DB dashboard views
  // For now, return empty/minimal real data to avoid "mock data" confusion

  if (!isConnected) {
    return {
      monthlyData: [] as ChartData[],
      kpis: [] as KpiData[],
      rankEmpresa: [] as RankItem[],
      rankComercial: [] as RankItem[],
      rankCliente: [] as RankItem[],
      profileMix: [] as ProfileMix[]
    };
  }

  let profileMix: ProfileMix[] = [];

  try {
    // Attempt to fetch Profile Mix from view if exists
    const { data: viewData, error: viewError } = await supabase!.from('v_perfis_demand_supply').select('*');
    if (!viewError && viewData) {
      profileMix = viewData.map((v: any) => ({
        funcion_id: v.funcion_id,
        funcion_nome: v.nome_perfil || v.funcion_nome,
        estimado: 0,
        pedido: Number(v.demand || 0),
        real: Number(v.supply || 0),
        gap: Number(v.supply || 0) - Number(v.demand || 0)
      }));
    }
    // If view is missing, we return empty for now rather than complex manual aggregation to keep it fast/clean
  } catch (err) {
    console.error("Error fetching dashboard data", err);
  }

  return {
    monthlyData: [] as ChartData[],
    kpis: [] as KpiData[],
    rankEmpresa: [] as RankItem[],
    rankComercial: [] as RankItem[],
    rankCliente: [] as RankItem[],
    profileMix
  };
};

export const fetchEstimaciones = async (filters: Filters): Promise<Estimacion[]> => {
  if (!isConnected) return [];

  console.log('[DEBUG fetchEstimaciones] Filtros recebidos:', filters);

  // Mapear a empresa selecionada nos filtros (nome de fantasia/social) para obter o ID correspondente
  let companyId: string | null = null;
  if (filters.empresa) {
    const { data: companies, error: empError } = await supabase!
      .schema('core_common')
      .from('empresas')
      .select('id, trade_name, legal_name');

    if (empError) {
      console.error('[DEBUG fetchEstimaciones] Erro ao buscar empresas:', empError);
    }

    if (companies) {
      const matched = companies.find(
        (c: any) =>
          c.trade_name?.toLowerCase() === filters.empresa?.toLowerCase() ||
          c.legal_name?.toLowerCase() === filters.empresa?.toLowerCase()
      );
      if (matched) {
        companyId = matched.id;
        console.log('[DEBUG fetchEstimaciones] Empresa encontrada:', matched.trade_name, 'ID:', companyId);
      } else {
        console.log('[DEBUG fetchEstimaciones] Nenhuma empresa corresponde ao nome:', filters.empresa);
      }
    }
  }

  // Mapear o vendedor (Comercial Responsável) selecionado nos filtros para obter o ID do usuário correspondente
  let sellerUserId: string | null = null;
  if (filters.comercial) {
    const { data: users, error: userError } = await supabase!
      .schema('core_operacoes')
      .from('mcs_users')
      .select('id, email, display_name');

    if (userError) {
      console.error('[DEBUG fetchEstimaciones] Erro ao buscar mcs_users:', userError);
    }

    if (users) {
      const matched = users.find(
        (u: any) =>
          u.display_name?.toLowerCase() === filters.comercial?.toLowerCase() ||
          u.email?.toLowerCase() === filters.comercial?.toLowerCase()
      );
      if (matched) {
        sellerUserId = matched.id;
        console.log('[DEBUG fetchEstimaciones] Vendedor encontrado:', matched.display_name, 'ID:', sellerUserId);
      }
    }
  }

  // Mapear o cliente/lead selecionado nos filtros para obter o ID correspondente
  let clientId: string | null = null;
  let leadId: string | null = null;
  if (filters.cliente) {
    const [clientsRes, leadsRes] = await Promise.all([
      supabase!.schema('core_common').from('clients').select('id, legal_name, trade_name'),
      supabase!.schema('core_comercial').from('leads').select('id, name, company_name')
    ]);

    if (clientsRes.data) {
      const matchedC = clientsRes.data.find(
        (c: any) =>
          c.trade_name?.toLowerCase() === filters.cliente?.toLowerCase() ||
          c.legal_name?.toLowerCase() === filters.cliente?.toLowerCase()
      );
      if (matchedC) clientId = matchedC.id;
    }
    if (leadsRes.data) {
      const matchedL = leadsRes.data.find(
        (l: any) =>
          l.company_name?.toLowerCase() === filters.cliente?.toLowerCase() ||
          l.name?.toLowerCase() === filters.cliente?.toLowerCase()
      );
      if (matchedL) leadId = matchedL.id;
    }
    console.log('[DEBUG fetchEstimaciones] Filtro Cliente resolvido:', { clientId, leadId });
  }

  let query = supabase!
    .schema('core_comercial')
    .from('estimaciones')
    .select(`
      id, codigo, status, client_id, lead_id, empresa_id, created_at, validity_date, expected_start_date, expected_end_date, created_by, country_id, estimation_type,
      current_version:estimacion_versions!fk_estimacion_current_version(
        id, version_number, total_revenue, margin_percent,
        items:estimacion_items(
          quantity,
          job_function:job_functions(id, name)
        )
      )
    `)
    .order('created_at', { ascending: false });

  if (companyId) {
    query = query.eq('empresa_id', companyId);
  }

  if (sellerUserId) {
    query = query.eq('created_by', sellerUserId);
  }

  if (clientId || leadId) {
    const conditions = [];
    if (clientId) conditions.push(`client_id.eq.${clientId}`);
    if (leadId) conditions.push(`lead_id.eq.${leadId}`);
    query = query.or(conditions.join(','));
  }

  // Filtrar por País (pais) se selecionado
  let countryId: string | null = null;
  if (filters.pais) {
    const { data: countries } = await supabase!
      .schema('core_common')
      .from('countries')
      .select('id, name');

    if (countries) {
      const matched = countries.find(
        (c: any) => c.name?.toLowerCase() === filters.pais?.toLowerCase()
      );
      if (matched) {
        countryId = matched.id;
        console.log('[DEBUG fetchEstimaciones] País encontrado:', matched.name, 'ID:', countryId);
      }
    }
  }

  if (countryId) {
    query = query.eq('country_id', countryId);
  }

  // Filtrar por status se selecionado
  if (filters.status) {
    query = query.eq('status', filters.status);
  }

  if (filters.monthRange && filters.monthRange[0]) {
    const [y, m] = filters.monthRange[0].split('-');
    const lastDay = new Date(Number(y), Number(m), 0).getDate();
    const start = `${filters.monthRange[0]}-01T00:00:00.000Z`;
    let end = `${filters.monthRange[0]}-${lastDay}T23:59:59.999Z`;

    if (filters.monthRange[1]) {
      const [y2, m2] = filters.monthRange[1].split('-');
      const lastDay2 = new Date(Number(y2), Number(m2), 0).getDate();
      end = `${filters.monthRange[1]}-${lastDay2}T23:59:59.999Z`;
    }

    query = query.gte('created_at', start).lte('created_at', end);
    console.log(`[DEBUG fetchEstimaciones] Filtrando criados entre: ${start} e ${end}`);
  }

  const { data, error } = await query;
  if (error) {
    console.error('[DEBUG fetchEstimaciones] Erro na busca de estimativas:', error);
    return [];
  }
  
  if (!data || data.length === 0) {
    console.log('[DEBUG fetchEstimaciones] Nenhuma estimativa encontrada para os filtros aplicados.');
    return [];
  }

  console.log(`[DEBUG fetchEstimaciones] Encontradas ${data.length} estimativas. Carregando detalhes...`);

  const clientIds = [...new Set(data.map((d: any) => d.client_id).filter(Boolean))];
  const leadIds = [...new Set(data.map((d: any) => d.lead_id).filter(Boolean))];
  const countryIds = [...new Set(data.map((d: any) => d.country_id).filter(Boolean))];

  const [clientsRes, leadsRes, usersRes, companiesRes, countriesRes] = await Promise.all([
    clientIds.length > 0
      ? supabase!.schema('core_common').from('clients').select('id, legal_name, trade_name').in('id', clientIds)
      : Promise.resolve({ data: [] }),
    leadIds.length > 0
      ? supabase!.schema('core_comercial').from('leads').select('id, name, company_name').in('id', leadIds)
      : Promise.resolve({ data: [] }),
    supabase!.schema('core_operacoes').from('mcs_users').select('id, email, display_name'),
    supabase!.schema('core_common').from('empresas').select('id, legal_name, trade_name'),
    countryIds.length > 0
      ? supabase!.schema('core_common').from('countries').select('id, name').in('id', countryIds)
      : Promise.resolve({ data: [] })
  ]);

  if (clientsRes.error) {
    console.error('[DEBUG fetchEstimaciones] Erro ao buscar clientes:', clientsRes.error);
  }
  if (leadsRes.error) {
    console.error('[DEBUG fetchEstimaciones] Erro ao buscar leads:', leadsRes.error);
  }

  const clients = clientsRes.data || [];
  const leads = leadsRes.data || [];
  const users = usersRes.data || [];
  const companies = companiesRes.data || [];
  const countries = countriesRes.data || [];

  return data.map((row: any) => {
    // Resolver o nome do cliente/oportunidade
    let clientName = 'N/A';
    if (row.client_id) {
      const client = clients.find((c: any) => c.id === row.client_id);
      if (client) {
        clientName = client.trade_name || client.legal_name;
      }
    } else if (row.lead_id) {
      const lead = leads.find((l: any) => l.id === row.lead_id);
      if (lead) {
        clientName = lead.company_name || lead.name;
      }
    }

    // Resolver a etapa correspondente
    // 'draft' | 'review' | 'sent' | 'signed' | 'approved' | 'rejected' | 'expired' | 'cancelled' | 'superseded'
    // 'Enviado' | 'Negociación' | 'Firmado' | 'Convertido' | 'Perdido'
    let etapa: "Enviado" | "Negociación" | "Firmado" | "Convertido" | "Perdido" = 'Negociación';
    if (row.status === 'sent') etapa = 'Enviado';
    else if (row.status === 'draft' || row.status === 'review') etapa = 'Negociación';
    else if (row.status === 'signed') etapa = 'Firmado';
    else if (row.status === 'approved') etapa = 'Convertido';
    else if (['rejected', 'expired', 'cancelled', 'superseded'].includes(row.status)) etapa = 'Perdido';

    const valor = row.current_version?.total_revenue || 0;
    const margin = row.current_version?.margin_percent || 0;
    const versionNumber = row.current_version?.version_number || 1;

    // Resolver empresa
    const emp = companies.find((c: any) => c.id === row.empresa_id);
    const empresaName = emp ? (emp.trade_name || emp.legal_name) : 'N/A';

    // Resolver vendedor (mcs_user)
    const seller = users.find((u: any) => u.id === row.created_by);
    const sellerName = seller ? (seller.display_name || seller.email) : 'N/A';

    // Resolver pais
    const country = countries.find((c: any) => c.id === row.country_id);
    const countryName = country ? country.name : 'N/A';

    // Resolver tipo
    let tipoText = 'Outro';
    if (row.estimation_type === 'new_allocation') tipoText = 'Nova Alocação';
    else if (row.estimation_type === 'expansion') tipoText = 'Expansão';

    return {
      id: row.id,
      Titulo: row.codigo || `Orçamento #${row.id}`,
      Cliente: clientName,
      Etapa: etapa,
      Valor: Number(valor),
      DataCriacao: row.created_at ? new Date(row.created_at).toLocaleDateString('pt-BR') : new Date().toLocaleDateString('pt-BR'),
      
      // Detalhes estendidos
      codigo: row.codigo,
      versionNumber,
      empresa: empresaName,
      vendedor: sellerName,
      tipo: tipoText,
      pais: countryName,
      status: row.status || 'draft',
      validityDate: row.validity_date,
      startDate: row.expected_start_date,
      endDate: row.expected_end_date,
      margin: Number(margin),
      items: row.current_version?.items?.map((it: any) => ({
        name: it.job_function?.name || 'Item',
        quantity: it.quantity || 0
      })) || []
    };
  });
};

export const fetchPedidos = async (filters: Filters): Promise<Pedido[]> => {
  if (!isConnected) return [];

  let query = supabase!
    .from('pedidos')
    .select('*')
    .order('fecha_inicio_pedido', { ascending: false })
    .limit(100);

  // Apply filters if present
  if (filters.monthRange && filters.monthRange[0]) {
    const [y, m] = filters.monthRange[0].split('-');
    const lastDay = new Date(Number(y), Number(m), 0).getDate(); // Get correct last day (28, 29, 30, 31)

    // Default start/end
    const start = `${filters.monthRange[0]}-01`;
    let end = `${filters.monthRange[0]}-${lastDay}`;

    // If range has end month
    if (filters.monthRange[1]) {
      const [y2, m2] = filters.monthRange[1].split('-');
      const lastDay2 = new Date(Number(y2), Number(m2), 0).getDate();
      end = `${filters.monthRange[1]}-${lastDay2}`;
    }

    query = query.gte('fecha_inicio_pedido', start).lte('fecha_inicio_pedido', end);
  }

  const { data: pedidos, error } = await query;

  if (error) {
    console.error('Error fetching pedidos:', error);
    return [];
  }
  if (!pedidos || pedidos.length === 0) return [];

  // Extract unique client IDs (these are sp_id in the clientes table)
  const clientIds = Array.from(new Set(pedidos.map((p: any) => p.id_cliente).filter((id: any) => id != null)));

  // Fetch client names manually
  let clientMap: Record<string, string> = {};

  if (clientIds.length > 0) {
    const { data: clientes, error: clienteError } = await supabase!
      .from('clientes')
      .select('sp_id, nombre_comercial')
      .in('sp_id', clientIds);

    if (!clienteError && clientes) {
      clientes.forEach((c: any) => {
        // Map sp_id -> nombre_comercial
        clientMap[String(c.sp_id)] = c.nombre_comercial;
      });
    } else if (clienteError) {
      console.error('Error fetching client names:', clienteError);
    }
  }

  // Fetch requested quantities from itens_pedido
  const codPedidos = pedidos.map((p: any) => p.cod_pedido).filter((cod: any) => cod != null);
  let quantityMap: Record<string, number> = {};

  if (codPedidos.length > 0) {
    const { data: itens, error: itensError } = await supabase!
      .from('itens_pedido')
      .select('cod_pedido, cantidad')
      .in('cod_pedido', codPedidos);

    if (!itensError && itens) {
      itens.forEach((item: any) => {
        const cod = item.cod_pedido;
        const qtd = Number(item.cantidad) || 0;
        quantityMap[cod] = (quantityMap[cod] || 0) + qtd;
      });
    } else if (itensError) {
      console.error('Error fetching itens_pedido quantities:', itensError);
    }
  }

  return pedidos.map((p: any) => ({
    id: p.id,
    CodPedido: p.cod_pedido || `PED-${p.id}`,
    // Map using id_cliente (which matches sp_id)
    Cliente: clientMap[String(p.id_cliente)] || p.cliente_nombre_snapshot || `Cliente ${p.id_cliente}`,
    Comercial: parseSharePointDisplay(p.comercial_responsable),
    Empresa: '',
    DataEmissao: p.fecha_emision,
    DataInicio: p.fecha_inicio_pedido,
    Status: parseSharePointDisplay(p.status_pedido) || 'Ativo',
    TrabalhadoresSolicitados: quantityMap[p.cod_pedido] || 0
  }));
};

export const fetchPedidoDetails = async (pedidoId: number) => {
  if (!isConnected) return { itens: [], alocados: [] };

  // First, get the cod_pedido for this ID to link with items
  const { data: pedido, error: pedidoError } = await supabase!
    .from('pedidos')
    .select('cod_pedido')
    .eq('id', pedidoId)
    .single();

  if (pedidoError || !pedido) {
    console.error('Error fetching pedido details metadata:', pedidoError);
    return { itens: [], alocados: [] };
  }

  const codPedido = pedido.cod_pedido;

  // Fetch items from itens_pedido
  const { data: itensRaw, error: itensError } = await supabase!
    .from('itens_pedido')
    .select('*')
    .eq('cod_pedido', codPedido);

  if (itensError) {
    console.error('Error fetching itens_pedido:', itensError);
  }

  const itens: PedidoItem[] = (itensRaw || []).map((item: any) => ({
    id: item.id,
    idFuncionCol: item.id_funcion_col,
    nombrePerfil: item.nombre_perfil,
    qtdSolicitada: Number(item.cantidad) || 0,
    resolvedName: item.nombre_perfil // Can rely on nombre_perfil for now as fallback
  }));

  // Fetch all allocations (contratados, reemplazos, reubicaciones) from the new view/table
  const { data: colaboradores_alocados, error: colabsError } = await supabase!
    .from('colaborador_por_pedido')
    .select('*')
    .eq('codpedido', codPedido);

  if (colabsError) {
    console.error('Error fetching colaboradores alocados:', colabsError);
  }

  // Fetch function names for allocations
  let functionMap: Record<string, string> = {};
  if (colaboradores_alocados && colaboradores_alocados.length > 0) {
    const functionIds = Array.from(new Set(colaboradores_alocados.map((c: any) => c.idfuncion).filter((id: any) => id)));

    if (functionIds.length > 0) {
      const { data: funcoes, error: funcError } = await supabase!
        .from('funcion')
        .select('sp_id, nombre')
        .in('sp_id', functionIds);

      if (!funcError && funcoes) {
        funcoes.forEach((f: any) => {
          functionMap[String(f.sp_id)] = f.nombre;
        });
      } else if (funcError) {
        console.error('Error fetching function names:', funcError);
      }
    }
  }

  const alocados: ColaboradorAlocado[] = (colaboradores_alocados || []).map((c: any) => ({
    id: c.id || Math.random(), // fallback if id is somehow missing in the view aggregation
    nome: c.nome_colab || c.idcolaborador || 'N/A',
    idFuncion: Number(c.idfuncion) || 0,
    funcionNome: functionMap[String(c.idfuncion)] || `Função ${c.idfuncion}`,
    dataInicio: c.fechainiciopedido || 'N/A',
    tipoAlocacao: c.tiposervico || 'Pedido/Contrato Inicial'
  }));

  return { itens, alocados };
}

export const fetchOperacao = async (_filters: Filters) => {
  if (!isConnected) return { kpis: [], eventos: [] };

  const eventos: EventoOperacional[] = [];
  let clientMap: Record<string, string> = {}; // Initialize clientMap once for both sections

  // --- 1. REEMPLAZOS ---
  try {
    const { data: reemplazos, error: reemError } = await supabase!
      .from('reemplazos')
      .select('*')
      .order('fechainicioreemplazo', { ascending: false })
      .limit(100);

    if (!reemError && reemplazos) {
      // Fetch Clients for Reemplazos
      // Use codcliente (e.g. "C0054") for robust matching
      const clientCodesToCheck = reemplazos.map((r: any) => r.codcliente).filter(Boolean);

      if (clientCodesToCheck.length > 0) {
        const { data: clientes } = await supabase!
          .from('clientes')
          .select('cod_cliente, razon_social')
          .in('cod_cliente', clientCodesToCheck);

        if (clientes) {
          clientes.forEach((c: any) => {
            if (c.cod_cliente) clientMap[c.cod_cliente] = c.razon_social;
          });
        }
      }

      // Get codes to fetch details
      const codReemplazos = reemplazos.map((r: any) => r.codreemplazo).filter(Boolean);

      // Fetch Itens (Requested Profiles)
      let itensMap: Record<string, any[]> = {};
      if (codReemplazos.length > 0) {
        const { data: itens, error: itensError } = await supabase!
          .from('itens_reemplazo')
          .select('cod_reemplazo, nombre_perfil, cantidad')
          .in('cod_reemplazo', codReemplazos);

        if (!itensError && itens) {
          itens.forEach((i: any) => {
            if (!itensMap[i.cod_reemplazo]) itensMap[i.cod_reemplazo] = [];
            itensMap[i.cod_reemplazo].push({
              perfil: i.nombre_perfil,
              qtd: Number(i.cantidad) || 0
            });
          });
        }
      }

      // Fetch Colaboradores Reemplazados (Who left) utilizing original codreemplazo
      let colabsMap: Record<string, any[]> = {};
      if (codReemplazos.length > 0) {
        const { data: colabs, error: colabsError } = await supabase!
          .from('colaborador_por_pedido')
          .select('codreemplazo, nome_colab, idfuncion')
          .in('codreemplazo', codReemplazos)
          .not('codreemplazo', 'is', null) // Ensure we only get those actually marked as replaced
          .neq('codreemplazo', '');

        if (!colabsError && colabs) {
          // pre-fetch function names
          const fIds = Array.from(new Set(colabs.map((c: any) => c.idfuncion).filter(Boolean)));
          let fMap: Record<string, string> = {};
          if (fIds.length > 0) {
            const { data: funcs } = await supabase!.from('funcion').select('sp_id, nombre').in('sp_id', fIds);
            if (funcs) funcs.forEach((f: any) => { fMap[f.sp_id] = f.nombre; });
          }

          colabs.forEach((c: any) => {
            const key = c.codreemplazo;
            if (!colabsMap[key]) colabsMap[key] = [];
            colabsMap[key].push({
              nome: c.nome_colab || 'N/A',
              funcao: fMap[c.idfuncion] || `Função ${c.idfuncion}`,
              tipo: "Saiu"
            });
          });
        }
      }

      // Fetch Contratados (Who entered - Reemplazo) using new table
      if (codReemplazos.length > 0) {
        const { data: contratados, error: contError } = await supabase!
          .from('colaborador_por_pedido')
          .select('codpedido, nome_colab, idfuncion')
          .in('codpedido', codReemplazos)
          .eq('tiposervico', 'Reemplazo');

        if (!contError && contratados) {
          // pre-fetch function names
          const fIds = Array.from(new Set(contratados.map((c: any) => c.idfuncion).filter(Boolean)));
          let fMap: Record<string, string> = {};
          if (fIds.length > 0) {
            const { data: funcs } = await supabase!.from('funcion').select('sp_id, nombre').in('sp_id', fIds);
            if (funcs) funcs.forEach((f: any) => { fMap[f.sp_id] = f.nombre; });
          }

          contratados.forEach((c: any) => {
            const key = c.codpedido; // codpedido links to codreemplazo
            if (!colabsMap[key]) colabsMap[key] = [];
            colabsMap[key].push({
              nome: c.nome_colab || 'Contratado',
              funcao: fMap[c.idfuncion] || `Função ${c.idfuncion}`,
              tipo: "Entrou"
            });
          });
        }
      }

      // Map to EventoOperacional
      reemplazos.forEach((r: any) => {
        const itens = itensMap[r.codreemplazo] || [];
        const colabs = colabsMap[r.codreemplazo] || [];

        // Derive summary fields
        const perfilResumo = itens.length > 0 ? itens.map(i => i.perfil).join(', ') : 'N/A';
        const colabResumo = colabs.length > 0 ? colabs.map(c => c.nome).join(', ') : 'N/A';

        eventos.push({
          id: r.id,
          codigo: r.codreemplazo,
          tipo: 'Reemplazo',
          motivo: 'Substituição', // Generalize or fetch specific field if exists
          colaborador: colabResumo,
          perfil: perfilResumo,
          cliente: clientMap[r.codcliente] || `Cliente ${r.idcliente || r.codcliente}`, // Placeholder, ideal is to fetch Client Name
          data: r.fechainicioreemplazo,
          dataFim: r.fechafinreemplazo,
          status: parseSharePointDisplay(r.statusreemplazo) || 'Aberto',
          itens: itens,
          colaboradores: colabs
        });
      });
    }
  } catch (err) {
    console.error("Error fetching Reemplazos:", err);
  }

  // --- 2. REUBICACIONES ---
  try {
    const { data: reubicaciones, error: reubError } = await supabase!
      .from('reubicaciones')
      .select('*')
      .order('fecha_inicio_reubicacion', { ascending: false })
      .limit(100);

    if (!reubError && reubicaciones) {
      const codReubicaciones = reubicaciones.map((r: any) => r.cod_reubicaciones).filter(Boolean); // Check if column is cod_reubicaciones or cod_reubicacion
      const clientCodesToCheck = reubicaciones.map((r: any) => r.cod_cliente).filter(Boolean);

      // Fetch Clients for Reubicaciones
      if (clientCodesToCheck.length > 0) {
        const { data: clientes } = await supabase!
          .from('clientes')
          .select('cod_cliente, razon_social')
          .in('cod_cliente', clientCodesToCheck);

        if (clientes) {
          clientes.forEach((c: any) => {
            if (c.cod_cliente) clientMap[c.cod_cliente] = c.razon_social;
          });
        }
      }

      // Fetch Colaboradores Reubicados (Who moved) using unified table
      let colabsMap: Record<string, any[]> = {};
      if (codReubicaciones.length > 0) {
        const { data: colabs, error: colabsError } = await supabase!
          .from('colaborador_por_pedido')
          .select('codpedido, nome_colab, idfuncion')
          .in('codpedido', codReubicaciones)
          .eq('tiposervico', 'Reubicacion');

        if (!colabsError && colabs) {
          // pre-fetch function names
          const fIds = Array.from(new Set(colabs.map((c: any) => c.idfuncion).filter(Boolean)));
          let fMap: Record<string, string> = {};
          if (fIds.length > 0) {
            const { data: funcs } = await supabase!.from('funcion').select('sp_id, nombre').in('sp_id', fIds);
            if (funcs) funcs.forEach((f: any) => { fMap[f.sp_id] = f.nombre; });
          }

          colabs.forEach((c: any) => {
            const key = c.codpedido;
            if (!colabsMap[key]) colabsMap[key] = [];
            colabsMap[key].push({
              nome: c.nome_colab || 'N/A',
              funcao: fMap[c.idfuncion] || `Função ${c.idfuncion}`,
              tipo: "Mudou"
            });
          });
        }
      }

      reubicaciones.forEach((r: any) => {
        const colabs = colabsMap[r.cod_reubicaciones] || [];
        const colabResumo = colabs.length > 0 ? colabs.map(c => c.nome).join(', ') : 'N/A';

        eventos.push({
          id: r.id,
          codigo: r.cod_reubicaciones,
          tipo: 'Reubicacion',
          motivo: 'Realocação',
          colaborador: colabResumo,
          perfil: colabs.length > 0 ? colabs[0].funcao : 'N/A',
          cliente: clientMap[r.cod_cliente] || `Cliente ${r.id_cliente || r.cod_cliente}`,
          data: r.fecha_inicio_reubicacion,
          dataFim: r.fecha_fin_reubicacion,
          status: parseSharePointDisplay(r.status_reubicaciones) || 'Aberto',
          itens: [], // Reubicacion usually implies moving existing, so no "requested items" in the same sense?
          colaboradores: colabs
        });
      });
    }
  } catch (err) {
    console.error("Error fetching Reubicaciones:", err);
  }

  // Sort combined events by date desc
  eventos.sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime());

  return { kpis: [], eventos };
};

export const fetchCliente360 = async (id: string) => {
  if (!isConnected) return null;

  try {
    // 1. Fetch Client Details
    const { data: client, error: clientError } = await supabase!
      .from('clientes')
      .select('*')
      .eq('id', id)
      .single();

    if (clientError || !client) {
      console.error("Error fetching client 360:", clientError);
      return null;
    }

    // 2. Fetch Pedidos associated with this client (using sp_id)
    const { data: pedidos } = await supabase!
      .from('pedidos')
      .select('*')
      .eq('id_cliente', client.sp_id)
      .order('fecha_inicio_pedido', { ascending: false });

    const orders = pedidos || [];
    const activeOrders = orders.filter((o: any) => o.status_pedido && String(o.status_pedido).includes('Abierto')); // Ensure string check

    // 3. Fetch Active Workers (Contratados linked to these orders)
    let activeWorkersCount = 0;
    const codPedidos = orders.map((o: any) => o.cod_pedido).filter(Boolean);

    if (codPedidos.length > 0) {
      const { count, error: countError } = await supabase!
        .from('contratados')
        .select('*', { count: 'exact', head: true })
        .in('cod_servico', codPedidos)
        .eq('status', 'Ativo'); // Assuming there's a status or we count all

      if (!countError) activeWorkersCount = count || 0;
    }

    // 4. Construct Data Object
    return {
      id: client.id,
      nome: client.nombre_comercial || client.razon_social,
      kpis: [
        { label: 'Pedidos Totais', value: orders.length },
        { label: 'Pedidos Ativos', value: activeOrders.length },
        { label: 'Trabalhadores', value: activeWorkersCount },
        { label: 'Projetos', value: 'N/A' } // Placeholder if no projects table
      ],
      pedidos: orders.map((p: any) => ({
        id: p.id,
        CodPedido: p.cod_pedido,
        DataInicio: p.fecha_inicio_pedido,
        Status: parseSharePointDisplay(p.status_pedido) || 'Indefinido'
      }))
    };

  } catch (err) {
    console.error("System error fetching client 360:", err);
    return null;
  }
}

export const fetchComercial360 = async (_id: string) => {
  if (!isConnected) return null;
  // TODO: Implement real 360 view
  return null;
}

export const fetchClientes = async (): Promise<any[]> => {
  if (!isConnected) return [];

  const { data, error } = await supabase!
    .from('clientes')
    .select('*')
    .limit(1000);

  if (error || !data) return [];

  return data.map((c: any) => ({
    id: c.id,
    nome: c.nombre_comercial || c.razon_social, // Fallback to razon if nome is empty
    status: 'Ativo',
    projetos: 0
  }));
}

export const fetchContratadosPorEstimacion = async (estimacionIds: string[]): Promise<any[]> => {
  if (!isConnected || estimacionIds.length === 0) return [];

  try {
    console.log('[DEBUG fetchContratadosPorEstimacion] Buscando contratados para estimativas:', estimacionIds.length);

    // 1. Buscar os pedidos associados a essas estimativas
    const { data: pedidos, error: pedidosErr } = await supabase!
      .schema('core_comercial')
      .from('pedidos')
      .select('id, codigo, source_estimacion_id')
      .in('source_estimacion_id', estimacionIds);

    if (pedidosErr) {
      console.error('[DEBUG fetchContratadosPorEstimacion] Erro ao buscar pedidos:', pedidosErr);
      return [];
    }

    if (!pedidos || pedidos.length === 0) {
      console.log('[DEBUG fetchContratadosPorEstimacion] Nenhum pedido associado a estas estimativas.');
      return [];
    }

    const orderCodes = pedidos.map((p: any) => p.codigo).filter(Boolean);
    if (orderCodes.length === 0) return [];

    console.log('[DEBUG fetchContratadosPorEstimacion] Códigos de pedido encontrados:', orderCodes);

    // 2. Buscar os contratados reais vinculados a esses códigos de pedido
    const { data: contratados, error: contratadosErr } = await supabase!
      .from('contratados')
      .select('id_funcion, cod_servico')
      .in('cod_servico', orderCodes);

    if (contratadosErr) {
      console.error('[DEBUG fetchContratadosPorEstimacion] Erro ao buscar contratados:', contratadosErr);
      return [];
    }

    if (!contratados || contratados.length === 0) {
      console.log('[DEBUG fetchContratadosPorEstimacion] Nenhum contratado encontrado para estes pedidos.');
      return [];
    }

    console.log('[DEBUG fetchContratadosPorEstimacion] Total de contratados brutos encontrados:', contratados.length);

    // 3. Buscar os nomes das funções correspondentes do SharePoint (legado)
    const { data: funcoes, error: funcoesErr } = await supabase!
      .from('funcion')
      .select('sp_id, nombre');

    const funcoesMap: Record<string, string> = {};
    if (!funcoesErr && funcoes) {
      funcoes.forEach((f: any) => {
        if (f.sp_id) funcoesMap[String(f.sp_id)] = f.nombre;
      });
    }

    // 4. Mapear cada contratado de volta para sua função (nome) e estimativa de origem
    const mapped = contratados.map((c: any) => {
      const matchedPedido = pedidos.find((p: any) => p.codigo === c.cod_servico);
      const functionName = c.id_funcion ? funcoesMap[String(c.id_funcion)] : null;
      return {
        estimacionId: matchedPedido?.source_estimacion_id,
        functionName: functionName || 'Outro',
        codServico: c.cod_servico
      };
    });

    console.log('[DEBUG fetchContratadosPorEstimacion] Mapeados com sucesso:', mapped.length);
    return mapped;
  } catch (err) {
    console.error('Erro em fetchContratadosPorEstimacion:', err);
    return [];
  }
}
