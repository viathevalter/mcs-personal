import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Loader2, History, Briefcase, ShieldCheck, Calendar, User } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { getWorkerCompleteTariffTimeline } from '../api/tariffGovernanceApi';

interface WorkerTariffTimelineCardProps {
    workerId: string;
}

export function WorkerTariffTimelineCard({ workerId }: WorkerTariffTimelineCardProps) {
    const { data: events = [], isLoading } = useQuery({
        queryKey: ['worker-complete-tariff-timeline', workerId],
        queryFn: () => getWorkerCompleteTariffTimeline(workerId),
        staleTime: 30 * 1000
    });

    return (
        <div className="mt-4 bg-white dark:bg-slate-900 p-4 rounded-xl border border-indigo-100 dark:border-indigo-900/50 shadow-sm space-y-3">
            <div className="flex items-center justify-between pb-2 border-b">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-2">
                    <History className="h-4 w-4 text-indigo-500" />
                    Histórico Completo de Tarifas & Contratações ({events.length})
                </span>
                <span className="text-[11px] text-muted-foreground">
                    Contratações por cliente + alterações autorizadas por termo
                </span>
            </div>

            {isLoading ? (
                <div className="py-4 flex items-center justify-center gap-2 text-xs text-muted-foreground">
                    <Loader2 className="w-4 h-4 animate-spin text-indigo-500" />
                    Carregando linha do tempo...
                </div>
            ) : events.length === 0 ? (
                <div className="py-3 text-xs text-muted-foreground italic">
                    Nenhum histórico de contratação ou alteração de tarifa registrado para este trabalhador.
                </div>
            ) : (
                <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                    {events.map((ev) => (
                        <div
                            key={ev.id}
                            className="p-2.5 rounded-lg border bg-slate-50/70 dark:bg-slate-950/40 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs"
                        >
                            <div className="space-y-1 min-w-0">
                                <div className="flex flex-wrap items-center gap-1.5">
                                    {ev.kind === 'contratacao' && (
                                        <Badge className="bg-sky-100 text-sky-800 border-sky-200 hover:bg-sky-100 text-[10px] gap-1">
                                            <Briefcase className="w-3 h-3" /> Contratação
                                        </Badge>
                                    )}
                                    {ev.kind === 'termo_audit' && (
                                        <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 hover:bg-emerald-100 text-[10px] gap-1">
                                            <ShieldCheck className="w-3 h-3" /> Alteração / Termo
                                        </Badge>
                                    )}
                                    {ev.kind === 'vigencia_agendada' && (
                                        <Badge className="bg-indigo-100 text-indigo-800 border-indigo-200 hover:bg-indigo-100 text-[10px] gap-1">
                                            <Calendar className="w-3 h-3" /> Vigência Folha
                                        </Badge>
                                    )}

                                    <span className="font-bold text-slate-800 dark:text-slate-200 truncate">
                                        {ev.title}
                                    </span>

                                    {ev.codigoTermo && (
                                        <Badge variant="outline" className="font-mono text-[10px]">
                                            {ev.codigoTermo}
                                        </Badge>
                                    )}

                                    {ev.status && (
                                        <Badge variant="secondary" className="text-[10px] uppercase">
                                            {ev.status}
                                        </Badge>
                                    )}
                                </div>

                                <div className="flex flex-wrap items-center gap-3 text-[11px] text-muted-foreground">
                                    <span>
                                        {new Date(ev.date).toLocaleString('pt-PT', { dateStyle: 'short', timeStyle: 'short' })}
                                    </span>
                                    {ev.subtitle && <span>• {ev.subtitle}</span>}
                                    {ev.mesVigencia && (
                                        <span className="text-indigo-700 dark:text-indigo-400 font-semibold">
                                            • Comp.: {ev.mesVigencia}
                                        </span>
                                    )}
                                    {ev.actorName && (
                                        <span className="inline-flex items-center gap-1">
                                            • <User className="w-3 h-3" /> {ev.actorName}
                                        </span>
                                    )}
                                    {ev.authorizerName && (
                                        <span>• Aut.: <strong>{ev.authorizerName}</strong></span>
                                    )}
                                </div>
                            </div>

                            <div className="shrink-0 text-right font-mono">
                                {ev.tarifaAnterior !== undefined ? (
                                    <span className="text-xs">
                                        <span className="text-slate-400">€ {ev.tarifaAnterior.toFixed(2)}</span>
                                        {' → '}
                                        <span className="font-bold text-emerald-600 dark:text-emerald-400">
                                            € {ev.tarifaNova.toFixed(2)}/h
                                        </span>
                                    </span>
                                ) : (
                                    <span className="font-bold text-indigo-700 dark:text-indigo-400">
                                        € {ev.tarifaNova.toFixed(2)}/h
                                    </span>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
