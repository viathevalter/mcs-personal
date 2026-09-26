export type PatrimonioStatus =
    | 'disponivel'
    | 'reservado'
    | 'em_uso'
    | 'em_transito'
    | 'em_manutencao'
    | 'aguardando_manutencao'
    | 'danificado'
    | 'perdido'
    | 'roubado'
    | 'baixado'
    | 'vendido'
    | 'descartado';

export interface FotoPatrimonio {
    id: string;
    tipo: 'frontal' | 'traseira' | 'serial' | 'estado' | 'acessorios' | 'outro';
    url: string;
    legenda?: string;
    created_at?: string;
}

export interface AtivoPatrimonio {
    id: string;
    empresa_id?: string | null;
    codigo_patrimonial: string;
    categoria: string;
    subcategoria?: string | null;
    descricao: string;
    marca?: string | null;
    modelo?: string | null;
    numero_serie?: string | null;
    imei?: string | null;
    matricula?: string | null;
    cor?: string | null;
    empresa_proprietaria?: string | null;
    centro_custo?: string | null;
    localizacao?: string | null;
    status: PatrimonioStatus;
    
    // Aquisição
    data_compra?: string | null;
    fornecedor?: string | null;
    numero_fatura?: string | null;
    valor_aquisicao: number;
    moeda: string;
    garantia_meses?: number | null;
    data_fim_garantia?: string | null;
    anexo_fatura_url?: string | null;
    observacoes_aquisicao?: string | null;
    
    // Identificação Visual
    foto_principal_url?: string | null;
    fotos: FotoPatrimonio[];
    
    // Responsável / Custódia Atual
    worker_id?: string | null;
    responsavel_nome?: string | null;
    responsavel_documento?: string | null;
    coordenador_nome?: string | null;
    data_entrega?: string | null;
    local_entrega?: string | null;
    projeto?: string | null;
    previsao_devolucao?: string | null;
    acessorios_entregues?: string | null;
    observacoes_entrega?: string | null;
    
    created_by?: string | null;
    created_at: string;
    updated_at: string;
}

export type TipoEventoHistorico =
    | 'aquisicao'
    | 'entrada_armazem'
    | 'entrega'
    | 'devolucao'
    | 'transferencia_projeto'
    | 'envio_manutencao'
    | 'retorno_manutencao'
    | 'status_alterado'
    | 'inventario'
    | 'observacao'
    | 'baixa';

export interface HistoricoPatrimonio {
    id: string;
    ativo_id: string;
    tipo_evento: TipoEventoHistorico;
    titulo: string;
    descricao?: string | null;
    worker_id?: string | null;
    worker_nome?: string | null;
    projeto?: string | null;
    localizacao?: string | null;
    status_anterior?: string | null;
    status_novo?: string | null;
    metadata?: Record<string, any>;
    registrado_por_nome?: string | null;
    created_at: string;
}

export type TipoDocumentoPatrimonio =
    | 'termo_responsabilidade'
    | 'termo_devolucao'
    | 'fatura'
    | 'garantia'
    | 'manual'
    | 'certificado'
    | 'manutencao'
    | 'seguro'
    | 'outro';

export interface DocumentoPatrimonio {
    id: string;
    ativo_id: string;
    tipo_documento: TipoDocumentoPatrimonio;
    titulo: string;
    arquivo_url: string;
    arquivo_nome?: string | null;
    tamanho_bytes?: number | null;
    mime_type?: string | null;
    status_assinatura: 'pendente' | 'assinado' | 'nao_aplicavel';
    assinado_em?: string | null;
    assinado_por?: string | null;
    metadata?: Record<string, any>;
    created_at: string;
}

export interface ManutencaoPatrimonio {
    id: string;
    ativo_id: string;
    tipo: 'preventiva' | 'corretiva' | 'calibracao' | 'revisao';
    motivo: string;
    descricao_problema?: string | null;
    fornecedor_oficina?: string | null;
    custo: number;
    data_envio: string;
    previsao_retorno?: string | null;
    data_retorno?: string | null;
    solucao_aplicada?: string | null;
    status: 'aguardando_orcamento' | 'em_andamento' | 'concluida' | 'cancelada';
    anexo_nf_url?: string | null;
    created_at: string;
    updated_at: string;
}

export interface PatrimonioFiltros {
    search?: string;
    status?: PatrimonioStatus | 'todos';
    categoria?: string | 'todas';
    empresa?: string | 'todas';
    projeto?: string | 'todos';
    responsavel?: string;
    coordenador?: string;
    localizacao?: string;
}

export const CATEGORIAS_PATRIMONIO = [
    { id: 'TI', nome: 'Informática (Notebooks, Monitores, PCs)', prefixo: 'TI' },
    { id: 'CEL', nome: 'Celular / Telefonia Móvel', prefixo: 'MOB' },
    { id: 'FER_ELE', nome: 'Ferramentas Elétricas', prefixo: 'FER' },
    { id: 'FER_MAN', nome: 'Ferramentas Manuais', prefixo: 'FER' },
    { id: 'MAQ', nome: 'Máquinas e Equipamentos de Oficina', prefixo: 'MAQ' },
    { id: 'VEI', nome: 'Veículos / Frotas', prefixo: 'VEI' },
    { id: 'MOV', nome: 'Mobiliário e Escritório', prefixo: 'MOV' },
    { id: 'OUT', nome: 'Outros Bens', prefixo: 'PAT' },
] as const;

export const STATUS_CONFIG: Record<
    PatrimonioStatus,
    { label: string; labelEs: string; color: string; bg: string; border: string; dot: string }
> = {
    disponivel: {
        label: 'Disponível',
        labelEs: 'Disponible',
        color: 'text-emerald-700 dark:text-emerald-300',
        bg: 'bg-emerald-50 dark:bg-emerald-950/40',
        border: 'border-emerald-200 dark:border-emerald-800',
        dot: 'bg-emerald-500',
    },
    em_uso: {
        label: 'Em uso',
        labelEs: 'En uso',
        color: 'text-blue-700 dark:text-blue-300',
        bg: 'bg-blue-50 dark:bg-blue-950/40',
        border: 'border-blue-200 dark:border-blue-800',
        dot: 'bg-blue-500',
    },
    reservado: {
        label: 'Reservado',
        labelEs: 'Reservado',
        color: 'text-purple-700 dark:text-purple-300',
        bg: 'bg-purple-50 dark:bg-purple-950/40',
        border: 'border-purple-200 dark:border-purple-800',
        dot: 'bg-purple-500',
    },
    em_transito: {
        label: 'Em trânsito',
        labelEs: 'En tránsito',
        color: 'text-indigo-700 dark:text-indigo-300',
        bg: 'bg-indigo-50 dark:bg-indigo-950/40',
        border: 'border-indigo-200 dark:border-indigo-800',
        dot: 'bg-indigo-500',
    },
    em_manutencao: {
        label: 'Em manutenção',
        labelEs: 'En mantenimiento',
        color: 'text-amber-700 dark:text-amber-300',
        bg: 'bg-amber-50 dark:bg-amber-950/40',
        border: 'border-amber-200 dark:border-amber-800',
        dot: 'bg-amber-500',
    },
    aguardando_manutencao: {
        label: 'Aguardando manutenção',
        labelEs: 'Esperando mantenimiento',
        color: 'text-orange-700 dark:text-orange-300',
        bg: 'bg-orange-50 dark:bg-orange-950/40',
        border: 'border-orange-200 dark:border-orange-800',
        dot: 'bg-orange-500',
    },
    danificado: {
        label: 'Danificado',
        labelEs: 'Dañado',
        color: 'text-rose-700 dark:text-rose-300',
        bg: 'bg-rose-50 dark:bg-rose-950/40',
        border: 'border-rose-200 dark:border-rose-800',
        dot: 'bg-rose-500',
    },
    perdido: {
        label: 'Perdido',
        labelEs: 'Perdido',
        color: 'text-red-700 dark:text-red-300',
        bg: 'bg-red-50 dark:bg-red-950/40',
        border: 'border-red-200 dark:border-red-800',
        dot: 'bg-red-500',
    },
    roubado: {
        label: 'Roubado',
        labelEs: 'Robado',
        color: 'text-red-800 dark:text-red-200',
        bg: 'bg-red-100 dark:bg-red-950/60',
        border: 'border-red-300 dark:border-red-900',
        dot: 'bg-red-600',
    },
    baixado: {
        label: 'Baixado',
        labelEs: 'Dado de baja',
        color: 'text-slate-600 dark:text-slate-400',
        bg: 'bg-slate-100 dark:bg-slate-800',
        border: 'border-slate-200 dark:border-slate-700',
        dot: 'bg-slate-400',
    },
    vendido: {
        label: 'Vendido',
        labelEs: 'Vendido',
        color: 'text-cyan-700 dark:text-cyan-300',
        bg: 'bg-cyan-50 dark:bg-cyan-950/40',
        border: 'border-cyan-200 dark:border-cyan-800',
        dot: 'bg-cyan-500',
    },
    descartado: {
        label: 'Descartado',
        labelEs: 'Desechado',
        color: 'text-zinc-600 dark:text-zinc-400',
        bg: 'bg-zinc-100 dark:bg-zinc-800',
        border: 'border-zinc-200 dark:border-zinc-700',
        dot: 'bg-zinc-400',
    },
};
