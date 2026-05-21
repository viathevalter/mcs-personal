import type { IncidentContext, OriginType } from "../types/models";
export type { IncidentContext, OriginType };

export interface Cliente {
  id: number | string;
  nome: string;
  status: string;
  projetos: number;
}

export interface KpiData {
  label: string;
  value: number | string;
  trend?: number; // percentage
  trendLabel?: string;
  color?: "default" | "success" | "warning" | "danger" | "primary";
}

export interface RankItem {
  id: string;
  name: string;
  value: number;
  subValue?: string;
  avatar?: string;
}

export interface ChartData {
  name: string;
  pedidos: number;
  estimaciones: number;
  reemplazos: number;
  reubicaciones: number;
}

// Canonical Profile Type
export interface ProfileMix {
  funcion_id: number | string;
  funcion_nome: string; // Resolved name
  estimado: number;
  pedido: number;
  real: number; // Allocated
  gap: number;
}

// Database Row Types (Approximate based on raw tables)
export interface Pedido {
  id: number;
  CodPedido: string;
  Cliente: string;
  Comercial: string;
  Empresa: string;
  DataEmissao: string;
  DataInicio: string;
  Status: string;
  TrabalhadoresSolicitados?: number;
}

export interface PedidoItem {
  id: number;
  idFuncionCol: number; // FK to Funcion
  nombrePerfil: string; // Fallback text
  qtdSolicitada: number;
  resolvedName?: string; // COALESCE(Funcion.Nome, ItensPedido.NombrePerfil)
}

export interface ColaboradorAlocado {
  id: number;
  nome: string;
  idFuncion: number; // FK to Funcion
  funcionNome: string; // Resolved name
  dataInicio: string;
  tipoAlocacao?: string;
}

export interface Estimacion {
  id: number;
  Titulo: string;
  Cliente: string;
  Etapa: "Enviado" | "Negociación" | "Firmado" | "Convertido" | "Perdido";
  Valor?: number;
  DataCriacao: string;
}

export interface EventoOperacional {
  id: number;
  codigo?: string;
  tipo: "Reemplazo" | "Reubicacion";
  motivo: string;
  colaborador: string; // Colaborador principal ou resumo
  perfil: string; // Perfil solicitado ou resumo
  cliente: string;
  data: string; // Data Inicio
  dataFim?: string;
  status: string;

  // Detalhes consolidados
  itens?: {
    perfil: string;
    qtd: number;
  }[];
  colaboradores?: {
    nome: string;
    funcao?: string;
    tipo: "Saiu" | "Entrou" | "Mudou";
  }[];
}

export interface Filters {
  monthRange: [string, string]; // "YYYY-MM", "YYYY-MM"
  empresa: string | null;
  comercial: string | null;
  cliente: string | null;
}

// --- INCIDENCIAS TYPES ---

export type IncidenciaStatus = 'Aberto' | 'Em Andamento' | 'Resolvido' | 'Fechado';
export type IncidenciaPrioridade = 'Baixa' | 'Media' | 'Alta' | 'Critica'; // Legacy field mapping to Impacto
export type IncidenciaImpacto = 'Baixo' | 'Médio' | 'Alto' | 'Crítico';
export type OrigemCriacao = 'manual' | 'automacao';

export interface Incidencia {
  id: string; // Updated to string (UUID)
  titulo: string;
  descricao?: string;
  tipo: string; // Ex: Falta, Qualidade, Acidente

  // Legacy & New Fields
  prioridade: IncidenciaPrioridade; // Mantido para compatibilidade
  impacto: IncidenciaImpacto;     // Novo campo padronizado PT

  status: IncidenciaStatus;

  // Dates
  data_abertura: string;
  data_fechamento?: string; // fecha_fin
  updated_at?: string;
  prazo_estimado?: string; // Para cálculo de SLA

  // Context & Origin
  context: IncidentContext;
  origem_tipo: OriginType;
  origem_codigo?: string; // Legacy/Display helper
  origem_criacao: OrigemCriacao;

  // Relations (Denormalized for list view or joins)
  responsavel_id?: string;
  criado_por?: string;        // Email/Login
  criado_por_nome?: string;   // Nome exibível
  cliente?: string;
  empresa?: string;
  comercial?: string;
  departamento_owner_nome?: string;
  departamentos_envolvidos?: string[]; // Derived from Tasks or Tags

  // View/Calculated Fields
  progresso_pct?: number; // 0-100
  tarefas_totais?: number;
  tarefas_concluidas?: number;
  sla_dias?: number; // Dias restantes (pode ser negativo)

  tags?: string[];
}

export interface IncidenciaTarefa {
  id: string; // Updated to string
  incidencia_id: string; // Updated to string
  titulo: string;
  status: 'Pendente' | 'Em Andamento' | 'Concluida';
  ordem: number;
  departamento?: string; // RH, Ops, Safety
  prazo?: string; // ISO Date (Deadline)
  scheduled_for?: string; // ISO Date (Plano de Início/Agendado Para)
  evidencia?: string; // Texto ou Link
  responsavel_email?: string | null;
  created_by?: string;

  // Time Tracking
  started_at?: string;
  completed_at?: string;
  last_status_change_at?: string;

  // View fields
  sla_dias?: number;
}

// Helper type for the tasks list view which needs parent data
export interface IncidenciaTarefaExpandida extends IncidenciaTarefa {
  incidencia_titulo?: string;
  incidencia_impacto?: IncidenciaImpacto;
  incidencia_progresso?: number; // Calculated progress of parent
  origem_codigo?: string;
  context?: IncidentContext; // Parent context access
}

export interface IncidenciaLog {
  id: string; // Updated to string
  incidencia_id: string; // Updated to string
  mensagem: string;
  criado_em: string;
  usuario?: string;
}

// --- PLAYBOOKS (AUTOMATION) ---

export interface Playbook {
  id: string; // UUID usually
  tipo: string; // Tag to match incident type?
  nome: string;
  ativo: boolean;
  descricao?: string;
  version?: number;
}

export interface PlaybookTarefa {
  id: string;
  playbook_id: string;
  ordem: number;
  departamento: string; // ID or Name
  titulo: string;
  descricao?: string;
  sla_dias: number;
}
