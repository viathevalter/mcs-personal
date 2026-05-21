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

export const fetchEstimaciones = async (_filters: Filters): Promise<Estimacion[]> => {
  if (!isConnected) return [];

  const { data, error } = await supabase!
    .from('estimaciones')
    .select('*')
    .limit(50);

  if (error || !data) return [];

  return data.map((row: any) => ({
    id: row.id,
    Titulo: `Presupuesto #${row.id}`, // or row.titulo not in schema?
    Cliente: 'Unknown', // Need join
    Etapa: 'Enviado', // Map status
    DataCriacao: row.created_at || new Date().toISOString().split('T')[0]
  }));
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
