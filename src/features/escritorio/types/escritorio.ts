export interface ColaboradorEscritorio {
    id: string;
    nombrecompleto: string;
    correoempresarial?: string | null;
    ubicaciontrabajo?: string | null;
    telefonodirecto?: string | null;
    active: boolean;
    department_id?: string | null;
    department_name?: string | null;
    empresa_id?: string | null;
    empresa_nome?: string | null;
    empresa_codigo?: string | null;
    timeclock_code?: string | null;
    laboral?: RhDadosLaborais | null;
    salario_vigente?: number | null;
    ferias_saldo?: RhFeriasSaldo | null;
    ativos_patrimonio_count?: number;
}

export interface RhDadosLaborais {
    id: string;
    member_id: string;
    empresa_id?: string | null;
    jornada_id?: string | null;
    cargo?: string | null;
    departamento_nome?: string | null;
    centro_custo?: string | null;
    categoria_profissional?: string | null;
    tipo_contrato?: string | null;
    data_admissao?: string | null;
    data_fim_contrato?: string | null;
    periodo_experiencia_dias?: number | null;
    local_trabalho?: string | null;
    responsavel_direto_id?: string | null;
    coordenador_id?: string | null;
    jornada_semanal_horas?: number | null;
    horario_trabalho?: string | null;
    convencao_coletiva?: string | null;
    classificacao: string;
    timeclock_code?: string | null;
    created_at?: string;
    updated_at?: string;
}

export interface RhHistoricoSalarial {
    id: string;
    member_id: string;
    salario_base: number;
    moeda: string;
    complementos: number;
    ajuda_custo: number;
    transporte: number;
    alimentacao: number;
    premio_fixo: number;
    comissao_fixa: number;
    outros_valores: number;
    data_vigencia: string;
    motivo: string;
    usuario_responsavel?: string | null;
    observacoes?: string | null;
    created_at?: string;
}

export interface RhModeloJornada {
    id: string;
    empresa_id?: string | null;
    nome: string;
    descricao?: string | null;
    horas_semanais: number;
    tipo_jornada: string;
    dias_trabalho: {
        dia: string;
        ativo: boolean;
        entrada?: string;
        saida?: string;
        intervalo_min?: number;
        horas: number;
    }[];
    is_padrao: boolean;
    is_active: boolean;
}

export type StatusPonto =
    | 'ok'
    | 'atraso'
    | 'saida_antecipada'
    | 'incompleto'
    | 'falta'
    | 'feriado'
    | 'folga'
    | 'ausencia_justificada';

export interface RhPontoRegistro {
    id: string;
    member_id: string;
    empresa_id?: string | null;
    data: string;
    timeclock_code?: string | null;
    batidas: string[];
    entrada_1?: string | null;
    saida_1?: string | null;
    entrada_2?: string | null;
    saida_2?: string | null;
    horas_trabalhadas: number;
    horas_previstas: number;
    minutos_saldo: number;
    minutos_atraso: number;
    minutos_saida_antecipada: number;
    minutos_extras: number;
    status: StatusPonto;
    origem: string;
    observacoes?: string | null;
    member_nome?: string;
    member_departamento?: string;
    member_cargo?: string;
}

export interface RhPontoAjuste {
    id: string;
    ponto_registro_id: string;
    member_id: string;
    campo_alterado: string;
    valor_anterior?: string | null;
    valor_novo?: string | null;
    motivo: string;
    usuario_responsavel: string;
    data_ajuste: string;
}

export interface RhFeriasSaldo {
    id: string;
    member_id: string;
    ano_exercicio: number;
    dias_direito: number;
    dias_gozados: number;
    dias_programados: number;
    dias_saldo: number;
    tipo_contagem: 'naturais' | 'uteis';
    observacoes?: string | null;
}

export type StatusFerias =
    | 'rascunho'
    | 'solicitado'
    | 'aguardando_gestor'
    | 'aguardando_rh'
    | 'aprovado'
    | 'rejeitado'
    | 'cancelado'
    | 'gozado';

export interface RhFeriasSolicitacao {
    id: string;
    member_id: string;
    ano_exercicio: number;
    data_inicio: string;
    data_fim: string;
    dias_solicitados: number;
    tipo_dias: 'naturais' | 'uteis';
    status: StatusFerias;
    observacoes?: string | null;
    aprovado_por_gestor?: string | null;
    data_aprovacao_gestor?: string | null;
    aprovado_por_rh?: string | null;
    data_aprovacao_rh?: string | null;
    motivo_rejeicao?: string | null;
    created_at?: string;
    member_nome?: string;
    member_departamento?: string;
}

export interface RhAusencia {
    id: string;
    member_id: string;
    tipo: 'baixa_medica' | 'consulta_medica' | 'falta_justificada' | 'falta_injustificada' | 'licenca' | 'formacao' | 'trabalho_externo' | 'acidente' | 'outro';
    data_inicio: string;
    data_fim: string;
    dias_total: number;
    remunerada: boolean;
    documento_url?: string | null;
    observacoes?: string | null;
    status: string;
    created_at?: string;
    member_nome?: string;
    member_departamento?: string;
}

export type StatusPreFolha =
    | 'em_preparacao'
    | 'em_revisao'
    | 'aguardando_aprovacao'
    | 'pronto'
    | 'enviado_contabilidade'
    | 'fechado';

export interface RhPreFolha {
    id: string;
    competencia: string; // 'YYYY-MM'
    empresa_id?: string | null;
    empresa_nome?: string | null;
    titulo?: string | null;
    status: StatusPreFolha;
    total_funcionarios: number;
    total_horas_trabalhadas: number;
    total_horas_extras: number;
    total_ferias_dias: number;
    total_baixas_dias: number;
    total_faltas_dias: number;
    total_variaveis_valor: number;
    fechado_por?: string | null;
    data_fechamento?: string | null;
    data_envio_contabilidade?: string | null;
    email_destinatario_contabilidade?: string | null;
    created_at?: string;
}

export interface RhPreFolhaItem {
    id: string;
    pre_folha_id: string;
    member_id: string;
    salario_base: number;
    horas_trabalhadas: number;
    horas_extras: number;
    dias_ferias: number;
    dias_baixa: number;
    dias_falta: number;
    total_premios: number;
    total_comissoes: number;
    total_ajuda_custo: number;
    total_descontos: number;
    observacoes?: string | null;
    member_nome?: string;
    member_cargo?: string;
    member_departamento?: string;
}

export const CLASSIFICACOES_COLABORADOR = [
    'Administrativo / Escritório',
    'Oficina',
    'Coordenador',
    'Gestor',
    'Direção',
    'Operacional',
    'Outros',
] as const;

export const TIPOS_AUSENCIA = [
    { id: 'baixa_medica', label: 'Baixa Médica (IT - Espanha)', remunerada: true, color: 'text-amber-600 bg-amber-50 border-amber-200' },
    { id: 'consulta_medica', label: 'Consulta Médica', remunerada: true, color: 'text-blue-600 bg-blue-50 border-blue-200' },
    { id: 'falta_justificada', label: 'Falta Justificada', remunerada: true, color: 'text-emerald-600 bg-emerald-50 border-emerald-200' },
    { id: 'falta_injustificada', label: 'Falta Injustificada', remunerada: false, color: 'text-rose-600 bg-rose-50 border-rose-200' },
    { id: 'licenca', label: 'Licença Retribuída (Casamento, Óbito, Mudança)', remunerada: true, color: 'text-purple-600 bg-purple-50 border-purple-200' },
    { id: 'formacao', label: 'Formação / Treinamento', remunerada: true, color: 'text-sky-600 bg-sky-50 border-sky-200' },
    { id: 'trabalho_externo', label: 'Trabalho Externo / Viagem', remunerada: true, color: 'text-indigo-600 bg-indigo-50 border-indigo-200' },
    { id: 'acidente', label: 'Acidente de Trabalho', remunerada: true, color: 'text-red-700 bg-red-50 border-red-200' },
    { id: 'outro', label: 'Outro Motivo', remunerada: false, color: 'text-slate-600 bg-slate-50 border-slate-200' },
] as const;
