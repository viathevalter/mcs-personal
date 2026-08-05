import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Loader2, DollarSign } from 'lucide-react';
import type { Worker } from '@/shared/types/corePersonal';
import { useUpdateWorkerTariff } from '../hooks/useUpdateWorkerTariff';

interface EditTariffDialogProps {
    worker: (Worker & { worker_beneficios_settings?: any }) | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function EditTariffDialog({ worker, open, onOpenChange }: EditTariffDialogProps) {
    const { t } = useTranslation();
    const { mutateAsync: updateTariff, isPending } = useUpdateWorkerTariff();
    const [tarifaVal, setTarifaVal] = useState<string>('0.00');

    useEffect(() => {
        if (worker) {
            const currentTariff = worker.worker_beneficios_settings?.tarifa_hora ?? 0;
            setTarifaVal(Number(currentTariff).toFixed(2));
        }
    }, [worker]);

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!worker) return;

        const val = parseFloat(tarifaVal.replace(',', '.'));
        if (isNaN(val) || val < 0) {
            return;
        }

        try {
            await updateTariff({
                workerId: worker.id,
                tarifa: val
            });
            onOpenChange(false);
        } catch (error) {
            // Toast error handled in hook
        }
    };

    if (!worker) return null;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[450px]">
                <form onSubmit={handleSave}>
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <DollarSign className="w-5 h-5 text-indigo-500" />
                            Editar Tarifa do Trabalhador
                        </DialogTitle>
                        <DialogDescription>
                            Atualize a tarifa horária de faturamento do colaborador no sistema.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="grid gap-4 py-4">
                        <div className="bg-slate-50 dark:bg-slate-900 border rounded-lg p-3 space-y-2 text-sm">
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">Trabalhador:</span>
                                <span className="font-semibold text-slate-800 dark:text-slate-200">{worker.nome}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">Função:</span>
                                <span className="font-medium">{worker.funcion || '-'}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">Cliente:</span>
                                <span className="font-medium">{worker.cliente_nombre || '-'}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">Empresa:</span>
                                <span className="font-medium text-xs bg-indigo-50 dark:bg-indigo-950 px-2 py-0.5 rounded text-indigo-700 dark:text-indigo-300">
                                    {worker.contratante || '-'}
                                </span>
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <Label htmlFor="tariff_input" className="text-xs font-bold">
                                Tarifa por Hora (€)
                            </Label>
                            <div className="relative">
                                <span className="absolute left-3 top-2.5 text-muted-foreground font-mono">€</span>
                                <Input
                                    id="tariff_input"
                                    type="text"
                                    className="pl-7 font-mono"
                                    value={tarifaVal}
                                    onChange={(e) => setTarifaVal(e.target.value)}
                                    autoComplete="new-password"
                                    placeholder="0.00"
                                />
                            </div>
                            <p className="text-xs text-muted-foreground">
                                Este valor será utilizado para multiplicar as horas trabalhadas na folha de pagamento.
                            </p>
                        </div>
                    </div>

                    <DialogFooter>
                        <Button 
                            type="button" 
                            variant="outline" 
                            onClick={() => onOpenChange(false)}
                            disabled={isPending}
                        >
                            Cancelar
                        </Button>
                        <Button 
                            type="submit" 
                            className="bg-indigo-600 hover:bg-indigo-700"
                            disabled={isPending}
                        >
                            {isPending ? (
                                <>
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                    Salvando...
                                </>
                            ) : (
                                'Salvar Tarifa'
                            )}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
