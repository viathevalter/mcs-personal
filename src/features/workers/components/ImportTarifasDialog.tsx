import React, { useState } from 'react';
import * as XLSX from 'xlsx';
import { 
    DownloadCloud, 
    Loader2, 
    AlertCircle, 
    RefreshCw, 
    ArrowRight, 
    ArrowLeft, 
    CheckCircle2, 
    XCircle,
    Search,
    Coins,
    UserCheck
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
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/shared/supabase/client';
import { useImportTarifas, type UpdateTarifaPayload } from '../hooks/useImportTarifas';
import { findMatchingWorker, type SimpleWorker } from '@/shared/utils/importUtils';

interface ImportTarifasDialogProps {
    trigger: React.ReactNode;
}

type ImportStep = 'UPLOAD' | 'MAPPING' | 'PREVIEW';

interface ParsedTarifaRow {
    cod_colab: string;
    nome_planilha: string;
    tarifa: number;
    workerId?: string;
    nomeBanco?: string;
    contratanteBanco?: string;
    matchMethod?: string;
    status: 'ok' | 'not_found' | 'invalid_tariff';
    errorMessage?: string;
    originalRowData: any;
}

export function ImportTarifasDialog({ trigger }: ImportTarifasDialogProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [step, setStep] = useState<ImportStep>('UPLOAD');
    const [isParsing, setIsParsing] = useState(false);

    // Raw Excel data
    const [rawHeaders, setRawHeaders] = useState<string[]>([]);
    const [rawRows, setRawRows] = useState<any[]>([]);

    // Column Mapping state (De-Para)
    const [colMapping, setColMapping] = useState({
        cod_colab: '',
        tarifa: '',
        nome: ''
    });

    // Preview state
    const [parsedRows, setParsedRows] = useState<ParsedTarifaRow[]>([]);
    const [previewSearch, setPreviewSearch] = useState('');
    const [previewFilter, setPreviewFilter] = useState<'all' | 'ok' | 'not_found' | 'invalid_tariff'>('all');

    // Query all workers across all companies for matching
    const { data: workers = [], isLoading: isLoadingWorkers } = useQuery<SimpleWorker[]>({
        queryKey: ['all-workers-direct-for-tariff-import'],
        queryFn: async () => {
            const allWorkers: SimpleWorker[] = [];
            let from = 0;
            const pageSize = 1000;
            let hasMore = true;

            while (hasMore) {
                const { data, error } = await supabase
                    .schema('core_personal')
                    .from('workers')
                    .select('id, cod_colab, nome, cliente, contratante')
                    .range(from, from + pageSize - 1);

                if (error) {
                    console.error("Error fetching all workers directly for tariff import:", error);
                    throw error;
                }

                if (data && data.length > 0) {
                    allWorkers.push(...(data as SimpleWorker[]));
                    if (data.length < pageSize) {
                        hasMore = false;
                    } else {
                        from += pageSize;
                    }
                } else {
                    hasMore = false;
                }
            }
            return allWorkers;
        },
        enabled: isOpen,
        staleTime: 60 * 1000
    });

    const { mutateAsync: importTarifas, isPending: isImporting } = useImportTarifas();

    const resetState = () => {
        setStep('UPLOAD');
        setRawHeaders([]);
        setRawRows([]);
        setParsedRows([]);
        setColMapping({ cod_colab: '', tarifa: '', nome: '' });
        setPreviewSearch('');
        setPreviewFilter('all');
        setIsParsing(false);
    };

    const findKeyIgnoreCase = (headers: string[], searchKeys: string[]): string | undefined => {
        for (const search of searchKeys) {
            const match = headers.find(h => h.trim().toLowerCase() === search.toLowerCase());
            if (match) return match;
        }
        return undefined;
    };

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsParsing(true);
        try {
            const data = await file.arrayBuffer();
            const workbook = XLSX.read(data, { type: 'array', cellDates: true });
            const firstSheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[firstSheetName];

            const rawJson = XLSX.utils.sheet_to_json(worksheet) as any[];

            if (rawJson.length > 0) {
                const headers = Object.keys(rawJson[0]);
                setRawHeaders(headers);
                setRawRows(rawJson);

                // Auto-detect columns (De-Para inteligente)
                const guessMapping = {
                    cod_colab: findKeyIgnoreCase(headers, ['cod', 'cod_colab', 'codigo', 'código', 'cod colab', 'cód', 'cód.', 'id', 'colaborador_id']) || '',
                    tarifa: findKeyIgnoreCase(headers, ['tarifa', 'tarifa hora', 'tarifa_hora', 'valor', 'rate', 'precio', 'tarifa (h)', 'custo', 'valor hora', 'preço']) || '',
                    nome: findKeyIgnoreCase(headers, ['trabalhador', 'nome', 'nombre', 'colaborador', 'funcionario', 'nome completo', 'nome trabalhador']) || ''
                };

                setColMapping(guessMapping);
                setStep('MAPPING');
            }
        } catch (error) {
            console.error('Error parsing Excel file for tariffs:', error);
        } finally {
            setIsParsing(false);
        }
    };

    const generatePreview = () => {
        const rows: ParsedTarifaRow[] = [];

        for (const row of rawRows) {
            const rawCod = colMapping.cod_colab ? String(row[colMapping.cod_colab] || '').trim() : '';
            const rawNome = colMapping.nome ? String(row[colMapping.nome] || '').trim() : '';

            // Clean tariff amount
            const rawTarifaStr = colMapping.tarifa ? String(row[colMapping.tarifa] || '0') : '0';
            const rawTarifa = parseFloat(rawTarifaStr.replace(/[^\d.,-]/g, '').replace(',', '.'));

            if (!rawCod && !rawNome) continue;

            const matchResult = findMatchingWorker(workers, rawCod, rawNome);

            let status: ParsedTarifaRow['status'] = 'not_found';
            let errorMessage = '';

            if (!matchResult) {
                status = 'not_found';
                errorMessage = 'Trabalhador não localizado no cadastro';
            } else if (isNaN(rawTarifa) || rawTarifa <= 0) {
                status = 'invalid_tariff';
                errorMessage = 'Tarifa inválida ou menor/igual a zero';
            } else {
                status = 'ok';
            }

            rows.push({
                cod_colab: rawCod || matchResult?.worker.cod_colab || '-',
                nome_planilha: rawNome,
                tarifa: isNaN(rawTarifa) ? 0 : rawTarifa,
                workerId: matchResult?.worker.id,
                nomeBanco: matchResult?.worker.nome,
                contratanteBanco: matchResult?.worker.contratante || undefined,
                matchMethod: matchResult?.matchMethod,
                status,
                errorMessage,
                originalRowData: row
            });
        }

        setParsedRows(rows);
        setStep('PREVIEW');
    };

    const handleImport = async () => {
        if (!parsedRows.length) return;

        const validPayloads: UpdateTarifaPayload[] = parsedRows
            .filter(r => r.status === 'ok' && r.workerId)
            .map(r => ({
                workerId: r.workerId!,
                tarifa: r.tarifa
            }));

        if (validPayloads.length === 0) return;

        try {
            await importTarifas(validPayloads);
            setIsOpen(false);
            resetState();
        } catch (err) {
            console.error(err);
        }
    };

    const readyCount = parsedRows.filter(r => r.status === 'ok').length;
    const notFoundCount = parsedRows.filter(r => r.status === 'not_found').length;
    const invalidTariffCount = parsedRows.filter(r => r.status === 'invalid_tariff').length;

    const filteredPreviewRows = parsedRows.filter(r => {
        if (previewFilter !== 'all' && r.status !== previewFilter) return false;
        if (!previewSearch) return true;
        const q = previewSearch.toLowerCase();
        return (
            r.cod_colab.toLowerCase().includes(q) ||
            r.nome_planilha.toLowerCase().includes(q) ||
            (r.nomeBanco && r.nomeBanco.toLowerCase().includes(q))
        );
    });

    const isMappingValid = Boolean(colMapping.cod_colab || colMapping.nome) && Boolean(colMapping.tarifa);

    return (
        <Dialog open={isOpen} onOpenChange={(open) => {
            setIsOpen(open);
            if (!open) resetState();
        }}>
            <DialogTrigger asChild>
                {trigger}
            </DialogTrigger>
            <DialogContent className="sm:max-w-[760px] p-0 overflow-hidden flex flex-col max-h-[90vh]">
                {/* Header */}
                <div className="p-5 pb-3 border-b bg-slate-50/50 dark:bg-slate-900/50">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-indigo-700 dark:text-indigo-400">
                            <Coins className="w-5 h-5 text-indigo-600" />
                            Importar / Atualizar Tarifas (Excel)
                        </DialogTitle>
                        <DialogDescription className="text-xs">
                            {step === 'UPLOAD' && 'Carregue a planilha contendo os códigos dos trabalhadores e suas tarifas hora.'}
                            {step === 'MAPPING' && 'Associe as colunas do seu arquivo aos campos do sistema (De-Para).'}
                            {step === 'PREVIEW' && 'Revise a correspondência de trabalhadores e valores antes de confirmar a atualização.'}
                        </DialogDescription>
                    </DialogHeader>

                    {/* Step indicator */}
                    <div className="flex items-center gap-2 pt-3">
                        <div className={`flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full border ${
                            step === 'UPLOAD' 
                                ? 'bg-indigo-50 border-indigo-200 text-indigo-700 dark:bg-indigo-950 dark:border-indigo-800 dark:text-indigo-300' 
                                : 'bg-slate-100 text-slate-500 border-slate-200'
                        }`}>
                            <span>1. Upload</span>
                        </div>
                        <span className="text-slate-300">→</span>
                        <div className={`flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full border ${
                            step === 'MAPPING' 
                                ? 'bg-indigo-50 border-indigo-200 text-indigo-700 dark:bg-indigo-950 dark:border-indigo-800 dark:text-indigo-300' 
                                : 'bg-slate-100 text-slate-500 border-slate-200'
                        }`}>
                            <span>2. De-Para (Colunas)</span>
                        </div>
                        <span className="text-slate-300">→</span>
                        <div className={`flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full border ${
                            step === 'PREVIEW' 
                                ? 'bg-indigo-50 border-indigo-200 text-indigo-700 dark:bg-indigo-950 dark:border-indigo-800 dark:text-indigo-300' 
                                : 'bg-slate-100 text-slate-500 border-slate-200'
                        }`}>
                            <span>3. Validação ({readyCount})</span>
                        </div>
                    </div>
                </div>

                {/* Body Content */}
                <div className="p-5 overflow-y-auto flex-1 space-y-4">
                    {/* STEP 1: UPLOAD */}
                    {step === 'UPLOAD' && (
                        <div className="space-y-4 py-3">
                            <div className="border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-xl p-8 text-center hover:border-indigo-300 transition-colors bg-slate-50/50 dark:bg-slate-900/30">
                                <DownloadCloud className="w-10 h-10 text-indigo-500 mx-auto mb-3 opacity-80" />
                                <h3 className="font-semibold text-slate-800 dark:text-slate-200 text-sm mb-1">
                                    Selecione o arquivo Excel ou CSV
                                </h3>
                                <p className="text-xs text-muted-foreground mb-4 max-w-md mx-auto">
                                    Você pode importar planilhas de tarifas para atualizar o valor da hora de qualquer trabalhador quantas vezes precisar.
                                </p>
                                <Input
                                    id="tariff-excel-file"
                                    type="file"
                                    accept=".xlsx, .xls, .csv"
                                    onChange={handleFileChange}
                                    disabled={isParsing || isLoadingWorkers}
                                    className="max-w-xs mx-auto text-xs h-9 cursor-pointer"
                                />
                            </div>

                            {isLoadingWorkers && (
                                <div className="text-[11px] text-muted-foreground flex items-center justify-center gap-1.5 font-mono">
                                    <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-500" />
                                    Carregando base geral de trabalhadores...
                                </div>
                            )}
                        </div>
                    )}

                    {/* STEP 2: MAPPING (DE-PARA) */}
                    {step === 'MAPPING' && (
                        <div className="space-y-4">
                            <div className="bg-indigo-50/60 dark:bg-indigo-950/40 p-3 rounded-lg border border-indigo-100 dark:border-indigo-900/60 text-xs text-indigo-900 dark:text-indigo-300 space-y-1">
                                <p className="font-semibold">Mapeie quais colunas da sua planilha correspondem aos dados de tarifa.</p>
                                <p className="text-[11px] text-muted-foreground">
                                    Identificamos <strong>{rawRows.length} linhas</strong> e <strong>{rawHeaders.length} colunas</strong> na planilha.
                                </p>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {/* Campo: Código do Trabalhador (Obrigatório) */}
                                <div className="space-y-1.5 bg-white dark:bg-slate-900 p-3 rounded-lg border">
                                    <div className="flex items-center justify-between">
                                        <Label className="text-xs font-bold text-slate-800 dark:text-slate-200">
                                            Código do Trabalhador
                                        </Label>
                                        <Badge className="bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300 text-[9px] py-0 px-1">
                                            Obrigatório / Principal
                                        </Badge>
                                    </div>
                                    <p className="text-[11px] text-muted-foreground">
                                        Coluna com o código (ex: E0089, 89, E1481).
                                    </p>
                                    <Select 
                                        value={colMapping.cod_colab} 
                                        onValueChange={(val) => setColMapping(prev => ({ ...prev, cod_colab: val }))}
                                    >
                                        <SelectTrigger className="h-9 text-xs">
                                            <SelectValue placeholder="Selecione a coluna..." />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {rawHeaders.map(h => (
                                                <SelectItem key={h} value={h} className="text-xs">
                                                    {h}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                {/* Campo: Tarifa por Hora (€) (Obrigatório) */}
                                <div className="space-y-1.5 bg-white dark:bg-slate-900 p-3 rounded-lg border">
                                    <div className="flex items-center justify-between">
                                        <Label className="text-xs font-bold text-slate-800 dark:text-slate-200">
                                            Tarifa por Hora (€)
                                        </Label>
                                        <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 text-[9px] py-0 px-1">
                                            Obrigatório
                                        </Badge>
                                    </div>
                                    <p className="text-[11px] text-muted-foreground">
                                        Coluna com o valor numérico da hora (ex: 15, 16.50, 18).
                                    </p>
                                    <Select 
                                        value={colMapping.tarifa} 
                                        onValueChange={(val) => setColMapping(prev => ({ ...prev, tarifa: val }))}
                                    >
                                        <SelectTrigger className="h-9 text-xs">
                                            <SelectValue placeholder="Selecione a coluna..." />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {rawHeaders.map(h => (
                                                <SelectItem key={h} value={h} className="text-xs">
                                                    {h}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                {/* Campo: Nome do Trabalhador (Opcional / Auxiliar) */}
                                <div className="space-y-1.5 bg-white dark:bg-slate-900 p-3 rounded-lg border md:col-span-2">
                                    <div className="flex items-center justify-between">
                                        <Label className="text-xs font-bold text-slate-800 dark:text-slate-200">
                                            Nome do Trabalhador
                                        </Label>
                                        <Badge variant="outline" className="text-[9px] text-muted-foreground py-0 px-1">
                                            Opcional / Fallback
                                        </Badge>
                                    </div>
                                    <p className="text-[11px] text-muted-foreground">
                                        Ajuda a identificar o trabalhador por nome caso o código não seja exato.
                                    </p>
                                    <Select 
                                        value={colMapping.nome || 'NONE'} 
                                        onValueChange={(val) => setColMapping(prev => ({ ...prev, nome: val === 'NONE' ? '' : val }))}
                                    >
                                        <SelectTrigger className="h-9 text-xs">
                                            <SelectValue placeholder="Nenhum (usar apenas código)" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="NONE" className="text-xs text-muted-foreground">
                                                (Nenhum / Usar apenas código)
                                            </SelectItem>
                                            {rawHeaders.map(h => (
                                                <SelectItem key={h} value={h} className="text-xs">
                                                    {h}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* STEP 3: PREVIEW & VALIDATION */}
                    {step === 'PREVIEW' && (
                        <div className="space-y-3">
                            {/* Summary Metrics Cards */}
                            <div className="grid grid-cols-3 gap-2">
                                <div 
                                    onClick={() => setPreviewFilter('ok')}
                                    className={`p-2.5 rounded-lg border text-center cursor-pointer transition-all ${
                                        previewFilter === 'ok' 
                                            ? 'ring-2 ring-emerald-500 bg-emerald-50/70 border-emerald-300 dark:bg-emerald-950/50' 
                                            : 'bg-slate-50 dark:bg-slate-900 border-slate-200 hover:bg-slate-100'
                                    }`}
                                >
                                    <div className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 flex items-center justify-center gap-1">
                                        <CheckCircle2 className="w-3.5 h-3.5" /> Prontos
                                    </div>
                                    <div className="text-lg font-bold text-emerald-800 dark:text-emerald-300">
                                        {readyCount}
                                    </div>
                                </div>

                                <div 
                                    onClick={() => setPreviewFilter('not_found')}
                                    className={`p-2.5 rounded-lg border text-center cursor-pointer transition-all ${
                                        previewFilter === 'not_found' 
                                            ? 'ring-2 ring-rose-500 bg-rose-50/70 border-rose-300 dark:bg-rose-950/50' 
                                            : 'bg-slate-50 dark:bg-slate-900 border-slate-200 hover:bg-slate-100'
                                    }`}
                                >
                                    <div className="text-xs font-semibold text-rose-700 dark:text-rose-400 flex items-center justify-center gap-1">
                                        <XCircle className="w-3.5 h-3.5" /> Não Encontrados
                                    </div>
                                    <div className="text-lg font-bold text-rose-800 dark:text-rose-300">
                                        {notFoundCount}
                                    </div>
                                </div>

                                <div 
                                    onClick={() => setPreviewFilter('invalid_tariff')}
                                    className={`p-2.5 rounded-lg border text-center cursor-pointer transition-all ${
                                        previewFilter === 'invalid_tariff' 
                                            ? 'ring-2 ring-amber-500 bg-amber-50/70 border-amber-300 dark:bg-amber-950/50' 
                                            : 'bg-slate-50 dark:bg-slate-900 border-slate-200 hover:bg-slate-100'
                                    }`}
                                >
                                    <div className="text-xs font-semibold text-amber-700 dark:text-amber-400 flex items-center justify-center gap-1">
                                        <AlertCircle className="w-3.5 h-3.5" /> Tarifas Inválidas
                                    </div>
                                    <div className="text-lg font-bold text-amber-800 dark:text-amber-300">
                                        {invalidTariffCount}
                                    </div>
                                </div>
                            </div>

                            {/* Filter and Search Bar */}
                            <div className="flex items-center justify-between gap-2">
                                <div className="relative flex-1">
                                    <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                                    <Input
                                        placeholder="Buscar por nome ou código..."
                                        value={previewSearch}
                                        onChange={(e) => setPreviewSearch(e.target.value)}
                                        className="pl-8 h-8 text-xs bg-white dark:bg-slate-900"
                                    />
                                </div>
                                {previewFilter !== 'all' && (
                                    <Button 
                                        variant="ghost" 
                                        size="sm" 
                                        onClick={() => setPreviewFilter('all')} 
                                        className="h-8 text-xs text-muted-foreground"
                                    >
                                        Limpar Filtro ({parsedRows.length})
                                    </Button>
                                )}
                            </div>

                            {/* Table of Parsed Rows */}
                            <ScrollArea className="h-[280px] rounded-lg border bg-white dark:bg-slate-950">
                                <table className="w-full text-xs">
                                    <thead className="bg-slate-100 dark:bg-slate-900 sticky top-0 font-semibold text-slate-700 dark:text-slate-300 border-b">
                                        <tr>
                                            <th className="p-2.5 text-left">Cód. Planilha</th>
                                            <th className="p-2.5 text-left">Nome na Planilha</th>
                                            <th className="p-2.5 text-left">Trabalhador no Sistema</th>
                                            <th className="p-2.5 text-right">Tarifa (€/h)</th>
                                            <th className="p-2.5 text-center">Status</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y">
                                        {filteredPreviewRows.length === 0 ? (
                                            <tr>
                                                <td colSpan={5} className="p-6 text-center text-muted-foreground">
                                                    Nenhum registro correspondente ao filtro.
                                                </td>
                                            </tr>
                                        ) : (
                                            filteredPreviewRows.map((row, idx) => (
                                                <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-900/50">
                                                    <td className="p-2.5 font-mono font-bold text-slate-800 dark:text-slate-200">
                                                        {row.cod_colab}
                                                    </td>
                                                    <td className="p-2.5 text-slate-600 dark:text-slate-400">
                                                        {row.nome_planilha || '-'}
                                                    </td>
                                                    <td className="p-2.5">
                                                        {row.status === 'ok' ? (
                                                            <div>
                                                                <div className="font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                                                                    <UserCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                                                                    <span>{row.nomeBanco}</span>
                                                                </div>
                                                                {row.contratanteBanco && (
                                                                    <span className="text-[10px] text-muted-foreground font-mono">
                                                                        Empresa: {row.contratanteBanco}
                                                                    </span>
                                                                )}
                                                            </div>
                                                        ) : (
                                                            <span className="text-red-500 italic text-[11px] flex items-center gap-1">
                                                                <AlertCircle className="w-3.5 h-3.5 text-red-500 shrink-0" />
                                                                {row.errorMessage || 'Não encontrado'}
                                                            </span>
                                                        )}
                                                    </td>
                                                    <td className="p-2.5 text-right font-mono font-bold text-emerald-600 dark:text-emerald-400">
                                                        € {row.tarifa.toFixed(2)}
                                                    </td>
                                                    <td className="p-2.5 text-center">
                                                        {row.status === 'ok' && (
                                                            <Badge variant="outline" className="border-emerald-500 text-emerald-700 bg-emerald-50 text-[10px] py-0">
                                                                Pronto
                                                            </Badge>
                                                        )}
                                                        {row.status === 'not_found' && (
                                                            <Badge variant="destructive" className="text-[10px] py-0">
                                                                Não Encontrado
                                                            </Badge>
                                                        )}
                                                        {row.status === 'invalid_tariff' && (
                                                            <Badge variant="outline" className="border-amber-500 text-amber-700 bg-amber-50 text-[10px] py-0">
                                                                Tarifa Inválida
                                                            </Badge>
                                                        )}
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </ScrollArea>
                        </div>
                    )}
                </div>

                {/* Footer Controls */}
                <div className="p-4 border-t bg-slate-50/50 dark:bg-slate-900/50 flex items-center justify-between">
                    <div>
                        {step === 'MAPPING' && (
                            <Button 
                                variant="outline" 
                                size="sm" 
                                onClick={() => setStep('UPLOAD')} 
                                className="h-9 text-xs gap-1.5"
                            >
                                <ArrowLeft className="w-3.5 h-3.5" /> Voltar ao Arquivo
                            </Button>
                        )}
                        {step === 'PREVIEW' && (
                            <Button 
                                variant="outline" 
                                size="sm" 
                                onClick={() => setStep('MAPPING')} 
                                className="h-9 text-xs gap-1.5"
                            >
                                <ArrowLeft className="w-3.5 h-3.5" /> Voltar ao Mapeamento
                            </Button>
                        )}
                    </div>

                    <div className="flex items-center gap-2">
                        <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={() => setIsOpen(false)} 
                            disabled={isImporting} 
                            className="h-9 text-xs"
                        >
                            Cancelar
                        </Button>

                        {step === 'MAPPING' && (
                            <Button
                                size="sm"
                                onClick={generatePreview}
                                disabled={!isMappingValid}
                                className="bg-indigo-600 hover:bg-indigo-700 text-xs font-semibold h-9 gap-1.5"
                            >
                                Validar e Avançar <ArrowRight className="w-3.5 h-3.5" />
                            </Button>
                        )}

                        {step === 'PREVIEW' && (
                            <Button
                                size="sm"
                                onClick={handleImport}
                                disabled={readyCount === 0 || isImporting}
                                className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold h-9 gap-1.5"
                            >
                                {isImporting ? (
                                    <>
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                        Atualizando {readyCount} Tarifas...
                                    </>
                                ) : (
                                    <>
                                        <RefreshCw className="h-3.5 w-3.5" />
                                        Confirmar e Atualizar ({readyCount} Tarifas)
                                    </>
                                )}
                            </Button>
                        )}
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
