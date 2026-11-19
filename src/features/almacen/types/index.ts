export type PickingStatus =
  | 'PENDENTE'
  | 'EM_SEPARACAO'
  | 'CONFERIDO'
  | 'DESPACHADO'
  | 'ENTREGUE'
  | 'CANCELADO';

export type RequestType = 'ASIGNACION' | 'REPOSICION' | 'DETERIORO';

export type DeliveryMethod = 'NACEX' | 'RECOGIDA' | 'OBRA' | 'ALOJAMIENTO';

export type CarrierStatus =
  | 'PENDENTE_ENVIO'
  | 'EM_TRANSITO'
  | 'DISPONIVEL_RETIRADA'
  | 'ENTREGUE'
  | 'INCIDENCIA';

export interface AlmacenDeliveryPoint {
  id: string;
  name: string;
  point_type: 'NACEX_AGENCIA' | 'NACEX_SHOP' | 'OBRA_FIXA' | 'OUTRO';
  nacex_code: string | null;
  address_line: string;
  postal_code: string | null;
  city: string | null;
  province: string | null;
  phone: string | null;
  notes: string | null;
  is_active: boolean;
  created_at: string;
}

export type MovementType =
  | 'ENTRADA_COMPRA'
  | 'SAIDA_ASIGNACION'
  | 'SAIDA_REPOSICION'
  | 'SAIDA_DETERIORO'
  | 'AJUSTE_INVENTARIO'
  | 'DEVOLUCAO';

export interface AlmacenEpi {
  id: string;
  code: string | null;
  name: string;
  description: string | null;
  category: string | null;
  unit: string | null;
  default_cost: number | null;
  status: string;
  is_branded: boolean;
  has_sizes: boolean;
  size_category: string | null;
}

export interface AlmacenEmpresa {
  id: string;
  nome: string;
  trade_name?: string | null;
  legal_name?: string | null;
  tax_id?: string | null;
}

export interface AlmacenSize {
  id: string;
  category: 'camisa' | 'pantalon' | 'calzado' | string;
  code: string;
  label: string;
  sort_order: number;
  is_active: boolean;
}

export interface AlmacenStockItem {
  id: string;
  epi_id: string;
  empresa_id: string | null;
  size_code: string;
  sku_code: string | null;
  quantity_on_hand: number;
  quantity_reserved: number;
  min_stock: number;
  location_bin: string | null;
  supplier_name?: string | null;
  unit_cost: number | null;
  updated_at: string;
  epi?: AlmacenEpi;
  empresa?: AlmacenEmpresa | null;
}

export interface AlmacenStockMovement {
  id: string;
  stock_id: string;
  movement_type: MovementType;
  quantity_delta: number;
  previous_qty: number;
  new_qty: number;
  reference_type: string | null;
  reference_id: string | null;
  notes: string | null;
  created_by: string | null;
  created_at: string;
}

export interface PickingItem {
  id: string;
  picking_order_id: string;
  epi_id: string | null;
  stock_id: string | null;
  item_name: string;
  size_code: string;
  sku_code: string | null;
  quantity_requested: number;
  quantity_picked: number;
  is_checked: boolean;
  unit_cost: number;
}

export interface PickingOrder {
  id: string;
  order_number: string;
  pedido_id: string | null;
  pedido_codigo: string | null;
  empresa_id: string | null;
  empresa_nome: string | null;
  client_id: string | null;
  client_nome: string | null;
  worker_id: string | null;
  cod_colab: string | null;
  worker_nome: string;
  worker_identificacion: string | null;
  worker_phone: string | null;
  job_function_id: string | null;
  job_function_name: string | null;
  request_type: RequestType;
  status: PickingStatus;
  camiseta_size: string | null;
  pantalones_size: string | null;
  delivery_method: DeliveryMethod | null;
  delivery_point_id?: string | null;
  tracking_code: string | null;
  delivery_address: string | null;
  carrier_status?: CarrierStatus | null;
  carrier_status_detail?: string | null;
  carrier_last_sync_at?: string | null;
  signature_token: string;
  signed_at: string | null;
  signed_by_name: string | null;
  signature_data_url: string | null;
  observations: string | null;
  expected_start_date: string | null;
  prepared_at: string | null;
  dispatched_at: string | null;
  delivered_at: string | null;
  created_at: string;
  updated_at: string;
  items?: PickingItem[];
}

export interface RequiredEpiPreview {
  epi_id: string;
  epi_name: string;
  epi_code: string | null;
  is_branded: boolean;
  has_sizes: boolean;
  size_category: string | null;
  quantity: number;
  is_required: boolean;
  renewal_period_days: number | null;
  unit_cost: number;
}

export interface DemandaWorkerAlmacen {
  worker_id: string;
  cod_colab: string | null;
  nome: string;
  identificacion: string | null;
  movil: string | null;
  camiseta: string | null;
  pantalones: string | null;
  job_function_id: string | null;
  job_function_name: string | null;
  required_epis: RequiredEpiPreview[];
  existing_order?: PickingOrder | null;
  last_dispatch_at?: string | null;
  has_recent_dispatch: boolean;
  alojamento_tipo: 'alojamento' | 'propio' | 'cliente' | 'pendente';
  alojamento_nome: string | null;
  alojamento_endereco: string | null;
  alojamento_cidade: string | null;
  is_replacement: boolean;
  replacement_code?: string | null;
}

export interface DemandaPedidoAlmacen {
  pedido_id: string;
  codigo: string;
  empresa_id: string | null;
  empresa_nome: string;
  client_id: string | null;
  client_nome: string;
  site_nome: string | null;
  site_cidade: string | null;
  site_address: string | null;
  site_postal_code: string | null;
  site_contact_name: string | null;
  site_contact_phone: string | null;
  expected_start_date: string | null;
  operational_status: string | null;
  workers: DemandaWorkerAlmacen[];
  pending_count: number;
  total_workers: number;
}

export interface WorkerReplenishmentRow {
  worker_id: string;
  cod_colab: string | null;
  nome: string;
  identificacion: string | null;
  movil: string | null;
  camiseta: string | null;
  pantalones: string | null;
  empresa_id: string | null;
  empresa_nome: string | null;
  client_id: string | null;
  client_nome: string | null;
  pedido_id: string | null;
  pedido_codigo: string | null;
  job_function_id: string | null;
  job_function_name: string | null;
  alojamento_nome: string | null;
  alojamento_endereco: string | null;
  site_address: string | null;
  last_order: PickingOrder | null;
  last_dispatch_at: string | null;
  days_since_last: number | null;
  total_orders: number;
  history: PickingOrder[];
}

export const STANDARD_SIZES = ['S', 'M', 'L', 'XL', 'XXL', 'XXXL'] as const;
