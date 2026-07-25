import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/shared/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { CheckCircle2, Loader2, FileText, Globe, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';

interface QuestionWithJobFunction {
  jobFunctionId: string;
  jobFunctionName: string;
  questionId: string;
  questionText: string;
  questionType: 'short_text' | 'long_text' | 'number' | 'date' | 'boolean' | 'single_choice' | 'multi_choice';
  required: boolean;
  options: string[];
}

const translations = {
  pt: {
    title: 'Formulário Técnico de Requisitos',
    proposalCode: 'Proposta Comercial',
    hello: 'Olá',
    introText: 'Para darmos continuidade no processo de contratação dos profissionais relacionados aos perfis solicitados, por favor, responda a este formulário técnico para que possa nos passar todas as informações necessárias.',
    subIntroText: 'Com esses detalhes, nossa equipe de Recursos Humanos e Seleção buscará os profissionais com a qualificação perfeita para o seu projeto.',
    projectSummary: 'Resumo do Projeto',
    startDate: 'Data de Início Prevista',
    endDate: 'Data de Fim Prevista',
    profiles: 'Perfis Requeridos',
    notSpecified: 'Não especificado',
    profileLabel: 'Perfil',
    otherPlaceholder: 'Especifique a outra opção...',
    booleanDetailsPlaceholder: 'Descreva os detalhes e requisitos adicionais...',
    submitBtn: 'Enviar Respostas do Formulário',
    submittingBtn: 'Enviando Respostas...',
    requiredError: 'Por favor, responda à pergunta obrigatória: "{text}"',
    successTitle: 'Respostas Enviadas com Sucesso!',
    successHello: 'Olá {name}, agradecemos imensamente a sua colaboração.',
    successBody1: 'As especificações técnicas dos perfis solicitados foram salvas. Nossa equipe operacional de contratação já está trabalhando na busca dos profissionais perfeitos para o seu projeto.',
    successBody2: 'Você já pode fechar esta aba do seu navegador.',
    langLabel: 'Idioma',
    technicalOfficial: 'Formulário Técnico Oficial',
    selectDefault: 'Selecione uma opção...'
  },
  es: {
    title: 'Formulario Técnico de Requisitos',
    proposalCode: 'Propuesta Comercial',
    hello: 'Hola',
    introText: 'Para continuar con el proceso de contratación de los profesionales relacionados con los perfiles solicitados, por favor complete este formulario técnico para que pueda brindarnos toda la información necesaria.',
    subIntroText: 'Con estos detalles, nuestro equipo de Recursos Humanos y Selección buscará a los profesionales con la calificación perfecta para su proyecto.',
    projectSummary: 'Resumen del Proyecto',
    startDate: 'Fecha de Inicio Prevista',
    endDate: 'Fecha de Fin Prevista',
    profiles: 'Perfiles Requeridos',
    notSpecified: 'No especificado',
    profileLabel: 'Perfil',
    otherPlaceholder: 'Especifique la otra opción...',
    booleanDetailsPlaceholder: 'Describa los detalles y requisitos adicionales...',
    submitBtn: 'Enviar Respuestas del Formulario',
    submittingBtn: 'Enviando Respuestas...',
    requiredError: 'Por favor, responda a la pregunta obligatoria: "{text}"',
    successTitle: '¡Respuestas Enviadas con Éxito!',
    successHello: 'Hola {name}, agradecemos mucho su colaboración.',
    successBody1: 'Las especificaciones técnicas de los perfiles solicitados han sido guardadas. Nuestro equipo operativo de contratación ya está trabajando en la búsqueda de los profesionales perfectos para su proyecto.',
    successBody2: 'Ya puede cerrar esta pestaña de su navegador.',
    langLabel: 'Idioma',
    technicalOfficial: 'Formulario Técnico Oficial',
    selectDefault: 'Seleccione una opción...'
  },
  en: {
    title: 'Technical Requirements Form',
    proposalCode: 'Commercial Proposal',
    hello: 'Hello',
    introText: 'To continue with the recruitment process for the professionals related to the requested profiles, please fill out this technical form so you can provide us with all the necessary details.',
    subIntroText: 'With these details, our Human Resources and Selection team will search for professionals with the perfect qualifications for your project.',
    projectSummary: 'Project Summary',
    startDate: 'Expected Start Date',
    endDate: 'Expected End Date',
    profiles: 'Required Profiles',
    notSpecified: 'Not specified',
    profileLabel: 'Profile',
    otherPlaceholder: 'Specify the other option...',
    booleanDetailsPlaceholder: 'Describe the details and additional requirements...',
    submitBtn: 'Submit Form Answers',
    submittingBtn: 'Submitting Answers...',
    requiredError: 'Please answer the required question: "{text}"',
    successTitle: 'Answers Submitted Successfully!',
    successHello: 'Hello {name}, thank you very much for your cooperation.',
    successBody1: 'The technical specifications for the requested profiles have been saved. Our operational recruitment team is already working to find the perfect professionals for your project.',
    successBody2: 'You can now close this browser tab.',
    langLabel: 'Language',
    technicalOfficial: 'Official Technical Form',
    selectDefault: 'Select an option...'
  }
};

function formatDateString(dateStr: string, lang: 'pt' | 'es' | 'en') {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length !== 3) return dateStr;
  const year = parts[0];
  const month = parts[1];
  const day = parts[2];
  if (lang === 'en') {
    return `${month}/${day}/${year}`;
  }
  return `${day}/${month}/${year}`;
}

export function PublicTechnicalFormPage() {
  const { id } = useParams<{ id: string }>();

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [estimacion, setEstimacion] = useState<any>(null);
  const [client, setClient] = useState<any>(null);
  const [lead, setLead] = useState<any>(null);
  const [questions, setQuestions] = useState<QuestionWithJobFunction[]>([]);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  
  // Set default language based on estimate or browser
  const [lang, setLang] = useState<'es' | 'pt' | 'en'>('es');

  useEffect(() => {
    async function loadData() {
      if (!id) {
        setErrorMsg('ID do formulário não fornecido.');
        setLoading(false);
        return;
      }

      try {
        // 1. Fetch estimate publically
        const { data: est, error: estError } = await supabase
          .schema('core_comercial')
          .from('estimaciones')
          .select(`
            *,
            versions:estimacion_versions!estimacion_versions_estimacion_id_fkey(
              *,
              items:estimacion_items(
                *,
                job_function:job_functions(id, code, name)
              )
            )
          `)
          .eq('id', id)
          .maybeSingle();

        if (estError) throw estError;
        if (!est) {
          setErrorMsg('Proposta comercial ou orçamento não encontrado.');
          setLoading(false);
          return;
        }

        setEstimacion(est);
        
        // Match default language
        const estLang = (est.document_language || 'es').toLowerCase();
        if (estLang === 'pt' || estLang === 'portugues') {
          setLang('pt');
        } else if (estLang === 'en' || estLang === 'english') {
          setLang('en');
        } else {
          setLang('es');
        }

        // Fetch client or lead details
        if (est.client_id) {
          const { data: cl } = await supabase.schema('core_common').from('clients').select('id, trade_name, legal_name, email').eq('id', est.client_id).maybeSingle();
          setClient(cl);
        }
        if (est.lead_id) {
          const { data: ld } = await supabase.schema('core_comercial').from('leads').select('id, name, company_name, email').eq('id', est.lead_id).maybeSingle();
          setLead(ld);
        }

        // Get active version items
        const activeVersion = est.versions?.find((v: any) => v.id === est.current_version_id) || est.versions?.[0];
        if (!activeVersion || !activeVersion.items || activeVersion.items.length === 0) {
          setLoading(false);
          return;
        }

        // 2. Fetch unique job function questions
        const uniqueJobFunctionIds = Array.from(new Set(activeVersion.items.map((item: any) => item.job_function_id))) as string[];
        
        const allQuestions: QuestionWithJobFunction[] = [];
        for (const jfId of uniqueJobFunctionIds) {
          const { data: jfQuestions } = await supabase
            .schema('core_comercial')
            .from('job_function_questions')
            .select('*')
            .eq('job_function_id', jfId)
            .eq('empresa_id', est.empresa_id)
            .neq('status', 'archived')
            .order('sort_order', { ascending: true });

          const jfName = activeVersion.items.find((item: any) => item.job_function_id === jfId)?.job_function?.name || 'Perfil';

          jfQuestions?.forEach((q: any) => {
            allQuestions.push({
              jobFunctionId: jfId,
              jobFunctionName: jfName,
              questionId: q.id,
              questionText: q.question_text,
              questionType: (q.question_type as any) || 'short_text',
              required: !!q.is_required,
              options: q.options || [],
            });
          });
        }

        setQuestions(allQuestions);

        // Pre-populate with existing answers if any
        const initialAnswers: Record<string, string> = {};
        allQuestions.forEach(q => {
          initialAnswers[q.questionId] = est.client_technical_answers?.[q.questionId] || (q.questionType === 'boolean' ? 'No' : '');
        });
        setAnswers(initialAnswers);

      } catch (err: any) {
        console.error('Error loading technical form:', err);
        setErrorMsg('Ocorreu um erro ao carregar os dados do formulário.');
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [id]);

  const handleToggleMultiChoice = (questionId: string, option: string, checked: boolean) => {
    setAnswers(prev => {
      const currentVal = prev[questionId] || '';
      const currentList = currentVal ? currentVal.split(',').map(s => s.trim()) : [];
      let newList: string[];
      if (checked) {
        const alreadyHas = currentList.some(item => 
          item === option || 
          (option === 'Otros' && item.startsWith('Otros:')) ||
          (option === 'Otras' && item.startsWith('Otras:'))
        );
        if (!alreadyHas) {
          newList = [...currentList, option];
        } else {
          newList = currentList;
        }
      } else {
        newList = currentList.filter(item => 
          !(item === option || 
            (option === 'Otros' && item.startsWith('Otros:')) ||
            (option === 'Otras' && item.startsWith('Otras:')))
        );
      }
      return {
        ...prev,
        [questionId]: newList.join(', '),
      };
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const t = translations[lang];

    // Validate required questions
    for (const q of questions) {
      if (q.required && (!answers[q.questionId] || answers[q.questionId].trim() === '')) {
        toast.error(t.requiredError.replace('{text}', q.questionText));
        return;
      }
    }

    setSubmitting(true);
    try {
      // Call public DDF function using rpc
      const { error } = await supabase.rpc('save_client_technical_answers', {
        p_estimacion_id: id,
        p_answers: answers
      });

      if (error) throw error;
      setSuccess(true);
      toast.success(lang === 'pt' ? 'Questionário técnico enviado!' : lang === 'en' ? 'Form submitted!' : '¡Formulario enviado!');
    } catch (err: any) {
      console.error('Error submitting technical questions:', err);
      toast.error(lang === 'pt' ? 'Erro ao enviar respostas.' : lang === 'en' ? 'Submission error.' : 'Error al enviar.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex flex-col items-center justify-center p-4">
        <Loader2 className="h-8 w-8 text-indigo-600 animate-spin mb-4" />
        <p className="text-slate-600 dark:text-slate-400 font-medium">Loading form...</p>
      </div>
    );
  }

  if (errorMsg) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex flex-col items-center justify-center p-4">
        <div className="bg-white dark:bg-slate-950 p-8 rounded-2xl shadow-xl max-w-md w-full border border-slate-100 dark:border-slate-800 text-center">
          <AlertTriangle className="h-12 w-12 text-amber-500 mx-auto mb-4" />
          <h1 className="text-xl font-bold text-slate-950 dark:text-slate-50 mb-2">Error</h1>
          <p className="text-slate-600 dark:text-slate-400 mb-6">{errorMsg}</p>
        </div>
      </div>
    );
  }

  const t = translations[lang];
  const clientName = client?.trade_name || client?.legal_name || lead?.company_name || lead?.name || 'Cliente';

  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50/50 via-white to-slate-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 flex flex-col items-center justify-center p-4">
        <div className="bg-white dark:bg-slate-950 p-8 rounded-2xl shadow-xl max-w-lg w-full border border-slate-100 dark:border-slate-800 text-center space-y-6">
          <div className="inline-flex p-3 rounded-full bg-green-50 dark:bg-green-950/20 text-green-600 dark:text-green-400 mb-2">
            <CheckCircle2 className="h-12 w-12" />
          </div>
          <h1 className="text-2xl font-bold text-slate-950 dark:text-slate-50">{t.successTitle}</h1>
          <p className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed">
            {t.successHello.replace('{name}', clientName)}
          </p>
          <p className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed">
            {t.successBody1}
          </p>
          <div className="border-t border-slate-100 dark:border-slate-800 pt-6">
            <p className="text-xs text-slate-400">{t.successBody2}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50/30 via-slate-50 to-slate-100/50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950/50 py-12 px-4 sm:px-6">
      <div className="max-w-3xl mx-auto space-y-8">
        
        {/* Header Branding */}
        <div className="flex items-center justify-between border-b pb-6 border-slate-200 dark:border-slate-800">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 bg-indigo-600 rounded-xl text-white">
              <FileText className="h-6 w-6" />
            </div>
            <div>
              <span className="font-extrabold text-lg text-slate-900 dark:text-white tracking-wide">MCS</span>
              <span className="text-xs block text-slate-400 font-medium">GRUPO OPERACIONAL</span>
            </div>
          </div>
          <div className="flex items-center space-x-4">
            {/* Language Selector */}
            <div className="flex bg-slate-100 dark:bg-slate-850 p-1 rounded-lg border border-slate-200 dark:border-slate-700">
              {(['es', 'pt', 'en'] as const).map(l => (
                <button
                  key={l}
                  type="button"
                  onClick={() => setLang(l)}
                  className={`px-2.5 py-1 text-xs font-extrabold rounded-md transition duration-150 ${
                    lang === l 
                      ? 'bg-indigo-600 text-white shadow-sm' 
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200/50 dark:hover:bg-slate-700/50'
                  }`}
                >
                  {l.toUpperCase()}
                </button>
              ))}
            </div>
            <div className="hidden sm:flex items-center space-x-2 text-slate-500 dark:text-slate-400 text-sm">
              <Globe className="h-4 w-4" />
              <span className="font-semibold uppercase tracking-wider text-xs">{t.technicalOfficial}</span>
            </div>
          </div>
        </div>

        {/* Introduction & Project Summary Card */}
        <div className="bg-white dark:bg-slate-950 rounded-2xl border border-slate-100 dark:border-slate-850 p-6 sm:p-8 shadow-xl space-y-6 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-2.5 h-full bg-indigo-600"></div>
          
          <div className="space-y-2">
            <h1 className="text-2xl font-bold text-slate-950 dark:text-slate-50">
              {t.title}
            </h1>
            <p className="text-sm font-semibold text-indigo-600 dark:text-indigo-400">
              {t.proposalCode}: {estimacion.codigo}
            </p>
          </div>

          {/* Project Summary Grid */}
          <div className="bg-slate-50/50 dark:bg-slate-900/40 rounded-xl p-4 sm:p-5 border border-slate-100 dark:border-slate-800 grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6 text-sm">
            <div className="space-y-1">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">{t.startDate}</span>
              <p className="font-bold text-slate-800 dark:text-slate-200">
                {estimacion.expected_start_date ? formatDateString(estimacion.expected_start_date, lang) : t.notSpecified}
              </p>
            </div>
            <div className="space-y-1">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">{t.endDate}</span>
              <p className="font-bold text-slate-800 dark:text-slate-200">
                {estimacion.expected_end_date ? formatDateString(estimacion.expected_end_date, lang) : t.notSpecified}
              </p>
            </div>
            <div className="space-y-1 sm:col-span-1">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">{t.profiles}</span>
              <div className="flex flex-wrap gap-1.5 mt-1">
                {(() => {
                  const activeVersion = estimacion.versions?.find((v: any) => v.id === estimacion.current_version_id) || estimacion.versions?.[0];
                  return (activeVersion?.items || []).map((item: any) => (
                    <span 
                      key={item.id} 
                      className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-bold bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-900/50"
                    >
                      {item.quantity}x {item.job_function?.name}
                    </span>
                  ));
                })()}
              </div>
            </div>
          </div>

          <div className="space-y-3 text-slate-600 dark:text-slate-400 text-sm leading-relaxed">
            <p>{t.hello} <strong>{clientName}</strong>,</p>
            <p>{t.introText}</p>
            <p>{t.subIntroText}</p>
          </div>
        </div>

        {/* Dynamic Questions Form */}
        <form onSubmit={handleSubmit} className="space-y-8">
          
          {Array.from(new Set(questions.map(q => q.jobFunctionId))).map(jfId => {
            const jfQuestions = questions.filter(q => q.jobFunctionId === jfId);
            const jfName = jfQuestions[0]?.jobFunctionName;

            return (
              <div key={jfId} className="bg-white dark:bg-slate-950 rounded-2xl border border-slate-100 dark:border-slate-850 p-6 sm:p-8 shadow-xl space-y-6">
                
                <h3 className="font-bold text-base text-slate-900 dark:text-slate-100 border-b pb-3 flex items-center">
                  <span className="w-3 h-3 rounded-full bg-indigo-600 mr-2.5"></span>
                  {t.profileLabel}: {jfName}
                </h3>
                
                <div className="space-y-6">
                  {jfQuestions.map(q => (
                    <div key={q.questionId} className="space-y-2.5">
                      <Label htmlFor={`q-${q.questionId}`} className="text-sm font-bold text-slate-700 dark:text-slate-350">
                        {q.questionText} {q.required && <span className="text-red-500 font-extrabold">*</span>}
                      </Label>

                      {q.questionType === 'long_text' ? (
                        <Textarea
                          id={`q-${q.questionId}`}
                          placeholder="..."
                          value={answers[q.questionId] || ''}
                          onChange={e => setAnswers(prev => ({ ...prev, [q.questionId]: e.target.value }))}
                          className="min-h-[70px] text-sm"
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
                      ) : q.questionType === 'boolean' ? (
                        <div className="space-y-2">
                          <select
                            id={`q-${q.questionId}`}
                            value={answers[q.questionId]?.startsWith('Si') ? 'Si' : 'No'}
                            className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                            onChange={e => {
                              const val = e.target.value;
                              setAnswers(prev => ({
                                ...prev,
                                [q.questionId]: val === 'Si' ? 'Si - ' : 'No'
                              }));
                            }}
                          >
                            <option value="No">{lang === 'pt' ? 'Não' : lang === 'en' ? 'No' : 'No'}</option>
                            <option value="Si">{lang === 'pt' ? 'Sim' : lang === 'en' ? 'Yes' : 'Sí'}</option>
                          </select>
                          {answers[q.questionId]?.startsWith('Si') && (
                            <Textarea
                              placeholder={t.booleanDetailsPlaceholder}
                              value={answers[q.questionId].startsWith('Si - ') ? answers[q.questionId].substring(5) : ''}
                              onChange={e => {
                                const text = e.target.value;
                                setAnswers(prev => ({
                                  ...prev,
                                  [q.questionId]: `Si - ${text}`
                                }));
                              }}
                              className="min-h-[70px] text-sm mt-2"
                            />
                          )}
                        </div>
                      ) : q.questionType === 'single_choice' ? (
                        <div className="space-y-2">
                          <select
                            id={`q-${q.questionId}`}
                            value={
                              answers[q.questionId]?.startsWith('Otros') ? 'Otros' :
                              answers[q.questionId]?.startsWith('Otras') ? 'Otras' :
                              answers[q.questionId] || ''
                            }
                            className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                            onChange={e => {
                              const val = e.target.value;
                              setAnswers(prev => ({
                                ...prev,
                                [q.questionId]: (val === 'Otros' || val === 'Otras') ? `${val} - ` : val
                              }));
                            }}
                          >
                            <option value="" disabled>{t.selectDefault}</option>
                            {(q.options || []).map((opt, idx) => (
                              <option key={idx} value={opt}>{opt}</option>
                            ))}
                          </select>
                          {(answers[q.questionId]?.startsWith('Otros') || answers[q.questionId]?.startsWith('Otras')) && (
                            <Textarea
                              placeholder={t.otherPlaceholder}
                              value={
                                answers[q.questionId].startsWith('Otros - ') ? answers[q.questionId].substring(8) :
                                answers[q.questionId].startsWith('Otras - ') ? answers[q.questionId].substring(8) : ''
                              }
                              onChange={e => {
                                const text = e.target.value;
                                const prefix = answers[q.questionId].startsWith('Otros') ? 'Otros' : 'Otras';
                                setAnswers(prev => ({
                                  ...prev,
                                  [q.questionId]: `${prefix} - ${text}`
                                }));
                              }}
                              className="min-h-[70px] text-sm mt-2"
                            />
                          )}
                        </div>
                      ) : q.questionType === 'multi_choice' ? (
                        <div className="space-y-2.5 border rounded-xl p-4 bg-slate-50/50 dark:bg-slate-950">
                          {(q.options || []).map((opt, idx) => {
                            const currentVal = answers[q.questionId] || '';
                            const currentList = currentVal ? currentVal.split(',').map(s => s.trim()) : [];
                            const isChecked = currentList.some(item => 
                              item === opt || 
                              (opt === 'Otros' && item.startsWith('Otros:')) ||
                              (opt === 'Otras' && item.startsWith('Otras:'))
                            );
                            return (
                              <div key={idx} className="flex items-center space-x-2.5">
                                <input
                                  type="checkbox"
                                  id={`q-${q.questionId}-opt-${idx}`}
                                  checked={isChecked}
                                  onChange={e => handleToggleMultiChoice(q.questionId, opt, e.target.checked)}
                                  className="h-4 w-4 rounded border border-slate-350 text-indigo-650 focus:ring-indigo-500 cursor-pointer"
                                />
                                <label
                                  htmlFor={`q-${q.questionId}-opt-${idx}`}
                                  className="text-sm font-semibold leading-none cursor-pointer text-slate-650 dark:text-slate-350"
                                >
                                  {opt}
                                </label>
                              </div>
                            );
                          })}
                          {(() => {
                            const currentVal = answers[q.questionId] || '';
                            const currentList = currentVal ? currentVal.split(',').map(s => s.trim()) : [];
                            const hasOtros = currentList.some(item => item.startsWith('Otros') || item.startsWith('Otras'));
                            
                            if (hasOtros) {
                              const otrosItem = currentList.find(item => item.startsWith('Otros') || item.startsWith('Otras')) || '';
                              let otrosText = '';
                              if (otrosItem.includes(':')) {
                                otrosText = otrosItem.split(':')[1].trim();
                              }
                              
                              return (
                                <Textarea
                                  placeholder={t.otherPlaceholder}
                                  value={otrosText}
                                  onChange={e => {
                                    const text = e.target.value;
                                    const prefix = otrosItem.startsWith('Otros') ? 'Otros' : 'Otras';
                                    
                                    setAnswers(prev => {
                                      const cVal = prev[q.questionId] || '';
                                      const cList = cVal ? cVal.split(',').map(s => s.trim()) : [];
                                      const updatedList = cList.map(item => {
                                        if (item.startsWith('Otros') || item.startsWith('Otras')) {
                                          return text ? `${prefix}: ${text}` : prefix;
                                        }
                                        return item;
                                      });
                                      return { ...prev, [q.questionId]: updatedList.join(', ') };
                                    });
                                  }}
                                  className="min-h-[70px] text-sm mt-2"
                                />
                              );
                            }
                            return null;
                          })()}
                        </div>
                      ) : (
                        <Input
                          id={`q-${q.questionId}`}
                          type="text"
                          placeholder="..."
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

          {/* Submit Action */}
          <div className="flex justify-end pt-4">
            <Button
              type="submit"
              disabled={submitting}
              className="px-8 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-lg transition duration-200"
            >
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  {t.submittingBtn}
                </>
              ) : (
                t.submitBtn
              )}
            </Button>
          </div>

        </form>

      </div>
    </div>
  );
}
