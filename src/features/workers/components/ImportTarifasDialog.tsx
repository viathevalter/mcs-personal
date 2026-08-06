import { useState, useEffect } from 'react';
import * as XLSX from 'xlsx';
import { DownloadCloud, Loader2, AlertCircle, RefreshCw } from 'lucide-react';
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
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/shared/supabase/client';
import { useImportTarifas, type UpdateTarifaPayload } from '../hooks/useImportTarifas';

interface ImportTarifasDialogProps {
    trigger: React.ReactNode;
}

interface ParsedRow {
    cod_colab: string;
    nome_planilha: string;
    tarifa: number;
    workerId?: string;
    nomeBanco?: string;
    status: 'ok' | 'not_found' | 'invalid_tariff';
}

export function ImportTarifasDialog({ trigger }: ImportTarifasDialogProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [parsedRows, setParsedRows] = useState<ParsedRow[]>([]);
    const [isParsing, setIsParsing] = useState(false);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);

    // Query ALL 580+ workers directly from core_personal.workers (bypasses RPC company filters)
    const { data: allWorkers = [], isLoading: isLoadingWorkers } = useQuery({
        queryKey: ['all-workers-direct-for-import'],
        queryFn: async () => {
            const { data, error } = await supabase
                .schema('core_personal')
                .from('workers')
                .select('id, cod_colab, nome, cliente, contratante');

            if (error || !data) {
                console.error("Error fetching all workers directly for tariff import:", error);
                return [];
            }
            return data;
        },
        enabled: isOpen,
        staleTime: 60 * 1000
    });

    const { mutateAsync: importTarifas, isPending: isImporting } = useImportTarifas();

    const findKeyIgnoreCase = (obj: any, searchKeys: string[]): string | undefined => {
        const keys = Object.keys(obj);
        for (const search of searchKeys) {
            const match = keys.find(k => k.trim().toLowerCase() === search.toLowerCase());
            if (match) return match;
        }
        return undefined;
    };

    // Extract numeric digits from worker code (e.g. "E0089" -> "89", "0089" -> "89", "89" -> "89")
    const getCodeNumeric = (code: string) => {
        if (!code) return '';
        const digits = code.replace(/\D/g, '');
        return digits ? digits.replace(/^0+/, '') : code.trim().toUpperCase();
    };

    const parseExcel = async (file: File) => {
        setIsParsing(true);
        try {
            // Guarantee workers list is populated inline even if React Query is still loading
            let currentWorkers = allWorkers;
            if (!currentWorkers || currentWorkers.length === 0) {
                const { data, error } = await supabase
                    .schema('core_personal')
                    .from('workers')
                    .select('id, cod_colab, nome, cliente, contratante');
                if (data && data.length > 0) {
                    currentWorkers = data;
                } else if (error) {
                    console.error("Inline fetch workers error:", error);
                }
            }

            const arrayBuffer = await file.arrayBuffer();
            const workbook = XLSX.read(arrayBuffer, { type: 'array' });
            const firstSheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[firstSheetName];

            // Generate raw JSON rows
            const rawJson = XLSX.utils.sheet_to_json(worksheet) as any[];

            const rows: ParsedRow[] = [];

            for (const row of rawJson) {
                // Determine COD_Colab (supports 'código', 'cod_colab', 'cod', etc.)
                const codColabKey = findKeyIgnoreCase(row, ['cod_colab', 'codigo', 'código', 'cod', 'cod colab', 'cod trabalhador', 'id', 'colaborador_id', 'colaborador']);
                // Determine Tarifa (supports 'tarifa', 'tarifa hora', 'valor', etc.)
                const tarifaKey = findKeyIgnoreCase(row, ['tarifa', 'tarifa hora', 'valor', 'tarifa_hora', 'rate', 'precio', 'tarifa (h)']);
                // Determine Worker Name purely for display / fallback match
                const nomeKey = findKeyIgnoreCase(row, ['trabalhador', 'nome', 'nombre', 'colaborador', 'funcionario']);

                const rawCod = codColabKey ? String(row[codColabKey]).trim().toUpperCase() : '';
                const rawTarifa = tarifaKey ? parseFloat(String(row[tarifaKey]).replace(',', '.')) : 0;
                const rawNome = nomeKey ? String(row[nomeKey]).trim() : '';

                if (!rawCod && !rawNome) continue; // Skip empty rows

                const codNum = getCodeNumeric(rawCod);
                const rawClean = rawCod.replace(/[^A-Z0-9]/gi, '');

                // Multi-level worker matching against currentWorkers:
                let matchedWorker = currentWorkers.find(w => w.cod_colab && w.cod_colab.trim().toUpperCase() === rawCod);

                if (!matchedWorker && rawClean) {
                    matchedWorker = currentWorkers.find(w => w.cod_colab && w.cod_colab.replace(/[^A-Z0-9]/gi, '').toUpperCase() === rawClean);
                }

                if (!matchedWorker && codNum) {
                    matchedWorker = currentWorkers.find(w => w.cod_colab && getCodeNumeric(w.cod_colab) === codNum);
                }

                if (!matchedWorker && rawNome) {
                    const normNome = rawNome.toLowerCase();
                    matchedWorker = currentWorkers.find(w => w.nome && w.nome.trim().toLowerCase() === normNome);
                }

                let status: ParsedRow['status'] = 'not_found';
                if (matchedWorker) {
                    status = (isNaN(rawTarifa) || rawTarifa < 0) ? 'invalid_tariff' : 'ok';
                }

                rows.push({
                    cod_colab: rawCod || matchedWorker?.cod_colab || '-',
                    nome_planilha: rawNome,
                    tarifa: isNaN(rawTarifa) ? 0 : rawTarifa,
                    workerId: matchedWorker?.id,
                    nomeBanco: matchedWorker?.nome || rawNome || 'Desconhecido',
                    status
                });
            }

            setParsedRows(rows);
        } catch (error) {
            console.error('Error parsing Excel file:', error);
        } finally {
            setIsParsing(false);
        }
    };

    // Re-parse file automatically if workers finish loading after file selection
    useEffect(() => {
        if (selectedFile && allWorkers && allWorkers.length > 0 && parsedRows.length > 0 && parsedRows.every(r => r.status === 'not_found')) {
            parseExcel(selectedFile);
        }
    }, [allWorkers]);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setSelectedFile(file);
            parseExcel(file);
        } else {
            setSelectedFile(null);
            setParsedRows([]);
        }
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
            setParsedRows([]);
            setSelectedFile(null);
        } catch (err) {
            console.error(err);
        }
    };

    const readyCount = parsedRows.filter(r => r.status === 'ok').length;
    const notFoundCount = parsedRows.filter(r => r.status === 'not_found').length;
    const invalidTariffCount = parsedRows.filter(r => r.status === 'invalid_tariff').length;

    return (
        <Dialog open={isOpen} onOpenChange={(open) => {
            setIsOpen(open);
            if (!open) {
                setParsedRows([]);
                setSelectedFile(null);
            }
        }}>
            <DialogTrigger asChild>
                {trigger}
            </DialogTrigger>
            <DialogContent className="sm:max-w-[720px]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-indigo-700 dark:text-indigo-400">
                        <DownloadCloud className="w-5 h-5 text-indigo-600" />
                        Importar Tarifas (Excel)
                    </DialogTitle>
                    <DialogDescription className="text-xs">
                        Faça o upload da planilha contendo a coluna <strong>Código</strong> e <strong>Tarifa</strong> para atualizar o cadastro de qualquer colaborador quantas vezes precisar.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-2">
                    <div className="space-y-2">
                        <Label htmlFor="excel-file" className="text-xs font-semibold">Arquivo XLSX ou CSV</Label>
                        <Input
                            id="excel-file"
                            type="file"
                            accept=".xlsx, .xls, .csv"
                            onChange={handleFileChange}
                            disabled={isParsing || isImporting}
                            className="text-xs h-9 cursor-pointer"
                        />
                        {isLoadingWorkers && (
                            <span className="text-[11px] text-muted-foreground flex items-center gap-1 font-mono">
                                <Loader2 className="w-3 h-3 animate-spin text-indigo-500" /> Carregando base total de trabalhadores...
                            </span>
                        )}
                    </div>

                    {isParsing && (
                        <div className="flex items-center justify-center p-6 gap-2">
                            <Loader2 className="h-5 w-5 animate-spin text-indigo-600" />
                            <span className="text-xs text-muted-foreground">Cruzando códigos e validando tarifas da planilha...</span>
                        </div>
                    )}

                    {!isParsing && parsedRows.length > 0 && (
                        <div className="space-y-3">
                            <div className="flex items-center justify-between text-xs bg-slate-50 dark:bg-slate-900 p-2.5 rounded-lg border">
                                <span className="text-slate-700 dark:text-slate-300 font-medium">
                                    Encontradas <strong>{parsedRows.length}</strong> linhas na planilha.
                                </span>
                                <div className="flex gap-2">
                                    {notFoundCount > 0 && (
                                        <Badge variant="destructive" className="text-[10px]">
                                            {notFoundCount} não encontrados
                                        </Badge>
                                    )}
                                    {invalidTariffCount > 0 && (
                                        <Badge variant="outline" className="text-[10px] text-amber-600 border-amber-300">
                                            {invalidTariffCount} tarifas inválidas
                                        </Badge>
                                    )}
                                    <Badge variant="default" className="bg-emerald-600 text-white font-semibold text-[10px]">
                                        {readyCount} Prontos para importação
                                    </Badge>
                                </div>
                            </div>

                            <ScrollArea className="h-[280px] rounded-md border p-1 bg-white dark:bg-slate-950">
                                <table className="w-full text-xs">
                                    <thead className="bg-slate-100 dark:bg-slate-900 sticky top-0 font-semibold text-slate-700 dark:text-slate-300">
                                        <tr>
                                            <th className="p-2 text-left">Cód</th>
                                            <th className="p-2 text-left">Trabalhador no Sistema</th>
                                            <th className="p-2 text-right">Tarifa (Hora)</th>
                                            <th className="p-2 text-center">Status</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y">
                                        {parsedRows.map((row, idx) => (
                                            <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-900/50">
                                                <td className="p-2 font-mono font-bold text-slate-800 dark:text-slate-200">
                                                    {row.cod_colab}
                                                </td>
                                                <td className="p-2 font-medium">
                                                    {row.status === 'ok' ? (
                                                        <span className="text-slate-900 dark:text-slate-100 font-semibold">
                                                            {row.nomeBanco}
                                                        </span>
                                                    ) : (
                                                        <span className="text-red-500 italic font-normal flex items-center gap-1">
                                                            <AlertCircle className="w-3.5 h-3.5 text-red-500" />
                                                            {row.nome_planilha || 'Trabalhador não encontrado no sistema'}
                                                        </span>
                                                    )}
                                                </td>
                                                <td className="p-2 text-right font-mono font-bold text-emerald-600 dark:text-emerald-400">
                                                    € {row.tarifa.toFixed(2)}
                                                </td>
                                                <td className="p-2 text-center">
                                                    {row.status === 'ok' && (
                                                        <Badge variant="outline" className="border-emerald-500 text-emerald-700 bg-emerald-50 text-[10px]">
                                                            Pronto
                                                        </Badge>
                                                    )}
                                                    {row.status === 'not_found' && (
                                                        <Badge variant="destructive" className="text-[10px]">
                                                            Não Encontrado
                                                        </Badge>
                                                    )}
                                                    {row.status === 'invalid_tariff' && (
                                                        <Badge variant="outline" className="border-amber-500 text-amber-700 bg-amber-50 text-[10px]">
                                                            Valor Inválido
                                                        </Badge>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </ScrollArea>
                        </div>
                    )}
                </div>

                <DialogFooter className="pt-2">
                    <Button variant="outline" onClick={() => setIsOpen(false)} disabled={isImporting} className="h-9 text-xs">
                        Cancelar
                    </Button>
                    <Button
                        onClick={handleImport}
                        disabled={readyCount === 0 || isImporting || isParsing}
                        className="bg-indigo-600 hover:bg-indigo-700 text-xs font-semibold h-9 gap-1.5"
                    >
                        {isImporting ? (
                            <>
                                <Loader2 className="h-4 w-4 animate-spin" />
                                Atualizando {readyCount} Tarifas...
                            </>
                        ) : (
                            <>
                                <RefreshCw className="h-3.5 w-3.5" />
                                Confirmar Atualização ({readyCount})
                            </>
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
