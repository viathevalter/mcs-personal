import { useState } from 'react';
import * as XLSX from 'xlsx';
import { DownloadCloud, Loader2, AlertCircle } from 'lucide-react';
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
import { useImportTarifas, type UpdateTarifaPayload } from '../hooks/useImportTarifas';
import { useWorkersList } from '../hooks/useWorkersList';
import { useEmpresa } from '@/app/providers/EmpresaProvider';

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
    const { selectedEmpresaId } = useEmpresa();

    // We fetch all workers for the selected company to match the codes without pagination filter
    const { data: workersData } = useWorkersList({
        empresaId: selectedEmpresaId || '',
        page: 1,
        pageSize: 10000 // A large enough number to get all workers to match
    });

    const workers = workersData?.data || [];

    const [isOpen, setIsOpen] = useState(false);
    const [parsedRows, setParsedRows] = useState<ParsedRow[]>([]);
    const [isParsing, setIsParsing] = useState(false);

    const { mutateAsync: importTarifas, isPending: isImporting } = useImportTarifas();

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = e.target.files?.[0];
        if (selectedFile) {
            parseExcel(selectedFile);
        } else {
            setParsedRows([]);
        }
    };

    const findKeyIgnoreCase = (obj: any, searchKeys: string[]): string | undefined => {
        const keys = Object.keys(obj);
        for (const search of searchKeys) {
            const match = keys.find(k => k.trim().toLowerCase() === search.toLowerCase());
            if (match) return match;
        }
        return undefined;
    };

    const parseExcel = async (file: File) => {
        setIsParsing(true);
        try {
            const data = await file.arrayBuffer();
            const workbook = XLSX.read(data, { type: 'array' });
            const firstSheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[firstSheetName];

            // Generate raw JSON rows
            const rawJson = XLSX.utils.sheet_to_json(worksheet) as any[];

            const rows: ParsedRow[] = [];

            for (const row of rawJson) {
                // Determine COD_Colab
                const codColabKey = findKeyIgnoreCase(row, ['cod_colab', 'codigo', 'cod', 'cod colab', 'cod trabalhador']);
                // Determine Tarifa
                const tarifaKey = findKeyIgnoreCase(row, ['tarifa', 'tarifa hora', 'valor']);
                // Determine Worker Name purely for display
                const nomeKey = findKeyIgnoreCase(row, ['trabalhador', 'nome', 'nombre', 'colaborador']);

                const rawCod = codColabKey ? String(row[codColabKey]).trim().toUpperCase() : '';
                // Excel numbers could be strings or floats
                const rawTarifa = tarifaKey ? parseFloat(String(row[tarifaKey]).replace(',', '.')) : 0;
                const rawNome = nomeKey ? String(row[nomeKey]) : '';

                if (!rawCod) continue; // Skip rows without an ID

                const matchedWorker = workers?.find(w => w.cod_colab.toUpperCase() === rawCod);

                let status: ParsedRow['status'] = 'not_found';
                if (matchedWorker) {
                    status = (isNaN(rawTarifa) || rawTarifa < 0) ? 'invalid_tariff' : 'ok';
                }

                // If user wants only valid values > 0, we can drop rows with zero, but they might want to zero out a tariff.
                // Let's assume ok if it's a valid number.

                rows.push({
                    cod_colab: rawCod,
                    nome_planilha: rawNome,
                    tarifa: isNaN(rawTarifa) ? 0 : rawTarifa,
                    workerId: matchedWorker?.id,
                    nomeBanco: matchedWorker?.nome,
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

    const handleImport = async () => {
        if (!parsedRows.length) return;

        // Process only rows that have a worker match and valid tariff
        const validRows = parsedRows.filter(r => r.status === 'ok' && r.workerId);

        const payloads: UpdateTarifaPayload[] = validRows.map(r => ({
            workerId: r.workerId!,
            tarifa: Number(r.tarifa.toFixed(2))
        }));

        if (payloads.length === 0) return;

        try {
            await importTarifas(payloads);
            setIsOpen(false);
            setParsedRows([]);
        } catch (error) {
            // Error handled in hook
        }
    };

    const validCount = parsedRows.filter(r => r.status === 'ok').length;
    const notFoundCount = parsedRows.filter(r => r.status === 'not_found').length;

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                {trigger}
            </DialogTrigger>
            <DialogContent className="sm:max-w-[700px]">
                <DialogHeader>
                    <DialogTitle>Importar Tarifas (Excel)</DialogTitle>
                    <DialogDescription>
                        Faça o upload da planilha contendo a coluna <strong>Cód Trabalhador</strong> e <strong>Tarifa</strong> para atualizar o cadastro dos trabalhadores.
                    </DialogDescription>
                </DialogHeader>

                <div className="grid gap-4 py-4">
                    <div className="grid w-full max-w-sm items-center gap-1.5">
                        <Label htmlFor="excel_file_tarifas">Arquivo XLSX</Label>
                        <Input
                            id="excel_file_tarifas"
                            type="file"
                            accept=".xlsx, .xls"
                            onChange={handleFileChange}
                            disabled={isParsing || isImporting}
                        />
                    </div>

                    {isParsing && (
                        <div className="flex items-center justify-center p-8">
                            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground mr-2" />
                            <span className="text-muted-foreground">Lendo arquivo...</span>
                        </div>
                    )}

                    {!isParsing && parsedRows.length > 0 && (
                        <div className="border rounded-md overflow-hidden flex flex-col">
                            <div className="bg-muted px-4 py-2 flex justify-between items-center text-sm">
                                <div>
                                    Encontradas <strong>{parsedRows.length}</strong> linhas.
                                    {notFoundCount > 0 && <span className="text-destructive font-medium ml-2">({notFoundCount} colab. não encontrados)</span>}
                                </div>
                                <Badge variant="secondary">{validCount} Prontos para importação</Badge>
                            </div>
                            <ScrollArea className="h-[250px] w-full">
                                <table className="w-full text-sm">
                                    <thead className="bg-slate-50 dark:bg-slate-900 sticky top-0">
                                        <tr>
                                            <th className="px-4 py-2 text-left font-medium w-24">Cód</th>
                                            <th className="px-4 py-2 text-left font-medium">Trabalhador</th>
                                            <th className="px-4 py-2 text-right font-medium">Tarifa Atualizada</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {parsedRows.map((row, i) => (
                                            <tr key={i} className="border-t hover:bg-muted/50">
                                                <td className="px-4 py-2 text-muted-foreground">
                                                    {row.cod_colab}
                                                </td>
                                                <td className="px-4 py-2">
                                                    <div className="flex items-center gap-2">
                                                        {row.status === 'not_found' && <span title="Colaborador não encontrado"><AlertCircle className="w-4 h-4 text-destructive" /></span>}
                                                        <span className={row.status === 'not_found' ? 'text-destructive font-medium' : ''}>
                                                            {row.nomeBanco || row.nome_planilha || 'Sem Nome'}
                                                        </span>
                                                    </div>
                                                </td>
                                                <td className="px-4 py-2 text-right font-mono font-medium text-emerald-600 dark:text-emerald-500">
                                                    € {row.tarifa.toFixed(2)}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </ScrollArea>
                        </div>
                    )}
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={() => setIsOpen(false)} disabled={isImporting}>
                        Cancelar
                    </Button>
                    <Button
                        onClick={handleImport}
                        disabled={isImporting || isParsing || validCount === 0}
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
                                Confirmar Atualização ({validCount})
                            </>
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
