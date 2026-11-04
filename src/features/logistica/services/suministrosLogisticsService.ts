import { supabase } from '@/shared/supabase/client';
import { logisticsService } from './logisticsService';
import { registrosService, fetchAllTableRows } from './registrosService';
import { financeLogisticsService } from './financeLogisticsService';
import { contratosLogisticsService } from './contratosLogisticsService';

export interface SuministrosLimitesConfig {
  internet?: boolean;
  agua?: boolean;
  luz?: boolean;
  gas?: boolean;
  limpieza?: boolean;
  otros?: boolean;
  modo_limite?: 'por_pessoa' | 'global_alojamento' | 'ambos';
  limite_luz_pessoa?: number;
  limite_agua_pessoa?: number;
  limite_gas_pessoa?: number;
  limite_calefaccion_pessoa?: number;
  limite_outros_pessoa?: number;
  limite_global_pessoa?: number;
  limite_global_alojamento?: number;
}

export interface RateioMoradorItem {
  worker_id: string;
  worker_nome: string;
  codigo_colab?: string;
  empresa_id?: string;
  empresa_contratante?: string;
  cliente_nome?: string;
  obra_nome?: string;
  data_entrada?: string;
  data_saida?: string;
  dias_alojado: number;
  percentual: number;
  valor_sugerido: number;
  valor_desconto: number;
  isento?: boolean;
  observacao?: string;
  discount_id?: string | null;
}

export interface SuministroFatura {
  id: string;
  codigo_fatura: string;
  alojamento_id?: string | null;
  alojamento_codigo?: string | null;
  alojamento_nome?: string | null;
  direccion_planilha?: string | null;
  provedor_id?: string | null;
  provedor_nome?: string | null;
  servico: string;
  concepto_original?: string | null;
  mes_periodo?: string | null;
  data_inicio?: string | null;
  data_fim?: string | null;
  num_dias: number;
  valor_fatura: number;
  limite_por_pessoa_mes: number;
  limite_aceitavel_periodo: number;
  ajuste_manual_limite: boolean;
  valor_excedente: number;
  qtd_moradores_periodo: number;
  rateio_status: 'sem_excedente' | 'pendente_revisao' | 'enviado_financeiro' | 'descontos_lancados' | 'isento';
  competencia_desconto?: string | null;
  rateio_detalhes: RateioMoradorItem[];
  ordem_pagamento_id?: string | null;
  num_ordem_pago?: string | null;
  data_ordem_pago?: string | null;
  estado_pago: 'PENDIENTE' | 'SOLICITADO' | 'APROBADO' | 'PAGADO' | 'DESCONTADO_FIANZA' | 'CORRECCION_SOLICITADA';
  estatus_alojamento: 'EN CURSO' | 'FINALIZADO';
  descontado_fianza: boolean;
  anexo_fatura_url?: string | null;
  anexo_fatura_nome?: string | null;
  comprovante_pagamento_url?: string | null;
  motivo_correcao_financeiro?: string | null;
  observacoes?: string | null;
  criado_por?: string | null;
  aprovado_por?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface ResumenSuministrosAlojamento {
  alojamento_id?: string | null;
  alojamento_codigo: string;
  alojamento_nome: string;
  endereco: string;
  municipio?: string;
  provincia?: string;
  capacidade_pessoas: number;
  ocupantes_atuais: number;
  estatus: 'EN CURSO' | 'FINALIZADO';
  num_registros: number;
  total_geral: number;
  total_electricidad: number;
  total_agua: number;
  total_gas: number;
  total_internet: number;
  total_limpieza: number;
  total_calefaccion: number;
  total_comunidad: number;
  total_tasas: number;
  total_abonos: number;
  total_otros: number;
  total_excedente_gerado: number;
  total_pendente_pago: number;
  limites_config: SuministrosLimitesConfig;
}

export const SERVICOS_SUMINISTROS = [
  'Electricidad',
  'Agua',
  'Gas',
  'Internet',
  'Calefacción',
  'Limpieza / Reparaciones',
  'Tasas / Residuos municipales',
  'Comunidad',
  'Abonos por suministros',
  'Gasoil',
  'Copias',
  'Otros'
] as const;

const getClient = () => {
  return (supabase as any).schema ? (supabase as any).schema('core_logistics') : supabase;
};

export function mapServicoToTipoPagoOP(servico: string): string {
  const s = (servico || '').toLowerCase();
  if (s.includes('electr') || s.includes('luz')) return 'Suministro_Luz';
  if (s.includes('agua')) return 'Suministro_Agua';
  if (s.includes('gas') || s.includes('calefac')) return 'Suministro_Gas';
  if (s.includes('internet') || s.includes('wifi')) return 'Suministro_Internet';
  if (s.includes('limp') || s.includes('reparac')) return 'Manutencao_Limpeza';
  return 'Outros_Gastos';
}

export function calcularDiasEntreDatas(inicio?: string | null, fim?: string | null): number {
  if (!inicio || !fim) return 30;
  const d1 = new Date(`${inicio.split('T')[0]}T00:00:00`);
  const d2 = new Date(`${fim.split('T')[0]}T00:00:00`);
  if (isNaN(d1.getTime()) || isNaN(d2.getTime())) return 30;
  const diff = Math.round((d2.getTime() - d1.getTime()) / (1000 * 60 * 60 * 24));
  return Math.max(1, diff);
}

export function obterLimitePadraoServico(
  limites: SuministrosLimitesConfig | undefined,
  servico: string
): { limitePorPessoaMes: number; limiteFixoAlojamentoMes: number; modo: 'por_pessoa' | 'global_alojamento' | 'ambos' } {
  const cfg = limites || {};
  const modo = cfg.modo_limite || 'ambos';
  const s = (servico || '').toLowerCase();

  let porPessoa = 0;
  if (s.includes('electr') || s.includes('luz')) {
    porPessoa = Number(cfg.limite_luz_pessoa) || 0;
  } else if (s.includes('agua')) {
    porPessoa = Number(cfg.limite_agua_pessoa) || 0;
  } else if (s.includes('gas')) {
    porPessoa = Number(cfg.limite_gas_pessoa) || 0;
  } else if (s.includes('calefac')) {
    porPessoa = Number(cfg.limite_calefaccion_pessoa) || Number(cfg.limite_gas_pessoa) || 0;
  } else if (!s.includes('internet') && !s.includes('comunidad') && !s.includes('tasa') && !s.includes('residuo') && !s.includes('abono')) {
    porPessoa = Number(cfg.limite_outros_pessoa) || 0;
  }

  if (porPessoa === 0 && Number(cfg.limite_global_pessoa) > 0) {
    porPessoa = Number(cfg.limite_global_pessoa);
  }

  const fixoAloj = Number(cfg.limite_global_alojamento) || 0;

  return {
    limitePorPessoaMes: porPessoa,
    limiteFixoAlojamentoMes: fixoAloj,
    modo
  };
}

export function calcularFranquiaPeriodo(params: {
  limitePorPessoaMes: number;
  limiteFixoAlojamentoMes?: number;
  qtdMoradores: number;
  numDias: number;
}): number {
  const dias = Math.max(1, Number(params.numDias) || 30);
  const fatorPeriodo = dias / 30;
  const moradores = Math.max(1, Number(params.qtdMoradores) || 1);

  if (params.limitePorPessoaMes > 0) {
    return Number((params.limitePorPessoaMes * moradores * fatorPeriodo).toFixed(2));
  }
  if (params.limiteFixoAlojamentoMes && params.limiteFixoAlojamentoMes > 0) {
    return Number((params.limiteFixoAlojamentoMes * fatorPeriodo).toFixed(2));
  }
  return 0;
}

export const suministrosLogisticsService = {
  // 1. Buscar todas as faturas de suministros sincronizadas com Ordens de Pagamento do Financeiro
  async fetchFaturas(): Promise<SuministroFatura[]> {
    const client = getClient();
    const { data, error } = await client
      .from('suministros_faturas')
      .select('*')
      .order('data_inicio', { ascending: false });

    if (error) {
      console.error('Erro ao buscar suministros_faturas:', error);
      return [];
    }

    const rows = data || [];
    if (rows.length === 0) return [];

    // Sincronizar status em tempo real com core_finance.ordens_pagamento
    const opIds = rows.map((r: any) => r.ordem_pagamento_id).filter(Boolean);
    const opMap = new Map<string, any>();
    const cpMap = new Map<string, any>();

    if (opIds.length > 0) {
      try {
        const { data: ops } = await supabase
          .schema('core_finance')
          .from('ordens_pagamento')
          .select('id, cod_orden_pago, status, fecha_pago, comprovante_geral, motivo_correcao, observaciones_financeiro, updated_at')
          .in('id', opIds);

        if (ops) {
          ops.forEach((op: any) => opMap.set(op.id, op));
        }

        const { data: cps } = await supabase
          .from('contas_pagar')
          .select('ordem_pagamento_id, dt_pagamento, anexo_url, status')
          .in('ordem_pagamento_id', opIds);

        if (cps) {
          cps.forEach((cp: any) => {
            if (cp.ordem_pagamento_id) cpMap.set(cp.ordem_pagamento_id, cp);
          });
        }
      } catch (e) {
        console.warn('Aviso ao sincronizar OPs com suministros_faturas:', e);
      }
    }

    return rows.map((r: any): SuministroFatura => {
      const linkedOp = r.ordem_pagamento_id ? opMap.get(r.ordem_pagamento_id) : null;
      const linkedCp = r.ordem_pagamento_id ? cpMap.get(r.ordem_pagamento_id) : null;

      let estadoPago: SuministroFatura['estado_pago'] = r.estado_pago || 'PENDIENTE';
      let numOrdemPago = r.num_ordem_pago || (linkedOp ? linkedOp.cod_orden_pago : null);
      let dataOrdemPago = r.data_ordem_pago || null;
      let comprovanteUrl = null;
      let motivoCorrecao = null;

      if (linkedOp) {
        const st = (linkedOp.status || '').toLowerCase();
        if (st === 'pago' || linkedCp?.status === 'Pago') {
          estadoPago = 'PAGADO';
          if (linkedOp.fecha_pago) dataOrdemPago = linkedOp.fecha_pago.split('T')[0];
          else if (linkedCp?.dt_pagamento) dataOrdemPago = linkedCp.dt_pagamento;
        } else if (st === 'aprovado') {
          estadoPago = 'APROBADO';
        } else if (st === 'correcao_solicitada' || st === 'rejeitado') {
          estadoPago = 'CORRECCION_SOLICITADA';
          motivoCorrecao = linkedOp.motivo_correcao || linkedOp.observaciones_financeiro || null;
        } else if (st === 'aguardando_aprovacao' || st === 'rascunho') {
          estadoPago = 'SOLICITADO';
        }
        comprovanteUrl = linkedOp.comprovante_geral || linkedCp?.anexo_url || null;
      }

      return {
        id: r.id,
        codigo_fatura: r.codigo_fatura || `SUM-${r.id.substring(0, 6).toUpperCase()}`,
        alojamento_id: r.alojamento_id,
        alojamento_codigo: r.alojamento_codigo,
        alojamento_nome: r.alojamento_nome || r.direccion_planilha || 'Alojamiento',
        direccion_planilha: r.direccion_planilha,
        provedor_id: r.provedor_id,
        provedor_nome: r.provedor_nome || 'Proveedor',
        servico: r.servico || 'Electricidad',
        concepto_original: r.concepto_original || '',
        mes_periodo: r.mes_periodo || '',
        data_inicio: r.data_inicio,
        data_fim: r.data_fim,
        num_dias: Number(r.num_dias) || 30,
        valor_fatura: Number(r.valor_fatura) || 0,
        limite_por_pessoa_mes: Number(r.limite_por_pessoa_mes) || 0,
        limite_aceitavel_periodo: Number(r.limite_aceitavel_periodo) || 0,
        ajuste_manual_limite: Boolean(r.ajuste_manual_limite),
        valor_excedente: Number(r.valor_excedente) || 0,
        qtd_moradores_periodo: Number(r.qtd_moradores_periodo) || 0,
        rateio_status: r.rateio_status || 'sem_excedente',
        competencia_desconto: r.competencia_desconto || null,
        rateio_detalhes: Array.isArray(r.rateio_detalhes) ? r.rateio_detalhes : [],
        ordem_pagamento_id: r.ordem_pagamento_id || null,
        num_ordem_pago: numOrdemPago,
        data_ordem_pago: dataOrdemPago,
        estado_pago: estadoPago,
        estatus_alojamento: r.estatus_alojamento === 'FINALIZADO' ? 'FINALIZADO' : 'EN CURSO',
        descontado_fianza: Boolean(r.descontado_fianza),
        anexo_fatura_url: r.anexo_fatura_url || null,
        anexo_fatura_nome: r.anexo_fatura_nome || null,
        comprovante_pagamento_url: comprovanteUrl,
        motivo_correcao_financeiro: motivoCorrecao,
        observacoes: r.observacoes || '',
        criado_por: r.criado_por,
        aprovado_por: r.aprovado_por,
        created_at: r.created_at,
        updated_at: r.updated_at
      };
    });
  },

  // 2. Buscar Fatura vinculada a uma Ordem de Pagamento específica (para a tela TitleDetail.tsx do Financeiro!)
  async fetchFaturasByOrdemPagamento(ordemPagamentoId: string, codAlojamento?: string | null): Promise<SuministroFatura[]> {
    const client = getClient();
    const { data, error } = await client
      .from('suministros_faturas')
      .select('*')
      .eq('ordem_pagamento_id', ordemPagamentoId);

    if (!error && data && data.length > 0) {
      const all = await this.fetchFaturas();
      return all.filter(f => f.ordem_pagamento_id === ordemPagamentoId);
    }

    return [];
  },

  // 3. Calcular moradores que estiveram no alojamento no período [dataInicio, dataFim] e montar rateio pro-rata
  async calcularMoradoresERateioPeriodo(params: {
    alojamentoId?: string | null;
    alojamentoCodigo?: string | null;
    alojamentoNome?: string | null;
    dataInicio?: string | null;
    dataFim?: string | null;
    valorFatura: number;
    limiteAceitavelPeriodo: number;
    existingRateio?: RateioMoradorItem[];
  }): Promise<{
    moradores: RateioMoradorItem[];
    valorExcedente: number;
    numDiasFatura: number;
  }> {
    const numDiasFatura = calcularDiasEntreDatas(params.dataInicio, params.dataFim);
    const valorExcedente = Math.max(0, Number((Number(params.valorFatura || 0) - Number(params.limiteAceitavelPeriodo || 0)).toFixed(2)));

    const alocs = await logisticsService.fetchAlocacoesAtivas().catch(() => []);

    // Filtrar todas as alocações deste alojamento
    const matchingAlocs = alocs.filter(a => {
      if (params.alojamentoId && a.alojamento_id === params.alojamentoId) return true;
      if (params.alojamentoCodigo && a.alojamento_codigo === params.alojamentoCodigo) return true;
      if (params.alojamentoNome && a.alojamento_nome && a.alojamento_nome.toLowerCase().includes(params.alojamentoNome.toLowerCase())) return true;
      return false;
    });

    const pStart = params.dataInicio ? new Date(`${params.dataInicio.split('T')[0]}T00:00:00`) : null;
    const pEnd = params.dataFim ? new Date(`${params.dataFim.split('T')[0]}T23:59:59`) : null;

    const workerMap = new Map<string, RateioMoradorItem>();

    matchingAlocs.forEach(aloc => {
      if (!aloc.worker_id && !aloc.worker_nome) return;
      const wKey = aloc.worker_id || aloc.codigo_colab || aloc.worker_nome;

      let diasAlojado = numDiasFatura;
      const aStartStr = (aloc.data_inicio || aloc.data_checkin || '').split('T')[0];
      const aEndStr = (aloc.data_fim || aloc.data_baixa || '').split('T')[0];

      if (pStart && pEnd && aStartStr) {
        const aStart = new Date(`${aStartStr}T00:00:00`);
        const aEnd = aEndStr ? new Date(`${aEndStr}T23:59:59`) : new Date('2099-12-31T23:59:59');

        const overlapStart = aStart > pStart ? aStart : pStart;
        const overlapEnd = aEnd < pEnd ? aEnd : pEnd;

        if (overlapEnd < overlapStart) {
          // Sem interseção de datas com o período da fatura
          diasAlojado = 0;
        } else {
          diasAlojado = Math.max(1, Math.round((overlapEnd.getTime() - overlapStart.getTime()) / (1000 * 60 * 60 * 24)));
          if (diasAlojado > numDiasFatura) diasAlojado = numDiasFatura;
        }
      } else if (aloc.status === 'Checkout') {
        diasAlojado = 0;
      }

      if (diasAlojado > 0) {
        const prev = workerMap.get(wKey);
        if (!prev || diasAlojado > prev.dias_alojado) {
          workerMap.set(wKey, {
            worker_id: aloc.worker_id,
            worker_nome: aloc.worker_nome,
            codigo_colab: aloc.codigo_colab,
            empresa_contratante: aloc.empresa_contratante,
            cliente_nome: aloc.cliente_nome,
            obra_nome: aloc.obra_nome,
            data_entrada: aStartStr || undefined,
            data_saida: aEndStr || undefined,
            dias_alojado: diasAlojado,
            percentual: 0,
            valor_sugerido: 0,
            valor_desconto: 0,
            isento: false
          });
        }
      }
    });

    // Fallback: se nenhum morador cruzou exatamente com datas históricas (ex: fatura antiga), pegar os ocupantes ativos atuais do imóvel
    if (workerMap.size === 0) {
      matchingAlocs
        .filter(a => a.status !== 'Checkout')
        .forEach(aloc => {
          const wKey = aloc.worker_id || aloc.codigo_colab || aloc.worker_nome;
          if (!wKey || workerMap.has(wKey)) return;
          workerMap.set(wKey, {
            worker_id: aloc.worker_id,
            worker_nome: aloc.worker_nome,
            codigo_colab: aloc.codigo_colab,
            empresa_contratante: aloc.empresa_contratante,
            cliente_nome: aloc.cliente_nome,
            obra_nome: aloc.obra_nome,
            data_entrada: (aloc.data_inicio || '').split('T')[0] || undefined,
            data_saida: (aloc.data_fim || '').split('T')[0] || undefined,
            dias_alojado: numDiasFatura,
            percentual: 0,
            valor_sugerido: 0,
            valor_desconto: 0,
            isento: false
          });
        });
    }

    const moradores = Array.from(workerMap.values());

    // Distribuir valorExcedente pro-rata pelos dias_alojado dos moradores não isentos
    return {
      moradores: this.recalcularDistribuicaoProRata(moradores, valorExcedente),
      valorExcedente,
      numDiasFatura
    };
  },

  // 4. Recalcula a divisão pro-rata entre os moradores ativos (não isentos)
  recalcularDistribuicaoProRata(moradores: RateioMoradorItem[], valorExcedente: number): RateioMoradorItem[] {
    const ativos = moradores.filter(m => !m.isento && (Number(m.dias_alojado) || 0) > 0);
    const totalDias = ativos.reduce((acc, m) => acc + (Number(m.dias_alojado) || 0), 0);

    if (ativos.length === 0 || totalDias <= 0 || valorExcedente <= 0) {
      return moradores.map(m => ({
        ...m,
        percentual: 0,
        valor_sugerido: 0,
        valor_desconto: 0
      }));
    }

    let acumulado = 0;
    let activeIdx = 0;

    return moradores.map(m => {
      if (m.isento || (Number(m.dias_alojado) || 0) <= 0) {
        return {
          ...m,
          percentual: 0,
          valor_sugerido: 0,
          valor_desconto: 0
        };
      }

      activeIdx++;
      const dias = Number(m.dias_alojado) || 0;
      const pct = Number(((dias / totalDias) * 100).toFixed(2));
      let val = Number(((valorExcedente * dias) / totalDias).toFixed(2));

      if (activeIdx === ativos.length) {
        val = Number((valorExcedente - acumulado).toFixed(2));
      } else {
        acumulado = Number((acumulado + val).toFixed(2));
      }

      return {
        ...m,
        percentual: pct,
        valor_sugerido: val,
        valor_desconto: val
      };
    });
  },

  // 5. Criar ou Atualizar Fatura de Suministro
  async salvarFatura(payload: Partial<SuministroFatura>): Promise<SuministroFatura> {
    const client = getClient();
    const { data: authData } = await supabase.auth.getUser();
    const userEmail = authData?.user?.email || 'logistica@kotrik.com';

    let codigoFatura = payload.codigo_fatura;
    if (!codigoFatura && !payload.id) {
      const all = await fetchAllTableRows('suministros_faturas', 'id, codigo_fatura');
      let maxNum = 544;
      (all || []).forEach((r: any) => {
        const m = String(r.codigo_fatura || '').match(/SUM-(\d+)/i);
        if (m && m[1]) {
          const n = parseInt(m[1], 10);
          if (n > maxNum) maxNum = n;
        }
      });
      codigoFatura = `SUM-${String(maxNum + 1).padStart(4, '0')}`;
    }

    const numDias = payload.num_dias || calcularDiasEntreDatas(payload.data_inicio, payload.data_fim);
    const valorFatura = Number(payload.valor_fatura) || 0;
    const limiteAceitavel = Number(payload.limite_aceitavel_periodo) || 0;
    const valorExcedente = payload.valor_excedente !== undefined
      ? Number(payload.valor_excedente)
      : (limiteAceitavel > 0 ? Math.max(0, Number((valorFatura - limiteAceitavel).toFixed(2))) : 0);

    const dbObj: Record<string, any> = {
      alojamento_id: payload.alojamento_id || null,
      alojamento_codigo: payload.alojamento_codigo || null,
      alojamento_nome: payload.alojamento_nome || null,
      direccion_planilha: payload.direccion_planilha || payload.alojamento_nome || null,
      provedor_id: payload.provedor_id || null,
      provedor_nome: payload.provedor_nome || 'Proveedor',
      servico: payload.servico || 'Electricidad',
      concepto_original: payload.concepto_original || `FACTURA DE ${(payload.servico || 'SUMINISTRO').toUpperCase()}`,
      mes_periodo: payload.mes_periodo || '',
      data_inicio: payload.data_inicio || null,
      data_fim: payload.data_fim || null,
      num_dias: numDias,
      valor_fatura: valorFatura,
      limite_por_pessoa_mes: Number(payload.limite_por_pessoa_mes) || 0,
      limite_aceitavel_periodo: limiteAceitavel,
      ajuste_manual_limite: Boolean(payload.ajuste_manual_limite),
      valor_excedente: valorExcedente,
      qtd_moradores_periodo: Number(payload.qtd_moradores_periodo) || (payload.rateio_detalhes?.length || 0),
      rateio_status: payload.rateio_status || (valorExcedente > 0 ? 'pendente_revisao' : 'sem_excedente'),
      competencia_desconto: payload.competencia_desconto || null,
      rateio_detalhes: payload.rateio_detalhes || [],
      ordem_pagamento_id: payload.ordem_pagamento_id || null,
      num_ordem_pago: payload.num_ordem_pago || null,
      data_ordem_pago: payload.data_ordem_pago || null,
      estado_pago: payload.descontado_fianza ? 'DESCONTADO_FIANZA' : (payload.estado_pago || 'PENDIENTE'),
      estatus_alojamento: payload.estatus_alojamento || 'EN CURSO',
      descontado_fianza: Boolean(payload.descontado_fianza),
      anexo_fatura_url: payload.anexo_fatura_url || null,
      anexo_fatura_nome: payload.anexo_fatura_nome || null,
      observacoes: payload.observacoes || '',
      updated_at: new Date().toISOString()
    };

    if (codigoFatura) dbObj.codigo_fatura = codigoFatura;

    let savedId = payload.id;
    if (payload.id) {
      const { error } = await client
        .from('suministros_faturas')
        .update(dbObj)
        .eq('id', payload.id);
      if (error) throw error;
    } else {
      dbObj.criado_por = userEmail;
      const { data, error } = await client
        .from('suministros_faturas')
        .insert([dbObj])
        .select('id')
        .single();
      if (error) throw error;
      savedId = data.id;
    }

    // Se marcou Descontado de la Fianza e tem alojamento_id, sincronizar com fianza_detalhes do contrato
    if (dbObj.descontado_fianza && dbObj.alojamento_id) {
      try {
        await this.sincronizarAbatimentoFianzaAlojamento(dbObj.alojamento_id);
      } catch (e) {
        console.warn('Aviso ao sincronizar abatimento de fianza:', e);
      }
    }

    const list = await this.fetchFaturas();
    return list.find(f => f.id === savedId) || (dbObj as any);
  },

  // 6. Excluir Fatura(s)
  async excluirFaturas(ids: string | string[]): Promise<void> {
    const idList = Array.isArray(ids) ? ids : [ids];
    if (idList.length === 0) return;
    const { error } = await getClient()
      .from('suministros_faturas')
      .delete()
      .in('id', idList);
    if (error) throw error;
  },

  // 7. Sincronizar soma de faturas descontadas da fianza com o contrato do alojamento
  async sincronizarAbatimentoFianzaAlojamento(alojamentoId: string): Promise<void> {
    const { data: faturasFianza } = await getClient()
      .from('suministros_faturas')
      .select('valor_fatura')
      .eq('alojamento_id', alojamentoId)
      .eq('descontado_fianza', true);

    const somaSuministrosFianza = (faturasFianza || []).reduce(
      (acc: number, r: any) => acc + (Number(r.valor_fatura) || 0),
      0
    );

    await contratosLogisticsService.salvarVistoriaFianza(alojamentoId, {
      deducoes_suministros: Number(somaSuministrosFianza.toFixed(2))
    });
  },

  // 8. Solicitar Ordem de Pagamento para o Financeiro (Individual ou Lote de Suministros)
  async solicitarOrdemPagamentoFinanceiro(params: {
    faturaIds: string[];
    dataVencimento?: string;
    observacoesExtras?: string;
  }): Promise<{ opCount: number; codigosOP: string[] }> {
    const allFaturas = await this.fetchFaturas();
    const alojamentos = await registrosService.fetchAlojamentos();
    const alojMap = new Map(alojamentos.map(a => [a.id, a]));

    const selected = allFaturas.filter(f => params.faturaIds.includes(f.id));
    if (selected.length === 0) return { opCount: 0, codigosOP: [] };

    const codigosOP: string[] = [];
    const vencimentoDefault = params.dataVencimento || new Date().toISOString().split('T')[0];

    for (const fat of selected) {
      const aloj = fat.alojamento_id ? alojMap.get(fat.alojamento_id) : undefined;
      const prov = aloj?.provedor;
      const cont = aloj?.contrato;

      const iban = cont?.iban || prov?.iban || '';
      const banco = cont?.banco || prov?.banco || '';
      const titular = cont?.titular || prov?.titular_conta || prov?.nome_razao_social || fat.provedor_nome || 'Proveedor Suministro';
      const metodoPago = cont?.metodo_pago || prov?.metodo_pago || (iban ? 'Transferir' : 'Domiciliación / Recibo');

      const tipoPago = mapServicoToTipoPagoOP(fat.servico);

      // Resumo de consumo e excedente para o Financeiro visualizar na Ordem de Pagamento
      const resumoRateioObs = fat.valor_excedente > 0
        ? `⚡ EXCEDENTE DE CONSUMO DETECTADO: Factura €${fat.valor_fatura.toFixed(2)} | Límite Aceptable: €${fat.limite_aceitavel_periodo.toFixed(2)} | Excedente a Descontar: €${fat.valor_excedente.toFixed(2)} (${fat.rateio_detalhes.filter(m => !m.isento).length} trabajadores)`
        : `✅ Consumo dentro del límite aceptable (Factura: €${fat.valor_fatura.toFixed(2)}${fat.limite_aceitavel_periodo > 0 ? ` | Límite: €${fat.limite_aceitavel_periodo.toFixed(2)}` : ''})`;

      const obsFinal = [
        `Suministro: ${fat.servico} (${fat.concepto_original || ''})`,
        fat.data_inicio && fat.data_fim ? `Periodo Consumo: ${fat.data_inicio} a ${fat.data_fim} (${fat.num_dias} días)` : null,
        resumoRateioObs,
        fat.observacoes ? `Notas Suministro: ${fat.observacoes}` : null,
        params.observacoesExtras ? `Obs Finanzas: ${params.observacoesExtras}` : null
      ].filter(Boolean).join('\n');

      const opCriada = await financeLogisticsService.gerarOrdemPagamento({
        contrato_id: cont?.codigo || undefined,
        alojamento_id: fat.alojamento_id || undefined,
        alojamento_nome: fat.alojamento_nome || aloj?.nome || fat.direccion_planilha || 'Alojamiento',
        alojamento_codigo: fat.alojamento_codigo || aloj?.codigo || undefined,
        provedor_id: fat.provedor_id || aloj?.provedor_id || undefined,
        provedor_nome: prov?.nome_razao_social || fat.provedor_nome || 'Proveedor Suministros',
        iban_cobranca: iban,
        banco,
        titular,
        tipo_pago: tipoPago,
        forma_pagamento: metodoPago,
        anexo_url: fat.anexo_fatura_url || undefined,
        valor: fat.valor_fatura,
        data_vencimento: vencimentoDefault,
        periodo_competencia: fat.mes_periodo || undefined,
        observacoes: obsFinal
      });

      // Enviar imediatamente para a fila "Aguardando Aprovação" do Financeiro (/financeiro/titulos)
      await financeLogisticsService.enviarParaAprovacao(opCriada.id);

      // Atualizar fatura de suministro com o vínculo da OP criada
      await getClient()
        .from('suministros_faturas')
        .update({
          ordem_pagamento_id: opCriada.id,
          num_ordem_pago: opCriada.codigo_pago,
          data_ordem_pago: new Date().toISOString().split('T')[0],
          estado_pago: 'SOLICITADO',
          rateio_status: fat.valor_excedente > 0 && fat.rateio_status !== 'descontos_lancados'
            ? 'enviado_financeiro'
            : fat.rateio_status,
          updated_at: new Date().toISOString()
        })
        .eq('id', fat.id);

      codigosOP.push(opCriada.codigo_pago);
    }

    return { opCount: codigosOP.length, codigosOP };
  },

  // 9. Efetivar / Lançar Descontos do Excedente na Folha dos Trabalhadores (public.worker_discounts - Categoria SUMINISTROS)
  async lancarDescontosExcedenteFolha(params: {
    faturaId: string;
    competenciaDesconto: string; // YYYY-MM (ex: '2026-11')
    limiteAceitavelPeriodo: number;
    valorExcedente: number;
    rateioDetalhes: RateioMoradorItem[];
  }): Promise<{ lancadosCount: number; totalDescontado: number }> {
    const client = getClient();
    const { data: authData } = await supabase.auth.getUser();
    const userEmail = authData?.user?.email || 'financeiro@kotrik.com';

    const { data: faturaRow, error: fatErr } = await client
      .from('suministros_faturas')
      .select('*')
      .eq('id', params.faturaId)
      .single();

    if (fatErr || !faturaRow) {
      throw new Error('Factura de suministro no encontrada.');
    }

    // Buscar empresas e workers para resolver empresa_id de cada trabalhador com segurança
    const [{ data: empresasList }, { data: workersList }] = await Promise.all([
      supabase.schema('core_common').from('empresas').select('id, codigo, nome, nombre_comercial, razon_social'),
      supabase.schema('core_personal').from('workers').select('id, cod_colab, nome, empresa_id, contratante')
    ]);

    const defaultEmpresaId = empresasList?.[0]?.id || '00000000-0000-0000-0000-000000000000';
    const workerById = new Map<string, any>();
    (workersList || []).forEach((w: any) => {
      if (w.id) workerById.set(w.id, w);
    });

    const referenceDate = params.competenciaDesconto.length === 7
      ? `${params.competenciaDesconto}-01`
      : params.competenciaDesconto;

    const updatedRateio: RateioMoradorItem[] = [];
    let lancadosCount = 0;
    let totalDescontado = 0;

    for (const item of params.rateioDetalhes) {
      const valorDesc = Number(item.valor_desconto) || 0;

      // Se o item for isento ou valor <= 0, se tinha um discount_id anterior, removemos
      if (item.isento || valorDesc <= 0 || !item.worker_id) {
        if (item.discount_id) {
          await supabase.from('worker_discounts').delete().eq('id', item.discount_id);
        }
        updatedRateio.push({
          ...item,
          valor_desconto: 0,
          discount_id: null
        });
        continue;
      }

      const wInfo = workerById.get(item.worker_id);
      let resolvedEmpresaId = item.empresa_id || wInfo?.empresa_id || defaultEmpresaId;

      if (!resolvedEmpresaId && wInfo?.contratante && empresasList) {
        const matchEmp = empresasList.find((e: any) =>
          (e.nome || '').toLowerCase().includes(wInfo.contratante.toLowerCase()) ||
          (e.nombre_comercial || '').toLowerCase().includes(wInfo.contratante.toLowerCase())
        );
        if (matchEmp) resolvedEmpresaId = matchEmp.id;
      }

      const periodoStr = faturaRow.data_inicio && faturaRow.data_fim
        ? `${faturaRow.data_inicio} a ${faturaRow.data_fim}`
        : (faturaRow.mes_periodo || '');

      const descricaoDesconto = [
        `Excedente Suministro ${faturaRow.servico}`,
        periodoStr ? `(${periodoStr})` : null,
        `- Aloj. ${faturaRow.alojamento_codigo || ''} ${faturaRow.alojamento_nome || faturaRow.direccion_planilha || ''}`.trim(),
        `[Total Factura: €${Number(faturaRow.valor_fatura).toFixed(2)} | Franquicia: €${Number(params.limiteAceitavelPeriodo).toFixed(2)} | Estancia: ${item.dias_alojado} días]`,
        item.observacao ? `Obs: ${item.observacao}` : null
      ].filter(Boolean).join(' ');

      let discountId = item.discount_id || null;

      if (discountId) {
        const { data: updDisc, error: updErr } = await supabase
          .from('worker_discounts')
          .update({
            worker_id: item.worker_id,
            empresa_id: resolvedEmpresaId,
            category: 'SUMINISTROS',
            amount: Number(valorDesc.toFixed(2)),
            description: descricaoDesconto,
            reference_date: referenceDate,
            comprovante_url: faturaRow.anexo_fatura_url || null,
            comprovante_nome: faturaRow.anexo_fatura_nome || null,
            status: 'Ativo',
            updated_at: new Date().toISOString()
          })
          .eq('id', discountId)
          .select('id')
          .single();

        if (updErr || !updDisc) {
          discountId = null; // Fallback para insert se foi excluído manualmente lá em Descontos
        }
      }

      if (!discountId) {
        const { data: newDisc, error: insErr } = await supabase
          .from('worker_discounts')
          .insert([{
            worker_id: item.worker_id,
            empresa_id: resolvedEmpresaId,
            category: 'SUMINISTROS',
            amount: Number(valorDesc.toFixed(2)),
            description: descricaoDesconto,
            reference_date: referenceDate,
            is_recurring: false,
            comprovante_url: faturaRow.anexo_fatura_url || null,
            comprovante_nome: faturaRow.anexo_fatura_nome || null,
            status: 'Ativo'
          }])
          .select('id')
          .single();

        if (insErr) {
          console.error('Erro ao inserir desconto de suministro em worker_discounts:', insErr);
          throw new Error(`Falha ao lançar desconto para ${item.worker_nome}: ${insErr.message}`);
        }
        discountId = newDisc.id;
      }

      lancadosCount++;
      totalDescontado = Number((totalDescontado + valorDesc).toFixed(2));

      updatedRateio.push({
        ...item,
        empresa_id: resolvedEmpresaId,
        valor_desconto: Number(valorDesc.toFixed(2)),
        discount_id: discountId
      });
    }

    // Atualizar a fatura de suministro com o status 'descontos_lancados'
    await client
      .from('suministros_faturas')
      .update({
        limite_aceitavel_periodo: Number(params.limiteAceitavelPeriodo.toFixed(2)),
        valor_excedente: Number(params.valorExcedente.toFixed(2)),
        qtd_moradores_periodo: updatedRateio.filter(r => !r.isento).length,
        competencia_desconto: params.competenciaDesconto,
        rateio_detalhes: updatedRateio,
        rateio_status: lancadosCount > 0 ? 'descontos_lancados' : 'sem_excedente',
        aprovado_por: userEmail,
        updated_at: new Date().toISOString()
      })
      .eq('id', params.faturaId);

    return { lancadosCount, totalDescontado };
  },

  // 10. Salvar Limites Aceitáveis de Suministros diretamente no Alojamento
  async salvarLimitesAlojamento(alojamentoId: string, limites: SuministrosLimitesConfig): Promise<void> {
    const existing = await registrosService.fetchAlojamentoById(alojamentoId);
    if (!existing) throw new Error('Alojamiento no encontrado');

    const updatedSuministros = {
      ...(existing.suministros || {}),
      ...limites
    };

    await registrosService.updateAlojamento(alojamentoId, {
      ...existing,
      suministros: updatedSuministros
    });
  },

  // 11. Consolidar Resumo por Alojamento (Espelho da aba RESUMEN_DIRECCIONES + Parâmetros de Limite)
  async fetchResumenPorAlojamento(): Promise<ResumenSuministrosAlojamento[]> {
    const [faturas, alojamentos, alocsAtivas] = await Promise.all([
      this.fetchFaturas(),
      registrosService.fetchAlojamentos(),
      logisticsService.fetchAlocacoesAtivas().catch(() => [])
    ]);

    const alojMap = new Map(alojamentos.map(a => [a.id, a]));
    const alojByCode = new Map(alojamentos.filter(a => a.codigo).map(a => [a.codigo!, a]));

    const groups = new Map<string, ResumenSuministrosAlojamento>();

    // Inicializar grupos a partir das faturas existentes e dos alojamentos que possuem suministros ativos
    faturas.forEach(f => {
      const aloj = (f.alojamento_id ? alojMap.get(f.alojamento_id) : null) ||
                   (f.alojamento_codigo ? alojByCode.get(f.alojamento_codigo) : null);

      const groupKey = aloj?.id || f.alojamento_id || f.alojamento_codigo || f.direccion_planilha || f.alojamento_nome || 'SIN-ALOJ';

      if (!groups.has(groupKey)) {
        const ocupantesAtuais = aloj
          ? alocsAtivas.filter(al => al.status !== 'Checkout' && (al.alojamento_id === aloj.id || al.alojamento_codigo === aloj.codigo)).length
          : 0;

        groups.set(groupKey, {
          alojamento_id: aloj?.id || f.alojamento_id || null,
          alojamento_codigo: aloj?.codigo || f.alojamento_codigo || 'S/C',
          alojamento_nome: aloj?.nome || aloj?.titulo || f.alojamento_nome || f.direccion_planilha || 'Alojamiento',
          endereco: aloj?.endereco || f.direccion_planilha || '',
          municipio: aloj?.municipio || '',
          provincia: aloj?.provincia || '',
          capacidade_pessoas: aloj?.capacidade_pessoas || 0,
          ocupantes_atuais: ocupantesAtuais,
          estatus: f.estatus_alojamento || (aloj?.ativo ? 'EN CURSO' : 'FINALIZADO'),
          num_registros: 0,
          total_geral: 0,
          total_electricidad: 0,
          total_agua: 0,
          total_gas: 0,
          total_internet: 0,
          total_limpieza: 0,
          total_calefaccion: 0,
          total_comunidad: 0,
          total_tasas: 0,
          total_abonos: 0,
          total_otros: 0,
          total_excedente_gerado: 0,
          total_pendente_pago: 0,
          limites_config: (aloj?.suministros as SuministrosLimitesConfig) || {}
        });
      }

      const g = groups.get(groupKey)!;
      const val = Number(f.valor_fatura) || 0;
      const serv = (f.servico || '').toLowerCase();

      g.num_registros += 1;

      if (serv.includes('abono')) {
        g.total_abonos = Number((g.total_abonos + val).toFixed(2));
      } else {
        g.total_geral = Number((g.total_geral + val).toFixed(2));
      }

      if (serv.includes('electr') || serv.includes('luz')) {
        g.total_electricidad = Number((g.total_electricidad + val).toFixed(2));
      } else if (serv.includes('agua')) {
        g.total_agua = Number((g.total_agua + val).toFixed(2));
      } else if (serv.includes('gas')) {
        g.total_gas = Number((g.total_gas + val).toFixed(2));
      } else if (serv.includes('internet') || serv.includes('wifi')) {
        g.total_internet = Number((g.total_internet + val).toFixed(2));
      } else if (serv.includes('limp') || serv.includes('reparac')) {
        g.total_limpieza = Number((g.total_limpieza + val).toFixed(2));
      } else if (serv.includes('calefac')) {
        g.total_calefaccion = Number((g.total_calefaccion + val).toFixed(2));
      } else if (serv.includes('comunidad')) {
        g.total_comunidad = Number((g.total_comunidad + val).toFixed(2));
      } else if (serv.includes('tasa') || serv.includes('residuo') || serv.includes('basura')) {
        g.total_tasas = Number((g.total_tasas + val).toFixed(2));
      } else if (!serv.includes('abono')) {
        g.total_otros = Number((g.total_otros + val).toFixed(2));
      }

      if (f.valor_excedente > 0) {
        g.total_excedente_gerado = Number((g.total_excedente_gerado + f.valor_excedente).toFixed(2));
      }

      if (f.estado_pago === 'PENDIENTE' || f.estado_pago === 'SOLICITADO' || f.estado_pago === 'CORRECCION_SOLICITADA') {
        g.total_pendente_pago = Number((g.total_pendente_pago + val).toFixed(2));
      }

      if (f.estatus_alojamento === 'EN CURSO') {
        g.estatus = 'EN CURSO';
      }
    });

    return Array.from(groups.values()).sort((a, b) => b.total_geral - a.total_geral);
  }
};
