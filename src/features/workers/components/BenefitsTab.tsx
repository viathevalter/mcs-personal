import { useState, useMemo, useEffect, forwardRef, useImperativeHandle } from 'react';
import { useHousingByWorker } from '@/features/benefits/hooks/useHousingByWorker';
import { useUpsertHousing } from '@/features/benefits/hooks/useUpsertHousing';
import { useDeleteHousing } from '@/features/benefits/hooks/useDeleteHousing';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Trash2, Home } from 'lucide-react';
import { toast } from 'sonner';

export interface BenefitsTabRef {
    save: () => Promise<void>;
}

export interface BenefitsTabProps {
    workerId: string;
    empresaId: string;
    isEmbedded?: boolean;
}

export const BenefitsTab = forwardRef<BenefitsTabRef, BenefitsTabProps>(
    ({ workerId, empresaId, isEmbedded }, ref) => {
        const { data: housingBenefits, isLoading, isError } = useHousingByWorker(workerId);
        const upsertHousing = useUpsertHousing();
        const deleteHousing = useDeleteHousing(workerId);

        // Simplification for prototype: Edit mode for the first benefit or create new
        const existingBenefit = housingBenefits?.[0];

        // Form state
        const [monthlyAmount, setMonthlyAmount] = useState('');
        const [startDate, setStartDate] = useState('');
        const [endDate, setEndDate] = useState('');
        const [prorationMethod, setProrationMethod] = useState('daily_actual');

        useEffect(() => {
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
        }, [existingBenefit]);

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

            // Add 1 because both days are inclusive
            const eligibleDays = Math.max(0, Math.floor((overlapEnd.getTime() - overlapStart.getTime()) / (1000 * 60 * 60 * 24)) + 1);

            if (prorationMethod === 'daily_actual') {
                const daysInMonth = lastDayOfMonth.getDate();
                return (amount * eligibleDays) / daysInMonth;
            } else {
                // daily_30 approach
                return (amount * eligibleDays) / 30;
            }

        }, [monthlyAmount, startDate, endDate, prorationMethod]);

        const handleSave = async () => {
            if (!monthlyAmount && !startDate && !endDate) {
                return;
            }

            if (!monthlyAmount || !startDate) {
                if (!isEmbedded) toast.error('Preencha o valor e a data de início.');
                throw new Error('Preencha o valor e a data de início do auxílio moradia.');
            }

            const payload: any = {
                empresa_id: empresaId,
                worker_id: workerId,
                monthly_amount: Number(monthlyAmount),
                start_date: startDate,
                end_date: endDate || null,
                proration_method: prorationMethod
            };

            if (existingBenefit?.id) {
                payload.id = existingBenefit.id;
            }

            await upsertHousing.mutateAsync(payload);
            if (!isEmbedded) toast.success('Benefício de moradia salvo com sucesso!');
        };

        useImperativeHandle(ref, () => ({
            save: handleSave
        }));

        const handleDelete = () => {
            if (existingBenefit && confirm('Tem certeza que deseja remover este benefício?')) {
                deleteHousing.mutate(existingBenefit.id, {
                    onSuccess: () => {
                        alert('Benefício removido.');
                    },
                    onError: (err) => {
                        toast.error(`Erro ao remover benefício: ${err.message}`);
                    }
                });
            }
        };

        if (isLoading) {
            return (
                <div className="flex h-32 items-center justify-center text-muted-foreground">
                    <Loader2 className="h-6 w-6 animate-spin mr-2" />
                    Carregando benefícios...
                </div>
            );
        }

        if (isError) {
            return (
                <div className="text-destructive p-4 border border-destructive/20 rounded-md">
                    Failed to load benefits data.
                </div>
            );
        }

        return (
            <div className={!isEmbedded ? "mt-6 space-y-6" : "space-y-6"}>
                <Card className={isEmbedded ? "border-0 shadow-none bg-transparent" : ""}>
                    <CardHeader className={isEmbedded ? "px-0 pt-0" : ""}>
                        <div className="flex items-center justify-between">
                            <div>
                                <CardTitle className="text-lg flex items-center gap-2">
                                    <Home className="h-5 w-5 text-muted-foreground" />
                                    Auxílio Moradia
                                </CardTitle>
                                <CardDescription>
                                    Configure the housing allowance and its proration method.
                                </CardDescription>
                            </div>
                            {existingBenefit && (
                                <Button variant="destructive" size="icon" onClick={handleDelete}>
                                    <Trash2 className="h-4 w-4" />
                                </Button>
                            )}
                        </div>
                    </CardHeader>
                    <CardContent>
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
                                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background disabled:cursor-not-allowed disabled:opacity-50"
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

                        {!isEmbedded && (
                            <div className="mt-6 flex gap-4 justify-end">
                                <Button
                                    onClick={handleSave}
                                    disabled={upsertHousing.isPending || isLoading}
                                >
                                    {upsertHousing.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                                    Salvar Auxílio Moradia
                                </Button>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        );
    }
);
