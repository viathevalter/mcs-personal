import React, { useState, useEffect } from 'react';
import { Clock, Banknote, RotateCcw, Calculator, CheckCircle2, Building2 } from 'lucide-react';
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
import { Badge } from '@/components/ui/badge';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import type { Worker } from '@/shared/types/corePersonal';
import { saveWorkerMonthlyOverride, type ClientHoursTariffOverride } from '../api/holeritesApi';
import { HOLERITE_EVENTOS_QUERY_KEY } from '../hooks/useHoleriteEventos';
import { WORKERS_HOLERITES_QUERY_KEY } from '../hooks/useWorkersForHolerites';

interface ClientBreakdownInput {
    clientName: string;
    hours: number;
    tarifaHora?: number;
}

interface AdjustHoursTariffDialogProps {
    worker: Worker & { worker_beneficios_settings?: any };
    mesReferencia: string;
    empresaName?: string;
    empresaId?: string;
    clienteNombre?: string;
    effectiveHours?: number;
    currentHours?: number;
    faturamentoHours: number;
    isManualHours: boolean;
    effectiveTarifa?: number;
    currentTariff?: number;
    baseTarifa?: number;
    baseTariff?: number;
    isManualTariff: boolean;
    initialMotivo?: string;
    currentMotivo?: string;
    clientHoursBreakdown?: ClientBreakdownInput[];
    faturamentoClientBreakdown?: Array<{ clientName: string; hours: number }>;
    defaultFocus?: 'hours' | 'tariff';
    trigger: React.ReactNode;
}

interface EditableClientRow {
    clientName: string;
    hoursStr: string;
    tarifaStr: string;
    faturamentoHours: number;
}

export function AdjustHoursTariffDialog({
    worker,
    mesReferencia,
    empresaName,
    empresaId,
    clienteNombre,
    effectiveHours,
    currentHours,
    faturamentoHours,
    isManualHours,
    effectiveTarifa,
    currentTariff,
    baseTarifa,
    baseTariff,
    isManualTariff,
    initialMotivo,
    currentMotivo,
    clientHoursBreakdown = [],
    faturamentoClientBreakdown = [],
    defaultFocus = 'hours',
    trigger,
}: AdjustHoursTariffDialogProps) {
    const resolvedCadastroTarifa = Number(
        baseTarifa ?? baseTariff ?? worker?.worker_beneficios_settings?.tarifa_hora ?? 0
    );
    const resolvedEffectiveTarifa = Number(
        effectiveTarifa ?? currentTariff ?? resolvedCadastroTarifa ?? 0
    );
    const resolvedEffectiveHours = Number(
        effectiveHours ?? currentHours ?? faturamentoHours ?? 0
    );
    const resolvedMotivo = initialMotivo ?? currentMotivo ?? '';

    const isMultiClient = clientHoursBreakdown.length > 1;

    const formatCleanHoursInput = (val: number) => {
        const num = Number(val || 0);
        if (isNaN(num)) return '0';
        const rounded = Math.round((num + Number.EPSILON) * 100) / 100;
        return String(rounded);
    };

    const buildInitialClientRows = (): EditableClientRow[] => {
        return clientHoursBreakdown.map(cb => {
            const fatMatch = faturamentoClientBreakdown.find(
                f => f.clientName.trim().toLowerCase() === cb.clientName.trim().toLowerCase()
            );
            const rate = Number(cb.tarifaHora ?? resolvedEffectiveTarifa ?? resolvedCadastroTarifa ?? 0);
            return {
                clientName: cb.clientName,
                hoursStr: formatCleanHoursInput(cb.hours),
                tarifaStr: rate.toFixed(2),
                faturamentoHours: fatMatch ? Number(fatMatch.hours || 0) : Number(cb.hours || 0)
            };
        });
    };

    const [open, setOpen] = useState(false);
    const [hoursStr, setHoursStr] = useState<string>(() => formatCleanHoursInput(resolvedEffectiveHours));
    const [tarifaStr, setTarifaStr] = useState<string>(() => resolvedEffectiveTarifa.toFixed(2));
    const [keepManualHours, setKeepManualHours] = useState<boolean>(isManualHours);
    const [clientRows, setClientRows] = useState<EditableClientRow[]>(buildInitialClientRows);
    const [motivo, setMotivo] = useState<string>(resolvedMotivo);
    const [isSaving, setIsSaving] = useState(false);

    const queryClient = useQueryClient();

    useEffect(() => {
        if (open) {
            setHoursStr(formatCleanHoursInput(resolvedEffectiveHours));
            setTarifaStr(resolvedEffectiveTarifa.toFixed(2));
            setKeepManualHours(isManualHours);
            setClientRows(buildInitialClientRows());
            const cleanMotivo = (resolvedMotivo || '').replace(/^\[[^\]]+\]\s*/, '');
            setMotivo(
                cleanMotivo === 'Ajuste manual de horas na folha' || cleanMotivo === 'Ajuste manual de tarifa na folha'
                    ? ''
                    : cleanMotivo
            );
        }
    }, [open, resolvedEffectiveHours, resolvedEffectiveTarifa, isManualHours, resolvedMotivo, clientHoursBreakdown.length]);

    const parseSafeNum = (val: string) => {
        const n = parseFloat(String(val).replace(',', '.'));
        return isNaN(n) || n < 0 ? 0 : n;
    };

    // Single-client computed values
    const validHours = parseSafeNum(hoursStr);
    const validTarifa = parseSafeNum(tarifaStr);
    const hoursDiffersFromFaturamento = Math.abs(validHours - Number(faturamentoHours || 0)) > 0.005;
    const willSaveManualHours = keepManualHours || hoursDiffersFromFaturamento;
    const tarifaDiffersFromBase = Math.abs(validTarifa - resolvedCadastroTarifa) > 0.005;
    const willSaveManualTarifa = tarifaDiffersFromBase;

    // Multi-client computed values
    const parsedClientRows: ClientHoursTariffOverride[] = clientRows.map(r => ({
        clientName: r.clientName,
        hours: parseSafeNum(r.hoursStr),
        tarifaHora: parseSafeNum(r.tarifaStr)
    }));

    const multiTotalHours = Math.round((parsedClientRows.reduce((s, r) => s + r.hours, 0) + Number.EPSILON) * 100) / 100;
    const multiTotalBase = Math.round((parsedClientRows.reduce((s, r) => s + r.hours * r.tarifaHora, 0) + Number.EPSILON) * 100) / 100;

    const simulatedBase = isMultiClient
        ? multiTotalBase
        : Math.round((validHours * validTarifa + Number.EPSILON) * 100) / 100;

    const faturamentoBase = Math.round(((Number(faturamentoHours || 0)) * resolvedCadastroTarifa + Number.EPSILON) * 100) / 100;

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
            if (isMultiClient) {
                const anyDiffFromAuto = parsedClientRows.some((r, idx) => {
                    const fatH = clientRows[idx]?.faturamentoHours ?? r.hours;
                    return Math.abs(r.hours - fatH) > 0.005 || Math.abs(r.tarifaHora - resolvedCadastroTarifa) > 0.005;
                });

                await saveWorkerMonthlyOverride({
                    workerId: worker.id,
                    empresaId,
                    empresaName,
                    mesReferencia,
                    manualHours: null,
                    manualTarifa: null,
                    clientOverrides: anyDiffFromAuto ? parsedClientRows : null,
                    updateCadastroTarifa: false,
                    motivo: motivo.trim() || undefined,
                });
            } else {
                await saveWorkerMonthlyOverride({
                    workerId: worker.id,
                    empresaId,
                    empresaName,
                    mesReferencia,
                    manualHours: willSaveManualHours ? validHours : null,
                    manualTarifa: willSaveManualTarifa ? validTarifa : null,
                    clientOverrides: null,
                    updateCadastroTarifa: false,
                    motivo: motivo.trim() || undefined,
                });
            }

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
                clientOverrides: null,
                updateCadastroTarifa: false,
            });

            await invalidateAll();
            toast.success('Horas e tarifas restauradas para o cálculo automático do faturamento!');
            setOpen(false);
        } catch (err: any) {
            console.error('Erro ao restaurar horas/tarifa:', err);
            toast.error('Erro ao restaurar padrão: ' + (err.message || 'Erro desconhecido'));
        } finally {
            setIsSaving(false);
        }
    };

    const handleUpdateClientRow = (index: number, field: 'hoursStr' | 'tarifaStr', value: string) => {
        setClientRows(prev => prev.map((row, i) => (i === index ? { ...row, [field]: value } : row)));
    };

    return (
        <Dialog open={open} onOpenChange={(v) => { if (!isSaving) setOpen(v); }}>
            <DialogTrigger asChild>
                {trigger}
            </DialogTrigger>
            <DialogContent
                className={`${isMultiClient ? 'sm:max-w-[620px]' : 'sm:max-w-[500px]'} max-h-[90vh] overflow-y-auto`}
                onClick={(e) => e.stopPropagation()}
            >
                <DialogHeader>
                    <div className="flex items-center gap-2.5">
                        <div className="p-2 bg-indigo-50 dark:bg-indigo-950/60 rounded-lg text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-900">
                            <Calculator className="h-5 w-5" />
                        </div>
                        <div>
                            <DialogTitle className="text-base font-bold">
                                {isMultiClient ? 'Ajustar Horas e Tarifas por Cliente / Obra' : 'Ajustar Horas e Tarifa na Folha'}
                            </DialogTitle>
                            <DialogDescription className="text-xs">
                                {isMultiClient
                                    ? 'Este colaborador trabalhou em mais de um cliente no mês. Defina as horas e a tarifa individual de cada cliente.'
                                    : 'Ajuste diretamente a quantidade de horas a pagar no mês (1 a 30/31) e/ou a tarifa horária.'}
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
                            {!isMultiClient && clienteNombre && clienteNombre !== '-' && (
                                <span>• Cliente: <strong className="text-slate-700 dark:text-slate-300">{clienteNombre}</strong></span>
                            )}
                            <span>• Tarifa Padrão da Competência: <strong className="text-slate-700 dark:text-slate-300">€ {resolvedCadastroTarifa.toFixed(2)}/h</strong></span>
                        </div>
                    </div>

                    {isMultiClient ? (
                        /* MULTI-CLIENT PER-CLIENT HOURS & TARIFF EDITOR */
                        <div className="space-y-2.5">
                            <div className="flex items-center justify-between">
                                <Label className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                                    <Building2 className="h-3.5 w-3.5 text-indigo-600" />
                                    Clientes / Obras Trabalhadas ({clientRows.length})
                                </Label>
                                <span className="text-[11px] text-muted-foreground">
                                    Cada cliente pode ter sua própria tarifa (€/h)
                                </span>
                            </div>

                            <div className="space-y-2">
                                {clientRows.map((row, idx) => {
                                    const rHours = parseSafeNum(row.hoursStr);
                                    const rTarifa = parseSafeNum(row.tarifaStr);
                                    const rSubtotal = Math.round((rHours * rTarifa + Number.EPSILON) * 100) / 100;

                                    return (
                                        <div
                                            key={`${row.clientName}-${idx}`}
                                            className="p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900/60 shadow-2xs space-y-2.5"
                                        >
                                            <div className="flex items-center justify-between gap-2">
                                                <div className="flex items-center gap-1.5 min-w-0">
                                                    <Building2 className="h-3.5 w-3.5 text-indigo-500 shrink-0" />
                                                    <span className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate" title={row.clientName}>
                                                        {row.clientName}
                                                    </span>
                                                </div>
                                                <span className="text-[11px] font-mono font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50 px-2 py-0.5 rounded border border-emerald-200/70 dark:border-emerald-800 shrink-0">
                                                    € {rSubtotal.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                </span>
                                            </div>

                                            <div className="grid grid-cols-2 gap-3">
                                                <div className="space-y-1">
                                                    <div className="flex items-center justify-between">
                                                        <Label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400">
                                                            Horas (Fat: {formatCleanHoursInput(row.faturamentoHours)}h)
                                                        </Label>
                                                    </div>
                                                    <Input
                                                        type="number"
                                                        step="0.5"
                                                        min="0"
                                                        value={row.hoursStr}
                                                        onChange={(e) => handleUpdateClientRow(idx, 'hoursStr', e.target.value)}
                                                        className="h-8 text-sm font-bold bg-amber-50/30 dark:bg-slate-900 border-amber-300/80"
                                                    />
                                                </div>

                                                <div className="space-y-1">
                                                    <Label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400">
                                                        Tarifa Hora (€ / h)
                                                    </Label>
                                                    <Input
                                                        type="number"
                                                        step="0.01"
                                                        min="0"
                                                        autoFocus={defaultFocus === 'tariff' && idx === 0}
                                                        value={row.tarifaStr}
                                                        onChange={(e) => handleUpdateClientRow(idx, 'tarifaStr', e.target.value)}
                                                        className="h-8 text-sm font-bold bg-emerald-50/30 dark:bg-slate-900 border-emerald-300/80"
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>

                            <div className="bg-emerald-50/50 dark:bg-emerald-950/30 p-2.5 rounded-lg border border-emerald-200/70 dark:border-emerald-800 text-[11px] text-emerald-900 dark:text-emerald-300">
                                Este ajuste por cliente será aplicado <strong>somente na folha de {mesReferencia}</strong> e não alterará outros meses nem o cadastro geral de tarifas.
                            </div>
                        </div>
                    ) : (
                        /* SINGLE-CLIENT HOURS & TARIFF EDITOR */
                        <>
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
                                        autoFocus={defaultFocus === 'hours'}
                                        placeholder={formatCleanHoursInput(resolvedEffectiveHours)}
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
                                                    setHoursStr(formatCleanHoursInput(faturamentoHours));
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
                                        autoFocus={defaultFocus === 'tariff'}
                                        placeholder={resolvedEffectiveTarifa.toFixed(2)}
                                        value={tarifaStr}
                                        onChange={(e) => setTarifaStr(e.target.value)}
                                        className="h-9 font-bold text-base bg-white dark:bg-slate-900 border-emerald-300 focus-visible:ring-emerald-500"
                                    />

                                    <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-0.5">
                                        <span>Tarifa da competência: <strong>€ {resolvedCadastroTarifa.toFixed(2)}/h</strong></span>
                                        {tarifaDiffersFromBase && (
                                            <button
                                                type="button"
                                                onClick={() => setTarifaStr(resolvedCadastroTarifa.toFixed(2))}
                                                className="text-emerald-700 hover:text-emerald-900 dark:text-emerald-400 font-semibold underline cursor-pointer"
                                            >
                                                Usar € {resolvedCadastroTarifa.toFixed(2)}
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {tarifaDiffersFromBase && (
                                <div className="bg-emerald-50/50 dark:bg-emerald-950/30 p-2.5 rounded-lg border border-emerald-200/70 dark:border-emerald-800 text-[11px] text-emerald-900 dark:text-emerald-300">
                                    Este ajuste de tarifa (<strong>€ {validTarifa.toFixed(2)}/h</strong>) será aplicado <strong>somente na folha de {mesReferencia}</strong> e não alterará os demais meses nem a Governança de Tarifas.
                                </div>
                            )}
                        </>
                    )}

                    {/* Observação / Motivo */}
                    <div className="space-y-1.5">
                        <Label htmlFor="motivo-ajuste" className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                            Observação / Motivo do Ajuste (Opcional)
                        </Label>
                        <Input
                            id="motivo-ajuste"
                            placeholder={isMultiClient ? 'Ex: Tarifas diferenciadas por obra (CMR €12, Sistemas €14)' : 'Ex: Ciclo de medição 20 a 20 (Sarivert) - horas reais de 1 a 30'}
                            value={motivo}
                            onChange={(e) => setMotivo(e.target.value)}
                            className="h-8 text-xs"
                        />
                    </div>

                    {/* Resumo do Vencimento Base Calculado */}
                    <div className="p-3.5 bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-900 rounded-xl flex items-center justify-between gap-3">
                        <div className="space-y-0.5 min-w-0">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-700 dark:text-indigo-300 block">
                                Remuneração por Horas na Folha
                            </span>
                            {isMultiClient ? (
                                <span className="text-xs text-slate-600 dark:text-slate-400 font-medium block">
                                    Total: <strong>{multiTotalHours.toLocaleString('pt-BR', { maximumFractionDigits: 2 })} h</strong> em {parsedClientRows.length} clientes
                                </span>
                            ) : (
                                <span className="text-xs text-slate-600 dark:text-slate-400 font-medium">
                                    {validHours.toLocaleString('pt-BR', { maximumFractionDigits: 2 })} h × € {validTarifa.toFixed(2)}/h
                                </span>
                            )}
                            <span className="text-[10px] text-muted-foreground block">
                                Sem ajuste (Faturamento): € {faturamentoBase.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </span>
                        </div>
                        <div className="text-right shrink-0">
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
                                title="Remover ajuste manual e voltar para as horas e tarifa automáticas do faturamento"
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
