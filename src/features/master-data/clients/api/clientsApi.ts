import { supabase } from '@/shared/supabase/client';
import { fetchAllPages } from '@/shared/supabase/pagination';
import type { CreateClientDTO, Client, UpdateClientDTO, PaymentTerm, ClientContact, ClientViesCheckLog } from '../types';

export const clientsApi = {
  async getClients(empresaId: string): Promise<Client[]> {
    if (!empresaId) return [];

    const data = await fetchAllPages<any>((from, to) =>
      supabase
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
        .is('deleted_at', null)
        .range(from, to)
    );

    // Process and map settings for the selected company
    return (data || []).map((client: any) => {
      const settings = client.client_company_settings?.find(
        (s: any) => s.empresa_id === empresaId
      );
      const allInactive =
        Array.isArray(client.client_company_settings) &&
        client.client_company_settings.length > 0 &&
        client.client_company_settings.every((s: any) => s.status === 'inactive');
      return {
        ...client,
        payment_term_id: settings?.payment_term_id || null,
        payment_term: settings?.payment_term || null,
        status: settings?.status || (allInactive ? 'inactive' : 'active'),
        credit_limit: settings?.credit_limit !== undefined ? Number(settings.credit_limit) : null,
        billing_cycle_start_day: settings?.billing_cycle_start_day || 1,
      };
    }) as Client[];
  },

  async checkDuplicateClient(payload: {
    tax_id?: string | null;
    trade_name?: string | null;
    legal_name?: string | null;
    phone?: string | null;
    mobile?: string | null;
  }, excludeId?: string): Promise<{ isDuplicate: boolean; reason?: string }> {
    const cleanTax = (t?: string | null) => t ? t.replace(/[^A-Za-z0-9]/g, '').toUpperCase() : '';
    const cleanName = (n?: string | null) => n ? n.toLowerCase()
      .replace(/\b(sl|slu|sa|sau|srl|lda|unipessoal|sociedad|limitada|anonima|cv|spa|gmbh|co)\b/g, '')
      .replace(/[^a-z0-9]/g, '')
      .trim() : '';
    const cleanPhone = (p?: string | null) => p ? p.replace(/[^0-9]/g, '').slice(-8) : '';

    const targetTax = cleanTax(payload.tax_id);
    const targetTrade = cleanName(payload.trade_name);
    const targetLegal = cleanName(payload.legal_name);
    const targetPhone = cleanPhone(payload.phone) || cleanPhone(payload.mobile);

    let query = supabase
      .schema('core_common')
      .from('clients')
      .select('id, codigo, trade_name, legal_name, tax_id, phone, mobile')
      .is('deleted_at', null);

    if (excludeId) {
      query = query.neq('id', excludeId);
    }

    const { data: existing, error } = await query;
    if (error || !existing) return { isDuplicate: false };

    for (const item of existing) {
      // 1. Check Tax ID / NIF
      const itemTax = cleanTax(item.tax_id);
      if (targetTax && itemTax && targetTax.length >= 6 && targetTax === itemTax) {
        return {
          isDuplicate: true,
          reason: `Já existe um cliente cadastrado com este NIF/CIF: ${item.codigo || ''} - ${item.trade_name || item.legal_name}`
        };
      }

      // 2. Check Name (Trade Name or Legal Name)
      const itemTrade = cleanName(item.trade_name);
      const itemLegal = cleanName(item.legal_name);
      if (targetTrade && targetTrade.length >= 4 && (targetTrade === itemTrade || targetTrade === itemLegal)) {
        return {
          isDuplicate: true,
          reason: `Já existe um cliente cadastrado com este Nome de Fantasia: ${item.codigo || ''} - ${item.trade_name}`
        };
      }
      if (targetLegal && targetLegal.length >= 4 && (targetLegal === itemTrade || targetLegal === itemLegal)) {
        return {
          isDuplicate: true,
          reason: `Já existe um cliente cadastrado com esta Razão Social: ${item.codigo || ''} - ${item.legal_name || item.trade_name}`
        };
      }

      // 3. Check Phone (if provided, min 8 digits)
      const itemPhone = cleanPhone(item.phone) || cleanPhone(item.mobile);
      if (targetPhone && itemPhone && targetPhone.length >= 8 && targetPhone === itemPhone) {
        return {
          isDuplicate: true,
          reason: `Já existe um cliente cadastrado com este Telefone: ${item.codigo || ''} - ${item.trade_name}`
        };
      }
    }

    return { isDuplicate: false };
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

    // Trava de anti-duplicidade
    const dupCheck = await this.checkDuplicateClient({
      tax_id: globalPayload.tax_id,
      trade_name: globalPayload.trade_name,
      legal_name: globalPayload.legal_name,
      phone: globalPayload.phone,
      mobile: globalPayload.mobile,
    });
    if (dupCheck.isDuplicate) {
      throw new Error(dupCheck.reason);
    }

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
      if (globalPayload.tax_id || globalPayload.trade_name || globalPayload.legal_name || globalPayload.phone || globalPayload.mobile) {
        const dupCheck = await this.checkDuplicateClient({
          tax_id: globalPayload.tax_id,
          trade_name: globalPayload.trade_name,
          legal_name: globalPayload.legal_name,
          phone: globalPayload.phone,
          mobile: globalPayload.mobile,
        }, id);
        if (dupCheck.isDuplicate) {
          throw new Error(dupCheck.reason);
        }
      }

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
        }, { onConflict: 'client_id,empresa_id' });

      if (settingsError) throw settingsError;

      // Propagar a alteração de status de cadastro para todas as empresas do grupo
      if (status !== undefined) {
        await supabase
          .schema('core_common')
          .from('client_company_settings')
          .update({ status })
          .eq('client_id', id);
      }
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
      .eq('client_id', id);

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

  async saveClientTariff(empresaId: string, clientId: string, clientSiteId: string | null, jobFunctionId: string, valorTarifa: number, valorTarifaNoturna?: number | null): Promise<void> {
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
          valor_tarifa_noturna: valorTarifaNoturna !== undefined ? valorTarifaNoturna : null,
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
          valor_tarifa: valorTarifa,
          valor_tarifa_noturna: valorTarifaNoturna !== undefined ? valorTarifaNoturna : null
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

  async saveClientWorkerTariff(empresaId: string, clientId: string, clientSiteId: string | null, workerId: string, valorTarifa: number, valorTarifaNoturna?: number | null): Promise<void> {
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
          valor_tarifa_noturna: valorTarifaNoturna !== undefined ? valorTarifaNoturna : null,
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
          valor_tarifa_noturna: valorTarifaNoturna !== undefined ? valorTarifaNoturna : null,
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
  },

  async cloneClientSiteTariffs({
    empresaId,
    clientId,
    sourceSiteId,
    targetSiteId,
    copyWorkerExceptions = true,
    replaceExisting = true,
  }: {
    empresaId: string;
    clientId: string;
    sourceSiteId: string;
    targetSiteId: string;
    copyWorkerExceptions?: boolean;
    replaceExisting?: boolean;
  }): Promise<{ clonedTariffsCount: number; clonedExceptionsCount: number }> {
    if (!empresaId || !clientId) throw new Error('Empresa e Cliente são obrigatórios');
    if (!sourceSiteId || !targetSiteId) throw new Error('Obras de origem e destino são obrigatórias');
    if (sourceSiteId === targetSiteId) throw new Error('A obra de origem e a obra de destino não podem ser as mesmas');

    const sourceSiteFilter = sourceSiteId === 'global' ? null : sourceSiteId;
    const targetSiteFilter = targetSiteId === 'global' ? null : targetSiteId;

    // 1. Buscar tarifas da obra de origem
    let sourceTariffsQuery = supabase
      .schema('core_common')
      .from('client_tariffs')
      .select('*')
      .eq('empresa_id', empresaId)
      .eq('client_id', clientId);

    if (sourceSiteFilter) {
      sourceTariffsQuery = sourceTariffsQuery.eq('client_site_id', sourceSiteFilter);
    } else {
      sourceTariffsQuery = sourceTariffsQuery.is('client_site_id', null);
    }

    const { data: sourceTariffs, error: tariffsError } = await sourceTariffsQuery;
    if (tariffsError) throw tariffsError;

    if (!sourceTariffs || sourceTariffs.length === 0) {
      throw new Error('A obra de origem selecionada não possui nenhuma tarifa de função configurada.');
    }

    // 2. Se replaceExisting = true, remover tarifas existentes da obra destino
    if (replaceExisting) {
      let deleteTariffsQuery = supabase
        .schema('core_common')
        .from('client_tariffs')
        .delete()
        .eq('empresa_id', empresaId)
        .eq('client_id', clientId);

      if (targetSiteFilter) {
        deleteTariffsQuery = deleteTariffsQuery.eq('client_site_id', targetSiteFilter);
      } else {
        deleteTariffsQuery = deleteTariffsQuery.is('client_site_id', null);
      }

      const { error: delError } = await deleteTariffsQuery;
      if (delError) throw delError;

      // Inserir todas em lote
      const now = new Date().toISOString();
      const recordsToInsert = sourceTariffs.map(t => ({
        empresa_id: empresaId,
        client_id: clientId,
        client_site_id: targetSiteFilter,
        job_function_id: t.job_function_id,
        valor_tarifa: t.valor_tarifa,
        valor_tarifa_noturna: t.valor_tarifa_noturna !== undefined ? t.valor_tarifa_noturna : null,
        created_at: now,
        updated_at: now
      }));

      const { error: insertError } = await supabase
        .schema('core_common')
        .from('client_tariffs')
        .insert(recordsToInsert);

      if (insertError) throw insertError;
    } else {
      // Merge: salvar uma a uma respeitando idempotência
      for (const t of sourceTariffs) {
        await this.saveClientTariff(
          empresaId,
          clientId,
          targetSiteFilter,
          t.job_function_id,
          Number(t.valor_tarifa),
          t.valor_tarifa_noturna !== null && t.valor_tarifa_noturna !== undefined ? Number(t.valor_tarifa_noturna) : null
        );
      }
    }

    let clonedExceptionsCount = 0;

    // 3. Exceções de trabalhadores
    if (copyWorkerExceptions) {
      let sourceExcQuery = supabase
        .schema('core_common')
        .from('client_worker_tariffs')
        .select('*')
        .eq('empresa_id', empresaId)
        .eq('client_id', clientId);

      if (sourceSiteFilter) {
        sourceExcQuery = sourceExcQuery.eq('client_site_id', sourceSiteFilter);
      } else {
        sourceExcQuery = sourceExcQuery.is('client_site_id', null);
      }

      const { data: sourceExceptions, error: excError } = await sourceExcQuery;
      if (excError) throw excError;

      if (sourceExceptions && sourceExceptions.length > 0) {
        if (replaceExisting) {
          let deleteExcQuery = supabase
            .schema('core_common')
            .from('client_worker_tariffs')
            .delete()
            .eq('empresa_id', empresaId)
            .eq('client_id', clientId);

          if (targetSiteFilter) {
            deleteExcQuery = deleteExcQuery.eq('client_site_id', targetSiteFilter);
          } else {
            deleteExcQuery = deleteExcQuery.is('client_site_id', null);
          }

          const { error: delExcError } = await deleteExcQuery;
          if (delExcError) throw delExcError;
        }

        for (const exc of sourceExceptions) {
          await this.saveClientWorkerTariff(
            empresaId,
            clientId,
            targetSiteFilter,
            exc.worker_id,
            Number(exc.valor_tarifa),
            exc.valor_tarifa_noturna !== null && exc.valor_tarifa_noturna !== undefined ? Number(exc.valor_tarifa_noturna) : null
          );
          clonedExceptionsCount++;
        }
      }
    }

    return {
      clonedTariffsCount: sourceTariffs.length,
      clonedExceptionsCount
    };
  }
};
