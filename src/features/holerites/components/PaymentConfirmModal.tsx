import React, { useState } from 'react';
import { CheckCircle2, Calendar, CreditCard, Loader2 } from 'lucide-react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { format } from 'date-fns';

interface PaymentConfirmModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    workerCount: number;
    totalAmount: number;
    mesReferencia: string;
    onConfirm: (data: { dataPagamento: string; metodoPagamento: string }) => void;
    isLoading?: boolean;
}

export function PaymentConfirmModal({
    open,
    onOpenChange,
    workerCount,
    totalAmount,
    mesReferencia,
    onConfirm,
    isLoading = false,
}: PaymentConfirmModalProps) {
    const [dataPagamento, setDataPagamento] = useState(format(new Date(), 'yyyy-MM-dd'));
    const [metodoPagamento, setMetodoPagamento] = useState('Transferência Bancária');

    const handleConfirm = () => {
        onConfirm({ dataPagamento, metodoPagamento });
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[480px]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-xl font-bold text-slate-900 dark:text-white">
                        <CheckCircle2 className="h-6 w-6 text-emerald-600" />
                        Consolidar Pagamento da Folha
                    </DialogTitle>
                    <DialogDescription>
                        Informe a data e o método para marcar os holerites selecionados como <strong>Pagos</strong> na competência {mesReferencia}.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-3">
                    {/* Summary box */}
                    <div className="bg-emerald-50/70 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-xl p-4 flex items-center justify-between">
                        <div>
                            <span className="text-xs font-semibold text-emerald-800 dark:text-emerald-300 block">Total a Liquidar</span>
                            <div className="text-2xl font-bold font-mono text-emerald-700 dark:text-emerald-400">
                                € {totalAmount.toLocaleString('pt-PT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </div>
                        </div>
                        <div className="text-right">
                            <span className="text-xs text-muted-foreground block">Colaboradores</span>
                            <span className="text-lg font-bold text-slate-800 dark:text-slate-200">
                                {workerCount} {workerCount === 1 ? 'trabalhador' : 'trabalhadores'}
                            </span>
                        </div>
                    </div>

                    {/* Data de Pagamento */}
                    <div className="space-y-1.5">
                        <Label htmlFor="data-pagamento" className="text-xs font-semibold flex items-center gap-1.5">
                            <Calendar className="h-3.5 w-3.5 text-indigo-500" />
                            Data do Pagamento
                        </Label>
                        <Input
                            id="data-pagamento"
                            type="date"
                            value={dataPagamento}
                            onChange={(e) => setDataPagamento(e.target.value)}
                            className="h-9 text-xs"
                        />
                    </div>

                    {/* Metodo de Pagamento */}
                    <div className="space-y-1.5">
                        <Label htmlFor="metodo-pagamento" className="text-xs font-semibold flex items-center gap-1.5">
                            <CreditCard className="h-3.5 w-3.5 text-indigo-500" />
                            Forma / Método de Pagamento
                        </Label>
                        <Select value={metodoPagamento} onValueChange={setMetodoPagamento}>
                            <SelectTrigger id="metodo-pagamento" className="h-9 text-xs">
                                <SelectValue placeholder="Selecione o método" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="Transferência Bancária" className="text-xs">Transferência Bancária (SEPA / IBAN)</SelectItem>
                                <SelectItem value="PIX / Instantâneo" className="text-xs">PIX / Transferência Instantânea</SelectItem>
                                <SelectItem value="Dinheiro" className="text-xs">Dinheiro / Em Mãos</SelectItem>
                                <SelectItem value="Cheque" className="text-xs">Cheque</SelectItem>
                                <SelectItem value="Outro" className="text-xs">Outro</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                <DialogFooter className="gap-2 sm:gap-0">
                    <Button
                        type="button"
                        variant="outline"
                        onClick={() => onOpenChange(false)}
                        disabled={isLoading}
                        className="text-xs"
                    >
                        Cancelar
                    </Button>
                    <Button
                        type="button"
                        onClick={handleConfirm}
                        disabled={isLoading}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs"
                    >
                        {isLoading ? (
                            <>
                                <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                                Consolidando...
                            </>
                        ) : (
                            `Confirmar Pagamento (${workerCount})`
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
