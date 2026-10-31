import { useState, useEffect, useMemo, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/shared/supabase/client';
import { useEmpresa } from '@/app/providers/EmpresaProvider';
import { useAuth } from '@/app/providers/AuthProvider';
import type { Lead } from '../../estimaciones/types';

export type CommercialOwnerKey = 'alex' | 'alba' | 'liseth' | 'fatumata';

export interface CommercialOperatorProfile {
  key: CommercialOwnerKey;
  ownerKey: CommercialOwnerKey;
  userId: string;
  email: string;
  name: string;
  displayName: string;
  shortName: string;
  empresaId: string;
  empresaCode: 'LUM' | 'TRI' | 'WIS';
  empresaName: string;
  country: 'ES' | 'FR';
  flag: string;
  language: 'es' | 'fr';
  commercialEmail: string;       // E-mail Corporativo M365 / Outlook & Reply-To
  marketingSenderEmail: string;  // E-mail Remetente de Campanhas (Subdomínio Resend)
  senderBrandName: string;       // Nome de exibição nos disparos de e-mail
}

export const COMMERCIAL_DEPARTMENT_ID = 'd3d525e8-14bc-43b4-9d66-b59826eba2ab';

export const ACTIVE_COMMERCIAL_PROFILES: CommercialOperatorProfile[] = [
  {
    key: 'alex',
    ownerKey: 'alex',
    userId: 'efc6c631-f22a-4ce6-b662-9309a50a4cb7',
    email: 'alex@gestaologinpro.com',
    name: 'Alex Carmona Archiles',
    displayName: 'Alex Carmona Archiles',
    shortName: 'Alex',
    empresaId: '847796c4-b253-4e53-9e6b-34a127ec7d85',
    empresaCode: 'LUM',
    empresaName: 'Luminous',
    country: 'ES',
    flag: '🇪🇸',
    language: 'es',
    commercialEmail: 'comercial1@luminousalley.com',
    marketingSenderEmail: 'comercial1@mail.luminousalley.com',
    senderBrandName: 'Luminous Alley',
  },
  {
    key: 'alba',
    ownerKey: 'alba',
    userId: 'ca69863d-998b-4bad-865a-19720e7a1f67',
    email: 'alba@gestaologinpro.com',
    name: 'Alba',
    displayName: 'Alba',
    shortName: 'Alba',
    empresaId: 'a798620a-358a-4c6c-9db2-3a507c583cac',
    empresaCode: 'TRI',
    empresaName: 'Triangulo',
    country: 'ES',
    flag: '🇪🇸',
    language: 'es',
    commercialEmail: 'comercial2@triangulolda.com',
    marketingSenderEmail: 'comercial2@es.triangulolda.com',
    senderBrandName: 'Triángulo Servicios Industriales',
  },
  {
    key: 'liseth',
    ownerKey: 'liseth',
    userId: 'cdc74a13-e41a-4fa5-b51b-5a27b8f310fa',
    email: 'liseth@gestaologinpro.com',
    name: 'Liseth',
    displayName: 'Liseth',
    shortName: 'Liseth',
    empresaId: 'dae64d51-2181-4510-b14f-e63d2f111a8e',
    empresaCode: 'WIS',
    empresaName: 'Wiseowe',
    country: 'ES',
    flag: '🇪🇸',
    language: 'es',
    commercialEmail: 'comercial3@wiseowe.com',
    marketingSenderEmail: 'comercial3@es.wiseowe.com',
    senderBrandName: 'Wiseowe Servicios Industriales',
  },
  {
    key: 'fatumata',
    ownerKey: 'fatumata',
    userId: '2a25dd76-8a1b-44ea-8ea9-47e9232beee2',
    email: 'fatumata@gestaologinpro.com',
    name: 'Fatumata',
    displayName: 'Fatumata',
    shortName: 'Fatumata',
    empresaId: 'dae64d51-2181-4510-b14f-e63d2f111a8e',
    empresaCode: 'WIS',
    empresaName: 'Wiseowe',
    country: 'FR',
    flag: '🇫🇷',
    language: 'fr',
    commercialEmail: 'comercial3@wiseowe.com',
    marketingSenderEmail: 'comercial3@fr.wiseowe.com',
    senderBrandName: 'Wiseowe Industrie',
  },
];

export function getCommercialProfileByUser(
  userOrIdOrEmail?: { id?: string; email?: string | null; display_name?: string | null } | string | null
): CommercialOperatorProfile | null {
  if (!userOrIdOrEmail) return null;
  if (typeof userOrIdOrEmail === 'string') {
    const val = userOrIdOrEmail.toLowerCase().trim();
    return (
      ACTIVE_COMMERCIAL_PROFILES.find(
        p =>
          p.userId.toLowerCase() === val ||
          p.email.toLowerCase() === val ||
          p.ownerKey === val ||
          p.shortName.toLowerCase() === val
      ) || null
    );
  }
  const uid = (userOrIdOrEmail.id || '').toLowerCase().trim();
  const uemail = (userOrIdOrEmail.email || '').toLowerCase().trim();
  const uname = (userOrIdOrEmail.display_name || '').toLowerCase().trim();
  return (
    ACTIVE_COMMERCIAL_PROFILES.find(
      p =>
        (uid && p.userId.toLowerCase() === uid) ||
        (uemail && p.email.toLowerCase() === uemail) ||
        (uname && (p.name.toLowerCase() === uname || p.shortName.toLowerCase() === uname))
    ) || null
  );
}

export interface Salesperson {
  id: string;
  email: string;
  display_name: string;
  role: string;
  department_id?: string | null;
  commercial_email?: string;
  marketing_sender_email?: string;
  commercial_name?: string;
  commercial_phone?: string;
  commercial_country?: string | null;
  commercial_empresa_id?: string | null;
  ownerKey?: CommercialOwnerKey;
  empresaName?: string;
  empresaCode?: string;
  flag?: string;
}

export function useSalespeople() {
  return useQuery({
    queryKey: ['salespeople_users', COMMERCIAL_DEPARTMENT_ID],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('mcs_users')
        .select(
          'id, email, display_name, role, department_id, commercial_email, marketing_sender_email, commercial_name, commercial_phone, commercial_country, commercial_empresa_id'
        )
        .eq('active', true)
        .eq('department_id', COMMERCIAL_DEPARTMENT_ID)
        .order('display_name', { ascending: true });

      if (error) throw error;

      const rows = (data || []) as Salesperson[];
      return rows.map(row => {
        const profile = getCommercialProfileByUser({ id: row.id, email: row.email, display_name: row.display_name });
        return {
          ...row,
          ownerKey: profile?.ownerKey,
          commercial_country: row.commercial_country || profile?.country || 'ES',
          commercial_empresa_id: row.commercial_empresa_id || profile?.empresaId || null,
          commercial_email: row.commercial_email || profile?.commercialEmail,
          marketing_sender_email: row.marketing_sender_email || profile?.marketingSenderEmail,
          empresaName: profile?.empresaName,
          empresaCode: profile?.empresaCode,
          flag: profile?.flag || (row.commercial_country === 'FR' ? '🇫🇷' : '🇪🇸'),
        };
      });
    },
    staleTime: 5 * 60 * 1000,
  });
}

const COMMERCIAL_FILTER_STORAGE_KEY = 'mcs_active_commercial_owner_filter';

export function useCommercialScope() {
  const { user } = useAuth();
  const { selectedEmpresaId, setSelectedEmpresaId } = useEmpresa();
  const { i18n } = useTranslation();

  const loggedCommercialProfile = useMemo(
    () => getCommercialProfileByUser(user),
    [user?.id, user?.email]
  );

  const isCommercialOperator = Boolean(loggedCommercialProfile);

  const defaultOwnerForEmpresa = useCallback(
    (empId: string | null, currentKey?: CommercialOwnerKey | 'all'): CommercialOwnerKey => {
      if (empId === '847796c4-b253-4e53-9e6b-34a127ec7d85') return 'alex';
      if (empId === 'a798620a-358a-4c6c-9db2-3a507c583cac') return 'alba';
      if (empId === 'dae64d51-2181-4510-b14f-e63d2f111a8e') {
        if (currentKey === 'liseth' || currentKey === 'fatumata') return currentKey;
        return i18n.language?.startsWith('fr') ? 'fatumata' : 'liseth';
      }
      return 'alex';
    },
    [i18n.language]
  );

  const [selectedOwnerKey, setSelectedOwnerKeyState] = useState<CommercialOwnerKey | 'all'>(() => {
    if (loggedCommercialProfile) return loggedCommercialProfile.ownerKey;
    const saved = localStorage.getItem(COMMERCIAL_FILTER_STORAGE_KEY) as CommercialOwnerKey | 'all' | null;
    if (saved && (saved === 'all' || ACTIVE_COMMERCIAL_PROFILES.some(p => p.ownerKey === saved))) {
      return saved;
    }
    return defaultOwnerForEmpresa(selectedEmpresaId);
  });

  // When a commercial operator logs in, lock their scope, company, and default language
  useEffect(() => {
    if (!loggedCommercialProfile) return;
    setSelectedOwnerKeyState(loggedCommercialProfile.ownerKey);
    if (selectedEmpresaId !== loggedCommercialProfile.empresaId) {
      setSelectedEmpresaId(loggedCommercialProfile.empresaId);
    }
    const langInitKey = `mcs_commercial_lang_init_${loggedCommercialProfile.userId}`;
    if (!sessionStorage.getItem(langInitKey)) {
      sessionStorage.setItem(langInitKey, '1');
      if (i18n.language !== loggedCommercialProfile.language) {
        i18n.changeLanguage(loggedCommercialProfile.language);
        localStorage.setItem('mcs_lang', loggedCommercialProfile.language);
      }
    }
  }, [loggedCommercialProfile, selectedEmpresaId, setSelectedEmpresaId, i18n]);

  // For Admin: when top bar selectedEmpresaId changes, sync commercial filter if current filter belongs to a different company
  useEffect(() => {
    if (loggedCommercialProfile || !selectedEmpresaId) return;
    if (selectedOwnerKey === 'all') return;
    const currentProfile = ACTIVE_COMMERCIAL_PROFILES.find(p => p.ownerKey === selectedOwnerKey);
    if (currentProfile && currentProfile.empresaId !== selectedEmpresaId) {
      const nextKey = defaultOwnerForEmpresa(selectedEmpresaId, selectedOwnerKey);
      setSelectedOwnerKeyState(nextKey);
      localStorage.setItem(COMMERCIAL_FILTER_STORAGE_KEY, nextKey);
    }
  }, [selectedEmpresaId, loggedCommercialProfile]);

  const setSelectedOwnerKey = useCallback(
    (nextKey: CommercialOwnerKey | 'all') => {
      if (loggedCommercialProfile) {
        setSelectedOwnerKeyState(loggedCommercialProfile.ownerKey);
        return;
      }
      setSelectedOwnerKeyState(nextKey);
      localStorage.setItem(COMMERCIAL_FILTER_STORAGE_KEY, nextKey);
      if (nextKey !== 'all') {
        const targetProfile = ACTIVE_COMMERCIAL_PROFILES.find(p => p.ownerKey === nextKey);
        if (targetProfile && selectedEmpresaId !== targetProfile.empresaId) {
          setSelectedEmpresaId(targetProfile.empresaId);
        }
      }
    },
    [loggedCommercialProfile, selectedEmpresaId, setSelectedEmpresaId]
  );

  const effectiveOwnerKey: CommercialOwnerKey | 'all' = loggedCommercialProfile
    ? loggedCommercialProfile.ownerKey
    : selectedOwnerKey;

  const activeCommercialProfile: CommercialOperatorProfile | null = useMemo(() => {
    if (loggedCommercialProfile) return loggedCommercialProfile;
    if (effectiveOwnerKey === 'all') return null;
    return ACTIVE_COMMERCIAL_PROFILES.find(p => p.ownerKey === effectiveOwnerKey) || null;
  }, [loggedCommercialProfile, effectiveOwnerKey]);

  return {
    isCommercialOperator,
    loggedCommercialProfile,
    activeCommercialProfile,
    activeProfile: activeCommercialProfile,
    effectiveOwnerKey,
    selectedCommercialKey: effectiveOwnerKey,
    setSelectedOwnerKey,
    setSelectedCommercialKey: setSelectedOwnerKey,
    profiles: ACTIVE_COMMERCIAL_PROFILES,
    allProfiles: ACTIVE_COMMERCIAL_PROFILES,
  };
}

export interface UseLeadsOptions {
  empresaId?: string | null;
  assignedTo?: string | null;
  global?: boolean;
  countryId?: string | null;
}

export function useLeads(options?: UseLeadsOptions) {
  const { selectedEmpresaId } = useEmpresa();
  const targetEmpresaId = options?.global ? null : (options?.empresaId !== undefined ? options.empresaId : selectedEmpresaId);
  const assignedTo = options?.assignedTo || null;
  const isGlobal = options?.global || false;
  const countryId = options?.countryId || null;

  return useQuery({
    queryKey: ['leads', isGlobal ? 'global' : targetEmpresaId, assignedTo, countryId],
    queryFn: async () => {
      if (!isGlobal && !targetEmpresaId) return [];

      let allLeads: Lead[] = [];
      let from = 0;
      let to = 999;
      let hasMore = true;

      while (hasMore) {
        let query = supabase
          .schema('core_comercial')
          .from('leads')
          .select('*')
          .order('id', { ascending: true });

        if (!isGlobal && targetEmpresaId) {
          query = query.eq('empresa_id', targetEmpresaId);
        }

        if (assignedTo && assignedTo !== 'all') {
          query = query.eq('assigned_to', assignedTo);
        }

        if (countryId && countryId !== 'all') {
          query = query.eq('country_id', countryId);
        }

        const { data, error } = await query.range(from, to);

        if (error) throw error;
        if (data && data.length > 0) {
          allLeads = [...allLeads, ...data];
          from += 1000;
          to += 1000;
          if (data.length < 1000) {
            hasMore = false;
          }
        } else {
          hasMore = false;
        }
      }
      return allLeads;
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });
}

export function useMutateLead() {
  const queryClient = useQueryClient();
  const { selectedEmpresaId } = useEmpresa();

  const createMutation = useMutation({
    mutationFn: async (payload: Omit<Lead, 'id' | 'empresa_id' | 'created_at' | 'updated_at'> & { empresa_id?: string }) => {
      const targetEmpresaId = payload.empresa_id || selectedEmpresaId;
      if (!targetEmpresaId) throw new Error('Empresa não selecionada');
      const { data, error } = await supabase
        .schema('core_comercial')
        .from('leads')
        .insert({
          ...payload,
          empresa_id: targetEmpresaId,
        })
        .select()
        .single();

      if (error) throw error;
      return data as Lead;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leads'] });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: Partial<Omit<Lead, 'id' | 'created_at' | 'updated_at'>> }) => {
      const { data, error } = await supabase
        .schema('core_comercial')
        .from('leads')
        .update({
          ...payload,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as Lead;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leads'] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .schema('core_comercial')
        .from('leads')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leads'] });
    },
  });

  const createLeadsBatch = async (leads: Omit<Lead, 'id' | 'created_at' | 'updated_at'>[]) => {
    const { data, error } = await supabase
      .schema('core_comercial')
      .from('leads')
      .insert(leads)
      .select();

    if (error) throw error;
    queryClient.invalidateQueries({ queryKey: ['leads'] });
    return data as Lead[];
  };

  return {
    createLead: createMutation.mutateAsync,
    updateLead: updateMutation.mutateAsync,
    deleteLead: deleteMutation.mutateAsync,
    createLeadsBatch,
    isPending: createMutation.isPending || updateMutation.isPending || deleteMutation.isPending,
  };
}
