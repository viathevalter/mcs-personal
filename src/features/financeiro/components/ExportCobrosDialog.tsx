import React, { useState, useMemo } from 'react';
import * as XLSX from 'xlsx';
import { DownloadCloud, FileSpreadsheet, Loader2, CheckSquare, Square, Sparkles, Filter, Search, Layers, DollarSign, Calendar, Building, Phone, Clock } from 'lucide-react';
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
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import { formatCurrency, formatDate, normalizeEmpresaName } from '../lib/utils';
import type { EnrichedTitulo } from '../types';

export interface ExportCobrosDialogProps {
    trigger?: React.ReactNode;
    titulos: EnrichedTitulo[];
    activeKpiFilter?: 'all' | 'pago' | 'vencido' | 'a_vencer';
    filterEmpresas?: string[];
    filterBancos?: string[];
    filterPeriodosFat?: string[];
    searchTerm?: string;
}

export interface CobrosColumnOption {
    id: string;
    label: string;
    category: 'identificacao' | 'datas' | 'valores' | 'status_banco' | 'contatos' | 'observacoes';
    getValue: (item: EnrichedTitulo) => string | number;
}

const AVAILABLE_COLUMNS: CobrosColumnOption[] = [
    // Identificação & Cliente
    {
        id: 'cliente',
        label: 'Cliente',
        category: 'identificacao',
        getValue: (t) => t.clienteInfo?.NombreComercial || t.Cliente || '-'
    },
    {
        id: 'razon_social',
        label: 'Razão Social',
        category: 'identificacao',
        getValue: (t) => t.clienteInfo?.RazonSocial || '-'
    },
    {
        id: 'cod_cliente',
        label: 'Cód. Cliente',
        category: 'identificacao',
        getValue: (t) => t.CodCliente || t.clienteInfo?.CodCliente || '-'
    },
    {
        id: 'num_doc',
        label: 'Nº Documento / Fatura',
        category: 'identificacao',
        getValue: (t) => t.Num_doc || '-'
    },
    {
        id: 'empresa',
        label: 'Empresa Faturadora',
        category: 'identificacao',
        getValue: (t) => normalizeEmpresaName(t.Empresa) || t.Empresa || '-'
    },
    {
        id: 'obra',
        label: 'Obra / Projeto',
        category: 'identificacao',
        getValue: (t) => t.Obra || '-'
    },

    // Datas & Prazos
    {
        id: 'periodo_fat',
        label: 'Mês de Faturamento',
        category: 'datas',
        getValue: (t) => t.periodo_fat || '-'
    },
    {
        id: 'data_emissao',
        label: 'Data de Emissão',
        category: 'datas',
        getValue: (t) => t.Data_emissao ? formatDate(t.Data_emissao) : '-'
    },
    {
        id: 'dt_venc',
        label: 'Data de Vencimento',
        category: 'datas',
        getValue: (t) => t.Dt_venc ? formatDate(t.Dt_venc) : '-'
    },
    {
        id: 'dt_recebimento',
        label: 'Data de Recebimento',
        category: 'datas',
        getValue: (t) => t.dt_recebimento ? formatDate(t.dt_recebimento) : '-'
    },
    {
        id: 'dias_atraso',
        label: 'Dias em Atraso',
        category: 'datas',
        getValue: (t) => {
            if (t.Status === 'Pago' || !t.Dt_venc) return 0;
            const delay = Math.floor((new Date().getTime() - new Date(t.Dt_venc).getTime()) / (1000 * 3600 * 24));
            return delay > 0 ? delay : 0;
        }
    },

    // Valores Financeiros & Saldos
    {
        id: 'valor_total',
        label: 'Valor Total (€)',
        category: 'valores',
        getValue: (t) => Number(t.Valot_total || 0)
    },
    {
        id: 'saldo_a_pagar',
        label: 'Saldo a Receber (€)',
        category: 'valores',
        getValue: (t) => Number(t.Saldo_a_pagar || 0)
    },
    {
        id: 'valor_recebido',
        label: 'Valor Já Recebido (€)',
        category: 'valores',
        getValue: (t) => Number(Math.max(0, (t.Valot_total || 0) - (t.Saldo_a_pagar || 0)).toFixed(2))
    },
    {
        id: 'comisao_taxa',
        label: 'Comissão / Taxa Bancária (€)',
        category: 'valores',
        getValue: (t) => parseFloat(String(t.comisao_taxa || 0)) || 0
    },

    // Status & Meio de Pagamento
    {
        id: 'status',
        label: 'Status do Cobro',
        category: 'status_banco',
        getValue: (t) => t.Status || 'A vencer'
    },
    {
        id: 'integral_parcial',
        label: 'Tipo de Liquidação',
        category: 'status_banco',
        getValue: (t) => t.Integral_parcial || 'Integral'
    },
    {
        id: 'banco',
        label: 'Banco de Destino',
        category: 'status_banco',
        getValue: (t) => t.Banco || 'Não Definido'
    },
    {
        id: 'form_receb',
        label: 'Forma de Pagamento',
        category: 'status_banco',
        getValue: (t) => t.Form_receb || '-'
    },

    // Contatos & Localização
    {
        id: 'email_cobros',
        label: 'E-mail de Cobrança',
        category: 'contatos',
        getValue: (t) => t.clienteInfo?.EmailCobros || '-'
    },
    {
        id: 'telefono_cobros',
        label: 'Telefone de Cobrança',
        category: 'contatos',
        getValue: (t) => t.clienteInfo?.TelefonoCobros || '-'
    },
    {
        id: 'resp_cobros',
        label: 'Responsável no Cliente',
        category: 'contatos',
        getValue: (t) => t.clienteInfo?.RespCobros || '-'
    },
    {
        id: 'pais_provincia',
        label: 'País / Província',
        category: 'contatos',
        getValue: (t) => [t.clienteInfo?.Pais, t.clienteInfo?.Provincia].filter(Boolean).join(' - ') || '-'
    },
    {
        id: 'domicilio',
        label: 'Endereço / Domicílio',
        category: 'contatos',
        getValue: (t) => t.clienteInfo?.Domicilio || '-'
    },

    // Observações & Auditoria
    {
        id: 'obs',
        label: 'Observações Gerais',
        category: 'observacoes',
        getValue: (t) => t.Obs || '-'
    },
    {
        id: 'comentarios',
        label: 'Comentários da Baixa',
        category: 'observacoes',
        getValue: (t) => t.comentarios || '-'
    },
    {
        id: 'creado_por',
        label: 'Criado Por',
        category: 'observacoes',
        getValue: (t) => t.Creado_por || '-'
    },
    {
        id: 'creado',
        label: 'Data de Criação',
        category: 'observacoes',
        getValue: (t) => t.Creado ? formatDate(t.Creado) : '-'
    },
    {
        id: 'modificado_por',
        label: 'Modificado Por',
        category: 'observacoes',
        getValue: (t) => t.Modificado_por || '-'
    }
];

const PRESETS: Record<string, { label: string; icon: React.ReactNode; columns: string[] }> = {
    essenciais: {
        label: 'Padrão / Essencial',
        icon: <Sparkles className="w-3.5 h-3.5" />,
        columns: [
            'cliente', 'num_doc', 'empresa', 'obra', 'periodo_fat',
            'data_emissao', 'dt_venc', 'dt_recebimento', 'valor_total',
            'saldo_a_pagar', 'valor_recebido', 'status', 'banco', 'form_receb', 'dias_atraso'
        ]
    },
    financeiro: {
        label: 'Financeiro & Saldos',
        icon: <DollarSign className="w-3.5 h-3.5" />,
        columns: [
            'cliente', 'num_doc', 'empresa', 'periodo_fat', 'dt_venc',
            'dt_recebimento', 'valor_total', 'saldo_a_pagar', 'valor_recebido',
            'comisao_taxa', 'status', 'banco', 'form_receb'
        ]
    },
    cobranca: {
        label: 'Cobrança & Contatos',
        icon: <Phone className="w-3.5 h-3.5" />,
        columns: [
            'cliente', 'razon_social', 'num_doc', 'empresa', 'dt_venc',
            'dias_atraso', 'saldo_a_pagar', 'status', 'email_cobros',
            'telefono_cobros', 'resp_cobros', 'obs'
        ]
    },
    completo: {
        label: 'Todas as Colunas',
        icon: <Layers className="w-3.5 h-3.5" />,
        columns: AVAILABLE_COLUMNS.map(c => c.id)
    }
};

const CATEGORIES: Record<string, { label: string; icon: React.ReactNode; color: string; badge: string }> = {
    identificacao: { 
        label: 'Identificação & Cliente', 
        icon: <Building className="w-3.5 h-3.5" />,
        color: 'text-indigo-600 dark:text-indigo-400', 
        badge: 'bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/60 dark:text-indigo-300 dark:border-indigo-800' 
    },
    datas: { 
        label: 'Datas & Prazos', 
        icon: <Calendar className="w-3.5 h-3.5" />,
        color: 'text-blue-600 dark:text-blue-400', 
        badge: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-800' 
    },
    valores: { 
        label: 'Valores Financeiros & Saldos', 
        icon: <DollarSign className="w-3.5 h-3.5" />,
        color: 'text-emerald-600 dark:text-emerald-400', 
        badge: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800' 
    },
    status_banco: { 
        label: 'Status & Meio de Pagamento', 
        icon: <Clock className="w-3.5 h-3.5" />,
        color: 'text-purple-600 dark:text-purple-400', 
        badge: 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/60 dark:text-purple-300 dark:border-purple-800' 
    },
    contatos: { 
        label: 'Contatos & Localização', 
        icon: <Phone className="w-3.5 h-3.5" />,
        color: 'text-amber-600 dark:text-amber-400', 
        badge: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800' 
    },
    observacoes: { 
        label: 'Observações & Auditoria', 
        icon: <Layers className="w-3.5 h-3.5" />,
        color: 'text-slate-600 dark:text-slate-400', 
        badge: 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700' 
    }
};

export const ExportCobrosDialog: React.FC<ExportCobrosDialogProps> = ({
    trigger,
    titulos,
    activeKpiFilter = 'all',
    filterEmpresas = [],
    filterBancos = [],
    filterPeriodosFat = [],
    searchTerm = ''
}) => {
    const { t } = useTranslation();
    const [isOpen, setIsOpen] = useState(false);
    const [isExporting, setIsExporting] = useState(false);
    const [columnSearch, setColumnSearch] = useState('');
    
    // Default selected columns: preset essenciais
    const [selectedColumnIds, setSelectedColumnIds] = useState<Set<string>>(
        new Set(PRESETS.essenciais.columns)
    );

    // Totals of filtered dataset
    const totals = useMemo(() => {
        const totalVal = titulos.reduce((acc, curr) => acc + (curr.Valot_total || 0), 0);
        const totalSaldo = titulos.reduce((acc, curr) => acc + (curr.Saldo_a_pagar || 0), 0);
        const totalRecebido = Math.max(0, totalVal - totalSaldo);
        return { totalVal, totalSaldo, totalRecebido };
    }, [titulos]);

    const toggleColumn = (id: string) => {
        const next = new Set(selectedColumnIds);
        if (next.has(id)) {
            next.delete(id);
        } else {
            next.add(id);
        }
        setSelectedColumnIds(next);
    };

    const handleSelectPreset = (presetKey: string) => {
        const preset = PRESETS[presetKey];
        if (preset) {
            setSelectedColumnIds(new Set(preset.columns));
        }
    };

    const handleSelectAll = () => {
        setSelectedColumnIds(new Set(AVAILABLE_COLUMNS.map(c => c.id)));
    };

    const handleDeselectAll = () => {
        setSelectedColumnIds(new Set());
    };

    // Filter columns by user search
    const filteredColumns = useMemo(() => {
        if (!columnSearch.trim()) return AVAILABLE_COLUMNS;
        const q = columnSearch.toLowerCase().trim();
        return AVAILABLE_COLUMNS.filter(col => 
            col.label.toLowerCase().includes(q) || 
            CATEGORIES[col.category]?.label.toLowerCase().includes(q)
        );
    }, [columnSearch]);

    // Group filtered columns by category
    const groupedColumns = useMemo(() => {
        const groups: Record<string, CobrosColumnOption[]> = {};
        Object.keys(CATEGORIES).forEach(cat => {
            groups[cat] = filteredColumns.filter(c => c.category === cat);
        });
        return groups;
    }, [filteredColumns]);

    const handleExportExcel = () => {
        if (!titulos || titulos.length === 0) {
            toast.error(t('financeiro.export.err_no_data', 'Nenhum cobro encontrado com os filtros atuais para exportar.'));
            return;
        }

        if (selectedColumnIds.size === 0) {
            toast.error(t('financeiro.export.err_no_columns', 'Selecione pelo menos uma coluna para exportar.'));
            return;
        }

        setIsExporting(true);

        try {
            // Keep the exact order of columns as defined in AVAILABLE_COLUMNS
            const activeCols = AVAILABLE_COLUMNS.filter(c => selectedColumnIds.has(c.id));

            const exportRows = titulos.map(titulo => {
                const rowObj: Record<string, any> = {};
                activeCols.forEach(col => {
                    rowObj[col.label] = col.getValue(titulo);
                });
                return rowObj;
            });

            // Create worksheet
            const worksheet = XLSX.utils.json_to_sheet(exportRows);

            // Compute auto-width for all columns based on content + header
            const colWidths = activeCols.map(col => {
                let maxLen = col.label.length;
                exportRows.forEach(row => {
                    const val = row[col.label];
                    const valStr = val !== null && val !== undefined ? String(val) : '';
                    if (valStr.length > maxLen) {
                        maxLen = Math.min(valStr.length, 50);
                    }
                });
                return { wch: Math.max(maxLen + 3, 12) };
            });
            worksheet['!cols'] = colWidths;

            // Create workbook & append
            const workbook = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(workbook, worksheet, 'Cobros_Recebimentos');

            // Filename with timestamp
            const timestamp = format(new Date(), 'yyyyMMdd_HHmm');
            const fileName = `MCS_Cobros_Recebimentos_${timestamp}.xlsx`;

            XLSX.writeFile(workbook, fileName);

            toast.success(t('financeiro.export.success', 'Planilha Excel exportada com sucesso!'));
            setIsOpen(false);
        } catch (error: any) {
            console.error('Error exporting to Excel:', error);
            toast.error(t('financeiro.export.err_generic', 'Erro ao gerar planilha: ') + (error.message || String(error)));
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
                        className="flex items-center gap-2 text-slate-700 dark:text-slate-200 hover:text-emerald-600 dark:hover:text-emerald-400 hover:border-emerald-300 font-semibold shadow-xs"
                    >
                        <FileSpreadsheet size={16} className="text-emerald-600" />
                        <span>{t('financeiro.export.btn_export', 'Exportar Excel')}</span>
                    </Button>
                )}
            </DialogTrigger>

            <DialogContent className="sm:max-w-3xl max-h-[92vh] flex flex-col p-6 dark:bg-slate-900 dark:border-slate-800">
                <DialogHeader className="flex-none">
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 bg-emerald-100 dark:bg-emerald-950/60 rounded-xl text-emerald-600 dark:text-emerald-400 shadow-xs">
                            <FileSpreadsheet className="w-6 h-6" />
                        </div>
                        <div>
                            <DialogTitle className="text-lg font-bold text-slate-900 dark:text-slate-100">
                                {t('financeiro.export.dialog_title', 'Exportar Cobros e Recebimentos (Excel)')}
                            </DialogTitle>
                            <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                                {t('financeiro.export.dialog_desc', 'Selecione as colunas personalizadas que deseja incluir na planilha. A exportação utilizará exatamente os dados e filtros ativos na tela.')}
                            </DialogDescription>
                        </div>
                    </div>
                </DialogHeader>

                {/* Filter & Totals Summary Banner */}
                <div className="flex-none bg-slate-50 dark:bg-slate-950/40 border dark:border-slate-800 rounded-xl p-3 my-2 text-xs space-y-2">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                            <Badge variant="outline" className="font-bold bg-white dark:bg-slate-900 border-slate-300 text-slate-800 dark:text-slate-200">
                                {titulos.length} {titulos.length === 1 ? 'cobro selecionado' : 'cobros selecionados'}
                            </Badge>
                            {activeKpiFilter !== 'all' && (
                                <Badge variant="secondary" className="uppercase font-bold text-[10px]">
                                    {activeKpiFilter === 'pago' ? 'Apenas Pagos' : activeKpiFilter === 'vencido' ? 'Apenas Vencidos' : 'A Vencer'}
                                </Badge>
                            )}
                            {searchTerm && (
                                <Badge variant="outline" className="text-[10px] text-muted-foreground">
                                    Busca: "{searchTerm}"
                                </Badge>
                            )}
                            {filterEmpresas.length > 0 && (
                                <Badge variant="outline" className="text-[10px] text-muted-foreground">
                                    {filterEmpresas.length} {filterEmpresas.length === 1 ? 'empresa' : 'empresas'}
                                </Badge>
                            )}
                            {filterPeriodosFat.length > 0 && (
                                <Badge variant="outline" className="text-[10px] text-muted-foreground">
                                    {filterPeriodosFat.join(', ')}
                                </Badge>
                            )}
                        </div>

                        <div className="flex items-center gap-3 font-semibold text-[11px]">
                            <span className="text-slate-600 dark:text-slate-300">
                                Total: <strong className="text-slate-900 dark:text-slate-100">{formatCurrency(totals.totalVal)}</strong>
                            </span>
                            <span className="text-slate-300 dark:text-slate-700">|</span>
                            <span className="text-rose-600 dark:text-rose-400">
                                Em Aberto: <strong>{formatCurrency(totals.totalSaldo)}</strong>
                            </span>
                            <span className="text-slate-300 dark:text-slate-700">|</span>
                            <span className="text-emerald-600 dark:text-emerald-400">
                                Recebido: <strong>{formatCurrency(totals.totalRecebido)}</strong>
                            </span>
                        </div>
                    </div>
                </div>

                {/* Presets and Controls Bar */}
                <div className="flex-none space-y-2.5">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                        <Label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                            <Sparkles size={13} className="text-indigo-600 dark:text-indigo-400" />
                            <span>{t('financeiro.export.presets_label', 'Modelos Rápidos de Colunas:')}</span>
                        </Label>

                        <div className="flex items-center gap-1.5 text-xs">
                            <button
                                type="button"
                                onClick={handleSelectAll}
                                className="text-indigo-650 dark:text-indigo-400 hover:underline font-bold text-[11px]"
                            >
                                {t('financeiro.export.select_all', 'Marcar Todas')}
                            </button>
                            <span className="text-slate-300 dark:text-slate-700">|</span>
                            <button
                                type="button"
                                onClick={handleDeselectAll}
                                className="text-slate-500 hover:underline font-semibold text-[11px]"
                            >
                                {t('financeiro.export.deselect_all', 'Desmarcar Todas')}
                            </button>
                        </div>
                    </div>

                    <div className="flex flex-wrap gap-2">
                        {Object.entries(PRESETS).map(([key, preset]) => (
                            <Button
                                key={key}
                                type="button"
                                size="sm"
                                variant="outline"
                                onClick={() => handleSelectPreset(key)}
                                className="h-7 text-xs font-semibold gap-1.5 bg-white dark:bg-slate-900 hover:bg-indigo-50 dark:hover:bg-indigo-950/30 hover:border-indigo-300 transition-all shadow-2xs"
                            >
                                {preset.icon}
                                <span>{preset.label}</span>
                            </Button>
                        ))}
                    </div>

                    {/* Column Search Filter */}
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={14} />
                        <Input
                            type="text"
                            placeholder={t('financeiro.export.search_columns_placeholder', 'Localizar coluna por nome...')}
                            value={columnSearch}
                            onChange={(e) => setColumnSearch(e.target.value)}
                            className="h-8 pl-8 text-xs bg-slate-50/50 dark:bg-slate-950/50"
                        />
                    </div>
                </div>

                {/* Columns Selection Area */}
                <div className="flex-1 overflow-y-auto space-y-4 pr-1 mt-2 py-2">
                    {Object.entries(groupedColumns).map(([catKey, cols]) => {
                        if (cols.length === 0) return null;
                        const catMeta = CATEGORIES[catKey];
                        const selectedInCat = cols.filter(c => selectedColumnIds.has(c.id)).length;

                        return (
                            <div key={catKey} className="space-y-2">
                                <div className="flex items-center justify-between border-b pb-1 dark:border-slate-800">
                                    <div className="flex items-center gap-1.5 font-bold text-xs">
                                        <span className={catMeta.color}>{catMeta.icon}</span>
                                        <span className="text-slate-800 dark:text-slate-200">{catMeta.label}</span>
                                    </div>
                                    <Badge variant="outline" className={`text-[10px] py-0 font-medium ${catMeta.badge}`}>
                                        {selectedInCat} de {cols.length}
                                    </Badge>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                                    {cols.map(col => {
                                        const isChecked = selectedColumnIds.has(col.id);
                                        return (
                                            <label
                                                key={col.id}
                                                className={`flex items-center space-x-2.5 p-2 rounded-lg border text-xs cursor-pointer transition-all ${
                                                    isChecked
                                                        ? 'bg-indigo-50/60 dark:bg-indigo-950/30 border-indigo-200 dark:border-indigo-800 shadow-2xs'
                                                        : 'hover:bg-slate-50 dark:hover:bg-slate-900 border-slate-200/80 dark:border-slate-800'
                                                }`}
                                            >
                                                <Checkbox
                                                    checked={isChecked}
                                                    onCheckedChange={() => toggleColumn(col.id)}
                                                    className="data-[state=checked]:bg-emerald-600 data-[state=checked]:border-emerald-600"
                                                />
                                                <span className={`text-[11px] leading-tight font-medium ${isChecked ? 'text-slate-900 dark:text-slate-100 font-semibold' : 'text-slate-600 dark:text-slate-400'}`}>
                                                    {col.label}
                                                </span>
                                            </label>
                                        );
                                    })}
                                </div>
                            </div>
                        );
                    })}
                </div>

                <DialogFooter className="flex-none gap-2 sm:gap-0 mt-3 pt-3 border-t dark:border-slate-800 flex items-center justify-between w-full">
                    <div className="text-xs text-muted-foreground font-semibold">
                        <span>{selectedColumnIds.size} de {AVAILABLE_COLUMNS.length} {t('financeiro.export.columns_selected', 'colunas selecionadas')}</span>
                    </div>

                    <div className="flex items-center gap-2">
                        <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={() => setIsOpen(false)} 
                            disabled={isExporting}
                            className="text-xs h-8"
                        >
                            {t('financeiro.export.btn_cancel', 'Cancelar')}
                        </Button>
                        <Button
                            size="sm"
                            onClick={handleExportExcel}
                            disabled={isExporting || selectedColumnIds.size === 0 || titulos.length === 0}
                            className="text-xs h-8 font-bold bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5 shadow-sm min-w-[150px]"
                        >
                            {isExporting ? (
                                <>
                                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                    <span>{t('financeiro.export.generating', 'Gerando Excel...')}</span>
                                </>
                            ) : (
                                <>
                                    <DownloadCloud className="w-4 h-4" />
                                    <span>{t('financeiro.export.btn_download', 'Baixar Planilha')}</span>
                                </>
                            )}
                        </Button>
                    </div>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};
