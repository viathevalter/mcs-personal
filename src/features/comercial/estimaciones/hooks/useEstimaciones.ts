import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/shared/supabase/client';
import { useEmpresa } from '@/app/providers/EmpresaProvider';
import type { Estimacion } from '../types';

interface UseEstimacionesFilters {
  status?: string;
  solicitud_type?: string;
  search?: string;
  client_id?: string;
  empresa_id?: string;
}

export function matchesEstimacionSearch(est: any, searchTerm: string): boolean {
  if (!searchTerm || !searchTerm.trim()) return true;

  // Split into search words (tokens) so "nova 922" or "luminous dumar" matches
  const tokens = searchTerm.trim().toLowerCase().split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return true;

  // Gather all searchable text from the estimation and its related entities
  const code = (est.codigo || '').toLowerCase();
  
  // Client info
  const clientTrade = (est.client?.trade_name || '').toLowerCase();
  const clientLegal = (est.client?.legal_name || '').toLowerCase();
  const clientCode = (est.client?.codigo || '').toLowerCase();
  const leadCompany = (est.lead?.company_name || '').toLowerCase();
  const leadName = (est.lead?.name || '').toLowerCase();
  const contactName = (est.contact_name || '').toLowerCase();
  const contactEmail = (est.contact_email || '').toLowerCase();
  
  // Obra / Site info
  const siteName = (est.client_site?.name || '').toLowerCase();
  const postalCode = (est.postal_code || '').toLowerCase();
  
  // Empresa info
  const empresaTrade = (est.empresa?.trade_name || '').toLowerCase();
  const empresaLegal = (est.empresa?.legal_name || '').toLowerCase();
  const empresaNome = (est.empresa?.nome || '').toLowerCase();
  
  // Seller / User info
  const sellerName = (est.seller?.display_name || '').toLowerCase();
  const sellerEmail = (est.seller?.email || '').toLowerCase();
  const createdByName = (est.created_by_user?.display_name || '').toLowerCase();
  const createdByEmail = (est.created_by_user?.email || '').toLowerCase();
  
  // Country & Type & Notes
  const countryName = (est.country?.name || '').toLowerCase();
  const typeStr = (est.estimation_type || '').toLowerCase();
  const notes = (est.general_notes || '').toLowerCase();

  const fullHaystack = [
    code,
    clientTrade,
    clientLegal,
    clientCode,
    leadCompany,
    leadName,
    contactName,
    contactEmail,
    siteName,
    postalCode,
    empresaTrade,
    empresaLegal,
    empresaNome,
    sellerName,
    sellerEmail,
    createdByName,
    createdByEmail,
    countryName,
    typeStr,
    notes,
  ].join(' ');

  // Every token typed by the user must match somewhere in the estimation haystack
  return tokens.every(token => fullHaystack.includes(token));
}

export function useEstimaciones(filters?: UseEstimacionesFilters) {
  const { selectedEmpresaId, activeEmpresaId } = useEmpresa();

  return useQuery({
    queryKey: ['estimaciones', selectedEmpresaId, filters],
    queryFn: async () => {
      if (!selectedEmpresaId) throw new Error('Empresa não selecionada');

      let query = supabase
        .schema('core_comercial')
        .from('estimaciones')
        .select(`
          *,
          current_version:estimacion_versions!fk_estimacion_current_version(
            id, version_number, total_cost, total_revenue, margin_percent, status,
            items:estimacion_items(
              quantity,
              job_function:job_functions(id, name)
            )
          )
        `)
        .order('created_at', { ascending: false });

      // Determine target company filter:
      // If filters.empresa_id is explicitly 'all', do not filter by empresa
      let targetEmpresaId: string | undefined = undefined;
      if (filters?.empresa_id) {
        if (filters.empresa_id !== 'all' && filters.empresa_id !== 'default') {
          targetEmpresaId = filters.empresa_id;
        }
      } else if (activeEmpresaId && activeEmpresaId !== 'all') {
        targetEmpresaId = activeEmpresaId;
      }

      if (targetEmpresaId) {
        query = query.eq('empresa_id', targetEmpresaId);
      }

      if (filters?.status && filters.status !== 'all') {
        query = query.eq('status', filters.status);
      }
      if (filters?.solicitud_type && filters.solicitud_type !== 'all') {
        query = query.eq('estimation_type', filters.solicitud_type);
      }
      if (filters?.client_id && filters.client_id !== 'all') {
        query = query.eq('client_id', filters.client_id);
      }

      const { data, error } = await query;
      if (error) throw error;
      
      if (!data || data.length === 0) return [];

      const clientIds = [...new Set(data.map(d => d.client_id).filter(Boolean))];
      const leadIds = [...new Set(data.map(d => d.lead_id).filter(Boolean))];
      const siteIds = [...new Set(data.map(d => d.client_site_id).filter(Boolean))];
      
      const [
        { data: clients }, 
        { data: leads }, 
        { data: sites },
        { data: users },
        { data: companies },
        { data: countries }
      ] = await Promise.all([
        clientIds.length > 0 ? supabase.schema('core_common').from('clients').select('id, legal_name, trade_name, codigo').in('id', clientIds) : Promise.resolve({ data: [] }),
        leadIds.length > 0 ? supabase.schema('core_comercial').from('leads').select('id, name, company_name').in('id', leadIds) : Promise.resolve({ data: [] }),
        siteIds.length > 0 ? supabase.schema('core_common').from('client_sites').select('id, name').in('id', siteIds) : Promise.resolve({ data: [] }),
        supabase.schema('core_operacoes').from('mcs_users').select('id, email, display_name'),
        supabase.schema('core_common').from('empresas').select('id, legal_name, trade_name'),
        supabase.schema('core_common').from('countries').select('id, name')
      ]);

      let enrichedList = data.map(est => {
        const lead = leads?.find((l: any) => l.id === est.lead_id);
        const sellerId = est.commercial_owner_id || est.created_by || lead?.assigned_to;
        let sellerUser = users?.find((u: any) => u.id === sellerId);
        
        // Fallback: match by contact_email if it's an @gestaologinpro.com address
        if (!sellerUser && est.contact_email && est.contact_email.toLowerCase().includes('@gestaologinpro.com')) {
          sellerUser = users?.find((u: any) => u.email?.toLowerCase() === est.contact_email.toLowerCase());
        }

        const createdByUser = users?.find((u: any) => u.id === est.created_by) || sellerUser;

        return {
          ...est,
          client: clients?.find((c: any) => c.id === est.client_id),
          lead,
          client_site: sites?.find((s: any) => s.id === est.client_site_id),
          created_by_user: createdByUser,
          seller: sellerUser || createdByUser,
          empresa: companies?.find((e: any) => e.id === est.empresa_id),
          country: countries?.find((c: any) => c.id === est.country_id)
        };
      }) as any[];

      // Multi-entity search across code, client, company, lead, seller, site, notes
      if (filters?.search) {
        enrichedList = enrichedList.filter(est => matchesEstimacionSearch(est, filters.search!));
      }

      return enrichedList;
    },
    enabled: !!selectedEmpresaId,
  });
}
