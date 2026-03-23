import { useState } from 'react';
import * as XLSX from 'xlsx';
import { Download, Loader2, Calendar as CalendarIcon } from 'lucide-react';
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
import { Label } from '@/components/ui/label';
import { Combobox } from '@/components/ui/combobox';
import { Input } from '@/components/ui/input';
import { type BankAccountRow } from '../hooks/useAllBankAccounts';
import { format } from 'date-fns';

interface ExportBankAccountsDialogProps {
    trigger: React.ReactNode;
    bankAccounts: BankAccountRow[] | undefined;
    isLoading: boolean;
}

export function ExportBankAccountsDialog({ trigger, bankAccounts, isLoading }: ExportBankAccountsDialogProps) {
    const [isOpen, setIsOpen] = useState(false);
    
    // Filters
    const [contratanteFilter, setContratanteFilter] = useState<string>('all');
    const [clienteFilter, setClienteFilter] = useState<string>('all');
    const [updatedAfter, setUpdatedAfter] = useState<string>('');

    // Pre-calculate dropdowns
    const clientesUnicos = (Array.from(new Set(bankAccounts?.map(w => w.cliente_nome).filter(Boolean))) as string[])
        .sort((a, b) => a.localeCompare(b));
    const contratantesUnicos = (Array.from(new Set(bankAccounts?.map(w => w.contratante).filter(Boolean))) as string[])
        .sort((a, b) => a.localeCompare(b));

    const clienteOptions = [
        { value: 'all', label: 'Todos os clientes' },
        ...clientesUnicos.map(c => ({ value: c, label: c }))
    ];

    const contratanteOptions = [
        { value: 'all', label: 'Todas as empresas' },
        ...contratantesUnicos.map(c => ({ value: c, label: c }))
    ];

    const handleExport = () => {
        if (!bankAccounts) return;

        // Apply filters
        const filteredData = bankAccounts.filter(acc => {
            const matchContratante = contratanteFilter === 'all' || acc.contratante === contratanteFilter;
            const matchCliente = clienteFilter === 'all' || acc.cliente_nome === clienteFilter;
            
            let matchDate = true;
            if (updatedAfter) {
                if (!acc.updated_at) {
                    matchDate = false;
                } else {
                    const accDate = new Date(acc.updated_at);
                    const filterDate = new Date(updatedAfter);
                    matchDate = accDate >= filterDate;
                }
            }

            // Exclude empty IBAN rows (optional? usually we want to export those with ibans, but let's export all matched)
            return matchContratante && matchCliente && matchDate;
        });

        // Format for Excel
        const exportData = filteredData.map(acc => ({
            'Código Trabalhador': acc.worker_codigo,
            'Nome do Trabalhador': acc.worker_nome,
            'Empresa Contratante': acc.contratante || '',
            'Cliente Atual': acc.cliente_nome || '',
            'Banco': acc.banco || '',
            'IBAN': acc.iban || '',
            'Observação': '', // We don't fetch observacoes globally to save bandwidth, keeping it blank mapped
            'Última Atualização IBAN': acc.updated_at ? format(new Date(acc.updated_at), 'dd/MM/yyyy HH:mm') : ''
        }));

        // Generate worksheet
        const worksheet = XLSX.utils.json_to_sheet(exportData);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, 'ContasBancarias');

        // Trigger download
        const timestamp = format(new Date(), 'yyyyMMdd_HHmm');
        XLSX.writeFile(workbook, `Exportacao_IBANs_${timestamp}.xlsx`);

        setIsOpen(false);
    };

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                {trigger}
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Exportar Contas Bancárias</DialogTitle>
                    <DialogDescription>
                        Defina os filtros desejados para exportar as contas. O arquivo gerado será no formato Excel (.xlsx).
                    </DialogDescription>
                </DialogHeader>

                <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                        <Label htmlFor="contratante">Empresa Contratante</Label>
                        <Combobox
                            options={contratanteOptions}
                            value={contratanteFilter}
                            onChange={(v) => setContratanteFilter(v || 'all')}
                            placeholder="Todas as empresas"
                            emptyText="Nenhuma empresa"
                            className="w-full"
                        />
                    </div>

                    <div className="grid gap-2">
                        <Label htmlFor="cliente">Cliente (Obra)</Label>
                        <Combobox
                            options={clienteOptions}
                            value={clienteFilter}
                            onChange={(v) => setClienteFilter(v || 'all')}
                            placeholder="Todos os clientes"
                            emptyText="Nenhum cliente"
                            className="w-full"
                        />
                    </div>

                    <div className="grid gap-2">
                        <Label htmlFor="date">Atualizado a partir de...</Label>
                        <div className="relative">
                            <Input
                                id="date"
                                type="date"
                                value={updatedAfter}
                                onChange={(e) => setUpdatedAfter(e.target.value)}
                                className="pl-9"
                            />
                            <CalendarIcon className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                        </div>
                        <p className="text-[10px] text-slate-500 leading-tight">
                            Selecione uma data para exportar apenas os registros de IBANs que foram modificados a partir desse dia. Deixe em branco para exportar todos.
                        </p>
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={() => setIsOpen(false)}>
                        Cancelar
                    </Button>
                    <Button onClick={handleExport} disabled={isLoading || !bankAccounts} className="bg-emerald-600 hover:bg-emerald-700">
                        {isLoading ? (
                            <Loader2 className="w-4 h-4 animate-spin mr-2" />
                        ) : (
                            <Download className="w-4 h-4 mr-2" />
                        )}
                        Exportar Excel
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
