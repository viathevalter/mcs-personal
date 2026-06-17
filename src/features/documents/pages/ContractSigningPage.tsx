import React, { useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { renderAsync } from 'docx-preview';
import { supabase } from '@/shared/supabase/client';
import { getContractByToken, signContract, type Contract } from '../api/contractsApi';
import { Loader2, FileText, CheckCircle2, Lock, Smartphone, AlertTriangle, Download, PenTool, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import { LanguageToggle } from '@/components/ui/LanguageToggle';

function adjustDocxPreviewSpacing(container: HTMLElement | null) {
    if (!container) return;
    const elements = container.querySelectorAll('*');
    elements.forEach((el: any) => {
        const text = (el.innerText || el.textContent || "").trim();
        if (text.length < 150 && (
            text.startsWith("Empresa:") || 
            text.startsWith("Nombre:") || 
            text.startsWith("Email:") ||
            text.startsWith("Cargo:") ||
            text.startsWith("NIF:") ||
            text.startsWith("Rua S. Tomé")
        )) {
            el.style.setProperty('margin-top', '0px', 'important');
            el.style.setProperty('margin-bottom', '0px', 'important');
            el.style.setProperty('padding-top', '0px', 'important');
            el.style.setProperty('padding-bottom', '0px', 'important');
            el.style.setProperty('line-height', '1.0', 'important');
        }
    });
}


export function ContractSigningPage() {
    const { token } = useParams<{ token: string }>();
    const { t, i18n } = useTranslation();
    const docContainerRef = useRef<HTMLDivElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [contract, setContract] = useState<Contract | null>(null);
    const [fileBlob, setFileBlob] = useState<Blob | null>(null);
    const [loading, setLoading] = useState(true);
    const [signing, setSigning] = useState(false);
    const [success, setSuccess] = useState(false);
    const [auditLog, setAuditLog] = useState<any | null>(null);
    const [signatureBase64, setSignatureBase64] = useState<string | null>(null);
    
    // Canvas drawing states
    const [isDrawing, setIsDrawing] = useState(false);
    const [hasSigned, setHasSigned] = useState(false);

    // New signature methods states
    const [sigMethod, setSigMethod] = useState<'draw' | 'upload' | 'type'>('draw');
    const [uploadedImage, setUploadedImage] = useState<string | null>(null);
    const [typedName, setTypedName] = useState('');
    const [selectedFont, setSelectedFont] = useState('Caveat');
    const [dragActive, setDragActive] = useState(false);

    // Carregar fontes do Google Fonts para assinatura digitada
    useEffect(() => {
        const linkId = 'google-fonts-signature';
        if (!document.getElementById(linkId)) {
            const link = document.createElement('link');
            link.id = linkId;
            link.rel = 'stylesheet';
            link.href = 'https://fonts.googleapis.com/css2?family=Alex+Brush&family=Caveat:wght@400;700&family=Great+Vibes&display=swap';
            document.head.appendChild(link);
        }
    }, []);
    
    // OTP Modal states
    const [otpModalOpen, setOtpModalOpen] = useState(false);
    const [otpValues, setOtpValues] = useState<string[]>(Array(6).fill(''));
    const otpRefs = useRef<(HTMLInputElement | null)[]>([]);
    
    // Audit data
    const [ipInfo, setIpInfo] = useState({ ip: '0.0.0.0', ua: navigator.userAgent });

    // 1. Carregar detalhes do contrato e arquivo
    useEffect(() => {
        if (!token) return;

        // Capturar IP
        fetch('https://api.ipify.org?format=json')
            .then(res => res.json())
            .then(data => setIpInfo(prev => ({ ...prev, ip: data.ip })))
            .catch(() => console.warn("Não foi possível detectar o IP. Usando padrão."));

        async function loadContractData() {
            try {
                setLoading(true);
                const data = await getContractByToken(token!);
                setContract(data);

                if (data.status === 'signed') {
                    setSuccess(true);
                    
                    // Buscar logs de auditoria
                    const { data: auditData } = await supabase
                        .schema('core_personal')
                        .from('contract_audit_logs')
                        .select('*')
                        .eq('contract_id', data.id)
                        .order('verified_at', { ascending: false })
                        .limit(1)
                        .maybeSingle();
                    if (auditData) {
                        setAuditLog(auditData);
                    }
                }

                if (data.document_url) {
                    console.log("Baixando documento:", data.document_url);
                    const { data: fileData, error: fileErr } = await supabase.storage
                        .from('worker-contracts')
                        .download(data.document_url);

                    if (fileErr) throw fileErr;
                    setFileBlob(fileData);
                }
            } catch (err: any) {
                console.error("Erro ao carregar contrato:", err);
                toast.error(t('signing.errorDescContract'));
            } finally {
                setLoading(false);
            }
        }

        loadContractData();
    }, [token]);

    // 2. Renderizar o arquivo .docx usando docx-preview
    useEffect(() => {
        if (fileBlob && docContainerRef.current) {
            console.log("Renders docx preview...");
            docContainerRef.current.innerHTML = "";
            renderAsync(fileBlob, docContainerRef.current, undefined, {
                className: "docx-document",
                inWrapper: true,
                ignoreWidth: false,
                ignoreHeight: false,
                useBase64URL: true,
            })
            .then(() => {
                adjustDocxPreviewSpacing(docContainerRef.current);
            })
            .catch(err => {
                console.error("Falha ao renderizar visualização do docx:", err);
            });
        }
    }, [fileBlob]);


    // 2.5. Inicializar e redimensionar o canvas
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        
        const rect = canvas.getBoundingClientRect();
        canvas.width = rect.width || 400;
        canvas.height = rect.height || 180;
        
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        ctx.strokeStyle = '#0f172a';
        ctx.lineWidth = 3.5;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
    }, [contract, success, sigMethod]);

    const getCoordinates = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
        const canvas = canvasRef.current;
        if (!canvas) return { x: 0, y: 0 };
        const rect = canvas.getBoundingClientRect();
        
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;
        
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
            x: (clientX - rect.left) * scaleX,
            y: (clientY - rect.top) * scaleY
        };
    };

    const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
        if ('touches' in e) {
            if (e.cancelable) e.preventDefault();
        }
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const { x, y } = getCoordinates(e);
        ctx.beginPath();
        ctx.moveTo(x, y);
        setIsDrawing(true);
    };

    const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
        if (!isDrawing) return;
        if ('touches' in e) {
            if (e.cancelable) e.preventDefault();
        }
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const { x, y } = getCoordinates(e);
        ctx.lineTo(x, y);
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
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        setHasSigned(false);
    };

    const processUploadedImage = (base64Str: string): Promise<string> => {
        return new Promise((resolve) => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                canvas.width = 400;
                canvas.height = 180;
                const ctx = canvas.getContext('2d');
                if (!ctx) {
                    resolve(base64Str);
                    return;
                }

                ctx.fillStyle = '#ffffff';
                ctx.fillRect(0, 0, canvas.width, canvas.height);

                const maxWidth = 360;
                const maxHeight = 140;
                let width = img.width;
                let height = img.height;

                if (width > maxWidth) {
                    height = height * (maxWidth / width);
                    width = maxWidth;
                }
                if (height > maxHeight) {
                    width = width * (maxHeight / height);
                    height = maxHeight;
                }

                const x = (canvas.width - width) / 2;
                const y = (canvas.height - height) / 2;

                ctx.drawImage(img, x, y, width, height);
                resolve(canvas.toDataURL('image/png'));
            };
            img.onerror = () => {
                resolve(base64Str);
            };
            img.src = base64Str;
        });
    };

    const generateTypedSignature = (text: string, fontName: string): string => {
        const canvas = document.createElement('canvas');
        canvas.width = 400;
        canvas.height = 180;
        const ctx = canvas.getContext('2d');
        if (!ctx) return '';

        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        ctx.fillStyle = '#0f172a';
        ctx.textBaseline = 'middle';
        ctx.textAlign = 'center';

        let fontSize = 48;
        ctx.font = `${fontSize}px "${fontName}", cursive`;
        
        while (ctx.measureText(text).width > canvas.width - 40 && fontSize > 20) {
            fontSize -= 2;
            ctx.font = `${fontSize}px "${fontName}", cursive`;
        }

        ctx.fillText(text, canvas.width / 2, canvas.height / 2);

        return canvas.toDataURL('image/png');
    };

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (!file.type.startsWith('image/')) {
            toast.error(t('signing.toastInvalidImage', { defaultValue: 'Por favor, selecione um arquivo de imagem válido.' }));
            return;
        }

        const reader = new FileReader();
        reader.onloadend = async () => {
            const processed = await processUploadedImage(reader.result as string);
            setUploadedImage(processed);
        };
        reader.readAsDataURL(file);
    };

    const handleDrag = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === "dragenter" || e.type === "dragover") {
            setDragActive(true);
        } else if (e.type === "dragleave") {
            setDragActive(false);
        }
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            const file = e.dataTransfer.files[0];
            if (!file.type.startsWith('image/')) {
                toast.error(t('signing.toastInvalidImage', { defaultValue: 'Por favor, selecione um arquivo de imagem válido.' }));
                return;
            }
            const reader = new FileReader();
            reader.onloadend = async () => {
                const processed = await processUploadedImage(reader.result as string);
                setUploadedImage(processed);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleOpenSignatureConfirmation = () => {
        if (sigMethod === 'draw' && !hasSigned) {
            toast.error(t('signing.toastDrawFirst', { defaultValue: 'Por favor, desenhe sua assinatura primeiro.' }));
            return;
        }
        if (sigMethod === 'upload' && !uploadedImage) {
            toast.error(t('signing.toastUploadFirst', { defaultValue: 'Por favor, faça upload de uma imagem da sua assinatura.' }));
            return;
        }
        if (sigMethod === 'type' && !typedName.trim()) {
            toast.error(t('signing.toastTypeFirst', { defaultValue: 'Por favor, digite seu nome para gerar a assinatura.' }));
            return;
        }
        setOtpModalOpen(true);
    };

    // 3. Gerenciar mudança no campo OTP
    const handleOtpChange = (index: number, val: string) => {
        if (!/^\d*$/.test(val)) return; // Apenas números
        
        const newOtp = [...otpValues];
        newOtp[index] = val.slice(-1); // Apenas último dígito
        setOtpValues(newOtp);

        // Avançar foco
        if (val && index < 5) {
            otpRefs.current[index + 1]?.focus();
        }
    };

    const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Backspace' && !otpValues[index] && index > 0) {
            otpRefs.current[index - 1]?.focus();
        }
    };

    // 4. Executar a assinatura com OTP e imagem
    const handleSignContract = async () => {
        const otpCode = otpValues.join('');
        if (otpCode.length < 6) {
            toast.error(t('signing.toastOtpRequired'));
            return;
        }

        let signatureImageBase64 = "";
        if (sigMethod === 'draw') {
            const canvas = canvasRef.current;
            if (!canvas) return;
            signatureImageBase64 = canvas.toDataURL('image/png');
        } else if (sigMethod === 'upload') {
            signatureImageBase64 = uploadedImage!;
        } else if (sigMethod === 'type') {
            signatureImageBase64 = generateTypedSignature(typedName, selectedFont);
        }

        try {
            setSigning(true);
            await signContract({
                token: token!,
                otp_code: otpCode,
                ip_address: ipInfo.ip,
                user_agent: ipInfo.ua,
                signature_image: signatureImageBase64
            });

            toast.success(t('signing.toastSuccessContract'));
            setSuccess(true);
            setOtpModalOpen(false);
            setSignatureBase64(signatureImageBase64);
            
            // Recarregar os dados do contrato
            const updatedContract = await getContractByToken(token!);
            setContract(updatedContract);
            
            const { data: auditData } = await supabase
                .schema('core_personal')
                .from('contract_audit_logs')
                .select('*')
                .eq('contract_id', updatedContract.id)
                .order('verified_at', { ascending: false })
                .limit(1)
                .maybeSingle();
            if (auditData) {
                setAuditLog(auditData);
            }
        } catch (err: any) {
            console.error("Erro na assinatura:", err);
            toast.error(err.message || t('signing.toastErrorFallback'));
        } finally {
            setSigning(false);
        }
    };

    // 5. Baixar PDF com Alta Fidelidade (via iframe print isolado)
    const handlePrintPdf = () => {
        const docElement = docContainerRef.current?.querySelector('.docx-document');
        if (!docElement) {
            toast.error(t('signing.errorNotRendered', { defaultValue: 'Documento não renderizado ainda.' }));
            return;
        }

        // Criar iframe oculto para impressão
        const iframe = document.createElement('iframe');
        iframe.style.position = 'fixed';
        iframe.style.right = '0';
        iframe.style.bottom = '0';
        iframe.style.width = '0';
        iframe.style.height = '0';
        iframe.style.border = '0';
        document.body.appendChild(iframe);

        const iframeDoc = iframe.contentWindow?.document || iframe.contentDocument;
        if (!iframeDoc) return;

        // Clonar o elemento do documento
        const cloned = docElement.cloneNode(true) as HTMLElement;

        // Injetar estilos e conteúdo no iframe
        iframeDoc.write('<html><head><title>' + (contract?.contract_type || 'Contrato') + '</title>');
        
        // Copiar estilos da página principal
        const styles = document.querySelectorAll('link[rel="stylesheet"], style');
        styles.forEach(style => {
            iframeDoc.write(style.outerHTML);
        });

        // Adicionar estilos específicos de impressão
        iframeDoc.write(`
            <style>
                body {
                    background: white !important;
                    color: black !important;
                    margin: 0 !important;
                    padding: 20px !important;
                    font-family: sans-serif;
                }
                .docx-wrapper {
                    background: transparent !important;
                    padding: 0 !important;
                    width: 100% !important;
                }
                .docx-document {
                    box-shadow: none !important;
                    border: none !important;
                    width: 100% !important;
                    max-width: 100% !important;
                    margin: 0 !important;
                    padding: 0 !important;
                }
                .print-signature-block {
                    margin-top: 40px;
                    padding-top: 20px;
                    border-top: 2px solid #e2e8f0;
                    page-break-inside: avoid;
                }
                @media print {
                    body { padding: 0 !important; }
                    @page {
                        size: A4;
                        margin: 15mm;
                    }
                }
            </style>
        `);

        iframeDoc.write('</head><body>');
        iframeDoc.write('<div class="docx-wrapper">');
        iframeDoc.write(cloned.outerHTML);

        // Se estiver assinado, adicionar o carimbo de auditoria
        if (success && contract) {
            const auditIp = auditLog?.ip_address || ipInfo.ip;
            const auditDate = contract.signed_at 
                ? new Date(contract.signed_at).toLocaleString('pt-PT') 
                : new Date().toLocaleString('pt-PT');

            iframeDoc.write(`
                <div class="print-signature-block">
                    <h3 style="font-size: 15px; font-weight: bold; margin-bottom: 12px; color: #0f172a; border-bottom: 1px solid #cbd5e1; padding-bottom: 6px;">
                        Assinatura Eletrónica e Carimbo de Integridade (eIDAS)
                    </h3>
                    <table style="width: 100%; border-collapse: collapse; font-size: 11px; color: #334155;">
                        <tr>
                            <td style="width: 50%; vertical-align: top; padding-right: 20px;">
                                <div style="margin-bottom: 8px;">
                                    <strong style="color: #64748b; font-size: 9px; text-transform: uppercase; display: block; margin-bottom: 2px;">Assinante</strong>
                                    <span style="font-weight: bold; font-size: 12px; color: #1e293b;">${contract.worker?.nome}</span>
                                </div>
                                ${signatureBase64 ? `
                                <div style="margin-bottom: 8px;">
                                    <strong style="color: #64748b; font-size: 9px; text-transform: uppercase; display: block; margin-bottom: 2px;">Assinatura Digital</strong>
                                    <img src="${signatureBase64}" style="max-height: 50px; display: block; margin-top: 4px;" />
                                </div>
                                ` : ''}
                                <div style="margin-bottom: 8px;">
                                    <strong style="color: #64748b; font-size: 9px; text-transform: uppercase; display: block; margin-bottom: 2px;">Documento de Identificação</strong>
                                    <span>${contract.worker?.nif || contract.worker?.dni || contract.worker?.nie || contract.worker?.pasaporte || '-'}</span>
                                </div>
                            </td>
                            <td style="width: 50%; vertical-align: top;">
                                <div style="margin-bottom: 8px;">
                                    <strong style="color: #64748b; font-size: 9px; text-transform: uppercase; display: block; margin-bottom: 2px;">Contratante</strong>
                                    <span>${contract.contratante}</span>
                                </div>
                                <div style="margin-bottom: 8px;">
                                    <strong style="color: #64748b; font-size: 9px; text-transform: uppercase; display: block; margin-bottom: 2px;">Metadados de Segurança</strong>
                                    <span style="font-family: monospace; font-size: 10px;">IP: ${auditIp}</span><br/>
                                    <span style="font-family: monospace; font-size: 10px;">Data: ${auditDate}</span>
                                </div>
                            </td>
                        </tr>
                    </table>
                    <p style="font-size: 8.5px; color: #94a3b8; margin-top: 15px; line-height: 1.4;">
                        Este documento foi assinado eletronicamente em conformidade com o Regulamento (UE) nº 910/2014 (eIDAS). A autenticidade e integridade desta cópia são garantidas pelo carimbo de verificação de integridade OTP/SMS armazenado de forma permanente nos registos de auditoria do sistema.
                    </p>
                </div>
            `);
        }

        iframeDoc.write('</div></body></html>');
        iframeDoc.close();

        // Aguardar o carregamento e chamar a tela de impressão
        iframe.contentWindow?.focus();
        setTimeout(() => {
            iframe.contentWindow?.print();
            // Limpar iframe do DOM
            setTimeout(() => {
                document.body.removeChild(iframe);
            }, 1000);
        }, 500);
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-slate-900 text-white p-6">
                <Loader2 className="h-10 w-10 animate-spin text-indigo-500 mb-4" />
                <p className="text-slate-400 font-medium">{t('signing.loadingContract')}</p>
            </div>
        );
    }

    if (!contract || !fileBlob) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-slate-900 text-white p-6 text-center">
                <AlertTriangle className="h-16 w-16 text-amber-500 mb-4" />
                <h1 className="text-2xl font-bold mb-2">{t('signing.errorTitleContract')}</h1>
                <p className="text-slate-400 max-w-md">{t('signing.errorDescContract')}</p>
            </div>
        );
    }

    return (
        <div className="h-screen bg-slate-950 text-slate-100 flex flex-col overflow-hidden">
            <style>{`
                .docx-wrapper table p,
                .docx-wrapper table div,
                .docx-wrapper table td > * {
                    margin-top: 0px !important;
                    margin-bottom: 0px !important;
                    padding-top: 0px !important;
                    padding-bottom: 0px !important;
                    line-height: 1.0 !important;
                }
            `}</style>
            {/* Header Superior */}
            <header className="sticky top-0 z-40 bg-slate-900/80 backdrop-blur-md border-b border-slate-800 px-6 py-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg bg-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
                        <FileText className="h-5 w-5 text-white" />
                    </div>
                    <div>
                        <h1 className="font-bold text-lg leading-tight">{t('signing.headerContract')}</h1>
                        <p className="text-xs text-slate-400">{t('signing.subtitleContract')}</p>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <LanguageToggle />
                    {success ? (
                        <div className="flex items-center gap-2 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-3 py-1.5 rounded-full text-xs font-semibold">
                            <CheckCircle2 className="h-4 w-4" /> {t('signing.statusSigned')}
                        </div>
                    ) : (
                        <div className="flex items-center gap-2 bg-amber-500/10 text-amber-400 border border-amber-500/20 px-3 py-1.5 rounded-full text-xs font-semibold">
                            <Lock className="h-4 w-4" /> {t('signing.statusPending')}
                        </div>
                    )}
                </div>
            </header>

            {/* Layout Lateral / Principal */}
            <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
                {/* Visualizador de Contrato */}
                <main className="flex-1 overflow-y-auto bg-slate-900 p-4 md:p-8 flex justify-center">
                    <div className="w-full max-w-4xl overflow-x-auto docx-preview-container">
                        <div ref={docContainerRef} className="docx-wrapper" />
                    </div>
                </main>

                {/* Sidebar com Controles de Assinatura */}
                <aside className="w-full md:w-96 bg-slate-900 border-t md:border-t-0 md:border-l border-slate-800 p-6 flex flex-col justify-between overflow-y-auto">
                    <div className="space-y-6">
                        <div className="bg-slate-950 rounded-xl p-4 border border-slate-800">
                            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-3">{t('signing.registrationInfo')}</h3>
                            <div className="space-y-3 text-sm">
                                <div>
                                    <label className="text-slate-400 text-xs block">{t('signing.labelFullName')}</label>
                                    <span className="font-semibold text-slate-200 block">{contract.worker?.nome}</span>
                                </div>
                                <div>
                                    <label className="text-slate-400 text-xs block">{t('signing.labelIdentity')}</label>
                                    <span className="font-semibold text-slate-200 block">
                                        {contract.worker?.nif || contract.worker?.dni || contract.worker?.nie || contract.worker?.pasaporte}
                                    </span>
                                </div>
                                <div>
                                    <label className="text-slate-400 text-xs block">{t('signing.labelContractor')}</label>
                                    <span className="font-semibold text-slate-200 block">{contract.contratante}</span>
                                </div>
                                <div>
                                    <label className="text-slate-400 text-xs block">{t('signing.labelRegisteredEmail')}</label>
                                    <span className="font-semibold text-slate-200 block">{contract.worker?.email}</span>
                                </div>
                            </div>
                        </div>

                        <div className="bg-indigo-950/30 rounded-xl p-4 border border-indigo-500/20 text-indigo-300 text-xs space-y-2">
                            <p className="font-semibold flex items-center gap-1.5 text-indigo-200">
                                <Lock className="h-3.5 w-3.5" /> {t('signing.termsTitleCert')}
                            </p>
                            <p>{t('signing.termsBodyContract1')}</p>
                            <p>{t('signing.termsBodyContract2')}</p>
                        </div>

                        {/* Campo de Assinatura Manual (Somente se não assinado) */}
                        {!success && (
                            <div className="space-y-4">
                                {/* Seletor de Método de Assinatura */}
                                <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800">
                                    <button
                                        type="button"
                                        onClick={() => setSigMethod('draw')}
                                        className={`flex-1 py-2 rounded-lg text-xs font-semibold tracking-wide transition-all ${
                                            sigMethod === 'draw'
                                                ? 'bg-indigo-600 text-white shadow-lg'
                                                : 'text-slate-400 hover:text-slate-200'
                                        }`}
                                    >
                                        {t('signing.tabDraw', { defaultValue: 'Desenhar' })}
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setSigMethod('upload')}
                                        className={`flex-1 py-2 rounded-lg text-xs font-semibold tracking-wide transition-all ${
                                            sigMethod === 'upload'
                                                ? 'bg-indigo-600 text-white shadow-lg'
                                                : 'text-slate-400 hover:text-slate-200'
                                        }`}
                                    >
                                        {t('signing.tabUpload', { defaultValue: 'Subir Imagem' })}
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setSigMethod('type')}
                                        className={`flex-1 py-2 rounded-lg text-xs font-semibold tracking-wide transition-all ${
                                            sigMethod === 'type'
                                                ? 'bg-indigo-600 text-white shadow-lg'
                                                : 'text-slate-400 hover:text-slate-200'
                                        }`}
                                    >
                                        {t('signing.tabType', { defaultValue: 'Digitar Nome' })}
                                    </button>
                                </div>

                                {/* Conteúdo de Desenhar */}
                                {sigMethod === 'draw' && (
                                    <div className="space-y-2">
                                        <div className="flex justify-between items-center px-1">
                                            <label className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                                                <PenTool className="h-3.5 w-3.5 text-indigo-400" /> {t('signing.drawTitle', { defaultValue: 'Desenhe sua assinatura' })}
                                            </label>
                                            <button 
                                                type="button"
                                                onClick={clearCanvas}
                                                className="text-xs text-slate-500 hover:text-rose-400 transition-colors flex items-center gap-1 py-1 px-2 rounded-lg hover:bg-rose-500/10"
                                                title="Limpar assinatura atual"
                                            >
                                                <Trash2 className="h-3 w-3" /> {t('signing.btnClear', { defaultValue: 'Limpar' })}
                                            </button>
                                        </div>
                                        
                                        <div className="relative overflow-hidden rounded-xl border border-slate-700 bg-white shadow-inner">
                                            <canvas
                                                ref={canvasRef}
                                                onMouseDown={startDrawing}
                                                onMouseMove={draw}
                                                onMouseUp={stopDrawing}
                                                onMouseLeave={stopDrawing}
                                                onTouchStart={startDrawing}
                                                onTouchMove={draw}
                                                onTouchEnd={stopDrawing}
                                                className="w-full h-44 cursor-crosshair touch-none bg-white block"
                                            />
                                            {!hasSigned && (
                                                <div className="absolute inset-0 flex items-center justify-center pointer-events-none text-slate-400 text-xs">
                                                    {t('signing.drawPlaceholder', { defaultValue: 'Assine aqui' })}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}

                                {/* Conteúdo de Upload */}
                                {sigMethod === 'upload' && (
                                    <div className="space-y-2">
                                        <div className="flex justify-between items-center px-1">
                                            <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                                                {t('signing.tabUpload', { defaultValue: 'Subir Imagem da Assinatura' })}
                                            </label>
                                            {uploadedImage && (
                                                <button 
                                                    type="button"
                                                    onClick={() => setUploadedImage(null)}
                                                    className="text-xs text-slate-500 hover:text-rose-400 transition-colors flex items-center gap-1 py-1 px-2 rounded-lg hover:bg-rose-500/10"
                                                >
                                                    <Trash2 className="h-3 w-3" /> {t('signing.btnClear', { defaultValue: 'Limpar' })}
                                                </button>
                                            )}
                                        </div>

                                        <input 
                                            type="file" 
                                            accept="image/*" 
                                            className="hidden" 
                                            id="sig-image-upload" 
                                            onChange={handleImageUpload} 
                                        />

                                        {uploadedImage ? (
                                            <div className="w-full h-44 rounded-xl border border-slate-700 bg-white shadow-inner flex items-center justify-center overflow-hidden p-4">
                                                <img 
                                                    src={uploadedImage} 
                                                    alt="Signature Preview" 
                                                    className="max-w-full max-h-full object-contain"
                                                />
                                            </div>
                                        ) : (
                                            <label 
                                                htmlFor="sig-image-upload"
                                                onDragEnter={handleDrag}
                                                onDragLeave={handleDrag}
                                                onDragOver={handleDrag}
                                                onDrop={handleDrop}
                                                className={`w-full h-44 rounded-xl border border-dashed flex flex-col items-center justify-center p-4 text-center cursor-pointer transition ${
                                                    dragActive 
                                                        ? 'border-indigo-500 bg-indigo-500/10 text-indigo-300' 
                                                        : 'border-slate-700 bg-slate-950/45 hover:bg-slate-900/60 text-slate-400 hover:text-slate-300'
                                                }`}
                                            >
                                                <Download className="h-8 w-8 mb-2 text-indigo-400 animate-pulse" />
                                                <span className="text-xs font-semibold block mb-1">
                                                    {t('signing.uploadLabel', { defaultValue: 'Clique ou arraste sua assinatura aqui' })}
                                                </span>
                                                <span className="text-[10px] text-slate-500 leading-normal">
                                                    {t('signing.uploadHelper', { defaultValue: 'Formatos PNG ou JPG, fundo transparente recomendado' })}
                                                </span>
                                            </label>
                                        )}
                                    </div>
                                )}

                                {/* Conteúdo de Digitar Nome */}
                                {sigMethod === 'type' && (
                                    <div className="space-y-4">
                                        <div className="space-y-2">
                                            <label className="text-xs font-semibold uppercase tracking-wider text-slate-400 block px-1">
                                                {t('signing.typeLabel', { defaultValue: 'Digite seu nome completo' })}
                                            </label>
                                            <input 
                                                type="text" 
                                                value={typedName} 
                                                onChange={(e) => setTypedName(e.target.value)} 
                                                placeholder={t('signing.typePlaceholder', { defaultValue: 'Ex: João Silva' })} 
                                                className="w-full bg-slate-950 border border-slate-800 text-slate-100 rounded-xl px-4 py-3 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:outline-none transition-all shadow-inner"
                                            />
                                        </div>

                                        <div className="space-y-2">
                                            <label className="text-xs font-semibold uppercase tracking-wider text-slate-400 block px-1">
                                                {t('signing.selectFont', { defaultValue: 'Estilo de Caligrafia' })}
                                            </label>
                                            <div className="grid grid-cols-3 gap-2">
                                                {[
                                                    { name: 'Estilo 1', font: 'Caveat' },
                                                    { name: 'Estilo 2', font: 'Alex Brush' },
                                                    { name: 'Estilo 3', font: 'Great Vibes' }
                                                ].map((fontItem) => (
                                                    <button
                                                        key={fontItem.font}
                                                        type="button"
                                                        onClick={() => setSelectedFont(fontItem.font)}
                                                        style={{ fontFamily: `"${fontItem.font}", cursive` }}
                                                        className={`py-2 px-1 text-base rounded-lg border text-center transition ${
                                                            selectedFont === fontItem.font
                                                                ? 'border-indigo-500 bg-indigo-500/10 text-slate-100 shadow'
                                                                : 'border-slate-800 bg-slate-950 text-slate-400 hover:text-slate-200'
                                                        }`}
                                                    >
                                                        {fontItem.name}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>

                                        <div className="space-y-2">
                                            <label className="text-xs font-semibold uppercase tracking-wider text-slate-400 block px-1">
                                                {t('signing.typePreviewLabel', { defaultValue: 'Visualização da Assinatura' })}
                                            </label>
                                            <div className="w-full h-44 rounded-xl border border-slate-700 bg-white shadow-inner flex items-center justify-center overflow-hidden p-4">
                                                {typedName.trim() ? (
                                                    <span 
                                                        style={{ fontFamily: `"${selectedFont}", cursive` }}
                                                        className="text-4xl text-slate-900 select-none px-4 text-center break-all"
                                                    >
                                                        {typedName}
                                                    </span>
                                                ) : (
                                                    <span className="text-xs text-slate-400 font-medium italic">
                                                        {t('signing.typePreviewPlaceholder', { defaultValue: 'Nome da assinatura' })}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    <div className="pt-6 space-y-3">
                        {success ? (
                            <div className="space-y-3">
                                <button
                                    onClick={handlePrintPdf}
                                    className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold py-3 px-4 rounded-xl border border-indigo-600 transition duration-150 shadow-md shadow-indigo-600/10"
                                >
                                    <Download className="h-4 w-4" /> {t('signing.btnDownloadSignedPdf', { defaultValue: 'Baixar Contrato (PDF)' })}
                                </button>
                                <div className="text-center text-xs text-slate-500 bg-slate-950 p-3 rounded-lg border border-slate-800">
                                    <span className="block font-semibold text-emerald-500">{t('signing.documentSigned')}</span>
                                    IP: {ipInfo.ip} <br />
                                    Data: {new Date(contract.signed_at || '').toLocaleString(i18n.resolvedLanguage || 'pt')}
                                </div>
                            </div>
                        ) : (
                            <button
                                onClick={handleOpenSignatureConfirmation}
                                className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-4.5 px-4 rounded-xl shadow-lg shadow-indigo-600/30 hover:shadow-indigo-600/40 transform hover:-translate-y-0.5 transition duration-150 text-center"
                            >
                                {t('signing.btnSignContract')}
                            </button>
                        )}
                        <p className="text-[10px] text-center text-slate-500">{t('signing.ipDevice', { ip: ipInfo.ip })}</p>
                    </div>
                </aside>
            </div>

            {/* Modal de Digitação de OTP */}
            {otpModalOpen && (
                <div className="fixed inset-0 z-50 bg-black/65 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
                    <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl relative">
                        <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2 mb-2">
                            <Smartphone className="h-5 w-5 text-indigo-400" /> {t('signing.modalTitleIdentity')}
                        </h2>
                        <p className="text-sm text-slate-400 mb-6">
                            {t('signing.modalDescContract', { email: contract.worker?.email })}
                        </p>

                        {/* Campos OTP */}
                        <div className="flex justify-center gap-2.5 mb-6">
                            {otpValues.map((val, idx) => (
                                <input
                                    key={idx}
                                    ref={el => { otpRefs.current[idx] = el; }}
                                    type="text"
                                    maxLength={1}
                                    value={val}
                                    onChange={(e) => handleOtpChange(idx, e.target.value)}
                                    onKeyDown={(e) => handleOtpKeyDown(idx, e)}
                                    className="w-12 h-14 bg-slate-950 border border-slate-800 text-center text-xl font-bold text-indigo-400 rounded-xl focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:outline-none transition-all"
                                />
                            ))}
                        </div>

                        {/* Ações */}
                        <div className="flex gap-3">
                            <button
                                onClick={() => setOtpModalOpen(false)}
                                className="flex-1 py-3 px-4 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold rounded-xl border border-slate-700 transition"
                            >
                                {t('signing.btnCancel')}
                            </button>
                            <button
                                onClick={handleSignContract}
                                disabled={signing}
                                className="flex-1 py-3 px-4 bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-750 text-white font-semibold rounded-xl shadow-lg transition flex items-center justify-center gap-2"
                            >
                                {signing ? (
                                    <>
                                        <Loader2 className="h-4 w-4 animate-spin" /> {t('signing.signing')}
                                    </>
                                ) : (
                                    t('signing.btnConfirmSignContract')
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
