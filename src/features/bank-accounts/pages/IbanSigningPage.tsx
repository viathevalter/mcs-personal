import { useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { jsPDF } from 'jspdf';
import { 
    Loader2, FileText, CheckCircle2, ShieldCheck, PenTool, AlertCircle, Trash2,
    Type, Upload, Sparkles, Lock, Globe
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useIbanRequestByToken, useSubmitSignedIbanRequestTerm, useUploadIbanRequestFile } from '../hooks/useIbanRequests';
import { useTranslation } from 'react-i18next';

export function IbanSigningPage() {
    const { token } = useParams<{ token: string }>();
    const { i18n } = useTranslation();
    const currentLanguage = i18n.language || 'pt';

    const canvasRef = useRef<HTMLCanvasElement>(null);

    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [success, setSuccess] = useState(false);

    // Signature Modes: 'draw' | 'upload' | 'type'
    const [sigMethod, setSigMethod] = useState<'draw' | 'upload' | 'type'>('draw');
    const [uploadedImage, setUploadedImage] = useState<string | null>(null);
    const [typedName, setTypedName] = useState('');
    const [selectedFont, setSelectedFont] = useState<'Caveat' | 'Alex Brush' | 'Great Vibes'>('Caveat');

    // Canvas drawing state
    const [isDrawing, setIsDrawing] = useState(false);
    const [hasDrawn, setHasDrawn] = useState(false);

    // Audit Info
    const [clientIp, setClientIp] = useState<string>('0.0.0.0');

    // Query request data
    const { data: request, isLoading: isLoadingRequest, error: requestError } = useIbanRequestByToken(token || '');

    const { mutateAsync: uploadFile } = useUploadIbanRequestFile();
    const { mutateAsync: submitSignedTerm } = useSubmitSignedIbanRequestTerm();

    // Load Google Fonts dynamically for typed signatures
    useEffect(() => {
        const linkId = 'google-fonts-signature-iban';
        if (!document.getElementById(linkId)) {
            const link = document.createElement('link');
            link.id = linkId;
            link.rel = 'stylesheet';
            link.href = 'https://fonts.googleapis.com/css2?family=Alex+Brush&family=Caveat:wght@400;700&family=Great+Vibes&display=swap';
            document.head.appendChild(link);
        }

        // Fetch Client IP
        fetch('https://api.ipify.org?format=json')
            .then(res => res.json())
            .then(data => setClientIp(data.ip || '0.0.0.0'))
            .catch(() => setClientIp('0.0.0.0'));
    }, []);

    useEffect(() => {
        if (request) {
            setLoading(false);
            if (request.status === 'assinado' || request.status === 'aprovado') {
                setSuccess(true);
            }
            if (request.worker?.nome && !typedName) {
                setTypedName(request.worker.nome);
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
        ctx.strokeStyle = '#0f172a'; // Dark slate/black ink
        ctx.lineWidth = 2.5;
        ctx.lineCap = 'round';
        ctx.stroke();
        setHasDrawn(true);
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
        setHasDrawn(false);
    };

    // Upload Signature Handler
    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (file.size > 5 * 1024 * 1024) {
            toast.error(currentLanguage.startsWith('es') ? "La imagem excede 5MB." : "A imagem excede 5MB.");
            return;
        }

        const reader = new FileReader();
        reader.onload = (event) => {
            setUploadedImage(event.target?.result as string);
        };
        reader.readAsDataURL(file);
    };

    // Helper: Generate Typed Signature Image Base64
    const generateTypedSignatureBase64 = (): string => {
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = 600;
        tempCanvas.height = 160;
        const ctx = tempCanvas.getContext('2d');
        if (!ctx) return '';

        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);

        ctx.font = `44px "${selectedFont}", cursive`;
        ctx.fillStyle = '#0f172a';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(typedName || request?.worker?.nome || 'Assinatura', 300, 80);

        return tempCanvas.toDataURL('image/png');
    };

    const handleConfirmAndSign = async () => {
        if (!request || !token) return;

        // Validation for each mode
        if (sigMethod === 'draw' && !hasDrawn) {
            toast.error(currentLanguage.startsWith('es') 
                ? "Por favor, dibuje su firma digital en el cuadro." 
                : "Por favor, desenhe sua assinatura digital no quadro.");
            return;
        }
        if (sigMethod === 'upload' && !uploadedImage) {
            toast.error(currentLanguage.startsWith('es') 
                ? "Por favor, cargue una imagen de su firma." 
                : "Por favor, envie uma imagem da sua assinatura.");
            return;
        }
        if (sigMethod === 'type' && !typedName.trim()) {
            toast.error(currentLanguage.startsWith('es') 
                ? "Por favor, escriba su nombre para la firma." 
                : "Por favor, digite seu nome para a assinatura.");
            return;
        }

        setSubmitting(true);

        try {
            // Determine final signature image base64
            let signatureBase64 = '';

            if (sigMethod === 'draw' && canvasRef.current) {
                signatureBase64 = canvasRef.current.toDataURL('image/png');
            } else if (sigMethod === 'upload' && uploadedImage) {
                signatureBase64 = uploadedImage;
            } else if (sigMethod === 'type') {
                signatureBase64 = generateTypedSignatureBase64();
            }

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
            const titleText = currentLanguage.startsWith('es') 
                ? 'DOCUMENTO DE AUTORIZACIÓN DE CAMBIO DE DATOS BANCARIOS'
                : 'TERMO DE AUTORIZAÇÃO DE ALTERAÇÃO DE DADOS BANCÁRIOS';
            
            doc.setFont('Helvetica', 'bold');
            doc.setFontSize(13);
            doc.setTextColor(15, 23, 42);
            doc.text(titleText, width / 2, y, { align: 'center' });
            
            y += 18;

            // Body Text
            doc.setFont('Helvetica', 'normal');
            doc.setFontSize(10.5);
            doc.setTextColor(51, 65, 85);
            
            const p1 = currentLanguage.startsWith('es')
                ? `Yo, ${request.worker.nome.toUpperCase()}, con código de colaborador ${request.worker.cod_colab || 'N/A'}, en calidad de trabajador activo en la empresa, solicito y autorizo expresamente al departamento financiero y de recursos humanos a realizar el pago de todas mis futuras remuneraciones, salarios, anticipos y eventuales reembolsos en la cuenta bancaria cuyos datos se proponen a continuación, en sustitución de cualquier otra cuenta registrada anteriormente en el sistema.`
                : `Eu, ${request.worker.nome.toUpperCase()}, portador do código de colaborador ${request.worker.cod_colab || 'N/A'}, na qualidade de trabalhador ativo na empresa, solicito e autorizo expressamente o departamento financeiro e de recursos humanos a efetuar o pagamento de todas as minhas futuras remunerações, salários, adiantamentos e eventuais reembolsos na conta bancária cujos dados são propostos abaixo, em substituição a qualquer outra conta cadastrada anteriormente no sistema.`;

            const splitText = doc.splitTextToSize(p1, width - (2 * margin));
            doc.text(splitText, margin, y);
            y += (splitText.length * 6) + 10;

            // Box details
            doc.setDrawColor(99, 102, 241);
            doc.setFillColor(249, 250, 251);
            doc.rect(margin, y, width - (2 * margin), 32, 'FD');

            const boxTitle = currentLanguage.startsWith('es') ? 'NUEVOS DATOS BANCARIOS AUTORIZADOS' : 'NOVOS DADOS BANCÁRIOS AUTORIZADOS';
            const bankLabel = currentLanguage.startsWith('es') ? 'Banco Destinatario:' : 'Banco Destinatário:';
            const ibanLabel = currentLanguage.startsWith('es') ? 'IBAN de la Cuenta:' : 'IBAN da Conta:';

            doc.setFont('Helvetica', 'bold');
            doc.setFontSize(9.5);
            doc.text(boxTitle, margin + 5, y + 8);

            doc.setFont('Helvetica', 'normal');
            doc.setFontSize(9.5);
            doc.text(`${bankLabel}   ${request.new_banco || '-'}`, margin + 5, y + 16);
            doc.setFont('Helvetica', 'bold');
            doc.text(`${ibanLabel}          ${request.new_iban || '-'}`, margin + 5, y + 24);

            y += 42;

            // Confirmation Text
            doc.setFont('Helvetica', 'normal');
            doc.setFontSize(9.5);
            doc.setTextColor(100, 116, 139);
            const p2 = currentLanguage.startsWith('es')
                ? 'Confirmo que soy el titular de la cuenta indicada arriba y asumo total responsabilidad por la veracidad de estos datos bancarios, eximiendo a la empresa de cualquier responsabilidad por retrasos o fallos de pago derivados de datos incorrectos introducidos por mí.'
                : 'Confirmo que sou o titular da conta indicada acima e assumo total responsabilidade pela veracidade destas informações bancárias, isentando a empresa de qualquer responsabilidade por atrasos ou falhas de pagamento decorrentes de dados incorretos preenchidos por mim.';
            
            const splitText2 = doc.splitTextToSize(p2, width - (2 * margin));
            doc.text(splitText2, margin, y);
            y += (splitText2.length * 5) + 12;

            // Date
            const now = new Date();
            const today = now.toLocaleDateString(currentLanguage.startsWith('es') ? 'es-ES' : 'pt-BR', {
                day: '2-digit',
                month: 'long',
                year: 'numeric'
            });
            const formattedTime = now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
            
            const dateLabel = currentLanguage.startsWith('es') ? 'Fecha de firma:' : 'Data de assinatura:';
            doc.setFont('Helvetica', 'normal');
            doc.setFontSize(9.5);
            doc.setTextColor(51, 65, 85);
            doc.text(`${dateLabel} ${today}`, margin, y);

            y += 24;

            // Signature Lines
            const colWidth = (width - (2 * margin) - 15) / 2;
            
            // Col 1: Worker Signature Line & Image
            doc.line(margin, y, margin + colWidth, y);
            const workerSigLabel = currentLanguage.startsWith('es') ? 'Firma del Trabajador' : 'Assinatura do Trabalhador';
            doc.setFont('Helvetica', 'bold');
            doc.setFontSize(9);
            doc.text(workerSigLabel, margin + (colWidth / 2), y + 5, { align: 'center' });
            doc.setFont('Helvetica', 'normal');
            doc.setFontSize(8);
            doc.text(request.worker.nome, margin + (colWidth / 2), y + 9, { align: 'center' });

            // Draw captured signature image on top of line
            if (signatureBase64) {
                doc.addImage(signatureBase64, 'PNG', margin + (colWidth / 2) - 25, y - 22, 50, 20);
            }

            // Col 2: Company/HR Signature Line
            doc.line(width - margin - colWidth, y, width - margin, y);
            const hrSigLabel = currentLanguage.startsWith('es') ? 'Recursos Humanos (Validación)' : 'Recursos Humanos (Validação)';
            doc.setFont('Helvetica', 'bold');
            doc.setFontSize(9);
            doc.text(hrSigLabel, width - margin - (colWidth / 2), y + 5, { align: 'center' });

            // Audit Stamp Box at Footer
            y += 24;
            doc.setDrawColor(226, 232, 240);
            doc.setFillColor(248, 250, 252);
            doc.rect(margin, y, width - (2 * margin), 18, 'FD');

            doc.setFont('Helvetica', 'bold');
            doc.setFontSize(7.5);
            doc.setTextColor(71, 85, 105);
            doc.text('REGISTRO DE VALIDAÇÃO E ASSINATURA DIGITAL - MCS SYSTEM AUDIT', margin + 3, y + 5);

            doc.setFont('Helvetica', 'normal');
            doc.setFontSize(7);
            doc.setTextColor(100, 116, 139);
            doc.text(`Data/Hora: ${today} ${formattedTime}  |  Endereço IP: ${clientIp}  |  Método: ${sigMethod.toUpperCase()}`, margin + 3, y + 10);
            doc.text(`Hash de Segurança / Token: ${token}`, margin + 3, y + 14);

            // Save PDF Blob
            const pdfOutput = doc.output('blob');
            const pdfFile = new File([pdfOutput], `termo_assinado_${token}.pdf`, { type: 'application/pdf' });

            // Upload final signed PDF
            const path = await uploadFile({
                token: token,
                file: pdfFile,
                docType: 'termo_assinado'
            });

            // Submit final status as 'assinado'
            await submitSignedTerm({
                token: token,
                termoAssinadoUrl: path
            });

            setSuccess(true);
            toast.success(currentLanguage.startsWith('es') 
                ? "¡Autorización firmada con éxito!" 
                : "Autorização assinada com sucesso!");

        } catch (err) {
            console.error(err);
            toast.error(currentLanguage.startsWith('es') 
                ? "Error al procesar la firma." 
                : "Erro ao processar a assinatura.");
        } finally {
            setSubmitting(false);
        }
    };

    if (isLoadingRequest || loading) {
        return (
            <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
                <div className="flex flex-col items-center gap-3 text-slate-400">
                    <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
                    <p className="text-sm">{currentLanguage.startsWith('es') ? "Cargando documento..." : "Carregando documento..."}</p>
                </div>
            </div>
        );
    }

    if (requestError || !request) {
        return (
            <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
                <Card className="max-w-md bg-slate-900 border-slate-800 text-slate-200">
                    <CardHeader className="text-center">
                        <AlertCircle className="w-12 h-12 text-rose-500 mx-auto mb-2" />
                        <CardTitle className="text-lg">
                            {currentLanguage.startsWith('es') ? "Enlace no válido o caducado" : "Link Inválido ou Expirado"}
                        </CardTitle>
                        <CardDescription className="text-slate-400 text-xs">
                            {currentLanguage.startsWith('es') 
                                ? "No pudimos encontrar esta solicitud de firma de IBAN. Verifique el enlace." 
                                : "Não foi possível localizar esta solicitação de assinatura de IBAN."}
                        </CardDescription>
                    </CardHeader>
                </Card>
            </div>
        );
    }

    if (success) {
        return (
            <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
                <Card className="max-w-md bg-slate-900 border-slate-800 text-slate-200 shadow-2xl">
                    <CardHeader className="text-center">
                        <CheckCircle2 className="w-16 h-16 text-emerald-500 mx-auto mb-3" />
                        <CardTitle className="text-xl text-white">
                            {currentLanguage.startsWith('es') ? "¡Termo Firmado!" : "Termo Assinado!"}
                        </CardTitle>
                        <CardDescription className="text-slate-400 text-xs mt-1">
                            {currentLanguage.startsWith('es') 
                                ? `Gracias, ${request.worker?.nome}. La autorización ha sido registrada correctamente.` 
                                : `Obrigado, ${request.worker?.nome}. A sua autorização foi assinada e arquivada com sucesso.`}
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4 pt-2">
                        <div className="bg-slate-950 border border-slate-800 rounded-xl p-3.5 text-xs text-slate-400 space-y-1.5 font-mono">
                            <div className="flex justify-between">
                                <span>Status:</span>
                                <span className="text-emerald-400 font-bold">ASSINADO E VALIDADO</span>
                            </div>
                            <div className="flex justify-between">
                                <span>IP de Registro:</span>
                                <span className="text-slate-200">{clientIp}</span>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-950 flex flex-col justify-center py-10 sm:px-6 lg:px-8">
            
            {/* Header */}
            <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
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
                    
                    {/* Official Document Preview Area (White Paper Style) */}
                    <div className="bg-white border border-slate-200 rounded-xl p-6 sm:p-8 shadow-md text-slate-800 text-sm space-y-4 max-h-96 overflow-y-auto leading-relaxed">
                        <div className="text-center border-b border-slate-200 pb-4">
                            <h3 className="font-bold text-slate-900 text-base tracking-tight uppercase">MCS PERSONAL</h3>
                            <p className="text-[11px] text-slate-500 font-medium">{currentLanguage.startsWith('es') ? "Gestión de Recursos Humanos y Nóminas" : "Gestão de Recursos Humanos e Folhas de Pagamento"}</p>
                        </div>
                        
                        <h4 className="font-extrabold text-slate-900 text-center text-xs uppercase tracking-wide pt-1">
                            {currentLanguage.startsWith('es') 
                                ? "DOCUMENTO DE AUTORIZACIÓN DE CAMBIO DE DATOS BANCARIOS" 
                                : "TERMO DE AUTORIZAÇÃO DE ALTERAÇÃO DE DADOS BANCÁRIOS"}
                        </h4>

                        <p className="text-xs text-slate-700 text-justify leading-relaxed">
                            {currentLanguage.startsWith('es') 
                                ? `Yo, ${request.worker?.nome.toUpperCase()}, con código de colaborador ${request.worker?.cod_colab || 'N/A'}, en calidad de trabajador activo en la empresa, solicito y autorizo expresamente al departamento financiero y de recursos humanos a realizar el pago de todas mis futuras remuneraciones, salarios, anticipos y eventuales reembolsos en la cuenta bancaria cuyos datos se proponen a continuación, en sustitución de cualquier otra cuenta registrada anteriormente en el sistema.`
                                : `Eu, ${request.worker?.nome.toUpperCase()}, portador do código de colaborador ${request.worker?.cod_colab || 'N/A'}, na qualidade de trabalhador ativo na empresa, solicito e autorizo expressamente o departamento financeiro e de recursos humanos a efetuar o pagamento de todas as minhas futuras remunerações, salários, adiantamentos e eventuais reembolsos na conta bancária cujos dados são propostos abaixo, em substituição a qualquer outra conta cadastrada anteriormente no sistema.`}
                        </p>

                        <div className="bg-slate-50 border border-indigo-200 rounded-lg p-4 text-xs">
                            <p className="font-bold text-indigo-900 mb-2 uppercase tracking-wide">
                                {currentLanguage.startsWith('es') ? "Nuevos Datos Bancarios Autorizados" : "Novos Dados Bancários Autorizados"}
                            </p>
                            <div className="grid grid-cols-3 gap-1.5">
                                <span className="text-slate-500 font-medium">{currentLanguage.startsWith('es') ? "Banco:" : "Banco:"}</span>
                                <span className="text-slate-900 col-span-2 font-bold">{request.new_banco}</span>
                                <span className="text-slate-500 font-medium">IBAN:</span>
                                <span className="text-slate-900 col-span-2 font-mono font-bold tracking-tight text-sm">{request.new_iban}</span>
                            </div>
                        </div>

                        <p className="text-[11px] text-slate-600 text-justify leading-relaxed">
                            {currentLanguage.startsWith('es')
                                ? 'Confirmo que soy el titular de la cuenta indicada arriba y asumo total responsabilidad por la veracidad de estos datos bancarios, eximiendo a la empresa de cualquier responsabilidad por retrasos o fallos de pago derivados de datos incorrectos introducidos por mí.'
                                : 'Confirmo que sou o titular da conta indicada acima e assumo total responsabilidade pela veracidade destas informações bancárias, isentando a empresa de qualquer responsabilidade por atrasos ou falhas de pagamento decorrentes de dados incorretos preenchidos por mim.'}
                        </p>
                    </div>

                    {/* Signature Method Selector (3 Modes) */}
                    <div className="space-y-4 pt-2">
                        
                        <div className="flex items-center justify-between">
                            <Label className="text-slate-200 text-xs font-bold uppercase tracking-wider flex items-center">
                                <ShieldCheck className="w-4 h-4 mr-1.5 text-indigo-400" />
                                {currentLanguage.startsWith('es') ? "Elija el Método de Firma:" : "Escolha o Método de Assinatura:"}
                            </Label>
                        </div>

                        {/* Mode Buttons */}
                        <div className="grid grid-cols-3 gap-2 bg-slate-950 p-1 rounded-xl border border-slate-800">
                            <button
                                type="button"
                                onClick={() => setSigMethod('draw')}
                                className={`py-2 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                                    sigMethod === 'draw' 
                                        ? 'bg-indigo-600 text-white shadow-md' 
                                        : 'text-slate-400 hover:text-slate-200'
                                }`}
                            >
                                <PenTool className="w-3.5 h-3.5" />
                                {currentLanguage.startsWith('es') ? "Dibujar" : "Desenhar"}
                            </button>

                            <button
                                type="button"
                                onClick={() => setSigMethod('type')}
                                className={`py-2 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                                    sigMethod === 'type' 
                                        ? 'bg-indigo-600 text-white shadow-md' 
                                        : 'text-slate-400 hover:text-slate-200'
                                }`}
                            >
                                <Type className="w-3.5 h-3.5" />
                                {currentLanguage.startsWith('es') ? "Escribir" : "Escrever"}
                            </button>

                            <button
                                type="button"
                                onClick={() => setSigMethod('upload')}
                                className={`py-2 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                                    sigMethod === 'upload' 
                                        ? 'bg-indigo-600 text-white shadow-md' 
                                        : 'text-slate-400 hover:text-slate-200'
                                }`}
                            >
                                <Upload className="w-3.5 h-3.5" />
                                {currentLanguage.startsWith('es') ? "Subir Foto" : "Subir Foto"}
                            </button>
                        </div>

                        {/* MODE 1: DRAW CANVAS */}
                        {sigMethod === 'draw' && (
                            <div className="space-y-2">
                                <div className="flex justify-between items-center text-xs text-slate-400">
                                    <span>{currentLanguage.startsWith('es') ? "Use su dedo o ratón para firmar:" : "Use o dedo ou mouse para assinar:"}</span>
                                    {hasDrawn && (
                                        <button 
                                            type="button" 
                                            onClick={clearCanvas} 
                                            className="text-xs text-rose-400 hover:text-rose-300 flex items-center gap-1"
                                        >
                                            <Trash2 className="w-3.5 h-3.5" />
                                            {currentLanguage.startsWith('es') ? "Limpiar" : "Limpar"}
                                        </button>
                                    )}
                                </div>
                                <div className="border-2 border-dashed border-slate-300 bg-white rounded-xl overflow-hidden h-44 relative shadow-sm">
                                    <canvas
                                        ref={canvasRef}
                                        width={600}
                                        height={176}
                                        className="w-full h-full cursor-crosshair touch-none bg-white"
                                        onMouseDown={startDrawing}
                                        onMouseMove={draw}
                                        onMouseUp={stopDrawing}
                                        onMouseLeave={stopDrawing}
                                        onTouchStart={startDrawing}
                                        onTouchMove={draw}
                                        onTouchEnd={stopDrawing}
                                    />
                                </div>
                            </div>
                        )}

                        {/* MODE 2: TYPED NAME WITH CURSIVE FONTS */}
                        {sigMethod === 'type' && (
                            <div className="space-y-3 bg-slate-950/60 p-4 rounded-xl border border-slate-800">
                                <div>
                                    <Label className="text-slate-400 text-xs block mb-1">
                                        {currentLanguage.startsWith('es') ? "Nombre Completo para Firma:" : "Nome Completo para Assinatura:"}
                                    </Label>
                                    <Input 
                                        value={typedName}
                                        onChange={(e) => setTypedName(e.target.value)}
                                        placeholder="Ex: João da Silva"
                                        className="bg-slate-900 border-slate-700 text-white text-sm"
                                    />
                                </div>

                                <div>
                                    <Label className="text-slate-400 text-xs block mb-1">Estilo de Letra Caligráfica:</Label>
                                    <div className="flex gap-2">
                                        {(['Caveat', 'Alex Brush', 'Great Vibes'] as const).map(font => (
                                            <button
                                                key={font}
                                                type="button"
                                                onClick={() => setSelectedFont(font)}
                                                className={`flex-1 py-1.5 px-2 rounded-lg border text-xs font-semibold transition-all ${
                                                    selectedFont === font 
                                                        ? 'bg-indigo-600 text-white border-indigo-500' 
                                                        : 'bg-slate-900 text-slate-400 border-slate-800 hover:border-slate-700'
                                                }`}
                                            >
                                                {font}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Typed Signature Preview Box */}
                                <div className="border border-slate-300 bg-white rounded-xl h-28 flex items-center justify-center p-4 overflow-hidden">
                                    <span 
                                        style={{ fontFamily: `'${selectedFont}', cursive` }}
                                        className="text-3xl text-slate-900 select-none text-center"
                                    >
                                        {typedName || request.worker?.nome || 'Assinatura'}
                                    </span>
                                </div>
                            </div>
                        )}

                        {/* MODE 3: UPLOAD SIGNATURE IMAGE */}
                        {sigMethod === 'upload' && (
                            <div className="space-y-2">
                                <div className="border-2 border-dashed border-slate-700 bg-slate-950/60 rounded-xl p-6 text-center hover:border-indigo-500 transition-colors cursor-pointer">
                                    <input 
                                        type="file" 
                                        accept="image/png,image/jpeg,image/jpg" 
                                        className="hidden" 
                                        id="sig-upload-input"
                                        onChange={handleImageUpload}
                                    />
                                    <label htmlFor="sig-upload-input" className="cursor-pointer block">
                                        {uploadedImage ? (
                                            <div className="flex flex-col items-center">
                                                <img src={uploadedImage} alt="Assinatura" className="max-h-24 max-w-full object-contain mb-2 bg-white p-2 rounded-lg" />
                                                <span className="text-xs text-indigo-400 font-semibold">Clique para substituir imagem</span>
                                            </div>
                                        ) : (
                                            <div className="flex flex-col items-center text-slate-400 gap-1.5">
                                                <Upload className="w-8 h-8 text-indigo-400 mb-1" />
                                                <span className="text-xs font-semibold text-slate-200">
                                                    {currentLanguage.startsWith('es') ? "Haga clic para subir la foto de su firma" : "Clique para enviar a foto da sua assinatura"}
                                                </span>
                                                <span className="text-[10px] text-slate-500">Formatos aceitos: PNG, JPG (Máx 5MB)</span>
                                            </div>
                                        )}
                                    </label>
                                </div>
                            </div>
                        )}

                    </div>

                    {/* Audit Notice */}
                    <div className="flex items-center gap-2 text-[10px] text-slate-500 bg-slate-950/50 p-2.5 rounded-lg border border-slate-800">
                        <Lock className="w-3.5 h-3.5 text-indigo-400 flex-shrink-0" />
                        <span>
                            {currentLanguage.startsWith('es') 
                                ? `Registro seguro auditado. IP detectado: ${clientIp}`
                                : `Registro seguro com carimbo digital. IP detectado: ${clientIp}`}
                        </span>
                    </div>

                    {/* Submit Button */}
                    <Button 
                        className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm h-11 border-0 shadow-lg shadow-indigo-600/20"
                        onClick={handleConfirmAndSign}
                        disabled={submitting}
                    >
                        {submitting ? (
                            <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                        ) : (
                            <ShieldCheck className="w-5 h-5 mr-2" />
                        )}
                        {currentLanguage.startsWith('es') ? "Confirmar y Firmar Autorización" : "Confirmar e Assinar Autorização"}
                    </Button>
                </div>
            </div>
        </div>
    );
}
