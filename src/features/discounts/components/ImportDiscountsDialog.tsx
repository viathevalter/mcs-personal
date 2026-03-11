import { useState } from 'react';
import * as XLSX from 'xlsx';
import { DownloadCloud, Loader2, AlertCircle, ArrowRight, ArrowLeft } from 'lucide-react';
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
import { useImportDiscounts } from '../hooks/useImportDiscounts';
import type { CreateWorkerDiscountInput } from '../types';
import { isValid } from 'date-fns';

interface ImportDiscountsDialogProps {
    trigger: React.ReactNode;
}

interface ParsedRow {
    cod_colab: string;
    nome_planilha: string;
    categoria: string;
    valor: number;
    data: string;
    descricao?: string;

    workerId?: string;
    empresaId?: string;
    nomeBanco?: string;
    status: 'ok' | 'not_found' | 'invalid_data';
    errorMessage?: string;
    originalRowData: any; // Keep original row for re-parsing
}

type ImportStep = 'UPLOAD' | 'MAPPING' | 'PREVIEW';

import { useEmpresa } from '@/app/providers/EmpresaProvider';
import { useDiscountCategories } from '@/features/settings/hooks/useCategories';

export function ImportDiscountsDialog({ trigger }: ImportDiscountsDialogProps) {
    const { selectedEmpresaId } = useEmpresa();
    const { data: discountCategoriesData } = useDiscountCategories(selectedEmpresaId || undefined);
    const validCategories = discountCategoriesData?.map(c => c.name) || [];

    // Fetch all workers directly to avoid 'selectedEmpresaId' restrictions
    const { data: workersData } = useQuery({
        queryKey: ['all-workers-for-import-discounts'],
        queryFn: async () => {
            const allWorkers: any[] = [];
            let from = 0;
            const pageSize = 1000;
            let hasMore = true;

            while (hasMore) {
                const { data, error } = await supabase
                    .schema('core_personal')
                    .from('workers')
                    .select('id, cod_colab, empresa_id, nome')
                    .range(from, from + pageSize - 1);

                if (error) throw error;

                if (data && data.length > 0) {
                    allWorkers.push(...data);
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
        }
    });

    const workers = workersData || [];

    const [isOpen, setIsOpen] = useState(false);
    const [step, setStep] = useState<ImportStep>('UPLOAD');
    const [isParsing, setIsParsing] = useState(false);

    // File state
    const [rawHeaders, setRawHeaders] = useState<string[]>([]);
    const [rawRows, setRawRows] = useState<any[]>([]);

    // Mapping state
    const [colMapping, setColMapping] = useState({
        cod_colab: '',
        valor: '',
        nome: '',
        categoria: '',
        data: '',
        descricao: ''
    });

    // Defaults for mapping ("De->Para")
    const [defaultCategory, setDefaultCategory] = useState<string | 'NONE'>('NONE');
    const [defaultDate, setDefaultDate] = useState<string>('');

    // Preview State
    const [parsedRows, setParsedRows] = useState<ParsedRow[]>([]);

    const { mutateAsync: importDiscounts, isPending: isImporting } = useImportDiscounts();

    const resetState = () => {
        setStep('UPLOAD');
        setRawHeaders([]);
        setRawRows([]);
        setParsedRows([]);
        setColMapping({ cod_colab: '', valor: '', nome: '', categoria: '', data: '', descricao: '' });
        setDefaultCategory('NONE');
        setDefaultDate('');
        setIsParsing(false);
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

                // Try to auto-guess some mappings
                const guessMapping = {
                    cod_colab: findKeyIgnoreCase(headers, ['cod colab', 'cód trabalhador', 'codigo', 'cod', 'cod_colab']) || '',
                    valor: findKeyIgnoreCase(headers, ['valor', 'montante', 'quantidade', 'amount']) || '',
                    nome: findKeyIgnoreCase(headers, ['trabalhador', 'nome', 'colaborador']) || '',
                    categoria: findKeyIgnoreCase(headers, ['categoria', 'tipo', 'category']) || '',
                    data: findKeyIgnoreCase(headers, ['data', 'data referencia', 'mes', 'mês', 'date']) || '',
                    descricao: findKeyIgnoreCase(headers, ['descrição', 'descricao', 'notas', 'description']) || ''
                };
                setColMapping(guessMapping);
                setStep('MAPPING');
            }
        } catch (error) {
            console.error('Error reading Excel file:', error);
        } finally {
            setIsParsing(false);
        }
    };

    const findKeyIgnoreCase = (headers: string[], searchKeys: string[]): string | undefined => {
        for (const search of searchKeys) {
            const match = headers.find(h => h.trim().toLowerCase() === search.toLowerCase());
            if (match) return match;
        }
        return undefined;
    };

    const parseExcelDate = (excelDate: any): string | null => {
        if (!excelDate) return null;

        if (excelDate instanceof Date) {
            if (isValid(excelDate)) return excelDate.toISOString().split('T')[0];
            return null;
        }

        if (typeof excelDate === 'number') {
            const date = new Date((excelDate - 25569) * 86400 * 1000);
            const utcDate = new Date(date.getTime() + date.getTimezoneOffset() * 60000);
            if (isValid(utcDate)) {
                return utcDate.toISOString().split('T')[0];
            }
            return null;
        }

        if (typeof excelDate === 'string') {
            const str = excelDate.trim();
            if (/^\d{4}-\d{2}-\d{2}$/.test(str)) return str;
            if (/^\d{2}\/\d{2}\/\d{4}$/.test(str)) {
                const [d, m, y] = str.split('/');
                return `${y}-${m}-${d}`;
            }
        }

        return null;
    };

    const generatePreview = () => {
        const rows: ParsedRow[] = [];

        for (const row of rawRows) {
            // Use mapped column names to extract data
            const rawCod = colMapping.cod_colab ? String(row[colMapping.cod_colab] || '').trim().toUpperCase() : '';
            const rawValor = colMapping.valor ? parseFloat(String(row[colMapping.valor] || '0').replace(',', '.')) : 0;
            const rawNome = colMapping.nome ? String(row[colMapping.nome] || '') : '';
            const rawDesc = colMapping.descricao ? String(row[colMapping.descricao] || '').trim() : '';

            let rawCategoria = colMapping.categoria ? String(row[colMapping.categoria] || '').trim() : '';
            if (!rawCategoria && defaultCategory !== 'NONE') {
                rawCategoria = defaultCategory;
            }

            const rawData = colMapping.data ? row[colMapping.data] : null;
            let parsedDate = parseExcelDate(rawData);
            if (!parsedDate && defaultDate) {
                parsedDate = defaultDate;
            }

            if (!rawCod) continue; // Skip empty rows

            const matchedWorker = workers?.find(w => String(w.cod_colab || '').trim().toUpperCase() === rawCod);

            let status: ParsedRow['status'] = 'not_found';
            let errorMessage = '';

            if (!matchedWorker) {
                errorMessage = `Trabalhador não encontrado (${rawCod}).`;
            } else if (isNaN(rawValor) || rawValor <= 0) {
                status = 'invalid_data';
                errorMessage = 'Valor inválido.';
            } else if (!validCategories.includes(rawCategoria)) {
                status = 'invalid_data';
                errorMessage = `Categoria inválida. Preencha na planilha ou defina o padrão.`;
            } else if (!parsedDate) {
                status = 'invalid_data';
                errorMessage = 'Data inválida. Preencha na planilha ou defina o padrão.';
            } else {
                status = 'ok';
            }

            rows.push({
                cod_colab: rawCod,
                nome_planilha: rawNome,
                categoria: rawCategoria,
                valor: isNaN(rawValor) ? 0 : rawValor,
                data: parsedDate || String(rawData || ''),
                descricao: rawDesc,

                workerId: matchedWorker?.id,
                empresaId: matchedWorker?.empresa_id,
                nomeBanco: matchedWorker?.nome,
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

        const validRows = parsedRows.filter(r => r.status === 'ok' && r.workerId && r.empresaId);

        const batchId = crypto.randomUUID();

        const payloads: CreateWorkerDiscountInput[] = validRows.map(r => ({
            worker_id: r.workerId!,
            empresa_id: r.empresaId!,
            category: r.categoria as any,
            amount: Number(r.valor.toFixed(2)),
            reference_date: r.data,
            description: r.descricao || null,
            is_recurring: false,
            import_batch_id: batchId,
            status: 'Ativo'
        }));

        if (payloads.length === 0) return;

        try {
            await importDiscounts(payloads);
            setIsOpen(false);
            resetState();
        } catch (error) {
            // Error mapped in hook sonner toast
        }
    };

    const validCount = parsedRows.filter(r => r.status === 'ok').length;
    const errorCount = parsedRows.filter(r => r.status !== 'ok').length;

    const isMappingValid = colMapping.cod_colab !== '' && colMapping.valor !== '';

    return (
        <Dialog open={isOpen} onOpenChange={(open) => {
            setIsOpen(open);
            if (!open) resetState();
        }}>
            <DialogTrigger asChild>
                {trigger}
            </DialogTrigger>
            <DialogContent className="sm:max-w-[800px] overflow-hidden flex flex-col max-h-[90vh]">
                <DialogHeader>
                    <DialogTitle>Importar Descontos em Massa</DialogTitle>
                    <DialogDescription>
                        {step === 'UPLOAD' && 'Faça o upload de uma planilha (Excel ou CSV) contendo os descontos.'}
                        {step === 'MAPPING' && 'Associe as colunas do seu arquivo aos campos do sistema.'}
                        {step === 'PREVIEW' && 'Revise os dados antes de confirmar a importação.'}
                    </DialogDescription>
                </DialogHeader>

                <div className="flex-1 overflow-y-auto py-4">
                    {/* STEP 1: UPLOAD */}
                    {step === 'UPLOAD' && (
                        <div className="grid w-full items-center gap-1.5 p-4 border-2 border-dashed rounded-lg bg-muted/20 text-center">
                            {isParsing ? (
                                <div className="flex flex-col items-center justify-center p-8">
                                    <Loader2 className="h-8 w-8 animate-spin text-indigo-600 mb-4" />
                                    <span className="text-sm font-medium">Lendo arquivo...</span>
                                </div>
                            ) : (
                                <div className="p-8">
                                    <Label htmlFor="excel_file_descontos" className="cursor-pointer">
                                        <div className="flex flex-col items-center gap-2">
                                            <div className="h-12 w-12 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600">
                                                <DownloadCloud className="h-6 w-6" />
                                            </div>
                                            <span className="text-base font-semibold">Clique para escolher o arquivo</span>
                                            <span className="text-sm text-muted-foreground">XLSX, XLS ou CSV</span>
                                        </div>
                                    </Label>
                                    <Input
                                        id="excel_file_descontos"
                                        type="file"
                                        accept=".xlsx, .xls, .csv"
                                        onChange={handleFileChange}
                                        disabled={isParsing}
                                        className="hidden"
                                        value={''}
                                    />
                                </div>
                            )}
                        </div>
                    )}

                    {/* STEP 2: MAPPING */}
                    {step === 'MAPPING' && (
                        <div className="space-y-6">
                            <div className="bg-amber-50 border border-amber-200 text-amber-800 text-sm p-4 rounded-md">
                                Mapeie quais colunas da sua planilha correspondem aos dados necessários.
                                <strong> Código do Trabalhador e Valor são obrigatórios.</strong>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
                                <div className="space-y-1.5">
                                    <Label className="text-xs font-bold text-red-600">Código do Trab. (Obrigatório)</Label>
                                    <Select value={colMapping.cod_colab} onValueChange={(v) => setColMapping({ ...colMapping, cod_colab: v })}>
                                        <SelectTrigger><SelectValue placeholder="Selecione a coluna..." /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value=" ">-- Ignorar --</SelectItem>
                                            {rawHeaders.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="space-y-1.5">
                                    <Label className="text-xs font-bold text-red-600">Valor (Obrigatório)</Label>
                                    <Select value={colMapping.valor} onValueChange={(v) => setColMapping({ ...colMapping, valor: v })}>
                                        <SelectTrigger><SelectValue placeholder="Selecione a coluna..." /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value=" ">-- Ignorar --</SelectItem>
                                            {rawHeaders.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="space-y-1.5">
                                    <Label className="text-xs">Nome do Trabalhador</Label>
                                    <Select value={colMapping.nome} onValueChange={(v) => setColMapping({ ...colMapping, nome: v })}>
                                        <SelectTrigger><SelectValue placeholder="Selecione a coluna..." /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value=" ">-- Ignorar --</SelectItem>
                                            {rawHeaders.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="space-y-1.5">
                                    <Label className="text-xs">Descrição / Notas</Label>
                                    <Select value={colMapping.descricao} onValueChange={(v) => setColMapping({ ...colMapping, descricao: v })}>
                                        <SelectTrigger><SelectValue placeholder="Selecione a coluna..." /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value=" ">-- Ignorar --</SelectItem>
                                            {rawHeaders.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            <hr />

                            <h4 className="font-semibold text-sm">Categoria e Data</h4>
                            <p className="text-xs text-muted-foreground mb-4">Escolha a coluna da planilha OU defina um valor fixo para todos os registros.</p>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
                                <div className="p-4 bg-muted/30 rounded-lg border space-y-4">
                                    <div className="space-y-1.5">
                                        <Label className="text-xs">Coluna de Categoria</Label>
                                        <Select value={colMapping.categoria} onValueChange={(v) => setColMapping({ ...colMapping, categoria: v })}>
                                            <SelectTrigger className="bg-white"><SelectValue placeholder="Selecione a coluna..." /></SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value=" ">-- Não tenho essa coluna --</SelectItem>
                                                {rawHeaders.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label className="text-xs text-indigo-700 font-medium">Ou Valor Fixo para Categoria:</Label>
                                        <Select value={defaultCategory} onValueChange={(v: string | 'NONE') => setDefaultCategory(v)} disabled={!!colMapping.categoria && colMapping.categoria !== ' '}>
                                            <SelectTrigger className="bg-white"><SelectValue placeholder="Selecione..." /></SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="NONE">-- Não usar fixo --</SelectItem>
                                                {validCategories.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>

                                <div className="p-4 bg-muted/30 rounded-lg border space-y-4">
                                    <div className="space-y-1.5">
                                        <Label className="text-xs">Coluna de Data</Label>
                                        <Select value={colMapping.data} onValueChange={(v) => setColMapping({ ...colMapping, data: v })}>
                                            <SelectTrigger className="bg-white"><SelectValue placeholder="Selecione a coluna..." /></SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value=" ">-- Não tenho essa coluna --</SelectItem>
                                                {rawHeaders.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label className="text-xs text-indigo-700 font-medium">Ou Valor Fixo para Data:</Label>
                                        <Input
                                            type="date"
                                            className="bg-white"
                                            value={defaultDate}
                                            onChange={(e) => setDefaultDate(e.target.value)}
                                            disabled={!!colMapping.data && colMapping.data !== ' '}
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* STEP 3: PREVIEW */}
                    {step === 'PREVIEW' && parsedRows.length > 0 && (
                        <div className="border rounded-md overflow-hidden flex flex-col">
                            <div className="bg-muted px-4 py-2 flex justify-between items-center text-sm">
                                <div>
                                    Total lido: <strong>{parsedRows.length}</strong> linhas.
                                    {errorCount > 0 && <span className="text-destructive font-medium ml-2">({errorCount} com erros)</span>}
                                </div>
                                <Badge variant="secondary" className={validCount > 0 ? "bg-indigo-100 text-indigo-700" : ""}>
                                    {validCount} Prontos para importar
                                </Badge>
                            </div>
                            <ScrollArea className="h-[350px] w-full">
                                <table className="w-full text-sm">
                                    <thead className="bg-slate-50 dark:bg-slate-900 sticky top-0 shadow-sm z-10">
                                        <tr>
                                            <th className="px-4 py-2 text-left font-medium w-16">Cód</th>
                                            <th className="px-4 py-2 text-left font-medium">Trabalhador</th>
                                            <th className="px-4 py-2 text-left font-medium">Categoria</th>
                                            <th className="px-4 py-2 text-left font-medium">Data</th>
                                            <th className="px-4 py-2 text-right font-medium">Valor</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y">
                                        {parsedRows.map((row, i) => (
                                            <tr key={i} className={`hover:bg-muted/50 ${row.status !== 'ok' ? 'bg-red-50/50' : ''}`}>
                                                <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
                                                    {row.cod_colab || '-'}
                                                </td>
                                                <td className="px-4 py-3">
                                                    <div className="flex flex-col">
                                                        <span className="font-medium text-gray-900">
                                                            {row.nomeBanco || row.nome_planilha || 'Desconhecido'}
                                                        </span>
                                                        {row.errorMessage && (
                                                            <span className="text-xs text-destructive flex items-center mt-1">
                                                                <AlertCircle className="w-3 h-3 mr-1" />
                                                                {row.errorMessage}
                                                            </span>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3 whitespace-nowrap">
                                                    <Badge variant="outline" className={row.status === 'invalid_data' && String(row.errorMessage).includes('Categoria') ? 'border-red-300 text-red-600' : ''}>
                                                        {row.categoria || '-'}
                                                    </Badge>
                                                </td>
                                                <td className={`px-4 py-3 whitespace-nowrap font-mono ${row.status === 'invalid_data' && String(row.errorMessage).includes('Data') ? 'text-red-500' : 'text-gray-500'}`}>
                                                    {row.data || '-'}
                                                </td>
                                                <td className="px-4 py-3 text-right font-mono font-medium whitespace-nowrap">
                                                    € {row.valor.toFixed(2)}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </ScrollArea>
                        </div>
                    )}
                </div>

                <DialogFooter className="mt-2 border-t pt-4">
                    {step === 'UPLOAD' && (
                        <Button variant="outline" onClick={() => setIsOpen(false)}>
                            Cancelar
                        </Button>
                    )}

                    {step === 'MAPPING' && (
                        <>
                            <Button variant="outline" onClick={() => resetState()}>
                                Cancelar
                            </Button>
                            <Button
                                onClick={generatePreview}
                                className="bg-indigo-600 hover:bg-indigo-700"
                                disabled={!isMappingValid}
                            >
                                Validar e Pré-visualizar
                                <ArrowRight className="ml-2 h-4 w-4" />
                            </Button>
                        </>
                    )}

                    {step === 'PREVIEW' && (
                        <>
                            <Button variant="outline" onClick={() => setStep('MAPPING')} disabled={isImporting}>
                                <ArrowLeft className="mr-2 h-4 w-4" />
                                Voltar ao Mapeamento
                            </Button>
                            <Button
                                onClick={handleImport}
                                disabled={isImporting || validCount === 0}
                                className="bg-indigo-600 hover:bg-indigo-700"
                            >
                                {isImporting ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Salvando...
                                    </>
                                ) : (
                                    <>
                                        <DownloadCloud className="mr-2 h-4 w-4" />
                                        Importar {validCount} Desconto(s)
                                    </>
                                )}
                            </Button>
                        </>
                    )}
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
