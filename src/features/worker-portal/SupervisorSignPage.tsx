import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../../shared/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Checkbox } from '../../components/ui/checkbox';
import { toast } from 'sonner';
import {
    CheckCircle2,
    Clock,
    AlertCircle,
    Calendar,
    FileText,
    Download,
    RotateCcw,
    ShieldCheck,
    User,
    Building2,
    Moon,
    Sun,
    ChevronDown,
    ChevronUp
} from 'lucide-react';
import { downloadTimesheetPdf, type TimesheetDayEntry, type TimesheetPdfData } from './services/timesheetPdfService';

interface SignatureTimesheet {
    id: string;
    worker_id: string;
    worker_nome: string;
    worker_pasaporte: string;
    worker_funcion?: string;
    cliente_nombre?: string;
    empresa_id: string;
    empresa_nome: string;
    empresa_nif?: string;
    period_year: number;
    period_month: number;
    apontamentos_diarios: TimesheetDayEntry[];
    total_horas_normais: number;
    total_horas_noturnas: number;
    horas_totais: number;
    status: string;
    encarregado_nome?: string;
    encarregado_email?: string;
    encarregado_telefone?: string;
    signed_at?: string;
    signed_ip?: string;
    signature_image_url?: string;
}

const MONTH_NAMES = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];

export function SupervisorSignPage() {
    const { token } = useParams<{ token: string }>();
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [errorMsg, setErrorMsg] = useState('');
    const [timesheet, setTimesheet] = useState<SignatureTimesheet | null>(null);

    // Form states
    const [encarregadoNome, setEncarregadoNome] = useState('');
    const [otpCode, setOtpCode] = useState('');
    const [termsAccepted, setTermsAccepted] = useState(false);
    const [showDailyBreakdown, setShowDailyBreakdown] = useState(false);

    // Signature Canvas state
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const [isDrawing, setIsDrawing] = useState(false);
    const [hasDrawnSignature, setHasDrawnSignature] = useState(false);

    useEffect(() => {
        if (token) {
            loadTimesheet();
        } else {
            setErrorMsg('Link de assinatura inválido ou não fornecido.');
            setLoading(false);
        }
    }, [token]);

    const loadTimesheet = async () => {
        try {
            setLoading(true);
            setErrorMsg('');

            const { data, error } = await supabase.rpc('get_signature_timesheet', {
                p_token: token
            });

            if (error) throw error;
            if (!data || !data.success) {
                setErrorMsg(data?.error || 'Folha de horas não encontrada ou link expirado.');
                return;
            }

            const ts = data.timesheet as SignatureTimesheet;
            setTimesheet(ts);
            if (ts.encarregado_nome) {
                setEncarregadoNome(ts.encarregado_nome);
            }
        } catch (err: any) {
            console.error('Erro ao carregar folha:', err);
            setErrorMsg(err.message || 'Erro ao carregar os dados para assinatura.');
        } finally {
            setLoading(false);
        }
    };

    // --- Canvas Drawing Handlers ---
    const getCanvasCoordinates = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
        const canvas = canvasRef.current;
        if (!canvas) return { x: 0, y: 0 };
        const rect = canvas.getBoundingClientRect();

        let clientX = 0;
        let clientY = 0;

        if ('touches' in e) {
            if (e.touches && e.touches.length > 0) {
                clientX = e.touches[0].clientX;
                clientY = e.touches[0].clientY;
            }
        } else {
            clientX = (e as React.MouseEvent<HTMLCanvasElement>).clientX;
            clientY = (e as React.MouseEvent<HTMLCanvasElement>).clientY;
        }

        const scaleX = rect.width > 0 ? canvas.width / rect.width : 1;
        const scaleY = rect.height > 0 ? canvas.height / rect.height : 1;

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

        setIsDrawing(true);
        setHasDrawnSignature(true);

        const { x, y } = getCanvasCoordinates(e);
        ctx.beginPath();
        ctx.moveTo(x, y);
    };

    const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
        if (!isDrawing) return;
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const { x, y } = getCanvasCoordinates(e);
        ctx.strokeStyle = '#0f172a';
        ctx.lineWidth = 2.5;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.lineTo(x, y);
        ctx.stroke();
    };

    const stopDrawing = () => {
        setIsDrawing(false);
    };

    const clearCanvas = () => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (ctx) {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
        }
        setHasDrawnSignature(false);
    };

    const handleSign = async () => {
        if (!token) return;

        if (!encarregadoNome.trim()) {
            toast.error('Por favor, informe seu nome completo.');
            return;
        }

        if (!otpCode.trim() || otpCode.trim().length !== 6) {
            toast.error('Por favor, informe o código de verificação OTP de 6 dígitos enviado pelo trabalhador.');
            return;
        }

        if (!hasDrawnSignature) {
            toast.error('Por favor, desenhe sua assinatura no quadro.');
            return;
        }

        if (!termsAccepted) {
            toast.error('É obrigatório confirmar a declaração de conferência das horas.');
            return;
        }

        try {
            setSubmitting(true);

            // Get signature image from canvas
            const canvas = canvasRef.current;
            const signatureDataUrl = canvas ? canvas.toDataURL('image/png') : '';

            // Get client IP
            let clientIp = '127.0.0.1';
            try {
                const ipRes = await fetch('https://api.ipify.org?format=json', { signal: AbortSignal.timeout(3000) });
                if (ipRes.ok) {
                    const ipData = await ipRes.json();
                    clientIp = ipData.ip || clientIp;
                }
            } catch {
                // Ignore ip fetch failure
            }

            const { data, error } = await supabase.rpc('sign_timesheet_encarregado', {
                p_token: token,
                p_otp_code: otpCode.trim(),
                p_signature_image: signatureDataUrl,
                p_encarregado_nome: encarregadoNome.trim(),
                p_ip: clientIp,
                p_user_agent: navigator.userAgent
            });

            if (error) throw error;
            if (!data || !data.success) {
                toast.error(data?.error || 'Erro ao validar assinatura. Verifique o código OTP.');
                return;
            }

            toast.success('Folha de horas validada e assinada com sucesso!');

            // Update local state to signed
            setTimesheet((prev) =>
                prev
                    ? {
                          ...prev,
                          status: 'assinado_encarregado',
                          signed_at: new Date().toISOString(),
                          signed_ip: clientIp,
                          signature_image_url: signatureDataUrl,
                          encarregado_nome: encarregadoNome.trim()
                      }
                    : null
            );
        } catch (err: any) {
            console.error('Erro ao assinar folha:', err);
            toast.error(err.message || 'Erro ao processar assinatura.');
        } finally {
            setSubmitting(false);
        }
    };

    const handleDownloadPdf = async () => {
        if (!timesheet) return;

        const pdfData: TimesheetPdfData = {
            empresaNome: timesheet.empresa_nome,
            empresaNif: timesheet.empresa_nif,
            workerNome: timesheet.worker_nome,
            workerDoc: timesheet.worker_pasaporte,
            workerFuncion: timesheet.worker_funcion,
            clienteNome: timesheet.cliente_nombre,
            mes: timesheet.period_month,
            ano: timesheet.period_year,
            apontamentos: timesheet.apontamentos_diarios || [],
            totalNormais: Number(timesheet.total_horas_normais || 0),
            totalNoturnas: Number(timesheet.total_horas_noturnas || 0),
            totalGeral: Number(timesheet.horas_totais || 0),
            encarregadoNome: timesheet.encarregado_nome,
            signedAt: timesheet.signed_at,
            signedIp: timesheet.signed_ip,
            signatureImageUrl: timesheet.signature_image_url
        };

        await downloadTimesheetPdf(pdfData);
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
                <div className="text-center space-y-3">
                    <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary mx-auto"></div>
                    <p className="text-sm text-slate-600 font-medium">Carregando folha de horas...</p>
                </div>
            </div>
        );
    }

    if (errorMsg || !timesheet) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
                <Card className="max-w-md w-full border-red-200">
                    <CardHeader className="text-center">
                        <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-2" />
                        <CardTitle className="text-xl text-red-700">Acesso Inválido ou Expirado</CardTitle>
                        <CardDescription>{errorMsg || 'A folha de horas não foi encontrada.'}</CardDescription>
                    </CardHeader>
                    <CardFooter className="justify-center">
                        <p className="text-xs text-slate-500 text-center">
                            Entre em contato com o trabalhador ou com a administração da empresa para obter um novo link de assinatura.
                        </p>
                    </CardFooter>
                </Card>
            </div>
        );
    }

    const isAlreadySigned =
        timesheet.status === 'assinado_encarregado' ||
        timesheet.status === 'validado' ||
        Boolean(timesheet.signed_at);

    return (
        <div className="min-h-screen bg-gradient-to-b from-slate-100 to-slate-200 py-6 px-4 sm:px-6 lg:px-8">
            <div className="max-w-3xl mx-auto space-y-6">
                {/* Header Branding */}
                <div className="flex items-center justify-between bg-white px-6 py-4 rounded-xl shadow-sm border border-slate-200">
                    <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-lg bg-blue-600 flex items-center justify-center text-white font-bold text-lg shadow-sm">
                            <ShieldCheck className="h-6 w-6" />
                        </div>
                        <div>
                            <h1 className="text-base font-bold text-slate-900 leading-tight">Validação e Assinatura Digital</h1>
                            <p className="text-xs text-slate-500">Portal do Encarregado / Cliente</p>
                        </div>
                    </div>
                    <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                        {timesheet.empresa_nome}
                    </span>
                </div>

                {/* Status Banner */}
                {isAlreadySigned ? (
                    <div className="bg-emerald-50 border border-emerald-300 rounded-xl p-5 shadow-sm space-y-3">
                        <div className="flex items-center gap-3 text-emerald-800">
                            <CheckCircle2 className="h-7 w-7 text-emerald-600 flex-shrink-0" />
                            <div>
                                <h2 className="text-lg font-bold">Folha de Horas Assinada com Sucesso</h2>
                                <p className="text-xs text-emerald-700">
                                    Esta folha de horas já foi validada e assinada digitalmente com validade jurídica.
                                </p>
                            </div>
                        </div>

                        <div className="bg-white/80 rounded-lg p-3 text-xs text-slate-600 space-y-1 border border-emerald-200">
                            <p>
                                <strong className="text-slate-800">Assinado por:</strong> {timesheet.encarregado_nome || 'Encarregado'}
                            </p>
                            <p>
                                <strong className="text-slate-800">Data e Hora:</strong>{' '}
                                {timesheet.signed_at ? new Date(timesheet.signed_at).toLocaleString('pt-PT') : '-'}
                            </p>
                            {timesheet.signed_ip && (
                                <p>
                                    <strong className="text-slate-800">Endereço IP Auditado:</strong> {timesheet.signed_ip}
                                </p>
                            )}
                        </div>

                        {timesheet.signature_image_url && (
                            <div className="pt-2">
                                <Label className="text-xs text-slate-500 font-semibold mb-1 block">Assinatura Registrada:</Label>
                                <div className="border border-slate-300 rounded-md bg-white p-2 inline-block">
                                    <img
                                        src={timesheet.signature_image_url}
                                        alt="Assinatura Encarregado"
                                        className="h-16 max-w-full object-contain"
                                    />
                                </div>
                            </div>
                        )}

                        <div className="pt-2">
                            <Button onClick={handleDownloadPdf} className="w-full sm:w-auto gap-2 bg-emerald-600 hover:bg-emerald-700 text-white">
                                <Download className="h-4 w-4" /> Descarregar Folha de Horas Assinada (PDF)
                            </Button>
                        </div>
                    </div>
                ) : (
                    <div className="bg-amber-50 border border-amber-300 rounded-xl p-4 shadow-sm flex items-center gap-3 text-amber-900">
                        <Clock className="h-6 w-6 text-amber-600 flex-shrink-0" />
                        <div>
                            <p className="text-sm font-semibold">Assinatura Pendente</p>
                            <p className="text-xs text-amber-800">
                                Por favor, confira o resumo de horas do trabalhador abaixo e utilize o código OTP recebido para confirmar a assinatura.
                            </p>
                        </div>
                    </div>
                )}

                {/* Worker & Summary Card */}
                <Card className="border-slate-200 shadow-sm">
                    <CardHeader className="pb-3 border-b">
                        <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2">
                            <div>
                                <CardTitle className="text-lg text-slate-900 flex items-center gap-2">
                                    <User className="h-5 w-5 text-blue-600" />
                                    {timesheet.worker_nome}
                                </CardTitle>
                                <CardDescription className="text-xs mt-0.5">
                                    Doc: <span className="font-mono font-medium text-slate-700">{timesheet.worker_pasaporte}</span>
                                    {timesheet.worker_funcion && ` • Função: ${timesheet.worker_funcion}`}
                                </CardDescription>
                            </div>
                            <div className="text-left sm:text-right">
                                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                                    <Calendar className="h-3.5 w-3.5" />
                                    {MONTH_NAMES[timesheet.period_month - 1]} / {timesheet.period_year}
                                </span>
                                {timesheet.cliente_nombre && (
                                    <p className="text-xs text-slate-500 mt-1 flex items-center gap-1 sm:justify-end">
                                        <Building2 className="h-3 w-3" /> {timesheet.cliente_nombre}
                                    </p>
                                )}
                            </div>
                        </div>
                    </CardHeader>

                    <CardContent className="pt-4 space-y-4">
                        {/* 3 Metric Cards: Normais, Noturnas, Total */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-center">
                                <div className="flex items-center justify-center gap-1 text-xs text-slate-500 mb-1">
                                    <Sun className="h-3.5 w-3.5 text-amber-500" />
                                    <span>Horas Diurnas / Normais</span>
                                </div>
                                <span className="text-2xl font-bold text-slate-800">
                                    {Number(timesheet.total_horas_normais || 0).toFixed(1)} <span className="text-sm font-normal">h</span>
                                </span>
                            </div>

                            <div className="bg-sky-50/60 border border-sky-200 rounded-lg p-3 text-center">
                                <div className="flex items-center justify-center gap-1 text-xs text-sky-700 mb-1">
                                    <Moon className="h-3.5 w-3.5 text-sky-600" />
                                    <span className="font-semibold">Horas Nocturnas</span>
                                </div>
                                <span className="text-2xl font-bold text-sky-900">
                                    {Number(timesheet.total_horas_noturnas || 0).toFixed(1)} <span className="text-sm font-normal">h</span>
                                </span>
                            </div>

                            <div className="bg-emerald-50/60 border border-emerald-200 rounded-lg p-3 text-center">
                                <div className="flex items-center justify-center gap-1 text-xs text-emerald-700 mb-1">
                                    <Clock className="h-3.5 w-3.5 text-emerald-600" />
                                    <span className="font-semibold">TOTAL DE HORAS</span>
                                </div>
                                <span className="text-2xl font-black text-emerald-900">
                                    {Number(timesheet.horas_totais || 0).toFixed(1)} <span className="text-sm font-normal">h</span>
                                </span>
                            </div>
                        </div>

                        {/* Collapsible Daily Breakdown */}
                        <div className="border border-slate-200 rounded-lg overflow-hidden">
                            <button
                                type="button"
                                onClick={() => setShowDailyBreakdown(!showDailyBreakdown)}
                                className="w-full flex items-center justify-between px-4 py-2.5 bg-slate-50 hover:bg-slate-100 transition-colors text-left text-xs font-semibold text-slate-700"
                            >
                                <span className="flex items-center gap-2">
                                    <FileText className="h-4 w-4 text-slate-500" />
                                    Ver Detalhamento Diário ({timesheet.apontamentos_diarios?.length || 0} dias registrados)
                                </span>
                                {showDailyBreakdown ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                            </button>

                            {showDailyBreakdown && (
                                <div className="max-h-64 overflow-y-auto p-2">
                                    <table className="w-full text-xs text-left">
                                        <thead className="text-[11px] uppercase bg-slate-100 text-slate-600 sticky top-0">
                                            <tr>
                                                <th className="py-1.5 px-2">Dia</th>
                                                <th className="py-1.5 px-2">Entrada</th>
                                                <th className="py-1.5 px-2">Saída</th>
                                                <th className="py-1.5 px-2">Obra</th>
                                                <th className="py-1.5 px-2 text-right">Diurnas</th>
                                                <th className="py-1.5 px-2 text-right">Nocturnas</th>
                                                <th className="py-1.5 px-2 text-right">Total</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100">
                                            {timesheet.apontamentos_diarios?.map((dia) => (
                                                <tr key={dia.dia} className="hover:bg-slate-50">
                                                    <td className="py-1 px-2 font-medium">Dia {String(dia.dia).padStart(2, '0')}</td>
                                                    <td className="py-1 px-2 text-slate-600">{dia.entrada || '-'}</td>
                                                    <td className="py-1 px-2 text-slate-600">{dia.saida || '-'}</td>
                                                    <td className="py-1 px-2 text-slate-700 font-medium">
                                                        {dia.obra ? (
                                                            <span className="inline-block bg-slate-100 px-1.5 py-0.5 rounded text-[10px] font-semibold text-slate-800">
                                                                {dia.obra}
                                                            </span>
                                                        ) : '-'}
                                                    </td>
                                                    <td className="py-1 px-2 text-right font-mono">{Number(dia.horasNormais || 0).toFixed(1)}h</td>
                                                    <td className="py-1 px-2 text-right font-mono text-sky-700 font-semibold">
                                                        {Number(dia.horasNoturnas || 0) > 0 ? `${Number(dia.horasNoturnas).toFixed(1)}h` : '-'}
                                                    </td>
                                                    <td className="py-1 px-2 text-right font-bold text-slate-900">
                                                        {Number(dia.totalHoras || (Number(dia.horasNormais || 0) + Number(dia.horasNoturnas || 0))).toFixed(1)}h
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    </CardContent>
                </Card>

                {/* Signature Form (if not signed) */}
                {!isAlreadySigned && (
                    <Card className="border-blue-200 shadow-sm">
                        <CardHeader className="bg-blue-50/50 pb-3 border-b border-blue-100">
                            <CardTitle className="text-base text-blue-950 flex items-center gap-2">
                                <ShieldCheck className="h-5 w-5 text-blue-600" />
                                Conferência e Assinatura Eletrônica
                            </CardTitle>
                            <CardDescription className="text-xs text-blue-900/80">
                                Insira o código OTP de 6 dígitos que o trabalhador informou e assine no quadro abaixo.
                            </CardDescription>
                        </CardHeader>

                        <CardContent className="pt-5 space-y-5">
                            {/* Supervisor Name */}
                            <div className="space-y-1.5">
                                <Label htmlFor="supName" className="text-xs font-semibold text-slate-700">
                                    Seu Nome Completo (Encarregado / Responsável) *
                                </Label>
                                <Input
                                    id="supName"
                                    placeholder="Ex: João da Silva"
                                    value={encarregadoNome}
                                    onChange={(e) => setEncarregadoNome(e.target.value)}
                                    className="bg-white"
                                />
                            </div>

                            {/* OTP Code */}
                            <div className="space-y-1.5">
                                <Label htmlFor="otpInput" className="text-xs font-semibold text-slate-700">
                                    Código de Verificação OTP (6 Dígitos) *
                                </Label>
                                <Input
                                    id="otpInput"
                                    placeholder="000000"
                                    maxLength={6}
                                    value={otpCode}
                                    onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                                    className="text-center font-mono tracking-widest text-lg font-bold bg-white"
                                />
                                <p className="text-[11px] text-slate-500">
                                    Código de 6 números gerado no aplicativo do trabalhador no momento do envio.
                                </p>
                            </div>

                            {/* Signature Pad */}
                            <div className="space-y-2">
                                <div className="flex justify-between items-center">
                                    <Label className="text-xs font-semibold text-slate-700">
                                        Desenhe sua Assinatura Digital no Quadro *
                                    </Label>
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        onClick={clearCanvas}
                                        className="h-7 text-xs text-slate-500 hover:text-red-600 gap-1 px-2"
                                    >
                                        <RotateCcw className="h-3 w-3" /> Limpar
                                    </Button>
                                </div>

                                <div className="border-2 border-dashed border-slate-300 rounded-lg p-1 bg-white touch-none">
                                    <canvas
                                        ref={canvasRef}
                                        width={600}
                                        height={180}
                                        className="w-full h-36 bg-slate-50/50 rounded cursor-crosshair border border-slate-100"
                                        onMouseDown={startDrawing}
                                        onMouseMove={draw}
                                        onMouseUp={stopDrawing}
                                        onMouseLeave={stopDrawing}
                                        onTouchStart={startDrawing}
                                        onTouchMove={draw}
                                        onTouchEnd={stopDrawing}
                                    />
                                </div>
                                <p className="text-[11px] text-slate-400 text-center">
                                    Utilize o dedo na tela do telemóvel ou o ponteiro do rato para assinar.
                                </p>
                            </div>

                            {/* Compliance Checkbox */}
                            <div className="flex items-start space-x-2.5 pt-2">
                                <Checkbox
                                    id="legalTerms"
                                    checked={termsAccepted}
                                    onCheckedChange={(checked) => setTermsAccepted(Boolean(checked))}
                                />
                                <Label htmlFor="legalTerms" className="text-xs text-slate-700 leading-snug cursor-pointer">
                                    Declaro sob compromisso que conferi as horas de trabalho apontadas acima e que os serviços foram
                                    efetivamente prestados na obra e cliente identificados, nos termos do Art. 34.9 do Estatuto dos
                                    Trabalhadores.
                                </Label>
                            </div>
                        </CardContent>

                        <CardFooter className="pt-2 pb-6 border-t border-slate-100 flex flex-col gap-3">
                            <Button
                                onClick={handleSign}
                                disabled={submitting || !termsAccepted || !hasDrawnSignature || otpCode.length !== 6}
                                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold h-12 text-sm shadow-md"
                            >
                                {submitting ? 'Validando Assinatura...' : 'Confirmar e Assinar Folha de Horas'}
                            </Button>
                            <p className="text-[11px] text-slate-400 text-center">
                                Assinatura eletrônica auditada com registro de endereço IP, timestamp UTC e hash único de autenticidade.
                            </p>
                        </CardFooter>
                    </Card>
                )}
            </div>
        </div>
    );
}
