export type DiscountCategory =
    | 'Imposto ss'
    | 'Adiantamento'
    | 'Desconto Carro'
    | 'MULTA TRANSITO'
    | 'COMBUSTIBLE'
    | 'PEAJES'
    | 'SUMINISTROS'
    | 'MULTA ALOJAMIENTO'
    | 'LIMPIEZA O DAÑOS'
    | 'EPIS'
    | 'OUTROS'
    | 'Taxa bancária';

export type DiscountStatus = 'Ativo' | 'Pausado' | 'Concluído';

export interface WorkerDiscount {
    id: string;
    worker_id: string;
    category: DiscountCategory;
    amount: number;
    description: string | null;
    reference_date: string;
    is_recurring: boolean;
    status: DiscountStatus;
    created_at: string;
    updated_at: string;
}

export type CreateWorkerDiscountInput = Omit<WorkerDiscount, 'id' | 'created_at' | 'updated_at'>;
export type UpdateWorkerDiscountInput = Partial<CreateWorkerDiscountInput> & { id: string };
