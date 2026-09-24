export type TipoReuniao = 
  | 'comercial_rh'
  | 'comercial_logistica'
  | 'contratacao_financeiro'
  | 'logistica_financeiro'
  | 'documentacao_rh'
  | 'geral_operacoes'
  | 'outro';

export type StatusReuniao = 'agendada' | 'em_andamento' | 'concluida' | 'cancelada';

export interface ReuniaoAcao {
  id: string;
  reuniao_id: string;
  title: string;
  status: 'Pendente' | 'Em Andamento' | 'Concluida' | 'Cancelada';
  assigned_to_email?: string;
  department_id?: string;
  due_at?: string;
  priority?: 'baixa' | 'media' | 'alta' | 'urgente';
  created_at?: string;
}

export interface Reuniao {
  id: string;
  titulo: string;
  tipo: TipoReuniao;
  data_reuniao: string;
  status: StatusReuniao;
  departamentos_envolvidos: string[];
  participantes: string[];
  pauta_topicos?: string;
  ata_conteudo?: string;
  resumo_ia?: string;
  decisoes_regras?: string;
  proxima_reuniao_id?: string;
  proxima_reuniao_data?: string;
  pedidos_contexto?: string[];
  incidencias_contexto?: string[];
  duracao_minutos?: number;
  recorrente?: boolean;
  created_by?: string;
  created_at?: string;
  updated_at?: string;
  acoes?: ReuniaoAcao[];
}

export const TIPOS_REUNIAO_MAP: Record<TipoReuniao, { label: string; depts: string[]; color: string; desc: string }> = {
  comercial_rh: {
    label: 'Comercial × RH & Contratação',
    depts: ['Comercial', 'Recursos Humanos', 'Contratação'],
    color: 'from-amber-500/20 to-orange-500/20 text-orange-600 dark:text-orange-400 border-orange-500/30',
    desc: 'Alinhamento de prazos de contratação, demandas de vagas x capacidade de atração, perfis e desistências.'
  },
  comercial_logistica: {
    label: 'Comercial × Logística',
    depts: ['Comercial', 'Logística'],
    color: 'from-blue-500/20 to-cyan-500/20 text-blue-600 dark:text-blue-400 border-blue-500/30',
    desc: 'Antecedência de pedidos, transporte, acomodação/alojamento de trabalhadores e rotas.'
  },
  contratacao_financeiro: {
    label: 'Contratação × Financeiro',
    depts: ['Recursos Humanos', 'Contratação', 'Financeiro'],
    color: 'from-emerald-500/20 to-teal-500/20 text-emerald-600 dark:text-emerald-400 border-emerald-500/30',
    desc: 'Custos de captação, adiantamentos, viabilidade orçamentária e tabelas salariais.'
  },
  logistica_financeiro: {
    label: 'Logística × Financeiro',
    depts: ['Logística', 'Financeiro'],
    color: 'from-purple-500/20 to-indigo-500/20 text-purple-600 dark:text-purple-400 border-purple-500/30',
    desc: 'Custos de alojamento, consumo, combustível, frotas e aprovação de compras de suporte.'
  },
  documentacao_rh: {
    label: 'Documentação × RH',
    depts: ['Recursos Humanos', 'Documentação', 'Operações'],
    color: 'from-rose-500/20 to-pink-500/20 text-rose-600 dark:text-rose-400 border-rose-500/30',
    desc: 'Checklist admissional, contratos assinados, exames médicos e validações legais antes do embarque.'
  },
  geral_operacoes: {
    label: 'Alinhamento Geral de Operações',
    depts: ['Comercial', 'Recursos Humanos', 'Logística', 'Financeiro', 'Operações'],
    color: 'from-slate-500/20 to-zinc-500/20 text-slate-700 dark:text-slate-300 border-slate-500/30',
    desc: 'WBR Geral - Revisão sistêmica dos pedidos da semana, metas operacionais e gargalos cruzados.'
  },
  outro: {
    label: 'Outro Alinhamento Especial',
    depts: ['Operações'],
    color: 'from-sky-500/20 to-blue-500/20 text-sky-600 dark:text-sky-400 border-sky-500/30',
    desc: 'Reunião pontual para tratar de exceções, crises ou projetos específicos.'
  }
};
