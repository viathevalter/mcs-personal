import { useState, useMemo, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAllDiscounts } from '../hooks/useAllDiscounts';
import type { DiscountCategory, DiscountStatus } from '../types';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { format, parseISO } from 'date-fns';
import { ptBR, es } from 'date-fns/locale';
import { Search, FileSpreadsheet, DownloadCloud, Trash2, Edit, Undo2, X, Filter, ArrowUpDown, ArrowUp, ArrowDown, Eye, CheckSquare, Square } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { ImportDiscountsDialog } from '../components/ImportDiscountsDialog';
import { EditDiscountDialog } from '../components/EditDiscountDialog';
import { ExportDiscountsDialog } from '../components/ExportDiscountsDialog';
import { ViewDiscountDetailsModal } from '../components/ViewDiscountDetailsModal';
import { useDeleteDiscount, useDeleteDiscountBatch } from '../hooks/useDiscountMutations';
import { useEmpresa } from '@/app/providers/EmpresaProvider';
import { useDiscountCategories } from '@/features/settings/hooks/useCategories';
import { normalizeDiscountCategoryName, STANDARD_DISCOUNT_CATEGORIES } from '../utils/categoryUtils';
import { useSearchParams } from 'react-router-dom';
import { CreateDiscountDialog } from '../components/CreateDiscountDialog';
import { normalizeEmpresaName, matchesEmpresaFilter, CANONICAL_EMPRESAS } from '@/shared/utils/empresaNormalizer';
import { useUniqueClients } from '@/features/workers/hooks/useUniqueClients';
import { isHoldingId } from '@/shared/utils/empresaUtils';

export function isDateInCompetence(dateStr?: string | null, mesCompetencia?: string | null): boolean {
    if (!mesCompetencia || mesCompetencia === 'ALL') return true;
    if (!dateStr) return false;
    const str = String(dateStr).trim();

    // mesCompetencia is formatted as "YYYY-MM" (e.g. "2026-07")
    const [year, month] = mesCompetencia.split('-');
    if (!year || !month) return true;

    // 1. ISO style: 2026-07-xx or 2026-07
    if (str.startsWith(`${year}-${month}`)) return true;

    // 2. Slash style: DD/MM/YYYY or D/M/YYYY
    const slashParts = str.split('/');
    if (slashParts.length === 3) {
        const dMonth = slashParts[1].padStart(2, '0');
        const dYear = slashParts[2].substring(0, 4);
        if (dYear === year && dMonth === month) return true;
    }

    // 3. Dash style: DD-MM-YYYY
    const dashParts = str.split('-');
    if (dashParts.length === 3 && dashParts[0].length <= 2) {
        const dMonth = dashParts[1].padStart(2, '0');
        const dYear = dashParts[2].substring(0, 4);
        if (dYear === year && dMonth === month) return true;
    }

    return false;
}

export function formatDisplayDate(dateStr?: string | null, locale = ptBR): string {
    if (!dateStr) return '-';
    try {
        const str = String(dateStr).trim();
        if (str.includes('/')) {
            const parts = str.split('/');
            if (parts.length === 3) {
                const d = new Date(Number(parts[2]), Number(parts[1]) - 1, Number(parts[0]));
                return format(d, 'MMM yyyy', { locale });
            }
        }
        return format(parseISO(str), 'MMM yyyy', { locale });
    } catch {
        return dateStr;
    }
}

export function DiscountsPage() {
    const { i18n } = useTranslation();
    const { data: allDiscounts, isLoading } = useAllDiscounts();
    const { selectedEmpresaId, empresas } = useEmpresa();
    const { data: discountCategories = [] } = useDiscountCategories(selectedEmpresaId || undefined);
    const { data: clientsList = [] } = useUniqueClients();
    const [searchParams, setSearchParams] = useSearchParams();

    const [isRevertBannerDismissed, setIsRevertBannerDismissed] = useState(false);

    // Default to current competence month (e.g. "2026-08")
    const defaultMonth = useMemo(() => format(new Date(), 'yyyy-MM'), []);

    // Filters from URL
    const searchTerm = searchParams.get('search') || '';
    const selectedCategory = (searchParams.get('category') as DiscountCategory | 'ALL') || 'ALL';
    const selectedStatus = (searchParams.get('status') as DiscountStatus | 'ALL') || 'ALL';
    const monthFilter = searchParams.get('month') !== null ? (searchParams.get('month') || '') : defaultMonth;
    const companyFilter = searchParams.get('company') || 'ALL';
    const clientFilter = searchParams.get('client') || 'ALL';

    const updateSearchParams = (updates: Record<string, string | null | undefined>) => {
        const newParams = new URLSearchParams(searchParams);
        Object.entries(updates).forEach(([key, value]) => {
            if (value === null || value === undefined || value === 'ALL') {
                newParams.delete(key);
            } else {
                newParams.set(key, value);
            }
        });
        setSearchParams(newParams, { replace: true });
    };

    // Keep companyFilter synced with header Empresa context
    useEffect(() => {
        if (!selectedEmpresaId || selectedEmpresaId === 'all' || isHoldingId(selectedEmpresaId, empresas)) {
            if (companyFilter !== 'ALL' && !searchParams.has('company')) {
                // leave as is or ALL
            }
            return;
        }

        if (selectedEmpresaId && empresas) {
            const currentEmpresa = empresas.find(e => String(e.id) === String(selectedEmpresaId));
            if (currentEmpresa) {
                const normCurrent = normalizeEmpresaName(currentEmpresa.trade_name || currentEmpresa.nome);
                if (normCurrent && normCurrent !== companyFilter) {
                    updateSearchParams({ company: normCurrent });
                }
            }
        }
    }, [selectedEmpresaId, empresas]);

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

    // Unique clients from discounts data + global list
    const availableClients = useMemo(() => {
        const set = new Set<string>(clientsList);
        (allDiscounts || []).forEach(d => {
            if (d.workers?.cliente_nombre) set.add(d.workers.cliente_nombre);
        });
        return Array.from(set).filter(Boolean).sort((a, b) => a.localeCompare(b, 'pt-BR'));
    }, [allDiscounts, clientsList]);

    // Filter application
    const filteredDiscounts = useMemo(() => {
        if (!allDiscounts) return [];

        return allDiscounts.filter((discount) => {
            const worker = discount.workers || ({} as any);

            // 1. Search term (Worker Name or Code or Description)
            const matchesSearch =
                (worker.nome || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                (worker.cod_colab || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                (discount.description || '').toLowerCase().includes(searchTerm.toLowerCase());
            if (searchTerm && !matchesSearch) return false;

            // 2. Category
            if (selectedCategory !== 'ALL') {
                const itemCat = normalizeDiscountCategoryName(discount.category, discountCategories);
                const filterCat = normalizeDiscountCategoryName(selectedCategory, discountCategories);
                if (itemCat !== filterCat && discount.category !== selectedCategory) return false;
            }

            // 3. Status
            if (selectedStatus !== 'ALL' && discount.status !== selectedStatus) return false;

            // 4. Month filter (robust across ISO, slash DD/MM/YYYY, dash DD-MM-YYYY)
            if (monthFilter && monthFilter !== 'ALL') {
                if (!isDateInCompetence(discount.reference_date, monthFilter)) return false;
            }

            // 5. Company filter
            if (companyFilter && companyFilter !== 'ALL') {
                const discountEmpresaObj = empresas?.find(e => String(e.id) === String(discount.empresa_id));
                const discountEmpresaName = discountEmpresaObj?.trade_name || discountEmpresaObj?.nome || '';
                const workerContratante = worker.contratante || '';
                const matchesByDiscountEmpresa = discountEmpresaName ? matchesEmpresaFilter(discountEmpresaName, companyFilter) : false;
                const matchesByWorkerContratante = matchesEmpresaFilter(workerContratante, companyFilter);
                if (!matchesByDiscountEmpresa && !matchesByWorkerContratante) return false;
            }

            // 6. Client filter
            if (clientFilter && clientFilter !== 'ALL') {
                const workerClient = worker.cliente_nombre || '';
                if (workerClient && workerClient.toLowerCase() !== clientFilter.toLowerCase()) return false;
            }

            return true;
        });
    }, [allDiscounts, searchTerm, selectedCategory, selectedStatus, monthFilter, companyFilter, clientFilter, discountCategories]);

    const { mutate: deleteDiscount } = useDeleteDiscount();
    const { mutate: deleteBatch, isPending: isDeletingBatch } = useDeleteDiscountBatch();

    const handleDelete = (id: string) => {
        if (confirm('Tem certeza que deseja excluir este desconto?')) {
            deleteDiscount(id);
        }
    };

    const handleUndoBatch = (batchId: string) => {
        if (confirm('Atenção: Você está prestes a excluir TODOS os descontos criados nesta importação. Continuar?')) {
            deleteBatch(batchId);
        }
    };

    // Category Stats (filtered)
    const categoryStats = useMemo(() => {
        if (!allDiscounts) return [];
        const stats: Record<string, number> = {};
        filteredDiscounts.forEach(d => {
            const normalized = normalizeDiscountCategoryName(d.category, discountCategories) || d.category;
            stats[normalized] = (stats[normalized] || 0) + Number(d.amount);
        });
        return Object.entries(stats).sort((a, b) => b[1] - a[1]).slice(0, 3);
    }, [filteredDiscounts, allDiscounts, discountCategories]);

    // Sorting state
    type SortField = 'worker_nome' | 'empresa' | 'reference_date' | 'category' | 'amount' | 'status';
    const [sortField, setSortField] = useState<SortField>('worker_nome');
    const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

    const handleSort = (field: SortField) => {
        if (sortField === field) {
            setSortDirection(prev => (prev === 'asc' ? 'desc' : 'asc'));
        } else {
            setSortField(field);
            setSortDirection('asc');
        }
    };

    const sortedDiscounts = useMemo(() => {
        return [...filteredDiscounts].sort((a, b) => {
            let aVal: any = '';
            let bVal: any = '';

            switch (sortField) {
                case 'worker_nome':
                    aVal = (a.workers?.nome || '').toLowerCase();
                    bVal = (b.workers?.nome || '').toLowerCase();
                    break;
                case 'empresa':
                    const empA = empresas?.find(e => String(e.id) === String(a.empresa_id));
                    const empB = empresas?.find(e => String(e.id) === String(b.empresa_id));
                    aVal = (empA?.trade_name || empA?.nome || a.workers?.contratante || '').toLowerCase();
                    bVal = (empB?.trade_name || empB?.nome || b.workers?.contratante || '').toLowerCase();
                    break;
                case 'reference_date':
                    aVal = a.reference_date || '';
                    bVal = b.reference_date || '';
                    break;
                case 'category':
                    aVal = (a.category || '').toLowerCase();
                    bVal = (b.category || '').toLowerCase();
                    break;
                case 'amount':
                    aVal = Number(a.amount || 0);
                    bVal = Number(b.amount || 0);
                    break;
                case 'status':
                    aVal = (a.status || '').toLowerCase();
                    bVal = (b.status || '').toLowerCase();
                    break;
            }

            if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
            if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
            return 0;
        });
    }, [filteredDiscounts, sortField, sortDirection, empresas]);

    const renderSortHeader = (label: string, field: SortField) => {
        const isActive = sortField === field;
        return (
            <button
                type="button"
                onClick={() => handleSort(field)}
                className="flex items-center gap-1.5 hover:text-indigo-600 focus:outline-none transition-colors uppercase font-semibold text-xs tracking-wider"
            >
                <span>{label}</span>
                {isActive ? (
                    sortDirection === 'asc' ? <ArrowUp className="h-3.5 w-3.5 text-indigo-600" /> : <ArrowDown className="h-3.5 w-3.5 text-indigo-600" />
                ) : (
                    <ArrowUpDown className="h-3.5 w-3.5 opacity-40 hover:opacity-100" />
                )}
            </button>
        );
    };

    // Modal & Selection States
    const [selectedDiscountIdForView, setSelectedDiscountIdForView] = useState<string | null>(null);
    const [selectedDiscountIds, setSelectedDiscountIds] = useState<Set<string>>(new Set());

    const isAllSelected = sortedDiscounts.length > 0 && selectedDiscountIds.size === sortedDiscounts.length;

    const handleToggleSelectAll = () => {
        if (isAllSelected) {
            setSelectedDiscountIds(new Set());
        } else {
            setSelectedDiscountIds(new Set(sortedDiscounts.map(d => d.id)));
        }
    };

    const handleToggleSelectDiscount = (id: string, e?: React.MouseEvent) => {
        if (e) e.stopPropagation();
        const newSet = new Set(selectedDiscountIds);
        if (newSet.has(id)) {
            newSet.delete(id);
        } else {
            newSet.add(id);
        }
        setSelectedDiscountIds(newSet);
    };

    const handleBatchDeleteSelected = () => {
        if (selectedDiscountIds.size === 0) return;
        if (confirm(`Tem certeza que deseja excluir os ${selectedDiscountIds.size} descontos selecionados?`)) {
            selectedDiscountIds.forEach(id => {
                deleteDiscount(id);
            });
            setSelectedDiscountIds(new Set());
        }
    };

    // Recent Batches: only show batches relevant to the selected month OR created within last 48h
    const recentBatches = useMemo(() => {
        if (!allDiscounts) return [];

        const now = Date.now();
        const twoDaysAgo = now - (48 * 60 * 60 * 1000);

        const map = new Map<string, { time: number; count: number; month: string }>();
        allDiscounts.forEach(d => {
            if (d.import_batch_id) {
                const time = new Date(d.created_at).getTime();
                const dMonth = (d.reference_date || '').substring(0, 7);

                // Check relevance: either created in last 48h OR matches active monthFilter
                const isRecent = time >= twoDaysAgo;
                const matchesActiveMonth = monthFilter && monthFilter !== 'ALL' ? dMonth === monthFilter : true;

                if (isRecent || matchesActiveMonth) {
                    const existing = map.get(d.import_batch_id);
                    if (!existing) {
                        map.set(d.import_batch_id, { time, count: 1, month: dMonth });
                    } else {
                        map.set(d.import_batch_id, {
                            time: Math.max(existing.time, time),
                            count: existing.count + 1,
                            month: dMonth
                        });
                    }
                }
            }
        });

        return Array.from(map.entries())
            .sort((a, b) => b[1].time - a[1].time)
            .slice(0, 3)
            .map(([id, data]) => ({ id, count: data.count, date: new Date(data.time), month: data.month }));
    }, [allDiscounts, monthFilter]);

    // Aggregate stats
    const totalAmount = filteredDiscounts.reduce((sum, d) => sum + Number(d.amount), 0);

    const handleExportExcel = () => {
        if (!filteredDiscounts.length) return;

        const headers = ['Trabalhador', 'Código', 'Empresa', 'Cliente', 'Data Referência', 'Categoria', 'Valor', 'Status', 'Recorrente', 'Descrição'];
        const rows = filteredDiscounts.map(d => [
            d.workers?.nome || '-',
            d.workers?.cod_colab || '',
            d.workers?.contratante || '',
            d.workers?.cliente_nombre || '',
            format(parseISO(d.reference_date), 'dd/MM/yyyy'),
            d.category,
            d.amount.toFixed(2),
            d.status,
            d.is_recurring ? 'Sim' : 'Não',
            d.description?.replace(/,/g, ' ') || ''
        ]);

        const csvContent = "data:text/csv;charset=utf-8,"
            + headers.join(",") + "\n"
            + rows.map(e => e.join(",")).join("\n");

        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `descontos_${monthFilter || 'todos'}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <div className="flex flex-col gap-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Gestão de Descontos</h1>
                    <p className="text-muted-foreground">Gestão global e controle mensal de descontos dos trabalhadores.</p>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                    <CreateDiscountDialog />
                    <ImportDiscountsDialog
                        defaultCompetence={monthFilter && monthFilter !== 'ALL' ? monthFilter : defaultMonth}
                        trigger={
                            <Button variant="outline" className="border-indigo-200 text-indigo-700 hover:bg-indigo-50">
                                <DownloadCloud className="mr-2 h-4 w-4" />
                                Importar Planilha
                            </Button>
                        }
                    />
                    <ExportDiscountsDialog
                        discounts={sortedDiscounts as any}
                        monthFilter={monthFilter}
                        empresas={empresas}
                        trigger={
                            <Button variant="outline" className="border-emerald-200 text-emerald-700 hover:bg-emerald-50">
                                <FileSpreadsheet className="mr-2 h-4 w-4 text-emerald-600" />
                                Exportar
                            </Button>
                        }
                    />
                </div>
            </div>

            <div className="space-y-6">
                {/* KPI / Stats Section */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="bg-white rounded-xl shadow-sm border p-6 flex flex-col justify-center">
                        <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Total em Descontos</h3>
                        <div className="mt-2 text-3xl font-bold text-gray-900">€ {totalAmount.toFixed(2)}</div>
                        <p className="mt-1 text-xs text-muted-foreground">{filteredDiscounts.length} registros no período</p>
                    </div>
                    {categoryStats.map(([cat, val]) => (
                        <div key={cat} className="bg-white rounded-xl shadow-sm border p-6 flex flex-col justify-center">
                            <h3 className="text-sm font-bold text-indigo-800 uppercase tracking-tight truncate" title={cat}>{cat}</h3>
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

                {/* Filters bar */}
                <div className="bg-white p-4 rounded-xl shadow-sm border grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 items-end">
                    <div className="space-y-1.5 w-full">
                        <label className="text-xs font-medium text-gray-700">Buscar Trabalhador</label>
                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <Search className="h-4 w-4 text-gray-400" />
                            </div>
                            <Input
                                placeholder="Nome, código..."
                                value={searchTerm}
                                onChange={(e) => updateSearchParams({ search: e.target.value })}
                                className="pl-9"
                            />
                        </div>
                    </div>

                    {/* Mês / Competência */}
                    <div className="space-y-1.5 w-full">
                        <label className="text-xs font-semibold text-gray-700 flex items-center gap-1">
                            <span>Mês / Competência</span>
                        </label>
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

                    {/* Empresa Contratante */}
                    <div className="space-y-1.5 w-full">
                        <label className="text-xs font-semibold text-gray-700">Empresa (Contratante)</label>
                        <Select
                            value={companyFilter}
                            onValueChange={(v) => updateSearchParams({ company: v })}
                        >
                            <SelectTrigger>
                                <SelectValue placeholder="Todas as Empresas" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="ALL">Todas as Empresas</SelectItem>
                                {CANONICAL_EMPRESAS.map(empName => (
                                    <SelectItem key={empName} value={empName}>{empName}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Cliente */}
                    <div className="space-y-1.5 w-full">
                        <label className="text-xs font-semibold text-gray-700">Cliente</label>
                        <Select
                            value={clientFilter}
                            onValueChange={(v) => updateSearchParams({ client: v })}
                        >
                            <SelectTrigger>
                                <SelectValue placeholder="Todos os Clientes" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="ALL">Todos os Clientes</SelectItem>
                                {availableClients.map(cName => (
                                    <SelectItem key={cName} value={cName}>{cName}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Categoria */}
                    <div className="space-y-1.5 w-full">
                        <label className="text-xs font-semibold text-gray-700">Categoria</label>
                        <Select
                            value={selectedCategory}
                            onValueChange={(v: DiscountCategory | 'ALL') => updateSearchParams({ category: v })}
                        >
                            <SelectTrigger>
                                <SelectValue placeholder="Todas as categorias" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="ALL">Todas as categorias</SelectItem>
                                {(discountCategories.length > 0 ? discountCategories.map(c => c.name) : STANDARD_DISCOUNT_CATEGORIES).map(catName => (
                                    <SelectItem key={catName} value={catName}>{catName}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                {/* Contextual Multi-Selection Bar */}
                {selectedDiscountIds.size > 0 && (
                    <div className="flex flex-wrap items-center justify-between gap-3 bg-indigo-50/90 dark:bg-indigo-950/80 p-3 px-6 rounded-xl border border-indigo-200 dark:border-indigo-800 text-xs text-indigo-900 dark:text-indigo-200 animate-in fade-in shadow-sm">
                        <div className="flex items-center gap-2 font-bold">
                            <CheckSquare className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                            <span>{selectedDiscountIds.size} desconto(s) selecionado(s)</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <ExportDiscountsDialog
                                discounts={sortedDiscounts.filter(d => selectedDiscountIds.has(d.id)) as any}
                                monthFilter={monthFilter}
                                empresas={empresas}
                                trigger={
                                    <Button variant="outline" size="sm" className="h-8 text-[11px] bg-white dark:bg-slate-900 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 border-emerald-200 font-semibold shadow-sm">
                                        <FileSpreadsheet className="w-3.5 h-3.5 mr-1 text-emerald-600" />
                                        Exportar Selecionados ({selectedDiscountIds.size})
                                    </Button>
                                }
                            />
                            <Button
                                variant="destructive"
                                size="sm"
                                className="h-8 text-[11px] font-semibold shadow-sm"
                                onClick={handleBatchDeleteSelected}
                            >
                                <Trash2 className="w-3.5 h-3.5 mr-1" />
                                Excluir Selecionados
                            </Button>
                            <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 text-[11px] text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 dark:hover:bg-indigo-900"
                                onClick={() => setSelectedDiscountIds(new Set())}
                            >
                                Desmarcar Todos
                            </Button>
                        </div>
                    </div>
                )}

                {/* Data Table */}
                <div className="bg-white border rounded-xl shadow-sm overflow-hidden flex flex-col max-h-[calc(100vh-260px)] min-h-[450px]">
                    <div className="overflow-auto flex-1">
                        <table className="min-w-full divide-y divide-gray-200 relative">
                            <thead className="bg-slate-100 dark:bg-slate-900 sticky top-0 z-10 shadow-sm backdrop-blur-sm">
                                <tr>
                                    <th scope="col" className="pl-6 pr-2 py-4 text-left w-10">
                                        <Checkbox
                                            checked={isAllSelected}
                                            onCheckedChange={handleToggleSelectAll}
                                            aria-label="Selecionar todos os descontos"
                                        />
                                    </th>
                                    <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                                        {renderSortHeader('Trabalhador', 'worker_nome')}
                                    </th>
                                    <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                                        {renderSortHeader('Empresa / Cliente', 'empresa')}
                                    </th>
                                    <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                                        {renderSortHeader('Data', 'reference_date')}
                                    </th>
                                    <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                                        {renderSortHeader('Categoria', 'category')}
                                    </th>
                                    <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                                        {renderSortHeader('Valor (€)', 'amount')}
                                    </th>
                                    <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                                        {renderSortHeader('Status', 'status')}
                                    </th>
                                    <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-slate-800 dark:text-slate-200 uppercase tracking-wider">Descrição</th>
                                    <th scope="col" className="px-6 py-4 text-right text-xs font-semibold text-slate-800 dark:text-slate-200 uppercase tracking-wider">Ações</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {isLoading ? (
                                    Array.from({ length: 3 }).map((_, i) => (
                                        <tr key={i} className="animate-pulse">
                                            <td colSpan={9} className="px-6 py-5 bg-gray-50/50" />
                                        </tr>
                                    ))
                                ) : sortedDiscounts.length > 0 ? (
                                    sortedDiscounts.map((discount) => {
                                    const discountEmpresaObj = empresas?.find(e => String(e.id) === String(discount.empresa_id));
                                    const discountEmpresaName = normalizeEmpresaName(discountEmpresaObj?.trade_name || discountEmpresaObj?.nome || discount.workers?.contratante);
                                    const isSelected = selectedDiscountIds.has(discount.id);

                                    return (
                                        <tr
                                            key={discount.id}
                                            onClick={() => setSelectedDiscountIdForView(discount.id)}
                                            className={cn(
                                                "cursor-pointer transition-colors",
                                                isSelected ? "bg-indigo-50/60 dark:bg-indigo-950/30 hover:bg-indigo-100/70" : "hover:bg-slate-50 dark:hover:bg-slate-800/50"
                                            )}
                                        >
                                            <td className="pl-6 pr-2 py-4 whitespace-nowrap w-10" onClick={(e) => e.stopPropagation()}>
                                                <Checkbox
                                                    checked={isSelected}
                                                    onCheckedChange={() => handleToggleSelectDiscount(discount.id)}
                                                />
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="flex flex-col">
                                                    <span className="text-sm font-medium text-gray-900">{discount.workers.nome}</span>
                                                    <span className="text-xs text-muted-foreground font-mono">
                                                        Código: {discount.workers.cod_colab || '-'} {discount.workers.status_trabajador ? `(${discount.workers.status_trabajador})` : ''}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-xs text-gray-600">
                                                <div className="flex flex-col">
                                                    <span className="font-semibold text-slate-800">{discountEmpresaName || '-'}</span>
                                                    <span className="text-muted-foreground">{discount.workers.cliente_nombre || '-'}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                                                {formatDisplayDate(discount.reference_date, i18n.language === 'pt' ? ptBR : es)}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <Badge variant="secondary" className="font-medium bg-blue-50 text-blue-700 hover:bg-blue-100 border-blue-200">
                                                    {normalizeDiscountCategoryName(discount.category, discountCategories) || discount.category}
                                                </Badge>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <span className="text-sm font-semibold text-gray-900">€ {discount.amount.toFixed(2)}</span>
                                                {discount.is_recurring && <span className="ml-2 text-[10px] uppercase font-bold text-gray-400">Mensal</span>}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <span className={cn(
                                                    "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border",
                                                    discount.status === 'Ativo' ? 'bg-green-50 text-green-700 border-green-200' :
                                                        discount.status === 'Concluído' ? 'bg-gray-50 text-gray-600 border-gray-200' : 'bg-amber-50 text-amber-700 border-amber-200'
                                                )}>
                                                    {discount.status}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <p className="text-xs text-gray-500 truncate max-w-[250px]" title={discount.description || ''}>
                                                    {discount.description || '-'}
                                                </p>
                                            </td>
                                            <td className="px-6 py-4 text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                                                <div className="flex items-center justify-end gap-1.5">
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        onClick={() => setSelectedDiscountIdForView(discount.id)}
                                                        className="h-8 w-8 text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50"
                                                        title="Visualizar Detalhes"
                                                    >
                                                        <Eye className="h-4 w-4" />
                                                    </Button>
                                                    <EditDiscountDialog
                                                        discount={discount}
                                                        trigger={
                                                             <Button variant="ghost" size="icon" className="h-8 w-8 text-blue-600 hover:text-blue-700 hover:bg-blue-50" title="Editar">
                                                                <Edit className="h-4 w-4" />
                                                            </Button>
                                                        }
                                                    />
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        onClick={() => handleDelete(discount.id)}
                                                        className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50"
                                                        title="Excluir"
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })
                                ) : (
                                    <tr>
                                        <td colSpan={9} className="px-6 py-12 text-center text-gray-500">
                                            Nenhum desconto encontrado com os filtros atuais.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* View Details Modal */}
                <ViewDiscountDetailsModal
                    discount={allDiscounts?.find(d => d.id === selectedDiscountIdForView) || null}
                    isOpen={!!selectedDiscountIdForView}
                    onClose={() => setSelectedDiscountIdForView(null)}
                    empresas={empresas}
                />
            </div>
        </div>
    );
}
