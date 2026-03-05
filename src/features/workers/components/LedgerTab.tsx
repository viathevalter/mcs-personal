import { useState } from 'react';
import { useLedgerEntriesByWorker } from '@/features/ledger/hooks/useLedgerEntriesByWorker';
import { useLedgerTypes } from '@/features/ledger/hooks/useLedgerTypes';
import { useGenerateHousingLedger } from '@/features/ledger/hooks/useGenerateHousingLedger';
import { useInsertLedgerEntry } from '@/features/ledger/hooks/useInsertLedgerEntry';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogFooter,
} from "@/components/ui/dialog";
import { Loader2, Plus, Calendar } from 'lucide-react';

interface LedgerTabProps {
    workerId: string;
    empresaId: string;
}

export function LedgerTab({ workerId, empresaId }: LedgerTabProps) {
    const today = new Date();
    const [year, setYear] = useState(today.getFullYear());
    const [month, setMonth] = useState(today.getMonth() + 1);

    // Add Dialog State
    const [isAddOpen, setIsAddOpen] = useState(false);
    const [manualType, setManualType] = useState('');
    const [manualAmount, setManualAmount] = useState('');
    const [manualDate, setManualDate] = useState(today.toISOString().split('T')[0]);

    const { data: entries, isLoading, isError } = useLedgerEntriesByWorker({ workerId, year, month });
    const { data: ledgerTypes } = useLedgerTypes(empresaId);
    const generateLedger = useGenerateHousingLedger();
    const insertLedger = useInsertLedgerEntry(workerId, year, month);

    const safeEntries = entries || [];

    const handleSaveManual = () => {
        if (!manualType || !manualAmount || !manualDate) {
            alert('Preencha os campos de tipo, valor e data.');
            return;
        }

        insertLedger.mutate({
            empresa_id: empresaId,
            worker_id: workerId,
            competence_year: year,
            competence_month: month,
            ledger_type_id: manualType,
            amount: Number(manualAmount),
            entry_date: manualDate,
            reference_type: 'Manual',
            reference_id: null,
            status: 'pending'
        }, {
            onSuccess: () => {
                alert('Lançamento manual registrado com sucesso.');
                setIsAddOpen(false);
                setManualAmount('');
                setManualType('');
                setManualDate(today.toISOString().split('T')[0]);
            },
            onError: (err) => {
                alert(`Erro ao registrar lançamento: ${err.message}`);
            }
        });
    };

    // Calculate totals based on 'direction' of the ledger_type
    // Assuming ledger_type has a structure matching LedgerType interface
    const totals = safeEntries.reduce((acc, entry) => {
        // Quick lookup for type
        const typeDefinition = ledgerTypes?.find(t => t.id === entry.ledger_type_id) || { direction: 'credit' };

        if (typeDefinition.direction === 'credit') {
            acc.credits += Number(entry.amount);
        } else {
            acc.debits += Number(entry.amount);
        }
        return acc;
    }, { credits: 0, debits: 0 });

    const netAmount = totals.credits - totals.debits;

    const handleGenerateHousing = () => {
        generateLedger.mutate(
            { empresaId, year, month },
            {
                onSuccess: (count) => {
                    alert(`Geração concluída. ${count} lançamento(s) atualizados.`);
                },
                onError: (error) => {
                    alert(`Erro ao gerar: ${error.message}`);
                }
            }
        );
    };

    return (
        <div className="mt-6 space-y-6">
            <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle className="text-lg">Competência</CardTitle>

                    <div className="flex items-center gap-2">
                        <Button
                            variant="secondary"
                            size="sm"
                            onClick={handleGenerateHousing}
                            disabled={generateLedger.isPending}
                        >
                            {generateLedger.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                            Gerar Auxílio Moradia do Mês
                        </Button>
                        <select
                            className="h-9 rounded-md border border-input bg-transparent px-3 text-sm shadow-sm"
                            value={month}
                            onChange={e => setMonth(Number(e.target.value))}
                        >
                            {Array.from({ length: 12 }).map((_, i) => (
                                <option key={i + 1} value={i + 1}>Mês {i + 1}</option>
                            ))}
                        </select>
                        <Input
                            type="number"
                            className="h-9 w-24"
                            value={year}
                            onChange={e => setYear(Number(e.target.value))}
                        />
                    </div>
                </CardHeader>
                <CardContent>

                    <div className="grid grid-cols-3 gap-4 mb-6">
                        <div className="p-4 border rounded-md bg-green-500/10 text-center">
                            <p className="text-sm font-medium text-muted-foreground mb-1">Créditos</p>
                            <p className="text-lg font-bold text-green-600 dark:text-green-500">€ {totals.credits.toFixed(2)}</p>
                        </div>
                        <div className="p-4 border rounded-md bg-red-500/10 text-center">
                            <p className="text-sm font-medium text-muted-foreground mb-1">Débitos</p>
                            <p className="text-lg font-bold text-red-600 dark:text-red-500">€ {totals.debits.toFixed(2)}</p>
                        </div>
                        <div className="p-4 border rounded-md bg-primary/10 text-center">
                            <p className="text-sm font-medium text-muted-foreground mb-1">Líquido (Net)</p>
                            <p className="text-lg font-bold text-primary">€ {netAmount.toFixed(2)}</p>
                        </div>
                    </div>

                    <div className="flex justify-between items-center mb-4">
                        <h3 className="font-semibold px-1">Lançamentos do Mês</h3>

                        <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
                            <DialogTrigger asChild>
                                <Button size="sm" className="gap-2">
                                    <Plus className="h-4 w-4" /> Manual
                                </Button>
                            </DialogTrigger>
                            <DialogContent>
                                <DialogHeader>
                                    <DialogTitle>Lançamento Manual</DialogTitle>
                                </DialogHeader>
                                <div className="space-y-4 py-4">
                                    <div className="space-y-1.5">
                                        <Label>Tipo de Lançamento</Label>
                                        <select
                                            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                                            value={manualType}
                                            onChange={e => setManualType(e.target.value)}
                                        >
                                            <option value="">Selecione...</option>
                                            {ledgerTypes?.map(lt => (
                                                <option key={lt.id} value={lt.id}>
                                                    {lt.type_code} ({lt.direction === 'credit' ? '+' : '-'})
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label>Valor (€)</Label>
                                        <Input
                                            type="number"
                                            step="0.01"
                                            value={manualAmount}
                                            onChange={e => setManualAmount(e.target.value)}
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label>Data de Referência</Label>
                                        <Input
                                            type="date"
                                            value={manualDate}
                                            onChange={e => setManualDate(e.target.value)}
                                        />
                                    </div>
                                </div>
                                <DialogFooter>
                                    <Button variant="outline" onClick={() => setIsAddOpen(false)}>Cancelar</Button>
                                    <Button onClick={handleSaveManual}>Registrar</Button>
                                </DialogFooter>
                            </DialogContent>
                        </Dialog>
                    </div>

                    <div className="rounded-md border">
                        <Table>
                            <TableHeader>
                                <TableRow className="bg-muted/50">
                                    <TableHead>Data</TableHead>
                                    <TableHead>Código</TableHead>
                                    <TableHead>Tipo (Ref)</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead className="text-right">Valor</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {isLoading && (
                                    <TableRow>
                                        <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                                            <div className="flex justify-center items-center gap-2">
                                                <Loader2 className="h-4 w-4 animate-spin" /> Carregando lançamentos...
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                )}
                                {!isLoading && isError && (
                                    <TableRow>
                                        <TableCell colSpan={5} className="h-24 text-center text-destructive">
                                            Falha ao carregar conta corrente.
                                        </TableCell>
                                    </TableRow>
                                )}
                                {!isLoading && !isError && safeEntries.length === 0 && (
                                    <TableRow>
                                        <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                                            Nenhum lançamento no período selecionado.
                                        </TableCell>
                                    </TableRow>
                                )}
                                {!isLoading && !isError && safeEntries.map((entry) => {
                                    const t = ledgerTypes?.find(type => type.id === entry.ledger_type_id);
                                    const isCredit = t?.direction === 'credit';

                                    return (
                                        <TableRow key={entry.id}>
                                            <TableCell className="flex items-center gap-2">
                                                <Calendar className="h-4 w-4 text-muted-foreground" />
                                                {entry.entry_date}
                                            </TableCell>
                                            <TableCell className="font-semibold">{t?.type_code || '-'}</TableCell>
                                            <TableCell className="text-muted-foreground">{entry.reference_type || 'Manual'}</TableCell>
                                            <TableCell>
                                                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${entry.status === 'processed' ? 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400' :
                                                    entry.status === 'pending' ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-400' :
                                                        'bg-muted text-muted-foreground'
                                                    }`}>
                                                    {entry.status || 'pending'}
                                                </span>
                                            </TableCell>
                                            <TableCell className={`text-right font-medium ${isCredit ? 'text-green-600 dark:text-green-500' : 'text-red-600 dark:text-red-500'}`}>
                                                {isCredit ? '+' : '-'} € {Number(entry.amount).toFixed(2)}
                                            </TableCell>
                                        </TableRow>
                                    );
                                })}
                            </TableBody>
                        </Table>
                    </div>

                </CardContent>
            </Card>
        </div>
    );
}
