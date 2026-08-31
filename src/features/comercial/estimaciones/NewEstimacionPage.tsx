import { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  ArrowLeft, 
  Save, 
  Send, 
  Loader2, 
  Building2,
  FileText,
  Pin,
  ChevronDown,
  ChevronUp,
  Sparkles,
  UserCheck,
  Building,
  Mail,
  Phone,
  Briefcase,
  Calendar,
  Users,
  MapPin,
  Clock
} from 'lucide-react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useEmpresa } from '@/app/providers/EmpresaProvider';
import { useEstimacionMutations } from './hooks/useEstimacionMutations';
import { useEstimacionDetail } from './hooks/useEstimacionDetail';
import { EstimacionGeneralStep } from './components/EstimacionGeneralStep';
import { EstimacionItemsStep } from './components/EstimacionItemsStep';
import { EstimacionCostsStep } from './components/EstimacionCostsStep';
import { EstimacionReviewStep } from './components/EstimacionReviewStep';
import { supabase } from '@/shared/supabase/client';
import { calculateViability } from './utils/viabilityEngine';
import { useTranslation } from 'react-i18next';
import { useClientSites } from '@/features/master-data/client-sites/hooks/useClientSites';
import { toast } from 'sonner';

// Helper to parse lead notes string into key-value budget request details
function parseBudgetNotes(notes?: string | null) {
  if (!notes) return null;
  const isBudgetForm = notes.includes('SOLICITAÇÃO DE ORÇAMENTO') || 
    notes.includes('SOLICITUD DE PRESUPUESTO') || 
    notes.includes('Orçamento') || 
    notes.includes('Presupuesto') || 
    notes.includes('PRESUPUESTO');
  
  const parsed: Record<string, string> = {};
  const lines = notes.split('\n');

  lines.forEach(line => {
    const trimmed = line.trim();
    if (trimmed.startsWith('•') || trimmed.startsWith('-')) {
      const parts = trimmed.substring(1).split(':');
      if (parts.length >= 2) {
        const key = parts[0].trim();
        const value = parts.slice(1).join(':').trim();
        parsed[key] = value;
      }
    }
  });

  return {
    isBudgetForm,
    raw: notes,
    parsed: Object.keys(parsed).length > 0 ? parsed : null
  };
}

export function NewEstimacionPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const urlLeadId = searchParams.get('lead_id');

  const { t } = useTranslation();
  const { selectedEmpresaId, empresas = [] } = useEmpresa();
  const { criarEstimacion, atualizarEstimacion } = useEstimacionMutations();
  
  const [currentStep, setCurrentStep] = useState(1);
  const [comercialSettings, setComercialSettings] = useState<any>(null);
  const [selectedClientData, setSelectedClientData] = useState<any>(null);

  // Lead Reference State (Post-It Widget)
  const [attachedLead, setAttachedLead] = useState<any>(null);
  const [isPostItMinimized, setIsPostItMinimized] = useState(false);
  
  // Master Payload State
  const [payload, setPayload] = useState<any>({
    empresa_id: selectedEmpresaId,
    client_id: '',
    lead_id: urlLeadId || '',
    client_site_id: '',
    country_id: '',
    postal_code: '',
    estimation_type: 'new_allocation',
    contact_name: '',
    contact_email: '',
    expected_start_date: '',
    expected_end_date: '',
    validity_date: '',
    payment_terms: '30 dias',
    payment_term_id: '',
    general_notes: '',
    status: 'draft',
    document_language: 'pt',
    items: [],
    costs: [],
    total_estimated_cost: 0,
    total_estimated_revenue: 0,
    estimated_margin_percent: 0,
    is_approved_by_manager: false,
    work_lunes: true,
    work_martes: true,
    work_miercoles: true,
    work_jueves: true,
    work_viernes: true,
    work_sabado: false,
    work_domingo: false,
    hours_weekday: 8.0,
    hours_lunes: 8.0,
    hours_martes: 8.0,
    hours_miercoles: 8.0,
    hours_jueves: 8.0,
    hours_viernes: 8.0,
    hours_sabado: 0.0,
    hours_domingo: 0.0,
    additional_revenues: [],
  });

  const { data: sites = [] } = useClientSites(payload.client_id || undefined);
  const { data: estimacion, isLoading } = useEstimacionDetail(id);

  // Fetch Attached Lead from URL search parameter
  useEffect(() => {
    async function fetchLeadContext() {
      const targetLeadId = payload.lead_id || urlLeadId;
      if (!targetLeadId) return;

      try {
        const { data, error } = await supabase
          .schema('core_comercial')
          .from('leads')
          .select('*')
          .eq('id', targetLeadId)
          .maybeSingle();

        if (error) throw error;
        if (data) {
          setAttachedLead(data);
          
          // Auto-prefill payload fields if creating a new estimation
          if (!id) {
            const budgetInfo = parseBudgetNotes(data.notes);
            const isEs = data.country_id === '2f487ab4-c7f5-4b70-9c37-995dc4cda125' || 
              (data.phone && (data.phone.startsWith('+34') || data.phone.startsWith('34'))) ||
              (data.email && data.email.endsWith('.es'));

            const addressVal = budgetInfo?.parsed?.['Dirección de la obra y Código Postal'] || 
              budgetInfo?.parsed?.['Endereço da obra e Código Postal'] || 
              data.address_line || 
              '';

            const startDateVal = budgetInfo?.parsed?.['Inicio del Proyecto'] || 
              budgetInfo?.parsed?.['Início do Projeto'] || 
              '';

            setPayload((prev: any) => ({
              ...prev,
              lead_id: data.id,
              empresa_id: prev.empresa_id || data.empresa_id || selectedEmpresaId,
              contact_name: data.name || prev.contact_name,
              contact_email: data.email || prev.contact_email,
              country_id: prev.country_id || data.country_id || (isEs ? '2f487ab4-c7f5-4b70-9c37-995dc4cda125' : ''),
              document_language: isEs ? 'es' : prev.document_language,
              postal_code: addressVal || prev.postal_code,
              expected_start_date: startDateVal || prev.expected_start_date,
              general_notes: data.notes ? `--- NOTAS DO LEAD (${data.company_name}) ---\n${data.notes}` : prev.general_notes
            }));
          }
        }
      } catch (err) {
        console.error('Error loading lead context:', err);
      }
    }
    fetchLeadContext();
  }, [urlLeadId, payload.lead_id, id, selectedEmpresaId]);

  // Load Comercial Settings
  useEffect(() => {
    async function fetchSettings() {
      const targetEmpresa = payload.empresa_id || selectedEmpresaId;
      if (!targetEmpresa) return;
      try {
        const { data, error } = await supabase
          .schema('core_comercial')
          .from('comercial_settings')
          .select('*')
          .eq('empresa_id', targetEmpresa)
          .maybeSingle();
        if (error) throw error;
        if (data) {
          setComercialSettings({
            id: data.id,
            min_margin_percent: Number(data.min_margin_percent),
            block_debtor_estimations: !!data.block_debtor_estimations,
            ivp_min_threshold: Number(data.ivp_min_threshold),
            default_hours_weekday: Number(data.default_hours_weekday ?? 8.0),
            default_hours_lunes: Number(data.default_hours_lunes ?? data.default_hours_weekday ?? 8.0),
            default_hours_martes: Number(data.default_hours_martes ?? data.default_hours_weekday ?? 8.0),
            default_hours_miercoles: Number(data.default_hours_miercoles ?? data.default_hours_weekday ?? 8.0),
            default_hours_jueves: Number(data.default_hours_jueves ?? data.default_hours_weekday ?? 8.0),
            default_hours_viernes: Number(data.default_hours_viernes ?? data.default_hours_weekday ?? 8.0),
            default_hours_sabado: Number(data.default_hours_sabado ?? 0.0),
            default_hours_domingo: Number(data.default_hours_domingo ?? 0.0),
            default_work_lunes: data.default_work_lunes !== false,
            default_work_martes: data.default_work_martes !== false,
            default_work_miercoles: data.default_work_miercoles !== false,
            default_work_jueves: data.default_work_jueves !== false,
            default_work_viernes: data.default_work_viernes !== false,
            default_work_sabado: !!data.default_work_sabado,
            default_work_domingo: !!data.default_work_domingo,
          });
          
          if (!id) {
            setPayload((prev: any) => ({
              ...prev,
              work_lunes: data.default_work_lunes !== false,
              work_martes: data.default_work_martes !== false,
              work_miercoles: data.default_work_miercoles !== false,
              work_jueves: data.default_work_jueves !== false,
              work_viernes: data.default_work_viernes !== false,
              work_sabado: !!data.default_work_sabado,
              work_domingo: !!data.default_work_domingo,
              hours_weekday: Number(data.default_hours_weekday ?? 8.0),
              hours_lunes: Number(data.default_hours_lunes ?? data.default_hours_weekday ?? 8.0),
              hours_martes: Number(data.default_hours_martes ?? data.default_hours_weekday ?? 8.0),
              hours_miercoles: Number(data.default_hours_miercoles ?? data.default_hours_weekday ?? 8.0),
              hours_jueves: Number(data.default_hours_jueves ?? data.default_hours_weekday ?? 8.0),
              hours_viernes: Number(data.default_hours_viernes ?? data.default_hours_weekday ?? 8.0),
              hours_sabado: Number(data.default_hours_sabado ?? 0.0),
              hours_domingo: Number(data.default_hours_domingo ?? 0.0),
            }));
          }
        } else {
          setComercialSettings({
            min_margin_percent: 15.0,
            block_debtor_estimations: true,
            ivp_min_threshold: 5.0,
            default_hours_weekday: 8.0,
            default_hours_sabado: 0.0,
            default_hours_domingo: 0.0,
            default_work_lunes: true,
            default_work_martes: true,
            default_work_miercoles: true,
            default_work_jueves: true,
            default_work_viernes: true,
            default_work_sabado: false,
            default_work_domingo: false,
          });
        }
      } catch (err) {
        console.error('Error fetching comercial settings:', err);
      }
    }
    fetchSettings();
  }, [payload.empresa_id, selectedEmpresaId, id]);

  // Load Client Data
  useEffect(() => {
    async function fetchClient() {
      if (!payload.client_id) {
        setSelectedClientData(null);
        return;
      }
      try {
        const { data, error } = await supabase
          .schema('core_common')
          .from('clients')
          .select('*')
          .eq('id', payload.client_id)
          .maybeSingle();
        if (error) throw error;
        setSelectedClientData(data);
      } catch (err) {
        console.error('Error fetching client data:', err);
      }
    }
    fetchClient();
  }, [payload.client_id]);

  // Load Existing Estimation in Edit Mode
  useEffect(() => {
    if (estimacion) {
      const mappedItems = estimacion.current_version?.items?.map((item: any) => ({
        id: item.id || crypto.randomUUID(),
        job_function_id: item.job_function_id,
        quantity: item.quantity,
        planned_hours_per_day: Number(item.planned_hours_per_day),
        planned_days_per_week: Number(item.planned_days_per_week),
        total_hours: Number(item.planned_total_hours),
        includes_accommodation: !!item.includes_housing,
        includes_transport: !!item.includes_transport,
        includes_ppe: !!item.includes_epi,
        base_cost_hour: Number(item.base_cost_hour),
        recommended_sell_rate: Number(item.recommended_sell_rate_hour),
        minimum_sell_rate: Number(item.minimum_sell_rate_hour),
        sell_rate_hour: Number(item.sell_rate_hour),
        margin_percent: Number(item.margin_percent),
        risk_level: item.risk_level_snapshot || 'medium',
        notes: item.description || '',
        ss_regime: item.ss_regime || 'local',
        custom_lodging_rate: item.custom_lodging_rate !== null && item.custom_lodging_rate !== undefined ? Number(item.custom_lodging_rate) : null,
        custom_epi_rate: item.custom_epi_rate !== null && item.custom_epi_rate !== undefined ? Number(item.custom_epi_rate) : null,
        custom_transport_rate: item.custom_transport_rate !== null && item.custom_transport_rate !== undefined ? Number(item.custom_transport_rate) : null,
      })) || [];

      const mappedCosts = estimacion.current_version?.costs?.map((cost: any) => ({
        id: cost.id || crypto.randomUUID(),
        cost_category: cost.cost_category,
        description: cost.description || '',
        amount: Number(cost.amount),
        is_rechargeable: !!cost.is_rechargeable,
        markup_percent: Number(cost.markup_percent),
        is_auto: !!cost.is_auto,
      })) || [];

      setPayload({
        empresa_id: estimacion.empresa_id,
        client_id: estimacion.client_id || '',
        lead_id: estimacion.lead_id || '',
        client_site_id: estimacion.client_site_id || '',
        country_id: estimacion.country_id || '',
        postal_code: estimacion.postal_code || '',
        estimation_type: estimacion.estimation_type || 'new_allocation',
        contact_name: estimacion.contact_name || '',
        contact_email: estimacion.contact_email || '',
        expected_start_date: estimacion.expected_start_date || '',
        expected_end_date: estimacion.expected_end_date || '',
        validity_date: estimacion.validity_date || '',
        payment_terms: estimacion.payment_terms || '30 dias',
        payment_term_id: estimacion.payment_term_id || '',
        general_notes: estimacion.general_notes || '',
        status: estimacion.status || 'draft',
        document_language: estimacion.document_language || 'pt',
        items: mappedItems,
        costs: mappedCosts,
        total_estimated_cost: Number(estimacion.current_version?.total_cost || 0),
        total_estimated_revenue: Number(estimacion.current_version?.total_revenue || 0),
        estimated_margin_percent: Number(estimacion.current_version?.margin_percent || 0),
        includes_zentralcom: mappedCosts.some(c => c.is_auto && c.cost_category === 'other' && c.description.toLowerCase().includes('zentralcom')),
        is_approved_by_manager: !!estimacion.is_approved_by_manager,
        work_lunes: estimacion.work_lunes !== false,
        work_martes: estimacion.work_martes !== false,
        work_miercoles: estimacion.work_miercoles !== false,
        work_jueves: estimacion.work_jueves !== false,
        work_viernes: estimacion.work_viernes !== false,
        work_sabado: !!estimacion.work_sabado,
        work_domingo: !!estimacion.work_domingo,
        hours_weekday: Number(estimacion.hours_weekday ?? 8.0),
        hours_lunes: Number(estimacion.hours_lunes ?? estimacion.hours_weekday ?? 8.0),
        hours_martes: Number(estimacion.hours_martes ?? estimacion.hours_weekday ?? 8.0),
        hours_miercoles: Number(estimacion.hours_miercoles ?? estimacion.hours_weekday ?? 8.0),
        hours_jueves: Number(estimacion.hours_jueves ?? estimacion.hours_weekday ?? 8.0),
        hours_viernes: Number(estimacion.hours_viernes ?? estimacion.hours_weekday ?? 8.0),
        hours_sabado: Number(estimacion.hours_sabado ?? 0.0),
        hours_domingo: Number(estimacion.hours_domingo ?? 0.0),
        additional_revenues: estimacion.additional_revenues || [],
      });
    }
  }, [estimacion]);

  const updatePayload = (data: Partial<any>) => {
    setPayload((prev: any) => ({ ...prev, ...data }));
  };

  const handleNext = () => {
    if (currentStep === 1) {
      if (payload.client_id) {
        if (!payload.country_id) {
          toast.error(t('comercial.stepGeneral.validation.selectCountry'));
          return;
        }
        if (sites.length > 1 && !payload.client_site_id) {
          toast.error(t('comercial.stepGeneral.validation.selectSiteMultiple'));
          return;
        }
      } else if (payload.lead_id) {
        if (!payload.country_id) {
          toast.error(t('comercial.stepGeneral.validation.selectCountry'));
          return;
        }
      } else {
        toast.error(t('comercial.stepGeneral.validation.selectTarget'));
        return;
      }

      if (!payload.expected_start_date) {
        toast.error(t('comercial.stepGeneral.validation.fillStartDate'));
        return;
      }
      if (!payload.expected_end_date) {
        toast.error(t('comercial.stepGeneral.validation.fillEndDate'));
        return;
      }
    }
    setCurrentStep(prev => Math.min(prev + 1, 4));
  };
  const handlePrev = () => setCurrentStep(prev => Math.max(prev - 1, 1));

  const handleSave = (status: 'draft' | 'review' | 'sent') => {
    const finalPayload = {
      ...payload,
      empresa_id: payload.empresa_id || selectedEmpresaId,
      status,
      client_id: payload.client_id || null,
      lead_id: payload.lead_id || null,
      client_site_id: payload.client_site_id || null,
      country_id: payload.country_id || null,
      payment_term_id: payload.payment_term_id || null,
      postal_code: payload.postal_code || null,
      expected_start_date: payload.expected_start_date || null,
      expected_end_date: payload.expected_end_date || null,
      validity_date: payload.validity_date || null,
      document_language: payload.document_language || 'pt',
      work_lunes: payload.work_lunes !== false,
      work_martes: payload.work_martes !== false,
      work_miercoles: payload.work_miercoles !== false,
      work_jueves: payload.work_jueves !== false,
      work_viernes: payload.work_viernes !== false,
      work_sabado: !!payload.work_sabado,
      work_domingo: !!payload.work_domingo,
      hours_weekday: Number(payload.hours_weekday ?? 8.0),
      hours_lunes: Number(payload.hours_lunes ?? payload.hours_weekday ?? 8.0),
      hours_martes: Number(payload.hours_martes ?? payload.hours_weekday ?? 8.0),
      hours_miercoles: Number(payload.hours_miercoles ?? payload.hours_weekday ?? 8.0),
      hours_jueves: Number(payload.hours_jueves ?? payload.hours_weekday ?? 8.0),
      hours_viernes: Number(payload.hours_viernes ?? payload.hours_weekday ?? 8.0),
      hours_sabado: Number(payload.hours_sabado ?? 0.0),
      hours_domingo: Number(payload.hours_domingo ?? 0.0),
      items: payload.items?.map((item: any) => ({
        ...item,
        job_function_id: item.job_function_id || null,
      })) || [],
      additional_revenues: payload.additional_revenues || [],
    };

    if (id) {
      atualizarEstimacion.mutate({ id, payload: finalPayload }, {
        onSuccess: () => {
          navigate(`/comercial/estimaciones/${id}`);
        }
      });
    } else {
      criarEstimacion.mutate(finalPayload, {
        onSuccess: (data: any) => {
          if (data?.estimacion_id) {
            navigate(`/comercial/estimaciones/${data.estimacion_id}`);
          } else {
            navigate('/comercial/estimaciones');
          }
        }
      });
    }
  };

  const isMutationPending = criarEstimacion.isPending || atualizarEstimacion.isPending;

  const parsedLeadBudget = useMemo(() => {
    return parseBudgetNotes(attachedLead?.notes);
  }, [attachedLead]);

  if (id && isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-[500px] space-y-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-muted-foreground text-sm">{t('comercial.detail.loading')}</p>
      </div>
    );
  }

  if (estimacion && estimacion.status !== 'draft') {
    return (
      <div className="flex flex-col items-center justify-center h-[500px] space-y-4 max-w-md mx-auto text-center p-4">
        <div className="h-12 w-12 rounded-full bg-red-100 dark:bg-red-950/20 text-red-650 flex items-center justify-center text-xl font-bold">!</div>
        <h2 className="text-xl font-bold text-slate-900 dark:text-white">{t('comercial.detail.accessDenied')}</h2>
        <p className="text-muted-foreground text-sm">{t('comercial.detail.accessDeniedDesc')}</p>
        <Button onClick={() => navigate(`/comercial/estimaciones/${id}`)}>
          {t('comercial.detail.accessDeniedBtn')}
        </Button>
      </div>
    );
  }

  return (
    <div className="relative flex flex-col space-y-3 p-4 pt-1 max-w-7xl mx-auto pb-36">
      {/* Sticky Post-It Lead Budget Reference Drawer / Floating Card */}
      {attachedLead && (
        <div className="fixed top-20 right-4 lg:right-8 z-40 w-80 sm:w-96 shadow-2xl rounded-2xl bg-amber-500/10 dark:bg-slate-900/95 backdrop-blur-md border-2 border-amber-500/40 text-slate-900 dark:text-slate-100 transition-all duration-300 overflow-hidden">
          {/* Post-It Header */}
          <div 
            onClick={() => setIsPostItMinimized(!isPostItMinimized)}
            className="flex items-center justify-between p-3 bg-amber-500 text-slate-950 font-bold cursor-pointer select-none"
          >
            <div className="flex items-center gap-2 text-xs uppercase tracking-wider">
              <Pin className="h-4 w-4" />
              <span>Lead: {attachedLead.company_name || attachedLead.name}</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="text-[10px] bg-slate-950/20 px-1.5 py-0.5 rounded font-mono">
                {isPostItMinimized ? 'Expandir' : 'Recolher'}
              </span>
              {isPostItMinimized ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
            </div>
          </div>

          {/* Post-It Content */}
          {!isPostItMinimized && (
            <div className="p-4 space-y-3 max-h-[450px] overflow-y-auto text-xs bg-amber-50/80 dark:bg-slate-900/90">
              <div className="grid grid-cols-2 gap-2 border-b border-amber-500/20 pb-2">
                <div>
                  <span className="text-slate-500 dark:text-slate-400 block text-[10px]">Contato</span>
                  <span className="font-semibold">{attachedLead.name}</span>
                </div>
                <div>
                  <span className="text-slate-500 dark:text-slate-400 block text-[10px]">E-mail</span>
                  <span className="font-semibold truncate block">{attachedLead.email || 'N/A'}</span>
                </div>
              </div>

              {parsedLeadBudget?.parsed ? (
                <div className="space-y-2">
                  <span className="font-bold uppercase tracking-wider text-[10px] text-amber-700 dark:text-amber-400 block">
                    Solicitação de Orçamento
                  </span>
                  
                  {Object.entries(parsedLeadBudget.parsed).map(([key, val]) => (
                    <div key={key} className="bg-white/80 dark:bg-slate-950/60 border border-amber-500/20 p-2 rounded-lg space-y-0.5">
                      <span className="font-bold text-amber-800 dark:text-amber-300 block text-[10px] uppercase">
                        {key}
                      </span>
                      <p className="font-medium text-slate-800 dark:text-slate-200">
                        {val}
                      </p>
                    </div>
                  ))}
                </div>
              ) : attachedLead.notes ? (
                <div className="space-y-1">
                  <span className="font-bold text-amber-700 dark:text-amber-400 block text-[10px] uppercase">Notas</span>
                  <p className="whitespace-pre-wrap bg-white/80 dark:bg-slate-950 p-2 rounded border border-amber-500/20 text-slate-700 dark:text-slate-300">
                    {attachedLead.notes}
                  </p>
                </div>
              ) : null}
            </div>
          )}
        </div>
      )}

      {/* Main Form Navigation & Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="flex items-center space-x-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(id ? `/comercial/estimaciones/${id}` : '/comercial/estimaciones')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
              {id ? t('comercial.detail.editEstimationTitle') : t('comercial.detail.newEstimationTitle')}
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              {id ? t('comercial.detail.editEstimationDesc', { code: estimacion?.codigo }) : t('comercial.detail.newEstimationDesc')}{' '}
              {t('comercial.detail.stepProgress', { currentStep })}
            </p>
          </div>
        </div>

        {/* Empresa do Grupo Selector */}
        <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-950 p-2 rounded-xl border border-slate-200 dark:border-slate-800">
          <Building2 size={16} className="text-amber-500 shrink-0" />
          <div className="space-y-0.5">
            <span className="text-[10px] font-bold uppercase text-slate-400 block">Empresa Emissora</span>
            <Select
              value={payload.empresa_id || selectedEmpresaId}
              onValueChange={(val) => updatePayload({ empresa_id: val })}
            >
              <SelectTrigger className="w-[180px] h-8 text-xs bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 font-semibold">
                <SelectValue placeholder="Selecione a empresa" />
              </SelectTrigger>
              <SelectContent>
                {empresas.map(e => (
                  <SelectItem key={e.id} value={e.id} className="text-xs">
                    {e.trade_name || e.legal_name || e.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Step Progress Bar */}
      <div className="flex space-x-2 mb-2">
        {[1, 2, 3, 4].map(step => (
          <div 
            key={step} 
            className={`h-2 flex-1 rounded-full transition-all duration-300 ${currentStep >= step ? 'bg-amber-500' : 'bg-slate-200 dark:bg-slate-800'}`}
          />
        ))}
      </div>

      {/* Step Content Container */}
      <div className="bg-card rounded-2xl border border-slate-200 dark:border-slate-800 p-6 min-h-[420px] shadow-sm">
        {currentStep === 1 && <EstimacionGeneralStep data={payload} onChange={updatePayload} />}
        {currentStep === 2 && <EstimacionItemsStep data={payload} onChange={updatePayload} />}
        {currentStep === 3 && <EstimacionCostsStep data={payload} onChange={updatePayload} />}
        {currentStep === 4 && (
          <EstimacionReviewStep 
            data={payload} 
            client={selectedClientData} 
            settings={comercialSettings} 
          />
        )}
      </div>

      {/* Fixed Footer Actions Bar */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-white/90 dark:bg-slate-950/90 backdrop-blur-md border-t border-slate-200 dark:border-slate-800 flex justify-between z-30 md:pl-64">
        <div className="max-w-7xl mx-auto w-full flex justify-between px-4">
          <Button variant="outline" onClick={handlePrev} disabled={currentStep === 1 || isMutationPending}>
            {t('comercial.detail.btnPrev')}
          </Button>

          <div className="flex space-x-3">
            {currentStep < 4 ? (
              <Button onClick={handleNext} className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold px-6">
                {t('comercial.detail.btnNext')}
              </Button>
            ) : (
              <>
                <Button 
                  variant="outline" 
                  onClick={() => handleSave('draft')}
                  disabled={isMutationPending}
                >
                  <Save className="mr-2 h-4 w-4" />
                  {t('comercial.detail.btnSaveDraft')}
                </Button>
                <Button 
                  onClick={() => handleSave('sent')}
                  disabled={isMutationPending}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
                >
                  <Send className="mr-2 h-4 w-4" />
                  Salvar e Finalizar
                </Button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
