import { useState, useMemo, useEffect } from 'react';
import { useUpsertHousing } from '@/features/benefits/hooks/useUpsertHousing';
import { useDeleteHousing } from '@/features/benefits/hooks/useDeleteHousing';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Loader2, Trash2, Gift } from 'lucide-react';
import type { HousingBenefit } from '@/shared/types/corePersonal';
import { useBenefitCategories } from '@/features/settings/hooks/useCategories';

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
    const { data: benefitCategories = [] } = useBenefitCategories(empresaId);

    // Form state
    const [monthlyAmount, setMonthlyAmount] = useState('');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [prorationMethod, setProrationMethod] = useState('daily_actual');
    const [category, setCategory] = useState('Auxílio Moradia');
    const [description, setDescription] = useState('');
    const [status, setStatus] = useState('Ativo');

    useEffect(() => {
        if (open) {
            if (existingBenefit) {
                setMonthlyAmount(existingBenefit.monthly_amount?.toString() || '');
                setStartDate(existingBenefit.start_date || '');
                setEndDate(existingBenefit.end_date || '');
                setProrationMethod(existingBenefit.proration_method || 'daily_actual');
                setCategory(existingBenefit.category || 'Auxílio Moradia');
                setDescription(existingBenefit.description || '');
                setStatus(existingBenefit.status || 'Ativo');
            } else {
                setMonthlyAmount('');
                setStartDate('');
                setEndDate('');
                setProrationMethod('daily_actual');
                setCategory('Auxílio Moradia');
                setDescription('');
                setStatus('Ativo');
            }
        }
    }, [open, existingBenefit]);

    const defaultCategoryOptions = [
        'Auxílio Moradia',
        'Auxílio Alimentação',
        'Auxílio Transporte',
        'Prêmios',
        'Bônus',
        'Horas Extra / Adicionais',
        'Outros Proventos'
    ];

    const categoryList = benefitCategories.length > 0
        ? benefitCategories.map(c => c.name)
        : defaultCategoryOptions;

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
            proration_method: prorationMethod,
            category,
            description: description.trim() || null,
            status
        }, {
            onSuccess: () => {
                queryClient.invalidateQueries({ queryKey: ['workers_with_housing'] });
                queryClient.invalidateQueries({ queryKey: ['housing_benefit', workerId] });
                onOpenChange(false);
            },
            onError: (err) => {
                alert(`Erro ao salvar benefício: ${err.message}`);
            }
        });
    };

    const handleDelete = () => {
        if (existingBenefit && confirm('Tem certeza que deseja remover este benefício/provento?')) {
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
                            <DialogTitle className="flex items-center gap-2 text-xl font-bold">
                                <Gift className="h-5 w-5 text-emerald-600" />
                                Provento / Benefício - {workerName}
                            </DialogTitle>
                            <DialogDescription>
                                Configure o benefício ou adicional cadastrado para este trabalhador.
                            </DialogDescription>
                        </div>
                        {existingBenefit && (
                            <Button variant="destructive" size="icon" onClick={handleDelete} className="mr-6">
                                <Trash2 className="h-4 w-4" />
                            </Button>
                        )}
                    </div>
                </DialogHeader>

                <div className="py-4 space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                            <Label htmlFor="category">Tipo de Provento</Label>
                            <select
                                id="category"
                                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                                value={category}
                                onChange={(e) => setCategory(e.target.value)}
                            >
                                {categoryList.map(c => (
                                    <option key={c} value={c}>{c}</option>
                                ))}
                            </select>
                        </div>

                        <div className="space-y-1.5">
                            <Label htmlFor="amount">Valor Mensal (€)</Label>
                            <Input
                                id="amount"
                                type="number"
                                step="0.01"
                                placeholder="Ex: 300.00"
                                value={monthlyAmount}
                                onChange={(e) => setMonthlyAmount(e.target.value)}
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
                            <Label htmlFor="end">Data Fim (Opcional)</Label>
                            <Input
                                id="end"
                                type="date"
                                value={endDate}
                                onChange={(e) => setEndDate(e.target.value)}
                            />
                        </div>
                        <div className="space-y-1.5">
                            <Label htmlFor="status">Status</Label>
                            <select
                                id="status"
                                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                                value={status}
                                onChange={(e) => setStatus(e.target.value)}
                            >
                                <option value="Ativo">Ativo</option>
                                <option value="Inativo">Inativo</option>
                                <option value="Pausado">Pausado</option>
                            </select>
                        </div>
                    </div>

                    <div className="space-y-1.5">
                        <Label htmlFor="desc">Descrição / Observações</Label>
                        <Input
                            id="desc"
                            placeholder="Observações adicionais..."
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                        />
                    </div>

                    {estimatedValue > 0 && (
                        <div className="mt-4 p-4 bg-emerald-50/50 rounded-md border border-emerald-100 text-center">
                            <p className="text-sm text-emerald-800 mb-1">Valor proporcional estimado no mês atual:</p>
                            <p className="text-2xl font-bold text-emerald-700">€ {estimatedValue.toFixed(2)}</p>
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
                            className="bg-emerald-600 hover:bg-emerald-700 text-white"
                            onClick={handleSave}
                            disabled={upsertHousing.isPending || deleteHousing.isPending}
                        >
                            {upsertHousing.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                            Salvar Provento
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}

