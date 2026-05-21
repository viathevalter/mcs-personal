import type {  IDataProvider  } from './IDataProvider';
import type { SPClient, SPPedido, SPWorker, SPReemplazo, SPReubicacion, SPObra } from '../../types/sp_mirror';

// Use environment variables or hardcoded for now (assuming .env is set up)
// Ideally this should come from a centralized config or auth context
// For this implementation, we'll assume the client is available globally or we recreate it
// But better to reuse if possible. The grep showed src/services/supabaseClient.ts

import { supabase } from '../supabaseClient';

export class SupabaseProvider implements IDataProvider {

    // --- CLIENTS ---
    private mapClient(row: any): SPClient {
        return {
            id: String(row.id),
            sp_id: row.sp_id || row.id, // Fallback if sp_id is null
            sp_created: row.created_at || new Date().toISOString(),
            sp_modified: row.updated_at || new Date().toISOString(),
            name: row.nombre_comercial || row.razon_social || 'Sem Nome',
            company: '', // Removed hardcoded 'Mastercorp'
            industry: 'N/A',
            status: 'Ativo', // Defaulting as status column might be text
            email: row.email,
            phone: row.movil || row.telefono,
            nif: row.cif_dni
        };
    }

    async getClientBySpId(spId: number): Promise<SPClient | null> {
        const { data, error } = await supabase
            .from('clientes')
            .select('*')
            .eq('sp_id', spId)
            .single();

        if (error || !data) return null;
        return this.mapClient(data);
    }

    async searchClients(query: string): Promise<SPClient[]> {
        const { data, error } = await supabase
            .from('clientes')
            .select('*')
            .ilike('nombre_comercial', `%${query}%`)
            .limit(10);

        if (error || !data) return [];
        return data.map(this.mapClient);
    }

    // --- WORKERS (Colaboradores) ---
    private mapWorker(row: any): SPWorker {
        return {
            id: String(row.id),
            sp_id: row.sp_id || row.id,
            sp_created: row.created_at || new Date().toISOString(),
            sp_modified: row.updated_at || new Date().toISOString(),
            nome: row.nombre || 'Sem Nome',
            documento: row.dni || row.nie || row.pasaporte || '',
            nacionalidade: row.nacionalidade || 'N/A',
            categoria_profissional: row.categoria || row.funcion || 'N/A',
            status: 'Disponível', // Mapping logic needed if status column exists
            email: row.email,
            phone: row.movil
        };
    }

    async getWorkerBySpId(spId: number): Promise<SPWorker | null> {
        const { data, error } = await supabase
            .from('colaboradores')
            .select('*')
            .eq('sp_id', spId)
            .single();

        if (error || !data) return null;
        return this.mapWorker(data);
    }

    async searchWorkers(query: string): Promise<SPWorker[]> {
        const { data, error } = await supabase
            .from('colaboradores')
            .select('*')
            .ilike('nombre', `%${query}%`)
            .limit(10);

        if (error || !data) return [];
        return data.map(this.mapWorker);
    }

    // --- OBRAS (Not Available) ---
    async getObraBySpId(_spId: number): Promise<SPObra | null> {
        return null;
    }

    async searchObras(_query: string): Promise<SPObra[]> {
        return [];
    }

    // --- PEDIDOS ---
    private mapPedido(row: any): SPPedido {
        return {
            id: String(row.id),
            sp_id: row.sp_id || row.id,
            sp_created: row.created_at || new Date().toISOString(),
            sp_modified: row.updated_at || new Date().toISOString(),
            codigo: row.cod_pedido || `PED-${row.id}`,
            client_sp_id: row.id_cliente || 0, // Need to handle relations?
            obra_sp_id: 0,
            data_inicio: row.fecha_inicio_pedido || new Date().toISOString(),
            data_fim_estimada: row.fecha_fin_pedido,
            status: 'Aberto', // Map from row.status_pedido
            comercial_email: row.comercial_responsable || ''
        };
    }

    async getPedidoBySpId(spId: number): Promise<SPPedido | null> {
        const { data, error } = await supabase
            .from('pedidos')
            .select('*')
            .eq('sp_id', spId)
            .single();

        if (error || !data) return null;
        return this.mapPedido(data);
    }

    async getPedidoByCode(code: string): Promise<SPPedido | null> {
        const { data, error } = await supabase
            .from('pedidos')
            .select('*')
            .eq('cod_pedido', code)
            .single();

        if (error || !data) return null;
        return this.mapPedido(data);
    }

    async searchPedidos(query: string): Promise<SPPedido[]> {
        const { data, error } = await supabase
            .from('pedidos')
            .select('*')
            .ilike('cod_pedido', `%${query}%`)
            .limit(10);

        if (error || !data) return [];
        return data.map(this.mapPedido);
    }

    // --- REEMPLAZOS ---
    private mapReemplazo(row: any): SPReemplazo {
        return {
            id: String(row.id),
            sp_id: row.sp_id || row.id,
            sp_created: row.created_sp || row.inserted_at || new Date().toISOString(),
            sp_modified: row.sp_modified || row.updated_at || new Date().toISOString(),
            codigo: row.codreemplazo || `R-${row.id}`,
            client_sp_id: row.idcliente || 0,
            pedido_sp_id: 0, // Need mapping logic
            worker_old_sp_id: 0,
            status: row.statusreemplazo || 'Pendente',
            motivo: 'Outro',
            data_solicitacao: row.fechainicioreemplazo || new Date().toISOString()
        };
    }

    async getReemplazoBySpId(spId: number): Promise<SPReemplazo | null> {
        const { data, error } = await supabase
            .from('reemplazos')
            .select('*')
            .eq('sp_id', spId)
            .single();

        if (error || !data) return null;
        return this.mapReemplazo(data);
    }

    async getReemplazoByCode(code: string): Promise<SPReemplazo | null> {
        const { data, error } = await supabase
            .from('reemplazos')
            .select('*')
            .eq('codreemplazo', code)
            .single();

        if (error || !data) return null;
        return this.mapReemplazo(data);
    }

    async searchReemplazos(query: string): Promise<SPReemplazo[]> {
        const { data, error } = await supabase
            .from('reemplazos')
            .select('*')
            .ilike('codreemplazo', `%${query}%`)
            .limit(10);

        if (error || !data) return [];
        return data.map(this.mapReemplazo);
    }

    // --- REUBICACIONES (Not Available) ---
    async getReubicacionBySpId(_spId: number): Promise<SPReubicacion | null> {
        return null;
    }
    async getReubicacionByCode(_code: string): Promise<SPReubicacion | null> {
        return null;
    }
    async searchReubicaciones(_query: string): Promise<SPReubicacion[]> {
        return [];
    }
}
