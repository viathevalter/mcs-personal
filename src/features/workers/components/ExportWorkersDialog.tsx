import { useState } from 'react';
import * as XLSX from 'xlsx';
import { DownloadCloud, History, Loader2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
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
import { Label } from '@/components/ui/label';
import { useEmpresa } from '@/app/providers/EmpresaProvider';
import { supabase } from '@/shared/supabase/client';
import { listWorkers, type WorkerAlocacao } from '../api/workersApi';
import type { Worker } from '@/shared/types/corePersonal';

interface ExportWorkersDialogProps {
    trigger: React.ReactNode;
    currentFilters: {
        search?: string;
        clienteNombre?: string[];
        statusTrabajador?: string[];
        statusSeguridad?: string[];
        contratante?: string;
        funcion?: string;
        periodMonth?: number;
        periodYear?: number;
    };
}

const EXPORTABLE_COLUMN_IDS = [
    'cod_colab',
    'nome',
    'status_trabajador',
    'status_seguridad',
    'data_ingresso',
    'data_baixa',
    'data_alta_seguridad',
    'data_baixa_seguridad',
    'contratante',
    'cliente_nombre',
    'funcion',
    'niss',
    'nif',
    'dni',
    'nie',
    'pasaporte',
    'nacionalidade',
    'fecha_nacimiento',
    'movil',
    'email',
    'camiseta',
    'pantalones',
] as const;

type ExportableColumnId = (typeof EXPORTABLE_COLUMN_IDS)[number];

interface AllocationRow extends WorkerAlocacao {
    cod_colab: string;
}

export function ExportWorkersDialog({ trigger, currentFilters }: ExportWorkersDialogProps) {
    const { t } = useTranslation();
    const { selectedEmpresaId } = useEmpresa();
    const [isOpen, setIsOpen] = useState(false);
    const [isExporting, setIsExporting] = useState(false);
    const [includeAllocationHistory, setIncludeAllocationHistory] = useState(false);
    
    // Default selected columns
    const [selectedColumns, setSelectedColumns] = useState<string[]>([
        'cod_colab', 'nome', 'status_trabajador', 'status_seguridad', 
        'data_ingresso', 'data_baixa', 'contratante', 'cliente_nombre'
    ]);

    const exportableColumns: { id: ExportableColumnId; label: string }[] = EXPORTABLE_COLUMN_IDS.map((id) => ({
        id,
        label: t(`workersPage.exportModal.columns.${id}`),
    }));

    const handleToggleColumn = (colId: string) => {
        setSelectedColumns(prev => 
            prev.includes(colId) ? prev.filter(id => id !== colId) : [...prev, colId]
        );
    };

    const handleSelectAll = (select: boolean) => {
        if (select) {
            setSelectedColumns([...EXPORTABLE_COLUMN_IDS]);
        } else {
            setSelectedColumns([]);
        }
    };

    const handleExport = async () => {
        if (!selectedEmpresaId || selectedColumns.length === 0) return;
        
        setIsExporting(true);
        try {
            // Fetch ALL workers matching the current filters (pageSize 100000)
            const response = await listWorkers({
                empresaId: selectedEmpresaId,
                ...currentFilters,
                page: 1,
                pageSize: 100000,
                sortColumn: 'nome',
                sortDirection: 'asc'
            });

            const workers = response.data;

            if (workers.length === 0) {
                alert(t('workersPage.exportModal.noWorkers'));
                setIsExporting(false);
                return;
            }

            // Enrich workers with full details from core_personal.workers (camiseta, pantalones, dates, etc.)
            const workerIds = workers.map(w => w.id);
            let enrichedWorkers: Worker[] = workers;

            if (workerIds.length > 0) {
                let detailedWorkers: any[] = [];
                const chunkSize = 200;
                for (let i = 0; i < workerIds.length; i += chunkSize) {
                    const chunk = workerIds.slice(i, i + chunkSize);
                    const { data: details, error: detailsError } = await supabase
                        .schema('core_personal')
                        .from('workers')
                        .select('*')
                        .in('id', chunk);

                    if (detailsError) throw detailsError;
                    if (details) {
                        detailedWorkers = [...detailedWorkers, ...details];
                    }
                }

                const detailsMap = new Map(detailedWorkers.map(d => [d.id, d]));
                enrichedWorkers = workers.map(w => {
                    const details = detailsMap.get(w.id);
                    return {
                        ...details,
                        ...w,
                        contratante: w.contratante || details?.contratante,
                        cliente_nombre: w.cliente_nombre || details?.cliente,
                        funcion: w.funcion || details?.funcion,
                        status_trabajador: w.status_trabajador || details?.status_trabajador,
                        status_seguridad: w.status_seguridad || details?.status_seguridad,
                        camiseta: w.camiseta ?? details?.camiseta ?? null,
                        pantalones: w.pantalones ?? details?.pantalones ?? null,
                    };
                });
            }

            // Optionally fetch full allocation / client assignment history per worker
            const allocationsMap = new Map<string, AllocationRow[]>();
            if (includeAllocationHistory) {
                const codColabs = Array.from(
                    new Set(
                        enrichedWorkers
                            .map((w) => w.cod_colab?.trim())
                            .filter((c): c is string => Boolean(c))
                    )
                );

                const chunkSize = 200;
                for (let i = 0; i < codColabs.length; i += chunkSize) {
                    const chunk = codColabs.slice(i, i + chunkSize);
                    const { data: allocData, error: allocError } = await supabase
                        .schema('core_personal')
                        .from('vw_worker_allocations')
                        .select('cod_colab, codpedido, cliente_nombre, contratante, tiposervico, fechainiciopedido, fechafinpedido, fechasalidatrabajador, funcion, inserted_at')
                        .in('cod_colab', chunk)
                        .order('fechainiciopedido', { ascending: false, nullsFirst: false })
                        .order('inserted_at', { ascending: false });

                    if (allocError) throw allocError;
                    if (allocData) {
                        for (const alloc of allocData as AllocationRow[]) {
                            const key = alloc.cod_colab?.trim();
                            if (!key) continue;
                            const existing = allocationsMap.get(key) || [];
                            existing.push(alloc);
                            allocationsMap.set(key, existing);
                        }
                    }
                }
            }

            const buildRow = (worker: Worker, alloc?: AllocationRow): Record<string, any> => {
                const rowData: Record<string, any> = {};

                const effectiveWorker: Worker = alloc
                    ? {
                        ...worker,
                        contratante: alloc.contratante || worker.contratante,
                        cliente_nombre: alloc.cliente_nombre || worker.cliente_nombre,
                        funcion: alloc.funcion || worker.funcion,
                    }
                    : worker;

                // Keep the exact order of columns as selected
                exportableColumns.forEach(col => {
                    if (selectedColumns.includes(col.id)) {
                        rowData[col.label] = effectiveWorker[col.id as keyof Worker] || '';
                    }
                });

                if (includeAllocationHistory) {
                    if (!selectedColumns.includes('contratante')) {
                        rowData[t('workersPage.exportModal.columns.contratante')] = effectiveWorker.contratante || '';
                    }
                    if (!selectedColumns.includes('cliente_nombre')) {
                        rowData[t('workersPage.exportModal.columns.cliente_nombre')] = effectiveWorker.cliente_nombre || '';
                    }
                    rowData[t('workersPage.exportModal.historyCols.codpedido')] = alloc?.codpedido || '';
                    rowData[t('workersPage.exportModal.historyCols.tiposervico')] = alloc?.tiposervico || '';
                    rowData[t('workersPage.exportModal.historyCols.fechainiciopedido')] = alloc?.fechainiciopedido || '';
                    rowData[t('workersPage.exportModal.historyCols.fechafinpedido')] = alloc?.fechafinpedido || '';
                    rowData[t('workersPage.exportModal.historyCols.fechasalidatrabajador')] = alloc?.fechasalidatrabajador || '';
                }

                return rowData;
            };

            // Map workers (and optionally each allocation) to row data
            const rows: Record<string, any>[] = [];
            for (const worker of enrichedWorkers) {
                if (includeAllocationHistory) {
                    const key = worker.cod_colab?.trim();
                    const workerAllocs = key ? allocationsMap.get(key) : undefined;
                    if (workerAllocs && workerAllocs.length > 0) {
                        for (const alloc of workerAllocs) {
                            rows.push(buildRow(worker, alloc));
                        }
                    } else {
                        rows.push(buildRow(worker));
                    }
                } else {
                    rows.push(buildRow(worker));
                }
            }

            // Generate Excel
            const worksheet = XLSX.utils.json_to_sheet(rows);
            const workbook = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(workbook, worksheet, t('workersPage.exportModal.sheetName'));
            
            // Save file
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
            XLSX.writeFile(workbook, `${t('workersPage.exportModal.filePrefix')}${timestamp}.xlsx`);
            
            setIsOpen(false);
        } catch (error) {
            console.error("Failed to export workers:", error);
            alert(t('workersPage.exportModal.error'));
        } finally {
            setIsExporting(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                {trigger}
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px]">
                <DialogHeader>
                    <DialogTitle>{t('workersPage.exportModal.title')}</DialogTitle>
                    <DialogDescription className="whitespace-pre-line">
                        {t('workersPage.exportModal.desc')}
                    </DialogDescription>
                </DialogHeader>

                <div className="py-4 space-y-4">
                    <div>
                        <div className="flex justify-between items-center mb-4">
                            <Label className="font-semibold text-base">{t('workersPage.exportModal.fields')}</Label>
                            <div className="flex gap-3 text-sm">
                                <button type="button" onClick={() => handleSelectAll(true)} className="text-primary hover:underline">
                                    {t('workersPage.exportModal.selectAll')}
                                </button>
                                <button type="button" onClick={() => handleSelectAll(false)} className="text-muted-foreground hover:underline">
                                    {t('workersPage.exportModal.deselectAll')}
                                </button>
                            </div>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-3 max-h-[300px] overflow-y-auto pr-2">
                            {exportableColumns.map(col => (
                                <div key={col.id} className="flex items-center space-x-2">
                                    <Checkbox 
                                        id={`col-${col.id}`} 
                                        checked={selectedColumns.includes(col.id)}
                                        onCheckedChange={() => handleToggleColumn(col.id)}
                                    />
                                    <Label 
                                        htmlFor={`col-${col.id}`} 
                                        className="text-sm font-normal cursor-pointer"
                                    >
                                        {col.label}
                                    </Label>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="rounded-lg border border-emerald-200 dark:border-emerald-900/60 bg-emerald-50/50 dark:bg-emerald-950/20 p-3">
                        <div className="flex items-start space-x-2.5">
                            <Checkbox
                                id="include-allocation-history"
                                checked={includeAllocationHistory}
                                onCheckedChange={(checked) => setIncludeAllocationHistory(checked === true)}
                                className="mt-0.5"
                            />
                            <div className="grid gap-1 leading-none">
                                <Label
                                    htmlFor="include-allocation-history"
                                    className="text-sm font-semibold cursor-pointer flex items-center gap-1.5 text-emerald-900 dark:text-emerald-200"
                                >
                                    <History className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                                    {t('workersPage.exportModal.includeHistory')}
                                </Label>
                                <p className="text-xs text-muted-foreground leading-snug">
                                    {t('workersPage.exportModal.includeHistoryDesc')}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                <DialogFooter className="mt-2">
                    <Button variant="outline" onClick={() => setIsOpen(false)} disabled={isExporting}>
                        {t('workersPage.exportModal.cancel')}
                    </Button>
                    <Button 
                        onClick={handleExport} 
                        disabled={isExporting || selectedColumns.length === 0}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white"
                    >
                        {isExporting ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                {t('workersPage.exportModal.exporting')}
                            </>
                        ) : (
                            <>
                                <DownloadCloud className="mr-2 h-4 w-4" />
                                {t('workersPage.exportModal.exportBtn')}
                            </>
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
