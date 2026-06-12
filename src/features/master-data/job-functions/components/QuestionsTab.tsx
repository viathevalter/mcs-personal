import { useState, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { Trash2, Plus, GripVertical, X, Pencil } from 'lucide-react';

import type { CreateJobFunctionQuestionDTO, JobFunctionQuestion } from '../types';
import { createJobFunctionQuestionSchema } from '../types';
import { useJobFunctionQuestions, useMutateJobFunctionQuestion } from '../hooks/useJobFunctionQuestions';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface QuestionsTabProps {
  jobFunctionId: string;
}

export function QuestionsTab({ jobFunctionId }: QuestionsTabProps) {
  const { data: questions = [], isLoading } = useJobFunctionQuestions(jobFunctionId);
  const { createQuestion, isCreating, updateQuestion, isUpdating, archiveQuestion } = useMutateJobFunctionQuestion(jobFunctionId);

  const [isAdding, setIsAdding] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<JobFunctionQuestion | null>(null);
  const [newOption, setNewOption] = useState('');
  const formRef = useRef<HTMLDivElement>(null);

  const form = useForm<CreateJobFunctionQuestionDTO>({
    resolver: zodResolver(createJobFunctionQuestionSchema) as any,
    defaultValues: {
      job_function_id: jobFunctionId,
      question_text: '',
      question_type: 'short_text',
      is_required: true,
      sort_order: questions.length * 10,
      options: [],
    },
  });

  const questionType = form.watch('question_type');
  const currentOptions = form.watch('options') || [];

  const handleAddOption = () => {
    const trimmed = newOption.trim();
    if (!trimmed) return;
    if (currentOptions.includes(trimmed)) {
      toast.error('Esta opção já existe');
      return;
    }
    form.setValue('options', [...currentOptions, trimmed], { shouldValidate: true });
    setNewOption('');
  };

  const handleRemoveOption = (index: number) => {
    const updated = currentOptions.filter((_, i) => i !== index);
    form.setValue('options', updated, { shouldValidate: true });
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddOption();
    }
  };

  const handleStartAdd = () => {
    setEditingQuestion(null);
    setIsAdding(true);
    form.reset({
      job_function_id: jobFunctionId,
      question_text: '',
      question_type: 'short_text',
      is_required: true,
      sort_order: questions.length * 10,
      options: [],
    });
    setNewOption('');
    setTimeout(() => {
      formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }, 100);
  };

  const handleStartEdit = (q: JobFunctionQuestion) => {
    setIsAdding(false);
    setEditingQuestion(q);
    form.reset({
      job_function_id: q.job_function_id,
      question_text: q.question_text,
      question_type: q.question_type,
      is_required: q.is_required,
      sort_order: q.sort_order,
      options: q.options || [],
    });
    setNewOption('');
    setTimeout(() => {
      formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }, 100);
  };

  const handleCancel = () => {
    setIsAdding(false);
    setEditingQuestion(null);
    form.reset();
    setNewOption('');
  };

  const onSubmit = async (data: CreateJobFunctionQuestionDTO) => {
    try {
      const isChoice = data.question_type === 'single_choice' || data.question_type === 'multi_choice';
      const payload = {
        ...data,
        options: isChoice ? (data.options && data.options.length > 0 ? data.options : []) : null,
      };

      if (isChoice && (!payload.options || payload.options.length < 2)) {
        toast.error('Perguntas de múltipla escolha devem ter pelo menos 2 opções.');
        return;
      }

      if (editingQuestion) {
        if (!editingQuestion.id) throw new Error('ID da pergunta inválido');
        await updateQuestion({ id: editingQuestion.id, payload });
        toast.success('Pergunta atualizada com sucesso!');
      } else {
        await createQuestion({
          ...payload,
          sort_order: questions.length * 10,
        });
        toast.success('Pergunta adicionada com sucesso!');
      }
      handleCancel();
    } catch (error: any) {
      toast.error(error.message || 'Erro ao salvar pergunta');
    }
  };

  const handleRemove = async (id: string) => {
    if (!confirm('Deseja realmente remover esta pergunta?')) return;
    try {
      await archiveQuestion(id);
      toast.success('Pergunta removida');
    } catch (error: any) {
      toast.error('Erro ao remover pergunta');
    }
  };

  const getTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      'short_text': 'Texto Curto',
      'long_text': 'Texto Longo',
      'boolean': 'Sim/Não',
      'number': 'Número',
      'single_choice': 'Múltipla Escolha (Única)',
      'multi_choice': 'Múltipla Escolha (Várias)',
      'date': 'Data',
    };
    return labels[type] || type;
  };

  if (isLoading) {
    return <Skeleton className="h-64 w-full mt-6" />;
  }

  const isSaving = isCreating || isUpdating;

  return (
    <div className="mt-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium">Requisitos e Triagem</h3>
          <p className="text-sm text-muted-foreground">
            Defina perguntas estruturadas (Sim/Não, Múltipla Escolha, etc) para evitar respostas textuais vagas dos candidatos.
          </p>
        </div>
        {!isAdding && !editingQuestion && (
          <Button onClick={handleStartAdd} size="sm">
            <Plus className="h-4 w-4 mr-2" />
            Adicionar Pergunta
          </Button>
        )}
      </div>

      <div className="space-y-3">
        {questions.length === 0 && !isAdding && !editingQuestion && (
          <div className="text-center p-8 border border-dashed rounded-md text-muted-foreground">
            Nenhuma pergunta cadastrada. Adicione perguntas para a triagem.
          </div>
        )}

        {questions.map((q) => (
          <div key={q.id} className="flex items-start gap-4 p-4 border rounded-md bg-white hover:border-slate-300 transition-colors">
            <div className="pt-1 cursor-grab">
              <GripVertical className="h-5 w-5 text-muted-foreground" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <span className="font-medium">{q.question_text}</span>
                {q.is_required && <Badge variant="destructive" className="text-[10px]">Obrigatória</Badge>}
              </div>
              <div className="text-sm text-muted-foreground flex flex-col gap-1.5">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="bg-slate-50">{getTypeLabel(q.question_type)}</Badge>
                </div>
                {q.options && q.options.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-0.5">
                    {q.options.map((opt, i) => (
                      <span key={i} className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-800 border border-slate-200">
                        {opt}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <div className="flex items-center gap-1">
              <Button 
                variant="ghost" 
                size="icon" 
                className="text-blue-500 hover:text-blue-700 hover:bg-blue-50"
                onClick={() => handleStartEdit(q)}
                title="Editar pergunta"
              >
                <Pencil className="h-4 w-4" />
              </Button>
              <Button 
                variant="ghost" 
                size="icon" 
                className="text-red-500 hover:text-red-700 hover:bg-red-50"
                onClick={() => q.id && handleRemove(q.id)}
                title="Remover pergunta"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ))}
      </div>

      {(isAdding || editingQuestion) && (
        <div ref={formRef} className="p-4 border rounded-md bg-slate-50 relative">
          <h4 className="font-medium mb-4">
            {editingQuestion ? 'Editar Pergunta' : 'Nova Pergunta'}
          </h4>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="question_text"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Enunciado da Pergunta</FormLabel>
                    <FormControl>
                      <Input placeholder="Ex: Possui certificação NR-10?" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="question_type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tipo de Resposta</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione..." />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="boolean">Sim / Não</SelectItem>
                          <SelectItem value="single_choice">Múltipla Escolha (1 Opção)</SelectItem>
                          <SelectItem value="multi_choice">Múltipla Escolha (Várias Opções)</SelectItem>
                          <SelectItem value="short_text">Texto Curto</SelectItem>
                          <SelectItem value="long_text">Texto Longo</SelectItem>
                          <SelectItem value="number">Número</SelectItem>
                          <SelectItem value="date">Data</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="is_required"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-end space-x-3 space-y-0 p-2">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          className="mb-1"
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel>
                          Resposta Obrigatória
                        </FormLabel>
                      </div>
                    </FormItem>
                  )}
                />
              </div>

              {(questionType === 'single_choice' || questionType === 'multi_choice') && (
                <div className="space-y-3 p-3 border rounded-md bg-white">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-slate-700">Opções de Resposta</span>
                    <span className="text-xs text-muted-foreground">{currentOptions.length} adicionada(s)</span>
                  </div>
                  
                  <div className="flex gap-2">
                    <Input
                      placeholder="Adicione uma opção (ex: Sim, Não, Superior, etc)"
                      value={newOption}
                      onChange={(e) => setNewOption(e.target.value)}
                      onKeyDown={handleKeyDown}
                    />
                    <Button type="button" onClick={handleAddOption} variant="secondary">
                      Adicionar
                    </Button>
                  </div>

                  {currentOptions.length > 0 ? (
                    <div className="flex flex-wrap gap-2 pt-1">
                      {currentOptions.map((opt, idx) => (
                        <Badge key={idx} variant="secondary" className="flex items-center gap-1 py-1 px-2.5 text-xs bg-slate-100 hover:bg-slate-200">
                          <span>{opt}</span>
                          <button
                            type="button"
                            onClick={() => handleRemoveOption(idx)}
                            className="text-muted-foreground hover:text-red-500 rounded-full transition-colors ml-1 focus:outline-none focus:ring-1 focus:ring-red-400"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </Badge>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground italic">
                      Insira as opções que o candidato poderá escolher (mínimo de 2 opções).
                    </p>
                  )}
                </div>
              )}

              <div className="flex justify-end space-x-2 pt-2 border-t">
                <Button type="button" variant="ghost" onClick={handleCancel}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={isSaving}>
                  {isSaving ? 'Salvando...' : 'Salvar Pergunta'}
                </Button>
              </div>
            </form>
          </Form>
        </div>
      )}
    </div>
  );
}
