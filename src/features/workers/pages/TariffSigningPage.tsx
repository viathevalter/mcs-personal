import React, { useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { 
    getTariffAuthorizationByToken, 
    approveAndApplyTariffAuthorization, 
    type TariffAuthorizationRequest 
} from '../api/tariffGovernanceApi';
import { Loader2, FileText, CheckCircle2, Lock, Smartphone, ShieldCheck, PenTool, Building2, UserCheck, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';

export function TariffSigningPage() {
    const { token } = useParams<{ token: string }>();
    const canvasRef = useRef<HTMLCanvasElement>(null);

    const [request, setRequest] = useState<TariffAuthorizationRequest | null>(null);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [success, setSuccess] = useState(false);

    // Canvas drawing state
    const [isDrawing, setIsDrawing] = useState(false);
    const [hasSigned, setHasSigned] = useState(false);
    const [signerName, setSignerName] = useState('');

    useEffect(() => {
        if (!token) {
            setLoading(false);
            return;
        }

        async function load() {
            try {
                const data = await getTariffAuthorizationByToken(token!);
                if (data) {
                    setRequest(data);
                    setSignerName(data.gerente_nome || '');
                    if (data.status === 'APROVADO') {
                        setSuccess(true);
                    }
                }
            } catch (err) {
                console.error("Error loading tariff authorization request:", err);
            } finally {
                setLoading(false);
            }
        }

        load();
    }, [token]);

    // Canvas Drawing Handlers
    const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        setIsDrawing(true);
        const rect = canvas.getBoundingClientRect();
        const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
        const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
        ctx.beginPath();
        ctx.moveTo(clientX - rect.left, clientY - rect.top);
    };

    const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
        if (!isDrawing) return;
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const rect = canvas.getBoundingClientRect();
        const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
        const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
        ctx.lineTo(clientX - rect.left, clientY - rect.top);
        ctx.strokeStyle = '#1e1b4b';
        ctx.lineWidth = 2.5;
        ctx.lineCap = 'round';
        ctx.stroke();
        setHasSigned(true);
    };

    const stopDrawing = () => {
        setIsDrawing(false);
    };

    const clearCanvas = () => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        setHasSigned(false);
    };

    const handleApprove = async () => {
        if (!request || !token) return;
        if (!hasSigned) {
            toast.error("Por favor, desenhe sua assinatura digital antes de confirmar.");
            return;
        }

        const canvas = canvasRef.current;
        const signatureBase64 = canvas ? canvas.toDataURL('image/png') : '';

        setSubmitting(true);
        try {
            await approveAndApplyTariffAuthorization({
                token,
                assinaturaBase64
            });
            setSuccess(true);
            toast.success("Autorização de tarifa registrada e aplicada com sucesso!");
        } catch (err: any) {
            console.error("Failed to approve tariff authorization:", err);
            toast.error(err.message || "Erro ao processar assinatura de autorização.");
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-4">
                <div className="flex flex-col items-center gap-3">
                    <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
                    <span className="text-sm font-medium text-slate-600 dark:text-slate-400">Carregando Termo de Autorização...</span>
                </div>
            </div>
        );
    }

    if (!request) {
        return (
            <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-4">
                <Card className="max-w-md w-full border-red-200">
                    <CardHeader className="text-center">
                        <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-2" />
                        <CardTitle className="text-red-700">Solicitação Não Encontrada</CardTitle>
                        <CardDescription>
                            O link de autorização informado é inválido ou expirou. Por favor, solicite a emissão de um novo termo.
                        </CardDescription>
                    </CardHeader>
                </Card>
            </div>
        );
    }

    if (success) {
        return (
            <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-4">
                <Card className="max-w-xl w-full border-emerald-200 shadow-xl bg-white dark:bg-slate-900">
                    <CardHeader className="text-center pb-4">
                        <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-950 rounded-full flex items-center justify-center mx-auto mb-3">
                            <CheckCircle2 className="w-10 h-10 text-emerald-600 dark:text-emerald-400" />
                        </div>
                        <Badge variant="outline" className="w-fit mx-auto border-emerald-500 text-emerald-700 bg-emerald-50 mb-2">
                            Aprovado & Aplicado em Produção
                        </Badge>
                        <CardTitle className="text-2xl font-bold text-slate-900 dark:text-white">
                            Termo de Autorização Assinado
                        </CardTitle>
                        <CardDescription className="text-xs">
                            Código do Termo: <span className="font-mono font-bold text-indigo-600">{request.codigo_termo}</span>
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4 text-sm">
                        <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-lg border space-y-2 text-xs">
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">Solicitado Por:</span>
                                <span className="font-semibold text-slate-900 dark:text-white">{request.solicitante_nome}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">Autorizado Por:</span>
                                <span className="font-semibold text-emerald-700 dark:text-emerald-400">{request.gerente_nome}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">Data da Assinatura:</span>
                                <span className="font-semibold">{new Date().toLocaleString('pt-BR')}</span>
                            </div>
                        </div>

                        <p className="text-xs text-center text-muted-foreground">
                            As tarifas dos trabalhadores listados foram atualizadas automaticamente na folha de pagamento do sistema MCS.
                        </p>
                    </CardContent>
                </Card>
            </div>
        );
    }

    const items = request.itens_solicitacao || [];

    return (
        <div className="min-h-screen bg-slate-100 dark:bg-slate-950 py-8 px-4 sm:px-6">
            <div className="max-w-3xl mx-auto space-y-6">
                {/* Header Card */}
                <Card className="border-indigo-100 shadow-md bg-white dark:bg-slate-900">
                    <CardHeader className="border-b bg-indigo-900 text-white rounded-t-xl p-6">
                        <div className="flex justify-between items-start gap-4">
                            <div>
                                <div className="flex items-center gap-2 mb-1">
                                    <ShieldCheck className="w-5 h-5 text-indigo-300" />
                                    <span className="text-xs font-mono tracking-wider text-indigo-200 uppercase">Termo Eletrônico de Autorização</span>
                                </div>
                                <h1 className="text-2xl font-bold">Autorização de Tarifas Horárias</h1>
                                <p className="text-xs text-indigo-200 mt-1">
                                    Documento auditável de reajuste de tarifas de remuneração de colaboradores
                                </p>
                            </div>
                            <Badge className="bg-amber-500 hover:bg-amber-600 text-white border-0 font-mono text-xs px-3 py-1">
                                {request.codigo_termo}
                            </Badge>
                        </div>
                    </CardHeader>

                    <CardContent className="p-6 space-y-6">
                        {/* Governance Details */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                            <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-lg border space-y-1">
                                <span className="text-muted-foreground uppercase font-semibold text-[10px]">Solicitante</span>
                                <div className="font-bold text-slate-900 dark:text-white text-sm flex items-center gap-2">
                                    <UserCheck className="w-4 h-4 text-indigo-600" />
                                    {request.solicitante_nome}
                                </div>
                            </div>
                            <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-lg border space-y-1">
                                <span className="text-muted-foreground uppercase font-semibold text-[10px]">Gerente Autorizador</span>
                                <div className="font-bold text-slate-900 dark:text-white text-sm flex items-center gap-2">
                                    <ShieldCheck className="w-4 h-4 text-emerald-600" />
                                    {request.gerente_nome}
                                </div>
                            </div>
                        </div>

                        {request.motivo_alteracao && (
                            <div className="p-3 bg-indigo-50/50 dark:bg-indigo-950/30 rounded-lg border border-indigo-100 text-xs space-y-1">
                                <span className="font-semibold text-indigo-900 dark:text-indigo-300">Justificativa do Reajuste:</span>
                                <p className="text-slate-700 dark:text-slate-300 italic">{request.motivo_alteracao}</p>
                            </div>
                        )}

                        {/* Workers Tally Table */}
                        <div className="space-y-2">
                            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                                Trabalhadores e Tarifas Solicitadas ({items.length})
                            </h3>
                            <div className="border rounded-lg overflow-hidden bg-white dark:bg-slate-900">
                                <Table>
                                    <TableHeader className="bg-slate-50 dark:bg-slate-800">
                                        <TableRow>
                                            <TableHead className="text-xs font-bold">Trabalhador</TableHead>
                                            <TableHead className="text-xs font-bold">Cliente</TableHead>
                                            <TableHead className="text-xs font-bold text-right">Tarifa Atual</TableHead>
                                            <TableHead className="text-xs font-bold text-right text-indigo-700 dark:text-indigo-400">Nova Tarifa</TableHead>
                                            <TableHead className="text-xs font-bold text-right">Variação</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {items.map((item, idx) => {
                                            const diff = item.tarifa_nova - item.tarifa_anterior;
                                            const pct = item.tarifa_anterior > 0 ? (diff / item.tarifa_anterior) * 100 : 100;

                                            return (
                                                <TableRow key={idx} className="text-xs">
                                                    <TableCell className="font-semibold">
                                                        <div>{item.worker_nome}</div>
                                                        {item.cod_colab && <span className="text-[10px] text-muted-foreground font-mono">Cód: {item.cod_colab}</span>}
                                                    </TableCell>
                                                    <TableCell className="text-slate-600 dark:text-slate-300">
                                                        {item.cliente_nombre || '-'}
                                                    </TableCell>
                                                    <TableCell className="text-right font-mono text-slate-500">
                                                        € {Number(item.tarifa_anterior).toFixed(2)} / h
                                                    </TableCell>
                                                    <TableCell className="text-right font-mono font-bold text-indigo-700 dark:text-indigo-400">
                                                        € {Number(item.tarifa_nova).toFixed(2)} / h
                                                    </TableCell>
                                                    <TableCell className="text-right font-mono text-xs">
                                                        <span className={diff >= 0 ? 'text-emerald-600 font-semibold' : 'text-red-600 font-semibold'}>
                                                            {diff >= 0 ? '+' : ''}€ {diff.toFixed(2)} ({pct > 0 ? '+' : ''}{pct.toFixed(1)}%)
                                                        </span>
                                                    </TableCell>
                                                </TableRow>
                                            );
                                        })}
                                    </TableBody>
                                </Table>
                            </div>
                        </div>

                        {/* Signature Canvas Box */}
                        <div className="space-y-3 pt-4 border-t">
                            <div className="flex justify-between items-center">
                                <Label className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                                    <PenTool className="w-4 h-4 text-indigo-600" />
                                    Assinatura Digital do Gerente
                                </Label>
                                {hasSigned && (
                                    <Button variant="ghost" size="sm" onClick={clearCanvas} className="h-6 text-xs text-red-600 hover:text-red-700">
                                        Limpar Assinatura
                                    </Button>
                                )}
                            </div>

                            <div className="border-2 border-dashed border-indigo-200 dark:border-indigo-900 rounded-lg p-2 bg-slate-50 dark:bg-slate-900 text-center relative">
                                <canvas
                                    ref={canvasRef}
                                    width={600}
                                    height={160}
                                    className="w-full h-40 touch-none cursor-crosshair bg-white dark:bg-slate-950 rounded border"
                                    onMouseDown={startDrawing}
                                    onMouseMove={draw}
                                    onMouseUp={stopDrawing}
                                    onMouseLeave={stopDrawing}
                                    onTouchStart={startDrawing}
                                    onTouchMove={draw}
                                    onTouchEnd={stopDrawing}
                                />
                                {!hasSigned && (
                                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none text-slate-400 text-xs font-medium">
                                        Desenhe sua assinatura com o mouse ou toque na tela aqui
                                    </div>
                                )}
                            </div>

                            <div className="text-[11px] text-muted-foreground italic flex items-center gap-1.5">
                                <Lock className="w-3.5 h-3.5 text-indigo-500" />
                                Ao assinar eletronicamente, você autoriza formalmente a atualização das tarifas listadas para a folha de pagamento MCS.
                            </div>
                        </div>

                        <Button 
                            className="w-full h-11 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm shadow-lg"
                            disabled={submitting || !hasSigned}
                            onClick={handleApprove}
                        >
                            {submitting ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Registrando Autorização...
                                </>
                            ) : (
                                <>
                                    <CheckCircle2 className="mr-2 h-5 w-5" />
                                    Autorizar e Assinar Eletronicamente
                                </>
                            )}
                        </Button>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
