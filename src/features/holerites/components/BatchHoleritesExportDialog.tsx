import React, { useState } from 'react';
import { Download, FileArchive, Loader2, CheckCircle2, Users, FileText, AlertCircle } from 'lucide-react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';

import type { Worker } from '@/shared/types/corePersonal';
import type { HoleriteEvento } from '@/shared/types/holerites';
import { useEmpresa } from '@/app/providers/EmpresaProvider';
import {
    calculateHoleriteAlta,
    calculateHoleriteRegularizacao,
    type HoleriteAltaCalculado,
    type HoleriteRegularizacaoCalculado
} from '../utils/holeriteEngine';
import { generateHoleritesBatchZip } from '../utils/pdfGenerator';

interface BatchHoleritesExportDialogProps {
    trigger?: React.ReactNode;
    workers: (Worker & { worker_beneficios_settings?: any })[];
    selectedWorkerIds: Set<string>;
    mesReferencia: string;
    eventos: HoleriteEvento[];
    dbHoursSummary?: any;
    workerMonthlyActivityMap?: Map<string, { contratante: string; cliente_nombre: string }>;
    housingBenefitsMap?: Map<string, number>;
    allDiscounts?: any[];
}

export function BatchHoleritesExportDialog({
    trigger,
    workers,
    selectedWorkerIds,
    mesReferencia,
    eventos = [],
    dbHoursSummary,
    workerMonthlyActivityMap,
    housingBenefitsMap,
    allDiscounts = [],
}: BatchHoleritesExportDialogProps) {
    const [open, setOpen] = useState(false);
    const [exportScope, setExportScope] = useState<'all_filtered' | 'selected'>(
        selectedWorkerIds.size > 0 ? 'selected' : 'all_filtered'
    );
    const [includeDetails, setIncludeDetails] = useState(true);
    const [isGenerating, setIsGenerating] = useState(false);
    const [progress, setProgress] = useState<{ current: number; total: number; currentName?: string }>({
        current: 0,
        total: 0,
    });
    const { empresas } = useEmpresa();

    // Filtra os trabalhadores que serão exportados
    const targetWorkers = exportScope === 'selected'
        ? workers.filter(w => selectedWorkerIds.has(w.id))
        : workers;

    const totalAlta = targetWorkers.filter(w => {
        const s = (w.status_seguridad || '').toLowerCase();
        return s.includes('alta') || (!s.includes('regulariz') && !s.includes('baja') && !s.includes('inativ'));
    }).length;

    const totalRegularizacao = targetWorkers.length - totalAlta;

    const handleExportBatch = async () => {
        if (targetWorkers.length === 0) {
            toast.error('Nenhum trabalhador selecionado para exportação.');
            return;
        }

        setIsGenerating(true);
        setProgress({ current: 0, total: targetWorkers.length });

        try {
            const calculatedList: Array<HoleriteAltaCalculado | HoleriteRegularizacaoCalculado> = [];

            for (let i = 0; i < targetWorkers.length; i++) {
                const w = targetWorkers[i];
                setProgress({ current: i + 1, total: targetWorkers.length, currentName: w.nome });

                const s = (w.status_seguridad || '').toLowerCase();
                const isAlta = s.includes('alta') || (!s.includes('regulariz') && !s.includes('baja') && !s.includes('inativ'));

                // Horas
                const workerEventos = eventos.filter(e => e.trabalhador_id === w.id);
                const totalHorasEvento = workerEventos.find(e => e.categoria === 'total_horas');
                const horasTrabalhadas = Number(
                    totalHorasEvento?.horas_referencia ||
                    totalHorasEvento?.referencia_dias_horas ||
                    (dbHoursSummary?.sumMap ? dbHoursSummary.sumMap.get(w.id) : 0) ||
                    0
                );

                const tarifaHora = Number(w.worker_beneficios_settings?.tarifa_hora || 0);
                const proventosAvulsos = workerEventos
                    .filter(e => e.tipo === 'provento' && e.categoria !== 'total_horas')
                    .reduce((acc, curr) => acc + Number(curr.valor || 0), 0);

                const workerExtraDiscounts = (allDiscounts || []).filter((d: any) => d.worker_id === w.id && d.reference_date?.startsWith(mesReferencia));
                const descontosList = [
                    ...workerEventos.filter(e => e.tipo === 'desconto'),
                    ...workerExtraDiscounts
                ];
                const housingBenefitAmount = housingBenefitsMap?.get(w.id) || 0;
                const activity = workerMonthlyActivityMap?.get(w.id);

                if (isAlta) {
                    const calc = calculateHoleriteAlta({
                        worker: w,
                        horasTrabalhadas,
                        tarifaHora,
                        proventosAdicionais: proventosAvulsos,
                        housingBenefitAmount,
                        eventosDescontos: descontosList,
                        mesReferencia,
                        empresas,
                        workerMonthlyActivity: activity,
                    });
                    calculatedList.push(calc);
                } else {
                    const calc = calculateHoleriteRegularizacao({
                        worker: w,
                        horasTrabalhadas,
                        tarifaHora,
                        housingBenefitAmount,
                        eventosDescontos: descontosList,
                        mesReferencia,
                        empresas,
                        workerMonthlyActivity: activity,
                    });
                    calculatedList.push(calc);
                }
            }

            // Gera o ZIP
            const zipBlob = await generateHoleritesBatchZip(calculatedList, mesReferencia, (cur, tot) => {
                setProgress({ current: cur, total: tot });
            });

            // Dispara download do ZIP
            const url = URL.createObjectURL(zipBlob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `Holerites_Kotrik_${mesReferencia}.zip`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);

            toast.success(`Pacote ZIP gerado com sucesso contendo ${calculatedList.length} holerites!`);
            setOpen(false);
        } catch (err) {
            console.error('Erro na exportação em lote:', err);
            toast.error('Ocorreu um erro ao gerar os holerites em lote.');
        } finally {
            setIsGenerating(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={(o) => { if (!isGenerating) setOpen(o); }}>
            <DialogTrigger asChild>
                {trigger || (
                    <Button variant="outline" className="border-indigo-200 text-indigo-700 bg-indigo-50/50 hover:bg-indigo-100 hover:text-indigo-800 font-medium">
                        <FileArchive className="h-4 w-4 mr-2 text-indigo-600" />
                        Gerar Holerites PDF (Lote)
                    </Button>
                )}
            </DialogTrigger>
            <DialogContent className="max-w-md">
                <DialogHeader>
                    <div className="flex items-center gap-2">
                        <div className="p-2 bg-indigo-50 dark:bg-indigo-950/60 rounded-lg text-indigo-600 dark:text-indigo-400">
                            <FileArchive className="h-5 w-5" />
                        </div>
                        <DialogTitle className="text-lg font-bold">Exportação em Lote de Holerites</DialogTitle>
                    </div>
                    <DialogDescription className="text-xs text-slate-500 pt-1">
                        Gere arquivos PDF individuais padronizados e empacotados em um único arquivo compactado (.ZIP).
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-5 py-2">
                    {/* Seleção do Escopo */}
                    <div className="space-y-3">
                        <Label className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                            Escopo dos Colaboradores
                        </Label>
                        <RadioGroup
                            value={exportScope}
                            onValueChange={(v) => setExportScope(v as any)}
                            disabled={isGenerating}
                            className="space-y-2"
                        >
                            <div className="flex items-center justify-between p-3 border rounded-lg hover:bg-slate-50 dark:hover:bg-slate-900 cursor-pointer">
                                <div className="flex items-center space-x-3">
                                    <RadioGroupItem value="all_filtered" id="scope_all" />
                                    <Label htmlFor="scope_all" className="cursor-pointer text-sm font-medium">
                                        Todos os trabalhadores listados
                                    </Label>
                                </div>
                                <span className="text-xs font-bold bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded text-slate-700 dark:text-slate-300">
                                    {workers.length}
                                </span>
                            </div>

                            <div className="flex items-center justify-between p-3 border rounded-lg hover:bg-slate-50 dark:hover:bg-slate-900 cursor-pointer">
                                <div className="flex items-center space-x-3">
                                    <RadioGroupItem
                                        value="selected"
                                        id="scope_selected"
                                        disabled={selectedWorkerIds.size === 0}
                                    />
                                    <Label
                                        htmlFor="scope_selected"
                                        className={`cursor-pointer text-sm font-medium ${selectedWorkerIds.size === 0 ? 'text-slate-400' : ''}`}
                                    >
                                        Apenas os selecionados com checkbox
                                    </Label>
                                </div>
                                <span className="text-xs font-bold bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-400 px-2 py-0.5 rounded">
                                    {selectedWorkerIds.size}
                                </span>
                            </div>
                        </RadioGroup>
                    </div>

                    {/* Resumo da Categoria */}
                    <div className="bg-slate-50 dark:bg-slate-900/60 p-3.5 rounded-lg border text-xs space-y-1.5">
                        <p className="font-semibold text-slate-700 dark:text-slate-300 flex items-center justify-between">
                            <span>Total a Processar:</span>
                            <span className="font-bold text-slate-900 dark:text-slate-100">{targetWorkers.length} holerites</span>
                        </p>
                        <div className="grid grid-cols-2 gap-2 pt-1">
                            <div className="bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/60 p-2 rounded text-emerald-800 dark:text-emerald-300">
                                <span className="block font-bold">Oficial Portugal (Alta)</span>
                                <span className="text-sm font-black">{totalAlta}</span>
                            </div>
                            <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 p-2 rounded text-amber-800 dark:text-amber-300">
                                <span className="block font-bold">Prestação (Regularização)</span>
                                <span className="text-sm font-black">{totalRegularizacao}</span>
                            </div>
                        </div>
                    </div>

                    {/* Opções Adicionais */}
                    <div className="space-y-2 pt-1">
                        <div className="flex items-center space-x-2">
                            <Checkbox
                                id="include_details"
                                checked={includeDetails}
                                onCheckedChange={(c) => setIncludeDetails(Boolean(c))}
                                disabled={isGenerating}
                            />
                            <Label htmlFor="include_details" className="text-xs cursor-pointer">
                                Incluir demonstrativo detalhado de remunerações/descontos (Página 2)
                            </Label>
                        </div>
                    </div>

                    {/* Barra de Progresso Durante a Geração */}
                    {isGenerating && (
                        <div className="space-y-2 p-3 bg-indigo-50/60 dark:bg-indigo-950/40 border border-indigo-200/70 rounded-lg">
                            <div className="flex justify-between text-xs font-semibold text-indigo-900 dark:text-indigo-200">
                                <span className="flex items-center gap-1.5">
                                    <Loader2 className="h-3.5 w-3.5 animate-spin text-indigo-600" />
                                    Gerando arquivos PDF...
                                </span>
                                <span>{progress.current} de {progress.total}</span>
                            </div>
                            <Progress value={(progress.current / Math.max(1, progress.total)) * 100} className="h-2" />
                            {progress.currentName && (
                                <p className="text-[11px] text-slate-500 truncate">
                                    Processando: {progress.currentName}
                                </p>
                            )}
                        </div>
                    )}
                </div>

                <DialogFooter className="gap-2 sm:gap-0">
                    <Button
                        variant="outline"
                        onClick={() => setOpen(false)}
                        disabled={isGenerating}
                        className="text-xs h-9"
                    >
                        Cancelar
                    </Button>
                    <Button
                        onClick={handleExportBatch}
                        disabled={isGenerating || targetWorkers.length === 0}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs h-9 font-semibold shadow-sm"
                    >
                        {isGenerating ? (
                            <>
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                Gerando ZIP...
                            </>
                        ) : (
                            <>
                                <Download className="h-4 w-4 mr-2" />
                                Baixar Pacote ZIP ({targetWorkers.length})
                            </>
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
