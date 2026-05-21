
import type { IncidentContext } from '../types/models';
import { integrationFacade } from './integration/integrationFacade';

/**
 * Service responsible for building the IncidentContext.
 * Ensures strict typing and prevents manual JSON construction in UI components.
 */
export const contextFactory = {
    
    /**
     * Create a context for a fully manual incident (no external link).
     */
    createManual: (): IncidentContext => {
        return {
            origin: {
                system: 'supabase',
                table: 'incidents',
                label: 'Manual'
            },
            extra: {}
        };
    },

    /**
     * Create context from a SharePoint Order (Pedido).
     */
    createFromPedido: async (spId: number): Promise<IncidentContext> => {
        const pedido = await integrationFacade.getPedidoBySpId(spId);
        
        // Base context
        const ctx: IncidentContext = {
            origin: {
                system: 'sharepoint',
                table: 'sp_pedidos',
                sp_id: spId,
                ref: pedido?.codigo,
                label: `Pedido ${pedido?.codigo || spId}`
            },
            pedido: {
                sp_id: spId,
                ref: pedido?.codigo,
                link: { system: 'sharepoint', table: 'sp_pedidos', sp_id: spId, ref: pedido?.codigo }
            }
        };

        if (pedido) {
            // Enrich with Client Data
            if (pedido.client_sp_id) {
                const client = await integrationFacade.getClientBySpId(pedido.client_sp_id);
                if (client) {
                    ctx.client = {
                        name: client.name,
                        sp_id: client.sp_id,
                        link: { system: 'sharepoint', table: 'sp_clients', sp_id: client.sp_id, label: client.name }
                    };
                    ctx.company = { name: client.company };
                }
            }
            
            // Enrich with Obra Data
            if (pedido.obra_sp_id) {
                // Assuming we might add getObraBySpId in facade later, for now just ID
                ctx.obra = { sp_id: pedido.obra_sp_id };
            }
            
            // Add commercial info
            if (pedido.comercial_email) {
                ctx.extra = { ...ctx.extra, comercial: pedido.comercial_email };
            }
        }
        
        return ctx;
    },

    /**
     * Create context from a Worker (Colaborador).
     */
    createFromWorker: async (spId: number): Promise<IncidentContext> => {
        const worker = await integrationFacade.getWorkerBySpId(spId);
        
        const ctx: IncidentContext = {
            origin: {
                system: 'sharepoint',
                table: 'sp_workers',
                sp_id: spId,
                label: worker?.nome || `Worker ${spId}`,
                ref: worker?.documento
            },
            worker: {
                name: worker?.nome,
                sp_id: spId,
                link: { system: 'sharepoint', table: 'sp_workers', sp_id: spId, label: worker?.nome }
            }
        };
        
        return ctx;
    },

    /**
     * Create context from a Reemplazo (Replacement).
     */
    createFromReemplazo: async (spId: number): Promise<IncidentContext> => {
        const reemp = await integrationFacade.getReemplazoBySpId(spId);
        
        const ctx: IncidentContext = {
            origin: {
                system: 'sharepoint',
                table: 'sp_reemplazos',
                sp_id: spId,
                ref: reemp?.codigo,
                label: `Reemplazo ${reemp?.codigo || spId}`
            }
        };

        if (reemp) {
            // Link related entities
            if (reemp.client_sp_id) {
                const client = await integrationFacade.getClientBySpId(reemp.client_sp_id);
                ctx.client = { name: client?.name, sp_id: reemp.client_sp_id };
                if (client) ctx.company = { name: client.company };
            }
            if (reemp.pedido_sp_id) {
                const pedido = await integrationFacade.getPedidoBySpId(reemp.pedido_sp_id);
                ctx.pedido = { ref: pedido?.codigo, sp_id: reemp.pedido_sp_id };
            }
            // Add workers involved
            ctx.extra = {
                worker_old_sp_id: reemp.worker_old_sp_id,
                worker_new_sp_id: reemp.worker_new_sp_id,
                motivo: reemp.motivo
            };
        }

        return ctx;
    }
};
