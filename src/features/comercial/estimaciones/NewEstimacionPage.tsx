import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Save, Send } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useEmpresa } from '@/app/providers/EmpresaProvider';
import { useEstimacionMutations } from './hooks/useEstimacionMutations';
import { EstimacionGeneralStep } from './components/EstimacionGeneralStep';
import { EstimacionItemsStep } from './components/EstimacionItemsStep';
import { EstimacionCostsStep } from './components/EstimacionCostsStep';
import { EstimacionReviewStep } from './components/EstimacionReviewStep';
import { EmpresaSelector } from '@/features/operacoes/components/EmpresaSelector';

export function NewEstimacionPage() {
  const navigate = useNavigate();
  const { selectedEmpresaId } = useEmpresa();
  const { criarEstimacion } = useEstimacionMutations();
  
  const [currentStep, setCurrentStep] = useState(1);
  
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
    items: [],
    costs: [],
    total_estimated_cost: 0,
    total_estimated_revenue: 0,
    estimated_margin_percent: 0,
  });

  const updatePayload = (data: Partial<any>) => {
    setPayload((prev: any) => ({ ...prev, ...data }));
  };

  const handleNext = () => setCurrentStep(prev => Math.min(prev + 1, 4));
  const handlePrev = () => setCurrentStep(prev => Math.max(prev - 1, 1));

  const handleSave = (status: 'draft' | 'sent') => {
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
    };

    criarEstimacion.mutate(finalPayload, {
      onSuccess: (data: any) => {
        if (data?.estimacion_id) {
          navigate(`/comercial/estimaciones/${data.estimacion_id}`);
        } else {
          navigate('/comercial/estimaciones');
        }
      }
    });
  };

  return (
    <div className="flex flex-col space-y-6 p-4 max-w-5xl mx-auto pb-24">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Button variant="ghost" size="icon" onClick={() => navigate('/comercial/estimaciones')}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Nova Estimación</h1>
              <p className="text-muted-foreground">
                Criação de proposta comercial estruturada. Passo {currentStep} de 4.
              </p>
            </div>
          </div>
          <div>
            <EmpresaSelector />
          </div>
        </div>

        {/* Progresso visual simples */}
        <div className="flex space-x-2 mb-4">
          {[1, 2, 3, 4].map(step => (
            <div 
              key={step} 
              className={`h-2 flex-1 rounded-full ${currentStep >= step ? 'bg-primary' : 'bg-slate-200 dark:bg-slate-800'}`}
            />
          ))}
        </div>

        <div className="bg-card rounded-md border p-6 min-h-[500px]">
          {currentStep === 1 && <EstimacionGeneralStep data={payload} onChange={updatePayload} />}
          {currentStep === 2 && <EstimacionItemsStep data={payload} onChange={updatePayload} />}
          {currentStep === 3 && <EstimacionCostsStep data={payload} onChange={updatePayload} />}
          {currentStep === 4 && <EstimacionReviewStep data={payload} />}
        </div>

        {/* Fixed Footer Actions */}
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-white/80 dark:bg-slate-950/80 backdrop-blur-md border-t border-slate-200 dark:border-slate-800 flex justify-between z-10 md:pl-64">
          <div className="max-w-5xl mx-auto w-full flex justify-between px-4">
            <Button variant="outline" onClick={handlePrev} disabled={currentStep === 1 || criarEstimacion.isPending}>
              Voltar
            </Button>

            <div className="flex space-x-3">
              {currentStep < 4 ? (
                <Button onClick={handleNext}>Próximo Passo</Button>
              ) : (
                <>
                  <Button 
                    variant="outline" 
                    onClick={() => handleSave('draft')}
                    disabled={criarEstimacion.isPending}
                  >
                    <Save className="mr-2 h-4 w-4" />
                    Salvar Rascunho
                  </Button>
                  <Button 
                    className="bg-blue-600 hover:bg-blue-700"
                    onClick={() => handleSave('sent')}
                    disabled={criarEstimacion.isPending}
                  >
                    <Send className="mr-2 h-4 w-4" />
                    Salvar e Marcar como Enviada
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
  );
}
