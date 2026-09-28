import React, { useState, useRef } from 'react';
import * as XLSX from 'xlsx';
import { 
    Upload, 
    FileSpreadsheet, 
    CheckCircle2, 
    AlertTriangle, 
    XCircle, 
    Clock, 
    ArrowRight, 
    FileUp,
    Check,
    X,
    Calendar,
    Users
} from 'lucide-react';
import { 
    Dialog, 
    DialogContent, 
    DialogHeader, 
    DialogTitle, 
    DialogDescription,
    DialogFooter 
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import type { ColaboradorEscritorio, RhPontoRegistro } from '../types/escritorio';
import { salvarPontoBatch } from '../api/escritorioApi';

interface ImportarPontoModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    colaboradores: ColaboradorEscritorio[];
    onSuccess: () => void;
}

interface ParsedPontoPreview {
    timeclockCode: string;
    employeeNameFromFile: string;
    colaboradorId?: string;
    colaboradorNome?: string;
    data: string; // YYYY-MM-DD
    batidas: string[];
    horasTrabalhadas: number;
    minutosExtras: number;
    minutosAtraso: number;
    status: 'ok' | 'incompleto' | 'nao_encontrado';
}

export const ImportarPontoModal: React.FC<ImportarPontoModalProps> = ({
    open,
    onOpenChange,
    colaboradores,
    onSuccess,
}) => {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [fileName, setFileName] = useState<string | null>(null);
    const [parsing, setParsing] = useState(false);
    const [importing, setImporting] = useState(false);
    const [previewRecords, setPreviewRecords] = useState<ParsedPontoPreview[]>([]);
    const [stats, setStats] = useState({ ok: 0, incompleto: 0, naoEncontrado: 0 });

    // Maps para lookup rápido
    const codeToMemberMap = new Map<string, ColaboradorEscritorio>();
    const nameToMemberMap = new Map<string, ColaboradorEscritorio>();

    colaboradores.forEach(c => {
        if (c.timeclock_code) {
            codeToMemberMap.set(String(c.timeclock_code).trim(), c);
        }
        if (c.nombrecompleto) {
            nameToMemberMap.set(c.nombrecompleto.toLowerCase().trim(), c);
        }
    });

    const resetState = () => {
        setFileName(null);
        setPreviewRecords([]);
        setStats({ ok: 0, incompleto: 0, naoEncontrado: 0 });
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setFileName(file.name);
        setParsing(true);

        try {
            const buffer = await file.arrayBuffer();
            const workbook = XLSX.read(buffer, { type: 'array' });

            // Identifica se tem aba "Registro asistencia" (padrão biométrico)
            const targetSheetName = workbook.SheetNames.find(s => 
                s.toLowerCase().includes('registro asistencia') || 
                s.toLowerCase().includes('asistencia')
            ) || workbook.SheetNames[0];

            const sheet = workbook.Sheets[targetSheetName];
            const rawData: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1 });

            const parsed = parseSheetData(rawData);
            setPreviewRecords(parsed);

            let ok = 0;
            let inc = 0;
            let ne = 0;
            parsed.forEach(p => {
                if (p.status === 'ok') ok++;
                else if (p.status === 'incompleto') inc++;
                else ne++;
            });
            setStats({ ok, incompleto: inc, naoEncontrado: ne });
        } catch (err) {
            console.error('Erro ao processar planilha de ponto:', err);
            alert('Falha ao ler planilha. Verifique se o arquivo está no formato suportado (.xls, .xlsx).');
        } finally {
            setParsing(false);
        }
    };

    /**
     * Algoritmo de parsing para o relatório biométrico
     */
    const parseSheetData = (rows: any[][]): ParsedPontoPreview[] => {
        const results: ParsedPontoPreview[] = [];

        // 1. Tenta extrair intervalo de datas (ex: 25.09.2026 ~ 28.09.2026)
        let baseYear = new Date().getFullYear();
        let baseMonth = new Date().getMonth() + 1;

        for (let i = 0; i < Math.min(rows.length, 10); i++) {
            const rowStr = (rows[i] || []).join(' ');
            const match = rowStr.match(/(\d{2})\.(\d{2})\.(\d{4})/);
            if (match) {
                baseMonth = parseInt(match[2], 10);
                baseYear = parseInt(match[3], 10);
                break;
            }
        }

        let currentDaysHeader: number[] = [];

        for (let r = 0; r < rows.length; r++) {
            const row = rows[r];
            if (!row || row.length === 0) continue;

            // Detecta linha de dias do mês (ex: [25, 26, 27, 28] ou [1, 2, 3...])
            const numCount = row.filter((cell: any) => typeof cell === 'number' && cell >= 1 && cell <= 31).length;
            if (numCount >= 2 && numCount <= 31) {
                currentDaysHeader = row.map((c: any) => (typeof c === 'number' && c >= 1 && c <= 31 ? c : null));
                continue;
            }

            // Detecta linha de colaborador: "ID \t 1 \t Nombre \t Cristina Pena"
            const rowJoined = row.map(c => String(c || '')).join(' ');
            if (rowJoined.includes('ID') && (rowJoined.includes('Nombre') || rowJoined.includes('Dept'))) {
                let idStr = '';
                let nomeStr = '';

                for (let c = 0; c < row.length; c++) {
                    const val = String(row[c] || '').trim();
                    if (val.startsWith('ID') && row[c + 2]) {
                        idStr = String(row[c + 2]).trim();
                    } else if (val.startsWith('ID') && row[c + 1]) {
                        idStr = String(row[c + 1]).trim();
                    }

                    if (val.startsWith('Nombre') && row[c + 2]) {
                        nomeStr = String(row[c + 2]).trim();
                    } else if (val.startsWith('Nombre') && row[c + 1]) {
                        nomeStr = String(row[c + 1]).trim();
                    }
                }

                if (!idStr && !nomeStr) continue;

                // Encontra o colaborador no banco
                const member = codeToMemberMap.get(idStr) || 
                               nameToMemberMap.get(nomeStr.toLowerCase()) || 
                               colaboradores.find(c => c.nombrecompleto.toLowerCase().includes(nomeStr.toLowerCase().slice(0, 5)));

                // A próxima linha com dados contém as batidas por coluna de dia!
                let punchRowIndex = r + 1;
                while (punchRowIndex < rows.length && punchRowIndex <= r + 3) {
                    const pRow = rows[punchRowIndex];
                    if (pRow && pRow.some((cell: any) => typeof cell === 'string' && cell.includes(':'))) {
                        // Linha de batidas encontrada!
                        currentDaysHeader.forEach((dayNum, colIdx) => {
                            if (!dayNum) return;
                            const cellValue = pRow[colIdx];
                            if (!cellValue || typeof cellValue !== 'string') return;

                            // Quebra os horários por linha (ex: "07:23\n10:33\n10:47\n15:03\n")
                            const punches = cellValue
                                .split(/[\r\n]+/)
                                .map(s => s.trim())
                                .filter(s => /^\d{1,2}:\d{2}$/.test(s));

                            if (punches.length === 0) return;

                            const mesFmt = String(baseMonth).padStart(2, '0');
                            const diaFmt = String(dayNum).padStart(2, '0');
                            const dataFmt = `${baseYear}-${mesFmt}-${diaFmt}`;

                            // Calcula horas aproximadas
                            const { horas, minutosExtras, status } = calcularHorasDia(punches);

                            let finalStatus: 'ok' | 'incompleto' | 'nao_encontrado' = 'ok';
                            if (!member) {
                                finalStatus = 'nao_encontrado';
                            } else if (punches.length % 2 !== 0) {
                                finalStatus = 'incompleto';
                            }

                            results.push({
                                timeclockCode: idStr,
                                employeeNameFromFile: nomeStr,
                                colaboradorId: member?.id,
                                colaboradorNome: member?.nombrecompleto,
                                data: dataFmt,
                                batidas: punches,
                                horasTrabalhadas: horas,
                                minutosExtras,
                                minutosAtraso: 0,
                                status: finalStatus,
                            });
                        });
                        break;
                    }
                    punchRowIndex++;
                }
            }
        }

        return results;
    };

    /**
     * Calcula horas trabalhadas a partir dos pares de batidas
     */
    const calcularHorasDia = (punches: string[]) => {
        if (punches.length < 2) {
            return { horas: 0, minutosExtras: 0, status: 'incompleto' };
        }

        let totalMinutos = 0;
        for (let i = 0; i < punches.length - 1; i += 2) {
            const [h1, m1] = punches[i].split(':').map(Number);
            const [h2, m2] = punches[i + 1].split(':').map(Number);
            const t1 = h1 * 60 + m1;
            const t2 = h2 * 60 + m2;
            if (t2 > t1) {
                totalMinutos += (t2 - t1);
            }
        }

        const horas = Math.round((totalMinutos / 60) * 100) / 100;
        const jornadaPrevistaMin = 480; // 8 horas diárias
        const minutosExtras = Math.max(0, totalMinutos - jornadaPrevistaMin);

        return {
            horas,
            minutosExtras,
            status: 'ok',
        };
    };

    const handleConfirmarGravacao = async () => {
        const validos = previewRecords.filter(p => p.colaboradorId);
        if (validos.length === 0) {
            alert('Nenhum registro com colaborador identificado para salvar.');
            return;
        }

        setImporting(true);
        try {
            const batchPayload: Omit<RhPontoRegistro, 'id'>[] = validos.map(p => {
                return {
                    member_id: p.colaboradorId!,
                    data: p.data,
                    timeclock_code: p.timeclockCode,
                    batidas: p.batidas,
                    entrada_1: p.batidas[0] || null,
                    saida_1: p.batidas[1] || null,
                    entrada_2: p.batidas[2] || null,
                    saida_2: p.batidas[3] || null,
                    horas_trabalhadas: p.horasTrabalhadas,
                    horas_previstas: 8,
                    minutos_saldo: Math.round(p.horasTrabalhadas * 60) - 480,
                    minutos_atraso: p.minutosAtraso,
                    minutos_saida_antecipada: 0,
                    minutos_extras: p.minutosExtras,
                    status: p.status === 'incompleto' ? 'incompleto' : 'ok',
                    origem: 'importacao_relogio',
                    observacoes: `Importado de planilha: ${fileName}`,
                };
            });

            await salvarPontoBatch(batchPayload);
            alert(`Sucesso! ${validos.length} registros de ponto importados e gravados com sucesso!`);
            onOpenChange(false);
            resetState();
            onSuccess();
        } catch (error) {
            console.error('Erro ao gravar lote de ponto:', error);
            alert('Falha ao salvar registros no banco de dados.');
        } finally {
            setImporting(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col p-6">
                <DialogHeader className="pb-3 border-b border-slate-100 dark:border-slate-800">
                    <div className="flex items-center gap-2">
                        <span className="text-xs font-bold uppercase tracking-wider text-sky-600 bg-sky-50 dark:bg-sky-950 px-2 py-0.5 rounded">
                            Relógio Ponto Biométrico
                        </span>
                    </div>
                    <DialogTitle className="text-lg font-bold text-slate-900 dark:text-white mt-1">
                        Importador da Planilha de Ponto
                    </DialogTitle>
                    <DialogDescription className="text-xs text-slate-500">
                        Carregue o arquivo extraído do relógio (ex: <code className="bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded">Todos los informes 1.xls</code>). O sistema cruza os códigos biométricos com os colaboradores.
                    </DialogDescription>
                </DialogHeader>

                <div className="flex-1 overflow-y-auto space-y-4 py-3">
                    {/* Upload Dropzone */}
                    {!fileName ? (
                        <div 
                            onClick={() => fileInputRef.current?.click()}
                            className="border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-sky-500 rounded-2xl p-8 text-center cursor-pointer bg-slate-50/50 dark:bg-slate-900/50 transition-colors"
                        >
                            <input 
                                ref={fileInputRef} 
                                type="file" 
                                accept=".xls,.xlsx,.csv" 
                                className="hidden" 
                                onChange={handleFileSelect} 
                            />
                            <FileUp className="h-10 w-10 text-sky-600 mx-auto mb-3" />
                            <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">
                                Clique para selecionar a planilha de ponto
                            </h4>
                            <p className="text-xs text-slate-400 mt-1">
                                Formatos aceitos: .xls (Excel 97-2004), .xlsx ou .csv
                            </p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {/* Resumo do Arquivo e Estatísticas Semáforo */}
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50 dark:bg-slate-900/60 p-4 rounded-xl border border-slate-200 dark:border-slate-800">
                                <div className="flex items-center gap-3">
                                    <FileSpreadsheet className="h-8 w-8 text-emerald-600" />
                                    <div>
                                        <div className="font-bold text-sm text-slate-900 dark:text-white">
                                            {fileName}
                                        </div>
                                        <div className="text-xs text-slate-500">
                                            {previewRecords.length} batidas diárias identificadas
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-center gap-2">
                                    <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 text-xs font-semibold gap-1">
                                        <CheckCircle2 className="h-3 w-3" />
                                        {stats.ok} Reconhecidos
                                    </Badge>
                                    <Badge className="bg-amber-50 text-amber-700 border-amber-200 text-xs font-semibold gap-1">
                                        <AlertTriangle className="h-3 w-3" />
                                        {stats.incompleto} Ímpares/Incompletos
                                    </Badge>
                                    {stats.naoEncontrado > 0 && (
                                        <Badge className="bg-rose-50 text-rose-700 border-rose-200 text-xs font-semibold gap-1">
                                            <XCircle className="h-3 w-3" />
                                            {stats.naoEncontrado} Sem Vínculo
                                        </Badge>
                                    )}
                                </div>
                            </div>

                            {/* Tabela de Prévia Semáforo */}
                            <div className="rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
                                <Table>
                                    <TableHeader>
                                        <TableRow className="bg-slate-50 dark:bg-slate-900">
                                            <TableHead className="font-bold text-xs">Status</TableHead>
                                            <TableHead className="font-bold text-xs">ID Relógio</TableHead>
                                            <TableHead className="font-bold text-xs">Colaborador Vinculado</TableHead>
                                            <TableHead className="font-bold text-xs">Data</TableHead>
                                            <TableHead className="font-bold text-xs">Batidas Detectadas</TableHead>
                                            <TableHead className="font-bold text-xs text-right">Horas</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {previewRecords.slice(0, 50).map((record, idx) => (
                                            <TableRow key={idx}>
                                                <TableCell>
                                                    {record.status === 'ok' && (
                                                        <span className="flex items-center gap-1 text-[11px] font-semibold text-emerald-600">
                                                            <span className="h-2 w-2 rounded-full bg-emerald-500" />
                                                            OK
                                                        </span>
                                                    )}
                                                    {record.status === 'incompleto' && (
                                                        <span className="flex items-center gap-1 text-[11px] font-semibold text-amber-600">
                                                            <span className="h-2 w-2 rounded-full bg-amber-500" />
                                                            Incompleto
                                                        </span>
                                                    )}
                                                    {record.status === 'nao_encontrado' && (
                                                        <span className="flex items-center gap-1 text-[11px] font-semibold text-rose-600">
                                                            <span className="h-2 w-2 rounded-full bg-rose-500" />
                                                            Não Mapeado
                                                        </span>
                                                    )}
                                                </TableCell>
                                                <TableCell className="font-mono text-xs font-bold">
                                                    #{record.timeclockCode}
                                                </TableCell>
                                                <TableCell>
                                                    <div className="font-semibold text-xs text-slate-800 dark:text-slate-200">
                                                        {record.colaboradorNome || record.employeeNameFromFile}
                                                    </div>
                                                </TableCell>
                                                <TableCell className="text-xs">
                                                    {record.data}
                                                </TableCell>
                                                <TableCell>
                                                    <div className="flex gap-1 flex-wrap font-mono text-[11px]">
                                                        {record.batidas.map((b, bIdx) => (
                                                            <span key={bIdx} className="bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded text-slate-700 dark:text-slate-300">
                                                                {b}
                                                            </span>
                                                        ))}
                                                    </div>
                                                </TableCell>
                                                <TableCell className="text-right font-bold text-xs text-slate-900 dark:text-white">
                                                    {record.horasTrabalhadas}h
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                                {previewRecords.length > 50 && (
                                    <div className="p-2 text-center text-xs text-slate-400 bg-slate-50 dark:bg-slate-900">
                                        Exibindo primeiras 50 de {previewRecords.length} batidas identificadas.
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>

                <DialogFooter className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between sm:justify-between w-full">
                    {fileName ? (
                        <Button variant="ghost" size="sm" onClick={resetState} className="text-xs">
                            Trocar Arquivo
                        </Button>
                    ) : <div />}

                    <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm" onClick={() => onOpenChange(false)} className="text-xs">
                            Cancelar
                        </Button>
                        <Button 
                            size="sm" 
                            disabled={!fileName || previewRecords.length === 0 || importing}
                            onClick={handleConfirmarGravacao}
                            className="bg-sky-600 hover:bg-sky-700 text-white font-semibold text-xs gap-1.5 shadow-sm"
                        >
                            <Check className="h-3.5 w-3.5" />
                            {importing ? 'Gravando no Banco...' : `Confirmar e Gravar ${previewRecords.filter(p => p.colaboradorId).length} Registros`}
                        </Button>
                    </div>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};
