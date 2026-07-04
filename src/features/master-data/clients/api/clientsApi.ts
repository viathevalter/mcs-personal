import { supabase } from '@/shared/supabase/client';
import type { CreateClientDTO, Client, UpdateClientDTO, PaymentTerm, ClientContact, ClientViesCheckLog } from '../types';

export const clientsApi = {
  async getClients(empresaId: string): Promise<Client[]> {
    if (!empresaId) return [];

    const { data, error } = await supabase
      .schema('core_common')
      .from('clients')
      .select('*, payment_term:payment_term_id ( id, name, days )')
      .eq('empresa_id', empresaId)
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
        vies_applicable: true,
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
  },

  async getPaymentTerms(empresaId: string): Promise<PaymentTerm[]> {
    if (!empresaId) return [];

    const { data, error } = await supabase
      .schema('core_common')
      .from('payment_terms')
      .select('*')
      .eq('empresa_id', empresaId)
      .eq('active', true)
      .order('name', { ascending: true });

    if (error) throw error;
    return data as PaymentTerm[];
  },

  async createPaymentTerm(empresaId: string, payload: Omit<PaymentTerm, 'id' | 'empresa_id' | 'created_at' | 'updated_at'>): Promise<PaymentTerm> {
    if (!empresaId) throw new Error('Empresa não selecionada');

    const { data, error } = await supabase
      .schema('core_common')
      .from('payment_terms')
      .insert({
        ...payload,
        empresa_id: empresaId,
      })
      .select()
      .single();

    if (error) throw error;
    return data as PaymentTerm;
  },

  async updatePaymentTerm(id: string, payload: Partial<Omit<PaymentTerm, 'id' | 'empresa_id' | 'created_at' | 'updated_at'>>): Promise<PaymentTerm> {
    const { data, error } = await supabase
      .schema('core_common')
      .from('payment_terms')
      .update(payload)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data as PaymentTerm;
  },

  async deletePaymentTerm(id: string): Promise<void> {
    const { error } = await supabase
      .schema('core_common')
      .from('payment_terms')
      .delete()
      .eq('id', id);

    if (error) throw error;
  },

  async getClientContacts(clientId: string): Promise<ClientContact[]> {
    if (!clientId) return [];

    const { data, error } = await supabase
      .schema('core_common')
      .from('client_contacts')
      .select('*')
      .eq('client_id', clientId)
      .order('name', { ascending: true });

    if (error) throw error;
    return data as ClientContact[];
  },

  async createClientContact(clientId: string, payload: Omit<ClientContact, 'id' | 'client_id' | 'created_at' | 'updated_at'>): Promise<ClientContact> {
    if (!clientId) throw new Error('Cliente não selecionado');

    const { data, error } = await supabase
      .schema('core_common')
      .from('client_contacts')
      .insert({
        ...payload,
        client_id: clientId,
      })
      .select()
      .single();

    if (error) throw error;
    return data as ClientContact;
  },

  async updateClientContact(id: string, payload: Partial<Omit<ClientContact, 'id' | 'client_id' | 'created_at' | 'updated_at'>>): Promise<ClientContact> {
    const { data, error } = await supabase
      .schema('core_common')
      .from('client_contacts')
      .update(payload)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data as ClientContact;
  },

  async deleteClientContact(id: string): Promise<void> {
    const { error } = await supabase
      .schema('core_common')
      .from('client_contacts')
      .delete()
      .eq('id', id);

    if (error) throw error;
  },

  async checkVies(clientId: string, countryCode: string, vatNumber: string, triggerSource: string = 'manual'): Promise<any> {
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token;
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;

    const response = await fetch(`${supabaseUrl}/functions/v1/check-vies`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token || import.meta.env.VITE_SUPABASE_ANON_KEY}`
      },
      body: JSON.stringify({
        client_id: clientId,
        country_code: countryCode,
        vat_number: vatNumber,
        trigger_source: triggerSource
      })
    });

    if (!response.ok) {
      const errBody = await response.json().catch(() => ({}));
      throw new Error(errBody.error || `Erro na API VIES: Status ${response.status}`);
    }

    return response.json();
  },

  async getClientViesHistory(clientId: string): Promise<ClientViesCheckLog[]> {
    if (!clientId) return [];
    const { data, error } = await supabase
      .schema('core_common')
      .from('client_vies_checks')
      .select('*')
      .eq('client_id', clientId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data as ClientViesCheckLog[];
  }
};
