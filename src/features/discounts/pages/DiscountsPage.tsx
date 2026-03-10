import { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useAllDiscounts } from '../hooks/useAllDiscounts';
import type { DiscountCategory, DiscountStatus } from '../types';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { format, parseISO } from 'date-fns';
import { ptBR, es } from 'date-fns/locale';
import { Search, FileSpreadsheet, DownloadCloud, Trash2, Edit, Undo2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
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
import { useDeleteDiscount, useDeleteDiscountBatch } from '../hooks/useDiscountMutations';

const CATEGORIES: DiscountCategory[] = [ // Added helper mapped array based on type
    'Imposto ss', 'Adiantamento', 'Desconto Carro',
    'MULTA TRANSITO', 'COMBUSTIBLE', 'PEAJES',
    'SUMINISTROS', 'MULTA ALOJAMIENTO', 'LIMPIEZA O DAÑOS',
    'EPIS', 'OUTROS', 'Taxa bancária'
];

export function DiscountsPage() {
    const { i18n } = useTranslation();
    const { data: allDiscounts, isLoading } = useAllDiscounts();

    // Filters state
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedCategory, setSelectedCategory] = useState<DiscountCategory | 'ALL'>('ALL');
    const [selectedStatus, setSelectedStatus] = useState<DiscountStatus | 'ALL'>('ALL');
    const [monthFilter, setMonthFilter] = useState(''); // YYYY-MM format

    // Filter application
    const filteredDiscounts = useMemo(() => {
        if (!allDiscounts) return [];

        return allDiscounts.filter((discount) => {
            // 1. Search term (Worker Name, NIF, DNI etc can be added but for now Name/Desc)
            const matchesSearch =
                discount.workers.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
                discount.description?.toLowerCase().includes(searchTerm.toLowerCase());
            if (searchTerm && !matchesSearch) return false;

            // 2. Category
            if (selectedCategory !== 'ALL' && discount.category !== selectedCategory) return false;

            // 3. Status
            if (selectedStatus !== 'ALL' && discount.status !== selectedStatus) return false;

            // 4. Month filter
            if (monthFilter) {
                const discountMonth = discount.reference_date.substring(0, 7); // yyyy-MM
                if (discountMonth !== monthFilter) return false;
            }

            return true;
        });
    }, [allDiscounts, searchTerm, selectedCategory, selectedStatus, monthFilter]);

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

    const categoryStats = useMemo(() => {
        if (!allDiscounts) return [];
        const stats: Record<string, number> = {};
        filteredDiscounts.forEach(d => {
            stats[d.category] = (stats[d.category] || 0) + Number(d.amount);
        });
        return Object.entries(stats).sort((a, b) => b[1] - a[1]).slice(0, 3);
    }, [filteredDiscounts, allDiscounts]);

    const recentBatches = useMemo(() => {
        if (!allDiscounts) return [];

        const map = new Map<string, { time: number, count: number }>();
        allDiscounts.forEach(d => {
            if (d.import_batch_id) {
                const time = new Date(d.created_at).getTime();
                const existing = map.get(d.import_batch_id);
                if (!existing) {
                    map.set(d.import_batch_id, { time, count: 1 });
                } else {
                    map.set(d.import_batch_id, { time: Math.max(existing.time, time), count: existing.count + 1 });
                }
            }
        });

        return Array.from(map.entries())
            .sort((a, b) => b[1].time - a[1].time)
            .slice(0, 3)
            .map(([id, data]) => ({ id, count: data.count, date: new Date(data.time) }));
    }, [allDiscounts]);

    // Aggregate stats
    const totalAmount = filteredDiscounts.reduce((sum, d) => sum + Number(d.amount), 0);

    const handleExportExcel = () => {
        // Basic CSV approach until proper excel library is integrated
        if (!filteredDiscounts.length) return;

        const headers = ['Trabalhador', 'Data Referência', 'Categoria', 'Valor', 'Status', 'Recorrente', 'Descrição'];
        const rows = filteredDiscounts.map(d => [
            d.workers.nome,
            format(parseISO(d.reference_date), 'dd/MM/yyyy'),
            d.category,
            d.amount.toFixed(2),
            d.status,
            d.is_recurring ? 'Sim' : 'Não',
            d.description?.replace(/,/g, ' ') || '' // Clean commas for CSV
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
                    <p className="text-muted-foreground">Gestão global de descontos dos trabalhadores.</p>
                </div>
            </div>

            <div className="space-y-6">
                {/* KPI / Stats Section */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="bg-white rounded-xl shadow-sm border p-6 flex flex-col justify-center">
                        <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Total em Descontos</h3>
                        <div className="mt-2 text-3xl font-bold text-gray-900">€ {totalAmount.toFixed(2)}</div>
                        <p className="mt-1 text-xs text-muted-foreground">{filteredDiscounts.length} registros no filtro</p>
                    </div>
                    {categoryStats.map(([cat, val]) => (
                        <div key={cat} className="bg-white rounded-xl shadow-sm border p-6 flex flex-col justify-center">
                            <h3 className="text-sm font-bold text-blue-800 uppercase tracking-tight truncate" title={cat}>{cat}</h3>
                            <div className="mt-2 text-2xl font-bold text-gray-700">€ {val.toFixed(2)}</div>
                        </div>
                    ))}
                </div>

                {/* Batch Revert Section */}
                {recentBatches.length > 0 && (
                    <div className="flex flex-col gap-3 bg-amber-50/50 rounded-xl p-4 border border-amber-100/60">
                        <div className="text-sm font-medium text-amber-900 flex items-center gap-2">
                            <Undo2 className="h-4 w-4" /> Desfazer Importações Recentes
                        </div>
                        <div className="flex gap-2 flex-wrap">
                            {recentBatches.map(b => (
                                <Button
                                    key={b.id}
                                    variant="outline"
                                    size="sm"
                                    className="bg-white text-xs font-semibold text-red-600 hover:text-red-700 hover:bg-red-50"
                                    onClick={() => handleUndoBatch(b.id)}
                                    disabled={isDeletingBatch}
                                >
                                    Reverter Lote {format(b.date, 'dd/MM HH:mm')} ({b.count} itens)
                                </Button>
                            ))}
                        </div>
                    </div>
                )}

                {/* Filters bar */}
                <div className="bg-white p-4 rounded-xl shadow-sm border flex flex-col md:flex-row gap-4 items-end">
                    <div className="flex-1 space-y-1.5 w-full">
                        <label className="text-xs font-medium text-gray-700">Buscar Trabalhador</label>
                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <Search className="h-4 w-4 text-gray-400" />
                            </div>
                            <Input
                                placeholder="Nome do trabalhador..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="pl-9"
                            />
                        </div>
                    </div>

                    <div className="space-y-1.5 w-full md:w-48">
                        <label className="text-xs font-medium text-gray-700">Mês / Ano</label>
                        <Input
                            type="month"
                            value={monthFilter}
                            onChange={(e) => setMonthFilter(e.target.value)}
                        />
                    </div>

                    <div className="space-y-1.5 w-full md:w-48">
                        <label className="text-xs font-medium text-gray-700">Categoria</label>
                        <Select value={selectedCategory} onValueChange={(v: DiscountCategory | 'ALL') => setSelectedCategory(v)}>
                            <SelectTrigger>
                                <SelectValue placeholder="Todas" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="ALL">Todas as categorias</SelectItem>
                                {CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-1.5 w-full md:w-36">
                        <label className="text-xs font-medium text-gray-700">Status</label>
                        <Select value={selectedStatus} onValueChange={(v: DiscountStatus | 'ALL') => setSelectedStatus(v)}>
                            <SelectTrigger>
                                <SelectValue placeholder="Todos" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="ALL">Todos os status</SelectItem>
                                <SelectItem value="Ativo">Ativo</SelectItem>
                                <SelectItem value="Pausado">Pausado</SelectItem>
                                <SelectItem value="Concluído">Concluído</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="flex w-full md:w-auto gap-2 mt-4 md:mt-0">
                        <ImportDiscountsDialog
                            trigger={
                                <Button className="w-full md:w-auto bg-indigo-600 hover:bg-indigo-700">
                                    <DownloadCloud className="mr-2 h-4 w-4" />
                                    Importar
                                </Button>
                            }
                        />
                        <Button variant="outline" onClick={handleExportExcel} className="w-full md:w-auto">
                            <FileSpreadsheet className="mr-2 h-4 w-4 text-green-600" />
                            Exportar
                        </Button>
                    </div>
                </div>

                {/* Data Table */}
                <div className="bg-white border rounded-xl shadow-sm overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50/80">
                                <tr>
                                    <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Trabalhador</th>
                                    <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Data</th>
                                    <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Categoria</th>
                                    <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Valor (€)</th>
                                    <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                                    <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Descrição</th>
                                    <th scope="col" className="px-6 py-4 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Ações</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {isLoading ? (
                                    Array.from({ length: 3 }).map((_, i) => (
                                        <tr key={i} className="animate-pulse">
                                            <td colSpan={6} className="px-6 py-5 bg-gray-50/50" />
                                        </tr>
                                    ))
                                ) : filteredDiscounts.length > 0 ? (
                                    filteredDiscounts.map((discount) => (
                                        <tr key={discount.id} className="hover:bg-slate-50 transition-colors">
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="flex flex-col">
                                                    <span className="text-sm font-medium text-gray-900">{discount.workers.nome}</span>
                                                    <span className="text-xs text-muted-foreground">{discount.workers.status_trabajador}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                                                {format(parseISO(discount.reference_date), "MMM yyyy", { locale: i18n.language === 'pt' ? ptBR : es })}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <Badge variant="secondary" className="font-medium bg-blue-50 text-blue-700 hover:bg-blue-100 border-blue-200">
                                                    {discount.category}
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
                                            <td className="px-6 py-4 text-right whitespace-nowrap">
                                                <div className="flex items-center justify-end gap-2">
                                                    <EditDiscountDialog
                                                        discount={discount}
                                                        trigger={
                                                            <Button variant="ghost" size="icon" className="h-8 w-8 text-blue-600 hover:text-blue-700 hover:bg-blue-50">
                                                                <Edit className="h-4 w-4" />
                                                            </Button>
                                                        }
                                                    />
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        onClick={() => handleDelete(discount.id)}
                                                        className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50"
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                                            Nenhum desconto encontrado com os filtros atuais.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

            </div>
        </div>
    );
}
