import { useState, useMemo } from 'react';
import * as XLSX from 'xlsx';
import { DownloadCloud, Loader2, AlertCircle, ArrowRight, ArrowLeft, Calendar, Tag } from 'lucide-react';
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
import { useEmpresa } from '@/app/providers/EmpresaProvider';
import { useDiscountCategories } from '@/features/settings/hooks/useCategories';
import {
    findMatchingWorker,
    getCompetenceOptions,
    getCurrentCompetence,
    parseExcelDateToISO,
    SimpleWorker
} from '@/shared/utils/importUtils';

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
    matchMethod?: string;
    status: 'ok' | 'not_found' | 'invalid_data';
    errorMessage?: string;
    originalRowData: any;
}

type ImportStep = 'UPLOAD' | 'MAPPING' | 'PREVIEW';

const DEFAULT_DISCOUNT_CATEGORIES = [
    'Aluguel de Carro',
    'Alojamento / Moradia',
    'Desconto de Coach',
    'Adiantamento / Vale',
    'Empréstimo',
    'Multas / Danos',
    'Equipamentos / EPIs',
    'Outros Descontos'
];

export function ImportDiscountsDialog({ trigger }: ImportDiscountsDialogProps) {
    const { selectedEmpresaId } = useEmpresa();
    const { data: discountCategoriesData } = useDiscountCategories(selectedEmpresaId || undefined);

    const competenceOptions = useMemo(() => getCompetenceOptions(), []);
    const currentCompetence = useMemo(() => getCurrentCompetence(), []);

    const categoryList = useMemo(() => {
        if (discountCategoriesData && discountCategoriesData.length > 0) {
            const customNames = discountCategoriesData.map(c => c.name);
            return Array.from(new Set([...DEFAULT_DISCOUNT_CATEGORIES, ...customNames]));
        }
        return DEFAULT_DISCOUNT_CATEGORIES;
    }, [discountCategoriesData]);

    // Fetch all workers without invalid columns to avoid Postgres errors
    const { data: workersData, isLoading: isLoadingWorkers } = useQuery<SimpleWorker[]>({
        queryKey: ['all-workers-for-import-discounts'],
        queryFn: async () => {
            const allWorkers: SimpleWorker[] = [];
            let from = 0;
            const pageSize = 1000;
            let hasMore = true;

            while (hasMore) {
                const { data, error } = await supabase
                    .schema('core_personal')
                    .from('workers')
                    .select('id, cod_colab, nome, contratante')
                    .range(from, from + pageSize - 1);

                if (error) {
                    console.error('Error fetching workers for discount import:', error);
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
        }
    });

    const workers = workersData || [];

    const [isOpen, setIsOpen] = useState(false);
    const [step, setStep] = useState<ImportStep>('UPLOAD');
    const [isParsing, setIsParsing] = useState(false);

    // File state
    const [rawHeaders, setRawHeaders] = useState<string[]>([]);
    const [rawRows, setRawRows] = useState<any[]>([]);

    // Combobox Selection States (Competência e Categoria)
    const [selectedCompetence, setSelectedCompetence] = useState<string>(currentCompetence);
    const [selectedCategory, setSelectedCategory] = useState<string>('Aluguel de Carro');

    // Column Mapping state
    const [colMapping, setColMapping] = useState({
        cod_colab: '',
        valor: '',
        nome: '',
        categoria: '',
        data: '',
        descricao: ''
    });

    // Preview State
    const [parsedRows, setParsedRows] = useState<ParsedRow[]>([]);

    const { mutateAsync: importDiscounts, isPending: isImporting } = useImportDiscounts();

    const resetState = () => {
        setStep('UPLOAD');
        setRawHeaders([]);
        setRawRows([]);
        setParsedRows([]);
        setColMapping({ cod_colab: '', valor: '', nome: '', categoria: '', data: '', descricao: '' });
        setSelectedCompetence(currentCompetence);
        setSelectedCategory('Aluguel de Carro');
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

                // Try to auto-guess column mappings
                const guessMapping = {
                    cod_colab: findKeyIgnoreCase(headers, ['id', 'id ', 'cod', 'cod ', 'cód', 'codigo', 'código', 'cod colab', 'cod_colab', 'cód trabalhador']) || '',
                    valor: findKeyIgnoreCase(headers, ['total a descontar', 'valor', 'montante', 'quantidade', 'amount', 'total', 'custo']) || '',
                    nome: findKeyIgnoreCase(headers, ['nombre del trabalhador', 'nombre', 'nome', 'trabalhador', 'colaborador', 'funcionario']) || '',
                    categoria: findKeyIgnoreCase(headers, ['categoria', 'tipo', 'category']) || '',
                    data: findKeyIgnoreCase(headers, ['data', 'data referencia', 'mes', 'mês', 'date']) || '',
                    descricao: findKeyIgnoreCase(headers, ['descrição', 'descricao', 'notas', 'description', 'observaciones', 'observações']) || ''
                };

                // If sheet has category column, guess category; otherwise default to selected category
                if (guessMapping.categoria) {
                    const sampleCat = String(rawJson[0][guessMapping.categoria] || '').trim();
                    if (sampleCat && categoryList.includes(sampleCat)) {
                        setSelectedCategory(sampleCat);
                    }
                }

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

    const generatePreview = () => {
        const rows: ParsedRow[] = [];

        for (const row of rawRows) {
            const rawCod = colMapping.cod_colab ? String(row[colMapping.cod_colab] || '').trim() : '';
            const rawNome = colMapping.nome ? String(row[colMapping.nome] || '').trim() : '';
            const rawDesc = colMapping.descricao ? String(row[colMapping.descricao] || '').trim() : '';

            // Clean amount parsing
            const rawValorStr = colMapping.valor ? String(row[colMapping.valor] || '0') : '0';
            const rawValor = parseFloat(rawValorStr.replace(/[^\d.,-]/g, '').replace(',', '.'));

            // Category resolution: Column value if mapped and non-empty, otherwise Selected Category Combobox
            let finalCategory = selectedCategory;
            if (colMapping.categoria && colMapping.categoria !== ' ') {
                const sheetCat = String(row[colMapping.categoria] || '').trim();
                if (sheetCat) finalCategory = sheetCat;
            }

            // Competence resolution: Column date if mapped and valid, otherwise Selected Competence Combobox
            let finalDate = selectedCompetence;
            if (colMapping.data && colMapping.data !== ' ') {
                const sheetDate = parseExcelDateToISO(row[colMapping.data]);
                if (sheetDate) finalDate = sheetDate;
            }

            // Skip empty rows and summary rows (e.g., TOTAL GENERAL)
            if (!rawCod && !rawNome) continue;
            const matchResult = findMatchingWorker(workers, rawCod, rawNome);

            if (!matchResult && (rawCod.toUpperCase().includes('TOTAL') || rawNome.toUpperCase().includes('TOTAL'))) {
                continue;
            }

            let status: ParsedRow['status'] = 'not_found';
            let errorMessage = '';

            if (!matchResult) {
                status = 'not_found';
                errorMessage = `Trabalhador não encontrado (${rawCod || rawNome}).`;
            } else if (isNaN(rawValor) || rawValor <= 0) {
                status = 'invalid_data';
                errorMessage = 'Valor zerado ou inválido.';
            } else {
                status = 'ok';
            }

            const matchedWorker = matchResult?.worker;
            const empresaId = matchedWorker?.empresa_id || selectedEmpresaId || '00000000-0000-0000-0000-000000000000';

            rows.push({
                cod_colab: matchedWorker?.cod_colab || rawCod || '-',
                nome_planilha: rawNome,
                categoria: finalCategory,
                valor: isNaN(rawValor) ? 0 : rawValor,
                data: finalDate,
                descricao: rawDesc,

                workerId: matchedWorker?.id,
                empresaId,
                nomeBanco: matchedWorker?.nome,
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

        const validRows = parsedRows.filter(r => r.status === 'ok' && r.workerId);
        const batchId = crypto.randomUUID();

        const payloads: CreateWorkerDiscountInput[] = validRows.map(r => ({
            worker_id: r.workerId!,
            empresa_id: r.empresaId || selectedEmpresaId || '00000000-0000-0000-0000-000000000000',
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
            // Error handling in hook
        }
    };

    const validCount = parsedRows.filter(r => r.status === 'ok').length;
    const errorCount = parsedRows.filter(r => r.status !== 'ok').length;
    const isMappingValid = colMapping.cod_colab !== '' && colMapping.valor !== '';

    const selectedCompetenceObj = competenceOptions.find(c => c.value === selectedCompetence);

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
                    <DialogTitle className="text-xl font-bold flex items-center gap-2 text-indigo-900">
                        Importar Descontos em Massa
                    </DialogTitle>
                    <DialogDescription>
                        {step === 'UPLOAD' && 'Selecione a planilha Excel ou CSV contendo a lista de descontos.'}
                        {step === 'MAPPING' && 'Selecione a Competência da folha, a Categoria do desconto e confirme o mapeamento de colunas.'}
                        {step === 'PREVIEW' && 'Confira os dados pré-visualizados antes de efetivar a importação na folha.'}
                    </DialogDescription>
                </DialogHeader>

                <div className="flex-1 overflow-y-auto py-3">
                    {/* STEP 1: UPLOAD */}
                    {step === 'UPLOAD' && (
                        <div className="grid w-full items-center gap-1.5 p-4 border-2 border-dashed rounded-lg bg-indigo-50/40 border-indigo-200 text-center">
                            {isParsing ? (
                                <div className="flex flex-col items-center justify-center p-8">
                                    <Loader2 className="h-8 w-8 animate-spin text-indigo-600 mb-4" />
                                    <span className="text-sm font-medium text-indigo-900">Lendo e analisando arquivo...</span>
                                </div>
                            ) : (
                                <div className="p-8">
                                    <Label htmlFor="excel_file_descontos" className="cursor-pointer">
                                        <div className="flex flex-col items-center gap-2">
                                            <div className="h-14 w-14 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 shadow-sm">
                                                <DownloadCloud className="h-7 w-7" />
                                            </div>
                                            <span className="text-base font-semibold text-gray-800">Clique para escolher o arquivo</span>
                                            <span className="text-xs text-muted-foreground">Suporta arquivos Excel (.xlsx, .xls) ou CSV</span>
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
                        <div className="space-y-5">
                            {/* TOP BAR: Comboboxes de Competência e Categoria */}
                            <div className="p-4 bg-indigo-50/60 border border-indigo-100 rounded-lg grid grid-cols-1 md:grid-cols-2 gap-4 shadow-sm">
                                <div className="space-y-1.5">
                                    <Label className="text-xs font-bold text-indigo-900 flex items-center gap-1.5">
                                        <Calendar className="w-3.5 h-3.5 text-indigo-600" />
                                        Competência da Folha (Mês / Ano) *
                                    </Label>
                                    <Select value={selectedCompetence} onValueChange={setSelectedCompetence}>
                                        <SelectTrigger className="bg-white border-indigo-200 focus:ring-indigo-500 font-medium">
                                            <SelectValue placeholder="Selecione a competência..." />
                                        </SelectTrigger>
                                        <SelectContent className="max-h-[240px]">
                                            {competenceOptions.map((opt) => (
                                                <SelectItem key={opt.value} value={opt.value}>
                                                    {opt.label}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <p className="text-[11px] text-indigo-700">
                                        Período de apuração que receberá estes descontos.
                                    </p>
                                </div>

                                <div className="space-y-1.5">
                                    <Label className="text-xs font-bold text-indigo-900 flex items-center gap-1.5">
                                        <Tag className="w-3.5 h-3.5 text-indigo-600" />
                                        Categoria do Desconto *
                                    </Label>
                                    <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                                        <SelectTrigger className="bg-white border-indigo-200 focus:ring-indigo-500 font-medium">
                                            <SelectValue placeholder="Selecione a categoria..." />
                                        </SelectTrigger>
                                        <SelectContent className="max-h-[240px]">
                                            {categoryList.map((cat) => (
                                                <SelectItem key={cat} value={cat}>
                                                    {cat}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <p className="text-[11px] text-indigo-700">
                                        Categoria aplicada aos lançamentos deste arquivo.
                                    </p>
                                </div>
                            </div>

                            {/* COLUMN MAPPING SECTION */}
                            <div className="border rounded-lg p-4 space-y-4 bg-white">
                                <h4 className="font-semibold text-xs text-gray-700 uppercase tracking-wider">
                                    Associação de Colunas da Planilha
                                </h4>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-3">
                                    <div className="space-y-1.5">
                                        <Label className="text-xs font-bold text-red-600">Código do Trabalhador (Obrigatório)</Label>
                                        <Select value={colMapping.cod_colab} onValueChange={(v) => setColMapping({ ...colMapping, cod_colab: v })}>
                                            <SelectTrigger><SelectValue placeholder="Selecione a coluna..." /></SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value=" ">-- Ignorar --</SelectItem>
                                                {rawHeaders.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    <div className="space-y-1.5">
                                        <Label className="text-xs font-bold text-red-600">Valor a Descontar (Obrigatório)</Label>
                                        <Select value={colMapping.valor} onValueChange={(v) => setColMapping({ ...colMapping, valor: v })}>
                                            <SelectTrigger><SelectValue placeholder="Selecione a coluna..." /></SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value=" ">-- Ignorar --</SelectItem>
                                                {rawHeaders.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    <div className="space-y-1.5">
                                        <Label className="text-xs font-medium text-gray-700">Nome do Trabalhador (Recomendado)</Label>
                                        <Select value={colMapping.nome} onValueChange={(v) => setColMapping({ ...colMapping, nome: v })}>
                                            <SelectTrigger><SelectValue placeholder="Selecione a coluna..." /></SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value=" ">-- Ignorar --</SelectItem>
                                                {rawHeaders.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    <div className="space-y-1.5">
                                        <Label className="text-xs font-medium text-gray-700">Descrição / Notas (Opcional)</Label>
                                        <Select value={colMapping.descricao} onValueChange={(v) => setColMapping({ ...colMapping, descricao: v })}>
                                            <SelectTrigger><SelectValue placeholder="Selecione a coluna..." /></SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value=" ">-- Ignorar --</SelectItem>
                                                {rawHeaders.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* STEP 3: PREVIEW */}
                    {step === 'PREVIEW' && parsedRows.length > 0 && (
                        <div className="border rounded-md overflow-hidden flex flex-col shadow-sm">
                            <div className="bg-slate-50 px-4 py-2.5 flex justify-between items-center text-xs border-b">
                                <div className="flex items-center gap-3">
                                    <span>Total lido: <strong>{parsedRows.length}</strong> registros.</span>
                                    {errorCount > 0 && <span className="text-destructive font-semibold">({errorCount} com alertas)</span>}
                                </div>
                                <div className="flex items-center gap-2">
                                    <Badge variant="outline" className="bg-indigo-50 text-indigo-700 border-indigo-200">
                                        {selectedCompetenceObj?.shortLabel || selectedCompetence}
                                    </Badge>
                                    <Badge variant="secondary" className={validCount > 0 ? "bg-emerald-100 text-emerald-800 font-semibold" : ""}>
                                        {validCount} Prontos para importar
                                    </Badge>
                                </div>
                            </div>
                            <ScrollArea className="h-[360px] w-full">
                                <table className="w-full text-xs">
                                    <thead className="bg-slate-100 dark:bg-slate-800 sticky top-0 shadow-sm z-10 text-slate-700">
                                        <tr>
                                            <th className="px-3 py-2 text-left font-semibold w-16">Cód</th>
                                            <th className="px-3 py-2 text-left font-semibold">Trabalhador</th>
                                            <th className="px-3 py-2 text-left font-semibold">Categoria</th>
                                            <th className="px-3 py-2 text-center font-semibold">Competência</th>
                                            <th className="px-3 py-2 text-right font-semibold">Valor</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y">
                                        {parsedRows.map((row, i) => (
                                            <tr key={i} className={`hover:bg-slate-50/80 ${row.status !== 'ok' ? 'bg-red-50/40' : ''}`}>
                                                <td className="px-3 py-2.5 font-mono text-muted-foreground whitespace-nowrap">
                                                    {row.cod_colab || '-'}
                                                </td>
                                                <td className="px-3 py-2.5">
                                                    <div className="flex flex-col">
                                                        <span className="font-semibold text-gray-900">
                                                            {row.nomeBanco || row.nome_planilha || 'Não encontrado'}
                                                        </span>
                                                        {row.errorMessage && (
                                                            <span className="text-[11px] text-destructive flex items-center mt-0.5">
                                                                <AlertCircle className="w-3 h-3 mr-1 shrink-0" />
                                                                {row.errorMessage}
                                                            </span>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="px-3 py-2.5 whitespace-nowrap">
                                                    <Badge variant="outline" className="text-[11px] font-normal border-slate-300">
                                                        {row.categoria}
                                                    </Badge>
                                                </td>
                                                <td className="px-3 py-2.5 text-center font-mono whitespace-nowrap text-slate-600">
                                                    {row.data}
                                                </td>
                                                <td className="px-3 py-2.5 text-right font-mono font-bold whitespace-nowrap text-indigo-700">
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

                <DialogFooter className="mt-2 border-t pt-3">
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
                                className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium"
                                disabled={!isMappingValid || isLoadingWorkers}
                            >
                                {isLoadingWorkers ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Carregando trabalhadores...
                                    </>
                                ) : (
                                    <>
                                        Validar e Pré-visualizar
                                        <ArrowRight className="ml-2 h-4 w-4" />
                                    </>
                                )}
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
                                className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium"
                            >
                                {isImporting ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Importando...
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
