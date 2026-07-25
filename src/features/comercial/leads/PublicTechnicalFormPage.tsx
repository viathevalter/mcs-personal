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

    // Validate required questions
    for (const q of questions) {
      if (q.required && (!answers[q.questionId] || answers[q.questionId].trim() === '')) {
        toast.error(`Por favor, responda à pergunta obrigatória: "${q.questionText}"`);
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
      toast.success('Questionário técnico enviado com sucesso!');
    } catch (err: any) {
      console.error('Error submitting technical questions:', err);
      toast.error('Erro ao enviar as respostas. Por favor, tente novamente.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex flex-col items-center justify-center p-4">
        <Loader2 className="h-8 w-8 text-indigo-600 animate-spin mb-4" />
        <p className="text-slate-600 dark:text-slate-400 font-medium">Carregando formulário técnico...</p>
      </div>
    );
  }

  if (errorMsg) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex flex-col items-center justify-center p-4">
        <div className="bg-white dark:bg-slate-950 p-8 rounded-2xl shadow-xl max-w-md w-full border border-slate-100 dark:border-slate-800 text-center">
          <AlertTriangle className="h-12 w-12 text-amber-500 mx-auto mb-4" />
          <h1 className="text-xl font-bold text-slate-950 dark:text-slate-50 mb-2">Ops! Ocorreu um problema</h1>
          <p className="text-slate-600 dark:text-slate-400 mb-6">{errorMsg}</p>
          <p className="text-xs text-slate-400">Se persistir, entre em contato com o suporte comercial.</p>
        </div>
      </div>
    );
  }

  const clientName = client?.trade_name || client?.legal_name || lead?.company_name || lead?.name || 'Cliente';

  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50/50 via-white to-slate-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 flex flex-col items-center justify-center p-4">
        <div className="bg-white dark:bg-slate-950 p-8 rounded-2xl shadow-xl max-w-lg w-full border border-slate-100 dark:border-slate-800 text-center space-y-6">
          <div className="inline-flex p-3 rounded-full bg-green-50 dark:bg-green-950/20 text-green-600 dark:text-green-400 mb-2">
            <CheckCircle2 className="h-12 w-12" />
          </div>
          <h1 className="text-2xl font-bold text-slate-950 dark:text-slate-50">Respostas Enviadas com Sucesso!</h1>
          <p className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed">
            Olá <strong>{clientName}</strong>, agradecemos imensamente a sua colaboração.
          </p>
          <p className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed">
            As especificações técnicas dos perfis solicitados foram salvas. Nossa equipe operacional de contratação já está trabalhando na busca dos profissionais perfeitos para o seu projeto.
          </p>
          <div className="border-t border-slate-100 dark:border-slate-800 pt-6">
            <p className="text-xs text-slate-400">Você já pode fechar esta aba do seu navegador.</p>
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
          <div className="flex items-center space-x-2 text-slate-500 dark:text-slate-400 text-sm">
            <Globe className="h-4 w-4" />
            <span className="font-semibold uppercase tracking-wider text-xs">Formulário Técnico Oficial</span>
          </div>
        </div>

        {/* Introduction Card */}
        <div className="bg-white dark:bg-slate-950 rounded-2xl border border-slate-100 dark:border-slate-850 p-6 sm:p-8 shadow-xl space-y-4 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-2.5 h-full bg-indigo-600"></div>
          <h1 className="text-2xl font-bold text-slate-950 dark:text-slate-50">
            Formulário Técnico de Requisitos
          </h1>
          <p className="text-sm font-semibold text-indigo-600 dark:text-indigo-400">
            Proposta Comercial: {estimacion.codigo}
          </p>
          <div className="space-y-3 text-slate-600 dark:text-slate-400 text-sm leading-relaxed">
            <p>Olá <strong>{clientName}</strong>,</p>
            <p>
              Para darmos continuidade no processo de contratação dos profissionais relacionados ao perfil que você solicitou, segue este formulário técnico para que possa nos passar todas as informações necessárias.
            </p>
            <p>
              Com esses detalhes, nossa equipe de Recursos Humanos e Seleção buscará os profissionais com a qualificação perfeita para o seu projeto.
            </p>
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
                  Perfil: {jfName}
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
                          placeholder="Escreva sua resposta..."
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
                            <option value="No">Não / No</option>
                            <option value="Si">Sim / Sí</option>
                          </select>
                          {answers[q.questionId]?.startsWith('Si') && (
                            <Textarea
                              placeholder="Descreva os detalhes e requisitos adicionais..."
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
                            <option value="" disabled>Selecione uma opção...</option>
                            {(q.options || []).map((opt, idx) => (
                              <option key={idx} value={opt}>{opt}</option>
                            ))}
                          </select>
                          {(answers[q.questionId]?.startsWith('Otros') || answers[q.questionId]?.startsWith('Otras')) && (
                            <Textarea
                              placeholder="Especifique a outra opção..."
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
                                  placeholder="Especifique a outra opção..."
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
                  Enviando Respostas...
                </>
              ) : (
                'Enviar Respostas do Formulário'
              )}
            </Button>
          </div>

        </form>

      </div>
    </div>
  );
}
