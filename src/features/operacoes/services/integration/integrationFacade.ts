
import { SupabaseProvider } from '../providers/SupabaseProvider';
import type {  IDataProvider  } from '../providers/IDataProvider';

/**
 * IntegrationFacade agora atua como um Singleton para o Provider de Dados.
 * Isso permite trocar a implementação (Mock <-> Supabase) em um único ponto.
 */
class IntegrationService {
    private provider: IDataProvider;

    constructor() {
        // Futuramente: if (env.USE_SUPABASE) this.provider = new SupabaseProvider();
        this.provider = new SupabaseProvider();
    }

    getProvider(): IDataProvider {
        return this.provider;
    }

    // Atalhos estáticos para compatibilidade e facilidade de uso
    getClientBySpId = (id: number) => this.provider.getClientBySpId(id);
    searchClients = (q: string) => this.provider.searchClients(q);

    getPedidoBySpId = (id: number) => this.provider.getPedidoBySpId(id);
    searchPedidos = (q: string) => this.provider.searchPedidos(q);

    getWorkerBySpId = (id: number) => this.provider.getWorkerBySpId(id);
    searchWorkers = (q: string) => this.provider.searchWorkers(q);

    getObraBySpId = (id: number) => this.provider.getObraBySpId(id);
    searchObras = (q: string) => this.provider.searchObras(q);

    getReemplazoBySpId = (id: number) => this.provider.getReemplazoBySpId(id);
    searchReemplazos = (q: string) => this.provider.searchReemplazos(q);

    getReubicacionBySpId = (id: number) => this.provider.getReubicacionBySpId(id);
    searchReubicaciones = (q: string) => this.provider.searchReubicaciones(q);
}

export const integrationFacade = new IntegrationService();
