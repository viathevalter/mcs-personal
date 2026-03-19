export interface Worker {
    id: string;
    empresa_id: string;
    cod_colab: string;
    nome: string;
    email: string | null;
    movil: string | null;
    niss: string | null;
    nif: string | null;
    nie: string | null;
    dni: string | null;
    pasaporte: string | null;
    licencia_conducir: string | null;
    nacionalidade: string | null;
    fecha_nacimiento: string | null;
    nuss: string | null;
    foto: string | null;
    status_seguridad: string | null;
    status_trabajador: string | null;
    contratante?: string | null;
    funcion?: string | null;
    cliente_nombre?: string | null;
    created_at: string;
}

export interface WorkerWithHousing extends Worker {
    housing_benefit?: HousingBenefit | null;
}

export interface WorkerBeneficiosSettings {
    worker_id: string;
    iban: string | null;
    banco: string | null;
    tarifa_hora: number;
    recebe_auxilio_moradia?: boolean;
    auxilio_moradia_base?: number;
    created_at?: string;
    updated_at?: string;
}

export interface WorkerBeneficiosHistory {
    id: string;
    worker_id: string;
    changed_by: string;
    change_type: 'iban_update' | 'tarifa_update';
    old_value: string | null;
    new_value: string | null;
    document_url: string | null;
    created_at: string;
}

export interface HousingBenefit {
    id: string;
    empresa_id: string;
    worker_id: string;
    monthly_amount: number;
    start_date: string;
    end_date: string | null;
    proration_method: string | null;
    import_batch_id?: string | null;
    created_at: string;
}

export type TipoEventoSeguridade = 'alta' | 'baixa';
export type StatusWorkflowSeguridade = 'pendente' | 'confirmado' | 'erro' | 'cancelado';

export interface SeguridadeStatus {
    id: string;
    empresa_id: string;
    worker_id: string;
    tipo_evento: TipoEventoSeguridade;
    status: StatusWorkflowSeguridade;
    origem: string;
    origem_id?: string;
    origem_cliente_nome?: string;
    data_solicitacao: string;
    data_efetiva?: string;
    observacoes?: string;
    created_at: string;
    updated_at: string;
}

export interface SeguridadeStatusWithWorker extends SeguridadeStatus {
    autor_inativacao?: string;
    hist_observacoes?: string;
    hist_data_efetiva?: string;
    worker: {
        id: string;
        nome: string;
        cod_colab: string;
        niss: string | null;
        nif: string | null;
        dni: string | null;
        nie: string | null;
        pasaporte: string | null;
        fecha_nacimiento?: string | null;
        funcion?: string | null;
        empresa_nome?: string | null;
    };
}
export interface LedgerType {
    id: string;
    empresa_id: string;
    type_code: string;
    direction: string;
    description: string | null;
    is_active: boolean;
    created_at: string;
}

export interface LedgerEntry {
    id: string;
    empresa_id: string;
    worker_id: string;
    competence_year: number;
    competence_month: number;
    ledger_type_id: string;
    amount: number;
    entry_date: string;
    reference_type: string | null;
    reference_id: string | null;
    status: string | null;
    created_at: string;
}

export interface WorkerDocument {
    id: string;
    empresa_id: string;
    worker_id: string;
    doc_type: string;
    file_path: string;
    file_name: string;
    file_size: number | null;
    mime_type: string | null;
    created_at: string;
}

export type WorkerHourStatus = 'pendente' | 'enviado' | 'validado';

export interface WorkerHour {
    id: string;
    empresa_id: string;
    worker_id: string;
    period_year: number;
    period_month: number;
    status: WorkerHourStatus;
    file_url: string | null;
    file_name: string | null;
    observacoes: string | null;
    created_at: string;
    updated_at: string;
}
