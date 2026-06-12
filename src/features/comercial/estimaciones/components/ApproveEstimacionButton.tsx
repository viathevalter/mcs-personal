import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { 
  CheckCircle2, 
  PlayCircle, 
  Loader2, 
  ArrowLeft, 
  ArrowRight, 
  Check, 
  AlertCircle,
  Bold,
  Italic,
  Underline,
  List,
  ListOrdered,
  Link,
  MessageSquare,
  Send,
  X
} from 'lucide-react';
import { useEstimacionMutations } from '../hooks/useEstimacionMutations';
import { jobFunctionQuestionsApi } from '@/features/master-data/job-functions/api/jobFunctionQuestionsApi';
import type { Estimacion } from '../types';
import { supabase } from '@/shared/supabase/client';
import { toast } from 'sonner';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface Props {
  estimacion: Estimacion;
}

interface QuestionWithJobFunction {
  jobFunctionId: string;
  jobFunctionName: string;
  questionId: string;
  questionText: string;
  questionType: 'short_text' | 'long_text' | 'boolean' | 'number' | 'single_choice' | 'multi_choice' | 'date';
  required: boolean;
  options?: string[] | null;
}

export function ApproveEstimacionButton({ estimacion }: Props) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(1);
  const { aprovarEstimacion } = useEstimacionMutations();

  // Wizard state data
  const [items, setItems] = useState<any[]>([]);
  const [epis, setEpis] = useState<any[]>([]);
  const [loadingData, setLoadingData] = useState(false);
  
  // Step 1: Questions
  const [questions, setQuestions] = useState<QuestionWithJobFunction[]>([]);
  const [answers, setAnswers] = useState<Record<string, string>>({});

  // Step 2: Emails & Body
  const [notificationEmails, setNotificationEmails] = useState<{ id: string; email: string }[]>([]);
  const [selectedEmails, setSelectedEmails] = useState<string[]>([]);
  const [additionalEmails, setAdditionalEmails] = useState('');
  const [emailSubject, setEmailSubject] = useState('');
  const [emailBody, setEmailBody] = useState('');
  const [loadingEmails, setLoadingEmails] = useState(false);
  const [sendEmailCheckbox, setSendEmailCheckbox] = useState(true);
  const [empresaName, setEmpresaName] = useState('MasterCorp');

  // Loading for final action
  const [isSubmitting, setIsSubmitting] = useState(false);



  // Load items, questions, epis, and emails on open
  useEffect(() => {
    if (!open) return;

    async function loadWizardData() {
      try {
        setLoadingData(true);
        setStep(1);

        // 1. Fetch current version items
        const { data: itemsData, error: itemsErr } = await supabase
          .schema('core_comercial')
          .from('estimacion_items')
          .select('*, job_function:job_functions(*)')
          .eq('estimacion_version_id', estimacion.current_version_id);
        
        if (itemsErr) throw itemsErr;
        setItems(itemsData || []);

        if (itemsData && itemsData.length > 0) {
          const jfIds = itemsData.map(i => i.job_function_id);

          // 2. Fetch default EPIs for these job functions
          const { data: episData } = await supabase
            .schema('core_comercial')
            .from('job_function_epis')
            .select('*, epi:epis(*)')
            .in('job_function_id', jfIds);
          setEpis(episData || []);

          // 3. Fetch questions
          const allQuestions: QuestionWithJobFunction[] = [];
          for (const item of itemsData) {
            const jfQuestions = await jobFunctionQuestionsApi.getQuestions(item.job_function_id);
            const jfName = item.job_function?.name || item.job_function?.title || 'Perfil';
            
            jfQuestions.forEach(q => {
              if (!allQuestions.some(existing => existing.questionId === q.id)) {
                allQuestions.push({
                  jobFunctionId: item.job_function_id,
                  jobFunctionName: jfName,
                  questionId: q.id!,
                  questionText: q.question_text,
                  questionType: q.question_type as any || 'short_text',
                  required: !!q.is_required,
                  options: q.options || [],
                });
              }
            });
          }
          setQuestions(allQuestions);

          // Pre-fill answers
          const initialAnswers: Record<string, string> = {};
          allQuestions.forEach(q => {
            initialAnswers[q.questionId] = q.questionType === 'boolean' ? 'No' : '';
          });
          setAnswers(initialAnswers);
        }

        // 4. Fetch notification emails
        setLoadingEmails(true);
        const { data: emailsData, error: emailsErr } = await supabase
          .schema('core_comercial')
          .from('notification_emails')
          .select('*')
          .eq('empresa_id', estimacion.empresa_id)
          .eq('event_type', 'pedido');
        
        if (emailsErr) throw emailsErr;
        const emailsList = emailsData || [];
        setNotificationEmails(emailsList);
        setSelectedEmails(emailsList.map(e => e.email));

        // Fetch company name
        const { data: empresaData } = await supabase
          .schema('core_common')
          .from('empresas')
          .select('trade_name, legal_name')
          .eq('id', estimacion.empresa_id)
          .single();
        if (empresaData) {
          setEmpresaName(empresaData.trade_name || empresaData.legal_name || 'MasterCorp');
        }

      } catch (err: any) {
        console.error('Error loading wizard data:', err);
        toast.error('Erro ao carregar dados do formulário', { description: err.message });
      } finally {
        setLoadingData(false);
        setLoadingEmails(false);
      }
    }

    loadWizardData();
  }, [open, estimacion.id, estimacion.current_version_id, estimacion.empresa_id]);

  // Set default email template once items are loaded
  useEffect(() => {
    if (items.length > 0) {
      const clientName = estimacion.client?.trade_name || estimacion.client?.legal_name || 'Cliente';
      setEmailSubject(`Novo Pedido Gerado - ${estimacion.codigo} - ${clientName}`);
      
      const profilesList = items.map(item => {
        const name = item.job_function?.name || item.job_function?.title || 'Perfil';
        return `<li>${name}: ${item.quantity} vaga(s)</li>`;
      }).join('');

      const bodyHtml = `
<p>Olá Equipe,</p>
<p>Um novo pedido de venda foi gerado com sucesso a partir da estimativa <strong>${estimacion.codigo}</strong>.</p>
<p><strong>Resumo do Pedido:</strong></p>
<ul>
  <li><strong>Cliente:</strong> ${clientName}</li>
  <li><strong>Obra/Localização:</strong> ${estimacion.client_site?.address_line || 'Não definido'}</li>
  <li><strong>Data de Início Prevista:</strong> ${estimacion.expected_start_date ? new Date(estimacion.expected_start_date).toLocaleDateString('pt-PT') : 'Não definida'}</li>
  <li><strong>Data de Fim Prevista:</strong> ${estimacion.expected_end_date ? new Date(estimacion.expected_end_date).toLocaleDateString('pt-PT') : 'Não definida'}</li>
</ul>
<p><strong>Cargos/Funções Solicitados:</strong></p>
<ul>
  ${profilesList}
</ul>
<p>Os documentos de Proposta e Contrato originais assinados pelo cliente foram anexados a esta notificação.</p>
<p>Por favor, iniciem os trâmites de mobilização, contratação e logística necessários.</p>
<p>Atenciosamente,<br/><strong>Comercial</strong></p>
      `;
      setEmailBody(bodyHtml.trim());
    }
  }, [items, estimacion]);

  // Calculate duration string
  const getDurationString = () => {
    if (!estimacion.expected_start_date || !estimacion.expected_end_date) return 'Não definida';
    const start = new Date(estimacion.expected_start_date);
    const end = new Date(estimacion.expected_end_date);
    const diffTime = Math.abs(end.getTime() - start.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    const months = Math.floor(diffDays / 30);
    const remainingDays = diffDays % 30;
    
    if (months > 0) {
      return `${months} ${months === 1 ? 'mês' : 'meses'}${remainingDays > 0 ? ` e ${remainingDays} dias` : ''}`;
    }
    return `${diffDays} dias`;
  };

  const editorRef = useRef<HTMLDivElement>(null);

  const handleFormat = (command: string, value: string = '') => {
    document.execCommand(command, false, value);
    if (editorRef.current) {
      setEmailBody(editorRef.current.innerHTML);
    }
  };

  const handleInsertLink = () => {
    const url = prompt('Digite a URL:');
    if (url) {
      handleFormat('createLink', url);
    }
  };

  const handleToggleMultiChoice = (questionId: string, option: string, checked: boolean) => {
    setAnswers(prev => {
      const currentVal = prev[questionId] || '';
      const currentList = currentVal ? currentVal.split(',').map(s => s.trim()) : [];
      let newList: string[];
      if (checked) {
        newList = [...currentList, option];
      } else {
        newList = currentList.filter(item => item !== option);
      }
      return {
        ...prev,
        [questionId]: newList.join(', '),
      };
    });
  };

  // Validate technical questions answers
  const validateStep1 = () => {
    for (const q of questions) {
      if (q.required && (!answers[q.questionId] || answers[q.questionId].trim() === '')) {
        toast.error(`A pergunta "${q.questionText}" é obrigatória.`);
        return false;
      }
    }
    return true;
  };

  // Handle final approval and notification email send
  const handleApprove = async () => {
    const toEmails: string[] = [...selectedEmails];
    
    // Add additional comma-separated emails
    if (additionalEmails.trim() !== '') {
      const extra = additionalEmails.split(',').map(e => e.trim()).filter(e => e !== '');
      // Validate additional emails
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      for (const email of extra) {
        if (!emailRegex.test(email)) {
          toast.error(`O e-mail adicional "${email}" é inválido.`);
          return;
        }
        if (!toEmails.includes(email)) {
          toEmails.push(email);
        }
      }
    }

    if (sendEmailCheckbox && toEmails.length === 0) {
      toast.error('Selecione pelo menos um destinatário para enviar a notificação.');
      return;
    }

    try {
      setIsSubmitting(true);

      // 1. Convert technical questions answers to JSONB
      // Format: { questionId: { questionText, answer } }
      const perguntaRespuesta: Record<string, any> = {};
      questions.forEach(q => {
        perguntaRespuesta[q.questionId] = {
          pergunta: q.questionText,
          cargo: q.jobFunctionName,
          resposta: answers[q.questionId],
        };
      });

      // 2. Run aprovar_estimacion RPC
      const approvedResult = await aprovarEstimacion.mutateAsync(estimacion.id);
      
      const pedidoId = approvedResult?.pedido_id;
      if (!pedidoId) {
        throw new Error('Falha ao obter ID do Pedido gerado.');
      }

      // 3. Save questions and answers on the newly created order
      const { error: updateErr } = await supabase
        .schema('core_comercial')
        .from('pedidos')
        .update({ pergunta_respuesta: perguntaRespuesta })
        .eq('id', pedidoId);

      if (updateErr) throw updateErr;

      // 4. Send notification email via Edge Function if checked
      if (sendEmailCheckbox) {
        const { error: functionErr } = await supabase.functions.invoke('send-order-notification', {
          body: {
            pedido_id: pedidoId,
            to_emails: toEmails,
            email_subject: emailSubject,
            email_body: emailBody,
          },
        });

        if (functionErr) {
          console.error('Error invoking send-order-notification Edge function:', functionErr);
          toast.warning('Pedido aprovado, mas falhou ao enviar o e-mail de notificação.', {
            description: functionErr.message
          });
        } else {
          toast.success('Pedido aprovado e e-mail de notificação enviado com sucesso!');
        }
      } else {
        toast.success('Pedido aprovado com sucesso (e-mail de notificação não solicitado).');
      }

      setOpen(false);
    } catch (err: any) {
      console.error('Error in approval wizard:', err);
      toast.error('Erro ao aprovar estimación', { description: err.message });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleNext = () => {
    if (step === 1) {
      if (validateStep1()) {
        setStep(2);
      }
    }
  };

  const handleBack = () => {
    if (step > 1) {
      setStep(step - 1);
    }
  };

  // Only signed proposals can be approved
  if (estimacion.status !== 'signed') {
    return null;
  }

  return (
    <>
      <Button 
        className="bg-emerald-600 hover:bg-emerald-700 text-white font-medium shadow-sm transition-all active:scale-[0.98]"
        onClick={() => setOpen(true)}
      >
        <PlayCircle className="mr-2 h-4 w-4" />
        Aprovar e Gerar Pedido
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className={`${step === 2 ? 'max-w-6xl w-[95vw]' : 'max-w-2xl'} max-h-[90vh] flex flex-col p-0 overflow-hidden rounded-xl border border-slate-200`}>
          
          {/* Header */}
          <div className="flex justify-between items-center bg-blue-600 dark:bg-indigo-950 text-white px-6 py-4">
            <div>
              <DialogTitle className="text-lg font-bold flex items-center">
                <MessageSquare className="mr-2 h-5 w-5" />
                {step === 1 ? 'Perguntas Técnicas por Função' : '¿Enviar correo electrónico?'}
              </DialogTitle>
              <DialogDescription className="text-slate-100/90 text-xs mt-0.5">
                Estimativa {estimacion.codigo} | Passo {step} de 2
              </DialogDescription>
            </div>
            <button onClick={() => setOpen(false)} className="text-white/80 hover:text-white transition-colors">
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Loader */}
          {loadingData ? (
            <div className="flex flex-col items-center justify-center py-20 space-y-4 flex-1">
              <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
              <p className="text-sm text-muted-foreground">Carregando dados da estimativa...</p>
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto min-h-0">
              
              {/* STEP 1: TECHNICAL QUESTIONS */}
              {step === 1 && (
                <div className="p-6 space-y-6">
                  <div className="bg-slate-50 dark:bg-slate-900/60 p-4 rounded-xl border text-sm text-slate-600 dark:text-slate-400">
                    <p className="font-semibold text-slate-800 dark:text-slate-200">Mobilização de Vagas</p>
                    <p className="mt-1 text-xs">Responda às questões técnicas abaixo para orientar a equipa de RH e Recrutamento na contratação dos perfis adequados.</p>
                  </div>

                  {questions.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 text-center">
                      <CheckCircle2 className="h-12 w-12 text-slate-300 dark:text-slate-700 mb-3" />
                      <p className="text-sm font-semibold">Nenhuma Pergunta Técnica</p>
                      <p className="text-xs text-muted-foreground mt-1 max-w-sm">Não há perguntas técnicas cadastradas para as funções deste orçamento. Clique em "Próximo" para avançar.</p>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      {/* Group questions by function */}
                      {Array.from(new Set(questions.map(q => q.jobFunctionId))).map(jfId => {
                        const jfQuestions = questions.filter(q => q.jobFunctionId === jfId);
                        const jfName = jfQuestions[0]?.jobFunctionName;

                        return (
                          <div key={jfId} className="border border-slate-100 dark:border-slate-800 rounded-xl p-5 space-y-4 bg-slate-50/20 dark:bg-slate-950/10">
                            <h3 className="font-bold text-sm text-slate-800 dark:text-slate-200 border-b pb-2 flex items-center">
                              <span className="w-2.5 h-2.5 rounded-full bg-indigo-500 mr-2"></span>
                              Cargo: {jfName}
                            </h3>
                            <div className="space-y-4">
                              {jfQuestions.map(q => (
                                <div key={q.questionId} className="space-y-2">
                                  <Label htmlFor={`q-${q.questionId}`} className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center">
                                    {q.questionText}
                                    {q.required && <span className="text-red-500 ml-1 font-bold">*</span>}
                                  </Label>

                                  {q.questionType === 'boolean' ? (
                                    <select
                                      id={`q-${q.questionId}`}
                                      value={answers[q.questionId] || ''}
                                      className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                                      onChange={e => setAnswers(prev => ({ ...prev, [q.questionId]: e.target.value }))}
                                    >
                                      <option value="Si">Sim / Sí</option>
                                      <option value="No">Não / No</option>
                                    </select>
                                  ) : q.questionType === 'long_text' ? (
                                    <Textarea
                                      id={`q-${q.questionId}`}
                                      placeholder="Escreva sua resposta detalhada..."
                                      value={answers[q.questionId] || ''}
                                      onChange={e => setAnswers(prev => ({ ...prev, [q.questionId]: e.target.value }))}
                                      className="min-h-[60px] text-sm"
                                    />
                                  ) : q.questionType === 'date' ? (
                                    <Input
                                      id={`q-${q.questionId}`}
                                      type="date"
                                      value={answers[q.questionId] || ''}
                                      onChange={e => setAnswers(prev => ({ ...prev, [q.questionId]: e.target.value }))}
                                    />
                                  ) : q.questionType === 'number' ? (
                                    <Input
                                      id={`q-${q.questionId}`}
                                      type="number"
                                      value={answers[q.questionId] || ''}
                                      onChange={e => setAnswers(prev => ({ ...prev, [q.questionId]: e.target.value }))}
                                    />
                                  ) : q.questionType === 'single_choice' ? (
                                    <select
                                      id={`q-${q.questionId}`}
                                      value={answers[q.questionId] || ''}
                                      className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                                      onChange={e => setAnswers(prev => ({ ...prev, [q.questionId]: e.target.value }))}
                                    >
                                      <option value="" disabled>Selecione uma opção...</option>
                                      {(q.options || []).map((opt, idx) => (
                                        <option key={idx} value={opt}>{opt}</option>
                                      ))}
                                    </select>
                                  ) : q.questionType === 'multi_choice' ? (
                                    <div className="space-y-2 border rounded-md p-3 bg-white dark:bg-slate-950">
                                      {(q.options || []).map((opt, idx) => {
                                        const currentVal = answers[q.questionId] || '';
                                        const currentList = currentVal ? currentVal.split(',').map(s => s.trim()) : [];
                                        const isChecked = currentList.includes(opt);
                                        return (
                                          <div key={idx} className="flex items-center space-x-2">
                                            <input
                                              type="checkbox"
                                              id={`q-${q.questionId}-opt-${idx}`}
                                              checked={isChecked}
                                              onChange={e => handleToggleMultiChoice(q.questionId, opt, e.target.checked)}
                                              className="h-4 w-4 rounded border border-slate-350 text-indigo-650 focus:ring-indigo-500 cursor-pointer"
                                            />
                                            <label
                                              htmlFor={`q-${q.questionId}-opt-${idx}`}
                                              className="text-sm font-medium leading-none cursor-pointer"
                                            >
                                              {opt}
                                            </label>
                                          </div>
                                        );
                                      })}
                                    </div>
                                  ) : (
                                    <Input
                                      id={`q-${q.questionId}`}
                                      type="text"
                                      placeholder="Escreva a resposta..."
                                      value={answers[q.questionId] || ''}
                                      onChange={e => setAnswers(prev => ({ ...prev, [q.questionId]: e.target.value }))}
                                    />
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* STEP 2: SUMMARY PREVIEW & EMAIL COMPOSITION */}
              {step === 2 && (
                <div className="flex flex-col lg:flex-row h-full min-h-[500px]">
                  
                  {/* Left Column: Order Summary (Preview) */}
                  <div className="w-full lg:w-1/2 bg-slate-50 dark:bg-slate-900/40 p-6 border-r border-slate-200 dark:border-slate-800 overflow-y-auto max-h-[65vh]">
                    <div className="border border-indigo-200 dark:border-indigo-900 bg-white dark:bg-slate-950 rounded-xl shadow-sm overflow-hidden">
                      {/* Summary Header */}
                      <div className="bg-indigo-600 text-white px-5 py-3 flex justify-between items-center font-bold text-sm">
                        <span>RESUMO DO PEDIDO</span>
                        <span>Pedido Nº: {estimacion.codigo}</span>
                      </div>

                      {/* Summary Content */}
                      <div className="p-5 space-y-6 text-xs text-slate-700 dark:text-slate-350">
                        {/* Datos Generales */}
                        <div className="space-y-3">
                          <h4 className="font-bold text-indigo-600 dark:text-indigo-400 border-b pb-1 text-[11px] uppercase tracking-wider">Dados Gerais</h4>
                          <div className="grid grid-cols-2 gap-y-2 gap-x-4">
                            <div>
                              <span className="font-semibold text-slate-500">Cliente:</span>
                              <p className="font-medium text-slate-800 dark:text-slate-100">{estimacion.client?.trade_name || estimacion.client?.legal_name || 'N/A'}</p>
                            </div>
                            <div>
                              <span className="font-semibold text-slate-500">Empresa:</span>
                              <p className="font-medium text-slate-800 dark:text-slate-100 font-sans">{empresaName}</p>
                            </div>
                            <div className="col-span-2">
                              <span className="font-semibold text-slate-500">Ubicación del Trabajo:</span>
                              <p className="font-medium text-slate-800 dark:text-slate-100">
                                {estimacion.client_site?.address_line ? (
                                  <>
                                    {estimacion.client_site.address_line}
                                    {estimacion.client_site.city && `, ${estimacion.client_site.city}`}
                                    {estimacion.client_site.postal_code && `, ${estimacion.client_site.postal_code}`}
                                  </>
                                ) : 'Não definida'}
                              </p>
                            </div>
                            <div>
                              <span className="font-semibold text-slate-500">Fecha Inicio:</span>
                              <p className="font-medium text-slate-850 dark:text-slate-100">
                                {estimacion.expected_start_date ? new Date(estimacion.expected_start_date).toLocaleDateString('pt-PT') : 'N/A'}
                              </p>
                            </div>
                            <div>
                              <span className="font-semibold text-slate-500">Fecha Fin:</span>
                              <p className="font-medium text-slate-850 dark:text-slate-100">
                                {estimacion.expected_end_date ? new Date(estimacion.expected_end_date).toLocaleDateString('pt-PT') : 'N/A'}
                              </p>
                            </div>
                            <div className="col-span-2">
                              <span className="font-semibold text-slate-500">Duración:</span>
                              <p className="font-medium text-slate-850 dark:text-slate-100">{getDurationString()}</p>
                            </div>
                          </div>
                        </div>

                        {/* Solicitud de Trabalhadores */}
                        <div className="space-y-2">
                          <h4 className="font-bold text-indigo-600 dark:text-indigo-400 border-b pb-1 text-[11px] uppercase tracking-wider">Solicitud de Trabajadores</h4>
                          <div className="border rounded-lg overflow-hidden">
                            <table className="w-full text-left border-collapse">
                              <thead>
                                <tr className="bg-slate-50 dark:bg-slate-900 text-[10px] font-bold text-slate-500 uppercase border-b">
                                  <th className="p-2">Perfil</th>
                                  <th className="p-2 text-right">Qtd.</th>
                                </tr>
                              </thead>
                              <tbody>
                                {items.map((item, index) => (
                                  <tr key={index} className="border-b last:border-0 hover:bg-slate-50/50">
                                    <td className="p-2 font-medium">{item.job_function?.name || item.job_function?.title || 'Perfil'}</td>
                                    <td className="p-2 text-right font-bold">{item.quantity}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>

                        {/* EPIs Info */}
                        <div className="space-y-2">
                          <h4 className="font-bold text-indigo-600 dark:text-indigo-400 border-b pb-1 text-[11px] uppercase tracking-wider">Información de los EPI'S</h4>
                          {epis.length === 0 ? (
                            <p className="text-muted-foreground italic text-[11px]">Nenhum EPI padrão associado.</p>
                          ) : (
                            <div className="border rounded-lg overflow-hidden">
                              <table className="w-full text-left border-collapse">
                                <thead>
                                  <tr className="bg-slate-50 dark:bg-slate-900 text-[10px] font-bold text-slate-500 uppercase border-b">
                                    <th className="p-2">EPI</th>
                                    <th className="p-2 text-right">Qtd.</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {/* Group and accumulate EPIs based on quantities */}
                                  {Array.from(new Set(epis.map(e => e.epi_id))).map((epiId, idx) => {
                                    const matchingEpis = epis.filter(e => e.epi_id === epiId);
                                    const name = matchingEpis[0]?.epi?.name || 'EPI';
                                    
                                    // Sum quantities multiplied by workers quantity
                                    let totalQtd = 0;
                                    matchingEpis.forEach(e => {
                                      const item = items.find(i => i.job_function_id === e.job_function_id);
                                      const wCount = item?.quantity || 1;
                                      totalQtd += (e.quantity || 1) * wCount;
                                    });

                                    return (
                                      <tr key={idx} className="border-b last:border-0 hover:bg-slate-50/50">
                                        <td className="p-2 font-medium">{name}</td>
                                        <td className="p-2 text-right font-bold">{totalQtd}</td>
                                      </tr>
                                    );
                                  })}
                                </tbody>
                              </table>
                            </div>
                          )}
                        </div>

                        {/* Observaciones */}
                        <div className="space-y-1.5">
                          <h4 className="font-bold text-indigo-600 dark:text-indigo-400 border-b pb-1 text-[11px] uppercase tracking-wider">Observaciones Generales</h4>
                          <p className="bg-slate-50 dark:bg-slate-900 p-2.5 rounded-lg border leading-relaxed whitespace-pre-line">
                            {estimacion.general_notes || 'Sem observações.'}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Right Column: Email Composition */}
                  <div className="w-full lg:w-1/2 p-6 flex flex-col space-y-4 max-h-[65vh] overflow-y-auto">
                    
                    {/* Checkbox triggers email notification */}
                    <div className="flex items-center space-x-2 border bg-indigo-50/25 dark:bg-slate-900/50 p-3 rounded-xl">
                      <input
                        type="checkbox"
                        id="send_email_chk"
                        checked={sendEmailCheckbox}
                        onChange={e => setSendEmailCheckbox(e.target.checked)}
                        className="h-4.5 w-4.5 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                      />
                      <Label htmlFor="send_email_chk" className="text-xs font-bold text-slate-800 dark:text-slate-100 cursor-pointer">
                        Enviar notificação por e-mail para a equipe de operações?
                      </Label>
                    </div>

                    {sendEmailCheckbox && (
                      <div className="space-y-4">
                        {/* Notification Recipients */}
                        <div className="space-y-2">
                          <Label className="text-xs font-bold text-slate-700 dark:text-slate-350">
                            Destinatários de Notificação (Grupo comercial/operativo)
                          </Label>
                          {loadingEmails ? (
                            <Loader2 className="h-4 w-4 animate-spin text-slate-400" />
                          ) : notificationEmails.length === 0 ? (
                            <p className="text-xs text-amber-600 font-medium flex items-center bg-amber-50 dark:bg-amber-950/20 p-2 rounded-lg border border-amber-200">
                              <AlertCircle className="mr-1.5 h-4 w-4 flex-shrink-0" />
                              Nenhum e-mail de notificação de pedido configurado nas Configurações Comerciais.
                            </p>
                          ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 border p-3 rounded-lg max-h-[120px] overflow-y-auto bg-slate-50/50 dark:bg-slate-950/20">
                              {notificationEmails.map(emailObj => (
                                <label key={emailObj.id} className="flex items-center space-x-2 text-xs font-semibold text-slate-700 dark:text-slate-300 cursor-pointer">
                                  <input
                                    type="checkbox"
                                    checked={selectedEmails.includes(emailObj.email)}
                                    onChange={e => {
                                      if (e.target.checked) {
                                        setSelectedEmails(prev => [...prev, emailObj.email]);
                                      } else {
                                        setSelectedEmails(prev => prev.filter(email => email !== emailObj.email));
                                      }
                                    }}
                                    className="h-3.5 w-3.5 rounded border-gray-300 text-indigo-650 focus:ring-indigo-500"
                                  />
                                  <span className="truncate">{emailObj.email}</span>
                                </label>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* Additional Emails */}
                        <div className="space-y-1.5">
                          <Label htmlFor="additional_emails" className="text-xs font-bold">E-mails Adicionais (separados por vírgula)</Label>
                          <Input
                            id="additional_emails"
                            type="text"
                            placeholder="contrato@empresa.com, rh@empresa.com"
                            value={additionalEmails}
                            onChange={e => setAdditionalEmails(e.target.value)}
                            className="h-9 text-xs"
                          />
                        </div>

                        {/* Subject */}
                        <div className="space-y-1.5">
                          <Label htmlFor="email_subject" className="text-xs font-bold">Assunto do E-mail</Label>
                          <Input
                            id="email_subject"
                            type="text"
                            placeholder="Assunto da notificação"
                            value={emailSubject}
                            onChange={e => setEmailSubject(e.target.value)}
                            className="h-9 text-xs font-semibold"
                          />
                        </div>

                        {/* Rich Text simulated editor for Email Body */}
                        <div className="space-y-1.5 flex-1 flex flex-col">
                          <Label className="text-xs font-bold">Corpo do E-mail</Label>
                          
                          {/* Formatting Toolbar */}
                          <div className="flex items-center space-x-1 border border-b-0 rounded-t-lg bg-slate-50 dark:bg-slate-900 p-1.5">
                            <button
                              type="button"
                              onClick={() => handleFormat('bold')}
                              className="p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300"
                              title="Negrito"
                            >
                              <Bold className="h-3.5 w-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleFormat('italic')}
                              className="p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300"
                              title="Itálico"
                            >
                              <Italic className="h-3.5 w-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleFormat('underline')}
                              className="p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300"
                              title="Sublinhado"
                            >
                              <Underline className="h-3.5 w-3.5" />
                            </button>
                            <span className="w-[1px] h-4 bg-slate-300 dark:bg-slate-700 mx-1"></span>
                            <button
                              type="button"
                              onClick={() => handleFormat('insertUnorderedList')}
                              className="p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300"
                              title="Lista Marcadores"
                            >
                              <List className="h-3.5 w-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleFormat('insertOrderedList')}
                              className="p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300"
                              title="Lista Numerada"
                            >
                              <ListOrdered className="h-3.5 w-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={handleInsertLink}
                              className="p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300"
                              title="Inserir Link"
                            >
                              <Link className="h-3.5 w-3.5" />
                            </button>
                          </div>
 
                          <div
                            ref={editorRef}
                            contentEditable
                            dangerouslySetInnerHTML={{ __html: emailBody }}
                            onInput={(e) => {
                              setEmailBody(e.currentTarget.innerHTML);
                            }}
                            className="flex-1 w-full min-h-[220px] max-h-[350px] overflow-y-auto rounded-b-lg border border-input bg-white dark:bg-slate-950 px-3 py-2 text-xs shadow-sm focus:outline-none focus:ring-1 focus:ring-ring leading-relaxed [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_a]:text-blue-600 [&_a]:underline"
                            style={{ outline: 'none' }}
                          />
                        </div>
                      </div>
                    )}
                  </div>

                </div>
              )}

            </div>
          )}

          {/* Footer */}
          {!loadingData && (
            <DialogFooter className="bg-slate-50 dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 px-6 py-4 flex items-center justify-between">
              <div>
                {step > 1 && (
                  <Button variant="ghost" onClick={handleBack} disabled={isSubmitting} className="text-slate-600 hover:text-slate-700">
                    <ArrowLeft className="mr-1.5 h-4 w-4" /> Voltar
                  </Button>
                )}
              </div>
              <div className="flex space-x-3">
                <Button variant="outline" onClick={() => setOpen(false)} disabled={isSubmitting}>
                  Cancelar
                </Button>
                {step === 1 ? (
                  <Button 
                    className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold" 
                    onClick={handleNext}
                  >
                    Próximo <ArrowRight className="ml-1.5 h-4 w-4" />
                  </Button>
                ) : (
                  <Button 
                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold" 
                    onClick={handleApprove}
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                        Aprovando e Enviando...
                      </>
                    ) : (
                      <>
                        <Send className="mr-1.5 h-4 w-4" />
                        Confirmar e Aprovar Pedido
                      </>
                    )}
                  </Button>
                )}
              </div>
            </DialogFooter>
          )}

        </DialogContent>
      </Dialog>
    </>
  );
}
