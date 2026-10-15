import React, { useState, useEffect } from 'react';
import { Clock, Banknote, RotateCcw, Calculator, CheckCircle2 } from 'lucide-react';
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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import type { Worker } from '@/shared/types/corePersonal';
import { saveWorkerMonthlyOverride } from '../api/holeritesApi';
import { HOLERITE_EVENTOS_QUERY_KEY } from '../hooks/useHoleriteEventos';
import { WORKERS_HOLERITES_QUERY_KEY } from '../hooks/useWorkersForHolerites';

interface AdjustHoursTariffDialogProps {
    worker: Worker & { worker_beneficios_settings?: any };
    mesReferencia: string;
    empresaName?: string;
    empresaId?: string;
    clienteNombre?: string;
    effectiveHours: number;
    faturamentoHours: number;
    isManualHours: boolean;
    effectiveTarifa: number;
    baseTarifa: number;
    isManualTariff: boolean;
    initialMotivo?: string;
    trigger: React.ReactNode;
}

export function AdjustHoursTariffDialog({
    worker,
    mesReferencia,
    empresaName,
    empresaId,
    clienteNombre,
    effectiveHours,
    faturamentoHours,
    isManualHours,
    effectiveTarifa,
    baseTarifa,
    isManualTariff,
    initialMotivo = '',
    trigger,
}: AdjustHoursTariffDialogProps) {
    const [open, setOpen] = useState(false);
    const [hoursStr, setHoursStr] = useState<string>(String(effectiveHours || 0));
    const [tarifaStr, setTarifaStr] = useState<string>(String(effectiveTarifa || 0));
    const [keepManualHours, setKeepManualHours] = useState<boolean>(isManualHours);
    const [updateCadastroTarifa, setUpdateCadastroTarifa] = useState<boolean>(true);
    const [motivo, setMotivo] = useState<string>(initialMotivo);
    const [isSaving, setIsSaving] = useState(false);

    const queryClient = useQueryClient();

    useEffect(() => {
        if (open) {
            setHoursStr(String(Math.round((effectiveHours + Number.EPSILON) * 100) / 100));
            setTarifaStr(String(Number(effectiveTarifa || 0).toFixed(2)));
            setKeepManualHours(isManualHours);
            setUpdateCadastroTarifa(true);
            const cleanMotivo = (initialMotivo || '').replace(/^\[[^\]]+\]\s*/, '');
            setMotivo(
                cleanMotivo === 'Ajuste manual de horas na folha' || cleanMotivo === 'Ajuste manual de tarifa na folha'
                    ? ''
                    : cleanMotivo
            );
        }
    }, [open, effectiveHours, effectiveTarifa, isManualHours, initialMotivo]);

    const parsedHours = parseFloat(hoursStr.replace(',', '.'));
    const validHours = isNaN(parsedHours) || parsedHours < 0 ? 0 : parsedHours;

    const parsedTarifa = parseFloat(tarifaStr.replace(',', '.'));
    const validTarifa = isNaN(parsedTarifa) || parsedTarifa < 0 ? 0 : parsedTarifa;

    const hoursDiffersFromFaturamento = Math.abs(validHours - (faturamentoHours || 0)) > 0.005;
    const willSaveManualHours = keepManualHours || hoursDiffersFromFaturamento;

    const tarifaDiffersFromBase = Math.abs(validTarifa - (baseTarifa || 0)) > 0.005;
    const willSaveManualTarifa = isManualTariff || tarifaDiffersFromBase;

    const simulatedBase = Math.round((validHours * validTarifa + Number.EPSILON) * 100) / 100;
    const faturamentoBase = Math.round(((faturamentoHours || 0) * (baseTarifa || 0) + Number.EPSILON) * 100) / 100;

    const invalidateAll = async () => {
        await Promise.all([
            queryClient.invalidateQueries({ queryKey: [HOLERITE_EVENTOS_QUERY_KEY, mesReferencia] }),
            queryClient.invalidateQueries({ queryKey: [HOLERITE_EVENTOS_QUERY_KEY] }),
            queryClient.invalidateQueries({ queryKey: [WORKERS_HOLERITES_QUERY_KEY] }),
        ]);
    };

    const handleSave = async () => {
        setIsSaving(true);
        try {
            await saveWorkerMonthlyOverride({
                workerId: worker.id,
                empresaId,
                empresaName,
                mesReferencia,
                manualHours: willSaveManualHours ? validHours : null,
                manualTarifa: willSaveManualTarifa ? validTarifa : null,
                updateCadastroTarifa: validTarifa > 0 && updateCadastroTarifa,
                motivo: motivo.trim() || undefined,
            });

            await invalidateAll();
            toast.success(`Ajuste de horas/tarifa salvo para ${worker.nome}!`);
            setOpen(false);
        } catch (err: any) {
            console.error('Erro ao salvar ajuste de horas/tarifa:', err);
            toast.error('Erro ao salvar ajuste: ' + (err.message || 'Erro desconhecido'));
        } finally {
            setIsSaving(false);
        }
    };

    const handleResetToAutomatic = async () => {
        setIsSaving(true);
        try {
            await saveWorkerMonthlyOverride({
                workerId: worker.id,
                empresaId,
                empresaName,
                mesReferencia,
                manualHours: null,
                manualTarifa: null,
                updateCadastroTarifa: false,
            });

            await invalidateAll();
            toast.success('Horas e tarifa restauradas para o cálculo automático do faturamento!');
            setOpen(false);
        } catch (err: any) {
            console.error('Erro ao restaurar horas/tarifa:', err);
            toast.error('Erro ao restaurar padrão: ' + (err.message || 'Erro desconhecido'));
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={(v) => { if (!isSaving) setOpen(v); }}>
            <DialogTrigger asChild>
                {trigger}
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]" onClick={(e) => e.stopPropagation()}>
                <DialogHeader>
                    <div className="flex items-center gap-2.5">
                        <div className="p-2 bg-indigo-50 dark:bg-indigo-950/60 rounded-lg text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-900">
                            <Calculator className="h-5 w-5" />
                        </div>
                        <div>
                            <DialogTitle className="text-base font-bold">
                                Ajustar Horas e Tarifa na Folha
                            </DialogTitle>
                            <DialogDescription className="text-xs">
                                Ajuste diretamente a quantidade de horas a pagar no mês (1 a 30/31) e/ou a tarifa horária.
                            </DialogDescription>
                        </div>
                    </div>
                </DialogHeader>

                <div className="space-y-4 py-2">
                    {/* Worker & Context Banner */}
                    <div className="bg-slate-50 dark:bg-slate-900/70 p-3 rounded-lg border border-slate-200 dark:border-slate-800 space-y-1 text-xs">
                        <div className="flex items-center justify-between gap-2">
                            <span className="font-bold text-slate-900 dark:text-white text-sm">{worker.nome}</span>
                            <Badge variant="outline" className="text-[10px] font-bold bg-indigo-50 text-indigo-700 border-indigo-200">
                                {mesReferencia}
                            </Badge>
                        </div>
                        <div className="flex items-center gap-2 text-muted-foreground flex-wrap">
                            {empresaName && empresaName !== '-' && (
                                <span>Empresa: <strong className="text-slate-700 dark:text-slate-300">{empresaName}</strong></span>
                            )}
                            {clienteNombre && clienteNombre !== '-' && (
                                <span>• Cliente: <strong className="text-slate-700 dark:text-slate-300">{clienteNombre}</strong></span>
                            )}
                        </div>
                    </div>

                    {/* Grid: Horas & Tarifa */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {/* Coluna 1: Total de Horas */}
                        <div className="space-y-2 p-3 rounded-lg border border-amber-200/80 bg-amber-50/30 dark:bg-amber-950/20 dark:border-amber-900/50">
                            <div className="flex items-center justify-between">
                                <Label htmlFor="manual-hours" className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                                    <Clock className="h-3.5 w-3.5 text-amber-600" />
                                    Total de Horas (Folha)
                                </Label>
                                {willSaveManualHours ? (
                                    <Badge className="bg-purple-100 text-purple-800 border-purple-300 text-[9px] py-0 px-1.5 font-bold">
                                        Manual
                                    </Badge>
                                ) : (
                                    <Badge variant="outline" className="text-[9px] py-0 px-1.5">
                                        Faturamento
                                    </Badge>
                                )}
                            </div>

                            <Input
                                id="manual-hours"
                                type="number"
                                step="0.5"
                                min="0"
                                value={hoursStr}
                                onChange={(e) => {
                                    setHoursStr(e.target.value);
                                    setKeepManualHours(true);
                                }}
                                className="h-9 font-bold text-base bg-white dark:bg-slate-900 border-amber-300 focus-visible:ring-amber-500"
                            />

                            <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-0.5">
                                <span>Faturamento: <strong>{Number(faturamentoHours || 0).toLocaleString('pt-BR', { maximumFractionDigits: 2 })} h</strong></span>
                                {willSaveManualHours && (
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setHoursStr(String(Math.round(((faturamentoHours || 0) + Number.EPSILON) * 100) / 100));
                                            setKeepManualHours(false);
                                        }}
                                        className="text-indigo-600 hover:text-indigo-800 dark:text-indigo-400 font-semibold underline cursor-pointer"
                                    >
                                        Usar {Number(faturamentoHours || 0).toLocaleString('pt-BR', { maximumFractionDigits: 2 })}h
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* Coluna 2: Tarifa por Hora */}
                        <div className="space-y-2 p-3 rounded-lg border border-emerald-200/80 bg-emerald-50/30 dark:bg-emerald-950/20 dark:border-emerald-900/50">
                            <div className="flex items-center justify-between">
                                <Label htmlFor="manual-tarifa" className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                                    <Banknote className="h-3.5 w-3.5 text-emerald-600" />
                                    Tarifa Hora (€ / h)
                                </Label>
                                {tarifaDiffersFromBase && (
                                    <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300 text-[9px] py-0 px-1.5 font-bold">
                                        Alterada
                                    </Badge>
                                )}
                            </div>

                            <Input
                                id="manual-tarifa"
                                type="number"
                                step="0.01"
                                min="0"
                                value={tarifaStr}
                                onChange={(e) => setTarifaStr(e.target.value)}
                                className="h-9 font-bold text-base bg-white dark:bg-slate-900 border-emerald-300 focus-visible:ring-emerald-500"
                            />

                            <div className="text-[11px] text-muted-foreground pt-0.5">
                                Cadastro atual: <strong>€ {Number(baseTarifa || 0).toFixed(2)}/h</strong>
                            </div>
                        </div>
                    </div>

                    {/* Checkbox: Atualizar tarifa no cadastro permanente */}
                    <div className="flex items-start space-x-2.5 bg-slate-50 dark:bg-slate-900/50 p-2.5 rounded-lg border border-slate-200/70 dark:border-slate-800">
                        <Checkbox
                            id="update-cadastro-tarifa"
                            checked={updateCadastroTarifa}
                            onCheckedChange={(checked) => setUpdateCadastroTarifa(Boolean(checked))}
                            className="mt-0.5"
                        />
                        <div className="grid gap-0.5 leading-none">
                            <label
                                htmlFor="update-cadastro-tarifa"
                                className="text-xs font-semibold text-slate-800 dark:text-slate-200 cursor-pointer"
                            >
                                Atualizar também a tarifa padrão no cadastro do trabalhador
                            </label>
                            <p className="text-[11px] text-muted-foreground">
                                Mantendo marcado, a tarifa de € {validTarifa.toFixed(2)}/h passa a valer também para os próximos meses.
                            </p>
                        </div>
                    </div>

                    {/* Observação / Motivo */}
                    <div className="space-y-1.5">
                        <Label htmlFor="motivo-ajuste" className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                            Observação / Motivo do Ajuste (Opcional)
                        </Label>
                        <Input
                            id="motivo-ajuste"
                            placeholder="Ex: Ciclo de medição 20 a 20 (Sarivert) - horas reais de 1 a 30"
                            value={motivo}
                            onChange={(e) => setMotivo(e.target.value)}
                            className="h-8 text-xs"
                        />
                    </div>

                    {/* Resumo do Vencimento Base Calculado */}
                    <div className="p-3.5 bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-900 rounded-xl flex items-center justify-between">
                        <div className="space-y-0.5">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-700 dark:text-indigo-300 block">
                                Remuneração por Horas na Folha
                            </span>
                            <span className="text-xs text-slate-600 dark:text-slate-400 font-medium">
                                {validHours.toLocaleString('pt-BR', { maximumFractionDigits: 2 })} h × € {validTarifa.toFixed(2)}/h
                            </span>
                            {(willSaveManualHours || tarifaDiffersFromBase) && (
                                <span className="text-[10px] text-muted-foreground block">
                                    Sem ajuste (Faturamento): € {faturamentoBase.toFixed(2)}
                                </span>
                            )}
                        </div>
                        <div className="text-right">
                            <span className="text-xl font-black text-indigo-700 dark:text-indigo-400 font-mono">
                                € {simulatedBase.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </span>
                        </div>
                    </div>
                </div>

                <DialogFooter className="flex flex-col sm:flex-row sm:justify-between gap-2 pt-2">
                    <div>
                        {(isManualHours || isManualTariff) && (
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={handleResetToAutomatic}
                                disabled={isSaving}
                                className="w-full sm:w-auto text-xs border-amber-300 text-amber-800 hover:bg-amber-50"
                                title="Remover ajuste manual e voltar para as horas automáticas do faturamento"
                            >
                                <RotateCcw className="h-3.5 w-3.5 mr-1.5" />
                                Restaurar Faturamento
                            </Button>
                        )}
                    </div>
                    <div className="flex items-center gap-2">
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => setOpen(false)}
                            disabled={isSaving}
                            className="text-xs"
                        >
                            Cancelar
                        </Button>
                        <Button
                            type="button"
                            size="sm"
                            onClick={handleSave}
                            disabled={isSaving}
                            className="text-xs bg-indigo-600 hover:bg-indigo-700 text-white font-semibold"
                        >
                            <CheckCircle2 className="h-3.5 w-3.5 mr-1.5" />
                            {isSaving ? 'Salvando...' : 'Salvar Ajuste na Folha'}
                        </Button>
                    </div>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
