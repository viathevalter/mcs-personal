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
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { useEmpresa } from '@/app/providers/EmpresaProvider';
import { listSalaryReportWorkers, type SalaryReportWorker } from '../api/workersApi';

interface ExportSalaryReportDialogProps {
    trigger: React.ReactNode;
    currentFilters: {
        search?: string;
        clienteNombre?: string[];
        contratante?: string;
        periodMonth: number;
        periodYear: number;
    };
}

const EXPORTABLE_COLUMNS = [
    { id: 'cod_colab', label: 'Cód. Colab' },
    { id: 'nome', label: 'Nome Completo' },
    { id: 'status_trabajador', label: 'Status Trabalhador' },
    { id: 'status_seguridad', label: 'Status Segurança' },
    { id: 'dias_trabalhados', label: 'Dias Ativos no Mês' },
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

export function ExportSalaryReportDialog({ trigger, currentFilters }: ExportSalaryReportDialogProps) {
    const { selectedEmpresaId } = useEmpresa();
    const [isOpen, setIsOpen] = useState(false);
    const [isExporting, setIsExporting] = useState(false);
    
    // Default selected columns
    const [selectedColumns, setSelectedColumns] = useState<string[]>([
        'cod_colab', 'nome', 'status_trabajador', 'status_seguridad', 
        'dias_trabalhados', 'data_ingresso', 'data_baixa', 'contratante', 'cliente_nombre'
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
            // Fetch ALL workers matching the current filters (pageSize 100000)
            const response = await listSalaryReportWorkers({
                empresaId: selectedEmpresaId,
                ...currentFilters,
                page: 1,
                pageSize: 100000,
                sortColumn: 'nome',
                sortDirection: 'asc'
            });

            const workers = response.data;

            if (workers.length === 0) {
                alert("Nenhum trabalhador encontrado para exportação com os filtros atuais.");
                setIsExporting(false);
                return;
            }

            // Map workers to row data based on selected columns
            const rows = workers.map((worker) => {
                const rowData: Record<string, any> = {};
                
                // Keep the exact order of columns as selected
                EXPORTABLE_COLUMNS.forEach(col => {
                    if (selectedColumns.includes(col.id)) {
                        let val = worker[col.id as keyof SalaryReportWorker];
                        
                        // Handle date formatting simply if it exists
                        if (val && typeof val === 'string' && (col.id.startsWith('data_') || col.id === 'fecha_nacimiento')) {
                            try {
                                val = new Date(val).toLocaleDateString('pt-BR');
                            } catch (e) {
                                // Ignore formatting if error
                            }
                        }
                        
                        rowData[col.label] = val ?? '';
                    }
                });
                
                return rowData;
            });

            // Generate Excel
            const worksheet = XLSX.utils.json_to_sheet(rows);
            const workbook = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(workbook, worksheet, "Informe de Salários");
            
            // Save file
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
            XLSX.writeFile(workbook, `Informe_Salarios_${currentFilters.periodMonth}_${currentFilters.periodYear}_${timestamp}.xlsx`);
            
            setIsOpen(false);
        } catch (error) {
            console.error("Failed to export salary report:", error);
            alert("Erro ao exportar planilha. Tente novamente.");
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
                    <DialogTitle>Exportar Informe de Salários (Excel)</DialogTitle>
                    <DialogDescription>
                        Selecione as colunas que deseja enviar para a planilha. {`\n`}
                        A exportação utilizará a lista de trabalhadores ativos no período selecionado.
                    </DialogDescription>
                </DialogHeader>

                <div className="py-4">
                    <div className="flex justify-between items-center mb-4">
                        <Label className="font-semibold text-base">Campos para exportar</Label>
                        <div className="flex gap-3 text-sm">
                            <button onClick={() => handleSelectAll(true)} className="text-primary hover:underline">
                                Marcar todos
                            </button>
                            <button onClick={() => handleSelectAll(false)} className="text-muted-foreground hover:underline">
                                Desmarcar todos
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
                        Cancelar
                    </Button>
                    <Button 
                        onClick={handleExport} 
                        disabled={isExporting || selectedColumns.length === 0}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white"
                    >
                        {isExporting ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Processando Arquivo...
                            </>
                        ) : (
                            <>
                                <DownloadCloud className="mr-2 h-4 w-4" />
                                Baixar Planilha
                            </>
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
