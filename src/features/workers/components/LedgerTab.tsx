import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useLedgerEntriesByWorker } from '@/features/ledger/hooks/useLedgerEntriesByWorker';
import { useLedgerTypes } from '@/features/ledger/hooks/useLedgerTypes';
import { useGenerateHousingLedger } from '@/features/ledger/hooks/useGenerateHousingLedger';
import { useInsertLedgerEntry } from '@/features/ledger/hooks/useInsertLedgerEntry';
import { getWorkerTariffDossiers, getEffectiveTariffsMapForMonth } from '../api/tariffGovernanceApi';
import { supabase } from '@/shared/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
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

    const mesReferencia = `${year}-${String(month).padStart(2, '0')}`;

    const { data: dossierMap } = useQuery({
        queryKey: ['worker-tariff-dossiers', workerId],
        queryFn: () => getWorkerTariffDossiers([workerId]),
        enabled: Boolean(workerId),
        staleTime: 30 * 1000
    });

    const { data: competenceSummary } = useQuery({
        queryKey: ['worker-ledger-competence-summary', workerId, mesReferencia],
        queryFn: async () => {
            const startDt = `${mesReferencia}-01`;
            const lastDay = new Date(year, month, 0).getDate();
            const endDt = `${mesReferencia}-${String(lastDay).padStart(2, '0')}`;

            const [horasRes, settingRes, effMap, discountsRes, housingRes, holeriteRes] = await Promise.all([
                supabase
                    .schema('core_finance')
                    .from('horas_trabalhadas')
                    .select('horas_totais')
                    .eq('worker_id', workerId)
                    .gte('data_trabalho', startDt)
                    .lte('data_trabalho', endDt),
                supabase
                    .schema('core_personal')
                    .from('worker_beneficios_settings')
                    .select('tarifa_hora')
                    .eq('worker_id', workerId)
                    .maybeSingle(),
                getEffectiveTariffsMapForMonth(mesReferencia),
                supabase
                    .schema('core_personal')
                    .from('worker_discounts')
                    .select('amount')
                    .eq('worker_id', workerId)
                    .gte('reference_date', startDt)
                    .lte('reference_date', endDt),
                supabase
                    .schema('core_personal')
                    .from('worker_benefit_housing')
                    .select('monthly_amount, start_date, end_date')
                    .eq('worker_id', workerId)
                    .eq('is_active', true),
                supabase
                    .schema('core_personal')
                    .from('holerites')
                    .select('horas_trabalhadas, total_proventos, total_descontos, valor_liquido, status')
                    .eq('worker_id', workerId)
                    .eq('mes_referencia', startDt)
                    .maybeSingle()
            ]);

            const totalHoras = (horasRes.data || []).reduce((s: number, r: any) => s + Number(r.horas_totais || 0), 0);
            const tarifa = effMap.get(workerId) ?? Number(settingRes.data?.tarifa_hora || 0);
            const vencimentoHoras = totalHoras * tarifa;
            const housing = (housingRes.data || []).reduce((s: number, h: any) => {
                if (h.start_date && h.start_date > endDt) return s;
                if (h.end_date && h.end_date < startDt) return s;
                return s + Number(h.monthly_amount || 0);
            }, 0);
            const discounts = (discountsRes.data || []).reduce((s: number, d: any) => s + Number(d.amount || 0), 0);

            const hRow = holeriteRes.data;
            const proventos = hRow && Number(hRow.total_proventos || 0) > 0 ? Number(hRow.total_proventos) : vencimentoHoras + housing;
            const descontos = hRow && Number(hRow.total_descontos || 0) > 0 ? Number(hRow.total_descontos) : discounts;
            const liquido = hRow && Number(hRow.valor_liquido || 0) > 0 ? Number(hRow.valor_liquido) : proventos - descontos;

            return {
                totalHoras: Math.round(totalHoras * 100) / 100,
                tarifa,
                proventos: Math.round(proventos * 100) / 100,
                descontos: Math.round(descontos * 100) / 100,
                liquido: Math.round(liquido * 100) / 100,
                status: hRow?.status || (totalHoras > 0 ? 'Valores Lançados' : 'Sem Lançamentos')
            };
        },
        enabled: Boolean(workerId),
        staleTime: 30 * 1000
    });

    const workerDossier = dossierMap?.get(workerId);

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

    const displayCredits = totals.credits > 0 ? totals.credits : (competenceSummary?.proventos || 0);
    const displayDebits = totals.debits > 0 ? totals.debits : (competenceSummary?.descontos || 0);
    const netAmount = displayCredits - displayDebits;

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
                            <p className="text-sm font-medium text-muted-foreground mb-1">
                                Créditos {competenceSummary && competenceSummary.totalHoras > 0 ? `(${competenceSummary.totalHoras}h × €${competenceSummary.tarifa.toFixed(2)})` : ''}
                            </p>
                            <p className="text-lg font-bold text-green-600 dark:text-green-500">€ {displayCredits.toFixed(2)}</p>
                        </div>
                        <div className="p-4 border rounded-md bg-red-500/10 text-center">
                            <p className="text-sm font-medium text-muted-foreground mb-1">Débitos</p>
                            <p className="text-lg font-bold text-red-600 dark:text-red-500">€ {displayDebits.toFixed(2)}</p>
                        </div>
                        <div className="p-4 border rounded-md bg-primary/10 text-center">
                            <p className="text-sm font-medium text-muted-foreground mb-1">
                                Líquido (Net) {competenceSummary?.status ? `• ${competenceSummary.status}` : ''}
                            </p>
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

            {workerDossier && workerDossier.ultimos_holerites.length > 0 && (
                <Card>
                    <CardHeader>
                        <CardTitle className="text-base">Histórico de Competências & Horas Trabalhadas</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Competência</TableHead>
                                    <TableHead>Cliente(s)</TableHead>
                                    <TableHead className="text-right">Horas</TableHead>
                                    <TableHead className="text-right">Proventos / Est.</TableHead>
                                    <TableHead className="text-right">Líquido / Est.</TableHead>
                                    <TableHead className="text-center">Status</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {workerDossier.ultimos_holerites.map((h, i) => (
                                    <TableRow key={i}>
                                        <TableCell className="font-semibold">{h.mes_referencia}</TableCell>
                                        <TableCell className="text-xs text-muted-foreground">
                                            {h.clientes && h.clientes.length > 0 ? h.clientes.join(', ') : '-'}
                                        </TableCell>
                                        <TableCell className="text-right font-mono">{h.horas_trabalhadas}h</TableCell>
                                        <TableCell className="text-right font-mono">€ {h.total_proventos.toFixed(2)}</TableCell>
                                        <TableCell className="text-right font-mono font-bold text-indigo-600">€ {h.valor_liquido.toFixed(2)}</TableCell>
                                        <TableCell className="text-center">
                                            <Badge variant={h.status === 'Pago' ? 'default' : 'secondary'} className="text-xs">
                                                {h.status || 'Lançado'}
                                            </Badge>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
