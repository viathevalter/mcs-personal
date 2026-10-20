export type BIVisionTab = 'overview' | 'comercial' | 'financeiro' | 'faturamento' | 'operacional' | 'wallboard';

export interface BIFilters {
  year: number;
  month: number | 'all'; // 1-12 or 'all' for full year
  compareWithPreviousMonth: boolean;
  country: string; // 'all' | 'ES' | 'FR' | 'IT' | 'AE' | 'PT'
  empresa: string; // 'all' or normalized company name / id
  vendedor: string; // 'all' or seller name
  cliente: string; // 'all' or client name
}

export interface DrillDownRecord {
  id: string;
  codigo?: string;
  titulo: string;
  subtitulo?: string;
  empresa?: string;
  pais?: string;
  vendedor?: string;
  cliente?: string;
  status?: string;
  data?: string;
  quantidade?: number;
  horas?: number;
  valor?: number;
  link?: string;
  extra?: Record<string, string | number | null | undefined>;
}

export interface DrillDownPayload {
  title: string;
  subtitle: string;
  category: 'comercial' | 'financeiro' | 'faturamento' | 'operacional';
  metricLabel: string;
  totalValue?: string;
  records: DrillDownRecord[];
}

export interface MonthlyEvolutionPoint {
  month: number;
  monthLabel: string;
  // Comercial
  presupuestosCount: number;
  presupuestosValor: number;
  aprovadosCount: number;
  aprovadosValor: number;
  firmadosCount: number;
  firmadosValor: number;
  pedidosCount: number;
  perfisDemandados: number;
  novosClientes: number;
  // Financeiro
  cobrancaEmitidaValor: number;
  cobrancaRecebidaValor: number;
  cobrancaVencidaValor: number;
  cobrancaAVencerValor: number;
  cobrancaTitulosCount: number;
  // Faturamento & Horas
  horasTrabalhadas: number;
  horasApontadasApp: number;
  trabalhadoresComHoras: number;
  faturamentoValor: number;
  // Operacional / RH
  novasContratacoes: number;
  reemplazos: number;
  baixasDesistencias: number;
}

export interface CommercialBIMetrics {
  totalPresupuestosCount: number;
  totalPresupuestosValor: number;
  aprovadosCount: number;
  aprovadosValor: number;
  firmadosCount: number;
  firmadosValor: number;
  taxaConversaoValor: number;
  taxaConversaoQtd: number;
  novosLeadsCount: number;
  novosClientesConvertidos: number;
  pedidosGeradosCount: number;
  perfisSolicitadosCount: number;
  bySeller: Array<{
    vendedor: string;
    presupuestosCount: number;
    presupuestosValor: number;
    firmadosCount: number;
    firmadosValor: number;
    pedidosCount: number;
    perfisCount: number;
    conversaoPct: number;
  }>;
  byCountry: Array<{
    code: string;
    name: string;
    flag: string;
    presupuestosCount: number;
    presupuestosValor: number;
    firmadosValor: number;
    pedidosCount: number;
    perfisCount: number;
  }>;
  byProfile: Array<{
    perfil: string;
    quantidadeOrcada: number;
    quantidadePedidos: number;
  }>;
  rawRecords: {
    estimaciones: DrillDownRecord[];
    aprovados: DrillDownRecord[];
    firmados: DrillDownRecord[];
    pedidos: DrillDownRecord[];
    leads: DrillDownRecord[];
  };
}

export interface FinancialBIMetrics {
  totalTitulosCount: number;
  totalEmitidoValor: number;
  recebidoCount: number;
  recebidoValor: number;
  aVencerCount: number;
  aVencerValor: number;
  vencidoCount: number;
  vencidoValor: number;
  inadimplenciaPct: number;
  byClientCashFlow: Array<{
    cliente: string;
    empresa: string;
    titulosCount: number;
    totalEmitido: number;
    recebido: number;
    aVencer: number;
    vencido: number;
    atrasoMedioDias: number;
  }>;
  byCompany: Array<{
    empresa: string;
    recebido: number;
    aVencer: number;
    vencido: number;
    titulosCount: number;
  }>;
  rawRecords: {
    todosTitulos: DrillDownRecord[];
    recebidos: DrillDownRecord[];
    vencidos: DrillDownRecord[];
    aVencer: DrillDownRecord[];
  };
}

export interface BillingHoursBIMetrics {
  totalHorasPeriodo: number;
  totalHorasMesAnterior: number;
  variacaoHorasMoMPct: number;
  totalFaturamentoPeriodo: number;
  totalFaturamentoMesAnterior: number;
  variacaoFaturamentoMoMPct: number;
  totalTrabalhadoresFaturados: number;
  totalClientesAtendidos: number;
  tarifaMediaHora: number;
  mediaHorasPorTrabalhador: number;
  byClientMatrix: Array<{
    cliente: string;
    empresa: string;
    pais: string;
    trabalhadoresCount: number;
    horasTotais: number;
    tarifaMedia: number;
    valorFaturado: number;
    statusFaturamento: string;
  }>;
  rawRecords: {
    faturamentoClientes: DrillDownRecord[];
    horasLancadas: DrillDownRecord[];
  };
}

export interface OperationalRHBIMetrics {
  totalTrabalhadoresAtivos: number;
  totalTrabalhadoresBase: number;
  novasContratacoesPeriodo: number;
  reemplazosPeriodo: number;
  baixasDesistenciasPeriodo: number;
  taxaSubstituicaoPct: number;
  taxaRetencaoPct: number;
  // App & Horas em Tempo Real
  trabalhadoresApontandoApp: number;
  trabalhadoresPendentesApp: number;
  horasApontadasTempoReal: number;
  folhasValidadasCount: number;
  folhasEnviadasCount: number;
  folhasPendentesCount: number;
  // Seguridade & Comunicação
  altasSeguridadeAtivas: number;
  emRegularizacaoSeguridade: number;
  mensagensAppWhatsappCount: number;
  byClientOperations: Array<{
    cliente: string;
    empresa: string;
    pais: string;
    ativos: number;
    novasContratacoes: number;
    reemplazos: number;
    baixas: number;
    horasApp: number;
  }>;
  rawRecords: {
    novasContratacoes: DrillDownRecord[];
    reemplazos: DrillDownRecord[];
    baixas: DrillDownRecord[];
    apontamentosApp: DrillDownRecord[];
    ativos: DrillDownRecord[];
  };
}

export type WallboardWidgetId =
  | 'kpi_global_strip'
  | 'comercial_funnel'
  | 'comercial_vendedores'
  | 'comercial_paises'
  | 'financeiro_cashflow_clientes'
  | 'financeiro_cobranca_status'
  | 'faturamento_evolucao_anual'
  | 'faturamento_matriz_clientes'
  | 'operacional_contratacoes_reemplazos'
  | 'operacional_app_horas_realtime'
  | 'operacional_clientes_alocacao'
  | 'comunicacao_whatsapp_app';

export interface WallboardWidgetDef {
  id: WallboardWidgetId;
  title: string;
  subtitle: string;
  category: 'comercial' | 'financeiro' | 'faturamento' | 'operacional';
  size: 'full' | 'half' | 'third';
}
