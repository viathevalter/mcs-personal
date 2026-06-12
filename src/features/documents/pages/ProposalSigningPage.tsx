import React, { useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { renderAsync } from 'docx-preview';
import { supabase } from '@/shared/supabase/client';
import { getProposalByToken, signProposal, type ProposalSignature } from '../api/proposalsApi';
import { Loader2, FileText, CheckCircle2, Lock, Smartphone, AlertTriangle, Download, PenTool, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import { LanguageToggle } from '@/components/ui/LanguageToggle';

export function ProposalSigningPage() {
    const { token } = useParams<{ token: string }>();
    const proposalContainerRef = useRef<HTMLDivElement>(null);
    const contractContainerRef = useRef<HTMLDivElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const { t, i18n } = useTranslation();

    
    const [proposal, setProposal] = useState<ProposalSignature | null>(null);
    const [proposalBlob, setProposalBlob] = useState<Blob | null>(null);
    const [contractBlob, setContractBlob] = useState<Blob | null>(null);
    const [activeTab, setActiveTab] = useState<'proposal' | 'contract'>('proposal');
    const [loading, setLoading] = useState(true);
    const [signing, setSigning] = useState(false);
    const [success, setSuccess] = useState(false);
    const [auditLog, setAuditLog] = useState<any | null>(null);
    const [signatureBase64, setSignatureBase64] = useState<string | null>(null);
    
    // Canvas drawing states
    const [isDrawing, setIsDrawing] = useState(false);
    const [hasSigned, setHasSigned] = useState(false);
    
    // OTP Modal states
    const [otpModalOpen, setOtpModalOpen] = useState(false);
    const [otpValues, setOtpValues] = useState<string[]>(Array(6).fill(''));
    const otpRefs = useRef<(HTMLInputElement | null)[]>([]);
    
    // Audit data
    const [ipInfo, setIpInfo] = useState({ ip: '0.0.0.0', ua: navigator.userAgent });

    // 1. Carregar detalhes da proposta e arquivo
    useEffect(() => {
        if (!token) return;

        // Capturar IP público do assinante
        fetch('https://api.ipify.org?format=json')
            .then(res => res.json())
            .then(data => setIpInfo(prev => ({ ...prev, ip: data.ip })))
            .catch(() => console.warn("Não foi possível detectar o IP. Usando padrão."));

        async function loadProposalData() {
            try {
                setLoading(true);
                const data = await getProposalByToken(token!);
                setProposal(data);

                if (data.status === 'signed') {
                    setSuccess(true);
                    
                    // Buscar logs de auditoria
                    const { data: auditData } = await supabase
                        .schema('core_comercial')
                        .from('proposal_audit_logs')
                        .select('*')
                        .eq('proposal_signature_id', data.id)
                        .order('created_at', { ascending: false })
                        .limit(1)
                        .maybeSingle();
                    if (auditData) {
                        setAuditLog(auditData);
                        if (auditData.signature_image && !auditData.signature_image.startsWith('data:')) {
                            try {
                                const { data: imgBlob, error: imgErr } = await supabase.storage
                                    .from('proposal-signatures')
                                    .download(auditData.signature_image);
                                if (!imgErr && imgBlob) {
                                    const reader = new FileReader();
                                    reader.onloadend = () => {
                                        setSignatureBase64(reader.result as string);
                                    };
                                    reader.readAsDataURL(imgBlob);
                                }
                            } catch (err) {
                                console.error("Error downloading signature image:", err);
                            }
                        } else if (auditData.signature_image) {
                            setSignatureBase64(auditData.signature_image);
                        }
                    }
                }

                if (data.document_url) {
                    console.log("Baixando documento da proposta:", data.document_url);
                    const { data: fileData, error: fileErr } = await supabase.storage
                        .from('proposal-signatures')
                        .download(data.document_url);

                    if (fileErr) throw fileErr;
                    setProposalBlob(fileData);
                }

                if (data.contract_document_url) {
                    console.log("Baixando documento do contrato:", data.contract_document_url);
                    const { data: contractData, error: contractErr } = await supabase.storage
                        .from('proposal-signatures')
                        .download(data.contract_document_url);

                    if (!contractErr && contractData) {
                        setContractBlob(contractData);
                    } else {
                        console.warn("Contrato não encontrado ou erro no download:", contractErr);
                    }
                }
            } catch (err: any) {
                console.error("Erro ao carregar proposta:", err);
                toast.error(t('signing.errorDescProposal'));
            } finally {
                setLoading(false);
            }
        }

        loadProposalData();
    }, [token]);

    // 2. Renderizar o arquivo .docx da proposta usando docx-preview
    useEffect(() => {
        if (proposalBlob && proposalContainerRef.current) {
            console.log("Renderizando docx da proposta...");
            proposalContainerRef.current.innerHTML = "";
            renderAsync(proposalBlob, proposalContainerRef.current, undefined, {
                className: "docx-document",
                inWrapper: false,
                ignoreWidth: true,
                ignoreHeight: true,
            })
            .catch(err => {
                console.error("Falha ao renderizar visualização do docx da proposta:", err);
            });
        }
    }, [proposalBlob]);

    // Renderizar o arquivo .docx do contrato usando docx-preview
    useEffect(() => {
        if (contractBlob && contractContainerRef.current) {
            console.log("Renderizando docx do contrato...");
            contractContainerRef.current.innerHTML = "";
            renderAsync(contractBlob, contractContainerRef.current, undefined, {
                className: "docx-document",
                inWrapper: false,
                ignoreWidth: true,
                ignoreHeight: true,
            })
            .catch(err => {
                console.error("Falha ao renderizar visualização do docx do contrato:", err);
            });
        }
    }, [contractBlob]);

    // 3. Inicializar e redimensionar o canvas
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        
        // Ajustar resolução interna do canvas para bater com o tamanho exibido na tela
        const rect = canvas.getBoundingClientRect();
        canvas.width = rect.width || 400;
        canvas.height = rect.height || 180;
        
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        
        // Preencher o fundo do canvas com branco
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        ctx.strokeStyle = '#0f172a'; // Cor escura (Navy/Slate) para simular caneta
        ctx.lineWidth = 3.5;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
    }, [proposal, success]); // Recriar se o layout mudar devido ao sucesso/dados carregados

    // 4. Lógica de Desenho no Canvas (Touch & Mouse)
    const getCoordinates = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
        const canvas = canvasRef.current;
        if (!canvas) return { x: 0, y: 0 };
        const rect = canvas.getBoundingClientRect();
        
        // Fatores de escala física vs layout CSS
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
            // Prevenir comportamento de scroll do mobile enquanto desenha
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

    // 5. Gerenciar código OTP
    const handleOtpChange = (index: number, val: string) => {
        if (!/^\d*$/.test(val)) return;
        
        const newOtp = [...otpValues];
        newOtp[index] = val.slice(-1);
        setOtpValues(newOtp);

        if (val && index < 5) {
            otpRefs.current[index + 1]?.focus();
        }
    };

    const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Backspace' && !otpValues[index] && index > 0) {
            otpRefs.current[index - 1]?.focus();
        }
    };

    const handleOtpPaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
        e.preventDefault();
        const text = e.clipboardData.getData('text').trim();
        if (!/^\d{6}$/.test(text)) {
            toast.error(t('signing.toastOtpRequired'));
            return;
        }
        
        const digits = text.split('');
        setOtpValues(digits);
        otpRefs.current[5]?.focus();
    };

    // 6. Enviar Assinatura
    const handleOpenSignatureConfirmation = () => {
        if (!hasSigned) {
            toast.error(t('signing.toastDrawFirst'));
            return;
        }
        setOtpModalOpen(true);
    };

    const handleSignProposal = async () => {
        const otpCode = otpValues.join('');
        if (otpCode.length < 6) {
            toast.error(t('signing.toastOtpRequired'));
            return;
        }

        const canvas = canvasRef.current;
        if (!canvas) return;
        const signatureImageBase64 = canvas.toDataURL('image/png');

        try {
            setSigning(true);
            await signProposal({
                token: token!,
                otp_code: otpCode,
                signature_image: signatureImageBase64,
                ip_address: ipInfo.ip,
                user_agent: ipInfo.ua
            });

            toast.success(t('signing.toastSuccessProposal'));
            setSuccess(true);
            setOtpModalOpen(false);
            setSignatureBase64(signatureImageBase64);
            
            // Recarregar os dados para ter o link do storage atualizado
            const updatedProposal = await getProposalByToken(token!);
            setProposal(updatedProposal);
            
            const { data: auditData } = await supabase
                .schema('core_comercial')
                .from('proposal_audit_logs')
                .select('*')
                .eq('proposal_signature_id', updatedProposal.id)
                .order('created_at', { ascending: false })
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

    // 7. Baixar PDF com Alta Fidelidade (via iframe print isolado)
    const handlePrintPdf = (type: 'proposal' | 'contract') => {
        const container = type === 'proposal' ? proposalContainerRef.current : contractContainerRef.current;
        const docElement = container?.querySelector('.docx-document');
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
        iframeDoc.write('<html><head><title>' + (type === 'proposal' ? 'Proposta' : 'Contrato') + '</title>');
        
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
        if (success && proposal) {
            const auditIp = auditLog?.ip_address || ipInfo.ip;
            const auditDate = proposal.signed_at 
                ? new Date(proposal.signed_at).toLocaleString('pt-PT') 
                : new Date().toLocaleString('pt-PT');
            let sigSrc = "";
            if (signatureBase64) {
                sigSrc = signatureBase64;
            } else if (auditLog?.signature_image) {
                const signatureImg = auditLog.signature_image;
                sigSrc = signatureImg.startsWith('data:') 
                    ? signatureImg 
                    : supabase.storage.from('proposal-signatures').getPublicUrl(signatureImg).data.publicUrl;
            }

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
                                    <span style="font-weight: bold; font-size: 12px; color: #1e293b;">${clientOrLeadName}</span>
                                </div>
                                <div style="margin-bottom: 8px;">
                                    <strong style="color: #64748b; font-size: 9px; text-transform: uppercase; display: block; margin-bottom: 2px;">E-mail</strong>
                                    <span>${recipientEmail}</span>
                                </div>
                                <div>
                                    <strong style="color: #64748b; font-size: 9px; text-transform: uppercase; display: block; margin-bottom: 2px;">Metadados de Segurança</strong>
                                    <span style="font-family: monospace; font-size: 10px;">IP: ${auditIp}</span><br/>
                                    <span style="font-family: monospace; font-size: 10px;">Data: ${auditDate}</span>
                                </div>
                            </td>
                            <td style="width: 50%; vertical-align: top;">
                                <strong style="color: #64748b; font-size: 9px; text-transform: uppercase; display: block; margin-bottom: 4px;">Assinatura Digitalizada</strong>
                                ${sigSrc ? `
                                    <div style="background: white; border: 1px solid #cbd5e1; border-radius: 6px; padding: 6px; display: inline-block;">
                                        <img src="${sigSrc}" alt="Assinatura" style="height: 55px; object-fit: contain; display: block;" />
                                    </div>
                                ` : `
                                    <div style="color: #94a3b8; font-style: italic; font-size: 11px; padding: 10px; border: 1px dashed #cbd5e1; border-radius: 6px; display: inline-block;">
                                        Registado digitalmente via OTP
                                    </div>
                                `}
                            </td>
                        </tr>
                    </table>
                    <p style="font-size: 8.5px; color: #94a3b8; margin-top: 15px; line-height: 1.4;">
                        Este documento foi assinado eletronicamente em conformidade com o Regulamento (UE) nº 910/2014 (eIDAS). A autenticidade e integridade desta cópia são garantidas pelo carimbo de verificação de integridade armazenado de forma permanente nos registos de auditoria do sistema.
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
            <div className="flex flex-col items-center justify-center min-h-screen bg-slate-950 text-white p-6">
                <Loader2 className="h-10 w-10 animate-spin text-indigo-500 mb-4" />
                <p className="text-slate-400 font-medium">{t('signing.loadingProposal')}</p>
            </div>
        );
    }

    if (!proposal || (!proposalBlob && !contractBlob)) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-slate-950 text-white p-6 text-center">
                <AlertTriangle className="h-16 w-16 text-amber-500 mb-4 animate-bounce" />
                <h1 className="text-2xl font-bold mb-2">{t('signing.errorTitleProposal')}</h1>
                <p className="text-slate-400 max-w-md">{t('signing.errorDescProposal')}</p>
            </div>
        );
    }

    const clientOrLeadName = proposal.estimacion?.client?.trade_name || proposal.estimacion?.client?.legal_name || proposal.estimacion?.lead?.company_name || proposal.estimacion?.lead?.name || 'Cliente';
    const recipientEmail = proposal.estimacion?.contact_email || proposal.estimacion?.lead?.email || proposal.estimacion?.client?.email || '';

    return (
        <div className="h-screen bg-slate-950 text-slate-100 flex flex-col font-sans overflow-hidden">
            <header className="sticky top-0 z-40 bg-slate-900/80 backdrop-blur-md border-b border-slate-800 px-6 py-4 flex items-center justify-between shadow-lg">
                <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
                        <FileText className="h-5 w-5 text-white" />
                    </div>
                    <div>
                        <h1 className="font-bold text-base md:text-lg leading-tight">{t('signing.headerProposal')}</h1>
                        <p className="text-xs text-slate-400 font-medium">{t('signing.subtitleProposal', { code: proposal.estimacion?.codigo })}</p>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <LanguageToggle />
                    {success ? (
                        <div className="flex items-center gap-2 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-3.5 py-1.5 rounded-full text-xs font-semibold shadow-inner">
                            <CheckCircle2 className="h-4 w-4" /> {t('signing.statusSigned')}
                        </div>
                    ) : (
                        <div className="flex items-center gap-2 bg-amber-500/10 text-amber-400 border border-amber-500/20 px-3.5 py-1.5 rounded-full text-xs font-semibold shadow-inner">
                            <Lock className="h-4 w-4" /> {t('signing.statusPending')}
                        </div>
                    )}
                </div>
            </header>

            {/* Layout Principal */}
            <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
                {/* Visualizador de Documentos com Abas */}
                <main className="flex-1 flex flex-col overflow-hidden bg-slate-900/40 border-r border-slate-900">
                    {/* Seletor de Abas Premium */}
                    <div className="bg-slate-950 px-6 py-3 border-b border-slate-800 flex gap-4">
                        <button
                            onClick={() => setActiveTab('proposal')}
                            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold tracking-wide transition duration-150 ${
                                activeTab === 'proposal'
                                    ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/10'
                                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                            }`}
                        >
                            <FileText className="h-4 w-4" /> {t('signing.tabProposal')}
                        </button>
                        {contractBlob && (
                            <button
                                onClick={() => setActiveTab('contract')}
                                className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold tracking-wide transition duration-150 ${
                                    activeTab === 'contract'
                                        ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/10'
                                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                                }`}
                            >
                                <PenTool className="h-4 w-4" /> {t('signing.tabContract')}
                            </button>
                        )}
                    </div>
                    {/* Container de Exibição */}
                    <div className="flex-1 overflow-y-auto p-4 md:p-8 flex justify-center docx-preview-container-parent">
                        <div className="w-full max-w-4xl overflow-x-auto docx-preview-container">
                            <div style={{ display: activeTab === 'proposal' ? 'block' : 'none' }}>
                                <div 
                                    ref={proposalContainerRef} 
                                    className="docx-wrapper" 
                                />
                            </div>
                            <div style={{ display: activeTab === 'contract' ? 'block' : 'none' }}>
                                <div 
                                    ref={contractContainerRef} 
                                    className="docx-wrapper" 
                                />
                            </div>
                        </div>
                    </div>
                </main>

                {/* Painel Lateral com Canvas */}
                <aside className="w-full md:w-[420px] bg-slate-900/60 backdrop-blur-md p-6 flex flex-col justify-between overflow-y-auto border-t md:border-t-0 md:border-l border-slate-800/80 shadow-xl">
                    <div className="space-y-6">
                        {/* Informações da Proposta */}
                        <div className="bg-slate-950/75 rounded-2xl p-5 border border-slate-800 shadow-inner space-y-4">
                            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500 border-b border-slate-800 pb-2">{t('signing.recipientDetails')}</h3>
                            <div className="space-y-3.5 text-sm">
                                <div>
                                    <label className="text-slate-500 text-xs block font-medium">{t('signing.labelCompany')}</label>
                                    <span className="font-semibold text-slate-200 block text-base mt-0.5">{clientOrLeadName}</span>
                                </div>
                                {proposal.estimacion?.contact_name && (
                                    <div>
                                        <label className="text-slate-500 text-xs block font-medium">{t('signing.labelContact')}</label>
                                        <span className="font-semibold text-slate-200 block">{proposal.estimacion.contact_name}</span>
                                    </div>
                                )}
                                <div>
                                    <label className="text-slate-500 text-xs block font-medium">{t('signing.labelEmail')}</label>
                                    <span className="font-semibold text-indigo-400 block break-all">{recipientEmail}</span>
                                </div>
                            </div>
                        </div>

                        {/* Informações Legais/eIDAS */}
                        <div className="bg-indigo-950/20 rounded-2xl p-5 border border-indigo-500/10 text-indigo-300 text-xs space-y-2.5 shadow-sm">
                            <p className="font-semibold flex items-center gap-1.5 text-indigo-200 text-sm">
                                <Lock className="h-4 w-4" /> {t('signing.termsTitle')}
                            </p>
                            <p className="leading-relaxed">
                                {t('signing.termsBody1')}
                            </p>
                            <p className="leading-relaxed">
                                {t('signing.termsBody2')}
                            </p>
                        </div>

                        {/* Campo de Assinatura Manual (Somente se não assinado) */}
                        {!success && (
                            <div className="space-y-2">
                                <div className="flex justify-between items-center px-1">
                                    <label className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                                        <PenTool className="h-3.5 w-3.5 text-indigo-400" /> {t('signing.drawTitle')}
                                    </label>
                                    <button 
                                        onClick={clearCanvas}
                                        className="text-xs text-slate-500 hover:text-rose-400 transition-colors flex items-center gap-1 py-1 px-2 rounded-lg hover:bg-rose-500/10"
                                        title="Limpar assinatura atual"
                                    >
                                        <Trash2 className="h-3 w-3" /> {t('signing.btnClear')}
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
                                            {t('signing.drawPlaceholder')}
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="pt-8 space-y-4">
                        {success ? (
                            <div className="space-y-3 animate-fade-in">
                                <button
                                    onClick={() => handlePrintPdf('proposal')}
                                    className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold py-3 px-4 rounded-xl border border-indigo-600 transition duration-150 shadow-md text-xs shadow-indigo-600/10"
                                >
                                    <Download className="h-4 w-4" /> {t('signing.btnDownloadProposalPdf', { defaultValue: 'Baixar Proposta (PDF)' })}
                                </button>
                                {contractBlob && (
                                    <button
                                        onClick={() => handlePrintPdf('contract')}
                                        className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold py-3 px-4 rounded-xl border border-indigo-600 transition duration-150 shadow-md text-xs shadow-indigo-600/10"
                                    >
                                        <Download className="h-4 w-4" /> {t('signing.btnDownloadContractPdf', { defaultValue: 'Baixar Contrato (PDF)' })}
                                    </button>
                                )}
                                <div className="text-center text-[11px] text-slate-500 bg-slate-950/85 p-3 rounded-xl border border-slate-800">
                                    <span className="block font-bold text-emerald-400 text-xs mb-1">✓ {t('signing.documentSigned')}</span>
                                    {t('signing.ipDevice', { ip: ipInfo.ip })} <br />
                                    {new Date(proposal.signed_at || '').toLocaleString(i18n.resolvedLanguage || 'pt')}
                                </div>
                            </div>
                        ) : (
                            <button
                                onClick={handleOpenSignatureConfirmation}
                                className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-4 px-4 rounded-xl shadow-lg shadow-indigo-600/20 hover:shadow-indigo-600/30 transform hover:-translate-y-0.5 transition duration-150 text-center text-sm tracking-wide"
                            >
                                {t('signing.btnSign')}
                            </button>
                        )}
                        <p className="text-[10px] text-center text-slate-500">{t('signing.ipConnection', { ip: ipInfo.ip })}</p>
                    </div>
                </aside>
            </div>

            {/* Modal de Confirmação com OTP */}
            {otpModalOpen && (
                <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
                    <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl relative">
                        <h2 className="text-lg md:text-xl font-bold text-slate-100 flex items-center gap-2 mb-2">
                            <Smartphone className="h-5 w-5 text-indigo-400" /> {t('signing.modalTitle')}
                        </h2>
                        <p className="text-sm text-slate-400 mb-6 leading-relaxed">
                            {t('signing.modalDesc', { email: recipientEmail })}
                        </p>

                        {/* Inputs do OTP */}
                        <div className="flex justify-center gap-2 mb-6">
                            {otpValues.map((val, idx) => (
                                <input
                                    key={idx}
                                    ref={el => { otpRefs.current[idx] = el; }}
                                    type="text"
                                    maxLength={1}
                                    pattern="\d*"
                                    inputMode="numeric"
                                    value={val}
                                    onChange={(e) => handleOtpChange(idx, e.target.value)}
                                    onKeyDown={(e) => handleOtpKeyDown(idx, e)}
                                    onPaste={idx === 0 ? handleOtpPaste : undefined}
                                    className="w-11 h-14 bg-slate-950 border border-slate-800 text-center text-xl font-bold text-indigo-400 rounded-xl focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:outline-none transition-all shadow-inner"
                                />
                            ))}
                        </div>

                        {/* Ações do Modal */}
                        <div className="flex gap-3">
                            <button
                                onClick={() => setOtpModalOpen(false)}
                                className="flex-1 py-3 px-4 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold rounded-xl border border-slate-800 transition text-sm"
                            >
                                {t('signing.btnCancel')}
                            </button>
                            <button
                                onClick={handleSignProposal}
                                disabled={signing}
                                className="flex-1 py-3 px-4 bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-750 text-white font-semibold rounded-xl shadow-lg transition flex items-center justify-center gap-2 text-sm"
                            >
                                {signing ? (
                                    <>
                                        <Loader2 className="h-4.5 w-4.5 animate-spin" /> {t('signing.processing')}
                                    </>
                                ) : (
                                    t('signing.btnConfirmSign')
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
