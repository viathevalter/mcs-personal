
import type {  IDataProvider  } from './IDataProvider';
import { spMappers } from '../integration/mappings/sharepointMappings';

// Mocks Data
import { spClientsMock } from '../../data/mock/sp_mirror/sp_clients.mock';
import { spPedidosMock } from '../../data/mock/sp_mirror/sp_pedidos.mock';
import { spWorkersMock } from '../../data/mock/sp_mirror/sp_workers.mock';
import { spReemplazosMock } from '../../data/mock/sp_mirror/sp_reemplazos.mock';
import { spReubicacionesMock } from '../../data/mock/sp_mirror/sp_reubicaciones.mock';
import { spObrasMock } from '../../data/mock/sp_mirror/sp_obras.mock';

import type {
    SPClient, SPPedido, SPWorker, SPReemplazo, SPReubicacion, SPObra
} from '../../types/sp_mirror';

// Helpers para simular dados "Raw" vindos de uma API SharePoint/OData antes do Mapper
const SimRaw = {
    Client: (c: SPClient) => ({ ID: c.sp_id, Title: c.name, Company_x0020_Group: c.company, Industry_x0020_Type: c.industry, Account_x0020_Status: c.status, Created: c.sp_created, Modified: c.sp_modified, uuid: c.id, Email: c.email, WorkPhone: c.phone }),
    Worker: (w: SPWorker) => ({ ID: w.sp_id, Full_x0020_Name: w.nome, Doc_x0020_Number: w.documento, Nationality: w.nacionalidade, Job_x0020_Category: w.categoria_profissional, Worker_x0020_Status: w.status, Created: w.sp_created, Modified: w.sp_modified, uuid: w.id, Email: w.email, MobilePhone: w.phone }),
    Pedido: (p: SPPedido) => ({ ID: p.sp_id, Order_x0020_Code: p.codigo, ClientLookupId: p.client_sp_id, ConstructionSiteId: p.obra_sp_id, Start_x0020_Date: p.data_inicio, OData__Status: p.status, Sales_x0020_Rep_x0020_Email: p.comercial_email, Created: p.sp_created, Modified: p.sp_modified, uuid: p.id }),
    Obra: (o: SPObra) => ({ ID: o.sp_id, Site_x0020_Code: o.codigo, Site_x0020_Name: o.nome, ClientLookupId: o.client_sp_id, Geo_x0020_Location: o.localizacao, Project_x0020_Status: o.status, Created: o.sp_created, Modified: o.sp_modified, uuid: o.id }),
    Reemplazo: (r: SPReemplazo) => ({ ID: r.sp_id, Ref_x0020_Code: r.codigo, ClientLookupId: r.client_sp_id, OrderLookupId: r.pedido_sp_id, OldWorkerId: r.worker_old_sp_id, NewWorkerId: r.worker_new_sp_id, Replacement_x0020_Reason: r.motivo, Request_x0020_Date: r.data_solicitacao, Approval_x0020_Status: r.status, Created: r.sp_created, Modified: r.sp_modified, uuid: r.id }),
    Reubicacion: (r: SPReubicacion) => ({ ID: r.sp_id, Move_x0020_Ref: r.codigo, ClientLookupId: r.client_sp_id, OrderLookupId: r.pedido_sp_id, WorkerLookupId: r.worker_sp_id, OriginSiteId: r.obra_from_sp_id, DestSiteId: r.obra_to_sp_id, Move_x0020_Reason: r.motivo, Movement_x0020_Date: r.data_movimento, Logistics_x0020_Status: r.status, Created: r.sp_created, Modified: r.sp_modified, uuid: r.id })
};

export class MockProvider implements IDataProvider {

    private async delay(ms: number = 50) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    // --- CLIENTS ---
    async getClientBySpId(spId: number): Promise<SPClient | null> {
        await this.delay();
        const item = spClientsMock.find(c => c.sp_id === spId);
        return item ? spMappers.toClient(SimRaw.Client(item)) : null;
    }

    async searchClients(query: string): Promise<SPClient[]> {
        await this.delay(100);
        if (!query) return spClientsMock.map(c => spMappers.toClient(SimRaw.Client(c)));
        const lower = query.toLowerCase();
        return spClientsMock
            .filter(c => c.name.toLowerCase().includes(lower) || c.company.toLowerCase().includes(lower) || String(c.sp_id).includes(lower))
            .map(c => spMappers.toClient(SimRaw.Client(c)));
    }

    // --- WORKERS ---
    async getWorkerBySpId(spId: number): Promise<SPWorker | null> {
        await this.delay();
        const item = spWorkersMock.find(w => w.sp_id === spId);
        return item ? spMappers.toWorker(SimRaw.Worker(item)) : null;
    }

    async searchWorkers(query: string): Promise<SPWorker[]> {
        await this.delay(100);
        if (!query) return spWorkersMock.map(w => spMappers.toWorker(SimRaw.Worker(w)));
        const lower = query.toLowerCase();
        return spWorkersMock
            .filter(w => w.nome.toLowerCase().includes(lower) || w.documento.toLowerCase().includes(lower))
            .map(w => spMappers.toWorker(SimRaw.Worker(w)));
    }

    // --- OBRAS ---
    async getObraBySpId(spId: number): Promise<SPObra | null> {
        await this.delay();
        const item = spObrasMock.find(o => o.sp_id === spId);
        return item ? spMappers.toObra(SimRaw.Obra(item)) : null;
    }

    async searchObras(query: string): Promise<SPObra[]> {
        await this.delay(100);
        if (!query) return spObrasMock.map(o => spMappers.toObra(SimRaw.Obra(o)));
        const lower = query.toLowerCase();
        return spObrasMock
            .filter(o => o.nome.toLowerCase().includes(lower) || o.codigo.toLowerCase().includes(lower))
            .map(o => spMappers.toObra(SimRaw.Obra(o)));
    }

    // --- PEDIDOS ---
    async getPedidoBySpId(spId: number): Promise<SPPedido | null> {
        await this.delay();
        const item = spPedidosMock.find(p => p.sp_id === spId);
        return item ? spMappers.toPedido(SimRaw.Pedido(item)) : null;
    }

    async getPedidoByCode(code: string): Promise<SPPedido | null> {
        await this.delay();
        const item = spPedidosMock.find(p => p.codigo === code);
        return item ? spMappers.toPedido(SimRaw.Pedido(item)) : null;
    }

    async searchPedidos(query: string): Promise<SPPedido[]> {
        await this.delay(100);
        if (!query) return spPedidosMock.map(p => spMappers.toPedido(SimRaw.Pedido(p)));
        const lower = query.toLowerCase();
        return spPedidosMock
            .filter(p => p.codigo.toLowerCase().includes(lower) || String(p.sp_id).includes(lower))
            .map(p => spMappers.toPedido(SimRaw.Pedido(p)));
    }

    // --- REEMPLAZOS ---
    async getReemplazoBySpId(spId: number): Promise<SPReemplazo | null> {
        await this.delay();
        const item = spReemplazosMock.find(r => r.sp_id === spId);
        return item ? spMappers.toReemplazo(SimRaw.Reemplazo(item)) : null;
    }

    async getReemplazoByCode(code: string): Promise<SPReemplazo | null> {
        await this.delay();
        const item = spReemplazosMock.find(r => r.codigo === code);
        return item ? spMappers.toReemplazo(SimRaw.Reemplazo(item)) : null;
    }

    async searchReemplazos(query: string): Promise<SPReemplazo[]> {
        await this.delay(100);
        if (!query) return spReemplazosMock.map(r => spMappers.toReemplazo(SimRaw.Reemplazo(r)));
        const lower = query.toLowerCase();
        return spReemplazosMock
            .filter(r => r.codigo.toLowerCase().includes(lower) || String(r.sp_id).includes(lower) || r.motivo.toLowerCase().includes(lower))
            .map(r => spMappers.toReemplazo(SimRaw.Reemplazo(r)));
    }

    // --- REUBICACIONES ---
    async getReubicacionBySpId(spId: number): Promise<SPReubicacion | null> {
        await this.delay();
        const item = spReubicacionesMock.find(r => r.sp_id === spId);
        return item ? spMappers.toReubicacion(SimRaw.Reubicacion(item)) : null;
    }

    async getReubicacionByCode(code: string): Promise<SPReubicacion | null> {
        await this.delay();
        const item = spReubicacionesMock.find(r => r.codigo === code);
        return item ? spMappers.toReubicacion(SimRaw.Reubicacion(item)) : null;
    }

    async searchReubicaciones(query: string): Promise<SPReubicacion[]> {
        await this.delay(100);
        if (!query) return spReubicacionesMock.map(r => spMappers.toReubicacion(SimRaw.Reubicacion(r)));
        const lower = query.toLowerCase();
        return spReubicacionesMock
            .filter(r => r.codigo.toLowerCase().includes(lower) || String(r.sp_id).includes(lower) || r.motivo.toLowerCase().includes(lower))
            .map(r => spMappers.toReubicacion(SimRaw.Reubicacion(r)));
    }
}
