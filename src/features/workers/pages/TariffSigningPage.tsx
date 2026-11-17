import React, { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
    getTariffAuthorizationByToken,
    approveAndApplyTariffAuthorization,
    rejectTariffAuthorization,
    getWorkerTariffDossiers,
    getCurrentYearMonth,
    formatMesVigenciaLabel,
    type TariffAuthorizationRequest,
    type WorkerTariffDossier
} from '../api/tariffGovernanceApi';
import { useAuth } from '@/app/providers/AuthProvider';
import { supabase } from '@/shared/supabase/client';
import {
    Loader2,
    FileText,
    CheckCircle2,
    Lock,
    ShieldCheck,
    PenTool,
    UserCheck,
    AlertCircle,
    Calendar,
    LogIn,
    LogOut,
    Upload,
    Type,
    XCircle,
    Image as ImageIcon,
    BarChart3,
    FileSpreadsheet
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export function TariffSigningPage() {
    const { token } = useParams<{ token: string }>();
    const navigate = useNavigate();
    const { user, loading: authLoading } = useAuth();
    const canvasRef = useRef<HTMLCanvasElement>(null);

    const [request, setRequest] = useState<TariffAuthorizationRequest | null>(null);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [success, setSuccess] = useState(false);
    const [rejected, setRejected] = useState(false);
    const [appliedImmediately, setAppliedImmediately] = useState<boolean | null>(null);

    // Authorizer decision controls (effective month + final approved tariff per worker)
    const [mesVigencia, setMesVigencia] = useState<string>(getCurrentYearMonth());
    const [approvedTariffs, setApprovedTariffs] = useState<Record<string, string>>({});
    const [liveDossiers, setLiveDossiers] = useState<Map<string, WorkerTariffDossier>>(new Map());

    // 3 Signature modes
    const [signMode, setSignMode] = useState<'desenho' | 'imagem' | 'texto'>('desenho');
    const [isDrawing, setIsDrawing] = useState(false);
    const [hasSigned, setHasSigned] = useState(false);
    const [uploadedImageBase64, setUploadedImageBase64] = useState<string>('');
    const [typedSignature, setTypedSignature] = useState<string>('');

    // Non-authorization (Rejection) state
    const [showRejectBox, setShowRejectBox] = useState(false);
    const [motivoRejeicao, setMotivoRejeicao] = useState('');

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
                    setTypedSignature(data.gerente_nome || '');
                    setMesVigencia(data.mes_vigencia || getCurrentYearMonth());

                    const initialApproved: Record<string, string> = {};
                    const missingDossierIds: string[] = [];
                    (data.itens_solicitacao || []).forEach(item => {
                        initialApproved[item.worker_id] = Number(item.tarifa_nova || 0).toFixed(2);
                        if ((!item.dossie || !item.dossie.empresas_passadas) && item.worker_id) {
                            missingDossierIds.push(item.worker_id);
                        }
                    });
                    setApprovedTariffs(initialApproved);

                    if (missingDossierIds.length > 0) {
                        getWorkerTariffDossiers(missingDossierIds)
                            .then(dMap => setLiveDossiers(dMap))
                            .catch(() => {});
                    }

                    if (data.status === 'APROVADO') {
                        setSuccess(true);
                    } else if (data.status === 'REJEITADO') {
                        setRejected(true);
                    }
                }
            } catch (err) {
                console.error('Error loading tariff authorization request:', err);
            } finally {
                setLoading(false);
            }
        }

        load();
    }, [token]);

    const getCanvasCoordinates = (
        e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>,
        canvas: HTMLCanvasElement
    ) => {
        const rect = canvas.getBoundingClientRect();
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;
        const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
        const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
        return {
            x: (clientX - rect.left) * scaleX,
            y: (clientY - rect.top) * scaleY
        };
    };

    const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const { x, y } = getCanvasCoordinates(e, canvas);
        setIsDrawing(true);
        ctx.beginPath();
        ctx.moveTo(x, y);
    };

    const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
        if (!isDrawing) return;
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const { x, y } = getCanvasCoordinates(e, canvas);
        ctx.lineTo(x, y);
        ctx.strokeStyle = '#1e1b4b';
        ctx.lineWidth = 2.5;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
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

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        if (!file.type.startsWith('image/')) {
            toast.error('Selecione um arquivo de imagem válido (PNG, JPG).');
            return;
        }
        const reader = new FileReader();
        reader.onload = () => {
            if (typeof reader.result === 'string') {
                setUploadedImageBase64(reader.result);
            }
        };
        reader.readAsDataURL(file);
    };

    const renderTypedSignatureToBase64 = (text: string): string => {
        const offscreen = document.createElement('canvas');
        offscreen.width = 600;
        offscreen.height = 160;
        const ctx = offscreen.getContext('2d');
        if (!ctx) return '';
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, offscreen.width, offscreen.height);
        ctx.fillStyle = '#1e1b4b';
        ctx.font = 'italic 42px "Georgia", "Times New Roman", serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(text.trim(), offscreen.width / 2, offscreen.height / 2);
        return offscreen.toDataURL('image/png');
    };

    const isSignatureReady =
        (signMode === 'desenho' && hasSigned) ||
        (signMode === 'imagem' && Boolean(uploadedImageBase64)) ||
        (signMode === 'texto' && typedSignature.trim().length >= 2);

    const handleApprove = async () => {
        if (!request || !token || !user?.email) return;

        if (!mesVigencia || !/^\d{4}-\d{2}$/.test(mesVigencia)) {
            toast.error('Selecione o mês de início da vigência na folha.');
            return;
        }

        let signatureBase64 = '';
        if (signMode === 'desenho') {
            if (!hasSigned) {
                toast.error('Por favor, desenhe sua assinatura digital antes de confirmar.');
                return;
            }
            signatureBase64 = canvasRef.current ? canvasRef.current.toDataURL('image/png') : '';
        } else if (signMode === 'imagem') {
            if (!uploadedImageBase64) {
                toast.error('Por favor, envie a imagem da sua assinatura.');
                return;
            }
            signatureBase64 = uploadedImageBase64;
        } else {
            if (typedSignature.trim().length < 2) {
                toast.error('Por favor, digite seu nome completo para assinar por texto.');
                return;
            }
            signatureBase64 = renderTypedSignatureToBase64(typedSignature);
        }

        const parsedApprovedMap: Record<string, number> = {};
        for (const item of request.itens_solicitacao || []) {
            const raw = approvedTariffs[item.worker_id] ?? String(item.tarifa_nova);
            const val = parseFloat(raw.replace(',', '.'));
            if (isNaN(val) || val < 0) {
                toast.error(`Valor de tarifa inválido para ${item.worker_nome}.`);
                return;
            }
            parsedApprovedMap[item.worker_id] = val;
        }

        setSubmitting(true);
        try {
            const res = await approveAndApplyTariffAuthorization({
                token,
                assinaturaBase64: signatureBase64,
                signerEmail: user.email,
                tipoAssinatura: signMode,
                mesVigencia,
                approvedTariffs: parsedApprovedMap
            });
            setRequest(prev => (prev ? { ...prev, mes_vigencia: mesVigencia } : prev));
            setAppliedImmediately(res.appliedImmediately);
            setSuccess(true);
            toast.success('Autorização de tarifa registrada e tarefa finalizada com sucesso!');
        } catch (err: any) {
            console.error('Failed to approve tariff authorization:', err);
            toast.error(err.message || 'Erro ao processar assinatura de autorização.');
        } finally {
            setSubmitting(false);
        }
    };

    const handleReject = async () => {
        if (!request || !token || !user?.email) return;
        if (!motivoRejeicao.trim()) {
            toast.error('Informe a justificativa para não autorizar o termo.');
            return;
        }

        setSubmitting(true);
        try {
            await rejectTariffAuthorization({
                token,
                motivoRejeicao: motivoRejeicao.trim(),
                rejectorEmail: user.email,
                rejectorNome: request.gerente_nome
            });
            setRequest(prev =>
                prev
                    ? {
                          ...prev,
                          status: 'REJEITADO',
                          motivo_rejeicao: motivoRejeicao.trim(),
                          rejeitado_em: new Date().toISOString(),
                          rejeitado_por_nome: request.gerente_nome
                      }
                    : prev
            );
            setRejected(true);
            toast.success('Termo marcado como Não Autorizado e tarefa concluída.');
        } catch (err: any) {
            console.error('Failed to reject tariff authorization:', err);
            toast.error(err.message || 'Erro ao registrar não autorização.');
        } finally {
            setSubmitting(false);
        }
    };

    if (loading || authLoading) {
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

    if (rejected) {
        return (
            <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-4">
                <Card className="max-w-xl w-full border-rose-200 shadow-xl bg-white dark:bg-slate-900">
                    <CardHeader className="text-center pb-4">
                        <div className="w-16 h-16 bg-rose-100 dark:bg-rose-950 rounded-full flex items-center justify-center mx-auto mb-3">
                            <XCircle className="w-10 h-10 text-rose-600 dark:text-rose-400" />
                        </div>
                        <Badge variant="outline" className="w-fit mx-auto border-rose-500 text-rose-700 bg-rose-50 mb-2">
                            Não Autorizado • Tarefa Concluída
                        </Badge>
                        <CardTitle className="text-2xl font-bold text-slate-900 dark:text-white">
                            Termo Não Autorizado
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
                                <span className="text-muted-foreground">Recusado Por:</span>
                                <span className="font-semibold text-rose-700 dark:text-rose-400">
                                    {request.rejeitado_por_nome || request.gerente_nome}
                                </span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">Data da Recusa:</span>
                                <span className="font-semibold">
                                    {new Date(request.rejeitado_em || Date.now()).toLocaleString('pt-BR')}
                                </span>
                            </div>
                        </div>

                        {request.motivo_rejeicao && (
                            <div className="p-3.5 rounded-lg border border-rose-200 bg-rose-50/70 dark:bg-rose-950/30 text-xs space-y-1">
                                <span className="font-bold text-rose-800 dark:text-rose-300 uppercase text-[10px]">
                                    Justificativa da Não Autorização:
                                </span>
                                <p className="text-slate-800 dark:text-slate-200 whitespace-pre-wrap">{request.motivo_rejeicao}</p>
                            </div>
                        )}

                        <p className="text-xs text-center text-muted-foreground">
                            Nenhuma tarifa foi alterada no sistema. O motivo foi registrado no histórico de governança.
                        </p>
                    </CardContent>
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
                            Aprovado & Tarefa Concluída
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
                                <span className="text-muted-foreground">Início da Vigência:</span>
                                <span className="font-semibold text-indigo-700 dark:text-indigo-400">
                                    {formatMesVigenciaLabel(request.mes_vigencia)}
                                </span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">Data da Assinatura:</span>
                                <span className="font-semibold">
                                    {new Date(request.assinado_em || Date.now()).toLocaleString('pt-BR')}
                                </span>
                            </div>
                        </div>

                        <p className="text-xs text-center text-muted-foreground">
                            {appliedImmediately === false
                                ? `As novas tarifas estão agendadas e entrarão em vigor automaticamente na folha de ${formatMesVigenciaLabel(request.mes_vigencia)}, sem afetar os meses anteriores.`
                                : 'As tarifas dos trabalhadores listados foram registradas e a tarefa na Super Gaveta Operacional foi finalizada automaticamente.'}
                        </p>
                    </CardContent>
                </Card>
            </div>
        );
    }

    if (!user) {
        return (
            <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-4">
                <Card className="max-w-md w-full border-indigo-200 shadow-lg">
                    <CardHeader className="text-center space-y-2">
                        <Lock className="w-10 h-10 text-indigo-600 mx-auto" />
                        <CardTitle className="text-lg">Autenticação Necessária</CardTitle>
                        <CardDescription className="text-xs">
                            Para analisar, assinar ou recusar o termo <strong>{request.codigo_termo}</strong>, é necessário estar logado com seu e-mail corporativo
                            {request.gerente_email ? ` (${request.gerente_email})` : ''}.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="flex justify-center">
                        <Button
                            className="bg-indigo-600 hover:bg-indigo-700 gap-2 text-xs font-semibold"
                            onClick={() => navigate(`/login?redirect=${encodeURIComponent(window.location.pathname)}`)}
                        >
                            <LogIn className="w-4 h-4" />
                            Entrar com minha conta
                        </Button>
                    </CardContent>
                </Card>
            </div>
        );
    }

    if (request.gerente_email && user.email?.toLowerCase() !== request.gerente_email.toLowerCase()) {
        return (
            <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-4">
                <Card className="max-w-md w-full border-amber-200 shadow-lg">
                    <CardHeader className="text-center space-y-2">
                        <AlertCircle className="w-10 h-10 text-amber-500 mx-auto" />
                        <CardTitle className="text-lg text-amber-800">Autorizador Divergente</CardTitle>
                        <CardDescription className="text-xs space-y-2">
                            <p>
                                Este termo (<strong>{request.codigo_termo}</strong>) foi direcionado exclusivamente para{' '}
                                <strong>{request.gerente_nome}</strong> ({request.gerente_email}).
                            </p>
                            <p>
                                Você está logado atualmente como <strong>{user.email}</strong>.
                            </p>
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="flex justify-center gap-2">
                        <Button
                            variant="outline"
                            className="gap-2 text-xs"
                            onClick={async () => {
                                await supabase.auth.signOut();
                                navigate(`/login?redirect=${encodeURIComponent(window.location.pathname)}`);
                            }}
                        >
                            <LogOut className="w-3.5 h-3.5" />
                            Trocar de Conta
                        </Button>
                    </CardContent>
                </Card>
            </div>
        );
    }

    const items = request.itens_solicitacao || [];

    return (
        <div className="min-h-screen bg-slate-100 dark:bg-slate-950 py-8 px-4 sm:px-6">
            <div className="max-w-4xl mx-auto space-y-6">
                <Card className="border-indigo-100 shadow-md bg-white dark:bg-slate-900">
                    <CardHeader className="border-b bg-indigo-900 text-white rounded-t-xl p-6">
                        <div className="flex justify-between items-start gap-4">
                            <div>
                                <div className="flex items-center gap-2 mb-1">
                                    <ShieldCheck className="w-5 h-5 text-indigo-300" />
                                    <span className="text-xs font-mono tracking-wider text-indigo-200 uppercase">Termo Eletrônico de Autorização</span>
                                </div>
                                <h1 className="text-2xl font-bold">Análise & Autorização de Tarifas Horárias</h1>
                                <p className="text-xs text-indigo-200 mt-1">
                                    Defina o valor final aprovado e o mês de início da vigência antes de assinar
                                </p>
                            </div>
                            <Badge className="bg-amber-500 hover:bg-amber-600 text-white border-0 font-mono text-xs px-3 py-1">
                                {request.codigo_termo}
                            </Badge>
                        </div>
                    </CardHeader>

                    <CardContent className="p-6 space-y-6">
                        {/* Governance Details + Authorizer Effective Month Selector */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                            <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-lg border space-y-1">
                                <span className="text-muted-foreground uppercase font-semibold text-[10px]">Solicitante</span>
                                <div className="font-bold text-slate-900 dark:text-white text-sm flex items-center gap-2">
                                    <UserCheck className="w-4 h-4 text-indigo-600" />
                                    {request.solicitante_nome}
                                </div>
                            </div>
                            <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-lg border space-y-1">
                                <span className="text-muted-foreground uppercase font-semibold text-[10px]">Autorizador</span>
                                <div className="font-bold text-slate-900 dark:text-white text-sm flex items-center gap-2">
                                    <ShieldCheck className="w-4 h-4 text-emerald-600" />
                                    {request.gerente_nome}
                                </div>
                            </div>
                            <div className="p-3 bg-indigo-50/70 dark:bg-indigo-950/40 rounded-lg border border-indigo-200 dark:border-indigo-900 space-y-1">
                                <Label className="text-indigo-800 dark:text-indigo-300 uppercase font-bold text-[10px] flex items-center gap-1">
                                    <Calendar className="w-3.5 h-3.5 text-indigo-600" />
                                    Início da Vigência (Folha) *
                                </Label>
                                <Input
                                    type="month"
                                    value={mesVigencia}
                                    onChange={(e) => setMesVigencia(e.target.value)}
                                    className="h-8 text-xs font-bold bg-white dark:bg-slate-900"
                                />
                            </div>
                        </div>

                        {request.motivo_alteracao && (
                            <div className="p-4 bg-indigo-50/60 dark:bg-indigo-950/40 rounded-lg border border-indigo-100 dark:border-indigo-900/50 text-xs space-y-1.5">
                                <span className="font-bold text-indigo-950 dark:text-indigo-200 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                                    <FileText className="w-3.5 h-3.5 text-indigo-600" />
                                    Justificativa / Objeção Relatada:
                                </span>
                                <div className="text-slate-800 dark:text-slate-200 whitespace-pre-wrap leading-relaxed font-sans pt-1">
                                    {request.motivo_alteracao}
                                </div>
                            </div>
                        )}

                        {/* Operational Dossier per Worker */}
                        {items.some(i => i.dossie || liveDossiers.get(i.worker_id)) && (
                            <div className="space-y-2">
                                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
                                    <BarChart3 className="w-3.5 h-3.5 text-indigo-600" />
                                    Dossiê Operacional & Últimos Holerites
                                </h3>
                                <div className="space-y-2">
                                    {items.map((item, idx) => {
                                        const d = liveDossiers.get(item.worker_id) || item.dossie;
                                        if (!d) return null;
                                        return (
                                            <div key={idx} className="p-3 rounded-lg border bg-slate-50/70 dark:bg-slate-800/40 text-xs space-y-2.5">
                                                <div className="flex flex-wrap items-center justify-between gap-2">
                                                    <span className="font-bold text-slate-900 dark:text-slate-100">{item.worker_nome}</span>
                                                    <div className="flex flex-wrap gap-2 text-[11px]">
                                                        {d.tempo_casa_dias != null && (
                                                            <Badge variant="outline">Empresa: {d.tempo_casa_dias} dias</Badge>
                                                        )}
                                                        {d.tempo_cliente_dias != null && (
                                                            <Badge variant="outline">Cliente atual: {d.tempo_cliente_dias} dias</Badge>
                                                        )}
                                                        <Badge className="bg-indigo-100 text-indigo-800 border-indigo-200 hover:bg-indigo-100">
                                                            Média: {d.media_horas_mensal}h/mês
                                                        </Badge>
                                                    </div>
                                                </div>

                                                {d.empresas_passadas && d.empresas_passadas.length > 0 && (
                                                    <div className="space-y-1">
                                                        <span className="text-[10px] font-semibold uppercase text-muted-foreground">
                                                            Empresas / Clientes por onde passou:
                                                        </span>
                                                        <div className="flex flex-wrap gap-1.5">
                                                            {d.empresas_passadas.map((emp, eIdx) => (
                                                                <span
                                                                    key={eIdx}
                                                                    className="px-2 py-0.5 rounded border bg-white dark:bg-slate-900 text-[11px] text-slate-700 dark:text-slate-300"
                                                                >
                                                                    <strong>{emp.cliente_nome}</strong>: {emp.dias_no_cliente} dias • {emp.total_horas}h
                                                                </span>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}

                                                {d.ultimos_holerites.length > 0 && (
                                                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                                                        {d.ultimos_holerites.map((h, hIdx) => (
                                                            <div key={hIdx} className="p-2 rounded bg-white dark:bg-slate-900 border text-[11px]">
                                                                <div className="font-bold text-indigo-700 flex items-center justify-between gap-1">
                                                                    <span className="flex items-center gap-1">
                                                                        <FileSpreadsheet className="w-3 h-3" />
                                                                        {h.mes_referencia}
                                                                    </span>
                                                                    <span className="text-[9px] font-normal px-1 rounded bg-slate-50 dark:bg-slate-800 border">
                                                                        {h.status || '-'}
                                                                    </span>
                                                                </div>
                                                                <div className="font-mono text-slate-700 dark:text-slate-300 mt-0.5">
                                                                    {h.horas_trabalhadas}h • € {h.valor_liquido.toFixed(2)}
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        {/* Workers Table with Intended vs Final Approved Tariff */}
                        <div className="space-y-2">
                            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                                Definir Tarifa Final Aprovada ({items.length} Colaborador(es))
                            </h3>
                            <div className="border rounded-lg overflow-hidden bg-white dark:bg-slate-900">
                                <Table>
                                    <TableHeader className="bg-slate-50 dark:bg-slate-800">
                                        <TableRow>
                                            <TableHead className="text-xs font-bold">Trabalhador</TableHead>
                                            <TableHead className="text-xs font-bold">Cliente</TableHead>
                                            <TableHead className="text-xs font-bold text-right">Tarifa Atual</TableHead>
                                            <TableHead className="text-xs font-bold text-right">Pretendida</TableHead>
                                            <TableHead className="text-xs font-bold text-right w-[150px] text-emerald-700 dark:text-emerald-400">
                                                Tarifa Aprovada (€)
                                            </TableHead>
                                            <TableHead className="text-xs font-bold text-right">Variação</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {items.map((item, idx) => {
                                            const intended = Number(item.tarifa_pretendida ?? item.tarifa_nova ?? 0);
                                            const currentStr = approvedTariffs[item.worker_id] ?? Number(item.tarifa_nova || 0).toFixed(2);
                                            const approvedNum = parseFloat(currentStr.replace(',', '.')) || 0;
                                            const diff = approvedNum - item.tarifa_anterior;
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
                                                        € {Number(item.tarifa_anterior).toFixed(2)}
                                                    </TableCell>
                                                    <TableCell className="text-right font-mono text-indigo-600 font-semibold">
                                                        € {intended.toFixed(2)}
                                                    </TableCell>
                                                    <TableCell className="text-right">
                                                        <div className="relative inline-block w-28">
                                                            <span className="absolute left-2.5 top-1.5 text-muted-foreground text-xs font-mono">€</span>
                                                            <Input
                                                                type="text"
                                                                value={currentStr}
                                                                onChange={(e) =>
                                                                    setApprovedTariffs(prev => ({
                                                                        ...prev,
                                                                        [item.worker_id]: e.target.value
                                                                    }))
                                                                }
                                                                className="pl-6 h-8 text-right font-mono font-bold text-emerald-700 dark:text-emerald-400 text-xs"
                                                            />
                                                        </div>
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

                        {/* Signature 3-Mode Box */}
                        {!showRejectBox && (
                            <div className="space-y-3 pt-4 border-t">
                                <div className="flex justify-between items-center">
                                    <Label className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                                        <PenTool className="w-4 h-4 text-indigo-600" />
                                        Assinatura Digital do Autorizador
                                    </Label>
                                    {signMode === 'desenho' && hasSigned && (
                                        <Button variant="ghost" size="sm" onClick={clearCanvas} className="h-6 text-xs text-red-600 hover:text-red-700">
                                            Limpar Assinatura
                                        </Button>
                                    )}
                                </div>

                                <Tabs value={signMode} onValueChange={(v) => setSignMode(v as any)}>
                                    <TabsList className="grid w-full grid-cols-3 h-9">
                                        <TabsTrigger value="desenho" className="text-xs gap-1.5">
                                            <PenTool className="w-3.5 h-3.5" /> Desenhar
                                        </TabsTrigger>
                                        <TabsTrigger value="imagem" className="text-xs gap-1.5">
                                            <Upload className="w-3.5 h-3.5" /> Subir Imagem
                                        </TabsTrigger>
                                        <TabsTrigger value="texto" className="text-xs gap-1.5">
                                            <Type className="w-3.5 h-3.5" /> Assinar por Texto
                                        </TabsTrigger>
                                    </TabsList>

                                    <TabsContent value="desenho" className="pt-2">
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
                                    </TabsContent>

                                    <TabsContent value="imagem" className="pt-2">
                                        <div className="border-2 border-dashed border-indigo-200 dark:border-indigo-900 rounded-lg p-4 bg-slate-50 dark:bg-slate-900 space-y-3 text-center">
                                            <Input
                                                type="file"
                                                accept="image/png,image/jpeg,image/webp"
                                                onChange={handleImageUpload}
                                                className="text-xs cursor-pointer bg-white"
                                            />
                                            {uploadedImageBase64 ? (
                                                <div className="bg-white p-3 rounded border flex flex-col items-center gap-2">
                                                    <img
                                                        src={uploadedImageBase64}
                                                        alt="Pré-visualização da assinatura"
                                                        className="max-h-28 object-contain"
                                                    />
                                                    <Button
                                                        type="button"
                                                        variant="ghost"
                                                        size="sm"
                                                        className="h-6 text-[11px] text-rose-600"
                                                        onClick={() => setUploadedImageBase64('')}
                                                    >
                                                        Remover imagem
                                                    </Button>
                                                </div>
                                            ) : (
                                                <div className="flex flex-col items-center gap-1 text-slate-400 py-3">
                                                    <ImageIcon className="w-7 h-7 opacity-60" />
                                                    <span className="text-xs">Envie uma imagem (PNG/JPG) da sua assinatura.</span>
                                                </div>
                                            )}
                                        </div>
                                    </TabsContent>

                                    <TabsContent value="texto" className="pt-2 space-y-2.5">
                                        <div className="space-y-1">
                                            <Label className="text-xs font-semibold">Digite seu nome completo para assinatura eletrônica:</Label>
                                            <Input
                                                value={typedSignature}
                                                onChange={(e) => setTypedSignature(e.target.value)}
                                                placeholder="Seu nome completo..."
                                                className="text-xs"
                                            />
                                        </div>
                                        <div className="border rounded-lg p-4 bg-white dark:bg-slate-950 text-center min-h-[90px] flex items-center justify-center">
                                            {typedSignature.trim() ? (
                                                <span
                                                    className="text-3xl text-indigo-950 dark:text-indigo-200 italic select-none"
                                                    style={{ fontFamily: 'Georgia, "Times New Roman", serif' }}
                                                >
                                                    {typedSignature}
                                                </span>
                                            ) : (
                                                <span className="text-xs text-slate-400">A pré-visualização da assinatura aparecerá aqui</span>
                                            )}
                                        </div>
                                    </TabsContent>
                                </Tabs>

                                <div className="text-[11px] text-muted-foreground italic flex items-center gap-1.5">
                                    <Lock className="w-3.5 h-3.5 text-indigo-500" />
                                    Ao assinar eletronicamente, você autoriza formalmente a atualização da tarifa aprovada a partir de <strong>{formatMesVigenciaLabel(mesVigencia)}</strong>.
                                </div>
                            </div>
                        )}

                        {/* Rejection Justification Box */}
                        {showRejectBox && (
                            <div className="p-4 rounded-lg border border-rose-200 bg-rose-50/60 dark:bg-rose-950/30 space-y-3">
                                <div className="flex items-center gap-2 text-rose-800 dark:text-rose-300 font-bold text-xs uppercase">
                                    <XCircle className="w-4 h-4" />
                                    Justificativa da Não Autorização
                                </div>
                                <Textarea
                                    rows={4}
                                    value={motivoRejeicao}
                                    onChange={(e) => setMotivoRejeicao(e.target.value)}
                                    placeholder="Explique o motivo pelo qual este reajuste de tarifa não foi autorizado..."
                                    className="text-xs bg-white dark:bg-slate-900"
                                />
                                <div className="flex justify-end gap-2">
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        className="h-9 text-xs"
                                        disabled={submitting}
                                        onClick={() => setShowRejectBox(false)}
                                    >
                                        Voltar para Assinatura
                                    </Button>
                                    <Button
                                        type="button"
                                        size="sm"
                                        variant="destructive"
                                        className="h-9 text-xs font-semibold gap-1.5"
                                        disabled={submitting || !motivoRejeicao.trim()}
                                        onClick={handleReject}
                                    >
                                        {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4" />}
                                        Confirmar Não Autorização
                                    </Button>
                                </div>
                            </div>
                        )}

                        {/* Action Buttons */}
                        {!showRejectBox && (
                            <div className="flex flex-col sm:flex-row gap-3 pt-1">
                                <Button
                                    type="button"
                                    variant="outline"
                                    className="sm:w-48 h-11 border-rose-300 text-rose-700 hover:bg-rose-50 hover:text-rose-800 font-semibold text-xs gap-1.5"
                                    disabled={submitting}
                                    onClick={() => setShowRejectBox(true)}
                                >
                                    <XCircle className="w-4 h-4" />
                                    Não Autorizar
                                </Button>

                                <Button
                                    className="flex-1 h-11 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm shadow-lg"
                                    disabled={submitting || !isSignatureReady}
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
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
