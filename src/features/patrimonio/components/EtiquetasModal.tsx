import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { QRCodeSVG } from 'qrcode.react';
import { gerarEtiquetasPdf } from '../utils/etiquetasPdf';
import type { AtivoPatrimonio } from '../types/patrimonio';
import { useEmpresas } from '@/shared/hooks/useEmpresas';
import { Printer, Download, Tag, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface EtiquetasModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    ativos: AtivoPatrimonio[];
}

export function EtiquetasModal({ open, onOpenChange, ativos }: EtiquetasModalProps) {
    const { data: empresas = [], isLoading: loadingEmpresas } = useEmpresas();
    const [formato, setFormato] = useState<'termica_40x20' | 'termica_50x30' | 'a4_grade'>('termica_40x20');
    const [empresaCabecalho, setEmpresaCabecalho] = useState('');
    const [gerandoPdf, setGerandoPdf] = useState(false);

    const ativoExemplo = ativos[0];

    useEffect(() => {
        if (!open) return;
        const ativoPrincipal = ativos[0];
        if (ativoPrincipal) {
            // Se o ativo tem empresa_proprietaria definida
            if (ativoPrincipal.empresa_proprietaria) {
                // Tenta casar com uma empresa cadastrada no grupo
                const emp = empresas.find(e => 
                    e.nome.toLowerCase() === ativoPrincipal.empresa_proprietaria?.toLowerCase() ||
                    e.codigo.toLowerCase() === ativoPrincipal.empresa_proprietaria?.toLowerCase() ||
                    (ativoPrincipal.empresa_id && e.id === ativoPrincipal.empresa_id)
                );
                setEmpresaCabecalho(emp ? emp.nome.toUpperCase() : ativoPrincipal.empresa_proprietaria.toUpperCase());
                return;
            }
            if (ativoPrincipal.empresa_id && empresas.length > 0) {
                const emp = empresas.find(e => e.id === ativoPrincipal.empresa_id);
                if (emp) {
                    setEmpresaCabecalho(emp.nome.toUpperCase());
                    return;
                }
            }
        }
        if (empresas.length > 0) {
            setEmpresaCabecalho(empresas[0].nome.toUpperCase());
        }
    }, [open, ativos, empresas]);

    const handleImprimir = async () => {
        if (!ativos || ativos.length === 0) return;
        setGerandoPdf(true);
        try {
            const pdfDoc = await gerarEtiquetasPdf(ativos, {
                formato,
                empresaCabecalho,
            });

            // Abre janela de impressão direta ou baixa
            pdfDoc.autoPrint();
            const blobUrl = pdfDoc.output('bloburl');
            window.open(blobUrl, '_blank');
            toast.success(`${ativos.length} etiqueta(s) gerada(s) com sucesso!`);
            onOpenChange(false);
        } catch (e: any) {
            console.error('Erro ao gerar PDF de etiquetas:', e);
            toast.error('Erro ao gerar arquivo de etiquetas.');
        } finally {
            setGerandoPdf(false);
        }
    };

    const handleDownload = async () => {
        if (!ativos || ativos.length === 0) return;
        setGerandoPdf(true);
        try {
            const pdfDoc = await gerarEtiquetasPdf(ativos, {
                formato,
                empresaCabecalho,
            });
            pdfDoc.save(`etiquetas_patrimonio_${ativos.length}_itens.pdf`);
            toast.success(`Download concluído!`);
            onOpenChange(false);
        } catch (e: any) {
            console.error('Erro ao baixar PDF:', e);
            toast.error('Falha ao baixar PDF das etiquetas.');
        } finally {
            setGerandoPdf(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-base font-semibold">
                        <Tag className="h-5 w-5 text-sky-600" />
                        Imprimir Etiquetas com QR Code
                    </DialogTitle>
                    <DialogDescription className="text-xs text-slate-500">
                        {ativos.length === 1
                            ? `Gerando etiqueta para o item ${ativoExemplo?.codigo_patrimonial}`
                            : `Gerando lote com ${ativos.length} etiquetas selecionadas`}
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-2">
                    {/* Pré-visualização da etiqueta 40x20 */}
                    <div className="flex flex-col items-center justify-center p-4 bg-slate-100 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700">
                        <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-2">
                            Prévia da Etiqueta ({formato === 'termica_40x20' ? '40 × 20 mm' : formato === 'termica_50x30' ? '50 × 30 mm' : 'Folha Grade A4'})
                        </p>

                        {ativoExemplo && (
                            <div className="w-[200px] h-[100px] bg-white rounded border border-slate-300 shadow-sm p-2 flex flex-col justify-between select-none">
                                <div className="text-[9px] font-bold text-slate-900 tracking-tight leading-none truncate">
                                    {empresaCabecalho}
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className="p-0.5 border border-slate-200 rounded">
                                        <QRCodeSVG
                                            value={`${window.location.origin}/patrimonio/${ativoExemplo.codigo_patrimonial}`}
                                            size={48}
                                            level="M"
                                        />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <span className="block font-black text-sky-600 text-[10px] leading-tight">
                                            {ativoExemplo.codigo_patrimonial}
                                        </span>
                                        <span className="block text-[8px] font-medium text-slate-800 truncate">
                                            {ativoExemplo.descricao}
                                        </span>
                                        <span className="block text-[7px] text-slate-500 truncate">
                                            {ativoExemplo.marca || ativoExemplo.categoria}
                                        </span>
                                        <span className="block text-[6.5px] text-slate-400 mt-0.5 truncate">
                                            {ativoExemplo.imei || ativoExemplo.numero_serie || 'CONTROLE INTERNO'}
                                        </span>
                                    </div>
                                </div>
                                <div className="text-[6px] text-slate-400 text-center tracking-wider uppercase truncate">
                                    Patrimônio • {empresaCabecalho || 'Mastercorp'}
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                            <Label className="text-xs font-medium">Formato de Saída</Label>
                            <Select value={formato} onValueChange={(val: any) => setFormato(val)}>
                                <SelectTrigger className="h-9 text-xs">
                                    <SelectValue placeholder="Selecione o formato" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="termica_40x20">Térmica 40 × 20 mm (Padrão)</SelectItem>
                                    <SelectItem value="termica_50x30">Térmica 50 × 30 mm</SelectItem>
                                    <SelectItem value="a4_grade">Grade em Folha A4 (Pimaco / Laser)</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-1.5">
                            <Label className="text-xs font-medium">Cabeçalho (Empresa do Grupo)</Label>
                            <Select value={empresaCabecalho} onValueChange={setEmpresaCabecalho}>
                                <SelectTrigger className="h-9 text-xs">
                                    <SelectValue placeholder={loadingEmpresas ? "Carregando..." : "Selecione a empresa..."} />
                                </SelectTrigger>
                                <SelectContent>
                                    {empresas.map((emp) => {
                                        const valorEmp = emp.nome.toUpperCase();
                                        return (
                                            <SelectItem key={emp.id} value={valorEmp}>
                                                <div className="flex items-center gap-1.5">
                                                    <span className="font-bold font-mono text-[10px] text-sky-600 dark:text-sky-400">
                                                        [{emp.codigo}]
                                                    </span>
                                                    <span>{emp.nome}</span>
                                                </div>
                                            </SelectItem>
                                        );
                                    })}
                                    <SelectItem value="GRUPO MASTERCORP">
                                        <span className="font-semibold text-slate-700 dark:text-slate-300">GRUPO MASTERCORP</span>
                                    </SelectItem>
                                    {empresaCabecalho &&
                                     empresaCabecalho !== 'GRUPO MASTERCORP' &&
                                     !empresas.some(e => e.nome.toUpperCase() === empresaCabecalho.toUpperCase()) && (
                                        <SelectItem value={empresaCabecalho}>
                                            {empresaCabecalho}
                                        </SelectItem>
                                    )}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                </div>

                <DialogFooter className="gap-2 sm:gap-0">
                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={gerandoPdf}
                        onClick={handleDownload}
                        className="gap-1.5 text-xs"
                    >
                        <Download className="h-3.5 w-3.5" /> Baixar PDF
                    </Button>
                    <Button
                        type="button"
                        size="sm"
                        disabled={gerandoPdf}
                        onClick={handleImprimir}
                        className="gap-1.5 text-xs bg-sky-600 hover:bg-sky-700 text-white"
                    >
                        {gerandoPdf ? (
                            <>
                                <Loader2 className="h-3.5 w-3.5 animate-spin" /> Gerando...
                            </>
                        ) : (
                            <>
                                <Printer className="h-3.5 w-3.5" /> Imprimir Agora
                            </>
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
