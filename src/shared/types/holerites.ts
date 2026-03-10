export type HoleriteStatus = 'rascunho' | 'revisado' | 'pago';
export type EventoTipo = 'provento' | 'desconto';
export type EventoCategoria = 'adiantamento' | 'multa_transito' | 'sinistro_carro' | 'dias_faltas' | 'bonus' | 'outros' | 'total_horas';

export interface Holerite {
    id: string;
    worker_id: string;
    mes_referencia: string; // Formato YYYY-MM
    status: HoleriteStatus;
    total_creditos: number;
    total_debitos: number;
    valor_liquido: number;
    document_url?: string | null;
    created_at: string;
    updated_at: string;
}

export interface HoleriteEvento {
    id: string;
    trabalhador_id: string;
    mes_referencia: string; // Formato YYYY-MM
    tipo: EventoTipo;
    categoria: EventoCategoria;
    valor: number;
    referencia_dias_horas?: number | null;
    import_batch_id?: string | null;
    descricao?: string | null;
    created_at: string;
}

export interface HoleriteFilters {
    mes_referencia: string;
    search?: string;
}
