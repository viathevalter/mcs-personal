import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Save, Send, Loader2 } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { useEmpresa } from '@/app/providers/EmpresaProvider';
import { useEstimacionMutations } from './hooks/useEstimacionMutations';
import { useEstimacionDetail } from './hooks/useEstimacionDetail';
import { EstimacionGeneralStep } from './components/EstimacionGeneralStep';
import { EstimacionItemsStep } from './components/EstimacionItemsStep';
import { EstimacionCostsStep } from './components/EstimacionCostsStep';
import { EstimacionReviewStep } from './components/EstimacionReviewStep';
import { EmpresaSelector } from '@/features/operacoes/components/EmpresaSelector';
import { supabase } from '@/shared/supabase/client';
import { calculateViability } from './utils/viabilityEngine';
import { useTranslation } from 'react-i18next';

export function NewEstimacionPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { t } = useTranslation();
  const { selectedEmpresaId } = useEmpresa();
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
    general_notes: '',
    status: 'draft',
    document_language: 'pt',
    items: [],
    costs: [],
    total_estimated_cost: 0,
    total_estimated_revenue: 0,
    estimated_margin_percent: 0,
    is_approved_by_manager: false,
  });

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
          });
        } else {
          setComercialSettings({
            min_margin_percent: 15.0,
            block_debtor_estimations: true,
            ivp_min_threshold: 5.0
          });
        }
      } catch (err) {
        console.error('Error fetching comercial settings:', err);
      }
    }
    fetchSettings();
  }, [selectedEmpresaId]);

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
      });
    }
  }, [estimacion]);

  const updatePayload = (data: Partial<any>) => {
    setPayload((prev: any) => ({ ...prev, ...data }));
  };

  const handleNext = () => setCurrentStep(prev => Math.min(prev + 1, 4));
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
          <div>
            <EmpresaSelector />
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
                    const viability = calculateViability(payload, selectedClientData, comercialSettings);
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

