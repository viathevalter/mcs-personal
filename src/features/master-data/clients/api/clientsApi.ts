import { supabase } from '@/shared/supabase/client';
import type { CreateClientDTO, Client, UpdateClientDTO, PaymentTerm, ClientContact, ClientViesCheckLog } from '../types';

export const clientsApi = {
  async getClients(empresaId: string): Promise<Client[]> {
    if (!empresaId) return [];

    const { data, error } = await supabase
      .schema('core_common')
      .from('clients')
      .select(`
        *,
        client_company_settings (
          empresa_id,
          payment_term_id,
          status,
          credit_limit,
          billing_cycle_start_day,
          payment_term:payment_term_id ( id, name, days )
        )
      `)
      .order('trade_name', { ascending: true })
      .is('deleted_at', null);

    if (error) throw error;

    // Process and map settings for the selected company
    return (data || []).map((client: any) => {
      const settings = client.client_company_settings?.find(
        (s: any) => s.empresa_id === empresaId
      );
      return {
        ...client,
        payment_term_id: settings?.payment_term_id || null,
        payment_term: settings?.payment_term || null,
        status: settings?.status || 'active',
        credit_limit: settings?.credit_limit !== undefined ? Number(settings.credit_limit) : null,
        billing_cycle_start_day: settings?.billing_cycle_start_day || 1,
      };
    }) as Client[];
  },

  async createClient(empresaId: string, payload: CreateClientDTO): Promise<Client> {
    if (!empresaId) throw new Error('Empresa não selecionada');

    const {
      payment_term_id,
      status,
      credit_limit,
      billing_cycle_start_day,
      ...globalPayload
    } = payload as any;

    const { data: clientData, error: clientError } = await supabase
      .schema('core_common')
      .from('clients')
      .insert({
        ...globalPayload,
        vies_applicable: globalPayload.vies_applicable ?? true,
      })
      .select()
      .single();

    if (clientError) throw clientError;

    const { error: settingsError } = await supabase
      .schema('core_common')
      .from('client_company_settings')
      .insert({
        client_id: clientData.id,
        empresa_id: empresaId,
        payment_term_id: payment_term_id || null,
        status: status || 'active',
        credit_limit: credit_limit || 0,
        billing_cycle_start_day: billing_cycle_start_day || 1,
      });

    if (settingsError) throw settingsError;

    const clients = await this.getClients(empresaId);
    const created = clients.find(c => c.id === clientData.id);
    if (!created) throw new Error('Erro ao carregar cliente criado');
    return created;
  },

  async updateClient(empresaId: string, id: string, payload: UpdateClientDTO): Promise<Client> {
    if (!empresaId) throw new Error('Empresa não selecionada');

    const {
      payment_term_id,
      status,
      credit_limit,
      billing_cycle_start_day,
      ...globalPayload
    } = payload as any;

    if (Object.keys(globalPayload).length > 0) {
      const { error: clientError } = await supabase
        .schema('core_common')
        .from('clients')
        .update(globalPayload)
        .eq('id', id);

      if (clientError) throw clientError;
    }

    const settingsUpdate: any = {};
    if (payment_term_id !== undefined) settingsUpdate.payment_term_id = payment_term_id;
    if (status !== undefined) settingsUpdate.status = status;
    if (credit_limit !== undefined) settingsUpdate.credit_limit = credit_limit;
    if (billing_cycle_start_day !== undefined) settingsUpdate.billing_cycle_start_day = billing_cycle_start_day;

    if (Object.keys(settingsUpdate).length > 0) {
      const { error: settingsError } = await supabase
        .schema('core_common')
        .from('client_company_settings')
        .upsert({
          client_id: id,
          empresa_id: empresaId,
          ...settingsUpdate,
        });

      if (settingsError) throw settingsError;
    }

    const clients = await this.getClients(empresaId);
    const updated = clients.find(c => c.id === id);
    if (!updated) throw new Error('Erro ao carregar cliente atualizado');
    return updated;
  },

  async archiveClient(empresaId: string, id: string): Promise<void> {
    if (!empresaId) throw new Error('Empresa não selecionada');
    const { error } = await supabase
      .schema('core_common')
      .from('client_company_settings')
      .update({ status: 'archived' })
      .eq('client_id', id)
      .eq('empresa_id', empresaId);

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
  },

  async getClientTariffs(clientId: string): Promise<any[]> {
    if (!clientId) return [];
    const { data, error } = await supabase
      .schema('core_common')
      .from('client_tariffs')
      .select('*')
      .eq('client_id', clientId);
    if (error) throw error;
    return data || [];
  },

  async saveClientTariff(empresaId: string, clientId: string, clientSiteId: string | null, jobFunctionId: string, valorTarifa: number): Promise<void> {
    if (!empresaId || !clientId || !jobFunctionId) throw new Error('Dados insuficientes para salvar tarifa');
    
    const query = supabase
      .schema('core_common')
      .from('client_tariffs')
      .select('id')
      .eq('client_id', clientId)
      .eq('job_function_id', jobFunctionId);

    if (clientSiteId) {
      query.eq('client_site_id', clientSiteId);
    } else {
      query.is('client_site_id', null);
    }

    const { data, error: selectError } = await query;
    if (selectError) throw selectError;

    if (data && data.length > 0) {
      const { error: updateError } = await supabase
        .schema('core_common')
        .from('client_tariffs')
        .update({
          valor_tarifa: valorTarifa,
          updated_at: new Date().toISOString()
        })
        .eq('id', data[0].id);
      if (updateError) throw updateError;
    } else {
      const { error: insertError } = await supabase
        .schema('core_common')
        .from('client_tariffs')
        .insert({
          empresa_id: empresaId,
          client_id: clientId,
          client_site_id: clientSiteId || null,
          job_function_id: jobFunctionId,
          valor_tarifa: valorTarifa
        });
      if (insertError) throw insertError;
    }
  },

  async deleteClientTariff(clientId: string, clientSiteId: string | null, jobFunctionId: string): Promise<void> {
    const query = supabase
      .schema('core_common')
      .from('client_tariffs')
      .delete()
      .eq('client_id', clientId)
      .eq('job_function_id', jobFunctionId);

    if (clientSiteId) {
      query.eq('client_site_id', clientSiteId);
    } else {
      query.is('client_site_id', null);
    }

    const { error } = await query;
    if (error) throw error;
  },

  async getClientWorkerTariffs(clientId: string): Promise<any[]> {
    if (!clientId) return [];
    const { data: tariffs, error: tariffsError } = await supabase
      .schema('core_common')
      .from('client_worker_tariffs')
      .select(`
        *,
        site:client_site_id ( id, name )
      `)
      .eq('client_id', clientId);

    if (tariffsError) throw tariffsError;
    if (!tariffs || tariffs.length === 0) return [];

    const workerIds = Array.from(new Set(tariffs.map(t => t.worker_id).filter(Boolean)));
    let workers: any[] = [];

    if (workerIds.length > 0) {
      const { data: workersData, error: workersError } = await supabase
        .schema('core_personal')
        .from('workers')
        .select('id, nome, cod_colab, funcion')
        .in('id', workerIds);

      if (workersError) throw workersError;
      workers = workersData || [];
    }

    // Fetch user profiles for audit tracking
    const userIds = Array.from(new Set([
      ...tariffs.map(t => t.created_by).filter(Boolean),
      ...tariffs.map(t => t.updated_by).filter(Boolean)
    ]));
    let profiles: any[] = [];

    if (userIds.length > 0) {
      const { data: profilesData, error: profilesError } = await supabase
        .schema('core_operacoes')
        .from('mcs_users')
        .select('id, display_name, email')
        .in('id', userIds);

      if (profilesError) {
        console.error('Failed to fetch user profiles for audit:', profilesError);
      } else {
        profiles = (profilesData || []).map(p => ({
          id: p.id,
          email: p.email,
          full_name: p.display_name
        }));
      }
    }

    const workersMap = new Map(workers.map(w => [w.id, w]));
    const profilesMap = new Map(profiles.map(p => [p.id, p]));

    return tariffs.map(t => ({
      ...t,
      worker: workersMap.get(t.worker_id) || null,
      creator: profilesMap.get(t.created_by) || null,
      updater: profilesMap.get(t.updated_by) || null
    }));
  },

  async saveClientWorkerTariff(empresaId: string, clientId: string, clientSiteId: string | null, workerId: string, valorTarifa: number): Promise<void> {
    if (!empresaId || !clientId || !workerId) throw new Error('Dados insuficientes para salvar exceção');

    // Fetch current user UUID
    const { data: { user } } = await supabase.auth.getUser();
    const userId = user?.id || null;

    const query = supabase
      .schema('core_common')
      .from('client_worker_tariffs')
      .select('id')
      .eq('client_id', clientId)
      .eq('worker_id', workerId);

    if (clientSiteId) {
      query.eq('client_site_id', clientSiteId);
    } else {
      query.is('client_site_id', null);
    }

    const { data, error: selectError } = await query;
    if (selectError) throw selectError;

    if (data && data.length > 0) {
      const { error: updateError } = await supabase
        .schema('core_common')
        .from('client_worker_tariffs')
        .update({
          valor_tarifa: valorTarifa,
          updated_at: new Date().toISOString(),
          updated_by: userId
        })
        .eq('id', data[0].id);
      if (updateError) throw updateError;
    } else {
      const { error: insertError } = await supabase
        .schema('core_common')
        .from('client_worker_tariffs')
        .insert({
          empresa_id: empresaId,
          client_id: clientId,
          client_site_id: clientSiteId || null,
          worker_id: workerId,
          valor_tarifa: valorTarifa,
          created_by: userId,
          updated_by: userId
        });
      if (insertError) throw insertError;
    }
  },

  async deleteClientWorkerTariff(id: string): Promise<void> {
    const { error } = await supabase
      .schema('core_common')
      .from('client_worker_tariffs')
      .delete()
      .eq('id', id);
    if (error) throw error;
  }
};
