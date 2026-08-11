import { useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { jsPDF } from 'jspdf';
import { 
    Loader2, FileText, CheckCircle2, ShieldCheck, PenTool, AlertCircle, Trash2
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useIbanRequestByToken, useSubmitSignedIbanRequestTerm, useUploadIbanRequestFile } from '../hooks/useIbanRequests';
import { getIbanRequestFileUrl } from '../api/ibanRequestsApi';
import { useTranslation } from 'react-i18next';

export function IbanSigningPage() {
    const { token } = useParams<{ token: string }>();
    const { t, i18n } = useTranslation();
    const currentLanguage = i18n.language || 'pt';

    const canvasRef = useRef<HTMLCanvasElement>(null);

    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [success, setSuccess] = useState(false);

    // Canvas drawing state
    const [isDrawing, setIsDrawing] = useState(false);
    const [hasSigned, setHasSigned] = useState(false);

    // Query request data
    const { data: request, isLoading: isLoadingRequest, error: requestError } = useIbanRequestByToken(token || '');

    const { mutateAsync: uploadFile } = useUploadIbanRequestFile();
    const { mutateAsync: submitSignedTerm } = useSubmitSignedIbanRequestTerm();

    useEffect(() => {
        if (request) {
            setLoading(false);
            if (request.status === 'assinado' || request.status === 'aprovado') {
                setSuccess(true);
            }
        }
    }, [request]);

    // Canvas Drawing Handlers (Supports Mouse and Touch)
    const getCoordinates = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
        const canvas = canvasRef.current;
        if (!canvas) return { x: 0, y: 0 };
        const rect = canvas.getBoundingClientRect();
        
        let clientX = 0;
        let clientY = 0;

        if ('touches' in e) {
            if (e.touches.length === 0) return { x: 0, y: 0 };
            clientX = e.touches[0].clientX;
            clientY = e.touches[0].clientY;
        } else {
            clientX = e.clientX;
            clientY = e.clientY;
        }

        return {
            x: clientX - rect.left,
            y: clientY - rect.top
        };
    };

    const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
        e.preventDefault();
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        setIsDrawing(true);
        const { x, y } = getCoordinates(e);
        ctx.beginPath();
        ctx.moveTo(x, y);
    };

    const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
        if (!isDrawing) return;
        e.preventDefault();
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const { x, y } = getCoordinates(e);
        ctx.lineTo(x, y);
        ctx.strokeStyle = '#1e1b4b'; // Dark indigo/blue
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

    const handleConfirmAndSign = async () => {
        if (!request || !token) return;
        if (!hasSigned) {
            toast.error(currentLanguage.startsWith('es') 
                ? "Por favor, dibuje su firma digital antes de confirmar." 
                : "Por favor, desenhe sua assinatura digital antes de confirmar.");
            return;
        }

        const canvas = canvasRef.current;
        if (!canvas) return;
        
        setSubmitting(true);

        try {
            // Get signature image as base64
            const signatureBase64 = canvas.toDataURL('image/png');

            // Generate official PDF with signature merged
            const doc = new jsPDF({
                orientation: 'portrait',
                unit: 'mm',
                format: 'a4'
            });

            // Margins and Dimensions
            const margin = 20;
            const width = doc.internal.pageSize.getWidth();
            let y = 30;

            // Logo Header
            doc.setFont('Helvetica', 'bold');
            doc.setFontSize(22);
            doc.setTextColor(30, 41, 59); // slate-800
            doc.text('MCS PERSONAL', margin, y);
            y += 8;

            doc.setFont('Helvetica', 'normal');
            doc.setFontSize(9);
            doc.setTextColor(100, 116, 139); // slate-500
            doc.text('Gestão de Recursos Humanos e Folha de Pagamento', margin, y);
            
            y += 4;
            doc.setDrawColor(226, 232, 240); // slate-200
            doc.setLineWidth(0.5);
            doc.line(margin, y, width - margin, y);
            
            y += 18;

            // Title
            doc.setFont('Helvetica', 'bold');
            doc.setFontSize(14);
            doc.setTextColor(15, 23, 42); // slate-900
            
            const titleText = currentLanguage.startsWith('es')
                ? 'DOCUMENTO DE AUTORIZACIÓN DE CAMBIO DE DATOS BANCARIOS'
                : 'TERMO DE AUTORIZAÇÃO DE ALTERAÇÃO DE DADOS BANCÁRIOS';
            doc.text(titleText, width / 2, y, { align: 'center' });
            
            y += 18;

            // Body Text
            doc.setFont('Helvetica', 'normal');
            doc.setFontSize(11);
            doc.setTextColor(51, 65, 85); // slate-700
            
            const p1_pt = `Eu, ${request.worker?.nome.toUpperCase()}, portador do código de colaborador ${request.worker?.cod_colab || 'N/A'}, na qualidade de trabalhador ativo na empresa, solicito e autorizo expressamente o departamento financeiro e de recursos humanos a efetuar o pagamento de todas as minhas futuras remunerações, salários, adiantamentos e eventuais reembolsos na conta bancária cujos dados são propostos abaixo, em substituição a qualquer outra conta cadastrada anteriormente no sistema.`;
            const p1_es = `Yo, ${request.worker?.nome.toUpperCase()}, con código de colaborador ${request.worker?.cod_colab || 'N/A'}, en calidad de trabajador activo en la empresa, solicito y autorizo expresamente al departamento financiero y de recursos humanos a realizar el pago de todas mis futuras remuneraciones, salarios, anticipos y eventuales reembolsos en la cuenta bancaria cuyos datos se proponen a continuación, en sustitución de cualquier otra cuenta registrada anteriormente en el sistema.`;
            
            const p1 = currentLanguage.startsWith('es') ? p1_es : p1_pt;
            const splitText = doc.splitTextToSize(p1, width - (2 * margin));
            doc.text(splitText, margin, y);
            y += (splitText.length * 6) + 12;

            // Box details
            doc.setDrawColor(99, 102, 241); // indigo-500
            doc.setFillColor(249, 250, 251); // slate-50
            doc.rect(margin, y, width - (2 * margin), 32, 'FD');

            doc.setFont('Helvetica', 'bold');
            doc.setFontSize(10);
            
            const boxTitle = currentLanguage.startsWith('es')
                ? 'NUEVOS DATOS BANCARIOS AUTORIZADOS'
                : 'NOVOS DADOS BANCÁRIOS AUTORIZADOS';
            doc.text(boxTitle, margin + 5, y + 8);

            doc.setFont('Helvetica', 'normal');
            doc.setFontSize(10);
            const bankLabel = currentLanguage.startsWith('es') ? 'Banco Destinatario:' : 'Banco Destinatário:';
            const ibanLabel = currentLanguage.startsWith('es') ? 'IBAN de la Cuenta:' : 'IBAN da Conta:';
            
            doc.text(`${bankLabel.padEnd(22)} ${request.new_banco || '-'}`, margin + 5, y + 16);
            doc.setFont('Helvetica', 'bold');
            doc.text(`${ibanLabel.padEnd(22)} ${request.new_iban || '-'}`, margin + 5, y + 24);

            y += 44;

            // Confirmation and Signature Info
            doc.setFont('Helvetica', 'normal');
            doc.setFontSize(10);
            doc.setTextColor(100, 116, 139);
            
            const p2_pt = 'Confirmo que sou o titular da conta indicada acima e assumo total responsabilidade pela veracidade destas informações bancárias, isentando a empresa de qualquer responsabilidade por atrasos ou falhas de pagamento decorrentes de dados incorretos preenchidos por mim.';
            const p2_es = 'Confirmo que soy el titular de la cuenta indicada arriba y asumo total responsabilidad por la veracidad de estos datos bancarios, eximiendo a la empresa de cualquier responsabilidad por retrasos o fallos de pago derivados de datos incorrectos introducidos por mí.';
            
            const p2 = currentLanguage.startsWith('es') ? p2_es : p2_pt;
            const splitText2 = doc.splitTextToSize(p2, width - (2 * margin));
            doc.text(splitText2, margin, y);
            y += (splitText2.length * 5) + 15;

            // Date
            const today = new Date().toLocaleDateString(currentLanguage.startsWith('es') ? 'es-ES' : 'pt-BR', {
                day: '2-digit',
                month: 'long',
                year: 'numeric'
            });
            doc.setFont('Helvetica', 'normal');
            doc.setFontSize(10);
            doc.setTextColor(51, 65, 85);
            
            const dateLabel = currentLanguage.startsWith('es') ? 'Fecha de firma:' : 'Data de assinatura:';
            doc.text(`${dateLabel} ${today}`, margin, y);

            y += 28;

            // Signature Lines
            const colWidth = (width - (2 * margin) - 15) / 2;
            
            // Add Signature Image over the worker signature line
            doc.addImage(signatureBase64, 'PNG', margin + 5, y - 22, colWidth - 10, 18);
            
            // Col 1: Worker
            doc.setDrawColor(148, 163, 184); // slate-400
            doc.line(margin, y, margin + colWidth, y);
            doc.setFont('Helvetica', 'bold');
            doc.setFontSize(9);
            
            const workerSigLabel = currentLanguage.startsWith('es') ? 'Firma del Trabajador' : 'Assinatura do Trabalhador';
            doc.text(workerSigLabel, margin + (colWidth / 2), y + 5, { align: 'center' });
            doc.setFont('Helvetica', 'normal');
            doc.setFontSize(8);
            doc.text(request.worker?.nome || '', margin + (colWidth / 2), y + 9, { align: 'center' });

            // Col 2: Company/HR
            doc.line(width - margin - colWidth, y, width - margin, y);
            doc.setFont('Helvetica', 'bold');
            doc.setFontSize(9);
            
            const hrSigLabel = currentLanguage.startsWith('es') ? 'Recursos Humanos (Validación)' : 'Recursos Humanos (Validação)';
            doc.text(hrSigLabel, width - margin - (colWidth / 2), y + 5, { align: 'center' });

            // Output PDF as Blob for upload
            const pdfOutput = doc.output('blob');
            const pdfFile = new File([pdfOutput], `termo_assinado_${token}.pdf`, { type: 'application/pdf' });

            // 1. Upload to Supabase bucket
            const path = await uploadFile({
                token,
                file: pdfFile,
                docType: 'termo_assinado'
            });

            // 2. Update status to 'assinado' in DB
            await submitSignedTerm({ token, termoAssinadoUrl: path });

            setSuccess(true);
            toast.success(currentLanguage.startsWith('es') 
                ? "¡Termo firmado digitalmente con éxito!" 
                : "Termo assinado digitalmente com sucesso!");

        } catch (err: any) {
            console.error(err);
            toast.error(err.message || 'Erro ao processar assinatura.');
        } finally {
            setSubmitting(false);
        }
    };

    if (isLoadingRequest || loading) {
        return (
            <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center text-slate-200">
                <Loader2 className="w-10 h-10 animate-spin text-indigo-500 mb-4" />
                <p className="text-sm font-medium">
                    {currentLanguage.startsWith('es') 
                        ? "Cargando documento de autorización bancaria..." 
                        : "Carregando documento de autorização bancária..."}
                </p>
            </div>
        );
    }

    if (requestError || !request || request.status === 'pendente_envio' || request.status === 'enviado' || request.status === 'rejeitado') {
        return (
            <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-4">
                <div className="max-w-md w-full bg-slate-800/80 border border-slate-700/60 rounded-2xl p-6 text-center shadow-xl backdrop-blur-md">
                    <AlertCircle className="w-16 h-16 text-rose-500 mx-auto mb-4" />
                    <h2 className="text-xl font-bold text-white mb-2">
                        {currentLanguage.startsWith('es') ? "Firma No Disponible" : "Assinatura Não Disponível"}
                    </h2>
                    <p className="text-slate-400 text-sm mb-6">
                        {currentLanguage.startsWith('es') 
                            ? "Este enlace no está listo para firma, ya ha sido firmado o el documento no ha sido generado por el gestor de RRHH." 
                            : "Este link não está pronto para assinatura, já foi assinado ou o documento não foi gerado pelo gestor de Recursos Humanos."}
                    </p>
                </div>
            </div>
        );
    }

    if (success) {
        return (
            <div className="min-h-screen bg-gradient-to-tr from-slate-950 via-slate-900 to-indigo-950/80 flex flex-col items-center justify-center p-4">
                <div className="max-w-md w-full bg-slate-900/60 border border-indigo-500/20 rounded-2xl p-8 text-center shadow-2xl backdrop-blur-xl relative">
                    {/* Language Switcher */}
                    <div className="absolute top-4 right-4 flex gap-1">
                        <button 
                            className={`px-2 py-0.5 text-[10px] font-bold rounded ${currentLanguage.startsWith('pt') ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white bg-slate-800/50'}`}
                            onClick={() => i18n.changeLanguage('pt')}
                        >
                            PT
                        </button>
                        <button 
                            className={`px-2 py-0.5 text-[10px] font-bold rounded ${currentLanguage.startsWith('es') ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white bg-slate-800/50'}`}
                            onClick={() => i18n.changeLanguage('es')}
                        >
                            ES
                        </button>
                    </div>

                    <div className="w-16 h-16 bg-emerald-500/10 border border-emerald-500/30 rounded-full flex items-center justify-center mx-auto mb-6">
                        <CheckCircle2 className="w-8 h-8 text-emerald-400" />
                    </div>
                    <h2 className="text-2xl font-bold text-white mb-3">
                        {currentLanguage.startsWith('es') ? "¡Termo Firmado!" : "Termo Assinado!"}
                    </h2>
                    <p className="text-indigo-200 text-sm leading-relaxed mb-6">
                        {currentLanguage.startsWith('es')
                            ? `Hola, ${request.worker?.nome}. Su autorización de cambio de IBAN ha sido firmada electrónicamente con éxito.`
                            : `Olá, ${request.worker?.nome}. Sua autorização de alteração de IBAN foi assinada eletronicamente com sucesso.`}
                    </p>
                    <div className="bg-indigo-950/40 border border-indigo-500/10 rounded-xl p-4 text-left text-xs text-indigo-300 mb-6 leading-relaxed flex items-center gap-3">
                        <ShieldCheck className="w-8 h-8 text-emerald-400 flex-shrink-0" />
                        <div>
                            <p className="font-semibold text-white mb-0.5">
                                {currentLanguage.startsWith('es') ? "Documento Concluido" : "Documento Concluído"}
                            </p>
                            <p className="text-[11px]">
                                {currentLanguage.startsWith('es') 
                                    ? "El departamento de Recursos Humanos ya ha sido notificado y procederá a activar su nueva cuenta bancaria para los próximos pagos." 
                                    : "O departamento de Recursos Humanos já foi notificado e procederá com a ativação da sua nova conta corrente para os próximos pagamentos."}
                            </p>
                        </div>
                    </div>
                    <p className="text-[11px] text-slate-500">
                        {currentLanguage.startsWith('es') 
                            ? "Gracias por su colaboración. Puede cerrar esta ventana." 
                            : "Obrigado pela sua colaboração. Você pode fechar esta janela."}
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-tr from-slate-950 via-slate-900 to-indigo-950/50 flex flex-col justify-center py-12 sm:px-6 lg:px-8 p-4 relative">
            
            {/* Language Switcher */}
            <div className="absolute top-4 right-4 flex gap-1 z-55">
                <Button 
                    variant="ghost" 
                    size="sm" 
                    className={`h-7 px-2 text-[10px] font-bold rounded ${currentLanguage.startsWith('pt') ? 'bg-indigo-600 text-white hover:bg-indigo-600' : 'text-slate-400 hover:text-white bg-slate-800/50 hover:bg-slate-800'}`}
                    onClick={() => i18n.changeLanguage('pt')}
                >
                    PT
                </Button>
                <Button 
                    variant="ghost" 
                    size="sm" 
                    className={`h-7 px-2 text-[10px] font-bold rounded ${currentLanguage.startsWith('es') ? 'bg-indigo-600 text-white hover:bg-indigo-600' : 'text-slate-400 hover:text-white bg-slate-800/50 hover:bg-slate-800'}`}
                    onClick={() => i18n.changeLanguage('es')}
                >
                    ES
                </Button>
            </div>

            <div className="sm:mx-auto sm:w-full sm:max-w-2xl">
                <div className="flex justify-center mb-4">
                    <div className="w-12 h-12 bg-indigo-600/15 border border-indigo-500/30 rounded-2xl flex items-center justify-center text-indigo-400 shadow-lg">
                        <PenTool className="w-6 h-6" />
                    </div>
                </div>
                <h2 className="text-center text-3xl font-extrabold text-white tracking-tight">
                    {currentLanguage.startsWith('es') ? "Firma del Termo de IBAN" : "Assinatura do Termo de IBAN"}
                </h2>
                <p className="mt-2 text-center text-sm text-indigo-200/70">
                    {currentLanguage.startsWith('es')
                        ? "Autorización oficial para actualización de cuenta corriente para pagos"
                        : "Autorização oficial para atualização de conta corrente para pagamentos"}
                </p>
            </div>

            <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-2xl">
                <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl py-8 px-6 sm:px-10 shadow-2xl backdrop-blur-xl space-y-6">
                    
                    {/* Official Document Preview Area */}
                    <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-6 shadow-inner text-slate-300 text-sm space-y-4 max-h-96 overflow-y-auto leading-relaxed select-none">
                        <div className="text-center border-b border-slate-800 pb-4">
                            <h3 className="font-bold text-white text-md uppercase">MCS PERSONAL</h3>
                            <p className="text-[10px] text-slate-500">{currentLanguage.startsWith('es') ? "Gestión de Recursos Humanos y Nóminas" : "Gestão de Recursos Humanos e Folhas de Pagamento"}</p>
                        </div>
                        
                        <h4 className="font-bold text-white text-center text-xs uppercase pt-2">
                            {currentLanguage.startsWith('es') 
                                ? "DOCUMENTO DE AUTORIZACIÓN DE CAMBIO DE DATOS BANCARIOS" 
                                : "TERMO DE AUTORIZAÇÃO DE ALTERAÇÃO DE DADOS BANCÁRIOS"}
                        </h4>

                        <p className="text-xs text-justify">
                            {currentLanguage.startsWith('es') 
                                ? `Yo, ${request.worker?.nome.toUpperCase()}, con código de colaborador ${request.worker?.cod_colab || 'N/A'}, en calidad de trabajador activo en la empresa, solicito y autorizo expresamente al departamento financiero y de recursos humanos a realizar el pago de todas mis futuras remuneraciones, salarios, anticipos y eventuales reembolsos en la cuenta bancaria cuyos datos se proponen a continuación, en sustitución de cualquier otra cuenta registrada anteriormente en el sistema.`
                                : `Eu, ${request.worker?.nome.toUpperCase()}, portador do código de colaborador ${request.worker?.cod_colab || 'N/A'}, na qualidade de trabalhador ativo na empresa, solicito e autorizo expressamente o departamento financeiro e de recursos humanos a efetuar o pagamento de todas as minhas futuras remunerações, salários, adiantamentos e eventuais reembolsos na conta bancária cujos dados são propostos abaixo, em substituição a qualquer outra conta cadastrada anteriormente no sistema.`}
                        </p>

                        <div className="bg-indigo-950/20 border border-indigo-500/10 rounded-lg p-3 text-xs">
                            <p className="font-bold text-indigo-400 mb-2 uppercase">
                                {currentLanguage.startsWith('es') ? "Nuevos Datos Bancarios Autorizados" : "Novos Dados Bancários Autorizados"}
                            </p>
                            <div className="grid grid-cols-3 gap-1">
                                <span className="text-slate-400">{currentLanguage.startsWith('es') ? "Banco:" : "Banco:"}</span>
                                <span className="text-white col-span-2 font-semibold">{request.new_banco}</span>
                                <span className="text-slate-400">IBAN:</span>
                                <span className="text-white col-span-2 font-mono font-bold tracking-tight">{request.new_iban}</span>
                            </div>
                        </div>

                        <p className="text-[11px] text-slate-500 text-justify">
                            {currentLanguage.startsWith('es')
                                ? 'Confirmo que soy el titular de la cuenta indicada arriba y asumo total responsabilidad por la veracidad de estos datos bancarios, eximiendo a la empresa de cualquier responsabilidad por retrasos o fallos de pago derivados de datos incorrectos introducidos por mí.'
                                : 'Confirmo que sou o titular da conta indicada acima e assumo total responsabilidade pela veracidade destas informações bancárias, isentando a empresa de qualquer responsabilidade por atrasos ou falhas de pagamento decorrentes de dados incorretos preenchidos por mim.'}
                        </p>
                    </div>

                    {/* Interactive Canvas Signature Box */}
                    <div className="space-y-3">
                        <div className="flex items-center justify-between">
                            <Label className="text-slate-300 text-sm font-medium flex items-center">
                                <PenTool className="w-4 h-4 mr-1.5 text-indigo-400" />
                                {currentLanguage.startsWith('es') ? "Dibuje su firma en el cuadro inferior:" : "Desenhe sua assinatura no quadro abaixo:"}
                            </Label>
                            {hasSigned && (
                                <button 
                                    type="button" 
                                    onClick={clearCanvas} 
                                    className="text-xs text-rose-400 hover:text-rose-300 flex items-center gap-1 transition-colors"
                                >
                                    <Trash2 className="w-3.5 h-3.5" />
                                    {currentLanguage.startsWith('es') ? "Limpiar" : "Limpar"}
                                </button>
                            )}
                        </div>

                        <div className="border-2 border-dashed border-slate-800 bg-slate-950/40 rounded-xl overflow-hidden h-44 relative shadow-inner">
                            <canvas
                                ref={canvasRef}
                                width={600}
                                height={176}
                                className="w-full h-full cursor-crosshair touch-none"
                                onMouseDown={startDrawing}
                                onMouseMove={draw}
                                onMouseUp={stopDrawing}
                                onMouseLeave={stopDrawing}
                                onTouchStart={startDrawing}
                                onTouchMove={draw}
                                onTouchEnd={stopDrawing}
                            />
                            {!hasSigned && (
                                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-slate-600 text-xs">
                                    <PenTool className="w-5 h-5 mb-1.5 opacity-30 animate-pulse" />
                                    <span>
                                        {currentLanguage.startsWith('es') ? "Use su dedo o ratón para firmar aquí" : "Use o dedo ou mouse para assinar aqui"}
                                    </span>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* CONFIRM BUTTON */}
                    <div className="pt-2">
                        <Button 
                            type="button" 
                            onClick={handleConfirmAndSign}
                            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-medium h-12 shadow-lg border-0 shadow-indigo-600/20 text-sm flex items-center justify-center"
                            disabled={submitting || !hasSigned}
                        >
                            {submitting ? (
                                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                            ) : (
                                <ShieldCheck className="w-5 h-5 mr-2" />
                            )}
                            {submitting 
                                ? (currentLanguage.startsWith('es') ? "Procesando firma..." : "Processando assinatura...")
                                : (currentLanguage.startsWith('es') ? "Confirmar y Firmar Autorización" : "Confirmar e Assinar Autorização")}
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
}
