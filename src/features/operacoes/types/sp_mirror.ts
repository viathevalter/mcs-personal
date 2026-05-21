
// Base Type for all SharePoint Mirror Entities
export interface SPBaseEntity {
  id: string;          // UUID local (App internal ID)
  sp_id: number;       // SharePoint ID (Integer)
  sp_created: string;  // ISO Date
  sp_modified: string; // ISO Date
}

export interface SPClient extends SPBaseEntity {
  name: string;        // Title in SP
  company: string;     // 'Mastercorp PT', 'Mastercorp ES', etc.
  nif?: string;
  industry?: string;   // 'Naval', 'Civil', 'Industrial'
  status: 'Ativo' | 'Inativo';
  email?: string;
  phone?: string;
}

export interface SPWorker extends SPBaseEntity {
  nome: string;
  documento: string;   // NIF/NIE/Passport
  nacionalidade: string;
  categoria_profissional: string; // 'Soldador', 'Tubista', etc.
  status: 'Disponível' | 'Alocado' | 'Baixa Médica' | 'Férias' | 'Inativo';
  email?: string;
  phone?: string;
}

export interface SPObra extends SPBaseEntity {
  codigo: string;
  nome: string;
  client_sp_id: number; // Lookup to SPClient
  localizacao: string;
  status: 'Em Andamento' | 'Concluída' | 'Pausada';
}

export interface SPPedido extends SPBaseEntity {
  codigo: string;      // 'PED-2023-001'
  client_sp_id: number;
  obra_sp_id?: number; // Optional
  data_inicio: string;
  data_fim_estimada?: string;
  status: 'Rascunho' | 'Aberto' | 'Em Execução' | 'Fechado' | 'Cancelado';
  comercial_email: string;
}

export interface SPReemplazo extends SPBaseEntity {
  codigo: string;      // 'R-1001'
  client_sp_id: number;
  pedido_sp_id: number;
  worker_old_sp_id: number;
  worker_new_sp_id?: number; // Pode ser null se ainda não houver substituto
  motivo: 'Baixa Médica' | 'Desempenho' | 'Abandono' | 'Fim Contrato' | 'Outro';
  data_solicitacao: string;
  status: 'Pendente' | 'Em Análise' | 'Aprovado' | 'Recusado' | 'Concluído';
}

export interface SPReubicacion extends SPBaseEntity {
  codigo: string;      // 'RB-500'
  client_sp_id: number;
  pedido_sp_id: number;
  worker_sp_id: number;
  obra_from_sp_id: number;
  obra_to_sp_id: number;
  data_movimento: string;
  motivo: string;
  status: 'Planeado' | 'Em Trânsito' | 'Concluído';
}

export interface SPPresupuesto extends SPBaseEntity {
  codigo: string;      // 'ORC-2023-99'
  client_sp_id: number;
  titulo: string;
  valor_total: number;
  etapa: 'Enviado' | 'Negociação' | 'Ganho' | 'Perdido';
}
