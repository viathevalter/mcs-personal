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
import type { WorkerWithHousing, HousingBenefit } from '@/shared/types/corePersonal';
import { useImportHousing } from '../hooks/useImportHousing';
import { useEmpresa } from '@/app/providers/EmpresaProvider';
import { useBenefitCategories } from '@/features/settings/hooks/useCategories';
import {
    findMatchingWorker,
    getCompetenceOptions,
    getCurrentCompetence,
    parseExcelDateToISO,
    type SimpleWorker
} from '@/shared/utils/importUtils';

interface ImportHousingDialogProps {
    workers?: WorkerWithHousing[];
    trigger: React.ReactNode;
}

interface ParsedRow {
    cod_colab: string;
    nome_planilha: string;
    valor: number;
    data_inicio: string;
    categoria: string;
    workerId?: string;
    empresaId?: string;
    nomeBanco?: string;
    matchMethod?: string;
    status: 'ok' | 'not_found' | 'invalid_data';
    errorMessage?: string;
    originalRowData: any;
}

type ImportStep = 'UPLOAD' | 'MAPPING' | 'PREVIEW';

const DEFAULT_BENEFIT_CATEGORIES = [
    'Auxílio Moradia',
    'Auxílio Alimentação',
    'Auxílio Transporte',
    'Prêmios',
    'Bônus',
    'Horas Extra / Adicionais',
    'Aluguel de Carro',
    'Outros Proventos'
];

export function ImportHousingDialog({ workers: initialWorkers, trigger }: ImportHousingDialogProps) {
    const { selectedEmpresaId } = useEmpresa();
    const { data: benefitCategoriesData } = useBenefitCategories(selectedEmpresaId || undefined);

    const competenceOptions = useMemo(() => getCompetenceOptions(), []);
    const currentCompetence = useMemo(() => getCurrentCompetence(), []);

    const categoryList = useMemo(() => {
        if (benefitCategoriesData && benefitCategoriesData.length > 0) {
            const customNames = benefitCategoriesData.map(c => c.name);
            return Array.from(new Set([...DEFAULT_BENEFIT_CATEGORIES, ...customNames]));
        }
        return DEFAULT_BENEFIT_CATEGORIES;
    }, [benefitCategoriesData]);

    // Fetch all workers without PostgREST errors to match any worker in the sheet
    const { data: allWorkersData, isLoading: isLoadingWorkers } = useQuery<SimpleWorker[]>({
        queryKey: ['all-workers-for-import-benefits'],
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
                    console.error('Error fetching workers for benefit import:', error);
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

    const workers = (allWorkersData && allWorkersData.length > 0) ? allWorkersData : (initialWorkers || []);

    const [isOpen, setIsOpen] = useState(false);
    const [step, setStep] = useState<ImportStep>('UPLOAD');
    const [isParsing, setIsParsing] = useState(false);

    // File state
    const [rawHeaders, setRawHeaders] = useState<string[]>([]);
    const [rawRows, setRawRows] = useState<any[]>([]);

    // Combobox Selection States (Competência e Categoria)
    const [selectedCompetence, setSelectedCompetence] = useState<string>(currentCompetence);
    const [selectedCategory, setSelectedCategory] = useState<string>('Auxílio Moradia');

    // Mapping state
    const [colMapping, setColMapping] = useState({
        cod_colab: '',
        valor: '',
        data_inicio: '',
        categoria: '',
        nome: ''
    });

    // Preview state
    const [parsedRows, setParsedRows] = useState<ParsedRow[]>([]);
    const { mutateAsync: importHousing, isPending: isImporting } = useImportHousing();

    const resetState = () => {
        setStep('UPLOAD');
        setRawHeaders([]);
        setRawRows([]);
        setParsedRows([]);
        setColMapping({ cod_colab: '', valor: '', data_inicio: '', categoria: '', nome: '' });
        setSelectedCompetence(currentCompetence);
        setSelectedCategory('Auxílio Moradia');
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

                // Auto-guess mapping
                const guessMapping = {
                    cod_colab: findKeyIgnoreCase(headers, ['cod', 'cod ', 'cód', 'codigo', 'código', 'id', 'id ', 'cod colab', 'cod_colab']) || '',
                    valor: findKeyIgnoreCase(headers, ['valor', 'valor_mensal', 'mensalidade', 'costo fijo', 'costo', 'total', 'amount']) || '',
                    data_inicio: findKeyIgnoreCase(headers, ['data_inicio', 'inicio', 'data inicio', 'start', 'mes', 'mês', 'fecha inicio']) || '',
                    categoria: findKeyIgnoreCase(headers, ['categoria', 'tipo', 'category', 'tipo alojamiento']) || '',
                    nome: findKeyIgnoreCase(headers, ['trabalhador', 'nome', 'nombre', 'colaborador', 'funcionario']) || ''
                };

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
            console.error('Error parsing Excel file:', error);
        } finally {
            setIsParsing(false);
        }
    };

    const generatePreview = () => {
        const rows: ParsedRow[] = [];

        for (const row of rawRows) {
            const rawCod = colMapping.cod_colab ? String(row[colMapping.cod_colab] || '').trim() : '';
            const rawNome = colMapping.nome ? String(row[colMapping.nome] || '').trim() : '';

            // Clean amount parsing
            const rawValorStr = colMapping.valor ? String(row[colMapping.valor] || '0') : '0';
            const rawValor = parseFloat(rawValorStr.replace(/[^\d.,-]/g, '').replace(',', '.'));

            // Category resolution: Column value if mapped, otherwise Selected Category Combobox
            let finalCategory = selectedCategory;
            if (colMapping.categoria && colMapping.categoria !== ' ') {
                const sheetCat = String(row[colMapping.categoria] || '').trim();
                if (sheetCat) finalCategory = sheetCat;
            }

            // Competence resolution: Column date if mapped, otherwise Selected Competence Combobox
            let finalDate = selectedCompetence;
            if (colMapping.data_inicio && colMapping.data_inicio !== ' ') {
                const sheetDate = parseExcelDateToISO(row[colMapping.data_inicio]);
                if (sheetDate) finalDate = sheetDate;
            }

            // Skip empty and summary rows
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
                valor: isNaN(rawValor) ? 0 : rawValor,
                data_inicio: finalDate,
                categoria: finalCategory,
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

        const eventsToInsert: Omit<HousingBenefit, 'id' | 'created_at'>[] = validRows.map(r => {
            let endDateForMonth: string | null = null;
            if (r.data_inicio && r.data_inicio.length >= 7) {
                const parts = r.data_inicio.split('-').map(Number);
                if (parts.length >= 2) {
                    const y = parts[0];
                    const m = parts[1];
                    const lastDay = new Date(y, m, 0).getDate();
                    endDateForMonth = `${y}-${String(m).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
                }
            }

            return {
                worker_id: r.workerId!,
                empresa_id: r.empresaId || selectedEmpresaId || '00000000-0000-0000-0000-000000000000',
                monthly_amount: Number(r.valor.toFixed(2)),
                start_date: r.data_inicio,
                category: r.categoria,
                status: 'Ativo',
                end_date: endDateForMonth,
                proration_method: 'daily_actual',
                import_batch_id: batchId
            };
        });

        if (eventsToInsert.length === 0) return;

        try {
            await importHousing(eventsToInsert);
            setIsOpen(false);
            resetState();
        } catch (error) {
            // Handled in hook
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
                    <DialogTitle className="text-xl font-bold flex items-center gap-2 text-emerald-900">
                        Importar Proventos e Benefícios em Massa
                    </DialogTitle>
                    <DialogDescription>
                        {step === 'UPLOAD' && 'Selecione a planilha Excel ou CSV contendo os proventos/benefícios.'}
                        {step === 'MAPPING' && 'Selecione a Competência da folha, o Tipo de Provento e confirme o mapeamento de colunas.'}
                        {step === 'PREVIEW' && 'Confira os dados pré-visualizados antes de efetivar a importação.'}
                    </DialogDescription>
                </DialogHeader>

                <div className="flex-1 overflow-y-auto py-3">
                    {/* STEP 1: UPLOAD */}
                    {step === 'UPLOAD' && (
                        <div className="grid w-full items-center gap-1.5 p-4 border-2 border-dashed rounded-lg bg-emerald-50/40 border-emerald-200 text-center">
                            {isParsing ? (
                                <div className="flex flex-col items-center justify-center p-8">
                                    <Loader2 className="h-8 w-8 animate-spin text-emerald-600 mb-4" />
                                    <span className="text-sm font-medium text-emerald-900">Lendo e analisando arquivo...</span>
                                </div>
                            ) : (
                                <div className="p-8">
                                    <Label htmlFor="excel_file_moradia" className="cursor-pointer">
                                        <div className="flex flex-col items-center gap-2">
                                            <div className="h-14 w-14 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 shadow-sm">
                                                <DownloadCloud className="h-7 w-7" />
                                            </div>
                                            <span className="text-base font-semibold text-gray-800">Clique para escolher o arquivo</span>
                                            <span className="text-xs text-muted-foreground">Suporta arquivos Excel (.xlsx, .xls) ou CSV</span>
                                        </div>
                                    </Label>
                                    <Input
                                        id="excel_file_moradia"
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
                            <div className="p-4 bg-emerald-50/60 border border-emerald-100 rounded-lg grid grid-cols-1 md:grid-cols-2 gap-4 shadow-sm">
                                <div className="space-y-1.5">
                                    <Label className="text-xs font-bold text-emerald-900 flex items-center gap-1.5">
                                        <Calendar className="w-3.5 h-3.5 text-emerald-600" />
                                        Competência da Folha (Mês / Ano) *
                                    </Label>
                                    <Select value={selectedCompetence} onValueChange={setSelectedCompetence}>
                                        <SelectTrigger className="bg-white border-emerald-200 focus:ring-emerald-500 font-medium">
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
                                    <p className="text-[11px] text-emerald-700">
                                        Período de apuração que receberá estes proventos.
                                    </p>
                                </div>

                                <div className="space-y-1.5">
                                    <Label className="text-xs font-bold text-emerald-900 flex items-center gap-1.5">
                                        <Tag className="w-3.5 h-3.5 text-emerald-600" />
                                        Tipo / Categoria do Provento *
                                    </Label>
                                    <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                                        <SelectTrigger className="bg-white border-emerald-200 focus:ring-emerald-500 font-medium">
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
                                    <p className="text-[11px] text-emerald-700">
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
                                        <Label className="text-xs font-bold text-red-600">Valor Mensal (€) (Obrigatório)</Label>
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
                                        <Label className="text-xs font-medium text-gray-700">Coluna de Data (Opcional)</Label>
                                        <Select value={colMapping.data_inicio} onValueChange={(v) => setColMapping({ ...colMapping, data_inicio: v })}>
                                            <SelectTrigger><SelectValue placeholder="Selecione a coluna..." /></SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value=" ">-- Usar Competência Selecionada --</SelectItem>
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
                                    <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200">
                                        {selectedCompetenceObj?.shortLabel || selectedCompetence}
                                    </Badge>
                                    <Badge variant="secondary" className={validCount > 0 ? "bg-emerald-100 text-emerald-800 font-semibold" : ""}>
                                        {validCount} Lançamento(s) Prontos
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
                                            <th className="px-3 py-2 text-right font-semibold">Valor Mensal</th>
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
                                                    {row.data_inicio}
                                                </td>
                                                <td className="px-3 py-2.5 text-right font-mono font-bold whitespace-nowrap text-emerald-700">
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
                                className="bg-emerald-600 hover:bg-emerald-700 text-white font-medium"
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
                                className="bg-emerald-600 hover:bg-emerald-700 text-white font-medium"
                            >
                                {isImporting ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Importando...
                                    </>
                                ) : (
                                    <>
                                        <DownloadCloud className="mr-2 h-4 w-4" />
                                        Importar {validCount} Lançamento(s)
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
