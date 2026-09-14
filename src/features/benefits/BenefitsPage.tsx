import { useState, useMemo, useEffect } from 'react';
import { useEmpresa } from '@/app/providers/EmpresaProvider';
import { useWorkersWithHousing } from './hooks/useWorkersWithHousing';
import { EditHousingDialog } from './components/EditHousingDialog';
import { ImportHousingDialog } from './components/ImportHousingDialog';
import { CreateBenefitDialog } from './components/CreateBenefitDialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Edit, FileSpreadsheet, Loader2, Link2Off, Link2, ArrowUpDown, ArrowUp, ArrowDown, Undo2, DownloadCloud, X } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { ptBR, es } from 'date-fns/locale';
import { useTranslation } from 'react-i18next';
import type { WorkerWithHousing } from '@/shared/types/corePersonal';
import { useDeleteHousingBatch } from './hooks/useDeleteHousingBatch';
import { MultiSelect } from '@/components/ui/multi-select';
import { useUniqueClients } from '../workers/hooks/useUniqueClients';
import { useBenefitCategories } from '@/features/settings/hooks/useCategories';
import { useSearchParams } from 'react-router-dom';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { normalizeEmpresaName, matchesEmpresaFilter, CANONICAL_EMPRESAS } from '@/shared/utils/empresaNormalizer';
import { isHoldingId } from '@/shared/utils/empresaUtils';

export function BenefitsPage() {
    const { i18n } = useTranslation();
    const { selectedEmpresaId: empresaId, empresas } = useEmpresa();
    const [searchParams, setSearchParams] = useSearchParams();

    const { data: workers, isLoading, isError } = useWorkersWithHousing(empresaId || undefined);
    const { data: benefitCategoriesData } = useBenefitCategories(empresaId || undefined);

    const [isRevertBannerDismissed, setIsRevertBannerDismissed] = useState(false);

    // Default to current competence month (e.g. "2026-08")
    const defaultMonth = useMemo(() => format(new Date(), 'yyyy-MM'), []);

    // Filters from URL
    const searchTerm = searchParams.get('search') || '';
    const selectedClient = searchParams.get('client')?.split('||').filter(Boolean) || [];
    const selectedCompany = searchParams.get('company') || 'ALL';
    const selectedCategory = searchParams.get('category') || 'ALL';
    const monthFilter = searchParams.get('month') !== null ? (searchParams.get('month') || '') : defaultMonth;

    // Month options list (last 12 months + next 2 months)
    const monthOptions = useMemo(() => {
        const list: { value: string; label: string }[] = [
            { value: 'ALL', label: 'Todos os Meses (Histórico Completo)' }
        ];

        for (let i = -2; i < 12; i++) {
            const d = new Date();
            d.setDate(1);
            d.setMonth(d.getMonth() - i);
            const val = format(d, 'yyyy-MM');
            const label = format(d, 'MMMM yyyy', { locale: i18n.language.startsWith('pt') ? ptBR : es });
            const capitalizedLabel = label.charAt(0).toUpperCase() + label.slice(1);
            list.push({ value: val, label: capitalizedLabel });
        }

        return list;
    }, [i18n.language]);

    // Keep selectedCompany synced with header Empresa context
    useEffect(() => {
        if (!empresaId || empresaId === 'all' || isHoldingId(empresaId, empresas)) {
            if (selectedCompany !== 'ALL' && !searchParams.has('company')) {
                // keep
            }
            return;
        }

        if (empresaId && empresas) {
            const currentEmpresa = empresas.find(e => String(e.id) === String(empresaId));
            if (currentEmpresa) {
                const normCurrent = normalizeEmpresaName(currentEmpresa.trade_name || currentEmpresa.nome);
                if (normCurrent && normCurrent !== selectedCompany) {
                    updateSearchParams({ company: normCurrent });
                }
            }
        }
    }, [empresaId, empresas]);

    // Sort from URL
    const sortKeyParam = searchParams.get('sortKey');
    const sortDirParam = searchParams.get('sortDir') as 'asc' | 'desc' | null;
    const sortConfig = sortKeyParam && sortDirParam ? { key: sortKeyParam as any, direction: sortDirParam } : null;

    const updateSearchParams = (updates: Record<string, string | string[] | null | undefined>) => {
        const newParams = new URLSearchParams(searchParams);
        Object.entries(updates).forEach(([key, value]) => {
            if (value === null || value === undefined || value === 'ALL' || (Array.isArray(value) && value.length === 0)) {
                newParams.delete(key);
            } else if (Array.isArray(value)) {
                newParams.set(key, value.join('||'));
            } else {
                newParams.set(key, value.toString());
            }
        });
        setSearchParams(newParams, { replace: true });
    };

    const { mutate: deleteBatch, isPending: isDeletingBatch } = useDeleteHousingBatch();

    // Edit Modal State
    const [isEditOpen, setIsEditOpen] = useState(false);
    const [selectedWorker, setSelectedWorker] = useState<WorkerWithHousing | null>(null);

    const { data: globalClientsList } = useUniqueClients();
    const uniqueClients = useMemo(() => {
        if (globalClientsList) return globalClientsList;
        if (!workers) return [];
        const clients = new Set(workers.map(w => w.cliente_nombre).filter(Boolean) as string[]);
        return Array.from(clients).sort();
    }, [workers, globalClientsList]);

    const availableCategories = useMemo(() => {
        const defaultCats = [
            'AUXILIO MORADIA',
            'HORAS EXTRAS',
            'TRABALHO NOTURNO',
            'SUBSÍDIO ALIMENTAÇÃO',
            'REEMBOLSO DE DESPESAS',
            'HORAS PENDENTES',
            'SUBSÍDIO TRANSPORTE',
            'AJUDA DE CUSTO',
            'FÉRIAS',
            'OUTROS'
        ];
        if (benefitCategoriesData && benefitCategoriesData.length > 0) {
            const customNames = benefitCategoriesData.map(c => c.name);
            return Array.from(new Set([...defaultCats, ...customNames]));
        }
        return defaultCats;
    }, [benefitCategoriesData]);

    const handleSort = (key: keyof WorkerWithHousing | 'housing_benefit_status' | 'housing_benefit_amount' | 'housing_benefit_date' | 'category') => {
        let direction: 'asc' | 'desc' = 'asc';
        if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc';
        }
        updateSearchParams({ sortKey: key, sortDir: direction });
    };

    const handleUndoBatch = (batchId: string) => {
        if (confirm('Atenção: Você está prestes a excluir todos os benefícios/proventos importados neste lote. Continuar?')) {
            deleteBatch(batchId);
        }
    };

    // Recent Batches: only show batches relevant to the selected month OR created within last 48h
    const recentBatches = useMemo(() => {
        if (!workers) return [];

        const now = Date.now();
        const twoDaysAgo = now - (48 * 60 * 60 * 1000);

        const map = new Map<string, { time: number; count: number; month: string }>();
        workers.forEach(w => {
            const h = w.housing_benefit;
            if (h && h.import_batch_id) {
                const time = new Date(h.created_at || Date.now()).getTime();
                const bMonth = (h.start_date || '').substring(0, 7);

                const isRecent = time >= twoDaysAgo;
                const matchesActiveMonth = monthFilter && monthFilter !== 'ALL' ? bMonth === monthFilter : true;

                if (isRecent || matchesActiveMonth) {
                    const existing = map.get(h.import_batch_id);
                    if (!existing) {
                        map.set(h.import_batch_id, { time, count: 1, month: bMonth });
                    } else {
                        map.set(h.import_batch_id, {
                            time: Math.max(existing.time, time),
                            count: existing.count + 1,
                            month: bMonth
                        });
                    }
                }
            }
        });

        return Array.from(map.entries())
            .sort((a, b) => b[1].time - a[1].time)
            .slice(0, 3)
            .map(([id, data]) => ({ id, count: data.count, date: new Date(data.time), month: data.month }));
    }, [workers, monthFilter]);

    const filteredAndSortedWorkers = useMemo(() => {
        if (!workers) return [];

        let result = workers.filter(w => {
            const matchesSearch = w.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
                w.cod_colab.toLowerCase().includes(searchTerm.toLowerCase());
            const matchesClient = selectedClient.length === 0 || selectedClient.includes(w.cliente_nombre || '');
            const matchesCompany = selectedCompany === 'ALL' || matchesEmpresaFilter(w.contratante, selectedCompany);

            const bCategory = w.housing_benefit?.category || (w.housing_benefit ? 'Auxílio Moradia' : '');
            const matchesCategory = selectedCategory === 'ALL' || bCategory.toUpperCase() === selectedCategory.toUpperCase();

            let matchesMonth = true;
            if (monthFilter && monthFilter !== 'ALL' && w.housing_benefit?.start_date) {
                const bMonth = w.housing_benefit.start_date.substring(0, 7);
                matchesMonth = bMonth === monthFilter;
            } else if (monthFilter && monthFilter !== 'ALL' && !w.housing_benefit) {
                matchesMonth = false;
            }

            return matchesSearch && matchesClient && matchesCompany && matchesCategory && matchesMonth;
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
                } else if (sortConfig.key === 'category' as any) {
                    aVal = a.housing_benefit?.category || '';
                    bVal = b.housing_benefit?.category || '';
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
    }, [workers, searchTerm, selectedClient, selectedCompany, selectedCategory, monthFilter, sortConfig]);

    // KPI stats
    const totalBenefitAmount = useMemo(() => {
        return filteredAndSortedWorkers.reduce((acc, w) => {
            if (w.housing_benefit?.monthly_amount) {
                return acc + Number(w.housing_benefit.monthly_amount);
            }
            return acc;
        }, 0);
    }, [filteredAndSortedWorkers]);

    const categoryStats = useMemo(() => {
        const stats: Record<string, number> = {};
        filteredAndSortedWorkers.forEach(w => {
            if (w.housing_benefit) {
                const cat = w.housing_benefit.category || 'Auxílio Moradia';
                stats[cat] = (stats[cat] || 0) + Number(w.housing_benefit.monthly_amount);
            }
        });
        return Object.entries(stats).sort((a, b) => b[1] - a[1]).slice(0, 3);
    }, [filteredAndSortedWorkers]);

    const handleEditClick = (worker: WorkerWithHousing) => {
        setSelectedWorker(worker);
        setIsEditOpen(true);
    };

    const handleExportExcel = () => {
        if (!filteredAndSortedWorkers.length) return;

        const headers = ['Trabalhador', 'Código', 'Cliente', 'Contratante', 'Categoria Provento', 'Valor Mensal (€)', 'Data Inicial', 'Status'];
        const rows = filteredAndSortedWorkers.map(w => [
            w.nome,
            w.cod_colab || '',
            w.cliente_nombre || '',
            normalizeEmpresaName(w.contratante) || '',
            w.housing_benefit?.category || (w.housing_benefit ? 'Auxílio Moradia' : '-'),
            w.housing_benefit ? w.housing_benefit.monthly_amount.toFixed(2) : '0.00',
            w.housing_benefit?.start_date ? format(new Date(w.housing_benefit.start_date), 'dd/MM/yyyy') : '-',
            w.housing_benefit ? 'Ativo' : 'Não Vinculado'
        ]);

        const csvContent = "data:text/csv;charset=utf-8,"
            + headers.join(",") + "\n"
            + rows.map(e => e.join(",")).join("\n");

        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `proventos_beneficios_${monthFilter || 'todos'}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
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
                    <h1 className="text-3xl font-bold tracking-tight">Gestão de Proventos e Benefícios</h1>
                    <p className="text-muted-foreground">Gestão global de benefícios, adicionais e proventos dos trabalhadores.</p>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                    <CreateBenefitDialog />
                    <ImportHousingDialog
                        workers={workers || []}
                        defaultCompetence={monthFilter && monthFilter !== 'ALL' ? monthFilter : defaultMonth}
                        trigger={
                            <Button variant="outline" className="border-emerald-200 text-emerald-700 hover:bg-emerald-50">
                                <DownloadCloud className="mr-2 h-4 w-4" />
                                Importar Planilha
                            </Button>
                        }
                    />
                    <Button variant="outline" onClick={handleExportExcel}>
                        <FileSpreadsheet className="mr-2 h-4 w-4 text-green-600" />
                        Exportar
                    </Button>
                </div>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-white rounded-xl shadow-sm border p-6 flex flex-col justify-center">
                    <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Total em Proventos</h3>
                    <div className="mt-2 text-3xl font-bold text-gray-900">€ {totalBenefitAmount.toFixed(2)}</div>
                    <p className="mt-1 text-xs text-muted-foreground">{filteredAndSortedWorkers.filter(w => w.housing_benefit).length} trabalhador(es) com benefício</p>
                </div>
                {categoryStats.map(([cat, val]) => (
                    <div key={cat} className="bg-white rounded-xl shadow-sm border p-6 flex flex-col justify-center">
                        <h3 className="text-sm font-bold text-emerald-800 uppercase tracking-tight truncate" title={cat}>{cat}</h3>
                        <div className="mt-2 text-2xl font-bold text-gray-700">€ {val.toFixed(2)}</div>
                    </div>
                ))}
            </div>

            {/* Batch Revert Section (Dismissible & Context-aware) */}
            {recentBatches.length > 0 && !isRevertBannerDismissed && (
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-amber-50/70 rounded-xl p-4 border border-amber-200/70">
                    <div className="space-y-1">
                        <div className="text-sm font-semibold text-amber-900 flex items-center gap-2">
                            <Undo2 className="h-4 w-4 text-amber-700" /> Importações Recentes Disponíveis para Reversão
                        </div>
                        <p className="text-xs text-amber-700">
                            Se você realizou uma importação com erros, clique abaixo para desfazê-la em lote:
                        </p>
                        <div className="flex gap-2 flex-wrap pt-1">
                            {recentBatches.map(b => (
                                <Button
                                    key={b.id}
                                    variant="outline"
                                    size="sm"
                                    className="bg-white text-xs font-semibold text-red-600 hover:text-red-700 hover:bg-red-50 border-amber-200 shadow-sm"
                                    onClick={() => handleUndoBatch(b.id)}
                                    disabled={isDeletingBatch}
                                >
                                    Reverter Lote {format(b.date, 'dd/MM HH:mm')} ({b.count} itens)
                                </Button>
                            ))}
                        </div>
                    </div>
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-amber-700 hover:text-amber-900 hover:bg-amber-100/60 self-start sm:self-center"
                        onClick={() => setIsRevertBannerDismissed(true)}
                        title="Ocultar aviso de reversão"
                    >
                        <X className="h-4 w-4" />
                    </Button>
                </div>
            )}

            {/* Filters */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 bg-white p-4 rounded-xl border shadow-sm items-end">
                <div className="space-y-1.5 w-full">
                    <label className="text-xs font-medium text-gray-700">Buscar Trabalhador</label>
                    <Input
                        placeholder="Nome ou código..."
                        value={searchTerm}
                        onChange={(e) => updateSearchParams({ search: e.target.value })}
                        className="w-full bg-background"
                    />
                </div>

                {/* Mês / Competência */}
                <div className="space-y-1.5 w-full">
                    <label className="text-xs font-semibold text-gray-700">Mês / Competência</label>
                    <Select
                        value={monthFilter || 'ALL'}
                        onValueChange={(v) => updateSearchParams({ month: v === 'ALL' ? '' : v })}
                    >
                        <SelectTrigger className="font-medium">
                            <SelectValue placeholder="Selecione o mês..." />
                        </SelectTrigger>
                        <SelectContent>
                            {monthOptions.map(m => (
                                <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                {/* Empresa */}
                <div className="space-y-1.5 w-full">
                    <label className="text-xs font-semibold text-gray-700">Empresa (Contratante)</label>
                    <Select
                        value={selectedCompany}
                        onValueChange={(v) => updateSearchParams({ company: v })}
                    >
                        <SelectTrigger>
                            <SelectValue placeholder="Todas as Empresas" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="ALL">Todas as Empresas</SelectItem>
                            {CANONICAL_EMPRESAS.map(company => (
                                <SelectItem key={company} value={company}>{company}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                {/* Cliente */}
                <div className="space-y-1.5 w-full">
                    <label className="text-xs font-semibold text-gray-700">Cliente</label>
                    <MultiSelect
                        options={uniqueClients.filter(c => c && c.trim() !== '').map(client => ({ value: client, label: client })) || []}
                        selected={selectedClient}
                        onChange={(val) => updateSearchParams({ client: val })}
                        placeholder="Filtrar por Cliente"
                        emptyText="Nenhum cliente"
                    />
                </div>

                {/* Categoria Provento */}
                <div className="space-y-1.5 w-full">
                    <label className="text-xs font-semibold text-gray-700">Categoria Provento</label>
                    <Select
                        value={selectedCategory}
                        onValueChange={(v) => updateSearchParams({ category: v })}
                    >
                        <SelectTrigger>
                            <SelectValue placeholder="Todas as Categorias" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="ALL">Todas as Categorias</SelectItem>
                            {availableCategories.map(cat => (
                                <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            </div>

            {/* Table */}
            <div className="bg-white border rounded-xl shadow-sm overflow-hidden flex flex-col max-h-[calc(100vh-260px)] min-h-[450px]">
                <div className="overflow-auto flex-1">
                    <Table>
                        <TableHeader className="bg-slate-100 dark:bg-slate-900 sticky top-0 z-10 shadow-sm backdrop-blur-sm">
                            <TableRow>
                                <TableHead className="cursor-pointer font-semibold text-slate-800 dark:text-slate-200" onClick={() => handleSort('nome')}>
                                    Trabalhador <SortIcon columnKey="nome" />
                                </TableHead>
                                <TableHead className="cursor-pointer font-semibold text-slate-800 dark:text-slate-200" onClick={() => handleSort('cod_colab')}>
                                    Código <SortIcon columnKey="cod_colab" />
                                </TableHead>
                                <TableHead className="cursor-pointer font-semibold text-slate-800 dark:text-slate-200" onClick={() => handleSort('cliente_nombre')}>
                                    Cliente <SortIcon columnKey="cliente_nombre" />
                                </TableHead>
                                <TableHead className="cursor-pointer font-semibold text-slate-800 dark:text-slate-200" onClick={() => handleSort('contratante')}>
                                    Contratante <SortIcon columnKey="contratante" />
                                </TableHead>
                                <TableHead className="cursor-pointer font-semibold text-slate-800 dark:text-slate-200" onClick={() => handleSort('category')}>
                                    Tipo de Provento <SortIcon columnKey="category" />
                                </TableHead>
                                <TableHead className="cursor-pointer font-semibold text-slate-800 dark:text-slate-200" onClick={() => handleSort('housing_benefit_status')}>
                                    Status <SortIcon columnKey="housing_benefit_status" />
                                </TableHead>
                                <TableHead className="cursor-pointer font-semibold text-slate-800 dark:text-slate-200" onClick={() => handleSort('housing_benefit_amount')}>
                                    Valor Mensal (€) <SortIcon columnKey="housing_benefit_amount" />
                                </TableHead>
                                <TableHead className="cursor-pointer font-semibold text-slate-800 dark:text-slate-200" onClick={() => handleSort('housing_benefit_date')}>
                                    Data Inicial <SortIcon columnKey="housing_benefit_date" />
                                </TableHead>
                                <TableHead className="text-right font-semibold text-slate-800 dark:text-slate-200">Ações</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredAndSortedWorkers.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={9} className="h-24 text-center text-muted-foreground">
                                        Nenhum benefício ou provento encontrado com os filtros atuais.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                filteredAndSortedWorkers.map((worker) => {
                                    const benefit = worker.housing_benefit;
                                    const hasBenefit = Boolean(benefit);

                                    return (
                                        <TableRow key={worker.id} className="hover:bg-muted/50">
                                            <TableCell className="font-medium text-slate-900">{worker.nome}</TableCell>
                                            <TableCell className="font-mono text-xs">{worker.cod_colab}</TableCell>
                                            <TableCell className="text-muted-foreground text-xs">{worker.cliente_nombre || '-'}</TableCell>
                                            <TableCell className="font-semibold text-xs text-slate-800">{normalizeEmpresaName(worker.contratante) || '-'}</TableCell>
                                            <TableCell>
                                                {benefit ? (
                                                    <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 font-semibold">
                                                        {benefit.category || 'Auxílio Moradia'}
                                                    </Badge>
                                                ) : (
                                                    <span className="text-muted-foreground text-xs">-</span>
                                                )}
                                            </TableCell>
                                            <TableCell>
                                                {hasBenefit ? (
                                                    <Badge variant="secondary" className="bg-green-100 text-green-800 border-green-200">
                                                        <Link2 className="h-3 w-3 mr-1" /> Ativo
                                                    </Badge>
                                                ) : (
                                                    <Badge variant="outline" className="text-slate-500 border-slate-200">
                                                        <Link2Off className="h-3 w-3 mr-1" /> Não Vinculado
                                                    </Badge>
                                                )}
                                            </TableCell>
                                            <TableCell className="font-semibold">
                                                {hasBenefit ? `€ ${benefit!.monthly_amount.toFixed(2)}` : '-'}
                                            </TableCell>
                                            <TableCell className="text-muted-foreground text-xs">
                                                {benefit?.start_date ? format(new Date(benefit.start_date), 'dd/MM/yyyy') : '-'}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => handleEditClick(worker)}
                                                    className="h-8 w-8 p-0"
                                                >
                                                    <Edit className="h-4 w-4 text-emerald-600" />
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    );
                                })
                            )}
                        </TableBody>
                    </Table>
                </div>
            </div>

            {/* Edit Dialog */}
            {selectedWorker && (
                <EditHousingDialog
                    worker={selectedWorker}
                    open={isEditOpen}
                    onOpenChange={setIsEditOpen}
                />
            )}
        </div>
    );
}
