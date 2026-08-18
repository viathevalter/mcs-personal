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
import type { Worker } from '@/shared/types/corePersonal';
import { format } from 'date-fns';

interface ExportHoleritesDialogProps {
    trigger: React.ReactNode;
    workers: (Worker & { worker_beneficios_settings?: any })[];
    mesReferencia: string;
    dbHoursSummary?: any;
    workerIbansMap?: Map<string, { iban: string; banco: string }>;
    eventosMap?: Map<string, { totalProventos: number; totalDescontos: number; valorLiquido: number; totalHoras: number }>;
    workerMonthlyActivityMap?: Map<string, { contratante: string; cliente_nombre: string }>;
}

interface ColumnOption {
    id: string;
    label: string;
    category: 'cadastro' | 'remuneracao' | 'bancario';
    getValue: (worker: Worker & { worker_beneficios_settings?: any }, extra: {
        dbHoursSummary?: any;
        workerIbansMap?: Map<string, { iban: string; banco: string }>;
        eventosMap?: Map<string, { totalProventos: number; totalDescontos: number; valorLiquido: number; totalHoras: number }>;
        workerMonthlyActivityMap?: Map<string, { contratante: string; cliente_nombre: string }>;
    }) => string | number;
}

const AVAILABLE_COLUMNS: ColumnOption[] = [
    {
        id: 'cod_colab',
        label: 'Cód. Colaborador',
        category: 'cadastro',
        getValue: (w) => w.cod_colab || '-'
    },
    {
        id: 'nome',
        label: 'Nome do Trabalhador',
        category: 'cadastro',
        getValue: (w) => w.nome || '-'
    },
    {
        id: 'niss',
        label: 'NISS',
        category: 'cadastro',
        getValue: (w) => w.niss || '-'
    },
    {
        id: 'contratante',
        label: 'Empresa (Contratante)',
        category: 'cadastro',
        getValue: (w, { workerMonthlyActivityMap }) => workerMonthlyActivityMap?.get(w.id)?.contratante || w.contratante || '-'
    },
    {
        id: 'cliente_nombre',
        label: 'Cliente Alocado',
        category: 'cadastro',
        getValue: (w, { workerMonthlyActivityMap }) => workerMonthlyActivityMap?.get(w.id)?.cliente_nombre || w.cliente_nombre || (w as any).cliente || '-'
    },
    {
        id: 'funcion',
        label: 'Função',
        category: 'cadastro',
        getValue: (w) => w.funcion || '-'
    },
    {
        id: 'data_ingresso',
        label: 'Data de Início / Admissão',
        category: 'cadastro',
        getValue: (w) => w.data_ingresso || w.data_alta_seguridad || '-'
    },
    {
        id: 'status_seguridad',
        label: 'Segurança Social',
        category: 'cadastro',
        getValue: (w) => w.status_seguridad || 'Desconhecido'
    },
    {
        id: 'tarifa_hora',
        label: 'Tarifa Hora (€)',
        category: 'remuneracao',
        getValue: (w) => Number(w.worker_beneficios_settings?.tarifa_hora || 0)
    },
    {
        id: 'horas_totais',
        label: 'Total Horas Apuradas',
        category: 'remuneracao',
        getValue: (w, { eventosMap, dbHoursSummary }) => {
            if (eventosMap?.has(w.id)) {
                return Number(eventosMap.get(w.id)?.totalHoras || 0);
            }
            if (!dbHoursSummary) return 0;
            if (typeof dbHoursSummary.get === 'function') return Number(dbHoursSummary.get(w.id) || 0);
            if ((dbHoursSummary as any).sumMap) return Number((dbHoursSummary as any).sumMap.get(w.id) || 0);
            return 0;
        }
    },
    {
        id: 'proventos',
        label: 'Total Proventos (€)',
        category: 'remuneracao',
        getValue: (w, { eventosMap }) => Number((eventosMap?.get(w.id)?.totalProventos || 0).toFixed(2))
    },
    {
        id: 'descontos',
        label: 'Total Descontos (€)',
        category: 'remuneracao',
        getValue: (w, { eventosMap }) => Number((eventosMap?.get(w.id)?.totalDescontos || 0).toFixed(2))
    },
    {
        id: 'valor_liquido',
        label: 'Valor Líquido (€)',
        category: 'remuneracao',
        getValue: (w, { eventosMap }) => {
            const data = eventosMap?.get(w.id);
            if (data) {
                return Number(data.valorLiquido.toFixed(2));
            }
            return 0;
        }
    },
    {
        id: 'iban',
        label: 'IBAN Bancário',
        category: 'bancario',
        getValue: (w, { workerIbansMap }) => workerIbansMap?.get(w.id)?.iban || '-'
    },
    {
        id: 'banco',
        label: 'Nome do Banco',
        category: 'bancario',
        getValue: (w, { workerIbansMap }) => workerIbansMap?.get(w.id)?.banco || '-'
    }
];

export function ExportHoleritesDialog({
    trigger,
    workers,
    mesReferencia,
    dbHoursSummary,
    workerIbansMap,
    eventosMap,
    workerMonthlyActivityMap
}: ExportHoleritesDialogProps) {
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
        if (!workers || workers.length === 0 || selectedColumnIds.size === 0) return;
        setIsExporting(true);

        try {
            const activeCols = AVAILABLE_COLUMNS.filter(c => selectedColumnIds.has(c.id));

            const exportRows = workers.map(worker => {
                const rowObj: Record<string, any> = {};
                activeCols.forEach(col => {
                    rowObj[col.label] = col.getValue(worker, { dbHoursSummary, workerIbansMap, eventosMap, workerMonthlyActivityMap });
                });
                return rowObj;
            });

            const worksheet = XLSX.utils.json_to_sheet(exportRows);
            const workbook = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(workbook, worksheet, 'Folha_de_Pagamento');

            const timestamp = format(new Date(), 'yyyyMMdd_HHmm');
            const fileName = `MCS_Folha_Pagamento_${mesReferencia}_${timestamp}.xlsx`;

            XLSX.writeFile(workbook, fileName);
            setIsOpen(false);
        } catch (error) {
            console.error("Error exporting holerites to excel:", error);
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
                            <DialogTitle className="text-lg font-bold">Exportar Dados da Folha</DialogTitle>
                            <DialogDescription className="text-xs text-muted-foreground">
                                Personalize as colunas que deseja incluir no relatório exportado ({workers.length} trabalhadores alocados no filtro atual)
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
                        {/* Cadastro */}
                        <div className="space-y-2">
                            <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 block border-b pb-1">
                                Identificação & Dados Cadastrais
                            </span>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                {AVAILABLE_COLUMNS.filter(c => c.category === 'cadastro').map(col => (
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

                        {/* Remuneração & Horas */}
                        <div className="space-y-2 pt-1">
                            <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 block border-b pb-1">
                                Horas & Valores Financeiros
                            </span>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                {AVAILABLE_COLUMNS.filter(c => c.category === 'remuneracao').map(col => (
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

                        {/* Bancário */}
                        <div className="space-y-2 pt-1">
                            <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 block border-b pb-1">
                                Dados de Transferência Bancária
                            </span>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                {AVAILABLE_COLUMNS.filter(c => c.category === 'bancario').map(col => (
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
                                <Download className="w-4 h-4 mr-2" /> Exportar Planilha Excel
                            </>
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
