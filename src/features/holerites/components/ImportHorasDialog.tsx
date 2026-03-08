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
}

export function ImportHorasDialog({ mesReferencia, workers, trigger }: ImportHorasDialogProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [parsedRows, setParsedRows] = useState<ParsedRow[]>([]);
    const [isParsing, setIsParsing] = useState(false);

    const { mutateAsync: importHoras, isPending: isImporting } = useImportHoras();

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
                const codColabKey = findKeyIgnoreCase(row, ['cod_colab', 'codigo', 'cod', 'cod colab']);
                // Determine Hours (Total_Horas_Ajustado preferred over Total_Horas)
                const horasKey = findKeyIgnoreCase(row, ['total_horas_ajustado', 'total_horas', 'total horas', 'horas']);
                // Determine Worker Name purely for display
                const nomeKey = findKeyIgnoreCase(row, ['trabalhador', 'nome', 'nombre']);

                const rawCod = codColabKey ? String(row[codColabKey]).trim().toUpperCase() : '';
                // Excel numbers could be strings or floats
                const rawHoras = horasKey ? parseFloat(String(row[horasKey]).replace(',', '.')) : 0;
                const rawNome = nomeKey ? String(row[nomeKey]) : '';

                if (!rawCod) continue; // Skip rows without an ID

                const matchedWorker = workers?.find(w => w.cod_colab.toUpperCase() === rawCod);
                const tarifa = matchedWorker?.worker_beneficios_settings?.tarifa_hora || 0;

                let status: ParsedRow['status'] = 'not_found';
                if (matchedWorker) {
                    status = (isNaN(rawHoras) || rawHoras <= 0) ? 'no_hours' : 'ok';
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
                    status
                });
            }

            setParsedRows(rows);
        } catch (error) {
            console.error('Error parsing Excel file:', error);
            // In a real app we'd toast here
        } finally {
            setIsParsing(false);
        }
    };

    const handleImport = async () => {
        if (!parsedRows.length) return;

        // Process only rows that have a worker match and valid hours
        const validRows = parsedRows.filter(r => r.status === 'ok' && r.workerId && r.empresaId);

        const eventsToInsert: InsertHoleriteEventoPayload[] = validRows.map(r => ({
            trabalhador_id: r.workerId!,
            empresa_id: r.empresaId!,
            mes_referencia: mesReferencia,
            tipo: 'provento',
            categoria: 'total_horas',
            valor: Number(r.valorCalculado.toFixed(2)),
            horas_referencia: r.horas,
            descricao: `Horas Trabalhadas: ${r.horas}h`
        }));

        if (eventsToInsert.length === 0) return;

        try {
            await importHoras(eventsToInsert);
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
                    <DialogTitle>Importar Horas (Excel)</DialogTitle>
                    <DialogDescription>
                        Faça o upload da planilha contendo a coluna <strong>COD_colab</strong> e <strong>Total_Horas_Ajustado</strong> para calcular os proventos do mês <strong>{mesReferencia}</strong>.
                    </DialogDescription>
                </DialogHeader>

                <div className="grid gap-4 py-4">
                    <div className="grid w-full max-w-sm items-center gap-1.5">
                        <Label htmlFor="excel_file">Arquivo XLSX</Label>
                        <Input
                            id="excel_file"
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
                                    {notFoundCount > 0 && <span className="text-destructive font-medium ml-2">({notFoundCount} colab. não encontrados ou inativos)</span>}
                                </div>
                                <Badge variant="secondary">{validCount} Prontos para importação</Badge>
                            </div>
                            <ScrollArea className="h-[250px] w-full">
                                <table className="w-full text-sm">
                                    <thead className="bg-slate-50 dark:bg-slate-900 sticky top-0">
                                        <tr>
                                            <th className="px-4 py-2 text-left font-medium w-24">Cód</th>
                                            <th className="px-4 py-2 text-left font-medium">Trabalhador</th>
                                            <th className="px-4 py-2 text-right font-medium">Horas</th>
                                            <th className="px-4 py-2 text-right font-medium">Tarifa</th>
                                            <th className="px-4 py-2 text-right font-medium">Total Bruto</th>
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
                                                <td className="px-4 py-2 text-right font-mono">
                                                    {row.horas}
                                                </td>
                                                <td className="px-4 py-2 text-right font-mono text-muted-foreground">
                                                    € {row.tarifa.toFixed(2)}
                                                </td>
                                                <td className="px-4 py-2 text-right font-mono font-medium text-emerald-600 dark:text-emerald-500">
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
                                Importando...
                            </>
                        ) : (
                            <>
                                <DownloadCloud className="mr-2 h-4 w-4" />
                                Importar {validCount} Lançamento(s)
                            </>
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
