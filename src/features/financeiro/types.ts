export interface Cliente {
  CodCliente: string;
  RazonSocial: string;
  NombreComercial: string;
  EmailCobros: string;
  TelefonoCobros: string;
  RespCobros: string;
  TpPrazosPg: string;
  Pais: string;
  Provincia: string;
  Municipio: string;
  Domicilio: string;
}

export interface ContasReceber {
  id: string;
  Empresa: string;
  CodCliente: string;
  Cliente: string; // Raw client name from CSV
  Obra: string;
  Num_doc: string;
  Data_emissao: Date | null;
  Dt_venc: Date | null;
  dt_recebimento: Date | null;
  Valot_total: number;
  Saldo_a_pagar: number;
  Valor_parcial: number;
  periodo_fat: string;
  Status: 'Pago' | 'Vencido' | 'A vencer' | 'Parcial' | string;
  Integral_parcial: 'Integral' | 'Parcial' | string;
  Banco: string;
  Form_receb: string;
  Tipo_cobros: string;
  comisao_taxa: string;
  Obs: string;
  comentarios: string;
  obs_recebimento: string;
  Hist_ValorParcial: any[]; // Parsed JSON
  Creado: Date | null;
  Creado_por: string;
  Modificado: Date | null;
  Modificado_por: string;
}

export interface EnrichedTitulo extends ContasReceber {
  clienteInfo?: Cliente;
}

export interface DashboardMetrics {
  recebidoOntem: number;
  countRecebidoOntem: number;
  recebidoPeriodo: number;
  countRecebidoPeriodo: number;
  saldoVencido: number;
  countSaldoVencido: number;
  aVencer30d: number;
  countAVencer30d: number;
  percentualVencido: number;
  clientesAtraso: number;
  countClientesAtrasoTitulos: number;
  totalOpenBalance: number;
  countTotalOpen: number;
}

export interface FilterState {
  empresa: string[];
  periodo: [Date | null, Date | null];
  status: string;
  banco: string;
  cliente: string;
  periodoFat: string[];
}
