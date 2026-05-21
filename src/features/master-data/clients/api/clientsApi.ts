import { supabase } from '@/shared/supabase/client';
import type { CreateClientDTO, Client, UpdateClientDTO } from '../types';

export const clientsApi = {
  async getClients(empresaId: string): Promise<Client[]> {
    if (!empresaId) return [];

    const { data, error } = await supabase
      .schema('core_common')
      .from('clients')
      .select('*')
      .neq('status', 'archived')
      .order('trade_name', { ascending: true });

    if (error) throw error;
    return data as Client[];
  },

  async createClient(empresaId: string, payload: CreateClientDTO): Promise<Client> {
    if (!empresaId) throw new Error('Empresa não selecionada');

    const { data, error } = await supabase
      .schema('core_common')
      .from('clients')
      .insert({
        ...payload,
        empresa_id: empresaId,
      })
      .select()
      .single();

    if (error) throw error;
    return data as Client;
  },

  async updateClient(id: string, payload: UpdateClientDTO): Promise<Client> {
    const { data, error } = await supabase
      .schema('core_common')
      .from('clients')
      .update(payload)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data as Client;
  },

  async archiveClient(id: string): Promise<void> {
    const { error } = await supabase
      .schema('core_common')
      .from('clients')
      .update({ status: 'archived' })
      .eq('id', id);

    if (error) throw error;
  }
};
