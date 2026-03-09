import { useState, useMemo, useEffect } from 'react';
import { useUpsertHousing } from '@/features/benefits/hooks/useUpsertHousing';
import { useDeleteHousing } from '@/features/benefits/hooks/useDeleteHousing';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Loader2, Trash2, Home } from 'lucide-react';
import type { HousingBenefit } from '@/shared/types/corePersonal';

interface EditHousingDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    workerId: string;
    empresaId: string;
    workerName: string;
    existingBenefit?: HousingBenefit | null;
}

export function EditHousingDialog({ open, onOpenChange, workerId, empresaId, workerName, existingBenefit }: EditHousingDialogProps) {
    const upsertHousing = useUpsertHousing();
    const deleteHousing = useDeleteHousing(workerId);
    const queryClient = useQueryClient();

    // Form state
    const [monthlyAmount, setMonthlyAmount] = useState('');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [prorationMethod, setProrationMethod] = useState('daily_actual');

    useEffect(() => {
        if (open) {
            if (existingBenefit) {
                setMonthlyAmount(existingBenefit.monthly_amount?.toString() || '');
                setStartDate(existingBenefit.start_date || '');
                setEndDate(existingBenefit.end_date || '');
                setProrationMethod(existingBenefit.proration_method || 'daily_actual');
            } else {
                setMonthlyAmount('');
                setStartDate('');
                setEndDate('');
                setProrationMethod('daily_actual');
            }
        }
    }, [open, existingBenefit]);

    // Calculate estimate for current month
    const estimatedValue = useMemo(() => {
        if (!monthlyAmount || !startDate || isNaN(Number(monthlyAmount))) return 0;

        const amount = Number(monthlyAmount);
        const today = new Date();
        const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
        const lastDayOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);

        const start = new Date(startDate);
        const end = endDate ? new Date(endDate) : new Date(9999, 11, 31);

        // Calculate overlap interval
        const overlapStart = start > firstDayOfMonth ? start : firstDayOfMonth;
        const overlapEnd = end < lastDayOfMonth ? end : lastDayOfMonth;

        if (overlapStart > overlapEnd) return 0; // No overlap this month

        const eligibleDays = Math.max(0, Math.floor((overlapEnd.getTime() - overlapStart.getTime()) / (1000 * 60 * 60 * 24)) + 1);

        if (prorationMethod === 'daily_actual') {
            const daysInMonth = lastDayOfMonth.getDate();
            return (amount * eligibleDays) / daysInMonth;
        } else {
            return (amount * eligibleDays) / 30;
        }

    }, [monthlyAmount, startDate, endDate, prorationMethod]);

    const handleSave = () => {
        if (!monthlyAmount || !startDate) {
            alert('Preencha o valor e a data de início.');
            return;
        }

        upsertHousing.mutate({
            id: existingBenefit?.id,
            empresa_id: empresaId,
            worker_id: workerId,
            monthly_amount: Number(monthlyAmount),
            start_date: startDate,
            end_date: endDate || null,
            proration_method: prorationMethod
        }, {
            onSuccess: () => {
                queryClient.invalidateQueries({ queryKey: ['workers_with_housing'] });
                queryClient.invalidateQueries({ queryKey: ['housing_benefit', workerId] }); // Invalidate single tab as well
                onOpenChange(false);
            },
            onError: (err) => {
                alert(`Erro ao salvar benefício: ${err.message}`);
            }
        });
    };

    const handleDelete = () => {
        if (existingBenefit && confirm('Tem certeza que deseja remover este benefício?')) {
            deleteHousing.mutate(existingBenefit.id, {
                onSuccess: () => {
                    queryClient.invalidateQueries({ queryKey: ['workers_with_housing'] });
                    queryClient.invalidateQueries({ queryKey: ['housing_benefit', workerId] });
                    onOpenChange(false);
                },
                onError: (err) => {
                    alert(`Erro ao remover benefício: ${err.message}`);
                }
            });
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[700px]">
                <DialogHeader>
                    <div className="flex items-center justify-between">
                        <div>
                            <DialogTitle className="flex items-center gap-2">
                                <Home className="h-5 w-5 text-muted-foreground" />
                                Benefício de Moradia - {workerName}
                            </DialogTitle>
                            <DialogDescription>
                                Configure the housing allowance for this worker.
                            </DialogDescription>
                        </div>
                        {existingBenefit && (
                            <Button variant="destructive" size="icon" onClick={handleDelete} className="mr-6">
                                <Trash2 className="h-4 w-4" />
                            </Button>
                        )}
                    </div>
                </DialogHeader>

                <div className="py-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-4">
                            <div className="space-y-1.5">
                                <Label htmlFor="amount">Valor Mensal (€)</Label>
                                <Input
                                    id="amount"
                                    type="number"
                                    step="0.01"
                                    placeholder="Ex: 500.00"
                                    value={monthlyAmount}
                                    onChange={(e) => setMonthlyAmount(e.target.value)}
                                />
                            </div>
                            <div className="space-y-1.5">
                                <Label>Método de Prorrateio (Proporcionalidade)</Label>
                                <select
                                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
                                    value={prorationMethod}
                                    onChange={(e) => setProrationMethod(e.target.value)}
                                >
                                    <option value="daily_actual">Atuais Dias do Mês (28/29/30/31)</option>
                                    <option value="daily_30">Comercial (30 dias)</option>
                                </select>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <div className="space-y-1.5">
                                <Label htmlFor="start">Data de Início</Label>
                                <Input
                                    id="start"
                                    type="date"
                                    value={startDate}
                                    onChange={(e) => setStartDate(e.target.value)}
                                />
                            </div>
                            <div className="space-y-1.5">
                                <Label htmlFor="end">Data de Fim (Opcional)</Label>
                                <Input
                                    id="end"
                                    type="date"
                                    value={endDate}
                                    onChange={(e) => setEndDate(e.target.value)}
                                />
                            </div>
                        </div>
                    </div>

                    {estimatedValue > 0 && (
                        <div className="mt-6 p-4 bg-muted/50 rounded-md border text-center">
                            <p className="text-sm text-muted-foreground mb-1">Valor proporcional estimado no mês atual:</p>
                            <p className="text-2xl font-bold text-primary">€ {estimatedValue.toFixed(2)}</p>
                        </div>
                    )}

                    <div className="mt-6 flex gap-4 justify-end">
                        <Button
                            variant="outline"
                            onClick={() => onOpenChange(false)}
                            disabled={upsertHousing.isPending || deleteHousing.isPending}
                        >
                            Cancelar
                        </Button>
                        <Button
                            onClick={handleSave}
                            disabled={upsertHousing.isPending || deleteHousing.isPending}
                        >
                            {upsertHousing.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                            Salvar Auxílio Moradia
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
