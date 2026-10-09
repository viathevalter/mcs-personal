import { useState } from 'react';
import * as XLSX from 'xlsx';
import { format } from 'date-fns';
import { 
    DownloadCloud, 
    Loader2, 
    CheckSquare, 
    Square, 
    Sparkles, 
    FileSpreadsheet,
    Filter,
    Users
} from 'lucide-react';
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
import { Badge } from '@/components/ui/badge';
import { useEmpresa } from '@/app/providers/EmpresaProvider';
import { listWorkers } from '../api/workersApi';
import { supabase } from '@/shared/supabase/client';
import { isDateInCompetence } from '@/features/holerites/pages/HoleritesPage';
import type { Worker } from '@/shared/types/corePersonal';
import { toast } from 'sonner';

export interface ExportTarifasDialogProps {
    trigger?: React.ReactNode;
    currentFilters: {
        search?: string;
        clienteNombre?: string[];
        contratante?: string;
        funcion?: string;
        statusSeguridad?: string[];
        statusTrabajador?: string[];
        mesContratacao?: string;
        workerFilterType?: string;
        sortColumn?: string;
        sortDirection?: 'asc' | 'desc';
    };
    selectedWorkerIds?: Set<string>;
    totalFilteredCount?: number;
}

export interface ExportableColumn {
    id: string;
    label: string;
    category: 'principais' | 'remuneracao' | 'banco' | 'outros';
}

const EXPORTABLE_COLUMNS: ExportableColumn[] = [
    // Principais / Identificação
    { id: 'cod_colab', label: 'Cód. Colab', category: 'principais' },
    { id: 'nome', label: 'Nome Completo', category: 'principais' },
    { id: 'nif', label: 'NIF', category: 'principais' },
    { id: 'tarifa_hora', label: 'Tarifa (Hora €)', category: 'principais' },
    { id: 'funcion', label: 'Função', category: 'principais' },
    { id: 'cliente_nombre', label: 'Cliente / Obra', category: 'principais' },
    { id: 'contratante', label: 'Empresa Contratante', category: 'principais' },
    { id: 'status_seguridad', label: 'Status Segurança', category: 'principais' },

    // Remuneração & Benefícios
    { id: 'auxilio_moradia_base', label: 'Auxílio Moradia (€)', category: 'remuneracao' },
    { id: 'subsidio_alimentacao', label: 'Subsídio Alimentação (€)', category: 'remuneracao' },
    { id: 'ajuda_custo', label: 'Ajuda de Custo (€)', category: 'remuneracao' },

    // Dados Bancários
    { id: 'iban', label: 'IBAN', category: 'banco' },
    { id: 'banco', label: 'Banco', category: 'banco' },

    // Documentos & Dados Cadastrais
    { id: 'niss', label: 'NISS', category: 'outros' },
    { id: 'status_trabajador', label: 'Status Trabalhador', category: 'outros' },
    { id: 'data_ingresso', label: 'Data Ingresso (Admissão)', category: 'outros' },
    { id: 'data_alta_seguridad', label: 'Data Alta Segurança', category: 'outros' },
    { id: 'data_baixa_seguridad', label: 'Data Baixa Segurança', category: 'outros' },
    { id: 'dni', label: 'DNI', category: 'outros' },
    { id: 'nie', label: 'NIE', category: 'outros' },
    { id: 'pasaporte', label: 'Passaporte', category: 'outros' },
    { id: 'nacionalidade', label: 'Nacionalidade', category: 'outros' },
    { id: 'fecha_nacimiento', label: 'Data Nascimento', category: 'outros' },
    { id: 'movil', label: 'Telefone', category: 'outros' },
    { id: 'email', label: 'E-mail', category: 'outros' },
];

const DEFAULT_COLUMNS = [
    'cod_colab',
    'nome',
    'status_trabajador',
    'nif',
    'tarifa_hora',
    'funcion',
    'cliente_nombre',
    'contratante',
    'status_seguridad'
];

function formatIban(iban: string) {
    if (!iban) return '';
    const clean = iban.replace(/\s+/g, '').toUpperCase();
    return clean.replace(/(.{4})/g, '$1 ').trim();
}

function formatDateClean(dateStr: string | null | undefined): string {
    if (!dateStr) return '';
    const str = String(dateStr).trim();
    if (str.includes('/')) return str;
    if (str.includes('-')) {
        const parts = str.split('T')[0].split('-');
        if (parts.length === 3) {
            if (parts[0].length === 4) {
                return `${parts[2]}/${parts[1]}/${parts[0]}`;
            }
            return `${parts[0]}/${parts[1]}/${parts[2]}`;
        }
    }
    return str;
}

export function ExportTarifasDialog({
    trigger,
    currentFilters,
    selectedWorkerIds = new Set(),
    totalFilteredCount
}: ExportTarifasDialogProps) {
    const { selectedEmpresaId } = useEmpresa();
    const [isOpen, setIsOpen] = useState(false);
    const [isExporting, setIsExporting] = useState(false);

    // Selected columns
    const [selectedColumns, setSelectedColumns] = useState<string[]>(DEFAULT_COLUMNS);

    // Export scope: 'all_filtered' or 'only_selected'
    const [exportScope, setExportScope] = useState<'all_filtered' | 'only_selected'>('all_filtered');

    const hasSelection = selectedWorkerIds.size > 0;

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

    const handleApplyDefaultPreset = () => {
        setSelectedColumns(DEFAULT_COLUMNS);
    };

    const isNewWorkerInTargetMonth = (worker: any, targetMonth?: string) => {
        if (!targetMonth || targetMonth === 'all' || !worker) return false;
        const primaryDate = worker.data_ingresso || worker.data_inicio || worker.start_date;
        if (primaryDate) {
            return isDateInCompetence(primaryDate, targetMonth);
        }
        if (worker.data_alta_seguridad) {
            return isDateInCompetence(worker.data_alta_seguridad, targetMonth);
        }
        return false;
    };

    const handleExport = async () => {
        if (!selectedEmpresaId || selectedColumns.length === 0) return;

        setIsExporting(true);
        try {
            // 1. Fetch workers matching RPC filters with maximum page size
            const response = await listWorkers({
                empresaId: selectedEmpresaId,
                search: currentFilters.search,
                clienteNombre: currentFilters.clienteNombre,
                contratante: currentFilters.contratante,
                funcion: currentFilters.funcion,
                statusSeguridad: currentFilters.statusSeguridad,
                statusTrabajador: currentFilters.statusTrabajador,
                sortColumn: currentFilters.sortColumn || 'nome',
                sortDirection: currentFilters.sortDirection || 'asc',
                page: 1,
                pageSize: 100000
            });

            let workers = response.data || [];

            if (workers.length === 0) {
                toast.warning('Nenhum trabalhador encontrado com os filtros atuais.');
                setIsExporting(false);
                return;
            }

            // 2. Fetch worker_beneficios_settings in chunks
            const allWorkerIds = workers.map(w => w.id).filter(Boolean);
            const settingsMap = new Map<string, any>();
            const chunkSize = 200;

            for (let i = 0; i < allWorkerIds.length; i += chunkSize) {
                const chunk = allWorkerIds.slice(i, i + chunkSize);
                const { data: sData, error: sErr } = await supabase
                    .schema('core_personal')
                    .from('worker_beneficios_settings')
                    .select('*')
                    .in('worker_id', chunk);

                if (sErr) {
                    console.error('Error fetching worker settings for export:', sErr);
                } else if (sData) {
                    sData.forEach(s => settingsMap.set(s.worker_id, s));
                }
            }

            // 3. Filter workers using client-side rules (mesContratacao & workerFilterType)
            const mesContratacao = currentFilters.mesContratacao || 'all';
            const workerFilterType = currentFilters.workerFilterType || 'all';

            workers = workers.filter(worker => {
                if (mesContratacao !== 'all') {
                    const isMatch = isNewWorkerInTargetMonth(worker, mesContratacao);
                    if (!isMatch) return false;
                }

                const setting = settingsMap.get(worker.id);
                const tariff = Number(setting?.tarifa_hora || 0);

                if (workerFilterType === 'new_workers') {
                    const targetMonth = mesContratacao !== 'all' ? mesContratacao : format(new Date(), 'yyyy-MM');
                    const isMatch = isNewWorkerInTargetMonth(worker, targetMonth);
                    if (!isMatch) return false;
                } else if (workerFilterType === 'zero_tariffs') {
                    if (tariff > 0) return false;
                } else if (workerFilterType === 'with_tariffs') {
                    if (tariff <= 0) return false;
                } else if (workerFilterType === 'inativos') {
                    const st = (worker.status_trabajador || '').toUpperCase();
                    const isInactive = st.includes('INATIV') || st.includes('DESLIG') || st.includes('BAIXA') || st.includes('DESIST');
                    if (!isInactive) return false;
                } else if (workerFilterType === 'ativos') {
                    const st = (worker.status_trabajador || '').toUpperCase();
                    const isActive = st.includes('ATIV') || st.includes('ACTI');
                    if (!isActive) return false;
                }

                return true;
            });

            // 4. Apply scope if user chose only selected workers
            if (hasSelection && exportScope === 'only_selected') {
                workers = workers.filter(w => selectedWorkerIds.has(w.id));
            }

            if (workers.length === 0) {
                toast.warning('Nenhum colaborador elegível para exportação com os critérios selecionados.');
                setIsExporting(false);
                return;
            }

            // 5. If bank columns are selected, fetch active IBANs
            const needIbans = selectedColumns.includes('iban') || selectedColumns.includes('banco');
            const ibansMap = new Map<string, { iban: string; banco: string }>();

            if (needIbans) {
                const targetWorkerIds = workers.map(w => w.id).filter(Boolean);
                for (let i = 0; i < targetWorkerIds.length; i += chunkSize) {
                    const chunk = targetWorkerIds.slice(i, i + chunkSize);
                    const { data: ibanData, error: ibanErr } = await supabase
                        .schema('core_personal')
                        .from('worker_ibans')
                        .select('worker_id, iban, banco')
                        .in('worker_id', chunk)
                        .eq('status', 'ATIVO');

                    if (ibanErr) {
                        console.error('Error fetching worker ibans for export:', ibanErr);
                    } else if (ibanData) {
                        ibanData.forEach((row: any) => {
                            if (row.worker_id && row.iban) {
                                ibansMap.set(row.worker_id, { iban: row.iban, banco: row.banco || '' });
                            }
                        });
                    }
                }
            }

            // 6. Map workers into export rows based on selected columns
            const rows = workers.map(worker => {
                const setting = settingsMap.get(worker.id);
                const ibanInfo = ibansMap.get(worker.id);
                const rowData: Record<string, any> = {};

                EXPORTABLE_COLUMNS.forEach(col => {
                    if (!selectedColumns.includes(col.id)) return;

                    let val: any = '';
                    switch (col.id) {
                        case 'tarifa_hora':
                            val = setting?.tarifa_hora != null ? Number(setting.tarifa_hora) : 0;
                            break;
                        case 'auxilio_moradia_base':
                            val = setting?.auxilio_moradia_base != null ? Number(setting.auxilio_moradia_base) : 0;
                            break;
                        case 'subsidio_alimentacao':
                            val = setting?.subsidio_alimentacao != null ? Number(setting.subsidio_alimentacao) : 0;
                            break;
                        case 'ajuda_custo':
                            val = setting?.ajuda_custo != null ? Number(setting.ajuda_custo) : 0;
                            break;
                        case 'iban':
                            val = ibanInfo?.iban ? formatIban(ibanInfo.iban) : '';
                            break;
                        case 'banco':
                            val = ibanInfo?.banco || '';
                            break;
                        case 'data_ingresso':
                        case 'data_baixa':
                        case 'data_alta_seguridad':
                        case 'data_baixa_seguridad':
                        case 'fecha_nacimiento':
                            val = formatDateClean(worker[col.id as keyof Worker]);
                            break;
                        default:
                            val = (worker as any)[col.id] ?? '';
                            break;
                    }

                    rowData[col.label] = val;
                });

                return rowData;
            });

            // 7. Generate Excel workbook
            const worksheet = XLSX.utils.json_to_sheet(rows);

            // Auto-size columns
            if (rows.length > 0) {
                const colKeys = Object.keys(rows[0]);
                worksheet['!cols'] = colKeys.map(k => {
                    const maxLen = Math.max(
                        k.length,
                        ...rows.map(r => String(r[k] ?? '').length)
                    );
                    return { wch: Math.min(Math.max(maxLen + 3, 12), 45) };
                });
            }

            const workbook = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(workbook, worksheet, 'Tarifas');

            const timestamp = format(new Date(), 'yyyyMMdd_HHmm');
            const companySuffix = currentFilters.contratante ? `_${currentFilters.contratante.replace(/\s+/g, '_')}` : '';
            XLSX.writeFile(workbook, `Tarifas_Trabalhadores${companySuffix}_${timestamp}.xlsx`);

            toast.success(`Exportação concluída com sucesso! (${rows.length} colaboradores)`);
            setIsOpen(false);
        } catch (error) {
            console.error('Failed to export tariffs:', error);
            toast.error('Erro ao gerar planilha de tarifas. Tente novamente.');
        } finally {
            setIsExporting(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                {trigger || (
                    <Button 
                        variant="outline" 
                        size="sm"
                        className="h-9 text-xs font-semibold border-emerald-200 text-emerald-700 bg-emerald-50/50 hover:bg-emerald-100 dark:bg-emerald-950 dark:text-emerald-300 gap-1.5"
                    >
                        <DownloadCloud className="w-3.5 h-3.5 text-emerald-600" />
                        Exportar Tarifas (Excel)
                    </Button>
                )}
            </DialogTrigger>
            <DialogContent className="sm:max-w-[700px] max-h-[90vh] flex flex-col p-6 overflow-hidden">
                <DialogHeader className="shrink-0 pb-3 border-b">
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 bg-emerald-50 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400 rounded-xl border border-emerald-200/60">
                            <FileSpreadsheet className="w-5 h-5" />
                        </div>
                        <div>
                            <DialogTitle className="text-lg font-bold">Exportar Tarifas de Trabalhadores</DialogTitle>
                            <DialogDescription className="text-xs text-muted-foreground">
                                Escolha as colunas desejadas para gerar a planilha em formato Excel (.xlsx).
                            </DialogDescription>
                        </div>
                    </div>
                </DialogHeader>

                <div className="flex-1 overflow-y-auto py-4 space-y-5 pr-1">
                    {/* Scope Selector (if workers are checked in the table) */}
                    {hasSelection ? (
                        <div className="p-3 bg-indigo-50/60 dark:bg-indigo-950/40 rounded-xl border border-indigo-100 dark:border-indigo-900/50 space-y-2">
                            <div className="flex items-center justify-between">
                                <span className="text-xs font-bold text-indigo-900 dark:text-indigo-200 flex items-center gap-1.5">
                                    <Users className="w-3.5 h-3.5 text-indigo-600" />
                                    Escopo da Exportação
                                </span>
                                <Badge variant="secondary" className="text-[11px] bg-indigo-100 text-indigo-700 border-indigo-200">
                                    {selectedWorkerIds.size} selecionado(s) na tabela
                                </Badge>
                            </div>
                            <div className="grid grid-cols-2 gap-2 text-xs pt-1">
                                <button
                                    type="button"
                                    onClick={() => setExportScope('all_filtered')}
                                    className={`p-2.5 rounded-lg border text-left transition-all ${
                                        exportScope === 'all_filtered'
                                            ? 'border-indigo-600 bg-white dark:bg-slate-900 font-semibold text-indigo-700 dark:text-indigo-300 shadow-sm'
                                            : 'border-transparent bg-indigo-100/40 hover:bg-indigo-100/70 text-slate-700 dark:text-slate-300'
                                    }`}
                                >
                                    <div>Todos os Filtrados</div>
                                    <div className="text-[11px] text-muted-foreground font-normal">
                                        Exportar todos os {totalFilteredCount != null ? totalFilteredCount : ''} do filtro
                                    </div>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setExportScope('only_selected')}
                                    className={`p-2.5 rounded-lg border text-left transition-all ${
                                        exportScope === 'only_selected'
                                            ? 'border-indigo-600 bg-white dark:bg-slate-900 font-semibold text-indigo-700 dark:text-indigo-300 shadow-sm'
                                            : 'border-transparent bg-indigo-100/40 hover:bg-indigo-100/70 text-slate-700 dark:text-slate-300'
                                    }`}
                                >
                                    <div>Apenas Selecionados</div>
                                    <div className="text-[11px] text-muted-foreground font-normal">
                                        Exportar apenas os {selectedWorkerIds.size} marcados
                                    </div>
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="flex items-center justify-between p-2.5 bg-slate-50 dark:bg-slate-900/50 rounded-lg border text-xs">
                            <span className="text-muted-foreground flex items-center gap-1.5 font-medium">
                                <Filter className="w-3.5 h-3.5 text-slate-500" />
                                Registros a exportar:
                            </span>
                            <Badge variant="outline" className="font-semibold text-slate-700 dark:text-slate-200">
                                {totalFilteredCount != null ? `${totalFilteredCount} trabalhador(es)` : 'Conforme filtros da tela'}
                            </Badge>
                        </div>
                    )}

                    {/* Action buttons / Presets */}
                    <div className="flex flex-wrap items-center justify-between gap-2 pb-1">
                        <div className="flex items-center gap-2">
                            <span className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                                Colunas da Planilha
                            </span>
                            <Badge variant="secondary" className="text-[11px] font-semibold">
                                {selectedColumns.length} de {EXPORTABLE_COLUMNS.length} selecionadas
                            </Badge>
                        </div>

                        <div className="flex items-center gap-1.5 text-xs">
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={handleApplyDefaultPreset}
                                className="h-7 px-2.5 text-xs text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 border-indigo-200"
                            >
                                <Sparkles className="w-3 h-3 mr-1" />
                                Padrão RH
                            </Button>
                            <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => handleSelectAll(true)}
                                className="h-7 px-2 text-xs text-slate-600 hover:text-slate-900"
                            >
                                <CheckSquare className="w-3 h-3 mr-1" />
                                Marcar todas
                            </Button>
                            <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => handleSelectAll(false)}
                                className="h-7 px-2 text-xs text-muted-foreground hover:text-slate-700"
                            >
                                <Square className="w-3 h-3 mr-1" />
                                Desmarcar
                            </Button>
                        </div>
                    </div>

                    {/* Column Groups */}
                    <div className="space-y-4">
                        {/* Principais & Identificação */}
                        <div className="space-y-2">
                            <div className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                                Identificação & Tarifas Principais
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                {EXPORTABLE_COLUMNS.filter(c => c.category === 'principais').map(col => {
                                    const checked = selectedColumns.includes(col.id);
                                    return (
                                        <div
                                            key={col.id}
                                            onClick={() => handleToggleColumn(col.id)}
                                            className={`flex items-center space-x-2.5 p-2 rounded-lg border cursor-pointer select-none transition-all ${
                                                checked
                                                    ? 'bg-emerald-50/40 border-emerald-300 dark:bg-emerald-950/30 dark:border-emerald-800'
                                                    : 'bg-card border-border hover:bg-slate-50 dark:hover:bg-slate-800/50'
                                            }`}
                                        >
                                            <Checkbox
                                                id={`col-${col.id}`}
                                                checked={checked}
                                                onCheckedChange={() => handleToggleColumn(col.id)}
                                                onClick={e => e.stopPropagation()}
                                            />
                                            <Label
                                                htmlFor={`col-${col.id}`}
                                                className="text-xs font-medium cursor-pointer flex-1"
                                            >
                                                {col.label}
                                            </Label>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Remuneração & Benefícios */}
                        <div className="space-y-2">
                            <div className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                                Benefícios & Ajudas de Custo
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                                {EXPORTABLE_COLUMNS.filter(c => c.category === 'remuneracao').map(col => {
                                    const checked = selectedColumns.includes(col.id);
                                    return (
                                        <div
                                            key={col.id}
                                            onClick={() => handleToggleColumn(col.id)}
                                            className={`flex items-center space-x-2.5 p-2 rounded-lg border cursor-pointer select-none transition-all ${
                                                checked
                                                    ? 'bg-emerald-50/40 border-emerald-300 dark:bg-emerald-950/30 dark:border-emerald-800'
                                                    : 'bg-card border-border hover:bg-slate-50 dark:hover:bg-slate-800/50'
                                            }`}
                                        >
                                            <Checkbox
                                                id={`col-${col.id}`}
                                                checked={checked}
                                                onCheckedChange={() => handleToggleColumn(col.id)}
                                                onClick={e => e.stopPropagation()}
                                            />
                                            <Label
                                                htmlFor={`col-${col.id}`}
                                                className="text-xs font-medium cursor-pointer flex-1"
                                            >
                                                {col.label}
                                            </Label>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Dados Bancários */}
                        <div className="space-y-2">
                            <div className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                                Dados Bancários
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                {EXPORTABLE_COLUMNS.filter(c => c.category === 'banco').map(col => {
                                    const checked = selectedColumns.includes(col.id);
                                    return (
                                        <div
                                            key={col.id}
                                            onClick={() => handleToggleColumn(col.id)}
                                            className={`flex items-center space-x-2.5 p-2 rounded-lg border cursor-pointer select-none transition-all ${
                                                checked
                                                    ? 'bg-emerald-50/40 border-emerald-300 dark:bg-emerald-950/30 dark:border-emerald-800'
                                                    : 'bg-card border-border hover:bg-slate-50 dark:hover:bg-slate-800/50'
                                            }`}
                                        >
                                            <Checkbox
                                                id={`col-${col.id}`}
                                                checked={checked}
                                                onCheckedChange={() => handleToggleColumn(col.id)}
                                                onClick={e => e.stopPropagation()}
                                            />
                                            <Label
                                                htmlFor={`col-${col.id}`}
                                                className="text-xs font-medium cursor-pointer flex-1"
                                            >
                                                {col.label}
                                            </Label>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Documentos & Dados Cadastrais */}
                        <div className="space-y-2">
                            <div className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                                Documentos & Dados Contratuais
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                                {EXPORTABLE_COLUMNS.filter(c => c.category === 'outros').map(col => {
                                    const checked = selectedColumns.includes(col.id);
                                    return (
                                        <div
                                            key={col.id}
                                            onClick={() => handleToggleColumn(col.id)}
                                            className={`flex items-center space-x-2.5 p-2 rounded-lg border cursor-pointer select-none transition-all ${
                                                checked
                                                    ? 'bg-emerald-50/40 border-emerald-300 dark:bg-emerald-950/30 dark:border-emerald-800'
                                                    : 'bg-card border-border hover:bg-slate-50 dark:hover:bg-slate-800/50'
                                            }`}
                                        >
                                            <Checkbox
                                                id={`col-${col.id}`}
                                                checked={checked}
                                                onCheckedChange={() => handleToggleColumn(col.id)}
                                                onClick={e => e.stopPropagation()}
                                            />
                                            <Label
                                                htmlFor={`col-${col.id}`}
                                                className="text-xs font-medium cursor-pointer flex-1"
                                            >
                                                {col.label}
                                            </Label>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                </div>

                <DialogFooter className="shrink-0 pt-4 border-t flex flex-row items-center justify-between sm:justify-between w-full">
                    <div className="text-xs text-muted-foreground">
                        Formato: <strong>Excel (.xlsx)</strong>
                    </div>

                    <div className="flex items-center gap-2">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => setIsOpen(false)}
                            disabled={isExporting}
                            className="h-9 text-xs"
                        >
                            Cancelar
                        </Button>
                        <Button
                            type="button"
                            onClick={handleExport}
                            disabled={isExporting || selectedColumns.length === 0}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white h-9 text-xs font-medium gap-1.5 shadow-sm"
                        >
                            {isExporting ? (
                                <>
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    Gerando Planilha...
                                </>
                            ) : (
                                <>
                                    <DownloadCloud className="w-4 h-4" />
                                    Exportar Planilha ({selectedColumns.length})
                                </>
                            )}
                        </Button>
                    </div>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
