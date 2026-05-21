import { supabase } from '@/shared/supabase/client';
import type { CreateClientSiteDTO, ClientSite, UpdateClientSiteDTO } from '../types';

export const clientSitesApi = {
  async getClientSites(empresaId: string, clientId?: string): Promise<ClientSite[]> {
    if (!empresaId) return [];

    let query = supabase
      .schema('core_common')
      .from('client_sites')
      .select('*, client:clients(*)')
      .neq('status', 'archived');

    if (clientId) {
      query = query.eq('client_id', clientId);
    }

    const { data, error } = await query.order('name', { ascending: true });

    if (error) throw error;
    return data as ClientSite[];
  },

  async createClientSite(empresaId: string, payload: CreateClientSiteDTO): Promise<ClientSite> {
    if (!empresaId) throw new Error('Empresa não selecionada');

    const { data, error } = await supabase
      .schema('core_common')
      .from('client_sites')
      .insert({
        ...payload,
        empresa_id: empresaId,
      })
      .select()
      .single();

    if (error) throw error;
    return data as ClientSite;
  },

  async updateClientSite(id: string, payload: UpdateClientSiteDTO): Promise<ClientSite> {
    const { data, error } = await supabase
      .schema('core_common')
      .from('client_sites')
      .update(payload)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data as ClientSite;
  },

  async archiveClientSite(id: string): Promise<void> {
    const { error } = await supabase
      .schema('core_common')
      .from('client_sites')
      .update({ status: 'archived' })
      .eq('id', id);

    if (error) throw error;
  }
};
