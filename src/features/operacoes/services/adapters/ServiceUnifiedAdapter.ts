
import { integrationFacade } from '../integration/integrationFacade';

export interface UnifiedServiceItem {
    id: string; // UUID ou Unique ID
    sp_id: number;
    type: 'Pedido' | 'Reemplazo' | 'Reubicacion';
    code: string;
    status: string;
    description: string;
    client_name?: string;
    date: string; // Data relevante (Inicio ou Solicitação)
    
    // Original Objects (para acesso completo se necessário)
    raw?: any; 
}

export const ServiceUnifiedAdapter = {
    
    /**
     * Busca em Pedidos, Reemplazos e Reubicaciones simultaneamente
     * e retorna uma estrutura unificada para a UI.
     */
    searchAll: async (query: string): Promise<UnifiedServiceItem[]> => {
        const provider = integrationFacade.getProvider();

        // Dispara buscas paralelas
        const [pedidos, reemp, reub] = await Promise.all([
            provider.searchPedidos(query),
            provider.searchReemplazos(query),
            provider.searchReubicaciones(query)
        ]);

        const unified: UnifiedServiceItem[] = [];

        // Mapeia Pedidos
        for (const p of pedidos) {
            let clientName = 'N/A';
            if (p.client_sp_id) {
                const c = await provider.getClientBySpId(p.client_sp_id);
                clientName = c?.name || 'Unknown';
            }
            unified.push({
                id: `PED-${p.sp_id}`,
                sp_id: p.sp_id,
                type: 'Pedido',
                code: p.codigo,
                status: p.status,
                description: `Pedido ${p.codigo} - ${clientName}`,
                client_name: clientName,
                date: p.data_inicio,
                raw: p
            });
        }

        // Mapeia Reemplazos
        for (const r of reemp) {
            unified.push({
                id: `REE-${r.sp_id}`,
                sp_id: r.sp_id,
                type: 'Reemplazo',
                code: r.codigo,
                status: r.status,
                description: `Substituição: ${r.motivo}`,
                date: r.data_solicitacao,
                raw: r
            });
        }

        // Mapeia Reubicaciones
        for (const rb of reub) {
            unified.push({
                id: `REU-${rb.sp_id}`,
                sp_id: rb.sp_id,
                type: 'Reubicacion',
                code: rb.codigo,
                status: rb.status,
                description: `Movimentação: ${rb.motivo}`,
                date: rb.data_movimento,
                raw: rb
            });
        }

        return unified.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }
};
