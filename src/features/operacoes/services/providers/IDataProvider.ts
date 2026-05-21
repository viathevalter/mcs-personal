
import type { 
    SPClient, SPPedido, SPWorker, SPReemplazo, SPReubicacion, SPObra 
} from '../../types/sp_mirror';

export interface IDataProvider {
    // --- CLIENTS ---
    getClientBySpId(spId: number): Promise<SPClient | null>;
    searchClients(query: string): Promise<SPClient[]>;

    // --- WORKERS ---
    getWorkerBySpId(spId: number): Promise<SPWorker | null>;
    searchWorkers(query: string): Promise<SPWorker[]>;

    // --- OBRAS ---
    getObraBySpId(spId: number): Promise<SPObra | null>;
    searchObras(query: string): Promise<SPObra[]>;

    // --- PEDIDOS ---
    getPedidoBySpId(spId: number): Promise<SPPedido | null>;
    getPedidoByCode(code: string): Promise<SPPedido | null>;
    searchPedidos(query: string): Promise<SPPedido[]>;

    // --- REEMPLAZOS ---
    getReemplazoBySpId(spId: number): Promise<SPReemplazo | null>;
    getReemplazoByCode(code: string): Promise<SPReemplazo | null>;
    searchReemplazos(query: string): Promise<SPReemplazo[]>;

    // --- REUBICACIONES ---
    getReubicacionBySpId(spId: number): Promise<SPReubicacion | null>;
    getReubicacionByCode(code: string): Promise<SPReubicacion | null>;
    searchReubicaciones(query: string): Promise<SPReubicacion[]>;
}
