
import { integrationFacade } from '../integration/integrationFacade';
import type {  IncidentContext, ContextLink  } from '../../types/models';

/**
 * Builds a valid ContextLink object.
 */
const createLink = (table: string, sp_id: number, ref?: string, label?: string): ContextLink => ({
  system: 'sharepoint',
  table,
  sp_id,
  ref: ref || String(sp_id),
  label: label || `Item ${sp_id}`
});

export const contextBuilder = {

  /**
   * Builds context from a Reemplazo (Replacement) ID.
   */
  buildContextFromReemplazo: async (sp_id: number): Promise<IncidentContext> => {
    const provider = integrationFacade.getProvider();
    const reemp = await provider.getReemplazoBySpId(sp_id);

    if (!reemp) {
      return { origin: { system: 'sharepoint', table: 'sp_reemplazos', sp_id, label: `Not Found ${sp_id}` } };
    }

    const ref = reemp.codigo || `R-${reemp.sp_id}`;

    // Base Context
    const context: IncidentContext = {
      origin: createLink('sp_reemplazos', reemp.sp_id, ref, `Reemplazo ${ref}`),
      extra: { motivo: reemp.motivo, status: reemp.status, data_solicitacao: reemp.data_solicitacao }
    };

    // Enrich Relations
    if (reemp.client_sp_id) {
      const client = await provider.getClientBySpId(reemp.client_sp_id);
      if (client) {
        context.client = {
          name: client.name,
          sp_id: client.sp_id,
          link: createLink('sp_clients', client.sp_id, undefined, client.name),
          email: client.email,
          phone: client.phone
        };
        context.company = { name: client.company };
      }
    }

    if (reemp.pedido_sp_id) {
      const pedido = await provider.getPedidoBySpId(reemp.pedido_sp_id);
      if (pedido) {
        context.pedido = { ref: pedido.codigo, sp_id: pedido.sp_id, link: createLink('sp_pedidos', pedido.sp_id, pedido.codigo, pedido.codigo) };
        // If pedido has Obra, add it
        if (pedido.obra_sp_id) {
          const obra = await provider.getObraBySpId(pedido.obra_sp_id);
          if (obra) {
            context.obra = { name: obra.nome, sp_id: obra.sp_id, link: createLink('sp_obras', obra.sp_id, obra.codigo, obra.nome) };
          }
        }
      }
    }

    if (reemp.worker_old_sp_id) {
      const worker = await provider.getWorkerBySpId(reemp.worker_old_sp_id);
      if (worker) {
        context.worker = {
          name: worker.nome,
          sp_id: worker.sp_id,
          link: createLink('sp_workers', worker.sp_id, worker.documento, worker.nome),
          email: worker.email,
          phone: worker.phone
        };
      }
    }

    return context;
  },

  /**
   * Builds context from a Reubicacion (Relocation) ID.
   */
  buildContextFromReubicacion: async (sp_id: number): Promise<IncidentContext> => {
    const provider = integrationFacade.getProvider();
    const reub = await provider.getReubicacionBySpId(sp_id);

    if (!reub) {
      return { origin: { system: 'sharepoint', table: 'sp_reubicaciones', sp_id, label: `Not Found ${sp_id}` } };
    }

    const ref = reub.codigo || `RB-${reub.sp_id}`;

    const context: IncidentContext = {
      origin: createLink('sp_reubicaciones', reub.sp_id, ref, `Reubicacion ${ref}`),
      extra: { motivo: reub.motivo, status: reub.status, data_movimento: reub.data_movimento }
    };

    if (reub.client_sp_id) {
      const client = await provider.getClientBySpId(reub.client_sp_id);
      if (client) {
        context.client = {
          name: client.name,
          sp_id: client.sp_id,
          link: createLink('sp_clients', client.sp_id, undefined, client.name),
          email: client.email,
          phone: client.phone
        };
        context.company = { name: client.company };
      }
    }

    if (reub.pedido_sp_id) {
      const pedido = await provider.getPedidoBySpId(reub.pedido_sp_id);
      if (pedido) {
        context.pedido = { ref: pedido.codigo, sp_id: pedido.sp_id, link: createLink('sp_pedidos', pedido.sp_id, pedido.codigo, pedido.codigo) };
      }
    }

    if (reub.worker_sp_id) {
      const worker = await provider.getWorkerBySpId(reub.worker_sp_id);
      if (worker) {
        context.worker = {
          name: worker.nome,
          sp_id: worker.sp_id,
          link: createLink('sp_workers', worker.sp_id, worker.documento, worker.nome),
          email: worker.email,
          phone: worker.phone
        };
      }
    }

    if (reub.obra_to_sp_id) {
      const obra = await provider.getObraBySpId(reub.obra_to_sp_id);
      if (obra) {
        context.obra = { name: obra.nome, sp_id: obra.sp_id, link: createLink('sp_obras', obra.sp_id, obra.codigo, obra.nome) };
      }
    }

    return context;
  },

  /**
   * Builds context from a Pedido (Order) ID.
   */
  buildContextFromPedido: async (sp_id: number): Promise<IncidentContext> => {
    const provider = integrationFacade.getProvider();
    const pedido = await provider.getPedidoBySpId(sp_id);

    if (!pedido) {
      return { origin: { system: 'sharepoint', table: 'sp_pedidos', sp_id, label: `Not Found ${sp_id}` } };
    }

    const context: IncidentContext = {
      origin: createLink('sp_pedidos', pedido.sp_id, pedido.codigo, `Pedido ${pedido.codigo}`),
      pedido: { ref: pedido.codigo, sp_id: pedido.sp_id, link: createLink('sp_pedidos', pedido.sp_id, pedido.codigo, pedido.codigo) },
      extra: { comercial: pedido.comercial_email, status: pedido.status }
    };

    if (pedido.client_sp_id) {
      const client = await provider.getClientBySpId(pedido.client_sp_id);
      if (client) {
        context.client = {
          name: client.name,
          sp_id: client.sp_id,
          link: createLink('sp_clients', client.sp_id, undefined, client.name),
          email: client.email,
          phone: client.phone
        };
        context.company = { name: client.company };
      }
    }

    if (pedido.obra_sp_id) {
      const obra = await provider.getObraBySpId(pedido.obra_sp_id);
      if (obra) {
        context.obra = { name: obra.nome, sp_id: obra.sp_id, link: createLink('sp_obras', obra.sp_id, obra.codigo, obra.nome) };
      }
    }

    return context;
  }
};
