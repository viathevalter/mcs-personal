import { useState, useEffect, useRef } from 'react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import { useNavigate } from 'react-router-dom';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { obterAtivoPorCodigo } from '../api/patrimonioApi';
import type { AtivoPatrimonio } from '../types/patrimonio';
import { STATUS_CONFIG } from '../types/patrimonio';
import { 
    Camera, 
    CheckCircle2, 
    ArrowRight, 
    UserCheck, 
    RotateCcw, 
    Wrench, 
    RefreshCw, 
    AlertCircle, 
    Loader2, 
    ExternalLink,
    X
} from 'lucide-react';
import { toast } from 'sonner';

interface QrScannerModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSelectAtivoParaAcao?: (ativo: AtivoPatrimonio, acao: 'consultar' | 'entregar' | 'devolver' | 'transferir' | 'manutencao') => void;
}

export function QrScannerModal({ open, onOpenChange, onSelectAtivoParaAcao }: QrScannerModalProps) {
    const navigate = useNavigate();
    const [scannerAtivo, setScannerAtivo] = useState(false);
    const [loadingAtivo, setLoadingAtivo] = useState(false);
    const [ativoEncontrado, setAtivoEncontrado] = useState<AtivoPatrimonio | null>(null);
    const [erroCamera, setErroCamera] = useState<string | null>(null);
    const html5QrCodeRef = useRef<Html5Qrcode | null>(null);
    const scannerElementId = 'qr-reader-container';

    useEffect(() => {
        if (!open) {
            pararCamera();
            setAtivoEncontrado(null);
            setErroCamera(null);
            return;
        }

        // Aguarda render do elemento do DOM para iniciar a câmera
        const timer = setTimeout(() => {
            iniciarCamera();
        }, 300);

        return () => {
            clearTimeout(timer);
            pararCamera();
        };
    }, [open]);

    const iniciarCamera = async () => {
        try {
            setErroCamera(null);
            setScannerAtivo(true);

            if (!html5QrCodeRef.current) {
                html5QrCodeRef.current = new Html5Qrcode(scannerElementId, {
                    formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE],
                    verbose: false,
                });
            }

            const qrCodeSuccessCallback = async (decodedText: string) => {
                // Para câmera ao encontrar
                await pararCamera();

                // Extrai código do texto (pode vir como 'MOB-000245' ou 'https://.../patrimonio/MOB-000245')
                let codigo = decodedText.trim();
                if (codigo.includes('/patrimonio/')) {
                    const partes = codigo.split('/patrimonio/');
                    codigo = partes[partes.length - 1].split('?')[0].split('#')[0];
                }

                processarCodigoPatrimonio(codigo);
            };

            await html5QrCodeRef.current.start(
                { facingMode: 'environment' }, // Usa câmera traseira em celulares
                {
                    fps: 10,
                    qrbox: { width: 240, height: 240 },
                    aspectRatio: 1.0,
                },
                qrCodeSuccessCallback,
                () => {} // Ignora falhas de frame sem QR
            );
        } catch (err: any) {
            console.error('Falha ao iniciar câmera:', err);
            setScannerAtivo(false);
            setErroCamera(err?.message || 'Não foi possível acessar a câmera. Verifique as permissões do navegador.');
        }
    };

    const pararCamera = async () => {
        if (html5QrCodeRef.current && html5QrCodeRef.current.isScanning) {
            try {
                await html5QrCodeRef.current.stop();
            } catch (e) {
                console.warn('Erro ao parar câmera:', e);
            }
        }
        setScannerAtivo(false);
    };

    const processarCodigoPatrimonio = async (codigo: string) => {
        setLoadingAtivo(true);
        try {
            const ativo = await obterAtivoPorCodigo(codigo);
            if (ativo) {
                setAtivoEncontrado(ativo);
                toast.success(`Patrimônio ${ativo.codigo_patrimonial} identificado!`);
            } else {
                toast.error(`Patrimônio com código "${codigo}" não encontrado no sistema.`);
                setErroCamera(`Nenhum ativo localizado com o código: ${codigo}`);
            }
        } catch (e: any) {
            toast.error('Erro ao buscar informações do ativo.');
        } finally {
            setLoadingAtivo(false);
        }
    };

    const handleAcao = (acao: 'consultar' | 'entregar' | 'devolver' | 'transferir' | 'manutencao') => {
        if (!ativoEncontrado) return;
        
        if (acao === 'consultar') {
            onOpenChange(false);
            navigate(`/patrimonio/${ativoEncontrado.codigo_patrimonial}`);
        } else if (onSelectAtivoParaAcao) {
            onSelectAtivoParaAcao(ativoEncontrado, acao);
            onOpenChange(false);
        } else {
            navigate(`/patrimonio/${ativoEncontrado.codigo_patrimonial}?acao=${acao}`);
            onOpenChange(false);
        }
    };

    const reiniciarLeitura = () => {
        setAtivoEncontrado(null);
        setErroCamera(null);
        iniciarCamera();
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md p-0 overflow-hidden bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
                <DialogHeader className="p-4 pb-2 border-b border-slate-100 dark:border-slate-800">
                    <div className="flex items-center justify-between">
                        <DialogTitle className="flex items-center gap-2 text-base font-semibold text-slate-900 dark:text-white">
                            <Camera className="h-5 w-5 text-sky-600" />
                            Leitor de QR Code Patrimonial
                        </DialogTitle>
                    </div>
                    <DialogDescription className="text-xs text-slate-500">
                        Aponte a câmera para a etiqueta do equipamento para consulta ou ação rápida.
                    </DialogDescription>
                </DialogHeader>

                <div className="p-4 space-y-4">
                    {!ativoEncontrado ? (
                        <div>
                            {/* Área do Scanner de Vídeo */}
                            <div className="relative rounded-xl overflow-hidden bg-slate-950 aspect-square flex items-center justify-center border-2 border-dashed border-slate-300 dark:border-slate-700">
                                <div id={scannerElementId} className="w-full h-full" />
                                
                                {loadingAtivo && (
                                    <div className="absolute inset-0 bg-black/70 flex flex-col items-center justify-center text-white gap-2">
                                        <Loader2 className="h-8 w-8 animate-spin text-sky-400" />
                                        <span className="text-sm font-medium">Buscando cadastro...</span>
                                    </div>
                                )}

                                {erroCamera && (
                                    <div className="absolute inset-0 bg-slate-900/90 p-6 flex flex-col items-center justify-center text-center text-white gap-3">
                                        <AlertCircle className="h-10 w-10 text-rose-400" />
                                        <p className="text-sm font-medium text-rose-200">{erroCamera}</p>
                                        <Button size="sm" variant="outline" onClick={reiniciarLeitura} className="gap-2">
                                            <RefreshCw className="h-4 w-4" /> Tentar Novamente
                                        </Button>
                                    </div>
                                )}
                            </div>

                            {/* Digitação manual alternativa */}
                            <div className="mt-3 text-center">
                                <p className="text-xs text-slate-500 mb-1.5">Ou digite o código manualmente:</p>
                                <form
                                    onSubmit={(e) => {
                                        e.preventDefault();
                                        const input = (e.currentTarget.elements.namedItem('manualCode') as HTMLInputElement).value;
                                        if (input) processarCodigoPatrimonio(input);
                                    }}
                                    className="flex gap-2"
                                >
                                    <input
                                        name="manualCode"
                                        placeholder="Ex: MOB-000245"
                                        className="flex-1 uppercase text-sm px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-transparent"
                                    />
                                    <Button type="submit" size="sm" className="bg-sky-600 hover:bg-sky-700 text-white">
                                        Buscar
                                    </Button>
                                </form>
                            </div>
                        </div>
                    ) : (
                        /* Painel de Equipamento Identificado & Ações Rápidas */
                        <div className="space-y-4 animate-in fade-in duration-200">
                            <div className="flex gap-3 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
                                {ativoEncontrado.foto_principal_url ? (
                                    <img
                                        src={ativoEncontrado.foto_principal_url}
                                        alt={ativoEncontrado.descricao}
                                        className="h-16 w-16 rounded-lg object-cover border border-slate-200 dark:border-slate-700 shrink-0"
                                    />
                                ) : (
                                    <div className="h-16 w-16 rounded-lg bg-sky-100 dark:bg-sky-950 flex items-center justify-center text-sky-600 font-bold text-lg shrink-0">
                                        {ativoEncontrado.categoria.substring(0, 2).toUpperCase()}
                                    </div>
                                )}

                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                        <span className="font-bold text-sky-700 dark:text-sky-400 text-sm">
                                            {ativoEncontrado.codigo_patrimonial}
                                        </span>
                                        <Badge
                                            variant="outline"
                                            className={`text-[10px] px-1.5 py-0 ${STATUS_CONFIG[ativoEncontrado.status]?.color} ${STATUS_CONFIG[ativoEncontrado.status]?.bg}`}
                                        >
                                            {STATUS_CONFIG[ativoEncontrado.status]?.label || ativoEncontrado.status}
                                        </Badge>
                                    </div>
                                    <h4 className="text-sm font-semibold text-slate-900 dark:text-white truncate">
                                        {ativoEncontrado.descricao}
                                    </h4>
                                    <p className="text-xs text-slate-500 truncate">
                                        {[ativoEncontrado.marca, ativoEncontrado.modelo].filter(Boolean).join(' ') || ativoEncontrado.categoria}
                                    </p>
                                    <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                                        👤 <strong>{ativoEncontrado.responsavel_nome || 'Disponível no Armazém'}</strong>
                                        {ativoEncontrado.projeto && ` • Projeto ${ativoEncontrado.projeto}`}
                                    </p>
                                </div>
                            </div>

                            {/* Menu de Ações Rápidas */}
                            <div className="space-y-1.5">
                                <p className="text-xs font-semibold uppercase text-slate-400 tracking-wider">
                                    Ações Rápidas para este Equipamento:
                                </p>

                                <Button
                                    onClick={() => handleAcao('consultar')}
                                    variant="outline"
                                    className="w-full justify-between text-sm h-10 border-slate-200 dark:border-slate-800"
                                >
                                    <span className="flex items-center gap-2">
                                        <ExternalLink className="h-4 w-4 text-sky-600" /> Consultar Ficha Completa
                                    </span>
                                    <ArrowRight className="h-4 w-4 text-slate-400" />
                                </Button>

                                {ativoEncontrado.status !== 'em_uso' && (
                                    <Button
                                        onClick={() => handleAcao('entregar')}
                                        className="w-full justify-between text-sm h-10 bg-emerald-600 hover:bg-emerald-700 text-white"
                                    >
                                        <span className="flex items-center gap-2">
                                            <UserCheck className="h-4 w-4" /> Entregar a Funcionário
                                        </span>
                                        <ArrowRight className="h-4 w-4 text-emerald-200" />
                                    </Button>
                                )}

                                {ativoEncontrado.status === 'em_uso' && (
                                    <>
                                        <Button
                                            onClick={() => handleAcao('devolver')}
                                            className="w-full justify-between text-sm h-10 bg-amber-600 hover:bg-amber-700 text-white"
                                        >
                                            <span className="flex items-center gap-2">
                                                <RotateCcw className="h-4 w-4" /> Registrar Devolução
                                            </span>
                                            <ArrowRight className="h-4 w-4 text-amber-200" />
                                        </Button>

                                        <Button
                                            onClick={() => handleAcao('transferir')}
                                            variant="outline"
                                            className="w-full justify-between text-sm h-10 border-slate-200 dark:border-slate-800"
                                        >
                                            <span className="flex items-center gap-2">
                                                <RefreshCw className="h-4 w-4 text-blue-600" /> Transferir de Projeto / Local
                                            </span>
                                            <ArrowRight className="h-4 w-4 text-slate-400" />
                                        </Button>
                                    </>
                                )}

                                <Button
                                    onClick={() => handleAcao('manutencao')}
                                    variant="outline"
                                    className="w-full justify-between text-sm h-10 border-slate-200 dark:border-slate-800 text-rose-600 hover:text-rose-700 hover:bg-rose-50"
                                >
                                    <span className="flex items-center gap-2">
                                        <Wrench className="h-4 w-4" /> Enviar para Manutenção / Oficina
                                    </span>
                                    <ArrowRight className="h-4 w-4 text-slate-400" />
                                </Button>
                            </div>

                            <div className="pt-2 flex justify-between border-t border-slate-100 dark:border-slate-800">
                                <Button size="sm" variant="ghost" onClick={reiniciarLeitura} className="gap-1.5 text-xs">
                                    <Camera className="h-3.5 w-3.5" /> Escanear Outro
                                </Button>
                                <Button size="sm" variant="ghost" onClick={() => onOpenChange(false)} className="text-xs">
                                    Fechar
                                </Button>
                            </div>
                        </div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}
