

export interface TopWorker {
    worker_name: string;
    net_amount: number;
}

export interface DashboardMetrics {
    total_workers: number;
    active_housing: number;
    pending_entries: number;
    aux_moradia_sum: number;
    top_workers: TopWorker[];
}

export async function fetchDashboardMetrics(_empresaId: string, _year: number, _month: number): Promise<DashboardMetrics> {
    // Mocking the backend RPC for dashboard metrics
    return new Promise((resolve) => {
        setTimeout(() => {
            resolve({
                total_workers: 142,
                active_housing: 38,
                pending_entries: 15,
                aux_moradia_sum: 12540.50,
                top_workers: [
                    { worker_name: "João Silva", net_amount: 3450.00 },
                    { worker_name: "Rui Costa", net_amount: 3210.50 },
                    { worker_name: "Maria Santos", net_amount: 3100.00 },
                    { worker_name: "Ana Ferreira", net_amount: 2950.25 },
                    { worker_name: "Carlos Gomes", net_amount: 2800.75 },
                    { worker_name: "Nuno Marques", net_amount: 2750.00 },
                    { worker_name: "Sofia Pinto", net_amount: 2600.50 },
                    { worker_name: "Pedro Alves", net_amount: 2550.00 },
                    { worker_name: "Tiago Ribeiro", net_amount: 2450.25 },
                    { worker_name: "Beatriz Sousa", net_amount: 2300.75 }
                ]
            });
        }, 500); // Simulate network latency
    });
}
