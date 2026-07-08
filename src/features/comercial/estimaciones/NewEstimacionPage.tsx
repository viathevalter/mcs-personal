import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Save, Send, Loader2, Building2 } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
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

export function NewEstimacionPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { t } = useTranslation();
  const { selectedEmpresaId, empresas = [] } = useEmpresa();
  const { criarEstimacion, atualizarEstimacion } = useEstimacionMutations();
  
  const [currentStep, setCurrentStep] = useState(1);
  const [comercialSettings, setComercialSettings] = useState<any>(null);
  const [selectedClientData, setSelectedClientData] = useState<any>(null);
  
  // Mestre do Estado (Payload)
  const [payload, setPayload] = useState<any>({
    empresa_id: selectedEmpresaId,
    client_id: '',
    lead_id: '',
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

  // Carregar Configurações Comerciais
  useEffect(() => {
    async function fetchSettings() {
      if (!selectedEmpresaId) return;
      try {
        const { data, error } = await supabase
          .schema('core_comercial')
          .from('comercial_settings')
          .select('*')
          .eq('empresa_id', selectedEmpresaId)
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
  }, [selectedEmpresaId, id]);

  // Carregar dados do Cliente Selecionado
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

  // Carregar dados existentes em caso de edição
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
        if (!payload.postal_code) {
          toast.error(t('comercial.stepGeneral.validation.fillPostalCode'));
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
      empresa_id: selectedEmpresaId,
      status,
      client_id: payload.client_id || null,
      lead_id: payload.lead_id || null,
      client_site_id: payload.client_site_id || null,
      country_id: payload.country_id || null,
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
    <div className="flex flex-col space-y-3 p-4 pt-1 max-w-7xl mx-auto pb-36">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Button variant="ghost" size="icon" onClick={() => navigate(id ? `/comercial/estimaciones/${id}` : '/comercial/estimaciones')}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">
                {id ? t('comercial.detail.editEstimationTitle') : t('comercial.detail.newEstimationTitle')}
              </h1>
              <p className="text-sm text-muted-foreground">
                {id ? t('comercial.detail.editEstimationDesc', { code: estimacion?.codigo }) : t('comercial.detail.newEstimationDesc')}{' '}
                {t('comercial.detail.stepProgress', { currentStep })}
              </p>
            </div>
          </div>
          <div 
            className="flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-350 px-3 py-1.5 bg-slate-100 dark:bg-slate-800 rounded-md border border-slate-200 dark:border-slate-700 cursor-not-allowed" 
            title="A empresa está vinculada a esta estimativa."
          >
            <Building2 size={16} className="text-slate-500 shrink-0" />
            <span>
              {(() => {
                const emp = empresas.find(e => e.id === selectedEmpresaId);
                return emp?.trade_name || emp?.legal_name || emp?.nome || 'Empresa';
              })()}
            </span>
          </div>
        </div>

        {/* Progresso visual simples */}
        <div className="flex space-x-2 mb-2">
          {[1, 2, 3, 4].map(step => (
            <div 
              key={step} 
              className={`h-2 flex-1 rounded-full ${currentStep >= step ? 'bg-primary' : 'bg-slate-200 dark:bg-slate-800'}`}
            />
          ))}
        </div>

        <div className="bg-card rounded-md border p-4 min-h-[400px]">
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

        {/* Fixed Footer Actions */}
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-white/80 dark:bg-slate-950/80 backdrop-blur-md border-t border-slate-200 dark:border-slate-800 flex justify-between z-10 md:pl-64">
          <div className="max-w-7xl mx-auto w-full flex justify-between px-4">
            <Button variant="outline" onClick={handlePrev} disabled={currentStep === 1 || isMutationPending}>
              {t('comercial.detail.btnPrev')}
            </Button>

            <div className="flex space-x-3">
              {currentStep < 4 ? (
                <Button onClick={handleNext}>{t('comercial.detail.btnNext')}</Button>
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
                  
                  {(() => {
                    const viability = calculateViability(payload, selectedClientData, comercialSettings, t);
                    const needsApproval = (viability.status === 'warning' || viability.status === 'critical') && !payload.is_approved_by_manager;
                    if (needsApproval) {
                      return (
                        <Button 
                          className="bg-amber-600 hover:bg-amber-700 text-white"
                          onClick={() => handleSave('review')}
                          disabled={isMutationPending}
                        >
                          <Send className="mr-2 h-4 w-4" />
                          {t('comercial.detail.btnRequestApproval')}
                        </Button>
                      );
                    } else {
                      return (
                        <Button 
                          className="bg-blue-600 hover:bg-blue-700"
                          onClick={() => handleSave('sent')}
                          disabled={isMutationPending}
                        >
                          <Send className="mr-2 h-4 w-4" />
                          {t('comercial.detail.btnSaveSent')}
                        </Button>
                      );
                    }
                  })()}
                </>
              )}
            </div>
          </div>
        </div>
      </div>
  );
}

