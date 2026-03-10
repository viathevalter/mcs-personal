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
import type { Worker } from '@/shared/types/corePersonal';
import { useImportHoras } from '../hooks/useImportHoras';
import type { InsertHoleriteEventoPayload } from '../api/holeritesApi';

interface ImportHorasDialogProps {
    mesReferencia: string;
    workers: (Worker & { worker_beneficios_settings?: any })[];
    trigger: React.ReactNode;
}

interface ParsedRow {
    cod_colab: string;
    nome_planilha: string;
    horas: number;
    workerId?: string;
    empresaId?: string;
    nomeBanco?: string;
    tarifa: number;
    valorCalculado: number;
    status: 'ok' | 'not_found' | 'no_hours';
    errorMessage?: string;
    originalRowData: any;
}

type ImportStep = 'UPLOAD' | 'MAPPING' | 'PREVIEW';

export function ImportHorasDialog({ mesReferencia, workers, trigger }: ImportHorasDialogProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [step, setStep] = useState<ImportStep>('UPLOAD');
    const [isParsing, setIsParsing] = useState(false);

    // File state
    const [rawHeaders, setRawHeaders] = useState<string[]>([]);
    const [rawRows, setRawRows] = useState<any[]>([]);

    // Mapping state
    const [colMapping, setColMapping] = useState({
        cod_colab: '',
        horas: '',
        nome: ''
    });

    // Preview
    const [parsedRows, setParsedRows] = useState<ParsedRow[]>([]);
    const { mutateAsync: importHoras, isPending: isImporting } = useImportHoras();

    const resetState = () => {
        setStep('UPLOAD');
        setRawHeaders([]);
        setRawRows([]);
        setParsedRows([]);
        setColMapping({ cod_colab: '', horas: '', nome: '' });
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
            const workbook = XLSX.read(data, { type: 'array' });
            const firstSheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[firstSheetName];

            const rawJson = XLSX.utils.sheet_to_json(worksheet) as any[];

            if (rawJson.length > 0) {
                const headers = Object.keys(rawJson[0]);
                setRawHeaders(headers);
                setRawRows(rawJson);

                // Auto-guess mapping
                const guessMapping = {
                    cod_colab: findKeyIgnoreCase(headers, ['cod colab', 'codigo', 'cod', 'cod_colab']) || '',
                    horas: findKeyIgnoreCase(headers, ['total_horas_ajustado', 'total_horas', 'total horas', 'horas']) || '',
                    nome: findKeyIgnoreCase(headers, ['trabalhador', 'nome', 'nombre', 'colaborador']) || ''
                };
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
            const rawCod = colMapping.cod_colab ? String(row[colMapping.cod_colab] || '').trim().toUpperCase() : '';
            const rawHoras = colMapping.horas ? parseFloat(String(row[colMapping.horas] || '0').replace(',', '.')) : 0;
            const rawNome = colMapping.nome ? String(row[colMapping.nome] || '') : '';

            if (!rawCod) continue;

            const matchedWorker = workers?.find(w => w.cod_colab.toUpperCase() === rawCod);
            const tarifa = matchedWorker?.worker_beneficios_settings?.tarifa_hora || 0;

            let status: ParsedRow['status'] = 'not_found';
            let errorMessage = '';

            if (!matchedWorker) {
                errorMessage = `Trabalhador não encontrado (${rawCod}).`;
            } else if (isNaN(rawHoras) || rawHoras <= 0) {
                status = 'no_hours';
                errorMessage = 'Horas inválidas ou zeradas.';
            } else {
                status = 'ok';
            }

            rows.push({
                cod_colab: rawCod,
                nome_planilha: rawNome,
                horas: isNaN(rawHoras) ? 0 : rawHoras,
                workerId: matchedWorker?.id,
                empresaId: matchedWorker?.empresa_id,
                nomeBanco: matchedWorker?.nome,
                tarifa,
                valorCalculado: isNaN(rawHoras) ? 0 : (rawHoras * tarifa),
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

        const eventsToInsert: InsertHoleriteEventoPayload[] = validRows.map(r => ({
            trabalhador_id: r.workerId!,
            empresa_id: r.empresaId!,
            mes_referencia: mesReferencia,
            tipo: 'provento',
            categoria: 'total_horas',
            valor: Number(r.valorCalculado.toFixed(2)),
            horas_referencia: r.horas,
            descricao: `Horas Trabalhadas: ${r.horas}h`,
            import_batch_id: batchId
        }));

        if (eventsToInsert.length === 0) return;

        try {
            await importHoras(eventsToInsert);
            setIsOpen(false);
            resetState();
        } catch (error) {
            // Handled in hook
        }
    };

    const validCount = parsedRows.filter(r => r.status === 'ok').length;
    const errorCount = parsedRows.filter(r => r.status !== 'ok').length;
    const isMappingValid = colMapping.cod_colab !== '' && colMapping.horas !== '';

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
                    <DialogTitle>Importar Horas (Excel)</DialogTitle>
                    <DialogDescription>
                        {step === 'UPLOAD' && `Faça o upload da planilha contendo as horas para o mês de ${mesReferencia}.`}
                        {step === 'MAPPING' && 'Associe as colunas do seu arquivo aos campos do sistema.'}
                        {step === 'PREVIEW' && 'Revise as horas antes de confirmar a importação.'}
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
                                    <Label htmlFor="excel_file_horas" className="cursor-pointer">
                                        <div className="flex flex-col items-center gap-2">
                                            <div className="h-12 w-12 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600">
                                                <DownloadCloud className="h-6 w-6" />
                                            </div>
                                            <span className="text-base font-semibold">Clique para escolher o arquivo</span>
                                            <span className="text-sm text-muted-foreground">XLSX, XLS ou CSV</span>
                                        </div>
                                    </Label>
                                    <Input
                                        id="excel_file_horas"
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
                                Mapeie as colunas da sua planilha. <strong>Código do Trabalhador e Total de Horas são obrigatórios.</strong>
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
                                    <Label className="text-xs font-bold text-red-600">Horas (Obrigatório)</Label>
                                    <Select value={colMapping.horas} onValueChange={(v) => setColMapping({ ...colMapping, horas: v })}>
                                        <SelectTrigger><SelectValue placeholder="Selecione a coluna..." /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value=" ">-- Ignorar --</SelectItem>
                                            {rawHeaders.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="space-y-1.5">
                                    <Label className="text-xs">Nome do Trabalhador na Planilha</Label>
                                    <Select value={colMapping.nome} onValueChange={(v) => setColMapping({ ...colMapping, nome: v })}>
                                        <SelectTrigger><SelectValue placeholder="Selecione a coluna..." /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value=" ">-- Ignorar --</SelectItem>
                                            {rawHeaders.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}
                                        </SelectContent>
                                    </Select>
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
                                    {errorCount > 0 && <span className="text-destructive font-medium ml-2">({errorCount} com alertas/erros)</span>}
                                </div>
                                <Badge variant="secondary" className={validCount > 0 ? "bg-indigo-100 text-indigo-700" : ""}>
                                    {validCount} Prontos para {mesReferencia}
                                </Badge>
                            </div>
                            <ScrollArea className="h-[350px] w-full">
                                <table className="w-full text-sm">
                                    <thead className="bg-slate-50 dark:bg-slate-900 sticky top-0 shadow-sm z-10">
                                        <tr>
                                            <th className="px-4 py-2 text-left font-medium w-16">Cód</th>
                                            <th className="px-4 py-2 text-left font-medium">Trabalhador</th>
                                            <th className="px-4 py-2 text-right font-medium">Horas</th>
                                            <th className="px-4 py-2 text-right font-medium">Tarifa</th>
                                            <th className="px-4 py-2 text-right font-medium">Total Bruto</th>
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
                                                        <span className={row.status === 'not_found' ? 'text-destructive font-medium' : 'font-medium text-gray-900'}>
                                                            {row.nomeBanco || row.nome_planilha || 'Sem Nome'}
                                                        </span>
                                                        {row.errorMessage && (
                                                            <span className="text-xs text-destructive flex items-center mt-1">
                                                                <AlertCircle className="w-3 h-3 mr-1" />
                                                                {row.errorMessage}
                                                            </span>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className={`px-4 py-3 text-right font-mono whitespace-nowrap ${row.status === 'no_hours' ? 'text-red-500 font-bold' : ''}`}>
                                                    {row.horas}
                                                </td>
                                                <td className="px-4 py-3 text-right font-mono text-muted-foreground whitespace-nowrap">
                                                    € {row.tarifa.toFixed(2)}
                                                </td>
                                                <td className="px-4 py-3 text-right font-mono font-medium whitespace-nowrap text-emerald-600">
                                                    € {row.valorCalculado.toFixed(2)}
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
