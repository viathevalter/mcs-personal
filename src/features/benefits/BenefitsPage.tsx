import { useState, useMemo } from 'react';
import { useEmpresa } from '@/app/providers/EmpresaProvider';
import { useWorkersWithHousing } from './hooks/useWorkersWithHousing';
import { EditHousingDialog } from './components/EditHousingDialog';
import { ImportHousingDialog } from './components/ImportHousingDialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Edit, FileSpreadsheet, Loader2, Link2Off, Link2, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import { format } from 'date-fns';
import type { WorkerWithHousing } from '@/shared/types/corePersonal';

export function BenefitsPage() {
    const { selectedEmpresaId: empresaId } = useEmpresa();

    const { data: workers, isLoading, isError } = useWorkersWithHousing(empresaId || undefined);

    // Filters
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedClient, setSelectedClient] = useState<string>('ALL');
    const [selectedCompany, setSelectedCompany] = useState<string>('ALL');

    // Sort
    const [sortConfig, setSortConfig] = useState<{ key: keyof WorkerWithHousing | 'housing_benefit_status' | 'housing_benefit_amount' | 'housing_benefit_date'; direction: 'asc' | 'desc' } | null>(null);

    const [isImportOpen, setIsImportOpen] = useState(false);

    // Edit Modal State
    const [isEditOpen, setIsEditOpen] = useState(false);
    const [selectedWorker, setSelectedWorker] = useState<WorkerWithHousing | null>(null);

    const uniqueClients = useMemo(() => {
        if (!workers) return [];
        const clients = new Set(workers.map(w => w.cliente_nombre).filter(Boolean) as string[]);
        return Array.from(clients).sort();
    }, [workers]);

    const uniqueCompanies = useMemo(() => {
        if (!workers) return [];
        const companies = new Set(workers.map(w => w.contratante).filter(Boolean) as string[]);
        return Array.from(companies).sort();
    }, [workers]);

    const handleSort = (key: keyof WorkerWithHousing | 'housing_benefit_status' | 'housing_benefit_amount' | 'housing_benefit_date') => {
        let direction: 'asc' | 'desc' = 'asc';
        if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc';
        }
        setSortConfig({ key, direction });
    };

    const filteredAndSortedWorkers = useMemo(() => {
        if (!workers) return [];

        let result = workers.filter(w => {
            const matchesSearch = w.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
                w.cod_colab.toLowerCase().includes(searchTerm.toLowerCase());
            const matchesClient = selectedClient === 'ALL' || w.cliente_nombre === selectedClient;
            const matchesCompany = selectedCompany === 'ALL' || w.contratante === selectedCompany;
            return matchesSearch && matchesClient && matchesCompany;
        });

        if (sortConfig) {
            result.sort((a, b) => {
                let aVal: any = a[sortConfig.key as keyof WorkerWithHousing];
                let bVal: any = b[sortConfig.key as keyof WorkerWithHousing];

                if (sortConfig.key === 'housing_benefit_status') {
                    aVal = a.housing_benefit ? 1 : 0;
                    bVal = b.housing_benefit ? 1 : 0;
                } else if (sortConfig.key === 'housing_benefit_amount') {
                    aVal = a.housing_benefit?.monthly_amount || 0;
                    bVal = b.housing_benefit?.monthly_amount || 0;
                } else if (sortConfig.key === 'housing_benefit_date') {
                    aVal = a.housing_benefit?.start_date ? new Date(a.housing_benefit.start_date).getTime() : 0;
                    bVal = b.housing_benefit?.start_date ? new Date(b.housing_benefit.start_date).getTime() : 0;
                }

                if (aVal === bVal) return 0;
                if (aVal === undefined || aVal === null) return sortConfig.direction === 'asc' ? 1 : -1;
                if (bVal === undefined || bVal === null) return sortConfig.direction === 'asc' ? -1 : 1;

                if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
                if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
                return 0;
            });
        }

        return result;
    }, [workers, searchTerm, selectedClient, selectedCompany, sortConfig]);

    const handleEditClick = (worker: WorkerWithHousing) => {
        setSelectedWorker(worker);
        setIsEditOpen(true);
    };

    const SortIcon = ({ columnKey }: { columnKey: string }) => {
        if (sortConfig?.key !== columnKey) return <ArrowUpDown className="ml-1 h-3 w-3 inline opacity-50" />;
        return sortConfig.direction === 'asc' ? <ArrowUp className="ml-1 h-3 w-3 inline" /> : <ArrowDown className="ml-1 h-3 w-3 inline" />;
    };

    if (isLoading) {
        return (
            <div className="flex h-[50vh] items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        );
    }

    if (isError) {
        return (
            <div className="flex h-[50vh] items-center justify-center">
                <div className="text-destructive bg-destructive/10 p-4 rounded-md">
                    Erro ao carregar dados dos trabalhadores.
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Benefícios (Moradia)</h1>
                    <p className="text-muted-foreground">Gestão global de benefícios de auxílio moradia dos trabalhadores.</p>
                </div>

                <Button onClick={() => setIsImportOpen(true)} className="flex items-center gap-2">
                    <FileSpreadsheet className="h-4 w-4" />
                    Importar Planilhas
                </Button>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-4 bg-muted/30 p-4 rounded-lg border">
                <div className="w-full sm:w-1/3">
                    <Input
                        placeholder="Buscar por nome ou código..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full bg-background"
                    />
                </div>
                <div className="w-full sm:w-1/3">
                    <select
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background disabled:cursor-not-allowed disabled:opacity-50"
                        value={selectedClient}
                        onChange={(e) => setSelectedClient(e.target.value)}
                    >
                        <option value="ALL">Todos os Clientes</option>
                        {uniqueClients.map(client => (
                            <option key={client} value={client}>{client}</option>
                        ))}
                    </select>
                </div>
                <div className="w-full sm:w-1/3">
                    <select
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background disabled:cursor-not-allowed disabled:opacity-50"
                        value={selectedCompany}
                        onChange={(e) => setSelectedCompany(e.target.value)}
                    >
                        <option value="ALL">Todas as Empresas</option>
                        {uniqueCompanies.map(company => (
                            <option key={company} value={company}>{company}</option>
                        ))}
                    </select>
                </div>
            </div>

            <div className="border rounded-md bg-card">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead className="cursor-pointer hover:bg-muted/50" onClick={() => handleSort('nome')}>
                                Trabalhador <SortIcon columnKey="nome" />
                            </TableHead>
                            <TableHead className="cursor-pointer hover:bg-muted/50" onClick={() => handleSort('cod_colab')}>
                                Código <SortIcon columnKey="cod_colab" />
                            </TableHead>
                            <TableHead className="cursor-pointer hover:bg-muted/50" onClick={() => handleSort('housing_benefit_status')}>
                                Status Benefício <SortIcon columnKey="housing_benefit_status" />
                            </TableHead>
                            <TableHead className="cursor-pointer hover:bg-muted/50" onClick={() => handleSort('housing_benefit_amount')}>
                                Valor Mensal <SortIcon columnKey="housing_benefit_amount" />
                            </TableHead>
                            <TableHead className="cursor-pointer hover:bg-muted/50" onClick={() => handleSort('housing_benefit_date')}>
                                Data Inicial <SortIcon columnKey="housing_benefit_date" />
                            </TableHead>
                            <TableHead className="text-right">Ações</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {filteredAndSortedWorkers.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={6} className="text-center h-24 text-muted-foreground">
                                    Nenhum trabalhador encontrado com os filtros atuais.
                                </TableCell>
                            </TableRow>
                        ) : (
                            filteredAndSortedWorkers.map(w => {
                                const hasBenefit = !!w.housing_benefit;
                                return (
                                    <TableRow key={w.id}>
                                        <TableCell className="font-medium">
                                            {w.nome}
                                            <div className="text-xs text-muted-foreground mt-0.5 whitespace-nowrap overflow-hidden text-ellipsis max-w-[200px]">
                                                {w.cliente_nombre ? `${w.cliente_nombre}` : ''} {w.contratante ? `- ${w.contratante}` : ''}
                                            </div>
                                        </TableCell>
                                        <TableCell>{w.cod_colab}</TableCell>
                                        <TableCell>
                                            {hasBenefit ? (
                                                <span className="flex items-center text-emerald-600 dark:text-emerald-400 text-sm font-medium">
                                                    <Link2 className="h-4 w-4 mr-1" /> Ativo
                                                </span>
                                            ) : (
                                                <span className="flex items-center text-muted-foreground text-sm font-medium">
                                                    <Link2Off className="h-4 w-4 mr-1" /> Não Vinculado
                                                </span>
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            {hasBenefit ? `€ ${w.housing_benefit!.monthly_amount.toFixed(2)}` : '-'}
                                        </TableCell>
                                        <TableCell>
                                            {hasBenefit && w.housing_benefit!.start_date ? format(new Date(w.housing_benefit!.start_date), 'dd/MM/yyyy') : '-'}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <Button variant="ghost" size="sm" onClick={() => handleEditClick(w)}>
                                                <Edit className="h-4 w-4 mr-2" />
                                                Editar
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                );
                            })
                        )}
                    </TableBody>
                </Table>
            </div>

            {selectedWorker && empresaId && (
                <EditHousingDialog
                    open={isEditOpen}
                    onOpenChange={setIsEditOpen}
                    workerId={selectedWorker.id}
                    empresaId={empresaId}
                    workerName={selectedWorker.nome}
                    existingBenefit={selectedWorker.housing_benefit}
                />
            )}

            <ImportHousingDialog
                open={isImportOpen}
                onOpenChange={setIsImportOpen}
            />
        </div>
    );
}
