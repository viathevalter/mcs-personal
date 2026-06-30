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
  categoria_id?: string;
  departamento_id?: string;
  obra_id?: string;
  anexo_url?: string;
  pagamentos_reais?: any[];
  fatura_id?: string;
}

export interface FinanceiroCategoria {
  id: string;
  nome: string;
  descricao?: string;
  tipo: string;
  ativo: boolean;
  cod_snc?: string;
  categoria_dre?: string;
  nivel?: string;
  classe?: string;
}

export interface Obra {
  id: string;
  nome: string;
  cliente_id?: string;
  status: string;
}

export interface Banco {
  id: string;
  empresa_id: number;
  nome_banco: string;
  agencia: string;
  conta: string;
  iban: string;
  ativo: boolean;
}

export interface Recebimento {
  id: string;
  conta_receber_id: string;
  valor: number;
  data_recebimento: string;
  forma_pagamento: string;
  tipo_recebimento: string;
  banco_id?: string;
  criado_por?: string;
  criado_em?: string;
}

export interface CobrancaObservacao {
  id: string;
  conta_receber_id: string;
  data: string;
  usuario: string;
  tipo: string;
  descricao: string;
  anexo_url?: string;
}
export interface Obra {
  id: string;
  nome: string;
  cliente_id?: string;
  status: string;
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

export interface ContasPagar {
  id: string;
  sp_id?: number | null;
  sp_modified?: Date | null;
  Empresa: string;
  CodProvedor: string;
  Provedor: string;
  Obra: string;
  periodo_fat: string;
  Data_emissao: Date | null;
  competencia: string;
  Dt_venc: Date | null;
  Moeda: string;
  Valor_total: number;
  Status: string;
  origem: string;
  cat_despesa: string;
  centro_custo: string;
  conta_contab: string;
  Num_doc: string;
  Obs: string;
  Creado: Date | null;
  Creado_por: string;
  Banco: string;
  comentarios: string;
  form_pag: string;
  hist_valor_parcial?: any[];
  integral_parcial: string;
  prev_pag: string;
  saldo_a_pagar: number;
  valor_parcial: number;
  obs_pagamento: string;
  dt_pagamento: Date | null;
  Modificado: Date | null;
  Modificado_por: string;
  categoria_id?: string | null;
  departamento_id?: string | null;
  obra_id?: string | null;
  anexo_url?: string | null;
  ordem_pagamento_id?: string | null;
  ordem_pagamento_item_id?: string | null;
  pagamentos_reais?: ContasPagarPagamento[];
}

export interface ContasPagarPagamento {
  id: string;
  conta_pagar_id: string;
  valor: number;
  data_pagamento: string;
  forma_pagamento: string;
  tipo_pagamento: string;
  banco_id?: string | null;
  criado_por?: string | null;
  criado_em?: string | null;
}

export interface OrdemPagamentoItem {
  id: string;
  cod_orden_pago_item: string;
  ordem_pagamento_id: string;
  cod_orden_pago: string;
  cod_pago?: string | null;
  cod_contrato?: string | null;
  cod_provedor?: string | null;
  cod_servicio?: string | null;
  cod_alojamiento?: string | null;
  cod_cliente?: string | null;
  categoria_orden?: string | null;
  id_empresa?: string | null;
  tipo_origem?: string | null;
  id_origem?: string | null;
  valor_orden: number;
  vencimento_orden: string;
  centro_custo?: string | null;
  status_item?: string | null;
  comprovante_item?: string | null;
  observacion_item?: string | null;
  cod_colab?: string | null;
  motivo_denegacion?: string | null;
  aprovado_por?: string | null;
  otros_gastos?: string | null;
  created_at?: string | null;
}

export interface MovimentoPago {
  id: string;
  ordem_pagamento_id: string;
  cod_mov: string;
  tipo_mov: string;
  estado_mov: string;
  valor_pago?: number | null;
  observaciones?: string | null;
  criado_por?: string | null;
  criado_em?: string | null;
  anexo_url?: string | null;
  banco_id?: string | null;
  forma_pagamento?: string | null;
}

export interface OrdemPagamento {
  id: string;
  descricao: string;
  fornecedor_id?: string | null;
  valor: number;
  data_vencimento: string;
  status: 'rascunho' | 'aguardando_aprovacao' | 'aprovado' | 'pago' | 'rejeitado';
  criador_id: string;
  aprovador_id?: string | null;
  created_at: string;
  updated_at: string;
  cod_orden_pago?: string | null;
  departamento_origem?: string | null;
  cod_cliente?: string | null;
  cod_servicio?: string | null;
  cod_provedor?: string | null;
  cod_contrato?: string | null;
  cod_alojamiento?: string | null;
  id_empresa?: string | null;
  tipo_orden?: string | null;
  observaciones?: string | null;
  observaciones_financeiro?: string | null;
  fecha_aprobacion?: string | null;
  pago_por?: string | null;
  fecha_pago?: string | null;
  comprovante_general?: string | null;
  qtde_itens?: number;
  cancelado_por?: string | null;
  fecha_cancelamento?: string | null;
  anexos?: string | null;
  centro_custos?: string | null;
  tipo_proveedor?: string | null;
  tipo_centro_custo?: string | null;
  item_ordem?: string | null;
  cat_despesas?: string | null;
  contab_conta_snc?: string | null;
  fecha_vencto?: string | null;
  itens?: OrdemPagamentoItem[];
}
