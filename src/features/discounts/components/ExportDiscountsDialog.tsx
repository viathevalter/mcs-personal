import React, { useState } from 'react';
import * as XLSX from 'xlsx';
import { Download, CheckSquare, Square, FileSpreadsheet, Loader2 } from 'lucide-react';
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
import { Checkbox } from '@/components/ui/checkbox';
import { format, parseISO } from 'date-fns';
import type { WorkerDiscount } from '../types';
import { normalizeEmpresaName } from '@/shared/utils/empresaNormalizer';

interface ExportDiscountsDialogProps {
    trigger: React.ReactNode;
    discounts: (WorkerDiscount & { workers: { id: string; nome: string; cod_colab?: string | null; contratante?: string | null; cliente_nombre?: string | null; status_trabajador?: string } })[];
    monthFilter?: string;
    empresas?: any[];
}

interface ColumnOption {
    id: string;
    label: string;
    category: 'trabalhador' | 'desconto';
    getValue: (discount: any, empresas?: any[]) => string | number;
}

const AVAILABLE_COLUMNS: ColumnOption[] = [
    {
        id: 'cod_colab',
        label: 'Cód. Colaborador',
        category: 'trabalhador',
        getValue: (d) => d.workers?.cod_colab || '-'
    },
    {
        id: 'nome',
        label: 'Nome do Trabalhador',
        category: 'trabalhador',
        getValue: (d) => d.workers?.nome || '-'
    },
    {
        id: 'contratante',
        label: 'Empresa (Contratante)',
        category: 'trabalhador',
        getValue: (d, empresas) => {
            const empObj = empresas?.find((e: any) => String(e.id) === String(d.empresa_id));
            const empName = empObj?.trade_name || empObj?.nome || d.workers?.contratante;
            return normalizeEmpresaName(empName) || '-';
        }
    },
    {
        id: 'cliente_nombre',
        label: 'Cliente Alocado',
        category: 'trabalhador',
        getValue: (d) => d.workers?.cliente_nombre || '-'
    },
    {
        id: 'reference_date',
        label: 'Data de Referência',
        category: 'desconto',
        getValue: (d) => {
            if (!d.reference_date) return '-';
            try {
                return format(parseISO(d.reference_date), 'dd/MM/yyyy');
            } catch {
                return d.reference_date;
            }
        }
    },
    {
        id: 'category',
        label: 'Categoria do Desconto',
        category: 'desconto',
        getValue: (d) => d.category || '-'
    },
    {
        id: 'amount',
        label: 'Valor (€)',
        category: 'desconto',
        getValue: (d) => Number(Number(d.amount || 0).toFixed(2))
    },
    {
        id: 'status',
        label: 'Status',
        category: 'desconto',
        getValue: (d) => d.status || 'Ativo'
    },
    {
        id: 'is_recurring',
        label: 'Desconto Recorrente',
        category: 'desconto',
        getValue: (d) => (d.is_recurring ? 'Sim' : 'Não')
    },
    {
        id: 'description',
        label: 'Descrição / Observações',
        category: 'desconto',
        getValue: (d) => d.description || '-'
    }
];

export function ExportDiscountsDialog({
    trigger,
    discounts,
    monthFilter,
    empresas
}: ExportDiscountsDialogProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [selectedColumnIds, setSelectedColumnIds] = useState<Set<string>>(
        new Set(AVAILABLE_COLUMNS.map(c => c.id))
    );
    const [isExporting, setIsExporting] = useState(false);

    const toggleColumn = (id: string) => {
        const newSet = new Set(selectedColumnIds);
        if (newSet.has(id)) {
            newSet.delete(id);
        } else {
            newSet.add(id);
        }
        setSelectedColumnIds(newSet);
    };

    const handleSelectAll = () => {
        setSelectedColumnIds(new Set(AVAILABLE_COLUMNS.map(c => c.id)));
    };

    const handleDeselectAll = () => {
        setSelectedColumnIds(new Set());
    };

    const handleExportExcel = () => {
        if (!discounts || discounts.length === 0 || selectedColumnIds.size === 0) return;
        setIsExporting(true);

        try {
            const activeCols = AVAILABLE_COLUMNS.filter(c => selectedColumnIds.has(c.id));

            const exportRows = discounts.map(discount => {
                const rowObj: Record<string, any> = {};
                activeCols.forEach(col => {
                    rowObj[col.label] = col.getValue(discount, empresas);
                });
                return rowObj;
            });

            const worksheet = XLSX.utils.json_to_sheet(exportRows);
            const workbook = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(workbook, worksheet, 'Gestao_de_Descontos');

            const timestamp = format(new Date(), 'yyyyMMdd_HHmm');
            const fileName = `MCS_Gestao_Descontos_${monthFilter || 'todos'}_${timestamp}.xlsx`;

            XLSX.writeFile(workbook, fileName);
            setIsOpen(false);
        } catch (error) {
            console.error("Error exporting discounts to excel:", error);
        } finally {
            setIsExporting(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                {trigger}
            </DialogTrigger>

            <DialogContent className="max-w-2xl bg-card">
                <DialogHeader>
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-indigo-100 dark:bg-indigo-950 rounded-lg text-indigo-600 dark:text-indigo-400">
                            <FileSpreadsheet className="w-5 h-5" />
                        </div>
                        <div>
                            <DialogTitle className="text-lg font-bold">Exportar Gestão de Descontos (Excel XLSX)</DialogTitle>
                            <DialogDescription className="text-xs text-muted-foreground">
                                Selecione as colunas que deseja incluir na planilha Excel exportada ({discounts.length} registros no filtro atual)
                            </DialogDescription>
                        </div>
                    </div>
                </DialogHeader>

                <div className="space-y-4 py-3">
                    {/* Quick selection bar */}
                    <div className="flex items-center justify-between bg-slate-50 dark:bg-slate-900 p-2.5 rounded-lg border text-xs">
                        <span className="font-semibold text-muted-foreground">
                            {selectedColumnIds.size} de {AVAILABLE_COLUMNS.length} colunas selecionadas
                        </span>
                        <div className="flex items-center gap-2">
                            <Button
                                size="sm"
                                variant="outline"
                                className="h-7 text-[11px]"
                                onClick={handleSelectAll}
                            >
                                <CheckSquare className="w-3.5 h-3.5 mr-1 text-indigo-600" />
                                Selecionar Todas
                            </Button>
                            <Button
                                size="sm"
                                variant="outline"
                                className="h-7 text-[11px]"
                                onClick={handleDeselectAll}
                            >
                                <Square className="w-3.5 h-3.5 mr-1 text-muted-foreground" />
                                Desmarcar Todas
                            </Button>
                        </div>
                    </div>

                    {/* Columns grid by category */}
                    <div className="space-y-3 max-h-[360px] overflow-y-auto pr-1">
                        {/* Trabalhador */}
                        <div className="space-y-2">
                            <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 block border-b pb-1">
                                Dados do Trabalhador & Empresa
                            </span>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                {AVAILABLE_COLUMNS.filter(c => c.category === 'trabalhador').map(col => (
                                    <label
                                        key={col.id}
                                        className={`flex items-center space-x-2.5 p-2 rounded-lg border text-xs cursor-pointer transition-colors ${
                                            selectedColumnIds.has(col.id)
                                                ? 'bg-indigo-50/50 dark:bg-indigo-950/30 border-indigo-200 dark:border-indigo-800'
                                                : 'hover:bg-slate-50 dark:hover:bg-slate-900 border-slate-100 dark:border-slate-800'
                                        }`}
                                    >
                                        <Checkbox
                                            checked={selectedColumnIds.has(col.id)}
                                            onCheckedChange={() => toggleColumn(col.id)}
                                        />
                                        <span className="font-medium">{col.label}</span>
                                    </label>
                                ))}
                            </div>
                        </div>

                        {/* Desconto */}
                        <div className="space-y-2 pt-1">
                            <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 block border-b pb-1">
                                Detalhes do Desconto & Valores
                            </span>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                {AVAILABLE_COLUMNS.filter(c => c.category === 'desconto').map(col => (
                                    <label
                                        key={col.id}
                                        className={`flex items-center space-x-2.5 p-2 rounded-lg border text-xs cursor-pointer transition-colors ${
                                            selectedColumnIds.has(col.id)
                                                ? 'bg-emerald-50/50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800'
                                                : 'hover:bg-slate-50 dark:hover:bg-slate-900 border-slate-100 dark:border-slate-800'
                                        }`}
                                    >
                                        <Checkbox
                                            checked={selectedColumnIds.has(col.id)}
                                            onCheckedChange={() => toggleColumn(col.id)}
                                        />
                                        <span className="font-medium">{col.label}</span>
                                    </label>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>

                <DialogFooter className="gap-2 sm:gap-0">
                    <Button
                        variant="outline"
                        onClick={() => setIsOpen(false)}
                        className="text-xs"
                    >
                        Cancelar
                    </Button>
                    <Button
                        onClick={handleExportExcel}
                        disabled={selectedColumnIds.size === 0 || isExporting}
                        className="bg-indigo-600 hover:bg-indigo-700 text-xs font-medium"
                    >
                        {isExporting ? (
                            <>
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Gerando Excel...
                            </>
                        ) : (
                            <>
                                <Download className="w-4 h-4 mr-2" /> Exportar Planilha Excel (.xlsx)
                            </>
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
