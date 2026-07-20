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

interface ExportHoursControlWorkersDialogProps {
    periodYear: number;
    periodMonth: number;
    contratanteFilter: string | null;
    clientFilter: string[];
    workerStatusFilter: string;
    searchQuery: string;
}

const EXPORTABLE_COLUMNS = [
    { id: 'cod_colab', label: 'Cód. Colab' },
    { id: 'nome', label: 'Nome Completo' },
    { id: 'status_trabajador', label: 'Status Trabalhador' },
    { id: 'status_seguridad', label: 'Status Segurança' },
    { id: 'data_ingresso', label: 'Data Ingresso (Admissão)' },
    { id: 'data_baixa', label: 'Data Fim (Desligamento)' },
    { id: 'data_alta_seguridad', label: 'Data Alta Segurança' },
    { id: 'data_baixa_seguridad', label: 'Data Baixa Segurança' },
    { id: 'contratante', label: 'Empresa Contratante' },
    { id: 'cliente_nombre', label: 'Cliente/Obra' },
    { id: 'funcion', label: 'Função' },
    { id: 'niss', label: 'NISS' },
    { id: 'nif', label: 'NIF' },
    { id: 'dni', label: 'DNI' },
    { id: 'nie', label: 'NIE' },
    { id: 'pasaporte', label: 'Passaporte' },
    { id: 'nacionalidade', label: 'Nacionalidade' },
    { id: 'fecha_nacimiento', label: 'Data Nascimento' },
    { id: 'movil', label: 'Telefone' },
    { id: 'email', label: 'E-mail' },
];

export function ExportHoursControlWorkersDialog({
    periodYear,
    periodMonth,
    contratanteFilter,
    clientFilter,
    workerStatusFilter,
    searchQuery
}: ExportHoursControlWorkersDialogProps) {
    const { t } = useTranslation();
    const { selectedEmpresaId } = useEmpresa();
    const [isOpen, setIsOpen] = useState(false);
    const [isExporting, setIsExporting] = useState(false);
    
    // Default selected columns as requested by user
    const [selectedColumns, setSelectedColumns] = useState<string[]>([
        'cod_colab', 'nome', 'status_trabajador', 'status_seguridad', 
        'data_ingresso', 'data_baixa', 'contratante', 'cliente_nombre', 'movil', 'pasaporte'
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
            // 1. Fetch all workers from getHoursControlWorkers RPC
            const workers = await getHoursControlWorkers({
                empresaId: selectedEmpresaId,
                periodYear,
                periodMonth,
                contratante: contratanteFilter,
            });

            if (!workers || workers.length === 0) {
                toast.error(t('hoursControl.exportWorkers.noWorkers'));
                setIsExporting(false);
                return;
            }

            // 2. Apply frontend search filter
            let filteredWorkers = workers;
            if (searchQuery && searchQuery.trim().length > 0) {
                const q = searchQuery.trim().toLowerCase();
                filteredWorkers = filteredWorkers.filter(w => {
                    const nameMatch = w.nome && w.nome.toLowerCase().includes(q);
                    const phoneMatch = w.movil && w.movil.toLowerCase().includes(q);
                    return nameMatch || phoneMatch;
                });
            }

            // 3. Apply client filter
            if (clientFilter.length > 0) {
                filteredWorkers = filteredWorkers.filter(w => 
                    clientFilter.some(fc => w.cliente_nombre?.toLowerCase() === fc.toLowerCase())
                );
            }

            // 4. Apply worker status filter
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
                toast.error(t('hoursControl.exportWorkers.noWorkers'));
                setIsExporting(false);
                return;
            }

            // 5. Fetch details for these workers from core_personal.workers to enrich columns (data_ingresso, etc.)
            const workerIds = filteredWorkers.map(w => w.id);
            let enrichedWorkers = filteredWorkers;
            
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

                // Map details to rows
                enrichedWorkers = filteredWorkers.map(w => {
                    const details = detailedWorkers.find(d => d.id === w.id);
                    return {
                        ...w,
                        ...details,
                        // Priority given to hours control RPC values for context-specific fields
                        contratante: w.contratante || details?.contratante,
                        cliente_nombre: w.cliente_nombre || details?.cliente,
                        status_trabajador: w.status_trabajador || details?.status_trabajador,
                        status_seguridad: w.status_seguridad || details?.status_seguridad,
                    };
                });
            }

            // Map workers to row data based on selected columns
            const rows = enrichedWorkers.map((worker) => {
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
            XLSX.utils.book_append_sheet(workbook, worksheet, "Trabalhadores");
            
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
            XLSX.writeFile(workbook, `Trabalhadores_Controle_Horas_${periodMonth}_${periodYear}_${timestamp}.xlsx`);
            
            setIsOpen(false);
        } catch (error) {
            console.error("Failed to export workers:", error);
            toast.error(t('hoursControl.exportWorkers.error'));
        } finally {
            setIsExporting(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                <Button variant="outline" className="gap-2 border-emerald-200 text-emerald-700 bg-emerald-50 hover:bg-emerald-100 hover:text-emerald-800 shrink-0">
                    <DownloadCloud className="h-4 w-4" />
                    {t('hoursControl.exportWorkers.btn')}
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px]">
                <DialogHeader>
                    <DialogTitle>{t('hoursControl.exportWorkers.title')}</DialogTitle>
                    <DialogDescription className="whitespace-pre-line">
                        {t('hoursControl.exportWorkers.desc')}
                    </DialogDescription>
                </DialogHeader>

                <div className="py-4">
                    <div className="flex justify-between items-center mb-4">
                        <Label className="font-semibold text-base">{t('hoursControl.exportWorkers.fields')}</Label>
                        <div className="flex gap-3 text-sm">
                            <button onClick={() => handleSelectAll(true)} className="text-primary hover:underline">
                                {t('hoursControl.exportWorkers.selectAll')}
                            </button>
                            <button onClick={() => handleSelectAll(false)} className="text-muted-foreground hover:underline">
                                {t('hoursControl.exportWorkers.deselectAll')}
                            </button>
                        </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-3 max-h-[350px] overflow-y-auto pr-2">
                        {EXPORTABLE_COLUMNS.map(col => (
                            <div key={col.id} className="flex items-center space-x-2">
                                <Checkbox 
                                    id={`col-export-${col.id}`} 
                                    checked={selectedColumns.includes(col.id)}
                                    onCheckedChange={() => handleToggleColumn(col.id)}
                                />
                                <Label 
                                    htmlFor={`col-export-${col.id}`} 
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
                        {t('hoursControl.exportWorkers.cancel')}
                    </Button>
                    <Button 
                        onClick={handleExport} 
                        disabled={isExporting || selectedColumns.length === 0}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white"
                    >
                        {isExporting ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                {t('hoursControl.exportWorkers.exporting')}
                            </>
                        ) : (
                            <>
                                <DownloadCloud className="mr-2 h-4 w-4" />
                                {t('hoursControl.exportWorkers.exportBtn')}
                            </>
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
