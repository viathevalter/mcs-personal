import { useState } from 'react';
import * as XLSX from 'xlsx';
import { DownloadCloud, Loader2 } from 'lucide-react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '../../../components/ui/dialog';
import { Button } from '../../../components/ui/button';
import { Checkbox } from '../../../components/ui/checkbox';
import { Label } from '../../../components/ui/label';
import { useEmpresa } from '../../../app/providers/EmpresaProvider';
import { getHoursControlWorkers } from '../../workers/api/workersApi';
import { supabase } from '../../../shared/supabase/client';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';

interface ExportPendingHoursDialogProps {
    periodYear: number;
    periodMonth: number;
    contratanteFilter: string | null;
    clientFilter: string[];
    workerStatusFilter: string;
}

const EXPORTABLE_COLUMNS = [
    { id: 'nome', label: 'Nome Completo' },
    { id: 'movil', label: 'Telefone' },
    { id: 'pasaporte', label: 'Passaporte' },
    { id: 'cliente_nombre', label: 'Cliente/Obra' },
    { id: 'contratante', label: 'Empresa Contratante' },
    { id: 'status_trabajador', label: 'Status Trabalhador' },
    { id: 'email', label: 'E-mail' },
    { id: 'cod_colab', label: 'Cód. Colab' },
];

export function ExportPendingHoursDialog({
    periodYear,
    periodMonth,
    contratanteFilter,
    clientFilter,
    workerStatusFilter
}: ExportPendingHoursDialogProps) {
    const { t } = useTranslation();
    const { selectedEmpresaId } = useEmpresa();
    const [isOpen, setIsOpen] = useState(false);
    const [isExporting, setIsExporting] = useState(false);
    
    // Default selected columns as requested by user
    const [selectedColumns, setSelectedColumns] = useState<string[]>([
        'nome', 'movil', 'pasaporte', 'cliente_nombre'
    ]);

    const handleToggleColumn = (colId: string) => {
        setSelectedColumns(prev => 
            prev.includes(colId) ? prev.filter(id => id !== colId) : [...prev, colId]
        );
    };

    const handleSelectAll = (select: boolean) => {
        if (select) {
            setSelectedColumns(EXPORTABLE_COLUMNS.map(c => c.id));
        } else {
            setSelectedColumns([]);
        }
    };

    const handleExport = async () => {
        if (!selectedEmpresaId || selectedColumns.length === 0) return;
        
        setIsExporting(true);
        try {
            // 1. Fetch all workers
            const workers = await getHoursControlWorkers({
                empresaId: selectedEmpresaId,
                periodYear,
                periodMonth,
                contratante: contratanteFilter,
            });

            if (!workers || workers.length === 0) {
                toast.error(t('hoursControl.exportPending.noWorkers'));
                setIsExporting(false);
                return;
            }

            // 2. Further filter workers based on client Filter exactly like the page
            let filteredWorkers = workers;
            if (clientFilter.length > 0) {
                filteredWorkers = workers.filter(w => 
                    clientFilter.some(fc => w.cliente_nombre?.toLowerCase() === fc.toLowerCase())
                );
            }

            // The workerStatusFilter 'active' / 'inactive' can also be applied
            if (workerStatusFilter === 'active') {
                filteredWorkers = filteredWorkers.filter(w => {
                    const status = w.status_trabajador?.toLowerCase() || '';
                    return status !== 'inativo' && status !== 'desligado';
                });
            } else if (workerStatusFilter === 'inactive') {
                filteredWorkers = filteredWorkers.filter(w => {
                    const status = w.status_trabajador?.toLowerCase() || '';
                    return status === 'inativo' || status === 'desligado';
                });
            }

            if (filteredWorkers.length === 0) {
                toast.error(t('hoursControl.exportPending.noWorkers'));
                setIsExporting(false);
                return;
            }

            // 3. Fetch hours for the filtered workers to see who is "pendente" (missing = pendente)
            const workerIds = filteredWorkers.map(w => w.id);
            let hoursData: any[] = [];
            const chunkSize = 200;
            for (let i = 0; i < workerIds.length; i += chunkSize) {
                const chunk = workerIds.slice(i, i + chunkSize);
                const { data: hours, error: hoursError } = await supabase
                    .schema('core_personal')
                    .from('worker_hours')
                    .select('worker_id, status')
                    .in('worker_id', chunk)
                    .eq('period_year', periodYear)
                    .eq('period_month', periodMonth);

                if (hoursError) throw hoursError;
                if (hours) hoursData = [...hoursData, ...hours];
            }

            // 4. Find those who are pending
            const pendingWorkers = filteredWorkers.filter(w => {
                const hourRecord = hoursData.find(h => h.worker_id === w.id);
                return !hourRecord || hourRecord.status === 'pendente';
            });

            if (pendingWorkers.length === 0) {
                toast.error(t('hoursControl.exportPending.noWorkers'));
                setIsExporting(false);
                return;
            }

            // Map workers to row data based on selected columns
            const rows = pendingWorkers.map((worker) => {
                const rowData: Record<string, any> = {};
                
                EXPORTABLE_COLUMNS.forEach(col => {
                    if (selectedColumns.includes(col.id)) {
                        rowData[col.label] = worker[col.id as keyof typeof worker] || '';
                    }
                });
                
                return rowData;
            });

            // Generate Excel
            const worksheet = XLSX.utils.json_to_sheet(rows);
            const workbook = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(workbook, worksheet, "Faltam Enviar");
            
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
            XLSX.writeFile(workbook, `Faltam_Enviar_Horas_${periodMonth}_${periodYear}_${timestamp}.xlsx`);
            
            setIsOpen(false);
        } catch (error) {
            console.error("Failed to export workers:", error);
            toast.error(t('hoursControl.exportPending.error'));
        } finally {
            setIsExporting(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                <Button variant="outline" className="gap-2 border-amber-200 text-amber-700 bg-amber-50 hover:bg-amber-100 hover:text-amber-800 shrink-0">
                    <DownloadCloud className="h-4 w-4" />
                    {t('hoursControl.exportPending.btn')}
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px]">
                <DialogHeader>
                    <DialogTitle>{t('hoursControl.exportPending.title')}</DialogTitle>
                    <DialogDescription className="whitespace-pre-line">
                        {t('hoursControl.exportPending.desc')}
                    </DialogDescription>
                </DialogHeader>

                <div className="py-4">
                    <div className="flex justify-between items-center mb-4">
                        <Label className="font-semibold text-base">{t('hoursControl.exportPending.fields')}</Label>
                        <div className="flex gap-3 text-sm">
                            <button onClick={() => handleSelectAll(true)} className="text-primary hover:underline">
                                {t('hoursControl.exportPending.selectAll')}
                            </button>
                            <button onClick={() => handleSelectAll(false)} className="text-muted-foreground hover:underline">
                                {t('hoursControl.exportPending.deselectAll')}
                            </button>
                        </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-3 max-h-[350px] overflow-y-auto pr-2">
                        {EXPORTABLE_COLUMNS.map(col => (
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

                <DialogFooter className="mt-4">
                    <Button variant="outline" onClick={() => setIsOpen(false)} disabled={isExporting}>
                        {t('hoursControl.exportPending.cancel')}
                    </Button>
                    <Button 
                        onClick={handleExport} 
                        disabled={isExporting || selectedColumns.length === 0}
                        className="bg-amber-600 hover:bg-amber-700 text-white"
                    >
                        {isExporting ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                {t('hoursControl.exportPending.exporting')}
                            </>
                        ) : (
                            <>
                                <DownloadCloud className="mr-2 h-4 w-4" />
                                {t('hoursControl.exportPending.exportBtn')}
                            </>
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
