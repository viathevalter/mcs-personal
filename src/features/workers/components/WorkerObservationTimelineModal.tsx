import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { pt, es } from 'date-fns/locale';
import { Clock, User, Calendar, Plus, MessageSquare, ShieldAlert, History, Loader2, Sparkles, Tag } from 'lucide-react';
import { supabase } from '@/shared/supabase/client';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { RichTextObservationInput, RenderFormattedObservation } from './RichTextObservationInput';
import { toast } from 'sonner';

interface WorkerObservationTimelineModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    workerId: string;
    workerName?: string;
    codColab?: string;
}

export function WorkerObservationTimelineModal({
    open,
    onOpenChange,
    workerId,
    workerName,
    codColab
}: WorkerObservationTimelineModalProps) {
    const queryClient = useQueryClient();
    const [isAddingNew, setIsAddingNew] = useState(false);
    const [newComment, setNewComment] = useState('');
    const [noteCategory, setNoteCategory] = useState<'OCORRENCIA' | 'GERAL' | 'DESEMPENHO'>('OCORRENCIA');

    // Fetch complete status & observations history for the worker
    const { data: history = [], isLoading } = useQuery({
        queryKey: ['worker_observation_timeline', workerId],
        enabled: open && !!workerId,
        queryFn: async () => {
            const { data, error } = await supabase
                .schema('core_personal')
                .from('worker_status_history')
                .select(`
                    *,
                    changed_by_user:changed_by (
                        email,
                        raw_user_meta_data
                    )
                `)
                .eq('worker_id', workerId)
                .order('created_at', { ascending: false });

            if (error) throw error;

            return (data || []).map((row: any) => {
                const meta = row.changed_by_user?.raw_user_meta_data;
                const authorName = meta?.full_name || meta?.name || row.changed_by_user?.email || 'Usuário do Sistema';
                return {
                    ...row,
                    author_name: authorName
                };
            });
        }
    });

    // Mutation to insert a direct observation note
    const addNoteMutation = useMutation({
        mutationFn: async () => {
            if (!newComment.trim()) throw new Error('Digite a observação para salvar.');

            const user = (await supabase.auth.getUser()).data.user;
            const changeType = noteCategory === 'OCORRENCIA' ? 'OCORRÊNCIA / FÁBRICA' : 'ANOTAÇÃO';

            const { error } = await supabase
                .schema('core_personal')
                .from('worker_status_history')
                .insert({
                    worker_id: workerId,
                    change_type: changeType,
                    old_value: 'N/A',
                    new_value: noteCategory,
                    effective_date: format(new Date(), 'yyyy-MM-dd'),
                    comments: newComment,
                    changed_by: user?.id
                });

            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['worker_observation_timeline', workerId] });
            queryClient.invalidateQueries({ queryKey: ['worker_status_history', workerId] });
            toast.success('Anotação registrada na linha do tempo!');
            setNewComment('');
            setIsAddingNew(false);
        },
        onError: (err: any) => {
            toast.error(err.message || 'Erro ao salvar anotação.');
        }
    });

    const formatTimestamp = (dateStr: string) => {
        try {
            const date = new Date(dateStr);
            return {
                dateFormatted: format(date, 'dd/MM/yyyy'),
                timeFormatted: format(date, 'HH:mm:ss')
            };
        } catch {
            return { dateFormatted: dateStr, timeFormatted: '' };
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-[750px] max-h-[90vh] flex flex-col p-0 gap-0 overflow-hidden">
                <DialogHeader className="p-6 pb-4 border-b bg-muted/20">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="p-2.5 bg-primary/10 text-primary rounded-xl">
                                <History className="h-6 w-6" />
                            </div>
                            <div>
                                <DialogTitle className="text-lg font-bold flex items-center gap-2">
                                    <span>Timeline & Histórico de Observações</span>
                                    {codColab && (
                                        <Badge variant="outline" className="font-mono text-xs">
                                            {codColab}
                                        </Badge>
                                    )}
                                </DialogTitle>
                                <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                                    Acompanhamento completo de anotações, ocorrências e alterações com data, hora e responsável.
                                </DialogDescription>
                            </div>
                        </div>

                        {!isAddingNew && (
                            <Button
                                size="sm"
                                className="gap-1.5 font-medium shadow-sm"
                                onClick={() => setIsAddingNew(true)}
                            >
                                <Plus className="h-4 w-4" /> Nova Anotação
                            </Button>
                        )}
                    </div>

                    {workerName && (
                        <div className="mt-3 p-2 px-3 rounded-lg bg-background border text-xs font-semibold text-foreground flex items-center justify-between">
                            <span>Trabalhador: <strong className="text-primary">{workerName}</strong></span>
                            <span className="text-muted-foreground font-normal">Total de Registros: <strong>{history.length}</strong></span>
                        </div>
                    )}
                </DialogHeader>

                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                    {/* Add New Observation Section */}
                    {isAddingNew && (
                        <div className="p-4 rounded-xl border-2 border-primary/30 bg-primary/5 space-y-3 animate-in fade-in slide-in-from-top-2 duration-200">
                            <div className="flex items-center justify-between">
                                <span className="text-xs font-bold text-primary flex items-center gap-1.5">
                                    <Sparkles className="h-4 w-4" /> Registrar Nova Anotação / Ocorrência
                                </span>
                                <div className="flex items-center gap-2">
                                    <select
                                        value={noteCategory}
                                        onChange={(e: any) => setNoteCategory(e.target.value)}
                                        className="text-xs border border-input rounded-md px-2 py-1 bg-background font-medium"
                                    >
                                        <option value="OCORRENCIA">⚠️ Ocorrência / Fábrica</option>
                                        <option value="GERAL">💬 Anotação Geral</option>
                                        <option value="DESEMPENHO">⭐ Desempenho / Elogio</option>
                                    </select>
                                </div>
                            </div>

                            <RichTextObservationInput
                                value={newComment}
                                onChange={setNewComment}
                                placeholder="Digite detalhes da anotação (ex: briga na fábrica, avaria em alojamento, aviso da gerência)..."
                            />

                            <div className="flex items-center justify-end gap-2 pt-1">
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => {
                                        setIsAddingNew(false);
                                        setNewComment('');
                                    }}
                                >
                                    Cancelar
                                </Button>
                                <Button
                                    type="button"
                                    size="sm"
                                    disabled={addNoteMutation.isPending || !newComment.trim()}
                                    onClick={() => addNoteMutation.mutate()}
                                >
                                    {addNoteMutation.isPending ? (
                                        <>
                                            <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> Salvando...
                                        </>
                                    ) : (
                                        'Salvar Anotação'
                                    )}
                                </Button>
                            </div>
                        </div>
                    )}

                    {/* Timeline List */}
                    {isLoading ? (
                        <div className="flex flex-col items-center justify-center py-12 text-muted-foreground gap-2">
                            <Loader2 className="h-6 w-6 animate-spin text-primary" />
                            <span className="text-xs font-medium">Carregando histórico e observações...</span>
                        </div>
                    ) : history.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-12 text-center border-2 border-dashed rounded-xl p-8 text-muted-foreground">
                            <MessageSquare className="h-10 w-10 text-muted-foreground/40 mb-2" />
                            <h4 className="text-sm font-semibold text-foreground">Nenhuma observação registrada</h4>
                            <p className="text-xs max-w-sm mt-1">
                                Nenhuma anotação ou alteração foi registrada para este trabalhador ainda.
                            </p>
                        </div>
                    ) : (
                        <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-[2px] before:bg-border">
                            {history.map((item: any, idx: number) => {
                                const { dateFormatted, timeFormatted } = formatTimestamp(item.created_at);
                                const isOcorrencia = item.change_type?.includes('OCORRÊNCIA') || item.comments?.includes('<alert>');
                                const isSeguridade = item.change_type === 'SEGURIDADE';

                                return (
                                    <div key={item.id || idx} className="relative group">
                                        {/* Timeline Node Icon */}
                                        <div className={`absolute -left-[31px] top-1 h-5 w-5 rounded-full border-2 bg-background flex items-center justify-center text-[10px] shadow-sm transition-transform group-hover:scale-110 ${
                                            isOcorrencia ? 'border-rose-500 text-rose-600 bg-rose-50' :
                                            isSeguridade ? 'border-amber-500 text-amber-600 bg-amber-50' :
                                            'border-primary text-primary bg-primary/10'
                                        }`}>
                                            <div className="h-2 w-2 rounded-full bg-current" />
                                        </div>

                                        {/* Card */}
                                        <div className="p-4 rounded-xl border bg-card text-card-foreground shadow-sm hover:shadow transition-all">
                                            {/* Top Meta: Date, Time, User */}
                                            <div className="flex flex-wrap items-center justify-between gap-2 pb-2 mb-2 border-b border-border/50 text-xs">
                                                <div className="flex items-center gap-3 font-semibold text-foreground">
                                                    <span className="flex items-center gap-1">
                                                        <Calendar className="h-3.5 w-3.5 text-primary" /> {dateFormatted}
                                                    </span>
                                                    {timeFormatted && (
                                                        <span className="flex items-center gap-1 text-muted-foreground font-mono">
                                                            <Clock className="h-3.5 w-3.5 text-primary/70" /> {timeFormatted}
                                                        </span>
                                                    )}
                                                </div>

                                                <div className="flex items-center gap-2">
                                                    <Badge variant="outline" className={`text-[10px] uppercase font-bold py-0.5 ${
                                                        isOcorrencia ? 'bg-rose-50 text-rose-700 border-rose-300 dark:bg-rose-950/50' :
                                                        isSeguridade ? 'bg-amber-50 text-amber-700 border-amber-300 dark:bg-amber-950/50' :
                                                        'bg-sky-50 text-sky-700 border-sky-300 dark:bg-sky-950/50'
                                                    }`}>
                                                        {item.change_type}
                                                    </Badge>
                                                    
                                                    <span className="flex items-center gap-1 text-[11px] font-medium text-muted-foreground bg-muted/60 px-2 py-0.5 rounded-full">
                                                        <User className="h-3 w-3" /> Autor: <strong className="text-foreground">{item.author_name}</strong>
                                                    </span>
                                                </div>
                                            </div>

                                            {/* Status Transition Details if present */}
                                            {(item.old_value !== 'N/A' && (item.old_value || item.new_value)) && (
                                                <div className="text-xs mb-2 p-1.5 px-2.5 rounded-md bg-muted/30 flex items-center gap-2 font-medium">
                                                    <Tag className="h-3.5 w-3.5 text-muted-foreground" />
                                                    <span>Alteração de Status:</span>
                                                    <span className="line-through text-muted-foreground">{item.old_value || 'Sem Status'}</span>
                                                    <span>➔</span>
                                                    <span className="text-primary font-bold">{item.new_value}</span>
                                                </div>
                                            )}

                                            {/* Comment Content */}
                                            <div className="mt-2 text-sm text-foreground/90">
                                                <RenderFormattedObservation content={item.comments} />
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}
